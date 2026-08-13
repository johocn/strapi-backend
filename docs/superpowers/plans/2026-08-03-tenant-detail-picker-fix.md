# 租户编辑页弹窗/下拉失效修复 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将租户编辑页残留的 3 处 `v-if` 弹窗改为 `v-show`，消除 UniApp H5 Vue 3 KeepAlive Bug，恢复全部 7 个弹窗/下拉的正常点击响应。

**Architecture:** 直接替换 3 个弹窗根元素的 `v-if` 指令为 `v-show`，不改动任何逻辑、样式、事件绑定或 API 调用。`v-show` 通过内联 `display: none` 隐藏元素，与 CSS 中的 `display: flex` 无冲突。

**Tech Stack:** Vue 3 (UniApp H5 模式), Vite, Pinia

**Spec:** `docs/superpowers/specs/2026-08-03-tenant-detail-picker-fix-design.md`

---

## 文件结构

| 文件 | 责任 | 改动类型 |
|------|------|---------|
| `strapi-backend/src/components/MediaPicker.vue` | 媒体选择器组件根容器 | 修改 L2 |
| `strapi-backend/src/pages/tenant/detail.vue` | 租户编辑页（渠道选择器 + 三方配置表单弹窗） | 修改 L276, L302 |

---

### Task 1: 修改 MediaPicker.vue 根容器 v-if → v-show

**Files:**
- Modify: `strapi-backend/src/components/MediaPicker.vue:2`

- [ ] **Step 1: 读取文件确认当前内容**

Run: `Read tool on d:\zhao\strapi-backend\src\components\MediaPicker.vue (limit 5 lines)`
Expected: L2 内容为 `<view v-if="visible" class="media-picker-overlay" @click="handleClose">`

- [ ] **Step 2: 执行 Edit 替换 v-if 为 v-show**

使用 Edit 工具：
- `file_path`: `d:\zhao\strapi-backend\src\components\MediaPicker.vue`
- `old_string`: `<view v-if="visible" class="media-picker-overlay" @click="handleClose">`
- `new_string`: `<view v-show="visible" class="media-picker-overlay" @click="handleClose">`

- [ ] **Step 3: 读取修改后的 L1-L5 验证**

Run: `Read tool on d:\zhao\strapi-backend\src\components\MediaPicker.vue (limit 5 lines)`
Expected: L2 显示 `<view v-show="visible" class="media-picker-overlay" @click="handleClose">`

- [ ] **Step 4: 提交**

```bash
cd d:\zhao\strapi-backend
git add src/components/MediaPicker.vue
git commit -m "fix(MediaPicker): v-if 改 v-show 避免 KeepAlive Bug"
```

---

### Task 2: 修改 detail.vue 渠道选择器弹窗 v-if → v-show

**Files:**
- Modify: `strapi-backend/src/pages/tenant/detail.vue:276`

- [ ] **Step 1: 读取文件确认当前内容**

Run: `Read tool on d:\zhao\strapi-backend\src\pages\tenant\detail.vue (offset 276, limit 3 lines)`
Expected: L276 内容为 `<view v-if="showChannelSelector" class="tag-picker-modal" @click="showChannelSelector = false">`

- [ ] **Step 2: 执行 Edit 替换 v-if 为 v-show**

使用 Edit 工具：
- `file_path`: `d:\zhao\strapi-backend\src\pages\tenant\detail.vue`
- `old_string`: `<view v-if="showChannelSelector" class="tag-picker-modal" @click="showChannelSelector = false">`
- `new_string`: `<view v-show="showChannelSelector" class="tag-picker-modal" @click="showChannelSelector = false">`

- [ ] **Step 3: 读取修改后的 L275-L278 验证**

Run: `Read tool on d:\zhao\strapi-backend\src\pages\tenant\detail.vue (offset 275, limit 4 lines)`
Expected: L276 显示 `<view v-show="showChannelSelector" class="tag-picker-modal" @click="showChannelSelector = false">`

- [ ] **Step 4: 提交**

```bash
cd d:\zhao\strapi-backend
git add src/pages/tenant/detail.vue
git commit -m "fix(tenant-detail): 渠道选择器 v-if 改 v-show 避免 KeepAlive Bug"
```

---

### Task 3: 修改 detail.vue 三方配置表单弹窗 v-if → v-show

**Files:**
- Modify: `strapi-backend/src/pages/tenant/detail.vue:302`

- [ ] **Step 1: 读取文件确认当前内容**

Run: `Read tool on d:\zhao\strapi-backend\src\pages\tenant\detail.vue (offset 302, limit 3 lines)`
Expected: L302 内容为 `<view v-if="showThirdForm" class="tag-picker-modal" @click="closeThirdForm">`

- [ ] **Step 2: 执行 Edit 替换 v-if 为 v-show**

使用 Edit 工具：
- `file_path`: `d:\zhao\strapi-backend\src\pages\tenant\detail.vue`
- `old_string`: `<view v-if="showThirdForm" class="tag-picker-modal" @click="closeThirdForm">`
- `new_string`: `<view v-show="showThirdForm" class="tag-picker-modal" @click="closeThirdForm">`

- [ ] **Step 3: 读取修改后的 L301-L304 验证**

Run: `Read tool on d:\zhao\strapi-backend\src\pages\tenant\detail.vue (offset 301, limit 4 lines)`
Expected: L302 显示 `<view v-show="showThirdForm" class="tag-picker-modal" @click="closeThirdForm">`

- [ ] **Step 4: 提交**

```bash
cd d:\zhao\strapi-backend
git add src/pages/tenant/detail.vue
git commit -m "fix(tenant-detail): 三方配置表单 v-if 改 v-show 避免 KeepAlive Bug"
```

