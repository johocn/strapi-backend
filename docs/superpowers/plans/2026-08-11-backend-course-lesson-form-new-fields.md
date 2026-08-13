# 后台课程/课时表单新增字段实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 strapi-backend 后台课程表单和课时表单中添加顺序锁定和答题控制相关字段，使管理员能配置课程的顺序学习、答题控制和错题复答。

**Architecture:** 扩展 TagPicker 组件支持单选模式，在课程表单新增"顺序学习"和"答题设置"两个分组，在课时表单"学习设置"分组中新增 2 个字段。所有字段通过现有 API 提交到 Strapi 后端（schema 已就绪）。

**Tech Stack:** uni-app Vue3 + Vant H5 + Strapi 自定义路由

**Spec:** `docs/superpowers/specs/2026-08-11-backend-course-lesson-form-new-fields-design.md`

---

## 文件结构

| 文件 | 责任 | 改动 |
|------|------|------|
| `src/components/TagPicker.vue` | 标签选择器组件 | 增加 `singleSelect` prop，单选模式下点击即选中并关闭 |
| `src/pages/course/form.vue` | 课程表单页面 | 新增 5 个字段、2 个分组、reactive/submitData/loadDetail |
| `src/pages/course/lesson/form.vue` | 课时表单页面 | 新增 2 个字段、reactive/submitData/loadDetail |

---

### Task 1: 扩展 TagPicker 支持单选模式

**Files:**
- Modify: `src/components/TagPicker.vue` (props 第 124-131 行，toggleTag 第 321-328 行，picker-title 第 5 行)

- [ ] **Step 1: 增加 singleSelect prop**

在 `src/components/TagPicker.vue` 第 124-131 行的 props 中增加 `singleSelect`：

```js
const props = defineProps({
  visible: { type: Boolean, default: false },
  selected: { type: Array, default: () => [] },
  defaultGroupId: { type: String, default: null },
  defaultGroupName: { type: String, default: null },
  mode: { type: String, default: 'all' },
  siteId: { type: String, default: null },
  singleSelect: { type: Boolean, default: false }
})
```

- [ ] **Step 2: 修改 toggleTag 函数支持单选**

将第 321-328 行的 `toggleTag` 函数替换为：

```js
function toggleTag(tag) {
  if (props.singleSelect) {
    // 单选模式：替换为单个标签，立即确认并关闭
    internalSelected.value = [tag]
    emit('select', [tag])
    handleClose()
    return
  }
  const idx = internalSelected.value.findIndex(t => t.documentId === tag.documentId)
  if (idx > -1) {
    internalSelected.value.splice(idx, 1)
  } else {
    internalSelected.value.push(tag)
  }
}
```

- [ ] **Step 3: 修改标题动态显示**

将第 5 行的标题改为动态：

```html
<text class="picker-title">{{ singleSelect ? '选择顺序标签' : '选择标签' }}</text>
```

- [ ] **Step 4: 单选模式下隐藏底部已选区域和确认按钮**

将第 77-87 行的 `picker-footer` 增加条件：

```html
<view v-if="!singleSelect" class="picker-footer">
  <view class="selected-tags">
    <text class="selected-label">已选：</text>
    <view v-for="tag in internalSelected" :key="tag.documentId" class="selected-tag">
      <text>{{ tag.name }}</text>
      <text class="selected-remove" @click="toggleTag(tag)">×</text>
    </view>
    <text v-if="internalSelected.length === 0" class="selected-empty">未选择</text>
  </view>
  <button class="btn-confirm" @click="handleConfirm">确认</button>
</view>
```

- [ ] **Step 5: 验证组件改动**

启动 strapi-backend 开发服务器（如未运行），访问课程表单页面，打开常规标签选择器，确认多选模式仍正常工作（底部显示已选和确认按钮）。单选模式暂无调用点，下一任务验证。

- [ ] **Step 6: Commit**

```bash
cd d:\zhao\strapi-backend
git add src/components/TagPicker.vue
git commit -m "feat(TagPicker): 增加单选模式 singleSelect prop，支持顺序标签选择"
```

---

### Task 2: 课程表单新增 reactive 字段

**Files:**
- Modify: `src/pages/course/form.vue:482-516` (reactive 对象)

