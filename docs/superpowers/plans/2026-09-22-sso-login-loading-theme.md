# SSO 登录中转等待区统一美化（方案 B）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把星枢 SSO 登录的中转等待区统一为品牌化加载门面（淡紫背景 + 中心 logo/spinner + 标题「星枢统一关系中心」+ 广告语轮播 + 状态胶囊），覆盖 `login.vue` 与 `login-callback.vue`。

**Architecture:** 新建可复用门面组件 `sso-loading-facade.vue` + 收敛文案/品牌令牌字典 `dict.js`，接入 `login.vue` 的微信自动跳转 loading 与 `login-callback.vue` 全页；动效仅用于表达状态，`prefers-reduced-motion` 下降级静态。两端 C 端必经 h.joho.cn 这两个页面，一套门面即覆盖两端。

**Tech Stack:** UniApp Vue3（H5 编译），无单测框架；验收依赖 `npm run build:h5` + 手机视口截图（390×844，dpr=2）。主色统一为星枢品牌紫 `#667eea`（微信绿仅留微信原生元素）。

**主改动仓库：** `d:\zhao\strapi-backend`

---

### Task 1: 新增文案与品牌令牌字典

**Files:**
- Create: `src/components/sso-loading-facade/dict.js`

- [ ] **Step 1: 建目录并创建字典**

```js
// src/components/sso-loading-facade/dict.js
// 星枢登录中转等待区：统一品牌令牌 + 广告语 + 状态文案（单一来源，供门面组件与各页共用）

export const BRAND = {
  primary: '#667eea', // 星枢品牌紫（主色）
  soft: '#f6f5fb',    // 品牌淡紫背景
  bg: '#f7f8fc',      // 页面底色（近白淡同色）
  text: '#333',
  muted: '#8898aa',
  line: '#e5e7ef',
  danger: '#e65b5b',  // 错误柔和红
}

export const SSO_SLOGANS = [
  '一个账号，玩转全部系统',
  '一登录，全平台畅通',
  '统一身份，串联所有系统',
  '把散落的系统串成一个整体',
  '一次登录，处处是你的主场',
  '星枢，理清你与好友的联结',
  '一个身份，链接所有业务',
  '打通各系统，一个身份就够',
  '账号在手，关系全有',
  '你来登录，我们连起所有',
  '所有系统，围绕你一个身份',
  '星枢，让系统彼此相连',
  '一键登录，关系自动串联',
  '统一身份，连接课程与活动',
  '星枢轴心，转动整个生态',
  '关系即资产，星枢帮你理',
  '一个他，联结你全部服务',
  '登录一次，身份遍行全线',
  '星枢，你做主的登录中枢',
  '人人皆一点，处处通星枢',
]

/** 随机取一条广告语（轮播/首条复用） */
export function getSlogan() {
  return SSO_SLOGANS[Math.floor(Math.random() * SSO_SLOGANS.length)]
}

/** 状态阶段 → 胶囊文案 */
export const SSO_STATUS = {
  verify: '校验中…',
  login: '正在登录…',
  process: '正在处理登录信息…',
  redirect: '正在跳转目标页面…',
  done: '登录完成，正在返回…',
}
```

- [ ] **Step 2: 验证**

Run: `node -e "const d=require('./src/components/sso-loading-facade/dict.js'); console.log(d.BRAND.primary, d.getSlogan(), d.SSO_STATUS.redirect)"`
Expected: 输出 `#667eea` + 一条随机广告语 + `正在跳转目标页面…`（模块为 ESM 时改用 `node --input-type=module -e "import('./...')"`，或仅作静态核对）

- [ ] **Step 3: 提交**

```bash
git add src/components/sso-loading-facade/dict.js
git commit -m "feat(sso): sso-loading 统一文案与品牌令牌字典"
```

---

### Task 2: 新增统一登录门面组件

**Files:**
- Create: `src/components/sso-loading-facade/sso-loading-facade.vue`

- [ ] **Step 1: 创建门面组件**

