# 方案 B：SSO 登录中转等待区统一美化设计

- 日期：2026-09-22
- 主题：登录中转等待区统一动效 + 广告语 + 美化（方案 B）
- 主改动仓库：`strapi-backend`（星枢 h.joho.cn）
- 关联接入端：`strapi-course`（v.joho.cn）、`nshop`（www.youshop.cn）
- 状态：设计定稿（方案 B 已选）

---

## 1. 背景

两个 C 端站点都是通过 SSO（h.joho.cn「星枢统一关系中心」）登录，但行为有明显差异：

| 站点 | 跳转前 | 登录中转等待区 |
| --- | --- | --- |
| www.youshop.cn（nshop） | 拉取 SSO provider 时**白屏** | token 直验，静默成功，无显式转场 |
| v.joho.cn（strapi-course） | 先出页面、速度快 | 跳星枢通行 →「登录中」→ 登录成功，有转场但简陋 |

两条链路最终都汇入 `h.joho.cn` 的 `login.vue`（微信自动跳转 loading）与 `login-callback.vue`（登录中/正在跳转）。

本次两个目标：
1. **提高登录速度** —— 消除 nshop「跳转前异步拉取配置 = 白屏」的体验断层。
2. **优化登录效果** —— 让等待区有意义：统一复用星枢登录的动效与广告语并美化（**方案 B**）。

已知结论（已确认）：**分销「从哪页登录返回哪页」有效**。见 §6。

---

## 2. 现状分析（代码实证）

### 2.1 星枢登录页 `src/pages/sso/login.vue`
- 顶部标题「星枢统一关系中心」+ 随机广告语 `TAGS`（20 条，L55-78，见代码注释「解释核心理念」）。
- 微信环境自动跳转 loading（L9-12）：`loading-spinner` 旋转圆环（主色 `#07c160` 微信绿）+ 文案「正在跳转微信登录...」。
- 样式（L236-280）：背景 `#f5f5f5`、标题 `#333`、标语灰 `#8898aa`、spinner 绿色。
- `wx-sso-login` 组件内另有「正在加载登录配置...」（loading-tip），loading 态各自独立，未统一。

### 2.2 星枢回调页 `src/pages/sso/login-callback.vue`
- 居中卡片，标题「登录中」，状态文案：`正在跳转...` / `检测到登录凭证，正在跳转到目标页面...` / `正在处理登录信息...` / 错误态（红底 + 返回登录，1.5s 回退）。
- 样式（L296-327）：无 spinner、无 logo、无背景品牌色；错误红 `#c00`。

### 2.3 C 端接入
- **strapi-course**：`App.vue` 先出页再跳 SSO；`login.vue` 进 H5 未登录优先 `redirectToSso()`，`login-chain.ts#buildSsoPageUrl` 携带 `app_code / return_url / c_end_url / state(来源页)`。
- **nshop**：`app/app.vue` 挂 `useAutoWechatSsoLogin()`，先异步拉 SSO provider 再跳转 → 首屏白屏；回跳 `account/sso-callback.vue` token 直验（minimal spinner，静默成功）。

### 2.4 差异根因总结
- **nshop 赢**：token 直验一次换会话，快且静默。
- **nshop 输**：跳转前异步配置拉取 = 白屏。
- **strapi 赢**：先出页 + 有转场。
- **strapi 输**：流程阶段多、转场简陋。

---

## 3. 方案 B 设计（已选）

把「登录中转等待区」统一为一个**品牌化加载门面**，三段式：

1. **背景**：淡同色（近 `#f5f5f5` → `brand-soft` 品牌淡色调），比现在更「软」，不再刺眼。
2. **中心区**：居中 logo + spinner + 标题「星枢统一关系中心」。
3. **信息区**：广告语逐条淡入轮播（复用星枢 `TAGS`）+ 状态胶囊更替（`校验中…` / `正在跳转目标页面…`）。

### 3.1 统一主色（决策）
现状主色混乱（绿 `#07c160` / 紫 `#667eea` 混用）。方案 B **统一为紫 `#667eea`（星枢品牌主色）**：
- loading spinner、状态胶囊、背景淡紫 `#f6f5fb` 等均以紫为主。
- 微信绿 `#07c160` 仅保留在**微信原生元素**（如需要用户点击的微信授权按钮、微信图标），用于区分「微信 OAuth 环节」与「系统跳转环节」，弱化而非删除。
- 备选：若产品定调偏微信生态，可统一为绿；本 spec 默认紫（星枢自身品牌，login-callback 已用紫，改动最小）。

### 3.2 组件归属：统一中转页组件放星枢
两端登录必经 h.joho.cn 的 `login.vue` + `login-callback.vue`，故**一套统一门面组件覆盖两个 C 端**，落 `strapi-backend`，无需在 C 端重复实现。

新增可复用组件（建议 `src/components/sso-loading-facade/sso-loading-facade.vue`，若 uni-app 组件目录惯例不同则按现有 `wx-sso-login` 同级放置）：
- props：`title`（默认「星枢统一关系中心」）、`statusText`（当前状态胶囊文案）、`autoRotateTagline`（是否轮播广告语）。
- 内部：中心 logo（可配置/占位）+ spinner + 标题 + 广告语淡入轮播（`<transition>` 淡入淡出，逐条更替）+ 状态胶囊。
- 广告语字典从 `login.vue` 的 `TAGS` 收敛到独立可配置字典（§5）。