- [ ] **Step 1: 在 reactive 对象中添加 5 个新字段**

在 `src/pages/course/form.vue` 第 516 行 `allowCrossChannel: true` 之后（`}` 之前）添加：

```js
const form = reactive({
  title: '',
  description: '',
  author: '',
  cover: null,
  coverUrl: '',
  thumbnail: null,
  thumbnailUrl: '',
  price: 0,
  originalPrice: 0,
  discountPrice: 0,
  isFree: false,
  isPaid: false,
  category: null,
  tags: [],
  difficulty: 'beginner',
  level: 'introductory',
  duration: '',
  isFeatured: false,
  sort: 0,
  enablePoints: false,
  points: 0,
  pointsType: 'course_points',
  enrollStartDate: '',
  enrollEndDate: '',
  courseStartDate: '',
  courseEndDate: '',
  status: 'draft',
  auditStatus: 'pending',
  language: 'zh-CN',
  channelScope: 'all',
  channelIds: [],
  pointChannel: null,
  allowCrossChannel: true,
  // 顺序学习
  enforceSequence: false,
  sequenceNumber: 0,
  sequenceTag: null,
  // 答题设置
  allowRetakeQuiz: false,
  quizRetryCount: 'no_retry'
})
```

- [ ] **Step 2: 添加顺序标签选择器相关状态变量**

在第 533 行 `showPointChannelPicker` 之后添加：

```js
const showSequenceTagPicker = ref(false)
const quizRetryCountOptions = ['no_retry', 'retry_1', 'retry_2', 'retry_3', 'retry_4']
const quizRetryCountIndex = ref(0)
```

- [ ] **Step 3: 添加 quizRetryCount 选项映射（中文标签）**

在 `quizRetryCountOptions` 之后添加：

```js
const quizRetryCountLabels = ['不允许复答', '可复答1次', '可复答2次', '可复答3次', '可复答4次']
```

- [ ] **Step 4: Commit**

```bash
cd d:\zhao\strapi-backend
git add src/pages/course/form.vue
git commit -m "feat(course-form): reactive 增加 enforceSequence/sequenceNumber/sequenceTag/allowRetakeQuiz/quizRetryCount 字段"
```

---

### Task 3: 课程表单新增顺序标签选择器逻辑

**Files:**
- Modify: `src/pages/course/form.vue` (onTagSelect 之后添加 onSequenceTagSelect，loadCourseDetail 添加回显)

- [ ] **Step 1: 添加 onSequenceTagSelect 回调**

在 `onTagSelect` 函数之后（约第 680 行附近，可搜索 `function onTagSelect` 定位）添加：

```js
function onSequenceTagSelect(tags) {
  // 单选模式，tags 是数组但只有一个元素
  if (tags && tags.length > 0) {
    form.sequenceTag = tags[0]
  } else {
    form.sequenceTag = null
  }
}

function removeSequenceTag() {
  form.sequenceTag = null
}

function handleQuizRetryCountChange(e) {
  const idx = e.detail.value
  quizRetryCountIndex.value = idx
  form.quizRetryCount = quizRetryCountOptions[idx]
}
```

- [ ] **Step 2: 在 loadCourseDetail 中添加新字段回显**

在 `src/pages/course/form.vue` 的 `loadCourseDetail` 函数中（第 745 行 `if (typeof data.allowCrossChannel === 'boolean')` 之后）添加：

```js
    if (typeof data.allowCrossChannel === 'boolean') form.allowCrossChannel = data.allowCrossChannel
    // 顺序学习字段回显
    if (typeof data.enforceSequence === 'boolean') form.enforceSequence = data.enforceSequence
    if (typeof data.sequenceNumber === 'number') form.sequenceNumber = data.sequenceNumber
    if (data.sequenceTag) {
      form.sequenceTag = data.sequenceTag
    } else {
      form.sequenceTag = null
    }
    // 答题设置字段回显
    if (typeof data.allowRetakeQuiz === 'boolean') form.allowRetakeQuiz = data.allowRetakeQuiz
    if (data.quizRetryCount) {
      form.quizRetryCount = data.quizRetryCount
      quizRetryCountIndex.value = quizRetryCountOptions.indexOf(data.quizRetryCount)
    }
```

