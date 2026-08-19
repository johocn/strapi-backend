# 课程表单播放功能配置区 + 详情页完善 设计文档

**日期**：2026-08-20
**项目**：strapi-backend（自定义 uni-app Vue3 管理后台，`e:\code\web`）
**关联功能**：播放倍速、VIP 特权倍速、横竖屏、防误触、自动连播、进度锁定、角色白名单、答题入口开关

## 1. 背景与目标

C 端（strapi-course，`e:\code\shao`）播放器已完整支持以下能力，数据源为课程 `featureFlags` JSON 字段：
- 播放倍速、VIP 特权倍速（`playbackSpeed` / `vipSpeedOverride`）
- 横竖屏（`allowLandscape`）、防误触锁定（`screenLock`）、自动连播（`autoNext`）、画中画（`pictureInPicture`）
- 进度锁定（`seekMode`：free / played_only / locked）
- 课程角色白名单（`learnRoles`，仅特定角色可见/学习，C 端与服务端均已实现门控）
- 答题入口开关组（`quiz`：practice / lessonQuiz / exam / freeAnswer / random + examRoles）

但管理后台课程表单**完全没有 featureFlags 配置入口**，详情页也不展示任何新字段，导致「新增功能开发了却无法配置」。
另：课程表单/详情页知识点过滤 slug 误用单数 `knowledge-point`（后端 seed 为复数 `knowledge-points`），导致知识点不显示。

**目标**：管理端课程表单新增「播放功能设置」配置区，详情页展示相关新字段，并修复知识点 slug。

## 2. 现状分析

- **后端** [course.ts](file:///e:/code/basic/plugins/zhao-course/server/src/services/course.ts) 的 create/update 已透传 `featureFlags`（json 字段），列表/详情已按 learnRoles 做角色门控，**无需改后端**。
- **C 端解析** [player-features.ts](file:///e:/code/shao/utils/player-features.ts)：
  - `configured = !!raw && typeof raw==='object'`；`configured=true` 且未写 seekMode 时默认 `played_only`；`configured=false`（raw 为 null）时 seekMode 视为 `free`。
  - `isSpeedEnabled = playbackSpeed || (vipSpeedOverride && 命中站点特权角色)`。
- **角色数据源**：`GET /zhao-auth/v1/admin/roles/all` 返回 `{list:[{name,displayName,isSystem}]}`，已封装于 [auth.js](file:///e:/code/web/src/api/auth.js) `getAllRoles()`。
- **构建入口**：`src/` 目录（vite uni-app 结构，端口 5174）。

## 3. 设计方案

### 3.1 课程表单 [src/pages/course/form.vue](file:///e:/code/web/src/pages/course/form.vue)

新增「播放功能设置」区块（保存到 `form.featureFlags` 对象）：

| 分组 | 字段 | 控件 | 说明 |
|------|------|------|------|
| 播放控制 | playbackSpeed | switch | 允许倍速播放 |
| | vipSpeedOverride | switch | 开启后仅站点特权角色可倍速 |
| | allowLandscape | switch | 允许横屏播放 |
| | screenLock | switch | 播放时锁定屏幕（防误触） |
| | autoNext | switch | 自动连播下一集 |
| | pictureInPicture | switch | 支持画中画 |
| 进度锁定 | seekMode | 三选一单选 | free=不锁定 / played_only=已看可拖 / locked=全程锁定 |
| 学习角色 | learnRoles | 多选（动态拉取 getAllRoles） | 空=不启用角色门控；admin 恒放行 |
| 答题入口 | quiz.practice | switch | 刷题练习入口 |
| | quiz.lessonQuiz | switch | 课堂测验入口 |
| | quiz.exam | switch | 模拟考试入口 |
| | quiz.freeAnswer | switch | 自由答题入口 |
| | quiz.random | switch | 随机抽题入口 |
| | quiz.examRoles | 多选（动态拉取） | 仅这些角色可见考试/试卷 |

**保存策略**（用户已确认）：**总是存对象**——保存时 `featureFlags` 始终为对象，未勾选开关显式 `false`，`seekMode` 未选时默认 `'played_only'`，`learnRoles`/`quiz.examRoles` 为数组，`quiz` 子对象始终存在。

**回显**：读取课程详情 `featureFlags`，按 `parseCourseFeatureFlags` 同名逻辑映射到表单控件。

**知识点 slug 修复**：表单加载回显处 `tagGroup?.slug === 'knowledge-point'` 改为 `'knowledge-points'`。

### 3.2 课程详情页 [src/pages/course/detail.vue](file:///e:/code/web/src/pages/course/detail.vue)

- **知识点 slug 修复**：同 3.1，改复数。
- **新增只读展示块**（course.featureFlags 与现有字段）：
  - 课程类型与报名：courseType、报名模式/时间（若已配置）
  - 顺序学习：enforceSequence / sequenceNumber / sequenceTag
  - 答题设置：allowRetakeQuiz / quizRetryCount
  - 渠道设置：channelScope / channelIds / pointChannel / allowCrossChannel
  - 积分设置：pointsPrice 等已有字段（如缺则补）
  - 播放功能设置：以「已开启」标签列出各开关与 seekMode / learnRoles / quiz 入口

### 3.3 不改动项

- 后端插件 zhao-course：零改动（已支持）。
- C 端播放器（shao）：零改动（已支持，仅缺配置入口）。

## 4. 风险与注意

- **存量课程**：保存一次后 featureFlags 变为对象，`configured=true`，seekMode 若未选默认 `played_only`（C 端已看可拖，不再 free 无限拖）。这是用户确认的「总是存对象」策略的预期行为。
- **learnRoles 空数组** = 不启用角色门控；填了角色则未授权用户不可见/不可学，详情页需提示。
- 角色列表接口需 `role.read` 权限，普通课程编辑者可能无权限拉取，需容错（拉取失败回退静态常量）。

## 5. 验收标准

1. 课程表单能配置播放倍速/VIP 特权/横竖屏/防误触/自动连播/画中画/进度锁定/角色白名单/答题入口，保存后重新进入回显正确。
2. C 端打开该课程，播放器按配置生效（倍速按钮出现与否、seekMode 行为、未授权角色访问被拦）。
3. 详情页展示课程类型/报名/顺序学习/答题/渠道/积分/播放功能设置。
4. 表单与详情页知识点正常显示。
