# 完整API文档

本文档详细描述了系统中所有插件的API接口，包括输入输出字段及其是否可选。

## 1. Channel Management System API

### 1.1 渠道管理接口

#### GET /api/v1/channels
获取渠道列表

**响应字段：**
- data (array): 渠道数据数组
  - id (integer): 渠道ID
  - attributes (object): 渠道属性
    - name (string): 渠道名称
    - code (string): 渠道代码
    - description (string, 可选): 渠道描述
    - channelTier (string, 可选): 渠道层级
    - status (boolean): 渠道状态
    - parentChannelId (object, 可选): 父渠道关系数据
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间

#### GET /api/v1/channels/:id
获取单个渠道信息

**路径参数：**
- id (integer, 必选): 渠道ID

**响应字段：**
- data (object): 渠道数据
  - id (integer): 渠道ID
  - attributes (object): 渠道属性
    - name (string): 渠道名称
    - code (string): 渠道代码
    - description (string, 可选): 渠道描述
    - channelTier (string, 可选): 渠道层级
    - status (boolean): 渠道状态
    - parentChannelId (object, 可选): 父渠道关系数据
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间

#### POST /api/v1/channels
创建渠道

**请求体字段：**
- name (string, 必选): 渠道名称
- description (string, 可选): 渠道描述
- channelTier (string, 可选): 渠道层级

**响应字段：**
- data (object): 创建的渠道数据
  - id (integer): 渠道ID
  - attributes (object): 渠道属性
    - name (string): 渠道名称
    - code (string): 渠道代码
    - description (string, 可选): 渠道描述
    - channelTier (string, 可选): 渠道层级
    - status (boolean): 渠道状态
    - parentChannelId (object, 可选): 父渠道关系数据
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间

#### PUT /api/v1/channels/:id
更新渠道

**路径参数：**
- id (integer, 必选): 渠道ID

**请求体字段：**
- name (string, 可选): 渠道名称
- description (string, 可选): 渠道描述
- channelTier (string, 可选): 渠道层级
- status (boolean, 可选): 渠道状态

**响应字段：**
- data (object): 更新的渠道数据
  - id (integer): 渠道ID
  - attributes (object): 渠道属性
    - name (string): 渠道名称
    - code (string): 渠道代码
    - description (string, 可选): 渠道描述
    - channelTier (string, 可选): 渠道层级
    - status (boolean): 渠道状态
    - parentChannelId (object, 可选): 父渠道关系数据
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间

#### DELETE /api/v1/channels/:id
删除渠道

**路径参数：**
- id (integer, 必选): 渠道ID

**响应字段：**
- data (object): 删除的渠道数据
  - id (integer): 渠道ID
  - attributes (object): 渠道属性
    - name (string): 渠道名称
    - code (string): 渠道代码
    - description (string, 可选): 渠道描述
    - channelTier (string, 可选): 渠道层级
    - status (boolean): 渠道状态
    - parentChannelId (object, 可选): 父渠道关系数据
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间

#### POST /api/v1/channels/root
创建根渠道

**请求体字段：**
- name (string, 必选): 渠道名称
- description (string, 可选): 渠道描述

**响应字段：**
- id (integer): 渠道ID
- name (string): 渠道名称
- code (string): 渠道代码
- description (string, 可选): 渠道描述
- channelTier (string): 渠道层级

#### POST /api/v1/channels/register
注册子渠道

**请求体字段：**
- code (string, 必选): 邀请码
- name (string, 必选): 渠道名称
- description (string, 可选): 渠道描述
- channelTier (string, 可选): 渠道层级

**响应字段：**
- id (integer): 渠道ID
- name (string): 渠道名称
- code (string): 渠道代码
- description (string, 可选): 渠道描述
- channelTier (string): 渠道层级
- parentChannelId (integer, 可选): 父渠道ID

#### GET /api/v1/channels/:id/network
获取渠道网络信息

**路径参数：**
- id (integer, 必选): 渠道ID

**响应字段：**
- channel (object): 渠道信息
  - id (integer): 渠道ID
  - name (string): 渠道名称
  - code (string): 渠道代码
  - description (string, 可选): 渠道描述
  - channelTier (string, 可选): 渠道层级
  - status (boolean): 渠道状态
  - parentChannelId (object, 可选): 父渠道关系数据
  - createdAt (string): 创建时间
  - updatedAt (string): 更新时间
- children (array): 子渠道列表

#### GET /api/v1/channels/validate/:code
验证邀请码

**路径参数：**
- code (string, 必选): 邀请码

**响应字段：**
- ok (boolean): 请求是否成功
- valid (boolean): 邀请码是否有效
- channel (object, 可选): 渠道信息
  - id (integer): 渠道ID
  - name (string): 渠道名称
  - code (string): 渠道代码
  - channelTier (string, 可选): 渠道层级

### 1.2 渠道成员管理接口

#### POST /api/v1/channels/verify-invitation-code
验证邀请码

**请求体字段：**
- code (string, 必选): 邀请码

**响应字段：**
- ok (boolean): 请求是否成功
- valid (boolean): 邀请码是否有效
- channel (object, 可选): 渠道信息
  - id (integer): 渠道ID
  - name (string): 渠道名称
  - code (string): 渠道代码
  - channelTier (string, 可选): 渠道层级

#### GET /api/v1/channels/my-channel
获取我的渠道

**响应字段：**
- channel (object): 渠道信息
  - id (integer): 渠道ID
  - name (string): 渠道名称
  - code (string): 渠道代码
  - description (string, 可选): 渠道描述
  - channelTier (string, 可选): 渠道层级
  - status (boolean): 渠道状态
  - parentChannelId (object, 可选): 父渠道关系数据
  - createdAt (string): 创建时间
  - updatedAt (string): 更新时间

#### PUT /api/v1/channels/my-channel
更新我的渠道

**请求体字段：**
- name (string, 可选): 渠道名称
- description (string, 可选): 渠道描述

**响应字段：**
- channel (object): 更新的渠道信息
  - id (integer): 渠道ID
  - name (string): 渠道名称
  - code (string): 渠道代码
  - description (string, 可选): 渠道描述
  - channelTier (string, 可选): 渠道层级
  - status (boolean): 渠道状态
  - parentChannelId (object, 可选): 父渠道关系数据
  - createdAt (string): 创建时间
  - updatedAt (string): 更新时间

#### POST /api/v1/channels/:id/invite-member
邀请成员加入渠道

**路径参数：**
- id (integer, 必选): 渠道ID

