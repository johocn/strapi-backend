## 12. 第三方配置

### 12.1 功能概述

第三方配置用于配置系统与外部服务的集成，如微信登录、微信分享等。

### 12.2 微信配置

**操作步骤**：

1. 返回首页面板，在「🔧 系统工具」分区点击「三方配置」
2. 填写微信公众号信息：

**微信公众号字段说明：**

| 字段名称 | 必填 | 说明 |
|----------|------|------|
| AppID | * | 微信公众号 AppID |
| AppSecret | * | 微信公众号 AppSecret |
| Token | | 服务器配置 Token |
| EncodingAESKey | | 消息加密密钥（可选） |

3. 配置授权域名：
   - 网页授权域名
   - JS-SDK 安全域名
4. 点击「保存」按钮

### 12.3 微信分享配置

**操作步骤**：

1. 在微信配置页面中找到「分享配置」区域
2. 填写分享信息：

**分享配置字段说明：**

| 字段名称 | 必填 | 说明 |
|----------|------|------|
| 分享标题 | | 默认分享标题 |
| 分享描述 | | 默认分享描述 |
| 分享路径 | | 默认分享页面路径 |

3. 点击「保存」按钮

### 12.4 SSO 统一登录管理（zhao-sso 插件）

zhao-sso 插件提供独立于多租户三方配置的统一登录能力，所有接入方共享同一套微信公众号配置，应用之间通过 app_code 隔离。入口：`http://h.joho.cn/admin/plugins/zhao-sso`。

#### 12.4.1 与多租户三方配置的区别

| 维度 | 多租户三方配置（12.2/12.3） | SSO 统一登录（zhao-sso） |
|------|------------------------------|---------------------------|
| 配置作用域 | 每个租户独立配置 | 全局共享，所有接入方复用 |
| 用户体系 | users-permissions.user | sso-user |
| 应用隔离 | siteId | app_code |
| 公众号 appId | 各租户可不同 | 全局唯一 |
| 适用场景 | 单租户独立登录 | 多应用统一登录、跨应用 SSO |

#### 12.4.2 OAuth 配置管理

OAuth 配置是 SSO 的核心，定义微信公众号/开放平台凭证。

**操作步骤**：

1. 进入「SSO 统一登录 → OAuth配置」Tab
2. 点击「新建」填写配置

**字段说明**：

| 字段名称 | 必填 | 说明 |
|----------|------|------|
| 配置名称 | * | 配置的显示名称（如 "h.joho.cn 微信公众号"） |
| 平台 | * | wechat / alipay / douyin / google / github |
| 应用类型 | * | official_account / open_platform / mini_program / app / default |
| AppID | * | 对应平台的应用 ID |
| AppSecret | * | 对应平台的应用密钥 |
| OAuth Scope | * | 多选：snsapi_userinfo / snsapi_base（微信公众号必选） |
| 是否启用 | | 启用后接入方可使用 |
| redirect_uris | | 回调白名单（逗号分隔），如 `http://h.joho.cn/api/zhao-sso/v1/auth/wechat/callback` |
| extra_config | | JSON 扩展配置（如 Token、EncodingAESKey） |

**关键约束**：

- 微信公众号必须是认证服务号（订阅号无网页授权权限）
- AppType 决定授权形态：official_account=网页授权、open_platform=扫码登录、mini_program=jscode2session、app=APP SDK
- OAuth Scope 多选后，前端按场景选用（snsapi_base 静默登录、snsapi_userinfo 完善资料）

#### 12.4.3 SSO 应用管理（sso-app）

每个接入 SSO 的业务方都需要注册为应用，获取独立的 app_code/app_secret。

**操作步骤**：

1. 进入「SSO 统一登录 → 应用管理」Tab
2. 点击「新建」填写应用信息

**字段说明**：

| 字段名称 | 必填 | 说明 |
|----------|------|------|
| app_code | * | 应用唯一标识（如 admin、course、mystore） |
| app_name | * | 应用显示名称 |
| app_secret | * | 应用密钥，前端换 token 时需传入，妥善保存 |
| redirect_uris | * | OAuth 回调地址白名单（多个用逗号分隔），必须与前端实际 URL 完全一致 |
| allowed_grant_types | | authorization_code, refresh_token（默认） |
| is_active | | 启用/禁用应用 |

**预置应用**：

| app_code | 用途 | redirect_uri 示例 |
|----------|------|-------------------|
| admin | 后台管理（h.joho.cn） | `http://h.joho.cn/#/pages/login/callback` |
| course | C 端课程（v.joho.cn） | `http://v.joho.cn/#/pages/login/callback` |

