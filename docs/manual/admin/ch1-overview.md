## 1. 系统概述

### 1.1 系统架构

本系统是基于 Strapi + UniApp 构建的多租户管理后台，主要功能模块包括：

```
后台管理系统
├── 多租户管理 — 创建/编辑/删除租户，配置站点信息、三方登录、模板样式
├── 渠道管理 — 渠道树结构，成员管理，邀请码，渠道网络查看
├── 课程管理 — 课程/课时/分类/标签/知识点管理，渠道权限控制
├── 题库管理 — 题目管理，答题记录，考试管理，批量导入
├── 积分管理 — 积分类型/规则/记录/兑换管理，统计报表
├── 系统管理 — 用户/角色/权限/日志管理
├── 媒体管理 — 文件上传，图片库管理
├── 第三方配置 — 微信登录/分享配置，支付宝/抖音登录
└── 仪表盘 — 数据统计概览
```

### 1.2 浏览器要求

| 浏览器 | 最低版本 | 说明 |
|--------|----------|------|
| Chrome | 90+ | 推荐 |
| Firefox | 88+ | |
| Edge | 90+ | |

### 1.3 访问地址

- **开发环境**：http://localhost:1337/admin
- **生产环境**：http://你的域名/admin

**域名规划**：

| 域名 | 角色 | 说明 |
|------|------|------|
| h.joho.cn | 后台管理 + SSO 中转 | Strapi Admin 面板、SSO 微信网页授权回调、JSSDK 签名 |
| v.joho.cn | C 端课程内容 | uni-app H5 课程站点，承载 invite_code 参数 |

**SSO 相关入口**：

- SSO 插件管理：`http://h.joho.cn/admin/plugins/zhao-sso`
- SSO 登录页：`http://h.joho.cn/#/pages/sso/login`
- SSO 回调页：`http://h.joho.cn/#/pages/sso/login-callback`
- 微信授权跳转：`http://h.joho.cn/api/zhao-sso/v1/auth/wechat`
- JSSDK 签名接口：`POST http://h.joho.cn/api/zhao-sso/v1/auth/jssdk-signature`

### 1.4 角色权限说明

| 角色 | 权限范围 | 适用场景 |
|------|----------|----------|
| super-admin | 全部权限 | 系统管理员 |
| admin | 除系统设置外的全部权限 | 租户管理员 |
| channel-admin | 渠道管理权限 | 渠道管理员 |
| editor | 内容编辑权限 | 内容编辑 |
| viewer | 只读权限 | 查看者 |

---