- [ ] **Step 3: Commit**

```bash
cd d:\zhao\strapi-backend
git add src/pages/course/form.vue
git commit -m "feat(course-form): 添加顺序标签选择器回调和 loadCourseDetail 回显逻辑"
```

---

### Task 4: 课程表单新增 submitData 字段映射

**Files:**
- Modify: `src/pages/course/form.vue:801-831` (submitData 对象)

- [ ] **Step 1: 在 submitData 中添加新字段提交映射**

在 `src/pages/course/form.vue` 第 830 行 `allowCrossChannel: form.allowCrossChannel` 之后（`}` 之前）添加：

```js
  const submitData = {
    title: form.title,
    description: form.description,
    author: form.author,
    cover: coverFileId.value || null,
    thumbnail: thumbnailFileId.value || null,
    price: parseFloat(form.price) || 0,
    originalPrice: parseFloat(form.originalPrice) || 0,
    discountPrice: parseFloat(form.discountPrice) || 0,
    isFree: form.isFree,
    isPaid: form.isPaid,
    difficulty: form.difficulty,
    level: form.level,
    duration: form.duration,
    isFeatured: form.isFeatured,
    sort: parseInt(form.sort) || 0,
    enablePoints: form.enablePoints,
    points: parseInt(form.points) || 0,
    pointsType: form.pointsType,
    enrollStartDate: form.enrollStartDate,
    enrollEndDate: form.enrollEndDate,
    courseStartDate: form.courseStartDate,
    courseEndDate: form.courseEndDate,
    status: form.status,
    auditStatus: form.auditStatus,
    language: form.language,
    channelScope: form.channelScope,
    channelIds: form.channelScope === 'specific' ? form.channelIds.map(id => Number(id)) : [],
    pointChannel: form.channelScope === 'specific' && form.pointChannel ? Number(form.pointChannel) : null,
    allowCrossChannel: form.allowCrossChannel,
    // 顺序学习
    enforceSequence: form.enforceSequence,
    sequenceNumber: parseInt(form.sequenceNumber) || 0,
    sequenceTag: form.sequenceTag ? { documentId: form.sequenceTag.documentId } : null,
    // 答题设置
    allowRetakeQuiz: form.allowRetakeQuiz,
    quizRetryCount: form.quizRetryCount
  }
```

- [ ] **Step 2: Commit**

```bash
cd d:\zhao\strapi-backend
git add src/pages/course/form.vue
git commit -m "feat(course-form): submitData 增加顺序学习和答题设置字段映射"
```

---

### Task 5: 课程表单新增 template 分组

**Files:**
- Modify: `src/pages/course/form.vue:218-220` (学习设置分组结束与渠道设置分组开始之间)

- [ ] **Step 1: 在"学习设置"分组之后、"渠道设置"分组之前插入两个新分组**

在第 218 行 `</view>`（学习设置分组结束）之后、第 220 行 `<view class="form-section">` （渠道设置开始）之前插入：

```html
      <!-- 顺序学习 -->
      <view class="form-section">
        <view class="section-title">顺序学习</view>

        <view class="form-item">
          <text class="form-label">强制顺序学习</text>
          <switch :checked="form.enforceSequence" @change="form.enforceSequence = !form.enforceSequence" />
          <text class="form-hint">开启后学员必须按顺序号依次学习（硬锁），关闭则为建议顺序（软锁，可跳过）</text>
        </view>

        <view class="form-item">
          <text class="form-label">课程顺序号</text>
          <input
            type="number"
            v-model="form.sequenceNumber"
            placeholder="0"
            class="form-input"
          />
          <text class="form-hint">0=不参与顺序排序，相同顺序标签内按序号从小到大排列</text>
        </view>

        <view class="form-item">
          <text class="form-label">顺序锁定标签</text>
          <view class="tag-list">
            <view v-if="form.sequenceTag" class="tag-item">
              <text>{{ form.sequenceTag.name }}</text>
              <text class="tag-remove" @click="removeSequenceTag">×</text>
            </view>
            <view class="tag-add" @click="showSequenceTagPicker = true">
              <text>{{ form.sequenceTag ? '更换标签' : '+ 选择标签' }}</text>
            </view>
          </view>
          <text class="form-hint">选择相同标签的课程/课时按顺序号锁定，排除知识点标签</text>
        </view>
      </view>

      <!-- 答题设置 -->
      <view class="form-section">
        <view class="section-title">答题设置</view>

        <view class="form-item">
          <text class="form-label">允许重复答题</text>
          <switch :checked="form.allowRetakeQuiz" @change="form.allowRetakeQuiz = !form.allowRetakeQuiz" />
          <text class="form-hint">开启后答题按钮永不置灰，学员可反复答题；关闭后答题完成即锁定</text>
        </view>

        <view class="form-item">
          <text class="form-label">错题复答次数</text>
          <picker mode="selector" :range="quizRetryCountLabels" @change="handleQuizRetryCountChange">
            <view class="picker-value">
              <text>{{ quizRetryCountLabels[quizRetryCountIndex] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
          <text class="form-hint">答错后允许复答的次数，默认不允许复答</text>
        </view>
      </view>
```