### 3.3 接入改造点
| 文件 | 改造 |
| --- | --- |
| `src/pages/sso/login.vue` | 微信自动跳转 loading 态（L9-12）改用 `sso-loading-facade`，标题/动效/广告语统一；spinner 主色改紫。 |
| `src/pages/sso/login-callback.vue` | 整页改为居中品牌门面：加 logo + spinner，状态文案走胶囊更替（`校验中…`→`正在跳转目标页面…`），错误态保留但用品牌柔和红。 |
| `src/components/wx-sso-login/wx-sso-login.vue` | 「正在加载登录配置...」loading-tip 主色与字样对齐品牌门面（可选、低优先）。 |

### 3.4 登录提速（nshop 白屏修复 → 辅助项）
nshop 白屏根因：`useAutoWechatSsoLogin` 内异步 `fetchProviders()` 后才跳转。措施（低风险）：
- 对 SSO provider 配置做**缓存**（sessionStorage/localStorage），二次登录跳过异步拉取直接跳转，消灭白屏。
- 该项独立于视觉改造，可拆分为单独 Task，避免与门面耦合。

---

## 4. 动效规范

- **广告语轮播**：逐条淡入/淡出，单条停留约 3s，切换过渡 ≤ 300ms；尊重 `prefers-reduced-motion`（可关闭轮播，仅显首条）。文案池收敛为可配置字典（§5），不硬编码。
- **spinner**：转速统一（约 0.8s 一圈），主色紫。
- **状态胶囊**：随阶段更替文案，胶囊底色品牌淡紫 + 主色文字，圆角。
- 动效仅用于表达「正在发生」状态，不做花哨 3D/辉光等重型效果（网页端一致性）。

## 5. 文案字典（收敛为一份可配置）
将 `login.vue` 的 20 条 `TAGS` 与各 loading 文案（两类 C 端 + login-callback 的多种状态）收敛为一份字典源（统一导出，供 `login.vue` 与门面组件共用）：
- `slogans`: 广告语池（复用星枢 TAGS 全量）。
- `status` 映射：`校验中` / `正在跳转目标页面…` / `正在登录…` / `登录完成，正在返回…` / 错误文案。
- 品牌 token：`--brand`（紫 `#667eea`）、`--brand-soft`（淡紫背景 `#f6f5fb`）、`--text-muted` 等，统一在页面/组件 scoped style 顶部复用。

---

## 6. 分销回跳确认（复用，非改代码，仅记录）

「从哪页登录返回哪页」**已确认有效**：

| 站点 | 机制 |
| --- | --- |
| strapi-course | `buildSsoPageUrl(state=来源页路径)` 将 `state` 内嵌进 `return_url/c_end_url`（auth-callback）→ 星枢 `login-callback.redirectToTarget` 将 `token` 以 `&` 拼接其后 → `auth-callback` 同时读到 `state+token` → reLaunch 回来源页。 |
| nshop | `return_url = route.fullPath`（保 query），`toRouterSafePath` 归一化为 `/` 开头相对路径 → 回跳 token 直验后 `router.replace(目标)` 精确回来源分享页。 |

**唯一坑（需在验收覆盖）**：新站点域名必须先进 SSO 的 `validateRedirectUri` 白名单，否则回跳被拦截（此前真实踩坑，可参考 `d:\zhao\.sso-distprobe2.sh` 核对该白名单）。

---

## 7. 影响范围 / 文件清单

**主改动（strapi-backend）**
- 新增：`src/components/sso-loading-facade/sso-loading-facade.vue`
- 新增：文案/品牌 token 字典（与门面同级，或并入既有 sso 常量文件）
- 改：`src/pages/sso/login.vue`
- 改：`src/pages/sso/login-callback.vue`
- 改（低优先/可选）：`src/components/wx-sso-login/wx-sso-login.vue`

**接入端（可选增强，不阻塞星枢发布）**
- nshop：`useSso`/自动登录对 provider 配置做缓存，消除跳转前白屏。

**不改**：两端回调逻辑（token 直验 / auth-callback / 回跳归一化）已确认有效，保持不变。

## 8. 测试与验收
- **平台**：H5（微信浏览器 + 普通浏览器）。星枢端手机视口截图为主。
- **视口**：标准手机视口 **390×844，dpr=2（=780×1688）**，Playwright 移动视口，逐页截图。
- **验收点**：
  1. `login.vue` 微信自动跳转 loading：广告语轮播 + 紫 spinner + 统一背景；
  2. `login-callback.vue`：logo + spinner + 状态胶囊更替；
  3. 两端 C 端真实走一遍：从来源页（含分享落地/详情页）登录，确认**回来源页**；
  4. 错误分支：OAuth 失败回退 / 未收到 code 等，错误态可读、可返回登录；
  5. `prefers-reduced-motion` 下轮播降级为静态首条。
- **回归**：登录成功/失败/重复登录/邀请码透传不回归；两端 SSO 会话正常换取。
- **产物**：截图补充到对应操作手册；若跨端（nshop 提速项）按 nshop 既有部署流程（本地构建）交付。

## 9. 风险与注意
- 星枢为**多系统共用**的 SSO，改动视觉需确认不破坏小程序环境 `#ifdef` 条件编译（login.vue 用 H5 专用逻辑 + wx-sso-login 降级）。
- `uni.showLoading` 等全局 loading 若与门面并存会叠加，需梳理避免重复提示（如 `redirectToSso` 的 `uni.showLoading('正在连接统一登录...')` 与星枢门面）。
- 主色统一会影响既有紫色/绿色心智，需在验收截图确认可接受。