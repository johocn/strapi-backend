# 1. 概述

> 返回 [首页](index.md)

### 1.1 适用对象

本手册面向**课程内容运营人员**、**题库管理员**、**积分规则配置员**，需要以下权限：

- `menu.course-center`：课程中心
- `menu.course` / `menu.lesson` / `menu.category` / `menu.auth`：课程、课时、分类、授权
- `menu.quiz-center` / `menu.quiz` / `menu.exam` / `menu.quiz-record`：题库、考试、答题记录
- `menu.point-center` / `menu.point-rule` / `menu.point-config`：积分规则与全局配置
- `menu.progress` / `menu.lesson-progress`：学习数据

### 1.2 核心工作流

```
分类/标签 → 新建课程 → 新建课时（关联视频）→ 新建题目（关联课时）→ 配置积分规则 → 学员学习答题 → 查看学习数据/答题记录
```

### 1.3 入口位置

登录后台 → 仪表盘，相关功能分布在以下区块：

- **📚 课程中心**：课程管理、课时管理、分类、标签、用户授权
- **📝 题库系统**：题库管理、考试管理、答题记录
- **💎 积分体系**：积分规则、积分配置、积分类型、积分记录、积分统计
- **📈 学习数据**：课程学习进度、课时学习进度