- [ ] **Step 2: 在 template 底部添加 sequenceTag 的 TagPicker 实例**

在第 385 行知识点选择器 `</TagPicker>` 之后添加：

```html
    <!-- 顺序标签选择器（单选） -->
    <TagPicker
      v-model:visible="showSequenceTagPicker"
      mode="tag"
      :single-select="true"
      :selected="form.sequenceTag ? [form.sequenceTag] : []"
      @select="onSequenceTagSelect"
    />
```

- [ ] **Step 3: 添加 form-hint 样式（如不存在）**

在 `<style>` 中（约第 922 行 `.form-section` 附近）添加：

```css
.form-hint {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  line-height: 1.4;
}
```

- [ ] **Step 4: 验证课程表单**

访问 `http://localhost:5173/#/pages/course/form?id=fc4m3ean4woec3m8tw6ur9z4`，确认：
1. "顺序学习"和"答题设置"分组正常显示
2. 顺序标签选择器点击后弹出 TagPicker（单选模式），选择后立即关闭并回显
3. quizRetryCount 下拉选择正常
4. 保存后重新加载页面，字段值正确回显

- [ ] **Step 5: Commit**

```bash
cd d:\zhao\strapi-backend
git add src/pages/course/form.vue
git commit -m "feat(course-form): 新增顺序学习和答题设置分组 UI"
```

---

### Task 6: 课时表单新增 reactive 字段

**Files:**
- Modify: `src/pages/course/lesson/form.vue:365-387` (reactive 对象)

- [ ] **Step 1: 在 reactive 对象中添加 2 个新字段**

在 `src/pages/course/lesson/form.vue` 第 386 行 `pointsType: 'lesson_points'` 之后（`}` 之前）添加：

```js
const form = reactive({
  title: '',
  summary: '',
  content: '',
  type: 'video',
  thumbnailUrl: '',
  video_url: '',
  audio_url: '',
  duration: 0,
  sequenceNumber: 0,
  isFreePreview: false,
  previewDuration: 0,
  completionThreshold: 100,
  isRequired: true,
  learningObjectives: '',
  prerequisites: '',
  course: null,
  tags: [],
  sort: 0,
  enablePoints: false,
  points: 0,
  pointsType: 'lesson_points',
  // 顺序学习
  enforceSequence: false,
  sequenceTag: null
})
```

- [ ] **Step 2: 添加顺序标签选择器状态变量**

在第 397 行 `const selectedTags = ref([])` 之后添加：

```js
const showSequenceTagPicker = ref(false)
```

- [ ] **Step 3: 添加 onSequenceTagSelect 和 removeSequenceTag 回调**

在 `onTagSelect` 函数之后（可搜索 `function onTagSelect` 定位）添加：

```js
function onSequenceTagSelect(tags) {
  if (tags && tags.length > 0) {
    form.sequenceTag = tags[0]
  } else {
    form.sequenceTag = null
  }
}

function removeSequenceTag() {
  form.sequenceTag = null
}
```

- [ ] **Step 4: Commit**

```bash
cd d:\zhao\strapi-backend
git add src/pages/course/lesson/form.vue
git commit -m "feat(lesson-form): reactive 增加 enforceSequence/sequenceTag 字段"
```