**请求体字段：**
- email (string, 必选): 邮箱地址
- role (string, 可选): 角色

**响应字段：**
- invitation (object): 邀请结果
  - channel (object): 渠道信息
  - user (object): 用户信息
  - isNewUser (boolean): 是否为新用户

#### GET /api/v1/channels/:id/members
获取渠道成员列表

**路径参数：**
- id (integer, 必选): 渠道ID

**响应字段：**
- members (array): 成员列表
  - id (integer): 用户ID
  - username (string): 用户名
  - email (string): 邮箱
  - role (integer): 角色ID
  - createdAt (string): 创建时间
  - updatedAt (string): 更新时间

#### DELETE /api/v1/channels/:id/remove-member/:userId
从渠道移除成员

**路径参数：**
- id (integer, 必选): 渠道ID
- userId (integer, 必选): 用户ID

**响应字段：**
- data (null): 无返回数据

#### POST /api/v1/channels/:id/update-member-role
更新成员角色

**路径参数：**
- id (integer, 必选): 渠道ID

**请求体字段：**
- userId (integer, 必选): 用户ID
- newRole (string, 必选): 新角色

**响应字段：**
- data (null): 无返回数据

### 1.3 渠道层级与统计接口

#### GET /api/v1/channels/:id/hierarchy
获取渠道层级结构

**路径参数：**
- id (integer, 必选): 渠道ID

**响应字段：**
- hierarchy (object): 层级结构
  - id (integer): 渠道ID
  - name (string): 渠道名称
  - code (string): 渠道代码
  - channelTier (string): 渠道层级
  - children (array): 子渠道数组

#### GET /api/v1/channels/:id/stats
获取渠道统计信息

**路径参数：**
- id (integer, 必选): 渠道ID

**响应字段：**
- stats (object): 统计信息
  - id (integer): 渠道ID
  - name (string): 渠道名称
  - memberCount (integer): 成员数量
  - subChannelCount (integer): 子渠道数量
  - totalSubMembers (integer): 子渠道总成员数
  - totalMembers (integer): 总成员数

#### GET /api/v1/channels/:id/distribution-stats
获取渠道分销统计信息

**路径参数：**
- id (integer, 必选): 渠道ID

**响应字段：**
- stats (object): 分销统计信息
  - id (integer): 渠道ID
  - name (string): 渠道名称
  - directSales (integer): 直销数量
  - subChannelSales (integer): 下级渠道销售数量
  - commissionEarned (integer): 已赚取佣金
  - pendingCommission (integer): 待结算佣金
  - performance (integer): 性能指标

#### GET /api/v1/channels/public/:id
获取公开渠道信息

**路径参数：**
- id (integer, 必选): 渠道ID

**响应字段：**
- id (integer): 渠道ID
- name (string): 渠道名称
- description (string, 可选): 渠道描述
- channelTier (string, 可选): 渠道层级
- createdAt (string): 创建时间

## 2. Quiz System 插件 API

### 2.1 题目管理接口

#### GET /api/quiz-questions
获取题目列表

**查询参数：**
- filters[questionText][$contains] (string, 可选): 按题目内容模糊查询
- filters[questionType][$eq] (string, 可选): 按题目类型精确查询 (single-choice, multiple-choice, true-false, fill-blank, essay)
- filters[difficultyLevel][$eq] (string, 可选): 按难度等级查询 (easy, medium, hard)
- filters[status][$eq] (string, 可选): 按状态查询 (active, draft)
- filters[categoryId][$eq] (integer, 可选): 按分类ID查询
- filters[lessonId][$eq] (integer, 可选): 按课时ID查询
- filters[knowledgePoints][id][$eq] (integer, 可选): 按知识点ID查询
- populate (string, 可选): 填充关联数据，如 'knowledgePoints,options'
- sort (string, 可选): 排序字段，如 'createdAt:desc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 题目数据数组
  - id (integer): 题目ID
  - attributes (object): 题目属性对象
    - questionText (string): 题目内容文本
    - questionType (string): 题目类型
    - difficultyLevel (string): 难度等级
    - explanation (string, 可选): 解释说明
    - score (integer): 分数
    - lessonId (integer, 可选): 所属课时ID
    - categoryId (integer, 可选): 所属分类ID
    - questionImage (string, 可选): 题目配图URL
    - answer (string): 正确答案
    - status (string): 状态
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间
    - publishedAt (string, 可选): 发布时间
    - options (array, 可选): 选项列表
    - tags (array, 可选): 题目标签数组
    - knowledgePoints (object, 可选): 关联知识点关系数据
- meta (object): 元数据
  - pagination (object): 分页信息
    - page (integer): 当前页码
    - pageSize (integer): 每页条数
    - pageCount (integer): 总页数
    - total (integer): 总条数

#### POST /api/quiz-questions
创建题目

**请求体字段：**
- data (object, 必选): 题目数据对象
  - questionText (string, 必选): 题目内容文本
  - questionType (string, 必选): 题目类型 (single-choice, multiple-choice, true-false, fill-blank, essay)
  - difficultyLevel (string, 可选): 难度等级 (easy, medium, hard)，默认为 'medium'
  - explanation (string, 可选): 解释说明
  - score (integer, 可选): 分数，默认为 1
  - lessonId (integer, 可选): 所属课时ID
  - categoryId (integer, 可选): 所属分类ID
  - questionImage (string, 可选): 题目配图URL
  - options (array, 可选): 选项列表 (适用于选择题)
  - answer (string, 必选): 正确答案
  - status (string, 可选): 状态 (active, draft)，默认为 'active'
  - tags (array, 可选): 题目标签数组
  - knowledgePoints (array, 可选): 关联知识点ID数组

**响应字段：**
- data (object): 创建的题目数据
  - id (integer): 题目ID
  - attributes (object): 题目属性对象（同GET响应）

#### PUT /api/quiz-questions/:id
更新题目

**路径参数：**
- id (integer, 必选): 题目ID

**请求体字段：**
- data (object, 必选): 题目数据对象（同POST请求体）

**响应字段：**
- data (object): 更新后的题目数据
  - id (integer): 题目ID
  - attributes (object): 题目属性对象（同GET响应）

#### DELETE /api/quiz-questions/:id
删除题目

**路径参数：**
- id (integer, 必选): 题目ID

**响应字段：**
- data (object): 删除的题目数据
  - id (integer): 题目ID
  - attributes (object): 题目属性对象（同GET响应）