```vue
<!-- src/components/sso-loading-facade/sso-loading-facade.vue -->
<template>
  <view class="slf">
    <view class="slf-card">
      <view class="slf-logo">{{ logoText }}</view>
      <view class="slf-spinner"></view>
      <text class="slf-title">{{ title }}</text>
      <text class="slf-tagline" :key="tagline">{{ tagline }}</text>
      <view v-if="statusText" class="slf-status">{{ statusText }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { BRAND, getSlogan } from './dict.js'

const props = defineProps({
  title: { type: String, default: '星枢统一关系中心' },
  logoText: { type: String, default: '星' },
  statusText: { type: String, default: '' },
  autoRotateTagline: { type: Boolean, default: true },
})

const tagline = ref(getSlogan())
let timer = null
const reduceMotion = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

function start() {
  if (props.autoRotateTagline && !reduceMotion) {
    timer = setInterval(() => { tagline.value = getSlogan() }, 3000)
  }
}
function stop() { if (timer) clearInterval(timer) }

onMounted(start)
onUnmounted(stop)
</script>

<style scoped>
.slf { min-height: 100vh; background: v-bind('BRAND.bg'); display: flex; align-items: center; justify-content: center; padding: 24px; }
.slf-card { width: 100%; max-width: 360px; background: #fff; border-radius: 20px; padding: 48px 28px 36px; display: flex; flex-direction: column; align-items: center; gap: 14px; box-shadow: 0 8px 28px rgba(102, 126, 234, 0.12); }
.slf-logo { width: 72px; height: 72px; border-radius: 18px; background: v-bind('BRAND.primary'); color: #fff; font-size: 34px; font-weight: bold; display: flex; align-items: center; justify-content: center; }
.slf-spinner { width: 34px; height: 34px; border: 3px solid v-bind('BRAND.line'); border-top-color: v-bind('BRAND.primary'); border-radius: 50%; animation: slf-spin 0.8s linear infinite; }
@keyframes slf-spin { to { transform: rotate(360deg); } }
.slf-title { font-size: 20px; font-weight: bold; color: v-bind('BRAND.text'); }
.slf-tagline { font-size: 13px; color: v-bind('BRAND.muted'); text-align: center; transition: opacity 0.3s; }
.slf-status { margin-top: 6px; padding: 8px 18px; background: v-bind('BRAND.soft'); color: v-bind('BRAND.primary'); border-radius: 999px; font-size: 14px; }
</style>
```

> 注：`v-bind()` 为 Vue SFC 内联 CSS 变量方案（vue 3.4.21 支持）。若 UniApp 编译不支持 `v-bind`，改用 `style` 绑定：`:style="{ '--brand-primary': BRAND.primary }"` 并在 CSS 中 `color: var(--brand-primary)`。

- [ ] **Step 2: 构建校验**

Run: `npm run build:h5`
Expected: 构建成功，无该组件的编译报错

- [ ] **Step 3: 提交**

```bash
git add src/components/sso-loading-facade/sso-loading-facade.vue
git commit -m "feat(sso): 新增统一登录中转门面组件 sso-loading-facade"
```

---

### Task 3: `login.vue` 接入门面（微信自动跳转 loading）

**Files:**
- Modify: `src/pages/sso/login.vue`（模板 L8-12 loading-state；删除 L55-78 本地 TAGS/`tagline`；样式 L258-280；`isWechatAutoRedirecting` 关联）

- [ ] **Step 1: 模板替换 loading-state 为门面**

将 `login.vue` 模板中：

```html
<!-- 微信环境自动跳转中 -->
<view v-if="isWechatAutoRedirecting" class="loading-state">
  <view class="loading-spinner"></view>
  <text class="loading-text">正在跳转微信登录...</text>
</view>
```

替换为：

```html
<!-- 微信环境自动跳转中：统一品牌门面 -->
<sso-loading-facade
  v-if="isWechatAutoRedirecting"
  :status-text="SSO_STATUS.redirect"
/>
```

- [ ] **Step 2: import 门面与字典，移除本地 TAGS/tagline**

在 `<script setup>` 中：

```js
import SsoLoadingFacade from '../../components/sso-loading-facade/sso-loading-facade.vue'
import { SSO_STATUS } from '../../components/sso-loading-facade/dict.js'
```

删除：

```js
// 删除原「星枢统一关系中心：随机标语」相关的整个 TAGS 数组与 tagline
const TAGS = [ /* ...20条... */ ]
const tagline = ref(TAGS[Math.floor(Math.random() * TAGS.length)])
```