---

### Task 7: 课时表单新增 loadDetail 回显和 submitData 映射

**Files:**
- Modify: `src/pages/course/lesson/form.vue:527-529` (loadLessonDetail fields 数组)
- Modify: `src/pages/course/lesson/form.vue:594-617` (submitData)

- [ ] **Step 1: 在 loadLessonDetail 的 fields 数组中添加新字段**

在第 527-529 行的 `fields` 数组中添加 `enforceSequence`：

```js
    const fields = ['title', 'summary', 'content', 'type', 'video_url', 'audio_url',
      'duration', 'sequenceNumber', 'isFreePreview', 'previewDuration', 'completionThreshold',
      'isRequired', 'learningObjectives', 'prerequisites', 'sort', 'enablePoints', 'points', 'pointsType',
      'enforceSequence']
```

- [ ] **Step 2: 在 loadLessonDetail 中添加 sequenceTag 回显**

在第 545-547 行 `if (data.tags)` 之后添加：

```js
    if (data.tags) {
      selectedTags.value = data.tags
    }
    // 顺序标签回显
    if (data.sequenceTag) {
      form.sequenceTag = data.sequenceTag
    } else {
      form.sequenceTag = null
    }
```

- [ ] **Step 3: 在 submitData 中添加新字段映射**

在第 617 行 `attachments: ...` 之后、`}` 之前添加：

```js
  const submitData = {
    title: form.title,
    summary: form.summary,
    content: form.content,
    type: form.type,
    duration: parseInt(form.duration) || 0,
    sequenceNumber: parseInt(form.sequenceNumber) || 0,
    isFreePreview: form.isFreePreview,
    previewDuration: parseInt(form.previewDuration) || 0,
    completionThreshold: parseInt(form.completionThreshold) || 100,
    isRequired: form.isRequired,
    learningObjectives: form.learningObjectives,
    prerequisites: form.prerequisites,
    course: { documentId: form.course.documentId },
    sort: parseInt(form.sort) || 0,
    enablePoints: form.enablePoints,
    points: parseInt(form.points) || 0,
    pointsType: form.pointsType,
    thumbnail: thumbnailId.value || null,
    video_url: form.video_url || null,
    audio_url: form.audio_url || null,
    images: imageIdList.value.length > 0 ? imageIdList.value : null,
    attachments: attachmentIdList.value.length > 0 ? attachmentIdList.value : null,
    // 顺序学习
    enforceSequence: form.enforceSequence,
    sequenceTag: form.sequenceTag ? { documentId: form.sequenceTag.documentId } : null
  }
```

- [ ] **Step 4: Commit**

```bash
cd d:\zhao\strapi-backend
git add src/pages/course/lesson/form.vue
git commit -m "feat(lesson-form): 添加 enforceSequence/sequenceTag 回显和提交映射"
```

---

### Task 8: 课时表单新增 template 字段

**Files:**
- Modify: `src/pages/course/lesson/form.vue:222-224` (学习设置分组结束与标签管理分组开始之间)
- Modify: `src/pages/course/lesson/form.vue:293` (TagPicker 实例之后)

- [ ] **Step 1: 在"学习设置"分组中、序号字段之后添加 enforceSequence 和 sequenceTag**

将第 163-172 行的"时长+序号" `form-row` 之后（第 172 行 `</view>` 之后）、第 174 行"免费预览+必修课时" `form-row` 之前，插入顺序学习字段。或者更清晰的做法：在第 221 行 `</view>`（前置条件结束）之后、第 222 行 `</view>`（学习设置分组结束）之前插入：

```html
        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">强制顺序学习</text>
            <switch :checked="form.enforceSequence" @change="form.enforceSequence = !form.enforceSequence" />
          </view>
          <view class="form-item half">
            <text class="form-label">顺序锁定标签</text>
            <view class="tag-list">
              <view v-if="form.sequenceTag" class="tag-item">
                <text>{{ form.sequenceTag.name }}</text>
                <text class="tag-remove" @click="removeSequenceTag">×</text>
              </view>
              <view class="tag-add" @click="showSequenceTagPicker = true">
                <text>{{ form.sequenceTag ? '更换' : '+ 选择' }}</text>
              </view>
            </view>
          </view>
        </view>
```