### 2.2 知识点管理接口

#### GET /api/knowledge-points
获取知识点列表

**查询参数：**
- filters[name][$contains] (string, 可选): 按知识点名称模糊查询
- filters[subject][$eq] (string, 可选): 按所属学科查询
- filters[level][$eq] (integer, 可选): 按难度级别查询
- filters[status][$eq] (string, 可选): 按状态查询 (active, inactive)
- filters[channelId][$eq] (integer, 可选): 按渠道ID查询
- populate (string, 可选): 填充关联数据，如 'parent,children,questions'
- sort (string, 可选): 排序字段，如 'createdAt:desc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 知识点数据数组
  - id (integer): 知识点ID
  - attributes (object): 知识点属性
    - name (string): 知识点名称
    - description (string, 可选): 知识点描述
    - subject (string, 可选): 所属学科/主题
    - level (integer): 难度级别
    - weight (number): 权重
    - status (string): 状态
    - channelId (integer): 所属渠道ID
    - parent (object, 可选): 父知识点关系数据
    - children (array, 可选): 子知识点关系数据
    - questions (array, 可选): 关联题目关系数据
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间
- meta (object): 元数据
  - pagination (object): 分页信息

#### GET /api/knowledge-points/hierarchy
获取知识点层级结构

**查询参数：**
- rootId (integer, 可选): 根知识点ID，不传则获取所有根节点
- depth (integer, 可选): 查询深度，默认为无限深度

**响应字段：**
- data (array): 层级结构数据数组
  - id (integer): 知识点ID
  - attributes (object): 知识点基本属性
    - name (string): 知识点名称
    - description (string, 可选): 知识点描述
    - subject (string, 可选): 所属学科/主题
    - level (integer): 难度级别
    - weight (number): 权重
    - status (string): 状态
  - children (array): 子知识点数组（递归结构）

#### POST /api/knowledge-points
创建知识点

**请求体字段：**
- data (object, 必选): 知识点数据对象
  - name (string, 必选): 知识点名称
  - description (string, 可选): 知识点描述
  - parentId (integer, 可选): 父知识点ID（支持层级结构）
  - subject (string, 可选): 所属学科/主题
  - level (integer, 可选): 难度级别，默认为 1
  - weight (number, 可选): 权重（用于抽题概率），默认为 1.00
  - status (string, 可选): 状态 (active, inactive)，默认为 'active'
  - channelId (integer, 必选): 所属渠道ID

**响应字段：**
- data (object): 创建的知识点数据
  - id (integer): 知识点ID
  - attributes (object): 知识点属性（同GET响应）

#### PUT /api/knowledge-points/:id
更新知识点

**路径参数：**
- id (integer, 必选): 知识点ID

**请求体字段：**
- data (object, 必选): 知识点数据对象（同POST请求体）

**响应字段：**
- data (object): 更新后的知识点数据
  - id (integer): 知识点ID
  - attributes (object): 知识点属性（同GET响应）

#### DELETE /api/knowledge-points/:id
删除知识点

**路径参数：**
- id (integer, 必选): 知识点ID

**响应字段：**
- data (object): 删除的知识点数据
  - id (integer): 知识点ID
  - attributes (object): 知识点属性（同GET响应）

### 2.3 题目知识点关联接口

#### POST /api/question-knowledge-relations
创建题目知识点关联

**请求体字段：**
- data (object, 必选): 关联数据对象
  - question (integer, 必选): 题目ID
  - knowledgePoint (integer, 必选): 知识点ID
  - masteryLevel (integer, 可选): 掌握程度要求（1-5级），默认为 1
  - weight (number, 可选): 关联权重，默认为 1.00

**响应字段：**
- data (object): 创建的关联关系数据
  - id (integer): 关联关系ID
  - attributes (object): 关联关系属性
    - masteryLevel (integer): 掌握程度要求
    - weight (number): 关联权重
    - question (object): 题目关系数据
    - knowledgePoint (object): 知识点关系数据
    - createdAt (string): 创建时间

#### PUT /api/question-knowledge-relations/:id
更新题目知识点关联

**路径参数：**
- id (integer, 必选): 关联关系ID

**请求体字段：**
- data (object, 必选): 关联数据对象（同POST请求体）

**响应字段：**
- data (object): 更新后的关联关系数据
  - id (integer): 关联关系ID
  - attributes (object): 关联关系属性（同POST响应）

#### DELETE /api/question-knowledge-relations/:id
删除题目知识点关联

**路径参数：**
- id (integer, 必选): 关联关系ID

**响应字段：**
- data (object): 删除的关联关系数据
  - id (integer): 关联关系ID
  - attributes (object): 关联关系属性（同POST响应）

### 2.4 智能抽题接口

#### POST /api/quiz-questions/random
按条件随机抽取题目

**请求体字段：**
- count (integer, 可选): 抽取题目数量，默认为 5
- filters (object, 可选): 过滤条件
  - difficultyLevel (string, 可选): 难度等级
  - questionType (string, 可选): 题目类型
  - categoryId (integer, 可选): 分类ID
  - knowledgePointIds (array, 可选): 知识点ID数组

**响应字段：**
- questions (array): 随机抽取的题目数组
  - id (integer): 题目ID
  - attributes (object): 题目属性
    - questionText (string): 题目内容文本
    - questionType (string): 题目类型
    - difficultyLevel (string): 难度等级
    - explanation (string, 可选): 解释说明
    - score (integer): 分数
    - options (array, 可选): 选项列表
    - knowledgePoints (array, 可选): 关联知识点数据

#### POST /api/quiz-questions/random-by-knowledge
按知识点相关性抽取题目

**请求体字段：**
- knowledgePointIds (array, 必选): 知识点ID数组
- count (integer, 可选): 抽取题目数量，默认为 5
- includeUnrelated (boolean, 可选): 是否包含非关联知识点的题目，默认为 false
- strategy (string, 可选): 抽题策略 (by_knowledge=按知识点, mixed=混合策略)

**响应字段：**
- questions (array): 按知识点相关性抽取的题目数组
  - id (integer): 题目ID
  - attributes (object): 题目属性
    - questionText (string): 题目内容文本
    - questionType (string): 题目类型
    - difficultyLevel (string): 难度等级
    - explanation (string, 可选): 解释说明
    - score (integer): 分数
    - options (array, 可选): 选项列表
    - knowledgePoints (array, 可选): 关联知识点数据
- metadata (object): 抽题元数据
  - knowledgeCoverage (object): 知识点覆盖情况
  - difficultyDistribution (object): 难度分布情况