模板 `page-header` 中的 `<text class="page-tagline">{{ tagline }}</text>`（L5）改为静态广告语（取 `getSlogan()`）或直接复用字典：

```html
<text class="page-tagline">{{ taglineStatic }}</text>
```

并在 script 中把 `tagline` 的初始值改为从字典取并转静态值：

```js
import { getSlogan } from '../../components/sso-loading-facade/dict.js'
const taglineStatic = ref(getSlogan())
```

（保持 header 广告语仍在，仅把咒语池收敛到字典单一来源。）

- [ ] **Step 3: 删除/login.vue 内已由门面承接的 loading 样式**

在 `<style scoped>` 中删除 `/* 微信环境自动跳转加载状态 */` 起的 `.loading-state / .loading-spinner / @keyframes spin / .loading-text`（L258-280），spinner 职责移入门面。

- [ ] **Step 4: 构建校验**

Run: `npm run build:h5`
Expected: 构建成功；无对已删除 `tagline`/`TAGS` 的引用残留在模板或 script（`git grep -n "TAGS\|tagline" src/pages/sso/login.vue` 应无本地定义残留）

- [ ] **Step 5: 提交**

```bash
git add src/pages/sso/login.vue
git commit -m "refactor(sso): login.vue 加载态接入统一品牌门面"
```

---

### Task 4: `login-callback.vue` 接入门面

**Files:**
- Modify: `src/pages/sso/login-callback.vue`（模板 L1-11；`loading/redirecting/error` 状态映射到门面；样式 L296-304）

- [ ] **Step 1: 模板改为门面 + 错误兜底**

将模板：

```html
<view class="callback-page">
  <view class="callback-title">登录中</view>
  <view v-if="loading" class="status">正在跳转...</view>
  <view v-else-if="redirecting" class="status">检测到登录凭证，正在跳转到目标页面...</view>
  <view v-else-if="error" class="status error">
    <text>{{ error }}</text>
    <view class="retry-btn" @click="backToLogin">返回登录</view>
  </view>
  <view v-else class="status">正在处理登录信息...</view>
  ...
</view>
```

替换为：

```html
<view class="callback-page">
  <sso-loading-facade
    v-if="!error"
    :status-text="statusText"
  />
  <view v-else class="error-state">
    <view class="error-card">
      <text class="error-title">{{ error }}</text>
      <view class="retry-btn" @click="backToLogin">返回重新登录</view>
    </view>
  </view>
  <!-- 调试信息（仅开发环境，?debug=1） -->
  <view v-if="showDebug" class="debug-info">
    <text class="debug-text">{{ debugInfo }}</text>
  </view>
</view>
```

- [ ] **Step 2: import 门面 + 计算 statusText**

在 `<script setup>`：

```js
import SsoLoadingFacade from '../../components/sso-loading-facade/sso-loading-facade.vue'
import { SSO_STATUS } from '../../components/sso-loading-facade/dict.js'
import { computed } from 'vue' // 若未引入
```

新增计算属性（替换原模板多个 v-if/v-else-if 的纯文本）：

```js
const statusText = computed(() => {
  if (loading.value) return SSO_STATUS.verify
  if (redirecting.value) return SSO_STATUS.redirect
  return SSO_STATUS.process
})
```

（原 `loading`/`redirecting`/`error` 状态变量与触发逻辑保持不变。）

- [ ] **Step 3: 门面/错误态统一样式**

在 `<style scoped>` 保留 `.debug-info`；`.callback-page` 背景改 `#f7f8fc`、去内边距居中；新增错误态样式（品牌紫主按钮、柔和红）：

```css
.callback-page { min-height: 100vh; background: #f7f8fc; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.error-state { padding: 24px; }
.error-card { background: #fff; border-radius: 20px; padding: 36px 28px; text-align: center; box-shadow: 0 8px 28px rgba(102,126,234,0.12); }
.error-title { font-size: 15px; color: #e65b5b; }
.retry-btn { margin: 20px auto 0; padding: 11px 30px; background: #667eea; color: #fff; border-radius: 999px; width: fit-content; }
```

删除原 `.callback-title`、`.status`、`.status.error`（已被门面/新错误卡片取代）。