- [ ] **Step 2: 在 template 底部添加 sequenceTag 的 TagPicker 实例**

在第 293 行 `</TagPicker>`（常规标签选择器）之后添加：

```html
    <!-- 顺序标签选择器（单选） -->
    <TagPicker
      v-model:visible="showSequenceTagPicker"
      mode="tag"
      :single-select="true"
      :selected="form.sequenceTag ? [form.sequenceTag] : []"
      @select="onSequenceTagSelect"
    />
```

- [ ] **Step 3: 验证课时表单**

访问 `http://localhost:5173/#/pages/course/lesson/form?id=2e73314260c4feadbeb1ac5a`，确认：
1. 学习设置分组中显示"强制顺序学习"开关和"顺序锁定标签"选择器
2. 顺序标签选择器点击后弹出 TagPicker（单选模式），选择后立即关闭并回显
3. 保存后重新加载页面，字段值正确回显

- [ ] **Step 4: Commit**

```bash
cd d:\zhao\strapi-backend
git add src/pages/course/lesson/form.vue
git commit -m "feat(lesson-form): 学习设置分组新增 enforceSequence 和 sequenceTag UI"
```

---

### Task 9: 端到端验证

**Files:**
- 无文件修改，仅验证

- [ ] **Step 1: 验证课程表单创建**

1. 访问 `http://localhost:5173/#/pages/course/form`（新建课程）
2. 填写基本信息（标题必填）
3. 在"顺序学习"分组：开启强制顺序学习，顺序号填 1，选择顺序标签
4. 在"答题设置"分组：开启允许重复答题，选择"可复答2次"
5. 点击保存，确认创建成功
6. 返回列表，重新编辑该课程，确认所有字段正确回显

- [ ] **Step 2: 验证课程表单编辑**

1. 访问 `http://localhost:5173/#/pages/course/form?id=fc4m3ean4woec3m8tw6ur9z4`
2. 确认现有课程的 enforceSequence/sequenceNumber/sequenceTag/allowRetakeQuiz/quizRetryCount 字段正确回显
3. 修改字段值，保存后重新加载确认修改生效

- [ ] **Step 3: 验证课时表单**

1. 访问 `http://localhost:5173/#/pages/course/lesson/form?id=2e73314260c4feadbeb1ac5a`
2. 确认 enforceSequence 和 sequenceTag 字段正确回显
3. 开启强制顺序学习，选择顺序标签
4. 保存后重新加载确认修改生效

- [ ] **Step 4: 验证 TagPicker 单选模式**

1. 在课程/课时表单中点击顺序标签选择器
2. 确认弹窗标题为"选择顺序标签"
3. 确认底部无"已选"和"确认"按钮
4. 点击一个标签，确认弹窗立即关闭，选中标签回显
5. 再次点击"更换"，选择另一个标签，确认替换而非累加

- [ ] **Step 5: 验证标签过滤**

1. 打开顺序标签选择器
2. 确认左侧分组列表不包含"知识点"分组（mode='tag' 过滤）
3. 确认只能选择普通标签

- [ ] **Step 6: 验证 C 端数据一致性**

1. 在后台修改某课程的顺序锁定配置
2. 访问 C 端 `http://localhost:5175/` 首页
3. 确认该课程显示对应的锁定状态（硬锁/软锁/自由）

- [ ] **Step 7: Commit 验证通过标记**

```bash
cd d:\zhao\strapi-backend
git commit --allow-empty -m "test: 后台课程/课时表单新增字段端到端验证通过"
```

---

## 自我审查清单

- [x] Spec 覆盖：设计文档中 3.1 TagPicker 扩展 → Task 1；3.2 课程表单 → Task 2-5；3.3 课时表单 → Task 6-8；5. 测试验证 → Task 9
- [x] 无占位符：所有步骤包含完整代码
- [x] 类型一致性：sequenceTag 提交格式 `{ documentId }` 在课程和课时表单一致；onSequenceTagSelect 回调签名一致
- [x] 字段默认值：enforceSequence=false, sequenceNumber=0, sequenceTag=null, allowRetakeQuiz=false, quizRetryCount='no_retry' 与设计文档一致