## 3. Points System 插件 API

### 3.1 积分类型管理接口

#### GET /api/point-types
获取积分类型列表

**查询参数：**
- filters[code][$eq] (string, 可选): 按积分类型代码查询
- filters[name][$contains] (string, 可选): 按积分类型名称模糊查询
- filters[enabled][$eq] (boolean, 可选): 按启用状态查询
- sort (string, 可选): 排序字段，如 'createdAt:desc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 积分类型数据数组
  - id (integer): 积分类型ID
  - attributes (object): 积分类型属性
    - code (string): 积分类型代码
    - name (string): 积分类型名称
    - description (string, 可选): 描述
    - enabled (boolean): 是否启用
    - canExpire (boolean): 是否可过期
    - expireDays (integer): 过期天数
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间
- meta (object): 元数据
  - pagination (object): 分页信息

#### POST /api/point-types
创建积分类型

**请求体字段：**
- data (object, 必选): 积分类型数据对象
  - code (string, 必选): 积分类型代码
  - name (string, 必选): 积分类型名称
  - description (string, 可选): 描述
  - enabled (boolean, 可选): 是否启用，默认为 true
  - canExpire (boolean, 可选): 是否可过期，默认为 true
  - expireDays (integer, 可选): 过期天数，默认为 365

**响应字段：**
- data (object): 创建的积分类型数据
  - id (integer): 积分类型ID
  - attributes (object): 积分类型属性（同GET响应）

#### PUT /api/point-types/:id
更新积分类型

**路径参数：**
- id (integer, 必选): 积分类型ID

**请求体字段：**
- data (object, 必选): 积分类型数据对象（同POST请求体）

**响应字段：**
- data (object): 更新后的积分类型数据
  - id (integer): 积分类型ID
  - attributes (object): 积分类型属性（同GET响应）

#### DELETE /api/point-types/:id
删除积分类型

**路径参数：**
- id (integer, 必选): 积分类型ID

**响应字段：**
- data (object): 删除的积分类型数据
  - id (integer): 积分类型ID
  - attributes (object): 积分类型属性（同GET响应）

### 3.2 积分规则管理接口

#### GET /api/point-rules
获取积分规则列表

**查询参数：**
- filters[typeCode][$eq] (string, 可选): 按积分类型代码查询
- filters[enabled][$eq] (boolean, 可选): 按启用状态查询
- filters[channelId][$eq] (integer, 可选): 按渠道ID查询
- sort (string, 可选): 排序字段，如 'createdAt:desc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 积分规则数据数组
  - id (integer): 积分规则ID
  - attributes (object): 积分规则属性
    - typeCode (string): 积分类型代码
    - points (integer): 积分数
    - enabled (boolean): 是否启用
    - conditions (object, 可选): 条件
    - limitations (object, 可选): 限制
    - channelId (integer, 可选): 渠道ID
    - validFrom (string, 可选): 有效开始时间
    - validTo (string, 可选): 有效结束时间
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间
- meta (object): 元数据
  - pagination (object): 分页信息

#### POST /api/point-rules
创建积分规则

**请求体字段：**
- data (object, 必选): 积分规则数据对象
  - typeCode (string, 必选): 积分类型代码
  - points (integer, 必选): 积分数
  - enabled (boolean, 可选): 是否启用，默认为 true
  - conditions (object, 可选): 条件
  - limitations (object, 可选): 限制
  - channelId (integer, 可选): 渠道ID
  - validFrom (string, 可选): 有效开始时间
  - validTo (string, 可选): 有效结束时间

**响应字段：**
- data (object): 创建的积分规则数据
  - id (integer): 积分规则ID
  - attributes (object): 积分规则属性（同GET响应）

### 3.3 积分记录管理接口

#### GET /api/points-records
获取积分记录列表

**查询参数：**
- filters[userId][$eq] (integer, 可选): 按用户ID查询
- filters[typeCode][$eq] (string, 可选): 按积分类型代码查询
- filters[channelId][$eq] (integer, 可选): 按渠道ID查询
- filters[createdAt][$gte] (string, 可选): 按创建时间范围查询（起始）
- filters[createdAt][$lte] (string, 可选): 按创建时间范围查询（结束）
- populate (string, 可选): 填充关联数据，如 'user,pointType'
- sort (string, 可选): 排序字段，如 'createdAt:desc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 积分记录数据数组
  - id (integer): 积分记录ID
  - attributes (object): 积分记录属性
    - userId (integer): 用户ID
    - typeCode (string): 积分类型代码
    - points (integer): 积分数
    - balanceAfter (integer): 变更后余额
    - sourceId (integer, 可选): 来源ID
    - sourceType (string, 可选): 来源类型
    - channelId (integer): 渠道ID
    - operatorId (integer, 可选): 操作员ID
    - remarks (string, 可选): 备注
    - expiredAt (string, 可选): 过期时间
    - createdAt (string): 创建时间
    - user (object, 可选): 用户关系数据
    - pointType (object, 可选): 积分类型关系数据
- meta (object): 元数据
  - pagination (object): 分页信息

#### POST /api/points-records
创建积分记录

**请求体字段：**
- data (object, 必选): 积分记录数据对象
  - userId (integer, 必选): 用户ID
  - typeCode (string, 必选): 积分类型代码
  - points (integer, 必选): 积分数
  - balanceAfter (integer, 必选): 变更后余额
  - sourceId (integer, 可选): 来源ID
  - sourceType (string, 可选): 来源类型
  - channelId (integer, 必选): 渠道ID
  - operatorId (integer, 可选): 操作员ID
  - remarks (string, 可选): 备注
  - expiredAt (string, 可选): 过期时间

**响应字段：**
- data (object): 创建的积分记录数据
  - id (integer): 积分记录ID
  - attributes (object): 积分记录属性（同GET响应）

### 3.4 积分消费规则管理接口

#### GET /api/consumption-rules
获取积分消费规则列表

**查询参数：**
- filters[productId][$eq] (integer, 可选): 按产品ID查询
- sort (string, 可选): 排序字段，如 'createdAt:desc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 积分消费规则数据数组
  - id (integer): 消费规则ID
  - attributes (object): 消费规则属性
    - productId (integer, 可选): 产品ID
    - minPointsBalance (integer): 最低积分余额
    - allowedPointTypes (array, 可选): 允许的积分类型
    - channelRestrictions (object, 可选): 渠道限制
    - userLevelRestrictions (object, 可选): 用户等级限制
    - timeRestrictions (object, 可选): 时间限制
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间
- meta (object): 元数据
  - pagination (object): 分页信息

