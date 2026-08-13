# 租户编辑页弹窗/下拉失效修复 - 设计文档

| Field | Value |
|-------|-------|
| 日期 | 2026-08-03 |
| 模块 | strapi-backend/src/pages/tenant/detail.vue + strapi-backend/src/components/MediaPicker.vue |
| 范围 | 修复租户编辑页所有弹窗/下拉无法弹出的 Bug |

## 1. 背景与问题

### 1.1 现象
URL `http://localhost:5173/#/pages/tenant/detail?documentId=omkw76zzsk8hum2gybaafrzs&mode=edit` 上的全部弹窗/下拉都无法弹出：

- 媒体选择器（logo / favicon / 分享封面）点击无响应
- "添加渠道"弹窗打不开
- "+ 添加三方配置"弹窗打不开
- 已用 `v-show` 的认证模式 / 预设模板 / 平台 / 应用类型下拉也失效

控制台报错：
- `TypeError: Cannot read properties of null (reading 'type')`
- `TypeError: Cannot assign to read only property '_'`

### 1.2 根因
项目记忆中已记录的 **UniApp H5 Vue 3 KeepAlive Bug**：页面内 `v-if` 条件渲染的弹窗/选择器在 KeepAlive 缓存恢复时，DOM 引用失效，触发 Vue 内部错误，破坏整个页面的响应式系统。残留的 `v-if` 弹窗不仅自身失效，还会连累已修复为 `v-show` 的弹窗一起失效。

### 1.3 残留 `v-if` 弹窗清单
| 弹窗 | 文件 | 行号 | 当前指令 |
|------|------|------|---------|
| 渠道选择器 | detail.vue | L276 | `v-if="showChannelSelector"` |
| 三方配置表单 | detail.vue | L302 | `v-if="showThirdForm"` |
| 媒体选择器 | MediaPicker.vue | L2 | `v-if="visible"` |

## 2. 目标

- 彻底清除租户编辑页所有 `v-if` 弹窗，消除 KeepAlive Bug 触发源
- 恢复全部 7 个弹窗/下拉的正常点击响应
- 不改变任何交互逻辑、样式、API 调用

## 3. 非目标

- 不重构为 `<uni-popup>` / `<picker>` 等原生组件
- 不修改其他页面（即使其他页面可能存在同类问题）
- 不调整 KeepAlive 全局配置
- 不处理 ISSUE-003 的 403 权限错误（独立问题，不在本次范围）

## 4. 设计方案

### 4.1 核心原则
遵循项目记忆中的既定规则："所有页面内的模态框、选择器必须使用 `v-show` 代替 `v-if`"。

### 4.2 修改点

#### 4.2.1 detail.vue - 渠道选择器弹窗（L276）
```diff
- <view v-if="showChannelSelector" class="tag-picker-modal" @click="showChannelSelector = false">
+ <view v-show="showChannelSelector" class="tag-picker-modal" @click="showChannelSelector = false">
```

#### 4.2.2 detail.vue - 三方配置表单弹窗（L302）
```diff
- <view v-if="showThirdForm" class="tag-picker-modal" @click="closeThirdForm">
+ <view v-show="showThirdForm" class="tag-picker-modal" @click="closeThirdForm">
```

#### 4.2.3 MediaPicker.vue - 媒体选择器根容器（L2）
```diff
- <view v-if="visible" class="media-picker-overlay" @click="handleClose">
+ <view v-show="visible" class="media-picker-overlay" @click="handleClose">
```

### 4.3 副作用分析

#### 4.3.1 MediaPicker 内部 `watch(() => props.visible)`
MediaPicker.vue L129-136 中存在 `watch` 监听 `props.visible` 变为 `true` 时触发 `loadFolders()` + `loadMedia()`。改为 `v-show` 后，组件始终挂载，但 `watch` 仍由 `visible` 的值变化触发，**逻辑不变**。

#### 4.3.2 DOM 常驻的开销
- MediaPicker / 渠道选择器 / 三方表单的 DOM 始终存在
- 初始渲染时多渲染 3 个隐藏弹窗（`display: none`），开销可忽略
- 不影响首屏可见区域，因为 `v-show` 等价于 `display: none`

#### 4.3.3 `v-show` 与 `display: flex` 的兼容性
检查三个弹窗根节点的 CSS：
- detail.vue `.tag-picker-modal` → `display: flex`（L1448）
- MediaPicker.vue `.media-picker-overlay` → `display: flex`（L383）

`v-show` 通过内联 `style="display: none"` 隐藏元素，会覆盖 CSS 中的 `display: flex`。当 `v-show` 切换为 `true` 时，Vue 会移除内联 `display: none`，恢复 CSS 中的 `display: flex`，**无冲突**。

### 4.4 不改动的部分
- 所有 `@click` / `@click.stop` 事件绑定保持原样
- 所有 `showXxx` 响应式变量的赋值逻辑保持原样
- `closeThirdForm()` / `handleClose()` 等关闭函数保持原样
- 已用 `v-show` 的 4 个下拉框（认证模式 / 预设模板 / 平台 / 应用类型）保持原样

## 5. 验证方案

### 5.1 手动验证步骤
1. 登录后台，访问 `http://localhost:5173/#/pages/tenant/detail?documentId=omkw76zzsk8hum2gybaafrzs&mode=edit`
2. 依次点击以下 7 个弹窗/下拉，确认每个都能正常弹出并关闭：
   - 站点 Logo "选择 Logo"
   - Favicon "选择图标"
   - 分享封面图 "选择封面"
   - "添加渠道" 按钮
   - "+ 添加配置" 三方配置按钮
   - "认证模式" 下拉
   - "预设模板" 下拉
3. 打开浏览器控制台，确认无 `Cannot read properties of null (reading 'type')` 或 `Cannot assign to read only property '_'` 错误
4. 在 MediaPicker 中切换文件夹、上传图片、选择图片，确认回调正常
5. 渠道选择器中勾选/取消勾选渠道，确认 `selectedChannels` 更新
6. 三方配置表单填写并保存，确认 API 调用成功

### 5.2 回归验证
- 从其他页面（如租户列表）跳转到租户编辑页，重复上述验证（验证 KeepAlive 缓存恢复场景）
- 离开租户编辑页后再返回，重复上述验证

## 6. 风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| MediaPicker 初始挂载时调用 API | 低 | `watch` 仅在 `visible` 变为 `true` 时触发，初始挂载不调用 |
| 其他页面引用 MediaPicker 受影响 | 低 | `v-show` 改动对调用方透明，行为一致 |
| CSS `display` 冲突 | 无 | `v-show` 内联样式优先级高于 CSS class |

## 7. 文件清单

| 文件 | 改动行数 |
|------|---------|
| `strapi-backend/src/pages/tenant/detail.vue` | 2 行（L276, L302） |
| `strapi-backend/src/components/MediaPicker.vue` | 1 行（L2） |
| **总计** | **3 行** |