---

### Task 4: 全局验证 - 确认无残留 v-if 弹窗

**Files:**
- Read: `strapi-backend/src/pages/tenant/detail.vue`
- Read: `strapi-backend/src/components/MediaPicker.vue`

- [ ] **Step 1: Grep 搜索 detail.vue 中所有 v-if 弹窗**

Run: Grep tool
- `pattern`: `v-if="show`
- `path`: `d:\zhao\strapi-backend\src\pages\tenant\detail.vue`
- `output_mode`: `content`
- `-n`: true

Expected: 仅剩 L124 (`v-if="formData.authConfig.authMode === 'third'"`)、L142 (`v-if="formData.authConfig.authMode === 'sso'"`)、L147 (`v-if="formData.featureFlags.sso"`)、L162 (`v-if="formData.authConfig.registerEnabled"`)、L177 (`v-if="formData.channelUsage !== 'site_only'"`)、L196 (`v-if="selectedChannels.length === 0"`)、L218 (`v-if="config.platform"`)、L234 (`v-if="thirdConfigs.length === 0"`)、L295 (`v-if="flatTree.length === 0"`)、L335 (`v-if="currentPlatform?.hasMerchantId"`)、L339 (`v-if="thirdForm.platform === 'wechat'"`)、L343 (`v-if="thirdForm.platform === 'wechat'"`)、L397 (`v-if="templateList.length === 0"`) 等业务逻辑条件渲染，**不应**出现 `v-if="showChannelSelector"`、`v-if="showThirdForm"`、`v-if="showAuthModePicker"`、`v-if="showTemplatePicker"`、`v-if="showPlatformPicker"`、`v-if="showAppTypePicker"` 这类弹窗控制 v-if。

- [ ] **Step 2: Grep 搜索 MediaPicker.vue 中所有 v-if 弹窗**

Run: Grep tool
- `pattern`: `v-if=`
- `path`: `d:\zhao\strapi-backend\src\components\MediaPicker.vue`
- `output_mode`: `content`
- `-n`: true

Expected: 仅剩 L2 为 `v-show="visible"`（不再是 `v-if`），其他 `v-if` 应为 `v-if="loading"`、`v-if="!loading && mediaList.length === 0"`、`v-if="isImage(item.mime)"`、`v-if="searchKeyword"`、`v-if="f.hasChildren"`、`v-else` 等业务逻辑，无弹窗根容器的 `v-if`。

---

### Task 5: 端到端手动验证

**Files:**
- 无文件改动，仅运行时验证

- [ ] **Step 1: 确认 Vite 开发服务器运行**

Run: 检查 `http://localhost:5173` 可访问

- [ ] **Step 2: 浏览器访问租户编辑页**

URL: `http://localhost:5173/#/pages/tenant/detail?documentId=omkw76zzsk8hum2gybaafrzs&mode=edit`

- [ ] **Step 3: 依次验证 7 个弹窗/下拉**

| 序号 | 元素 | 期望行为 |
|------|------|---------|
| 1 | 站点 Logo "选择 Logo" | MediaPicker 弹出，显示文件夹侧栏 + 文件网格 |
| 2 | Favicon "选择图标" | MediaPicker 弹出 |
| 3 | 分享封面图 "选择封面" | MediaPicker 弹出 |
| 4 | "添加渠道" 按钮 | 渠道选择器弹出，显示渠道树形列表 |
| 5 | "+ 添加配置" 按钮 | 三方配置表单弹出 |
| 6 | "认证模式" 下拉 | 下拉弹出，显示 3 个选项 |
| 7 | "预设模板" 下拉 | 下拉弹出，显示模板列表（如权限正常） |

- [ ] **Step 4: 打开浏览器控制台验证无报错**

Expected: 控制台无 `Cannot read properties of null (reading 'type')` 或 `Cannot assign to read only property '_'` 错误

- [ ] **Step 5: 验证 MediaPicker 功能完整**

在弹出的 MediaPicker 中：
- 点击文件夹切换 → 文件列表刷新
- 点击"上传"按钮 → 触发 chooseImage
- 点击文件卡片 → 触发 `@select` 回调，弹窗关闭，表单字段回填

- [ ] **Step 6: 验证 KeepAlive 场景**

- 离开租户编辑页（如点击返回到租户列表）
- 再次进入租户编辑页
- 重复 Step 3，确认所有弹窗仍可正常弹出

---

## Self-Review

### 1. Spec coverage
- §4.2.1 渠道选择器 v-if→v-show → Task 2 ✓
- §4.2.2 三方配置表单 v-if→v-show → Task 3 ✓
- §4.2.3 MediaPicker v-if→v-show → Task 1 ✓
- §5.1 手动验证 → Task 5 ✓
- §5.2 回归验证 → Task 5 Step 6 ✓

### 2. Placeholder scan
- 无 TBD/TODO
- 所有 Edit 步骤提供了精确的 old_string / new_string
- 所有验证步骤提供了具体的期望输出
- Grep 步骤提供了具体的 pattern 和 path

### 3. Type consistency
- 所有 `showXxx` 变量名与 detail.vue 源码一致：
  - `showChannelSelector`（L276, L473, L201, L280）
  - `showThirdForm`（L302, L474, L895, L911, L936）
  - `showAuthModePicker`、`showTemplatePicker`、`showPlatformPicker`、`showAppTypePicker`、`showMediaPicker`
- `visible` prop 名与 MediaPicker.vue L89 定义一致
- `handleClose` / `closeThirdForm` 函数名与源码一致

无问题，计划可执行。