#### POST /api/consumption-rules
创建积分消费规则

**请求体字段：**
- data (object, 必选): 消费规则数据对象
  - productId (integer, 可选): 产品ID
  - minPointsBalance (integer, 必选): 最低积分余额
  - allowedPointTypes (array, 可选): 允许的积分类型
  - channelRestrictions (object, 可选): 渠道限制
  - userLevelRestrictions (object, 可选): 用户等级限制
  - timeRestrictions (object, 可选): 时间限制

**响应字段：**
- data (object): 创建的消费规则数据
  - id (integer): 消费规则ID
  - attributes (object): 消费规则属性（同GET响应）

## 4. Feature Flags 插件 API

### 4.1 功能开关管理接口

#### GET /api/feature-flags
获取功能开关列表

**查询参数：**
- filters[flagKey][$eq] (string, 可选): 按功能键查询
- filters[channelId][$eq] (integer, 可选): 按渠道ID查询
- sort (string, 可选): 排序字段，如 'priority:asc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 功能开关数据数组
  - id (integer): 功能开关ID
  - attributes (object): 功能开关属性
    - flagKey (string): 功能键
    - flagValue (boolean): 功能值
    - description (string, 可选): 描述
    - channelId (integer, 可选): 渠道ID
    - conditions (object, 可选): 条件
    - priority (integer): 优先级
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间
- meta (object): 元数据
  - pagination (object): 分页信息

#### POST /api/feature-flags
创建功能开关

**请求体字段：**
- data (object, 必选): 功能开关数据对象
  - flagKey (string, 必选): 功能键
  - flagValue (boolean, 可选): 功能值，默认为 true
  - description (string, 可选): 描述
  - channelId (integer, 可选): 渠道ID
  - conditions (object, 可选): 条件
  - priority (integer, 可选): 优先级，默认为 10

**响应字段：**
- data (object): 创建的功能开关数据
  - id (integer): 功能开关ID
  - attributes (object): 功能开关属性（同GET响应）

#### PUT /api/feature-flags/:key
更新功能开关

**路径参数：**
- key (string, 必选): 功能键

**请求体字段：**
- data (object, 必选): 功能开关数据对象（同POST请求体）

**响应字段：**
- data (object): 更新后的功能开关数据
  - id (integer): 功能开关ID
  - attributes (object): 功能开关属性（同GET响应）

#### GET /api/feature-flags/:key
获取特定功能开关状态

**路径参数：**
- key (string, 必选): 功能键

**响应字段：**
- data (object): 功能开关数据
  - id (integer): 功能开关ID
  - attributes (object): 功能开关属性（同GET响应）

## 5. Media Extended 插件 API

### 5.1 媒体资源管理接口

#### GET /api/media-extended
获取媒体资源列表

**查询参数：**
- filters[filename][$contains] (string, 可选): 按文件名模糊查询
- filters[mimeType][$eq] (string, 可选): 按MIME类型查询
- filters[provider][$eq] (string, 可选): 按提供商查询
- filters[channelId][$eq] (integer, 可选): 按渠道ID查询
- sort (string, 可选): 排序字段，如 'createdAt:desc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 媒体资源数据数组
  - id (integer): 媒体资源ID
  - attributes (object): 媒体资源属性
    - filename (string): 文件名
    - originalName (string): 原始文件名
    - mimeType (string): MIME类型
    - size (integer): 文件大小
    - url (string): URL地址
    - provider (string): 提供商
    - providerId (string, 可选): 提供商ID
    - altText (string, 可选): 替代文本
    - caption (string, 可选): 标题
    - description (string, 可选): 描述
    - tags (array, 可选): 标签
    - userId (integer, 可选): 用户ID
    - channelId (integer): 渠道ID
    - status (string): 状态
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间
- meta (object): 元数据
  - pagination (object): 分页信息

#### POST /api/media-extended/upload
上传媒体文件

**请求体字段：**
- files (file, 必选): 媒体文件
- data (object, 可选): 附加数据
  - altText (string, 可选): 替代文本
  - caption (string, 可选): 标题
  - description (string, 可选): 描述
  - tags (array, 可选): 标签
  - channelId (integer, 必选): 渠道ID

**响应字段：**
- data (object): 上传的媒体资源数据
  - id (integer): 媒体资源ID
  - attributes (object): 媒体资源属性（同GET响应）

#### DELETE /api/media-extended/:id
删除媒体资源

**路径参数：**
- id (integer, 必选): 媒体资源ID

**响应字段：**
- data (object): 删除的媒体资源数据
  - id (integer): 媒体资源ID
  - attributes (object): 媒体资源属性（同GET响应）

## 6. Soft Delete 插件 API

### 6.1 软删除管理接口

#### POST /api/soft-delete/:contentType/:id
软删除指定内容类型的数据

**路径参数：**
- contentType (string, 必选): 内容类型
- id (integer, 必选): 数据ID

**响应字段：**
- data (object): 软删除的数据
  - id (integer): 数据ID
  - attributes (object): 数据属性（包含deletedAt字段）

#### POST /api/soft-delete/:contentType/:id/restore
恢复软删除的数据

**路径参数：**
- contentType (string, 必选): 内容类型
- id (integer, 必选): 数据ID

**响应字段：**
- data (object): 恢复的数据
  - id (integer): 数据ID
  - attributes (object): 数据属性（deletedAt字段为空）

## 7. Channel Manager 插件 API

### 7.1 渠道管理接口

#### GET /api/channels
获取渠道列表

**查询参数：**
- filters[name][$contains] (string, 可选): 按渠道名称模糊查询
- filters[parent][$eq] (integer, 可选): 按父渠道ID查询
- populate (string, 可选): 填充关联数据，如 'parent,children'
- sort (string, 可选): 排序字段，如 'createdAt:desc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 渠道数据数组
  - id (integer): 渠道ID
  - attributes (object): 渠道属性
    - name (string): 渠道名称
    - description (string, 可选): 渠道描述
    - level (integer): 渠道层级
    - status (string): 渠道状态
    - parent (object, 可选): 父渠道关系数据
    - children (array, 可选): 子渠道关系数据
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间
- meta (object): 元数据
  - pagination (object): 分页信息

#### POST /api/channels
创建渠道

