# 后台课程/课时表单新增字段设计文档

**日期**：2026-08-11
**项目**：strapi-backend（自定义 uni-app Vue3 管理后台）
**关联功能**：课程顺序锁定、答题按钮锁定、错题复答

## 1. 背景与目标

C 端（strapi-course）已实现课程顺序锁定、答题按钮锁定、错题复答功能，后端 Strapi 插件（zhao-course）的 schema 已新增相关字段。但后台管理界面（strapi-backend）的课程表单和课时表单尚未同步添加这些字段，导致后台无法配置课程的顺序锁定和答题控制。

**目标**：在后台课程表单和课时表单中添加新增字段，使管理员能配置课程的顺序学习、答题控制和错题复答。

## 2. 现状分析

### 2.1 项目架构
- strapi-backend 是**自定义 uni-app Vue3 前端项目**（非 Strapi 自身 admin）
- 表单字段**手动编码**在 `.vue` 文件的 `reactive` 对象和 `template` 中
- 通过 HTTP 调用 Strapi 自定义路由（`/zhao-course/v1/admin/...`）

### 2.2 缺失字段清单

**课程表单** ([src/pages/course/form.vue](file:///d:/zhao/strapi-backend/src/pages/course/form.vue)) 缺少：
- `enforceSequence` (boolean) - 是否强制顺序学习
- `sequenceNumber` (integer) - 课程顺序号
- `sequenceTag` (relation M2O → zhao-tag.tag) - 顺序锁定标签
- `allowRetakeQuiz` (boolean) - 是否允许重复答题
- `quizRetryCount` (enumeration) - 错题复答次数

**课时表单** ([src/pages/course/lesson/form.vue](file:///d:/zhao/strapi-backend/src/pages/course/lesson/form.vue)) 缺少：
- `enforceSequence` (boolean) - 是否强制课时顺序学习
- `sequenceTag` (relation M2O → zhao-tag.tag) - 课时顺序锁定标签
- 注：课时表单已有 `sequenceNumber`，无需新增

### 2.3 现有标签组件
- [TagPicker.vue](file:///d:/zhao/strapi-backend/src/components/TagPicker.vue) 支持 `mode` prop：`'tag'` | `'knowledge-point'` | `'all'`
- `mode='tag'` 排除知识点标签，符合需求
- 现有 TagPicker 为**多选**，而 sequenceTag 是 M2O **单选**，需扩展组件

## 3. 设计方案

### 3.1 TagPicker 组件扩展

给 [TagPicker.vue](file:///d:/zhao/strapi-backend/src/components/TagPicker.vue) 增加 `singleSelect` prop：

```js
props: {
  singleSelect: { type: Boolean, default: false }
}
```

**单选模式行为**：
- 点击标签后立即触发 `@select` 事件，返回单个对象（非数组）
- 自动关闭弹窗
- 已选中状态只高亮一个标签
- 替换之前选中的标签（非累加）

**调用方式**：
```vue
<TagPicker
  v-model:visible="showSequenceTagPicker"
  mode="tag"
  :single-select="true"
  :selected="form.sequenceTag ? [form.sequenceTag] : []"
  @select="onSequenceTagSelect"
/>
```

### 3.2 课程表单新增字段

文件：[src/pages/course/form.vue](file:///d:/zhao/strapi-backend/src/pages/course/form.vue)

#### 新增"顺序学习"分组（位于"学习设置"之后）

| 字段 | 控件 | 默认值 | 说明 |
|------|------|--------|------|
| enforceSequence | switch 开关 | false | true=硬锁（强制顺序），false=软锁（建议顺序） |
| sequenceNumber | 数字输入框 | 0 | 课程顺序号，0=不参与排序 |
| sequenceTag | TagPicker 单选 mode='tag' | null | 顺序锁定标签，排除知识点标签 |

#### 新增"答题设置"分组（位于"顺序学习"之后）

| 字段 | 控件 | 默认值 | 说明 |
|------|------|--------|------|
| allowRetakeQuiz | switch 开关 | false | true=允许重复答题（按钮永不置灰） |
| quizRetryCount | picker 下拉 | no_retry | 枚举：no_retry/retry_1/retry_2/retry_3/retry_4 |

#### 代码修改点

1. **reactive 对象**（~第 482 行）：添加 5 个字段初始化
2. **submitData 对象**（~第 802 行）：添加提交映射
   - `sequenceTag` 提交为 `{ documentId }` 或 `null`
   - `quizRetryCount` 提交枚举字符串
3. **loadCourseDetail**（~第 700 行）：添加字段回显
   - `sequenceTag` 从后端返回的 relation 对象直接赋值
4. **template**：添加两个新分组 UI
5. **TagPicker 实例**：新增一个 singleSelect 实例用于 sequenceTag

### 3.3 课时表单新增字段

文件：[src/pages/course/lesson/form.vue](file:///d:/zhao/strapi-backend/src/pages/course/lesson/form.vue)

#### 在"学习设置"分组中添加（紧邻已有的 sequenceNumber）

| 字段 | 控件 | 默认值 | 说明 |
|------|------|--------|------|
| enforceSequence | switch 开关 | false | 是否强制课时顺序学习 |
| sequenceTag | TagPicker 单选 mode='tag' | null | 课时顺序锁定标签 |

#### 代码修改点

1. **reactive 对象**（~第 366 行）：添加 2 个字段初始化
2. **submitData 对象**（~第 594 行）：添加提交映射
3. **loadLessonDetail**（~第 522 行）：添加字段回显
4. **template**：在学习设置分区添加 UI
5. **TagPicker 实例**：新增一个 singleSelect 实例

### 3.4 sequenceTag 提交与回显格式

```js
// 提交（M2O 单选）
submitData.sequenceTag = form.sequenceTag
  ? { documentId: form.sequenceTag.documentId }
  : null

// 回显（后端 populate 返回完整对象）
form.sequenceTag = data.sequenceTag || null
```

### 3.5 字段联动说明

| 场景 | 字段组合 | 行为 |
|------|----------|------|
| 不参与顺序 | sequenceNumber=0 或 sequenceTag=null | 不锁定，自由学习 |
| 软锁 | sequenceTag≠null + sequenceNumber>0 + enforceSequence=false | 建议顺序，可跳过 |
| 硬锁 | sequenceTag≠null + sequenceNumber>0 + enforceSequence=true | 强制顺序，不可跳过 |
| 允许重复答题 | allowRetakeQuiz=true | 答题按钮永不置灰 |
| 禁止重复答题 | allowRetakeQuiz=false | 答题完成后按钮置灰 |
| 错题复答 | quizRetryCount=retry_N | 答错后可复答 N 次 |

## 4. 文件改动清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `src/components/TagPicker.vue` | 修改 | 增加 singleSelect prop，单选模式下点击即关闭 |
| `src/pages/course/form.vue` | 修改 | 添加 5 个新字段、2 个新分组、reactive/submitData/loadDetail |
| `src/pages/course/lesson/form.vue` | 修改 | 添加 2 个新字段、reactive/submitData/loadDetail |

## 5. 测试验证

1. **课程表单**：创建/编辑课程时，顺序学习和答题设置分组正常显示、保存、回显
2. **课时表单**：创建/编辑课时时，顺序学习字段正常显示、保存、回显
3. **TagPicker 单选**：sequenceTag 选择时只能选一个，更换时替换旧标签
4. **标签过滤**：sequenceTag 选择器排除知识点标签
5. **数据一致性**：后台保存的字段值与 C 端读取的字段值一致

## 6. 不在本次范围内

- 答题领分逻辑（保持现状，不涉及）
- C 端顺序锁定逻辑（已实现）
- 后端 schema 变更（已完成）
- 后端 API populate 配置（已完成）