> **重要**：redirect_uri 必须与前端实际请求的 URL 完全一致（包括协议、端口、路径、hash）。`http://` 与 `https://`、`localhost` 与 `127.0.0.1`、带尾斜杠与不带尾斜杠均视为不同。

#### 12.4.4 三方绑定管理

三方绑定记录 sso-user 与第三方平台（微信/支付宝等）的 openid 对应关系，一个 sso-user 可绑定多个第三方。

**操作步骤**：

1. 进入「SSO 统一登录 → 三方绑定」Tab
2. 查看已绑定记录，支持按用户/平台筛选
3. 点击「删除」可解绑某个第三方账号

#### 12.4.5 渠道与分销管理

SSO 内置 channel-sync 服务，处理邀请码/渠道码的分销关系建立，独立于 zhao-auth。

**参数来源**：

| 参数 | 来源域名 | 用途 |
|------|----------|------|
| invite_code | v.joho.cn | 建立 sso-user 分销关系 |
| channel_code | h.joho.cn | 建立 sso-user 分销关系 |

**流程**：

1. 用户访问 `https://mystore.example.com/?invite_code=ABC123&channel_code=XYZ789#/pages/login/index`
2. 前端解析 URL 参数，透传给 wx-sso-login 组件
3. 组件调用 `/api/zhao-sso/v1/auth/password-authorize` 或 `/api/zhao-sso/v1/auth/wechat` 时附带 invite_code/channel_code
4. SSO channel-sync 服务建立 sso-user 分销关系（sso_referral_relations，level 无上限）
5. 邀请码校验失败不阻塞登录，仅记录日志

#### 12.4.6 Nginx 配置要点

SSO 正常工作依赖 Nginx 正确透传代理头，详见 `d:\zhao\strapi\docs\deployment\nginx-h-joho-cn.conf`。

**关键配置**：

```nginx
# 全局代理头（X-Forwarded-Host 必须用 $host 而非 $server_name）
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto $scheme;

# /api/ 反代已覆盖所有 SSO 接口
location /api/ {
    proxy_pass http://127.0.0.1:1337/api/;
}
```

**常见问题**：

| 现象 | 原因 | 解决方案 |
|------|------|----------|
| SSO 回调 302 重定向到 localhost | Nginx 未透传 X-Forwarded-Host | 改用 `$host` 而非 `$server_name` |
| HTTPS 环境回调 URL 协议错误 | 未设置 X-Forwarded-Proto | 添加 `proxy_set_header X-Forwarded-Proto $scheme;` |
| JSSDK 签名失败 | JS接口安全域名未配置 | 公众号后台「功能设置 → JS接口安全域名」填 `h.joho.cn` |
| 网页授权报 redirect_uri 参数错误 | 网页授权域名未配置 | 公众号后台「功能设置 → 网页授权域名」填 `h.joho.cn` |

#### 12.4.7 接口速查

**公开接口（无需认证）**：

| 接口 | 方法 | 路径 |
|------|------|------|
| 微信授权跳转 | GET | `/api/zhao-sso/v1/auth/wechat` |
| 微信中转回调 | GET | `/api/zhao-sso/v1/auth/wechat/callback` |
| 小程序登录 | POST | `/api/zhao-sso/v1/auth/wechat/miniprogram` |
| APP 登录 | POST | `/api/zhao-sso/v1/auth/wechat/app` |
| JSSDK 签名 | POST | `/api/zhao-sso/v1/auth/jssdk-signature` |
| 微信登录配置 | GET | `/api/zhao-sso/v1/auth/wechat/config` |
| 降级密码登录（code 模式） | POST | `/api/zhao-sso/v1/auth/password-authorize` |
| 降级密码登录（token 模式） | POST | `/api/zhao-sso/v1/auth/login` |
| 换取 token | POST | `/api/zhao-sso/v1/auth/token` |

**管理接口（需认证）**：

| 接口 | 方法 | 路径 |
|------|------|------|
| OAuth 配置列表 | GET | `/api/zhao-sso/v1/admin/oauth-configs` |
| 新建 OAuth 配置 | POST | `/api/zhao-sso/v1/admin/oauth-configs` |
| 三方绑定列表 | GET | `/api/zhao-sso/v1/admin/bindings` |
| 删除三方绑定 | DELETE | `/api/zhao-sso/v1/admin/bindings/:id` |

> 完整配置流程、前端接入代码、故障排查详见 `d:\zhao\strapi\docs\deployment\sso-wechat-config-guide.md`。

---