**请求体字段：**
- data (object, 必选): 渠道数据对象
  - name (string, 必选): 渠道名称
  - description (string, 可选): 渠道描述
  - level (integer, 可选): 渠道层级
  - status (string, 可选): 渠道状态，默认为 'active'
  - parent (integer, 可选): 父渠道ID

**响应字段：**
- data (object): 创建的渠道数据
  - id (integer): 渠道ID
  - attributes (object): 渠道属性（同GET响应）

## 8. Distribution 插件 API

### 8.1 邀请管理接口

#### GET /api/invites
获取邀请列表

**查询参数：**
- filters[email][$eq] (string, 可选): 按邮箱查询
- filters[status][$eq] (string, 可选): 按状态查询
- filters[inviterId][$eq] (integer, 可选): 按邀请人ID查询
- populate (string, 可选): 填充关联数据，如 'inviter,invitee'
- sort (string, 可选): 排序字段，如 'createdAt:desc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 邀请数据数组
  - id (integer): 邀请ID
  - attributes (object): 邀请属性
    - email (string): 邮箱
    - status (string): 状态
    - inviterId (integer): 邀请人ID
    - inviteeId (integer, 可选): 被邀请人ID
    - acceptedAt (string, 可选): 接受时间
    - expiresAt (string, 可选): 过期时间
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间
    - inviter (object, 可选): 邀请人关系数据
    - invitee (object, 可选): 被邀请人关系数据
- meta (object): 元数据
  - pagination (object): 分页信息

#### POST /api/invites
创建邀请

**请求体字段：**
- data (object, 必选): 邀请数据对象
  - email (string, 必选): 邮箱
  - inviterId (integer, 必选): 邀请人ID
  - expiresAt (string, 可选): 过期时间

**响应字段：**
- data (object): 创建的邀请数据
  - id (integer): 邀请ID
  - attributes (object): 邀请属性（同GET响应）

## 9. Verification System 插件 API

### 9.1 验证记录管理接口

#### GET /api/verification-records
获取验证记录列表

**查询参数：**
- filters[userId][$eq] (integer, 可选): 按用户ID查询
- filters[verificationType][$eq] (string, 可选): 按验证类型查询
- filters[status][$eq] (string, 可选): 按状态查询
- sort (string, 可选): 排序字段，如 'createdAt:desc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 验证记录数据数组
  - id (integer): 验证记录ID
  - attributes (object): 验证记录属性
    - userId (integer): 用户ID
    - verificationType (string): 验证类型
    - verificationCode (string): 验证码
    - status (string): 状态
    - verifiedAt (string, 可选): 验证时间
    - expiresAt (string, 可选): 过期时间
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间
- meta (object): 元数据
  - pagination (object): 分页信息

#### POST /api/verification-records
创建验证记录

**请求体字段：**
- data (object, 必选): 验证记录数据对象
  - userId (integer, 必选): 用户ID
  - verificationType (string, 必选): 验证类型
  - verificationCode (string, 必选): 验证码
  - status (string, 可选): 状态，默认为 'pending'
  - expiresAt (string, 可选): 过期时间

**响应字段：**
- data (object): 创建的验证记录数据
  - id (integer): 验证记录ID
  - attributes (object): 验证记录属性（同GET响应）

## 10. Content Manager 插件 API

### 10.1 课程管理接口

#### GET /api/courses
获取课程列表

**查询参数：**
- filters[title][$contains] (string, 可选): 按课程标题模糊查询
- filters[status][$eq] (string, 可选): 按状态查询 (draft, published, archived)
- filters[categoryId][$eq] (integer, 可选): 按分类ID查询
- filters[difficulty][$eq] (string, 可选): 按难度等级查询 (beginner, intermediate, advanced)
- filters[channelId][$eq] (integer, 可选): 按渠道ID查询
- populate (string, 可选): 填充关联数据，如 'category,lessons,knowledgePoints'
- sort (string, 可选): 排序字段，如 'createdAt:desc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 课程数据数组
  - id (integer): 课程ID
  - attributes (object): 课程属性
    - title (string): 课程标题
    - description (string, 可选): 课程描述
    - coverImage (string, 可选): 封面图片URL
    - duration (integer, 可选): 课程时长（分钟）
    - difficulty (string, 可选): 难度等级
    - status (string): 状态
    - creatorId (integer, 可选): 创建者ID
    - channelId (integer): 所属渠道ID
    - sortOrder (integer): 排序
    - pointsReward (integer): 完成课程奖励总积分
    - enableLessonPoints (boolean): 是否启用课时积分
    - lessonPointsStrategy (string): 课时积分策略
    - tags (array, 可选): 课程标签数组
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间
    - category (object, 可选): 分类关系数据
    - lessons (array, 可选): 课时关系数据
    - knowledgePoints (array, 可选): 关联知识点关系数据
- meta (object): 元数据
  - pagination (object): 分页信息
    - page (integer): 当前页码
    - pageSize (integer): 每页条数
    - pageCount (integer): 总页数
    - total (integer): 总条数

#### POST /api/courses
创建课程

**请求体字段：**
- data (object, 必选): 课程数据对象
  - title (string, 必选): 课程标题
  - description (string, 可选): 课程描述
  - coverImage (string, 可选): 封面图片URL
  - categoryId (integer, 可选): 分类ID
  - duration (integer, 可选): 课程时长（分钟）
  - difficulty (string, 可选): 难度等级 (beginner, intermediate, advanced)
  - status (string, 可选): 状态，默认为 'draft'
  - creatorId (integer, 可选): 创建者ID
  - channelId (integer, 必选): 所属渠道ID
  - sortOrder (integer, 可选): 排序，默认为 0
  - pointsReward (integer, 可选): 完成课程奖励总积分，默认为 0
  - enableLessonPoints (boolean, 可选): 是否启用课时积分，默认为 true
  - lessonPointsStrategy (string, 可选): 课时积分策略，默认为 'by_lesson'
  - tags (array, 可选): 课程标签数组

**响应字段：**
- data (object): 创建的课程数据
  - id (integer): 课程ID
  - attributes (object): 课程属性（同GET响应）

#### PUT /api/courses/:id
更新课程

**路径参数：**
- id (integer, 必选): 课程ID

**请求体字段：**
- data (object, 必选): 课程数据对象（同POST请求体）

**响应字段：**
- data (object): 更新后的课程数据
  - id (integer): 课程ID
  - attributes (object): 课程属性（同GET响应）

#### DELETE /api/courses/:id
删除课程

**路径参数：**
- id (integer, 必选): 课程ID

