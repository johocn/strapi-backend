# zhao-course 积分体系完善开发计划

## 积分体系模型

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

## 执行步骤

### Step 1：清理 content-api.ts 重复路由
- 删除无权限检查的重复路由，仅保留带 has-course-permission 的版本
- 文件：server/src/routes/content-api.ts

### Step 2：Schema 新增字段（向后兼容）
- lesson-progress 新增 quizPointsDetail(json), calculatedPoints(integer)
- course-progress 新增 lessonPointsSummary(json)
- 文件：server/src/content-types/lesson-progress/schema.json, course-progress/schema.json

### Step 3：新建积分计算工具
- 新建 server/src/utils/points-calculator.ts
- 三个纯函数：calculateLessonPoints, sumQuizPoints, calculateCoursePoints

### Step 4：修复 lesson-progress service
- 修复 submitAnswer 参数传递（progressRecordId 而非 lessonDocumentId）
- 重写 claimPoints（区分 lesson_points / quiz_points 计算模式）
- 对接 zhao-point.earnPoints
- 文件：server/src/services/lesson-progress.ts

### Step 5：修复 course-progress service
- 修复 claimPoints 参数传递
- 支持 course_points 和 lesson_points 两种模式
- lesson_points 模式下汇总已领取的课时积分
- 对接 zhao-point.earnPoints
- 文件：server/src/services/course-progress.ts

### Step 6：修复 Controller 层参数传递
- 确认 controller 传参语义与 service 对齐
- 文件：server/src/controllers/lesson-progress.ts, course-progress.ts

### Step 7：注册 i18n 新增错误码
- LESSON_007: "无可领取课时积分"
- COURSE_008: "无可领取课程积分"
- 文件：server/src/register.ts

### Step 8：公开课程接口过滤未发布课程
- content-api 的 find 方法仅返回 status=published 的课程
- 文件：server/src/services/course.ts, server/src/controllers/course.ts

### Step 9：完善 reportProgress 防刷
- 进度只能前进不能后退
- 服务端校验进度值
- 文件：server/src/services/lesson-progress.ts

### Step 10：清理 permissions.ts 无用定义
- 删除 comment.read/create/update/delete（无对应实现）
- 文件：server/src/permissions.ts

## 依赖关系

```
Step 1 (路由去重)          ← 独立
Step 2 (Schema 新增字段)   ← 独立
Step 3 (积分计算工具)       ← 依赖 Step 2
Step 4 (lesson-progress)   ← 依赖 Step 2 + Step 3
Step 5 (course-progress)   ← 依赖 Step 2 + Step 3
Step 6 (Controller 对齐)   ← 依赖 Step 4 + Step 5
Step 7 (i18n 新增)         ← 依赖 Step 4 + Step 5
Step 8 (公开课程过滤)       ← 独立
Step 9 (防刷)              ← 依赖 Step 4
Step 10 (清理 permissions) ← 独立
```

## 每步检查清单

| 检查项 | 命令/方法 |
|--------|-----------|
| TypeScript 编译 | npm run build |
| 无重复路由 | 启动 Strapi 检查日志无路由冲突警告 |
| 数据库字段 | 检查表结构含新增列 |
| 积分计算正确性 | 手动测试三种模式 |
| zhao-point 对接 | 检查积分记录表有新记录 |
| 向后兼容 | 旧数据新字段有默认值，不报错 |
