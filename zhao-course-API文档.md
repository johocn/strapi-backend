# Zhao Course 插件 API 文档

> 版本：1.0.0 | 基于 Strapi v5

---

## 目录

- [1. 概述](#1-概述)
- [2. 认证机制](#2-认证机制)
- [3. Admin API（后台管理）](#3-admin-api后台管理)
- [4. Content API（公开/用户接口）](#4-content-api公开用户接口)
- [5. 数据模型](#5-数据模型)
- [6. 积分体系](#6-积分体系)
- [7. 权限系统](#7-权限系统)
- [8. 错误码](#8-错误码)

---

## 1. 概述

Zhao Course 是基于 Strapi v5 的在线课程管理插件，提供课程、课时、知识点、学习进度、积分、授权等完整功能。

**依赖插件**：
- `zhao-auth`：认证与授权
- `zhao-common`：国际化（i18n）
- `zhao-point`：积分发放（可选）
- `zhao-quiz`：题库与答题（可选，quiz_points 模式必需）

**路由前缀**：
- Admin API：`/admin/plugins/zhao-course`
- Content API：`/api/course`

---

## 2. 认证机制

### Admin 路由
所有 Admin 路由通过 `zhao-auth` 中间件认证：
1. `plugin::zhao-auth.authenticate` — 解析 JWT Token
2. `plugin::zhao-auth.authorize` — 检查权限策略（`has-permission`）

请求头：
```
Authorization: Bearer <jwt_token>
```

### Content API 路由
- GET 公开接口：无需认证（`auth: false`）
- POST/PUT/DELETE 写操作：需认证 + `has-course-permission` 策略
- `/my/*` 个人接口：需认证（`is-authenticated`）

---

## 3. Admin API（后台管理）

基础路径：`/admin/plugins/zhao-course`

### 3.1 课程分类

#### 获取分类列表
```
GET /course-categories
```
**权限**：`course-category.read`
**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 25 |
| sort | string | 否 | 排序字段，如 `sort:asc` |
| filters | object | 否 | 过滤条件，如 `{ name: { $contains: "前端" } }` |
| populate | object | 否 | 关联填充，如 `{ courses: true }` |

**响应示例**：
```json
{
  "data": [
    {
      "id": 1,
      "documentId": "abc123",
      "name": "前端开发",
      "description": "前端开发相关课程",
      "sort": 1,
      "courses": []
    }
  ],
  "meta": { "pagination": { "page": 1, "pageSize": 25, "total": 10, "pageCount": 1 } }
}
```

#### 获取单个分类
```
GET /course-categories/:documentId
```
**权限**：`course-category.read`

#### 创建分类
```
POST /course-categories
```
**权限**：`course-category.create`
**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 分类名称 |
| description | string | 否 | 分类描述 |
| sort | integer | 否 | 排序值，默认 0 |

```json
{ "name": "前端开发", "description": "前端开发课程", "sort": 1 }
```

#### 更新分类
```
PUT /course-categories/:documentId
```
**权限**：`course-category.update`
**请求体**：同创建，所有字段可选

#### 删除分类
```
DELETE /course-categories/:documentId
```
**权限**：`course-category.delete`

---

### 3.2 课程标签

#### 获取标签列表
```
GET /course-tags
```
**权限**：`course-tag.read`
**查询参数**：同分类

#### 获取单个标签
```
GET /course-tags/:documentId
```

#### 创建标签
```
POST /course-tags
```
**权限**：`course-tag.create`
**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 标签名称 |
| color | string | 否 | 标签颜色，如 `#FF5733` |

#### 更新标签
```
PUT /course-tags/:documentId
```

#### 删除标签
```
DELETE /course-tags/:documentId
```

---

### 3.3 课程

#### 获取课程列表
```
GET /courses
```
**权限**：`course.read`
**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |
| sort | string | 否 | 排序，如 `sort:asc`、`createdAt:desc` |
| filters | object | 否 | 过滤，如 `{ status: { $eq: "published" } }` |
| populate | object | 否 | 关联填充，如 `{ category: true, tags: true, lessons: true }` |

#### 获取单个课程
```
GET /courses/:documentId
```
**权限**：`course.read`

#### 创建课程
```
POST /courses
```
**权限**：`course.create`
**Content-Type**：`multipart/form-data`（支持文件上传）

**请求体（data 字段，JSON 字符串或表单字段）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 课程标题 |
| slug | string | 否 | URL 别名，自动从 title 生成 |
| description | text | 否 | 课程描述 |
| author | string | 否 | 作者 |
| difficulty | enum | 否 | 难度：`beginner`/`intermediate`/`advanced`/`expert`，默认 `beginner` |
| level | enum | 否 | 级别：`introductory`/`foundation`/`advanced`/`professional`，默认 `introductory` |
| language | enum | 否 | 语言：`zh-CN`/`zh-TW`/`en-US`/`ja-JP`/`ko-KR`，默认 `zh-CN` |
| keywords | json | 否 | 关键词数组，如 `["React","TypeScript"]` |
| isFree | boolean | 否 | 是否免费，默认 false |
| isPaid | boolean | 否 | 是否付费，默认 false |
| originalPrice | decimal | 否 | 原价，默认 0 |
| discountPrice | decimal | 否 | 折扣价，默认 0 |
| price | decimal | 否 | 售价，默认 0 |
| isFeatured | boolean | 否 | 是否推荐，默认 false |
| status | enum | 否 | 状态：`draft`/`pending`/`published`/`archived`，默认 `draft` |
| auditStatus | enum | 否 | 审核状态：`pending`/`approved`/`rejected`，默认 `pending` |
| enrollStartDate | datetime | 否 | 报名开始时间 |
| enrollEndDate | datetime | 否 | 报名结束时间 |
| courseStartDate | datetime | 否 | 课程开始时间 |
| courseEndDate | datetime | 否 | 课程结束时间 |
| publishDate | datetime | 否 | 发布时间 |
| duration | string | 否 | 课程时长描述 |
| sort | integer | 否 | 排序值 |
| enablePoints | boolean | 否 | 是否启用积分，默认 false |
| points | integer | 否 | 课程积分值（course_points 模式），默认 0 |
| pointsType | enum | 否 | 积分类型：`course_points`/`lesson_points`，默认 `course_points` |
| category | integer | 否 | 分类 ID |
| tags | integer[] | 否 | 标签 ID 数组 |

**文件上传字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| cover | file | 课程封面图 |
| thumbnail | file | 课程缩略图 |

**请求示例（multipart/form-data）**：
```
data: {"title":"React入门","description":"从零学React","difficulty":"beginner","isFree":true,"enablePoints":true,"pointsType":"lesson_points","category":1,"tags":[1,2]}
cover: <file>
```

#### 更新课程
```
PUT /courses/:documentId
```
**权限**：`course.update`
**请求体**：同创建，所有字段可选

#### 删除课程
```
DELETE /courses/:documentId
```
**权限**：`course.delete`

#### 发布课程
```
POST /courses/:documentId/publish
```
**权限**：`course.publish`
**请求体**：无

---

### 3.4 知识点

#### 获取知识点列表
```
GET /knowledge-points
```
**权限**：`knowledge-point.read`

#### 获取单个知识点
```
GET /knowledge-points/:documentId
```

#### 创建知识点
```
POST /knowledge-points
```
**权限**：`knowledge-point.create`
**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 知识点标题 |
| content | richtext | 否 | 知识点内容 |
| course | integer | 否 | 所属课程 ID |
| sort | integer | 否 | 排序值 |

#### 更新知识点
```
PUT /knowledge-points/:documentId
```

#### 删除知识点
```
DELETE /knowledge-points/:documentId
```

---

### 3.5 课时

#### 获取课时列表
```
GET /lessons
```
**权限**：`lesson.read`

#### 获取单个课时
```
GET /lessons/:documentId
```

#### 创建课时
```
POST /lessons
```
**权限**：`lesson.create`
**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 课时标题 |
| slug | string | 否 | URL 别名 |
| type | enum | 否 | 类型：`video`/`audio`/`article`/`quiz`，默认 `video` |
| summary | text | 否 | 课时摘要 |
| content | richtext | 否 | 课时内容 |
| video_url | string | 否 | 视频地址 |
| audio_url | string | 否 | 音频地址 |
| duration | integer | 否 | 时长（秒），默认 0 |
| isFreePreview | boolean | 否 | 是否免费试看，默认 false |
| previewDuration | integer | 否 | 试看时长（秒），默认 0 |
| sequenceNumber | integer | 否 | 课时序号 |
| learningObjectives | text | 否 | 学习目标 |
| prerequisites | text | 否 | 前置要求 |
| completionThreshold | integer | 否 | 完成阈值（百分比），默认 100 |
| isRequired | boolean | 否 | 是否必修，默认 true |
| course | integer | 否 | 所属课程 ID |
| tags | integer[] | 否 | 标签 ID 数组 |
| sort | integer | 否 | 排序值 |
| enablePoints | boolean | 否 | 是否启用积分，默认 false |
| points | integer | 否 | 课时固定积分值（lesson_points 模式），默认 0 |
| pointsType | enum | 否 | 积分类型：`lesson_points`/`quiz_points`，默认 `lesson_points` |

#### 更新课时
```
PUT /lessons/:documentId
```

#### 删除课时
```
DELETE /lessons/:documentId
```

---

### 3.6 用户课程授权

#### 获取授权列表
```
GET /user-courses
```
**权限**：`user-course.read`

#### 获取单个授权
```
GET /user-courses/:documentId
```

#### 授权课程给用户
```
POST /user-courses
```
**权限**：`user-course.grant`
**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user | integer | 是 | 用户 ID |
| course | integer | 是 | 课程 ID |
| authType | enum | 否 | 授权类型：`free`/`paid`/`admin_grant`，默认 `free` |
| expiresAt | datetime | 否 | 过期时间 |
| isExpired | boolean | 否 | 是否已过期，默认 false |

#### 撤销授权
```
DELETE /user-courses/:documentId
```
**权限**：`user-course.grant`

---

### 3.7 课程进度

#### 获取进度列表
```
GET /course-progresses
```
**权限**：`course-progress.read`

#### 获取单个进度
```
GET /course-progresses/:documentId
```

#### 更新进度
```
PUT /course-progresses/:documentId
```
**权限**：`course-progress.update`

---

### 3.8 课时进度

#### 获取进度列表
```
GET /lesson-progresses
```
**权限**：`lesson-progress.read`

#### 获取单个进度
```
GET /lesson-progresses/:documentId
```

#### 更新进度
```
PUT /lesson-progresses/:documentId
```
**权限**：`lesson-progress.update`

---

## 4. Content API（公开/用户接口）

基础路径：`/api/course`

### 4.1 公开课程接口（无需认证）

#### 获取课程列表
```
GET /courses
```
**认证**：无需
**说明**：仅返回已发布（`publishedAt` 不为空）的课程

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |
| sort | string | 否 | 排序 |
| filters | object | 否 | 过滤条件 |
| populate | object | 否 | 关联填充 |

#### 获取课程详情
```
GET /courses/:documentId
```
**认证**：无需
**说明**：仅返回已发布课程

---

### 4.2 公开资源接口（无需认证）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/course-categories` | GET | 分类列表 |
| `/course-categories/:documentId` | GET | 分类详情 |
| `/course-tags` | GET | 标签列表 |
| `/course-tags/:documentId` | GET | 标签详情 |
| `/knowledge-points` | GET | 知识点列表 |
| `/knowledge-points/:documentId` | GET | 知识点详情 |
| `/course-lessons` | GET | 课时列表 |
| `/course-lessons/:documentId` | GET | 课时详情 |

---

### 4.3 写操作接口（需认证 + 权限）

所有 POST/PUT/DELETE 操作需要：
1. JWT Token 认证（`is-authenticated`）
2. 课程权限（`has-course-permission`）

| 资源 | 创建 | 更新 | 删除 |
|------|------|------|------|
| 课程 | `POST /courses` | `PUT /courses/:documentId` | `DELETE /courses/:documentId` |
| 分类 | `POST /course-categories` | `PUT /course-categories/:documentId` | `DELETE /course-categories/:documentId` |
| 标签 | `POST /course-tags` | `PUT /course-tags/:documentId` | `DELETE /course-tags/:documentId` |
| 知识点 | `POST /knowledge-points` | `PUT /knowledge-points/:documentId` | `DELETE /knowledge-points/:documentId` |
| 课时 | `POST /course-lessons` | `PUT /course-lessons/:documentId` | `DELETE /course-lessons/:documentId` |

---

### 4.4 用户个人接口（需认证）

#### 获取我的授权课程
```
GET /my/courses
```
**认证**：必须登录
**响应示例**：
```json
[
  {
    "id": 1,
    "authType": "paid",
    "isExpired": false,
    "expiresAt": "2025-12-31T23:59:59.000Z",
    "course": { "id": 1, "documentId": "abc123", "title": "React入门" }
  }
]
```

#### 获取我的课程进度
```
GET /my/course-progresses
```
**认证**：必须登录

#### 检查课程授权状态
```
GET /my/course-auth/:courseDocumentId
```
**认证**：必须登录
**路径参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| courseDocumentId | string | 是 | 课程的 documentId |

**响应示例**：
```json
{ "authorized": true }
```
```json
{ "authorized": false }
```

**逻辑说明**：
- 免费课程（`isPaid=false`）：自动创建授权记录并返回 `authorized: true`
- 付费课程：检查是否存在有效授权记录
- 已过期授权：自动标记 `isExpired=true` 并返回 `authorized: false`

---

### 4.5 学习进度接口

#### 上报课时进度
```
POST /my/lesson-progress
```
**认证**：必须登录
**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| lessonDocumentId | string | 是 | 课时的 documentId |
| progress | number | 否 | 进度百分比（0-100），到达 100 标记完成 |
| playPosition | integer | 否 | 播放位置（秒） |
| duration | integer | 否 | 视频总时长（秒） |

```json
{
  "lessonDocumentId": "lesson_abc123",
  "progress": 75,
  "playPosition": 450,
  "duration": 600
}
```

**防刷机制**：
- 进度只能前进不能后退
- 服务端校验：`playPosition / duration` 计算服务端进度，取客户端和服务端的较小值（允许 5% 误差）
- 课时完成时自动触发课程进度重算

**响应**：课时进度记录对象

---

#### 提交课时答题
```
POST /my/lesson-answer/:documentId
```
**认证**：必须登录
**路径参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| documentId | string | 是 | 课时进度记录的 ID（非课时 ID） |

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| isCorrect | boolean | 是 | 是否答对 |

```json
{ "isCorrect": true }
```

**逻辑说明**：
1. 查询进度记录，校验归属
2. 更新 `isAnswered=true`、`isCorrect`、`lastStudyAt`
3. 答对时：`isCompleted=true`、`progress=100`
4. quiz_points 模式且答对：汇总该课时下答对题目的 `quiz.points`，写入 `quizPointsDetail` 和 `calculatedPoints`
5. 答对后触发课程进度重算

---

#### 领取课时积分
```
POST /my/claim-lesson-points/:documentId
```
**认证**：必须登录
**路径参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| documentId | string | 是 | 课时进度记录的 ID |

**请求体**：无

**前置条件**：
- 课时 `enablePoints=true`
- 进度 `isPointsClaimed=false`
- lesson_points 模式：`isCompleted=true`
- quiz_points 模式：`isAnswered=true` 且 `isCorrect=true`

**积分计算逻辑**：
- `lesson_points`：积分 = `lesson.points`（课时固定值）
- `quiz_points`：积分 = 该课时下所有答对题目的 `quiz.points` 之和

**响应示例**：
```json
{
  "pointsEarned": 25,
  "claimed": true,
  "detail": {
    "quiz_doc_1": { "points": 10, "isCorrect": true },
    "quiz_doc_2": { "points": 15, "isCorrect": true }
  }
}
```

**zhao-point 对接**：成功后调用 `zhao-point.earnPoints`，action 为 `complete_lesson` 或 `complete_quiz`

---

#### 领取课程积分
```
POST /my/claim-course-points/:documentId
```
**认证**：必须登录
**路径参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| documentId | string | 是 | 课程进度记录的 ID |

**请求体**：无

**前置条件**：
- 课程 `enablePoints=true`
- 进度 `isCompleted=true`
- 进度 `isPointsClaimed=false`

**积分计算逻辑**：
- `course_points`：积分 = `course.points`（课程固定值）
- `lesson_points`：积分 = 该用户在此课程下所有已领取课时积分之和

**响应示例**：
```json
{
  "pointsEarned": 75,
  "claimed": true,
  "detail": {
    "lesson_doc_1": { "title": "课时1", "pointsEarned": 10 },
    "lesson_doc_2": { "title": "课时2", "pointsEarned": 25 },
    "lesson_doc_3": { "title": "课时3", "pointsEarned": 40 }
  }
}
```

**zhao-point 对接**：成功后调用 `zhao-point.earnPoints`，action 为 `complete_course`

---

## 5. 数据模型

### 5.1 课程（Course）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| title | string | 是 | - | 课程标题 |
| slug | uid | 否 | 自动生成 | URL 别名 |
| description | text | 否 | - | 课程描述 |
| cover | media | 否 | - | 封面图（单张） |
| thumbnail | media | 否 | - | 缩略图（单张） |
| author | string | 否 | - | 作者 |
| difficulty | enum | 否 | `beginner` | beginner/intermediate/advanced/expert |
| level | enum | 否 | `introductory` | introductory/foundation/advanced/professional |
| language | enum | 否 | `zh-CN` | zh-CN/zh-TW/en-US/ja-JP/ko-KR |
| keywords | json | 否 | - | 关键词数组 |
| studentCount | integer | 否 | 0 | 学习人数 |
| viewCount | integer | 否 | 0 | 浏览次数 |
| likeCount | integer | 否 | 0 | 点赞数 |
| isFeatured | boolean | 否 | false | 是否推荐 |
| isFree | boolean | 否 | false | 是否免费 |
| isPaid | boolean | 否 | false | 是否付费 |
| originalPrice | decimal(10,2) | 否 | 0 | 原价 |
| discountPrice | decimal(10,2) | 否 | 0 | 折扣价 |
| price | decimal(10,2) | 否 | 0 | 售价 |
| enrollStartDate | datetime | 否 | - | 报名开始时间 |
| enrollEndDate | datetime | 否 | - | 报名结束时间 |
| courseStartDate | datetime | 否 | - | 课程开始时间 |
| courseEndDate | datetime | 否 | - | 课程结束时间 |
| publishDate | datetime | 否 | - | 发布时间 |
| status | enum | 否 | `draft` | draft/pending/published/archived |
| auditStatus | enum | 否 | `pending` | pending/approved/rejected |
| rating | decimal(3,1) | 否 | 0 | 评分 |
| ratingCount | integer | 否 | 0 | 评分人数 |
| sort | integer | 否 | 0 | 排序值 |
| enablePoints | boolean | 否 | false | 是否启用积分 |
| points | integer | 否 | 0 | 课程积分值 |
| pointsType | enum | 否 | `course_points` | course_points/lesson_points |
| category | relation | 否 | - | manyToOne → course-category |
| tags | relation | 否 | - | manyToMany → course-tag |
| lessons | relation | - | - | oneToMany → course-lesson |
| knowledgePoints | relation | - | - | oneToMany → knowledge-point |
| quizzes | relation | - | - | oneToMany → zhao-quiz.quiz |
| exams | relation | - | - | oneToMany → zhao-quiz.quiz-exam |

### 5.2 课时（CourseLesson）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| title | string | 是 | - | 课时标题 |
| slug | uid | 否 | 自动生成 | URL 别名 |
| type | enum | 否 | `video` | video/audio/article/quiz |
| thumbnail | media | 否 | - | 缩略图 |
| summary | text | 否 | - | 摘要 |
| content | richtext | 否 | - | 内容 |
| video_url | string | 否 | - | 视频地址 |
| audio_url | string | 否 | - | 音频地址 |
| images | media | 否 | - | 图片（多张） |
| attachments | media | 否 | - | 附件（多个） |
| duration | integer | 否 | 0 | 时长（秒） |
| isFreePreview | boolean | 否 | false | 是否免费试看 |
| previewDuration | integer | 否 | 0 | 试看时长（秒） |
| sequenceNumber | integer | 否 | 0 | 课时序号 |
| learningObjectives | text | 否 | - | 学习目标 |
| prerequisites | text | 否 | - | 前置要求 |
| completionThreshold | integer | 否 | 100 | 完成阈值（%） |
| isRequired | boolean | 否 | true | 是否必修 |
| sort | integer | 否 | 0 | 排序值 |
| enablePoints | boolean | 否 | false | 是否启用积分 |
| points | integer | 否 | 0 | 课时固定积分 |
| pointsType | enum | 否 | `lesson_points` | lesson_points/quiz_points |
| course | relation | 否 | - | manyToOne → course |
| tags | relation | 否 | - | manyToMany → course-tag |
| quizzes | relation | - | - | oneToMany → zhao-quiz.quiz |

### 5.3 课程分类（CourseCategory）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| name | string | 是 | - | 分类名称 |
| description | text | 否 | - | 分类描述 |
| sort | integer | 否 | 0 | 排序值 |
| courses | relation | - | - | oneToMany → course |

### 5.4 课程标签（CourseTag）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| name | string | 是 | - | 标签名称 |
| color | string | 否 | - | 标签颜色 |
| courses | relation | - | - | manyToMany → course |
| lessons | relation | - | - | manyToMany → course-lesson |

### 5.5 知识点（KnowledgePoint）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| title | string | 是 | - | 知识点标题 |
| content | richtext | 否 | - | 知识点内容 |
| sort | integer | 否 | 0 | 排序值 |
| course | relation | 否 | - | manyToOne → course |
| quizzes | relation | - | - | manyToMany → zhao-quiz.quiz |

### 5.6 用户课程授权（UserCourseAuth）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| user | relation | - | - | manyToOne → user |
| course | relation | - | - | manyToOne → course |
| authType | enum | 否 | `free` | free/paid/admin_grant |
| expiresAt | datetime | 否 | - | 过期时间 |
| isExpired | boolean | 否 | false | 是否已过期 |

### 5.7 课时学习记录（LessonProgress）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| user | relation | - | - | manyToOne → user |
| lesson | relation | - | - | manyToOne → course-lesson |
| course | relation | - | - | manyToOne → course |
| progress | decimal(5,2) | 否 | 0 | 进度百分比 |
| playPosition | integer | 否 | 0 | 播放位置（秒） |
| duration | integer | 否 | 0 | 视频时长（秒） |
| isCompleted | boolean | 否 | false | 是否完成 |
| isAnswered | boolean | 否 | false | 是否已答题 |
| isCorrect | boolean | 否 | false | 是否答对 |
| pointsEarned | integer | 否 | 0 | 已领取积分 |
| isPointsClaimed | boolean | 否 | false | 是否已领取积分 |
| calculatedPoints | integer | 否 | 0 | 服务端计算积分 |
| quizPointsDetail | json | 否 | {} | 答题积分明细 |
| lastStudyAt | datetime | 否 | - | 最后学习时间 |

### 5.8 课程学习记录（CourseProgress）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| user | relation | - | - | manyToOne → user |
| course | relation | - | - | manyToOne → course |
| completedLessons | integer | 否 | 0 | 已完成课时数 |
| totalLessons | integer | 否 | 0 | 总课时数 |
| progress | decimal(5,2) | 否 | 0 | 进度百分比 |
| isCompleted | boolean | 否 | false | 是否完成 |
| pointsEarned | integer | 否 | 0 | 已领取积分 |
| isPointsClaimed | boolean | 否 | false | 是否已领取积分 |
| lessonPointsSummary | json | 否 | {} | 课时积分汇总 |
| lastStudyAt | datetime | 否 | - | 最后学习时间 |

---

## 6. 积分体系

### 6.1 积分模型

```
课程 (enablePoints: true)
│
├─ pointsType: "course_points"
│   └─ 课程全部完成后 → 领取 course.points（课程固定积分）
│
└─ pointsType: "lesson_points"
    └─ 每个课时完成后 → 逐个领取课时积分
        │
        ├─ lesson.pointsType: "lesson_points"
        │   └─ 课时完成 → 领取 lesson.points（课时固定积分）
        │
        └─ lesson.pointsType: "quiz_points"
            └─ 答题正确 → 汇总该课时下答对题目的 quiz.points 之和
```

### 6.2 积分领取流程

**课时积分**：
1. 用户完成课时学习或答题
2. 调用 `POST /my/claim-lesson-points/:progressRecordId`
3. 系统根据 `lesson.pointsType` 计算积分
4. 更新进度记录，调用 zhao-point 发放积分

**课程积分**：
1. 用户完成全部课时
2. 调用 `POST /my/claim-course-points/:progressRecordId`
3. 系统根据 `course.pointsType` 计算积分
4. 更新进度记录，调用 zhao-point 发放积分

### 6.3 积分计算工具

文件：`server/src/utils/points-calculator.ts`

| 函数 | 说明 |
|------|------|
| `sumQuizPoints(strapi, userId, lessonId)` | 汇总课时下答对题目的积分 |
| `calculateLessonPoints(strapi, lesson, progress)` | 计算课时应得积分 |
| `calculateCoursePoints(strapi, course, userId, courseId)` | 计算课程应得积分 |

---

## 7. 权限系统

### 7.1 权限-角色映射

| 权限键 | 说明 | super-admin | admin | editor | viewer |
|--------|------|:-----------:|:-----:|:------:|:------:|
| course-category.read | 读取分类 | ✅ | ✅ | ✅ | ✅ |
| course-category.create | 创建分类 | ✅ | ✅ | ✅ | - |
| course-category.update | 更新分类 | ✅ | ✅ | ✅ | - |
| course-category.delete | 删除分类 | ✅ | ✅ | - | - |
| course-tag.read | 读取标签 | ✅ | ✅ | ✅ | ✅ |
| course-tag.create | 创建标签 | ✅ | ✅ | ✅ | - |
| course-tag.update | 更新标签 | ✅ | ✅ | ✅ | - |
| course-tag.delete | 删除标签 | ✅ | ✅ | - | - |
| course.read | 读取课程 | ✅ | ✅ | ✅ | ✅ |
| course.create | 创建课程 | ✅ | ✅ | ✅ | - |
| course.update | 更新课程 | ✅ | ✅ | ✅ | - |
| course.delete | 删除课程 | ✅ | ✅ | - | - |
| course.publish | 发布课程 | ✅ | ✅ | - | - |
| knowledge-point.read | 读取知识点 | ✅ | ✅ | ✅ | ✅ |
| knowledge-point.create | 创建知识点 | ✅ | ✅ | ✅ | - |
| knowledge-point.update | 更新知识点 | ✅ | ✅ | ✅ | - |
| knowledge-point.delete | 删除知识点 | ✅ | ✅ | - | - |
| lesson.read | 读取课时 | ✅ | ✅ | ✅ | ✅ |
| lesson.create | 创建课时 | ✅ | ✅ | ✅ | - |
| lesson.update | 更新课时 | ✅ | ✅ | ✅ | - |
| lesson.delete | 删除课时 | ✅ | ✅ | - | - |
| user-course.read | 读取授权 | ✅ | ✅ | ✅ | ✅ |
| user-course.grant | 授权/撤销 | ✅ | ✅ | ✅ | - |
| course-progress.read | 读取课程进度 | ✅ | ✅ | ✅ | ✅ |
| course-progress.update | 更新课程进度 | ✅ | ✅ | ✅ | ✅ |
| lesson-progress.read | 读取课时进度 | ✅ | ✅ | ✅ | ✅ |
| lesson-progress.update | 更新课时进度 | ✅ | ✅ | ✅ | ✅ |

### 7.2 Content API 权限

Content API 使用 `has-course-permission` 策略，权限名称对应关系：

| 资源 | 创建权限 | 更新权限 | 删除权限 |
|------|----------|----------|----------|
| 课程 | course.create | course.update | course.delete |
| 分类 | category.create | category.update | category.delete |
| 标签 | tag.create | tag.update | tag.delete |
| 知识点 | knowledge.create | knowledge.update | knowledge.delete |
| 课时 | lesson.create | lesson.update | lesson.delete |

---

## 8. 错误码

| 错误码 | 说明 | 触发场景 |
|--------|------|----------|
| COURSE_001 | 课程不存在 (id={courseId}) | 查询课程 documentId 无效 |
| COURSE_002 | 课程未启用积分 | claimPoints 时 course.enablePoints=false |
| COURSE_003 | 课程积分已领取 | claimPoints 时 isPointsClaimed=true |
| COURSE_004 | 课程未完成，无法领取积分 | claimPoints 时 isCompleted=false |
| COURSE_005 | 无权访问该课程 | checkAuth 未通过 |
| COURSE_006 | 课程授权已过期 | checkAuth 发现 expiresAt 已过期 |
| COURSE_007 | 课程为收费课程，请先购买 | checkAuth 付费课程无授权 |
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