**响应字段：**
- data (object): 删除的课程数据
  - id (integer): 课程ID
  - attributes (object): 课程属性（同GET响应）

### 10.2 课时管理接口

#### GET /api/lessons
获取课时列表

**查询参数：**
- filters[title][$contains] (string, 可选): 按课时标题模糊查询
- filters[status][$eq] (string, 可选): 按状态查询 (draft, published, archived)
- filters[courseId][$eq] (integer, 可选): 按课程ID查询
- filters[contentType][$eq] (string, 可选): 按内容类型查询 (video, text, quiz等)
- filters[channelId][$eq] (integer, 可选): 按渠道ID查询
- populate (string, 可选): 填充关联数据，如 'course,quiz,questions'
- sort (string, 可选): 排序字段，如 'sortOrder:asc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 课时数据数组
  - id (integer): 课时ID
  - attributes (object): 课时属性
    - courseId (integer): 所属课程ID
    - title (string): 课时标题
    - description (string, 可选): 课时描述
    - contentType (string, 可选): 内容类型
    - contentUrl (string, 可选): 内容链接
    - videoDuration (integer, 可选): 视频时长（秒）
    - sortOrder (integer): 排序
    - status (string): 状态
    - creatorId (integer, 可选): 创建者ID
    - channelId (integer): 所属渠道ID
    - pointsReward (integer): 完成课时奖励积分
    - requiresQuiz (boolean): 是否需要测验
    - quizId (integer, 可选): 关联测验ID
    - quizPointsStrategy (string): 答题积分策略
    - listenCondition (object, 可选): 听课限制条件
    - quizCondition (object, 可选): 答题限制条件
    - tags (array, 可选): 课时标签数组
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间
    - course (object, 可选): 课程关系数据
    - quiz (object, 可选): 测验关系数据
    - questions (array, 可选): 题目关系数据
- meta (object): 元数据
  - pagination (object): 分页信息

#### POST /api/lessons
创建课时

**请求体字段：**
- data (object, 必选): 课时数据对象
  - courseId (integer, 必选): 所属课程ID
  - title (string, 必选): 课时标题
  - description (string, 可选): 课时描述
  - contentType (string, 可选): 内容类型 (video, text, quiz等)
  - contentUrl (string, 可选): 内容链接
  - videoDuration (integer, 可选): 视频时长（秒）
  - sortOrder (integer, 可选): 排序，默认为 0
  - status (string, 可选): 状态，默认为 'draft'
  - creatorId (integer, 可选): 创建者ID
  - channelId (integer, 必选): 所属渠道ID
  - pointsReward (integer, 可选): 完成课时奖励积分，默认为 0
  - requiresQuiz (boolean, 可选): 是否需要测验，默认为 false
  - quizId (integer, 可选): 关联测验ID
  - quizPointsStrategy (string, 可选): 答题积分策略，默认为 'by_correct'
  - listenCondition (object, 可选): 听课限制条件
  - quizCondition (object, 可选): 答题限制条件
  - tags (array, 可选): 课时标签数组

**响应字段：**
- data (object): 创建的课时数据
  - id (integer): 课时ID
  - attributes (object): 课时属性（同GET响应）

#### PUT /api/lessons/:id
更新课时

**路径参数：**
- id (integer, 必选): 课时ID

**请求体字段：**
- data (object, 必选): 课时数据对象（同POST请求体）

**响应字段：**
- data (object): 更新后的课时数据
  - id (integer): 课时ID
  - attributes (object): 课时属性（同GET响应）

#### DELETE /api/lessons/:id
删除课时

**路径参数：**
- id (integer, 必选): 课时ID

**响应字段：**
- data (object): 删除的课时数据
  - id (integer): 课时ID
  - attributes (object): 课时属性（同GET响应）

### 10.3 学习路径管理接口

#### GET /api/learning-paths
获取学习路径列表

**查询参数：**
- filters[title][$contains] (string, 可选): 按学习路径标题模糊查询
- filters[status][$eq] (string, 可选): 按状态查询 (draft, published, archived)
- filters[difficulty][$eq] (string, 可选): 按难度等级查询
- filters[channelId][$eq] (integer, 可选): 按渠道ID查询
- populate (string, 可选): 填充关联数据，如 'courses,prerequisites'
- sort (string, 可选): 排序字段，如 'createdAt:desc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 学习路径数据数组
  - id (integer): 学习路径ID
  - attributes (object): 学习路径属性
    - title (string): 学习路径标题
    - description (string, 可选): 学习路径描述
    - difficulty (string, 可选): 难度等级
    - status (string): 状态
    - estimatedDuration (integer, 可选): 预估完成时长（小时）
    - prerequisiteIds (array, 可选): 前置学习路径ID数组
    - courseIds (array, 可选): 包含课程ID数组
    - channelId (integer): 所属渠道ID
    - sortOrder (integer): 排序
    - tags (array, 可选): 学习路径标签数组
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间
    - courses (array, 可选): 课程关系数据
    - prerequisites (array, 可选): 前置学习路径关系数据
- meta (object): 元数据
  - pagination (object): 分页信息

#### POST /api/learning-paths
创建学习路径

**请求体字段：**
- data (object, 必选): 学习路径数据对象
  - title (string, 必选): 学习路径标题
  - description (string, 可选): 学习路径描述
  - difficulty (string, 可选): 难度等级 (beginner, intermediate, advanced)
  - status (string, 可选): 状态，默认为 'draft'
  - estimatedDuration (integer, 可选): 预估完成时长（小时）
  - prerequisiteIds (array, 可选): 前置学习路径ID数组
  - courseIds (array, 可选): 包含课程ID数组
  - channelId (integer, 必选): 所属渠道ID
  - sortOrder (integer, 可选): 排序，默认为 0
  - tags (array, 可选): 学习路径标签数组

**响应字段：**
- data (object): 创建的学习路径数据
  - id (integer): 学习路径ID
  - attributes (object): 学习路径属性（同GET响应）

### 10.4 课程进度管理接口

#### GET /api/course-progresses
获取课程进度列表

