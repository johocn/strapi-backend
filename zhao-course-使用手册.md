# Zhao Course 插件使用手册

> 版本：1.0.0 | 基于 Strapi v5 | 面向初学者

---

## 目录

- [1. 概述](#1-概述)
- [2. 环境要求](#2-环境要求)
- [3. 目录结构](#3-目录结构)
- [4. 安装与注册](#4-安装与注册)
- [5. 构建与开发](#5-构建与开发)
- [6. 依赖插件配置](#6-依赖插件配置)
- [7. 插件生命周期](#7-插件生命周期)
- [8. 路由体系详解](#8-路由体系详解)
- [9. 权限系统详解](#9-权限系统详解)
- [10. 积分体系配置与运行](#10-积分体系配置与运行)
- [11. 核心业务流程](#11-核心业务流程)
- [12. 数据模型速查](#12-数据模型速查)
- [13. 错误码速查](#13-错误码速查)
- [14. 常见问题排查](#14-常见问题排查)
- [15. 开发规范](#15-开发规范)

---

## 1. 概述

Zhao Course 是基于 Strapi v5 的在线课程管理插件，提供以下功能：

- 课程/课时/知识点 CRUD
- 课程分类与标签管理
- 用户课程授权（免费/付费/管理员分配）
- 学习进度追踪（课时进度 + 课程进度）
- 积分体系（3种计算模式）
- 后台管理 + 公开 API 双路由体系

**依赖关系图**：

```
zhao-course
  ├── zhao-auth（必需）— JWT 认证 + 权限策略
  ├── zhao-common（必需）— 国际化错误消息
  ├── zhao-point（可选）— 积分发放，不可用时不阻断
  └── zhao-quiz（可选）— 题库答题，quiz_points 模式必需
```

---

## 2. 环境要求

| 依赖 | 最低版本 | 说明 |
|------|----------|------|
| Node.js | 18.x+ | 推荐 20.x LTS |
| npm | 9.x+ | 包管理器 |
| Strapi | 5.x | 主项目版本 |
| TypeScript | 5.x | 插件使用 TS 开发 |
| React | 18.x | Admin 面板依赖 |

**内存要求**：构建时可能需要较大内存，若遇到 OOM，使用：

```powershell
$env:NODE_OPTIONS="--max-old-space-size=8192"; npm run build
```

---

## 3. 目录结构

```
zhao-course/
├── admin/src/                    # Admin 面板前端代码
│   ├── index.ts                  # Admin 入口
│   └── pages/                    # 页面组件
├── server/src/                   # 服务端代码
│   ├── index.ts                  # 服务端入口，导出生命周期函数
│   ├── register.ts               # 注册阶段 — 注册 i18n 错误消息
│   ├── bootstrap.ts              # 引导阶段 — 注册 has-permission 策略到 zhao-auth
│   ├── destroy.ts                # 销毁阶段 — 资源清理（当前为空）
│   ├── config/
│   │   └── index.ts              # 插件配置
│   ├── content-types/            # 数据模型定义
│   │   ├── course/               # 课程
│   │   ├── course-lesson/        # 课时
│   │   ├── course-category/      # 课程分类
│   │   ├── course-tag/           # 课程标签
│   │   ├── knowledge-point/      # 知识点
│   │   ├── user-course-auth/     # 用户课程授权
│   │   ├── lesson-progress/      # 课时学习记录
│   │   ├── course-progress/      # 课程学习记录
│   │   └── index.ts              # 汇总导出
│   ├── controllers/              # 控制器层
│   │   ├── course.ts             # 课程控制器
│   │   ├── course-lesson.ts      # 课时控制器
│   │   ├── course-category.ts    # 分类控制器
│   │   ├── course-tag.ts         # 标签控制器
│   │   ├── knowledge-point.ts    # 知识点控制器
│   │   ├── user-course-auth.ts   # 授权控制器
│   │   ├── lesson-progress.ts    # 课时进度控制器
│   │   ├── course-progress.ts    # 课程进度控制器
│   │   └── index.ts              # 汇总导出
│   ├── services/                 # 服务层（业务逻辑）
│   │   ├── course.ts             # 课程服务
│   │   ├── course-lesson.ts      # 课时服务
│   │   ├── course-category.ts    # 分类服务
│   │   ├── course-tag.ts         # 标签服务
│   │   ├── knowledge-point.ts    # 知识点服务
│   │   ├── user-course-auth.ts   # 授权服务（含 checkAuth）
│   │   ├── lesson-progress.ts    # 课时进度服务（含积分领取）
│   │   ├── course-progress.ts    # 课程进度服务（含积分领取）
│   │   └── index.ts              # 汇总导出
│   ├── routes/                   # 路由定义
│   │   ├── admin.ts              # Admin 路由（/admin/plugins/zhao-course）
│   │   ├── content-api.ts        # Content API 路由（/api/course）
│   │   └── index.ts              # 汇总导出
│   ├── policies/                 # 权限策略
│   │   └── has-permission.ts     # 权限检查策略（含缓存）
│   ├── utils/                    # 工具函数
│   │   └── points-calculator.ts  # 积分计算核心逻辑
│   └── permissions.ts            # 权限定义表
├── dist/                         # 构建产物（自动生成）
├── package.json                  # 包配置
├── tsconfig.json                 # TypeScript 根配置（项目级）
├── tsconfig.server.json          # 服务端 TS 配置
└── tsconfig.admin.json           # Admin 前端 TS 配置
```

---

## 4. 安装与注册

### 4.1 安装插件到主项目

在主项目（如 `e:/code/web`）的 `package.json` 中添加依赖：

```json
{
  "dependencies": {
    "zhao-course": "file:../plugins/zhao-course"
  }
}
```

然后执行：

```powershell
cd e:/code/web
npm install
```

### 4.2 在 Strapi 中启用插件

在主项目的 `config/plugins.ts`（或 `.js`）中注册：

```typescript
export default () => ({
  "zhao-course": {
    enabled: true,
    resolve: "./node_modules/zhao-course",
  },
  "zhao-auth": {
    enabled: true,
    resolve: "./node_modules/zhao-auth",
  },
  "zhao-common": {
    enabled: true,
    resolve: "./node_modules/zhao-common",
  },
  "zhao-point": {
    enabled: true,
    resolve: "./node_modules/zhao-point",
  },
  "zhao-quiz": {
    enabled: true,
    resolve: "./node_modules/zhao-quiz",
  },
});
```

> **注意**：`zhao-auth` 和 `zhao-common` 必须启用，否则插件无法正常运行。`zhao-point` 和 `zhao-quiz` 为可选依赖。

### 4.3 插件注册顺序

Strapi 按配置顺序加载插件。确保 `zhao-auth` 和 `zhao-common` 在 `zhao-course` 之前注册，因为：

- `register` 阶段：zhao-course 调用 `zhao-common` 的 i18n 服务注册错误消息
- `bootstrap` 阶段：zhao-course 调用 `zhao-auth` 注册权限策略

---

## 5. 构建与开发

### 5.1 TypeScript 配置详解

插件有 3 层 TypeScript 配置，这是初学者最容易出问题的地方。

**根配置 `tsconfig.json`**（项目级，同时覆盖 server 和 admin）：

```json
{
  "extends": "@strapi/typescript-utils/tsconfigs/server",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": ".",
    "baseUrl": ".",
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./server/src/*"]
    }
  },
  "include": [
    "server/src/**/*.ts",
    "admin/src/**/*.ts",
    "admin/src/**/*.tsx"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

关键点说明：

| 配置项 | 值 | 为什么 |
|--------|-----|--------|
| `rootDir` | `"."` | 必须为项目根目录。如果设为 `"./server/src"`，`strapi-plugin build` 的 vite dts 插件扫描 admin 文件时会报 TS6059 错误 |
| `include` | 同时包含 server 和 admin | dts 插件需要扫描全部 TS 文件生成类型声明 |
| `jsx` | `"react-jsx"` | Admin 面板使用 React TSX，必须开启 |
| `moduleResolution` | `"bundler"` | 必须设置。否则无法解析 `@strapi/strapi/admin` 等子路径导出（package.json exports），报 TS2307 错误 |

**`tsconfig.server.json`**（服务端专用，类型检查用）：

继承根配置，限定 server 目录。用于 `npm run build:ts` 的服务端类型检查。

**`tsconfig.admin.json`**（Admin 前端专用，类型检查用）：

继承根配置，限定 admin 目录。用于 `npm run build:ts` 的前端类型检查。

### 5.2 构建命令

```powershell
# 进入插件目录
cd e:/code/plugins/zhao-course

# 安装依赖
npm install

# 完整构建（strapi-plugin build，含 vite 打包 + dts 生成）
npm run build

# 分步类型检查（不生成产物，仅检查类型错误）
npm run build:ts
# 等价于：
#   tsc -p tsconfig.server.json --noEmit
#   tsc -p tsconfig.admin.json --noEmit

# 仅检查服务端类型
npm run test:ts:back

# 仅检查前端类型
npm run test:ts:front
```

### 5.3 构建常见问题

**问题 1：TS6059 rootDir 错误**

```
error TS6059: File '.../admin/src/...' is not under 'rootDir' '.../server/src'
```

原因：`tsconfig.json` 的 `rootDir` 设置为 `"./server/src"`，但 dts 插件扫描了 admin 文件。

解决：将 `rootDir` 改为 `"."`，`include` 同时包含 server 和 admin。

**问题 2：TS2307 Cannot find module '@strapi/strapi/admin'**

```
error TS2307: Cannot find module '@strapi/strapi/admin' or its corresponding type declarations
```

原因：`moduleResolution` 不是 `"bundler"`，无法解析 package.json 的 exports 子路径。

解决：在 `tsconfig.json` 的 `compilerOptions` 中添加 `"moduleResolution": "bundler"`。

**问题 3：构建 OOM（内存不足）**

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

解决：增大 Node 内存限制：

```powershell
$env:NODE_OPTIONS="--max-old-space-size=8192"; npm run build
```

### 5.4 开发模式

```powershell
# 监听文件变化，自动重新构建
npm run watch

# 监听 + 链接到主项目（开发时推荐）
npm run watch:link
```

`watch:link` 会将插件链接到主项目的 `node_modules`，修改代码后主项目自动生效。

### 5.5 插件验证

```powershell
npm run verify
```

验证插件结构是否符合 Strapi 插件规范。

---

## 6. 依赖插件配置

### 6.1 zhao-auth（必需）

zhao-course 的所有路由都依赖 zhao-auth 提供的中间件：

| 中间件 | 作用 | 使用位置 |
|--------|------|----------|
| `plugin::zhao-auth.authenticate` | 解析 JWT Token，将用户信息写入 `ctx.state.user` | 所有需认证路由 |
| `plugin::zhao-auth.authorize` | 执行权限策略检查 | 所有需权限路由 |

zhao-course 在 `bootstrap` 阶段向 zhao-auth 注册了 `has-permission` 策略。如果 zhao-auth 未启用，启动时会出现警告：

```
zhao-course: zhao-auth 插件未启用，权限策略未注册
```

此时所有需要权限的路由将无法正常工作。

### 6.2 zhao-common（必需）

zhao-course 在 `register` 阶段调用 zhao-common 的 i18n 服务注册错误消息。如果 zhao-common 未启用，错误消息将回退到硬编码的中文默认值，不会报错但国际化功能失效。

### 6.3 zhao-point（可选）

积分发放依赖 zhao-point。领取积分时，zhao-course 调用 `zhao-point.earnPoints` 发放积分。如果 zhao-point 不可用，采用降级策略：

- 积分计算和记录正常执行（写入 lesson-progress / course-progress）
- 调用 zhao-point 失败时静默忽略，不阻断业务流程
- 用户仍可看到"积分已领取"，但 zhao-point 侧无记录

### 6.4 zhao-quiz（可选）

`quiz_points` 积分模式依赖 zhao-quiz。具体依赖：

- `plugin::zhao-quiz.quiz-record` 数据表：查询用户答题记录
- 答题记录需包含 `user`、`lesson`、`isCorrect`、`quiz`（含 `points` 字段）

如果 zhao-quiz 不可用，`quiz_points` 模式的积分计算将返回 0。

---

## 7. 插件生命周期

Strapi 插件有 4 个生命周期阶段，zhao-course 在其中执行以下操作：

### 7.1 register（注册阶段）

**文件**：`server/src/register.ts`

**执行时机**：Strapi 加载插件时，最早执行。

**操作**：调用 `zhao-common` 的 i18n 服务注册 16 条错误消息：

| 错误码 | 消息 |
|--------|------|
| COURSE_001 ~ COURSE_008 | 课程相关错误 |
| LESSON_001 ~ LESSON_007 | 课时相关错误 |
| PROGRESS_001 ~ PROGRESS_002 | 进度相关错误 |

### 7.2 bootstrap（引导阶段）

**文件**：`server/src/bootstrap.ts`

**执行时机**：所有插件 register 完成后执行。

**操作**：向 zhao-auth 注册 `has-permission` 权限策略。该策略在 `server/src/policies/has-permission.ts` 中定义，核心逻辑：

1. 从 `PERMISSIONS` 表查找 action 对应的允许角色
2. 检查用户角色是否匹配
3. 本地检查失败时，尝试调用 zhao-auth 的 `hasPermission` 服务（兜底）
4. 支持角色覆盖（config.roles）
5. 权限结果缓存 5 分钟（TTL = 300000ms）

### 7.3 destroy（销毁阶段）

**文件**：`server/src/destroy.ts`

当前为空实现，预留用于资源清理。

---

## 8. 路由体系详解

zhao-course 有两套路由体系，这是理解插件运行的关键。

### 8.1 Admin 路由

**前缀**：`/admin/plugins/zhao-course`

**用途**：后台管理界面调用，所有请求需认证 + 权限。

**认证方式**：

```
请求 → zhao-auth.authenticate（解析JWT） → zhao-auth.authorize（has-permission策略） → Controller
```

**权限策略**：`has-permission`，通过 `action` 参数指定权限动作，如 `course.read`、`course.create`。

**路由列表**：

| 资源 | GET（列表） | GET（单个） | POST | PUT | DELETE | 特殊 |
|------|------------|------------|------|-----|--------|------|
| 分类 | `/course-categories` | `/course-categories/:documentId` | `/course-categories` | `/course-categories/:documentId` | `/course-categories/:documentId` | - |
| 标签 | `/course-tags` | `/course-tags/:documentId` | `/course-tags` | `/course-tags/:documentId` | `/course-tags/:documentId` | - |
| 课程 | `/courses` | `/courses/:documentId` | `/courses` | `/courses/:documentId` | `/courses/:documentId` | `POST /courses/:documentId/publish` |
| 知识点 | `/knowledge-points` | `/knowledge-points/:documentId` | `/knowledge-points` | `/knowledge-points/:documentId` | `/knowledge-points/:documentId` | - |
| 课时 | `/lessons` | `/lessons/:documentId` | `/lessons` | `/lessons/:documentId` | `/lessons/:documentId` | - |
| 授权 | `/user-courses` | `/user-courses/:documentId` | `/user-courses`（grant） | - | `/user-courses/:documentId`（revoke） | - |
| 课程进度 | `/course-progresses` | `/course-progresses/:documentId` | - | `/course-progresses/:documentId` | - | - |
| 课时进度 | `/lesson-progresses` | `/lesson-progresses/:documentId` | - | `/lesson-progresses/:documentId` | - | - |

### 8.2 Content API 路由

**前缀**：`/api/course`

**用途**：面向前端用户的公开/认证接口。

**认证方式**：

| 路由类型 | 认证要求 | 策略 |
|----------|----------|------|
| GET 公开接口 | 无需认证 | `auth: false` |
| POST/PUT/DELETE 写操作 | 需认证 | `is-authenticated` + `has-course-permission` |
| `/my/*` 个人接口 | 需认证 | `is-authenticated` |

**重要区别**：Content API 的写操作使用 `has-course-permission` 策略（非 Admin 的 `has-permission`），权限名称映射不同：

| 资源 | Content API 权限 | 对应 Admin 权限 |
|------|-----------------|----------------|
| 课程 | `course.create/update/delete` | `course.create/update/delete` |
| 分类 | `category.create/update/delete` | `course-category.create/update/delete` |
| 标签 | `tag.create/update/delete` | `course-tag.create/update/delete` |
| 知识点 | `knowledge.create/update/delete` | `knowledge-point.create/update/delete` |
| 课时 | `lesson.create/update/delete` | `course-lesson.create/update/delete` |

**公开接口过滤**：Content API 的 GET 课程接口自动过滤未发布课程，通过 Controller 中判断 `ctx.path` 实现：

```typescript
const isAdmin = ctx.path?.includes("/admin/") ?? false;
const publicOnly = !isAdmin;
```

> **注意**：必须使用 `ctx.path`（实际请求路径）而非 `ctx._matchedRoute`（Koa 路由模式）。Strapi 插件 content-api 路由通过嵌套 Koa Router 挂载，`_matchedRoute` 只包含子路由器路径（如 `/zhao-course/v1/courses`），不含父路由器的 `/api` 前缀。

### 8.3 个人接口详解

| 接口 | 方法 | 说明 |
|------|------|------|
| `/my/courses` | GET | 获取我的授权课程列表 |
| `/my/course-progresses` | GET | 获取我的课程进度列表 |
| `/my/course-auth/:courseDocumentId` | GET | 检查课程授权状态 |
| `/my/lesson-progress` | POST | 上报课时进度 |
| `/my/lesson-answer/:documentId` | POST | 提交课时答题 |
| `/my/claim-lesson-points/:documentId` | POST | 领取课时积分 |
| `/my/claim-course-points/:documentId` | POST | 领取课程积分 |

> **注意**：`/my/lesson-answer/:documentId` 和 `/my/claim-lesson-points/:documentId` 中的 `documentId` 是**课时进度记录的 ID**（数字 ID），不是课时的 documentId。`/my/claim-course-points/:documentId` 中的 `documentId` 是**课程进度记录的 ID**。

---

## 9. 权限系统详解

### 9.1 权限定义

所有权限在 `server/src/permissions.ts` 中定义，每条权限包含允许的角色列表：

```typescript
export const PERMISSIONS: Record<string, PermissionEntry> = {
  "course-category.read": { allowRoles: ["super-admin", "admin", "editor", "viewer"] },
  "course-category.create": { allowRoles: ["super-admin", "admin", "editor"] },
  // ...
};
```

### 9.2 角色体系

| 角色 | 权限范围 |
|------|----------|
| `super-admin` | 所有操作 |
| `admin` | 除删除课程/分类/标签/知识点/课时外的所有操作 |
| `editor` | 读取 + 创建 + 更新 |
| `viewer` | 仅读取 |

### 9.3 权限检查流程

```
请求到达
  ↓
zhao-auth.authenticate → 解析 JWT，写入 ctx.state.user
  ↓
zhao-auth.authorize → 执行策略
  ↓
has-permission 策略：
  1. 从 PERMISSIONS 表查找 action 对应的 allowRoles
  2. 检查 ctx.state.user.roles 是否包含允许的角色
  3. 本地检查失败 → 尝试 zhao-auth.hasPermission 服务（兜底）
  4. 支持 config.roles 覆盖
  ↓
通过 → 执行 Controller
拒绝 → 返回 403
```

### 9.4 权限缓存

`has-permission` 策略使用内存缓存，TTL 为 5 分钟。相同 action 的权限检查在缓存有效期内不会重新查找 PERMISSIONS 表。

---

## 10. 积分体系配置与运行

### 10.1 积分模型

```
课程 (enablePoints: true, pointsType: ...)
│
├── pointsType: "course_points"
│   └── 课程全部完成 → 领取 course.points（课程固定积分）
│
└── pointsType: "lesson_points"
    └── 每个课时完成后 → 逐个领取课时积分
        │
        ├── lesson.pointsType: "lesson_points"
        │   └── 课时完成 → 领取 lesson.points（课时固定积分）
        │
        └── lesson.pointsType: "quiz_points"
            └── 答题正确 → 汇总该课时下答对题目的 quiz.points 之和
```

### 10.2 配置示例

**场景 1：课程固定积分**

课程完成后统一发放 100 积分：

```json
{
  "title": "React 入门",
  "enablePoints": true,
  "pointsType": "course_points",
  "points": 100
}
```

课时不需要配置积分字段。

**场景 2：课时固定积分汇总**

每个课时完成后分别领取固定积分，课程积分 = 所有已领取课时积分之和：

```json
// 课程配置
{
  "title": "Vue 入门",
  "enablePoints": true,
  "pointsType": "lesson_points"
}

// 课时1配置
{
  "title": "Vue 基础",
  "enablePoints": true,
  "pointsType": "lesson_points",
  "points": 20
}

// 课时2配置
{
  "title": "Vue 组件",
  "enablePoints": true,
  "pointsType": "lesson_points",
  "points": 30
}
```

用户完成课时1领取 20 分，完成课时2领取 30 分，课程完成后领取 20+30=50 分。

**场景 3：答题积分汇总**

课时积分由答对的题目积分汇总：

```json
// 课程配置
{
  "title": "Python 测验课",
  "enablePoints": true,
  "pointsType": "lesson_points"
}

// 课时配置
{
  "title": "Python 基础测验",
  "type": "quiz",
  "enablePoints": true,
  "pointsType": "quiz_points"
}

// 题目配置（zhao-quiz 中）
{ "title": "题1", "points": 10, "lesson": <课时ID> }
{ "title": "题2", "points": 15, "lesson": <课时ID> }
{ "title": "题3", "points": 20, "lesson": <课时ID> }
```

用户答对题1和题3，课时积分 = 10 + 20 = 30 分。

### 10.3 积分领取流程

**课时积分领取**：

```
1. 用户完成课时学习或答题
   ├── video/audio/article 类型 → 上报进度到 100% → isCompleted = true
   └── quiz 类型 → 提交答题 → isCorrect = true

2. 调用 POST /api/course/my/claim-lesson-points/:progressRecordId
   │
   ├── 前置检查：
   │   ├── 进度记录存在？
   │   ├── 归属当前用户？
   │   ├── 课时 enablePoints = true？
   │   ├── isPointsClaimed = false？
   │   ├── lesson_points 模式 → isCompleted = true？
   │   └── quiz_points 模式 → isAnswered && isCorrect？
   │
   ├── 计算积分：
   │   ├── lesson_points → lesson.points
   │   └── quiz_points → sumQuizPoints(userId, lessonId)
   │
   ├── 更新进度记录：
   │   ├── pointsEarned = 计算结果
   │   ├── isPointsClaimed = true
   │   └── quizPointsDetail = 答题明细（quiz_points 模式）
   │
   └── 调用 zhao-point.earnPoints（降级处理）
```

**课程积分领取**：

```
1. 用户完成全部课时 → course-progress.isCompleted = true

2. 调用 POST /api/course/my/claim-course-points/:progressRecordId
   │
   ├── 前置检查：
   │   ├── 进度记录存在？
   │   ├── 归属当前用户？
   │   ├── 课程 enablePoints = true？
   │   ├── isCompleted = true？
   │   └── isPointsClaimed = false？
   │
   ├── 计算积分：
   │   ├── course_points → course.points
   │   └── lesson_points → SUM(已领取课时积分)
   │
   ├── 更新进度记录：
   │   ├── pointsEarned = 计算结果
   │   ├── isPointsClaimed = true
   │   └── lessonPointsSummary = 课时积分汇总
   │
   └── 调用 zhao-point.earnPoints（降级处理）
```

### 10.4 积分计算核心函数

**文件**：`server/src/utils/points-calculator.ts`

| 函数 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `sumQuizPoints` | strapi, userId, lessonId | `{ total, detail }` | 查询该课时下用户答对的题目，汇总 quiz.points |
| `calculateLessonPoints` | strapi, lesson, progress | `{ points, detail }` | 根据 lesson.pointsType 计算课时积分 |
| `calculateCoursePoints` | strapi, course, userId, courseId | `{ points, detail }` | 根据 course.pointsType 计算课程积分 |

`sumQuizPoints` 的查询逻辑：

```typescript
// 查询条件：user=userId, lesson=lessonId, isCorrect=true
// 关联填充：quiz（获取 quiz.points）
// 汇总：所有答对题目的 quiz.points 之和
```

---

## 11. 核心业务流程

### 11.1 课程授权流程

```
用户访问课程
  ↓
GET /api/course/my/course-auth/:courseDocumentId
  ↓
checkAuth(userId, courseDocumentId)
  │
  ├── 课程不存在 → 抛出 COURSE_001
  ├── 免费课程 (isPaid=false)
  │   ├── 无授权记录 → 自动创建 authType=free 的授权
  │   └── 返回 { authorized: true }
  ├── 付费课程 (isPaid=true)
  │   ├── 无授权记录 → 返回 { authorized: false }
  │   ├── 有授权但已过期 → 标记 isExpired=true → 返回 { authorized: false }
  │   └── 有有效授权 → 返回 { authorized: true }
```

### 11.2 学习进度上报流程

```
用户观看视频/阅读文章
  ↓
POST /api/course/my/lesson-progress
  │
  ├── 请求体：{ lessonDocumentId, progress, playPosition, duration }
  │
  ├── 查找课时（populate course）
  │   └── 课时不存在 → 抛出 LESSON_001
  │
  ├── 查找已有进度记录
  │   ├── 无记录 → 创建新记录
  │   └── 有记录 → 更新
  │       ├── 进度只能前进（新进度 ≤ 旧进度 → 直接返回）
  │       ├── 服务端校验：playPosition/duration 计算服务端进度
  │       │   └── 取 min(客户端进度, 服务端进度 + 5%)
  │       └── 进度 ≥ 100 → isCompleted = true
  │
  └── 课时完成 → 触发课程进度重算
      └── course-progress.recalculate(userId, courseId)
          ├── 统计已完成课时数
          ├── 计算进度百分比
          └── 全部完成 → isCompleted = true
```

### 11.3 答题流程

```
用户提交答题
  ↓
POST /api/course/my/lesson-answer/:documentId（进度记录ID）
  │
  ├── 请求体：{ isCorrect: boolean }
  │
  ├── 查找进度记录（populate lesson）
  │   └── 不存在 → 抛出 PROGRESS_001
  ├── 归属校验 → 不匹配 → 抛出 PROGRESS_002
  │
  ├── 更新进度记录：
  │   ├── isAnswered = true
  │   ├── isCorrect = 请求值
  │   └── 答对时：isCompleted = true, progress = 100
  │
  ├── quiz_points 模式且答对：
  │   ├── 调用 sumQuizPoints 汇总答题积分
  │   ├── 写入 quizPointsDetail
  │   └── 写入 calculatedPoints
  │
  └── 答对 → 触发课程进度重算
```

### 11.4 防刷机制

| 机制 | 说明 |
|------|------|
| 进度只能前进 | 新进度 ≤ 旧进度时直接返回旧记录，不更新 |
| 服务端校验 | 根据 playPosition/duration 计算服务端进度，取 min(客户端, 服务端+5%) |
| 积分只能领一次 | isPointsClaimed = true 后不可重复领取 |
| 进度归属校验 | 操作进度记录时校验 userId 归属 |

---

## 12. 数据模型速查

### 8 个 Content Type

| 模型 | UID | 说明 |
|------|-----|------|
| Course | `plugin::zhao-course.course` | 课程 |
| CourseLesson | `plugin::zhao-course.course-lesson` | 课时 |
| CourseCategory | `plugin::zhao-course.course-category` | 课程分类 |
| CourseTag | `plugin::zhao-course.course-tag` | 课程标签 |
| KnowledgePoint | `plugin::zhao-course.knowledge-point` | 知识点 |
| UserCourseAuth | `plugin::zhao-course.user-course-auth` | 用户课程授权 |
| LessonProgress | `plugin::zhao-course.lesson-progress` | 课时学习记录 |
| CourseProgress | `plugin::zhao-course.course-progress` | 课程学习记录 |

### 关键关联关系

```
Course
  ├── category → CourseCategory (manyToOne)
  ├── tags → CourseTag (manyToMany)
  ├── lessons → CourseLesson (oneToMany)
  ├── knowledgePoints → KnowledgePoint (oneToMany)
  └── quizzes → zhao-quiz.quiz (oneToMany)

CourseLesson
  ├── course → Course (manyToOne)
  ├── tags → CourseTag (manyToMany)
  └── quizzes → zhao-quiz.quiz (oneToMany)

UserCourseAuth
  ├── user → User (manyToOne)
  └── course → Course (manyToOne)

LessonProgress
  ├── user → User (manyToOne)
  ├── lesson → CourseLesson (manyToOne)
  └── course → Course (manyToOne)

CourseProgress
  ├── user → User (manyToOne)
  └── course → Course (manyToOne)
```

### 积分相关字段

**Course**：
- `enablePoints` (boolean) — 是否启用积分
- `points` (integer) — 课程固定积分值
- `pointsType` (enum) — `course_points` | `lesson_points`

**CourseLesson**：
- `enablePoints` (boolean) — 是否启用积分
- `points` (integer) — 课时固定积分值
- `pointsType` (enum) — `lesson_points` | `quiz_points`

**LessonProgress**：
- `pointsEarned` (integer) — 已领取积分
- `isPointsClaimed` (boolean) — 是否已领取
- `calculatedPoints` (integer) — 服务端计算积分
- `quizPointsDetail` (json) — 答题积分明细

**CourseProgress**：
- `pointsEarned` (integer) — 已领取积分
- `isPointsClaimed` (boolean) — 是否已领取
- `lessonPointsSummary` (json) — 课时积分汇总

---

## 13. 错误码速查

| 错误码 | 消息 | 触发场景 |
|--------|------|----------|
| COURSE_001 | 课程不存在 (id={courseId}) | 查询课程 documentId 无效 |
| COURSE_002 | 课程未启用积分 | claimPoints 时 course.enablePoints=false |
| COURSE_003 | 课程积分已领取 | claimPoints 时 isPointsClaimed=true |
| COURSE_004 | 课程未完成，无法领取积分 | claimPoints 时 isCompleted=false |
| COURSE_005 | 无权访问该课程 | checkAuth 未通过 |
| COURSE_006 | 课程授权已过期 | checkAuth 发现授权过期 |
| COURSE_007 | 课程为收费课程，请先购买 | 付费课程无授权 |
| COURSE_008 | 无可领取课程积分 | claimPoints 计算积分为 0 |
| LESSON_001 | 课时不存在 (id={lessonId}) | 查询课时 documentId 无效 |
| LESSON_002 | 课时未启用积分 | claimPoints 时 lesson.enablePoints=false |
| LESSON_003 | 课时积分已领取 | claimPoints 时 isPointsClaimed=true |
| LESSON_004 | 课时未完成，无法领取积分 | lesson_points 模式下 isCompleted=false |
| LESSON_005 | 课时需答题才能获得积分 | quiz_points 模式下 isAnswered=false |
| LESSON_006 | 答题错误，无法获得积分 | quiz_points 模式下 isCorrect=false |
| LESSON_007 | 无可领取课时积分 | claimPoints 计算积分为 0 |
| PROGRESS_001 | 学习进度记录不存在 | 查询进度记录 ID 无效 |
| PROGRESS_002 | 非法进度上报 | 进度归属校验失败 |

---

## 14. 常见问题排查

### 14.1 插件加载失败

**症状**：Strapi 启动后插件不生效。

**排查步骤**：

1. 检查 `config/plugins.ts` 是否正确注册：
   ```typescript
   "zhao-course": { enabled: true, resolve: "./node_modules/zhao-course" }
   ```

2. 检查 `node_modules/zhao-course` 是否存在：
   ```powershell
   ls e:/code/web/node_modules/zhao-course
   ```

3. 检查插件是否已构建（`dist` 目录是否存在）：
   ```powershell
   ls e:/code/plugins/zhao-course/dist
   ```

4. 检查 `package.json` 的 `exports` 字段是否正确指向 `dist` 目录。

### 14.2 权限策略未注册

**症状**：启动日志出现 `zhao-course: zhao-auth 插件未启用，权限策略未注册`。

**原因**：zhao-auth 未启用或在 zhao-course 之后加载。

**解决**：

1. 确保 `config/plugins.ts` 中 `zhao-auth` 已启用
2. 确保 `zhao-auth` 在 `zhao-course` 之前注册

### 14.3 接口返回 403

**排查步骤**：

1. 确认请求头包含 `Authorization: Bearer <token>`
2. 确认 Token 有效且未过期
3. 确认用户角色有对应权限（查看 `permissions.ts` 中的 allowRoles）
4. Admin 路由检查 `has-permission` 策略的 action 是否正确
5. Content API 路由检查 `has-course-permission` 策略的 permission 名称

### 14.4 积分领取失败

**排查步骤**：

1. 检查课程 `enablePoints` 是否为 `true`
2. 检查课程/课时 `pointsType` 配置是否正确
3. 检查进度记录 `isPointsClaimed` 是否已为 `true`（已领取过）
4. lesson_points 模式：检查 `isCompleted` 是否为 `true`
5. quiz_points 模式：检查 `isAnswered` 和 `isCorrect` 是否都为 `true`
6. 检查 zhao-quiz 是否正常工作（quiz_points 模式）

### 14.5 课程进度不更新

**排查步骤**：

1. 确认课时进度已上报到 100%（`isCompleted = true`）
2. 确认 `course-progress.recalculate` 被触发（课时完成时自动触发）
3. 检查课程下的课时总数（`totalLessons`）是否正确
4. 检查是否有课时被删除但 `totalLessons` 未更新

### 14.6 构建失败

**排查步骤**：

1. 先运行类型检查定位错误：
   ```powershell
   npm run build:ts
   ```

2. 检查 `tsconfig.json` 配置是否符合 5.1 节要求

3. 清除缓存重新构建：
   ```powershell
   Remove-Item -Recurse -Force dist
   npm run build
   ```

4. 内存不足时：
   ```powershell
   $env:NODE_OPTIONS="--max-old-space-size=8192"; npm run build
   ```

### 14.7 Content API 看不到课程

**原因**：Content API 的 GET 接口使用 Strapi Document Service 的 `status: 'published'` 过滤，只返回已发布版本。

**排查步骤**：

1. 确认课程已通过 Strapi D&P 机制发布（`publishedAt` 不为空）
2. 确认使用了正确的发布方式（见 14.8 节）
3. 确认插件已 build 并重启 Strapi（修改源码后必须 `npm run build`）
4. 检查 `ctx.path` 是否正确传入（不能依赖 `ctx._matchedRoute`）

### 14.8 课程发布方式

课程有自定义 `status` 枚举字段（draft/pending/published/archived）和 Strapi D&P 机制（draftAndPublish），两者必须同步：

**正确发布方式**：使用自定义 publish 接口 `POST /api/zhao-course/v1/admin/courses/:documentId/publish`，该接口会：
1. 先 `update` 自定义字段（`status: "published"` + `publishDate`）
2. 再调用 Strapi D&P `publish()` 生成 published 版本快照

**创建时直接发布**：`POST /api/zhao-course/v1/admin/courses` 传入 `status: "published"`，service 会自动执行上述两步。

**错误方式**：
- 仅通过 Strapi 管理端 Publish 按钮发布 → 只触发 D&P，自定义 `status` 仍为 `"draft"`
- 仅 `update({ status: "published" })` → 只更新自定义字段，无 D&P published 版本

> **关键**：必须先 `update` 自定义字段再 `publish`，顺序不能反。`publish()` 创建 published 版本快照，快照包含 `update` 后的值。如果先 `publish` 再 `update`，published 版本中自定义字段仍是旧值。

### 14.9 插件代码修改不生效

**原因**：Strapi 加载的是 `dist/` 目录下的编译后代码（`package.json` 的 `exports` 指向 `./dist/server/index.js`），不是 `server/src/` 的源码。

**解决**：每次修改源码后必须重新构建：

```powershell
cd e:/code/plugins/zhao-course
npm run build
# 然后重启 Strapi
```

**开发建议**：使用 `npm run watch:link` 监听文件变化自动构建，避免每次手动 build。

### 14.10 Service 方法中 this 上下文丢失

**原因**：Strapi 插件系统加载 service 时会解构方法，导致 `this` 上下文丢失。`this.publish()` 等调用会抛出 TypeError。

**错误写法**：
```typescript
export default ({ strapi }) => ({
  async create(data) {
    // this.publish 在方法被解构后为 undefined
    if (needPublish) return this.publish(result.documentId);
  },
  async publish(documentId) { ... },
});
```

**正确写法**：将共享逻辑提取为闭包函数，通过闭包引用而非 `this`：
```typescript
export default ({ strapi }) => {
  const publishDoc = async (documentId: string) => { ... };

  return {
    async create(data) {
      if (needPublish) return publishDoc(result.documentId); // 闭包引用
    },
    async publish(documentId) {
      return publishDoc(documentId); // 闭包引用
    },
  };
};
```

### 14.11 Strapi Document Service API 规范

- `findMany({ status: 'published' })` → 返回已发布版本
- `findMany({ status: 'draft' })` → 返回草稿版本（等同默认）
- `status` 参数只支持 `'draft'` 和 `'published'`，不支持 `'preview'` 等自定义值
- 不要用 `publishedAt: { $notNull: true }` 过滤，应使用官方 `status` 参数
- `findMany` 参数中不要传入非法字段（如 `isPublished`），会被忽略或报错

---

## 15. 开发规范

### 15.1 新增 Content Type

1. 在 `server/src/content-types/` 下创建目录，包含 `schema.json`
2. 在 `server/src/content-types/index.ts` 中导出
3. 创建对应的 Controller 和 Service
4. 在 `server/src/controllers/index.ts` 和 `server/src/services/index.ts` 中导出
5. 在 `server/src/routes/admin.ts` 和 `server/src/routes/content-api.ts` 中添加路由
6. 在 `server/src/permissions.ts` 中添加权限定义

### 15.2 新增路由

- Admin 路由：添加到 `server/src/routes/admin.ts`，使用 `has-permission` 策略
- Content API 公开路由：添加到 `server/src/routes/content-api.ts`，设置 `auth: false`
- Content API 写操作：添加中间件 `zhao-auth.authenticate` + `zhao-auth.authorize`（含 `has-course-permission`）
- Content API 个人路由：添加中间件 `zhao-auth.authenticate` + `zhao-auth.authorize`（含 `is-authenticated`）

### 15.3 新增错误码

1. 在 `server/src/register.ts` 的 `i18n.setMessages` 中添加错误码和消息
2. 在 Service 中使用：
   ```typescript
   const i18n = strapi.plugin("zhao-common")?.service("i18n");
   const msg = i18n ? i18n.t("ERROR_CODE", { param: value }) : "默认消息";
   const err: any = new Error(msg);
   err.code = "ERROR_CODE";
   throw err;
   ```

### 15.4 代码风格

- Controller 层：参数校验 + 调用 Service + 处理响应
- Service 层：业务逻辑 + 数据库操作
- 工具函数：纯逻辑，放在 `server/src/utils/`
- 错误处理：使用 i18n 错误码，设置 `err.code`
- zhao-point/zhao-quiz 调用：try-catch 包裹，降级处理

### 15.5 参数传递规范

- Admin 路由的路径参数使用 `documentId`（Strapi Document ID，字符串）
- Content API 个人接口的 `:documentId` 参数含义因接口而异：
  - `/my/lesson-answer/:documentId` → 课时进度记录的数字 ID
  - `/my/claim-lesson-points/:documentId` → 课时进度记录的数字 ID
  - `/my/claim-course-points/:documentId` → 课程进度记录的数字 ID
  - `/my/course-auth/:courseDocumentId` → 课程的 documentId（字符串）
- Service 层的 `progressRecordId` 参数为进度记录的数字 ID