- [ ] **Step 4: 构建校验**

Run: `npm run build:h5`
Expected: 构建成功，无报错

- [ ] **Step 5: 提交**

```bash
git add src/pages/sso/login-callback.vue
git commit -m "refactor(sso): login-callback 接入统一品牌门面"
```

---

### Task 5: 手机视口截图验收（登录中转全链路）

**Files:**
- 存图：`docs/` 或随操作手册指定目录（`strapi-backend` 惯例目录）

- [ ] **Step 1: 本地起 H5 开发服**

Run: `npm run dev:h5`
Expected: 本地 H5 服务起来，SSO 两页可访问 `/#/pages/sso/login` 与 `/#/pages/sso/login-callback`

- [ ] **Step 2: 手机视口截图**

用 Playwright（或既有截图脚本）以 **390×844，dpr=2（=780×1688）** 移动视口截图：
1. `/#/pages/sso/login`（构造微信环境参数 `?debugWx=1` 触发 loading 态）→ 门面 + 广告语 + 紫 spinner
2. `/#/pages/sso/login-callback?debug=1`（无 token/code 走 process 态）→ 门面 + 状态胶囊
3. 回到星枢 `login.vue` 正常渲染（header 广告语 + wx-sso-login）不回归

Expected: 三张截图到位，主色统一为星枢紫，无刺眼绿主色残留（微信原生除外），广告语可见

- [ ] **Step 3: 真实跨端回跳（分销确认）**

分别从 nshop `www.youshop.cn` 与 strapi-course `v.joho.cn` 的**分享落地/详情页**未登录发起登录，走完整 SSO 流程。
Expected: 登录成功后**回到原来源页**（strapi-course 经 `auth-callback` reLaunch 回来源页；nshop 经 `sso-callback` `router.replace` 回 `return_url`）。若被拦截，核对新域名是否在 SSO `validateRedirectUri` 白名单（参考 `d:\zhao\.sso-distprobe2.sh`）

- [ ] **Step 4: 截图/结论补充到操作手册，提交**

```bash
git add <截图路径> docs/
git commit -m "test(sso): 登录中转美化手机视口截图 + 分销回跳确认"
```

---

### Task 6（增强，可选分拆）：nshop 提供者缓存消除白屏

**Files:**
- Modify: `d:\zhao\nshop`（`useSso` / 自动登录 provider 拉取处）

- [ ] **Step 1: 定位 `fetchProviders` 缓存点**

在 `nshop` 的 `useSso()` 实现中，将 SSO provider 列表结果缓存到 `sessionStorage`（键如 `youshop_sso_providers`），二次进入直接读缓存，跳过异步网络拉取再跳转，消除跳转前白屏。
（该 Task 独立修改 nshop 仓库，需按 nshop 本地构建部署铁律交付；若本期只发布星枢门面，可跳过并延后。）

- [ ] **Step 2: 提交**

```bash
cd d:\zhao\nshop && git add <file> && git commit -m "perf(sso): 缓存 SSO provider 配置，消除跳转前白屏"
```

---

## 自检（Self-Review）

- **Spec 覆盖**：方案 B 三段式（背景/中心区/信息区）→ Task 2 门面；品牌统一紫 → dict `BRAND` + Task 2/3/4；广告语轮播 + `prefers-reduced-motion` 降级 → Task 2 组件；`login.vue` 微信 loading + `login-callback` 全页 → Task 3/4；分销回跳验收 → Task 5 Step 3；nshop 提速 → Task 6。
- **占位符扫描**：无 TBD/TODO 占位，代码步骤均含可执行内容。
- **类型/命名一致**：`sso-loading-facade.vue`、`dict.js`（`BRAND`/`SSO_SLOGANS`/`getSlogan`/`SSO_STATUS`）在 Task 2/3/4 引用一致；props `title/logoText/statusText/autoRotateTagline` 前后一致。

## 执行交接

计划已保存到 `docs/superpowers/plans/2026-09-22-sso-login-loading-theme.md`。两种执行方式：

1. **子代理驱动（推荐）**：每个 Task 派一个独立子代理，任务间两阶段评审，快速迭代
2. **本会话内联执行**：executing-plans 批量执行 + 检查点评审

选哪种？