**查询参数：**
- filters[userId][$eq] (integer, 可选): 按用户ID查询
- filters[courseId][$eq] (integer, 可选): 按课程ID查询
- filters[status][$eq] (string, 可选): 按状态查询 (not_started, in_progress, completed)
- filters[channelId][$eq] (integer, 可选): 按渠道ID查询
- populate (string, 可选): 填充关联数据，如 'user,course'
- sort (string, 可选): 排序字段，如 'updatedAt:desc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 课程进度数据数组
  - id (integer): 课程进度ID
  - attributes (object): 课程进度属性
    - userId (integer): 用户ID
    - courseId (integer): 课程ID
    - status (string): 状态
    - progressPercentage (number): 进度百分比
    - currentLessonId (integer, 可选): 当前课时ID
    - startedAt (string, 可选): 开始时间
    - completedAt (string, 可选): 完成时间
    - channelId (integer): 所属渠道ID
    - lastAccessedAt (string, 可选): 最后访问时间
    - totalLessonsCompleted (integer): 已完成课时数
    - totalLessonsCount (integer): 总课时数
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间
    - user (object, 可选): 用户关系数据
    - course (object, 可选): 课程关系数据
- meta (object): 元数据
  - pagination (object): 分页信息

#### POST /api/course-progresses
创建或更新课程进度

**请求体字段：**
- data (object, 必选): 课程进度数据对象
  - userId (integer, 必选): 用户ID
  - courseId (integer, 必选): 课程ID
  - status (string, 必选): 状态 (not_started, in_progress, completed)
  - progressPercentage (number, 必选): 进度百分比
  - currentLessonId (integer, 可选): 当前课时ID
  - channelId (integer, 必选): 所属渠道ID
  - totalLessonsCompleted (integer, 可选): 已完成课时数
  - totalLessonsCount (integer, 可选): 总课时数

**响应字段：**
- data (object): 创建或更新的课程进度数据
  - id (integer): 课程进度ID
  - attributes (object): 课程进度属性（同GET响应）

### 10.5 课时完成记录接口

#### GET /api/lesson-completions
获取课时完成记录列表

**查询参数：**
- filters[userId][$eq] (integer, 可选): 按用户ID查询
- filters[lessonId][$eq] (integer, 可选): 按课时ID查询
- filters[courseId][$eq] (integer, 可选): 按课程ID查询
- filters[channelId][$eq] (integer, 可选): 按渠道ID查询
- populate (string, 可选): 填充关联数据，如 'user,lesson,course'
- sort (string, 可选): 排序字段，如 'completedAt:desc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 课时完成记录数据数组
  - id (integer): 课时完成记录ID
  - attributes (object): 课时完成记录属性
    - userId (integer): 用户ID
    - lessonId (integer): 课时ID
    - courseId (integer): 课程ID
    - status (string): 状态 (completed, passed, failed)
    - completedAt (string, 可选): 完成时间
    - score (number, 可选): 得分
    - maxScore (number, 可选): 最高分
    - percentage (number, 可选): 百分比
    - channelId (integer): 所属渠道ID
    - timeSpent (integer, 可选): 学习时长（秒）
    - notes (string, 可选): 笔记
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间
    - user (object, 可选): 用户关系数据
    - lesson (object, 可选): 课时关系数据
    - course (object, 可选): 课程关系数据
- meta (object): 元数据
  - pagination (object): 分页信息

#### POST /api/lesson-completions
创建课时完成记录

**请求体字段：**
- data (object, 必选): 课时完成记录数据对象
  - userId (integer, 必选): 用户ID
  - lessonId (integer, 必选): 课时ID
  - courseId (integer, 必选): 课程ID
  - status (string, 必选): 状态 (completed, passed, failed)
  - completedAt (string, 可选): 完成时间
  - score (number, 可选): 得分
  - maxScore (number, 可选): 最高分
  - percentage (number, 可选): 百分比
  - channelId (integer, 必选): 所属渠道ID
  - timeSpent (integer, 可选): 学习时长（秒）
  - notes (string, 可选): 笔记

**响应字段：**
- data (object): 创建的课时完成记录数据
  - id (integer): 课时完成记录ID
  - attributes (object): 课时完成记录属性（同GET响应）

## 11. Redemption System 插件 API

#### GET /api/redemption-codes
获取兑换码列表

**查询参数：**
- filters[code][$eq] (string, 可选): 按兑换码查询
- filters[status][$eq] (string, 可选): 按状态查询
- filters[productId][$eq] (integer, 可选): 按产品ID查询
- sort (string, 可选): 排序字段，如 'createdAt:desc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 兑换码数据数组
  - id (integer): 兑换码ID
  - attributes (object): 兑换码属性
    - code (string): 兑换码
    - productId (integer): 产品ID
    - status (string): 状态
    - usedBy (integer, 可选): 使用者ID
    - usedAt (string, 可选): 使用时间
    - expiresAt (string, 可选): 过期时间
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间
- meta (object): 元数据
  - pagination (object): 分页信息

#### POST /api/redemption-codes
创建兑换码

**请求体字段：**
- data (object, 必选): 兑换码数据对象
  - code (string, 必选): 兑换码
  - productId (integer, 必选): 产品ID
  - status (string, 可选): 状态，默认为 'available'
  - expiresAt (string, 可选): 过期时间

**响应字段：**
- data (object): 创建的兑换码数据
  - id (integer): 兑换码ID
  - attributes (object): 兑换码属性（同GET响应）

### 10.2 兑换记录管理接口

#### GET /api/redemption-records
获取兑换记录列表

**查询参数：**
- filters[userId][$eq] (integer, 可选): 按用户ID查询
- filters[redemptionCodeId][$eq] (integer, 可选): 按兑换码ID查询
- filters[status][$eq] (string, 可选): 按状态查询
- sort (string, 可选): 排序字段，如 'createdAt:desc'
- pagination[page] (integer, 可选): 页码，默认为1
- pagination[pageSize] (integer, 可选): 每页条数，默认为25

**响应字段：**
- data (array): 兑换记录数据数组
  - id (integer): 兑换记录ID
  - attributes (object): 兑换记录属性
    - userId (integer): 用户ID
    - redemptionCodeId (integer): 兑换码ID
    - status (string): 状态
    - redeemedAt (string): 兑换时间
    - createdAt (string): 创建时间
    - updatedAt (string): 更新时间
- meta (object): 元数据
  - pagination (object): 分页信息

#### POST /api/redemption-records
创建兑换记录

**请求体字段：**
- data (object, 必选): 兑换记录数据对象
  - userId (integer, 必选): 用户ID
  - redemptionCodeId (integer, 必选): 兑换码ID
  - status (string, 可选): 状态，默认为 'completed'

**响应字段：**
- data (object): 创建的兑换记录数据
  - id (integer): 兑换记录ID
  - attributes (object): 兑换记录属性（同GET响应）