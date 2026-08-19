# 课程表单播放功能配置区 + 详情页完善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在管理后台课程表单新增「播放功能设置」配置区（倍速/VIP特权/横竖屏/防误触/自动连播/画中画/进度锁定/学习角色白名单/答题入口），并完善课程详情页展示，修复知识点 slug。

**Architecture:** 仅改动两个前端 vue 文件（`src/pages/course/form.vue` 与 `src/pages/course/detail.vue`）。`featureFlags` 为 Strapi course 的 JSON 字段，后端 create/update 已全量透传，无需改后端。表单保存时显式构造 featureFlags 对象（含 quiz 子对象），回显时按 C 端 `parseCourseFeatureFlags` 同名逻辑映射。

**Tech Stack:** uni-app Vue3 `<script setup>`、Strapi 自定义路由、`reactive`/`ref`/`computed`、内置 `<switch>`/`<picker>` 组件。

---

### Task 1: 表单新增「播放功能设置」区块

**Files:**
- Modify: `e:\code\web\src\pages\course\form.vue`

**结构说明：** 在「答题设置」区块（第 327 行 `</view>` 之后、「渠道设置」区块前）插入播放功能配置区。学习角色与考试角色用弹层多选，复用现有 .modal 样式行内实现。

- [ ] **Step 1: 在 `form` reactive 对象中新增 featureFlags 字段**

在 `e:\code\web\src\pages\course\form.vue` 第 624 行 `quizRetryCount: 'no_retry'` 后、第 625 行 `})` 前加入：

```js
  // 播放功能设置
  featureFlags: {
    configured: true,
    playbackSpeed: false,
    vipSpeedOverride: false,
    allowLandscape: false,
    screenLock: false,
    autoNext: false,
    pictureInPicture: false,
    seekMode: 'played_only',
    learnRoles: [],
    quiz: {
      practice: false,
      lessonQuiz: false,
      exam: false,
      freeAnswer: false,
      random: false,
      examRoles: []
    }
  }
```

- [ ] **Step 2: 新增支撑变量（角色列表、弹层开关、选项常量）**

在 `e:\code\web\src\pages\course\form.vue` 第 646 行 `const quizRetryCountIndex = ref(0)` 后加入：

```js
// 播放功能 - 学习/考试角色白名单
const roleOptions = ref([])
const showLearnRolesPicker = ref(false)
const showExamRolesPicker = ref(false)
const learnRolesSelected = ref([])
const examRolesSelected = ref([])
const seekModeOptions = [
  { value: 'free', label: '不锁定（可任意拖动）' },
  { value: 'played_only', label: '已看可拖（进度锁）' },
  { value: 'locked', label: '全程锁定' }
]
const seekModeLabels = seekModeOptions.map(o => o.label)
const seekModeIndex = ref(1)
const quizFlagLabels = {
  practice: '刷题练习',
  lessonQuiz: '课堂测验',
  exam: '模拟考试',
  freeAnswer: '自由答题',
  random: '随机抽题'
}
```

- [ ] **Step 3: 新增角色列表加载与处理函数**

在 `e:\code\web\src\pages\course\form.vue` 的 `<script setup>` 中 `import { getChannelList }` 所在 import 语句下方（第 547 行后）加入 `getAllRoles` import，并在工具函数区加入处理函数：

```js
import { getAllRoles } from '../../api/auth.js'

async function loadRoleOptions() {
  try {
    const list = await getAllRoles()
    roleOptions.value = Array.isArray(list) ? list : []
  } catch (e) {
    console.warn('获取角色列表失败，使用空列表', e)
    roleOptions.value = []
  }
}

function toggleLearnRoles(roleName) {
  const idx = learnRolesSelected.value.indexOf(roleName)
  if (idx > -1) learnRolesSelected.value.splice(idx, 1)
  else learnRolesSelected.value.push(roleName)
}

function toggleExamRoles(roleName) {
  const idx = examRolesSelected.value.indexOf(roleName)
  if (idx > -1) examRolesSelected.value.splice(idx, 1)
  else examRolesSelected.value.push(roleName)
}

function confirmLearnRoles() {
  form.featureFlags.learnRoles = [...learnRolesSelected.value]
  showLearnRolesPicker.value = false
}

function confirmExamRoles() {
  form.featureFlags.quiz.examRoles = [...examRolesSelected.value]
  showExamRolesPicker.value = false
}

function handleSeekModeChange(e) {
  seekModeIndex.value = Number(e.detail.value)
  form.featureFlags.seekMode = seekModeOptions[seekModeIndex.value].value
}

function learnRolesNames() {
  if (!form.featureFlags.learnRoles.length) return '未配置（所有角色可见）'
  return form.featureFlags.learnRoles.join('、')
}

function examRolesNames() {
  if (!form.featureFlags.quiz.examRoles.length) return '未配置'
  return form.featureFlags.quiz.examRoles.join('、')
}
```

- [ ] **Step 4: 在 template 中插入「播放功能设置」区块**

在 `e:\code\web\src\pages\course\form.vue` 第 327 行 `</view>`（答题设置区块结束）之后、第 329 行 `渠道设置` 区块前插入：

```html
      <!-- 播放功能设置 -->
      <view class="form-section">
        <view class="section-title">播放功能设置</view>

        <view class="form-item">
          <text class="form-label">播放倍速</text>
          <switch :checked="form.featureFlags.playbackSpeed" @change="form.featureFlags.playbackSpeed = !form.featureFlags.playbackSpeed" />
          <text class="form-hint">开启后所有学员可选择播放倍速</text>
        </view>

        <view class="form-item">
          <text class="form-label">VIP特权倍速</text>
          <switch :checked="form.featureFlags.vipSpeedOverride" @change="form.featureFlags.vipSpeedOverride = !form.featureFlags.vipSpeedOverride" />
          <text class="form-hint">开启后仅站点特权角色可使用倍速（需配合站点 speedPrivilegedRoles 配置）</text>
        </view>

        <view class="form-item">
          <text class="form-label">允许横屏播放</text>
          <switch :checked="form.featureFlags.allowLandscape" @change="form.featureFlags.allowLandscape = !form.featureFlags.allowLandscape" />
        </view>

        <view class="form-item">
          <text class="form-label">防误触锁定</text>
          <switch :checked="form.featureFlags.screenLock" @change="form.featureFlags.screenLock = !form.featureFlags.screenLock" />
          <text class="form-hint">播放时锁定屏幕控制，防误触</text>
        </view>

        <view class="form-item">
          <text class="form-label">自动连播</text>
          <switch :checked="form.featureFlags.autoNext" @change="form.featureFlags.autoNext = !form.featureFlags.autoNext" />
          <text class="form-hint">本集播完后自动播放下方内容</text>
        </view>

        <view class="form-item">
          <text class="form-label">画中画</text>
          <switch :checked="form.featureFlags.pictureInPicture" @change="form.featureFlags.pictureInPicture = !form.featureFlags.pictureInPicture" />
        </view>

        <view class="form-item">
          <text class="form-label">进度锁定</text>
          <picker mode="selector" :range="seekModeLabels" @change="handleSeekModeChange">
            <view class="picker-value">
              <text>{{ seekModeLabels[seekModeIndex] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
          <text class="form-hint">已看可拖=已学部分可拖动进度；全程锁定=不可拖动</text>
        </view>

        <view class="form-item">
          <text class="form-label">学习角色白名单</text>
          <view class="channel-picker-trigger" @click="openLearnRolesPicker">
            <text class="form-hint" style="margin:0;">{{ learnRolesNames() }}</text>
          </view>
          <text class="form-hint">仅这些角色可见/学习本课程；留空则所有角色可见（admin 恒放行）</text>
        </view>

        <view class="form-item">
          <text class="form-label">答题入口</text>
          <view class="radio-group" style="flex-direction:column;align-items:flex-start;">
            <view v-for="(label, key) in quizFlagLabels" :key="key" class="radio-item">
              <view class="radio-circle" :class="{ active: form.featureFlags.quiz[key] }" @click="toggleQuizFlag(key)"></view>
              <text>{{ label }}</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">考试角色白名单</text>
          <view class="channel-picker-trigger" @click="openExamRolesPicker">
            <text class="form-hint" style="margin:0;">{{ examRolesNames() }}</text>
          </view>
          <text class="form-hint">仅这些角色可见/考试（独立于学习角色白名单）</text>
        </view>
      </view>
```

在弹层区域（第 495 行 `</view>` 附近的 channel 弹层集合中、TagPicker 之前）追加两个角色多选弹层：

```html
      <!-- 学习角色白名单弹层 -->
      <view v-if="showLearnRolesPicker" class="modal-overlay" @click="showLearnRolesPicker = false">
        <view class="modal-card" @click.stop>
          <view class="modal-header">
            <text class="modal-title">选择学习角色</text>
            <text class="btn-close" @click="showLearnRolesPicker = false">×</text>
          </view>
          <scroll-view scroll-y class="modal-body">
            <view v-for="r in roleOptions" :key="r.name" class="modal-option"
              :class="{ selected: learnRolesSelected.includes(r.name) }"
              @click="toggleLearnRoles(r.name)">
              <text>{{ r.displayName || r.name }}</text>
            </view>
            <view v-if="roleOptions.length === 0" class="modal-empty">未获取到角色</view>
          </scroll-view>
          <view class="modal-footer">
            <button class="btn-confirm" @click="confirmLearnRoles">确定</button>
          </view>
        </view>
      </view>

      <!-- 考试角色白名单弹层 -->
      <view v-if="showExamRolesPicker" class="modal-overlay" @click="showExamRolesPicker = false">
        <view class="modal-card" @click.stop>
          <view class="modal-header">
            <text class="modal-title">选择考试角色</text>
            <text class="btn-close" @click="showExamRolesPicker = false">×</text>
          </view>
          <scroll-view scroll-y class="modal-body">
            <view v-for="r in roleOptions" :key="r.name" class="modal-option"
              :class="{ selected: examRolesSelected.includes(r.name) }"
              @click="toggleExamRoles(r.name)">
              <text>{{ r.displayName || r.name }}</text>
            </view>
            <view v-if="roleOptions.length === 0" class="modal-empty">未获取到角色</view>
          </scroll-view>
          <view class="modal-footer">
            <button class="btn-confirm" @click="confirmExamRoles">确定</button>
          </view>
        </view>
      </view>
```

- [ ] **Step 5: 新增打开弹层的辅助函数**

在 `confirmExamRoles` 函数后加入：

```js
function openLearnRolesPicker() {
  learnRolesSelected.value = [...(form.featureFlags.learnRoles || [])]
  showLearnRolesPicker.value = true
}

function openExamRolesPicker() {
  examRolesSelected.value = [...(form.featureFlags.quiz.examRoles || [])]
  showExamRolesPicker.value = true
}

function toggleQuizFlag(key) {
  form.featureFlags.quiz[key] = !form.featureFlags.quiz[key]
}
```

- [ ] **Step 6: 校验/回显/提交三处接入**

**① 回显**：在 `loadCourseDetail` 函数内「答题设置字段回显」代码块（第 919-923 行）之后加入：

```js
    // 播放功能设置回显
    if (data.featureFlags && typeof data.featureFlags === 'object') {
      const ff = data.featureFlags
      form.featureFlags = {
        configured: true,
        playbackSpeed: ff.playbackSpeed === true,
        vipSpeedOverride: ff.vipSpeedOverride === true,
        allowLandscape: ff.allowLandscape === true,
        screenLock: ff.screenLock === true,
        autoNext: ff.autoNext === true,
        pictureInPicture: ff.pictureInPicture === true,
        seekMode: (ff.seekMode === 'locked' || ff.seekMode === 'free' || ff.seekMode === 'played_only') ? ff.seekMode : 'played_only',
        learnRoles: Array.isArray(ff.learnRoles) ? ff.learnRoles : [],
        quiz: {
          practice: ff.quiz?.practice === true,
          lessonQuiz: ff.quiz?.lessonQuiz === true,
          exam: ff.quiz?.exam === true,
          freeAnswer: ff.quiz?.freeAnswer === true,
          random: ff.quiz?.random === true,
          examRoles: Array.isArray(ff.quiz?.examRoles) ? ff.quiz.examRoles : []
        }
      }
    }
    seekModeIndex.value = seekModeOptions.findIndex(o => o.value === form.featureFlags.seekMode)
    if (seekModeIndex.value < 0) seekModeIndex.value = 1
```

**② 提交**：在 `submitData` 中（第 1031 行 `quizRetryCount: form.quizRetryCount` 后加逗号）追加：

```js
    // 播放功能设置（总是存对象）
    featureFlags: {
      configured: true,
      playbackSpeed: form.featureFlags.playbackSpeed,
      vipSpeedOverride: form.featureFlags.vipSpeedOverride,
      allowLandscape: form.featureFlags.allowLandscape,
      screenLock: form.featureFlags.screenLock,
      autoNext: form.featureFlags.autoNext,
      pictureInPicture: form.featureFlags.pictureInPicture,
      seekMode: form.featureFlags.seekMode,
      learnRoles: Array.isArray(form.featureFlags.learnRoles) ? form.featureFlags.learnRoles : [],
      quiz: {
        practice: form.featureFlags.quiz.practice,
        lessonQuiz: form.featureFlags.quiz.lessonQuiz,
        exam: form.featureFlags.quiz.exam,
        freeAnswer: form.featureFlags.quiz.freeAnswer,
        random: form.featureFlags.quiz.random,
        examRoles: Array.isArray(form.featureFlags.quiz.examRoles) ? form.featureFlags.quiz.examRoles : []
      }
    }
```

**③ 加载角色**：在 `onMounted` 的加载流程中调用 `loadRoleOptions()`（在第 568 行 watch 之前或 `showPointsSection` 初始化处追加）；由于角色列表与租户相关，也在 watch 回调里调用：

```js
async function loadRoleOptions() { ... } // 已定义

// 在 onMounted/watch 相关处补充调用
loadRoleOptions()
```

- [ ] **Step 7: 自测检查**

对照检查：
- `form.featureFlags.quiz` 各开关绑定正确，`toggleQuizFlag` 写入 `form.featureFlags.quiz[key]`。
- 保存后 `submitData.featureFlags` 始终为对象（含 quiz）。
- 回显时 `seekModeIndex` 正确反映 `seekMode`。
- 角色弹层确定后写入 `learnRoles`/`quiz.examRoles`。

- [ ] **Step 8: Commit**

```bash
cd e:\code\web
git add src/pages/course/form.vue
git commit -m "feat: 课程表单新增播放功能配置区（倍速/特权/画中画/进度锁/角色白名单/答题入口）"
```

---

### Task 2: 修复知识点 slug（表单 + 详情）

**Files:**
- Modify: `e:\code\web\src\pages\course\form.vue`
- Modify: `e:\code\web\src\pages\course\detail.vue`

- [ ] **Step 1: 修复表单知识点 slug**

`e:\code\web\src\pages\course\form.vue` 第 888 行与第 890 行：

```js
// 888: a.tagGroup?.slug === 'knowledge-point'  → 'knowledge-points'
// 890: a.tagGroup?.slug !== 'knowledge-point'  → 'knowledge-points'
```

改为：

```js
        const kpTags = data.tags.filter(t => t.tagGroup?.slug === 'knowledge-points')
        selectedKnowledgePoints.value = kpTags
        const normalTags = data.tags.filter(t => t.tagGroup?.slug !== 'knowledge-points')
```

- [ ] **Step 2: 修复详情页知识点 slug**

`e:\code\web\src\pages\course\detail.vue` 第 166 行：

```js
  return course.value.tags.filter(t => t.tagGroup?.slug === 'knowledge-point')
```

改为：

```js
  return course.value.tags.filter(t => t.tagGroup?.slug === 'knowledge-points')
```

- [ ] **Step 3: Commit**

```bash
cd e:\code\web
git add src/pages/course/form.vue src/pages/course/detail.vue
git commit -m "fix: 修复课程知识点 slug 单复数问题，知识点正常显示"
```

---

### Task 3: 详情页新增字段展示块

**Files:**
- Modify: `e:\code\web\src\pages\course\detail.vue`

- [ ] **Step 1: 新增展示辅助 function/computed**

在 `e:\code\web\src\pages\course\detail.vue` 的 `<script setup>` 中，第 167 行 `knowledgePointTags` computed 之后加入：

```js
const courseTypeMap = { free: '免费', points: '积分兑换', paid: '付费' }
const enrollModeMap = { none: '无', manual: '手动', auto: '自动' }
const seekModeMap = { free: '不锁定', played_only: '已看可拖', locked: '全程锁定' }
const quizFlagLabels = {
  practice: '刷题练习',
  lessonQuiz: '课堂测验',
  exam: '模拟考试',
  freeAnswer: '自由答题',
  random: '随机抽题'
}
const quizRetryMap = {
  no_retry: '不允许复答', retry_1: '可复答1次', retry_2: '可复答2次',
  retry_3: '可复答3次', retry_4: '可复答4次'
}
const featureOnList = computed(() => {
  const ff = course.value?.featureFlags
  if (!ff || typeof ff !== 'object') return []
  const list = []
  if (ff.playbackSpeed) list.push('播放倍速')
  if (ff.vipSpeedOverride) list.push('VIP特权倍速')
  if (ff.allowLandscape) list.push('横屏播放')
  if (ff.screenLock) list.push('防误触锁定')
  if (ff.autoNext) list.push('自动连播')
  if (ff.pictureInPicture) list.push('画中画')
  return list
})
const quizOnList = computed(() => {
  const quiz = course.value?.featureFlags?.quiz
  if (!quiz || typeof quiz !== 'object') return []
  return quizFlagLabels ? Object.keys(quizFlagLabels).filter(k => quiz[k]).map(k => quizFlagLabels[k]) : []
})
function fmtArr(arr) { return Array.isArray(arr) && arr.length ? arr.join('、') : '-' }
function roleNames(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '所有角色'
  return arr.join('、')
}
```

- [ ] **Step 2: 在 template「价格信息」区块后新增展示块**

在 `e:\code\web\src\pages\course\detail.vue` 第 74 行（价格信息区块 `</view>`）之后、第 79 行「课程描述」前插入：

```html
      <view class="info-section">
        <view class="section-title">课程类型与报名</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">课程类型</text>
            <text class="info-value">{{ courseTypeMap[course.courseType] || course.courseType || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">报名模式</text>
            <text class="info-value">{{ enrollModeMap[course.enrollMode] || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">积分价格</text>
            <text class="info-value">{{ course.courseType === 'points' ? (course.pointsPrice || 0) : '-' }}</text>
          </view>
        </view>
      </view>

      <view class="info-section">
        <view class="section-title">顺序与答题设置</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">强制顺序学习</text>
            <text class="info-value">{{ course.enforceSequence ? '是（硬锁）' : '否（建议）' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">课程顺序号</text>
            <text class="info-value">{{ course.sequenceNumber || 0 }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">顺序标签</text>
            <text class="info-value">{{ course.sequenceTag?.name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">允许重复答题</text>
            <text class="info-value">{{ course.allowRetakeQuiz ? '是' : '否' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">错题复答</text>
            <text class="info-value">{{ quizRetryMap[course.quizRetryCount] || '-' }}</text>
          </view>
        </view>
      </view>

      <view class="info-section">
        <view class="section-title">渠道与积分归属</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">渠道范围</text>
            <text class="info-value">{{ course.channelScope === 'all' ? '全部渠道' : '指定渠道' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">允许跨渠道</text>
            <text class="info-value">{{ course.allowCrossChannel === false ? '否' : '是' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">积分归属渠道</text>
            <text class="info-value">{{ course.pointChannel?.name || course.pointChannel || '-' }}</text>
          </view>
        </view>
      </view>

      <view class="info-section">
        <view class="section-title">播放功能设置</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">已开启</text>
            <text class="info-value">{{ featureOnList.length ? featureOnList.join('、') : '无' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">进度锁定</text>
            <text class="info-value">{{ seekModeMap[course.featureFlags?.seekMode] || '不锁定' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">学习角色</text>
            <text class="info-value">{{ roleNames(course.featureFlags?.learnRoles) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">答题入口</text>
            <text class="info-value">{{ quizOnList.length ? quizOnList.join('、') : '无' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">考试角色</text>
            <text class="info-value">{{ roleNames(course.featureFlags?.quiz?.examRoles) }}</text>
          </view>
        </view>
      </view>
```

- [ ] **Step 3: 确认 getCourseDetail 返回 featureFlags**

检查 [src/api/course.js](file:///e:/code/web/src/api/course.js) 的 `getCourseDetail` 是否走后端 `findOne`（返回完整 document，含 featureFlags 与 pointChannel）。若用了字段白名单需把 `featureFlags`、`sequenceTag`、`pointChannel` 加入 populate 或字段列表。

- [ ] **Step 4: Commit**

```bash
cd e:\code\web
git add src/pages/course/detail.vue src/api/course.js
git commit -m "feat: 课程详情页新增课程类型/报名/顺序/答题/渠道/播放功能展示块"
```

---

### Task 4: 验证构建与 C 端生效

- [ ] **Step 1: 本地构建校验语法**

```bash
cd e:\code\web
npx vite build
```

Expected: 构建成功无报错（若本机无依赖可跳过，用 HBuilder 构建验证）。

- [ ] **Step 2: 手工验证表单**

浏览器打开 `http://localhost:5174/#/pages/course/form?id=u3k2bjylr5zl4c06s5rpjgs9`，确认：
- 「播放功能设置」区块展示全部开关/进度锁定/角色白名单/答题入口。
- 勾选倍速+VIP特权+进度锁定，保存后重新进入回显正确。

- [ ] **Step 3: 手工验证详情页**

打开对应详情页，确认课程类型/报名/顺序/答题/渠道/播放功能展示块与知识点正常显示。

- [ ] **Step 4: 验证 C 端生效**

C 端（shao 项目）打开该课程，确认倍速按钮出现与否、进度锁定行为、角色白名单访问控制按配置生效。

---

## Self-Review

**Spec coverage：**
- 播放功能配置区（Task 1）✓ 覆盖 spec 3.1 全部字段
- 知识点 slug 修复（Task 2）✓ 覆盖 spec 3.2 slug
- 详情页展示块（Task 3）✓ 覆盖 spec 3.2 各块
- 保存策略「总是存对象」(Task 1 Step 6 ②) ✓
- 动态拉取角色（Task 1 import getAllRoles）✓
- 不改后端（全程未触碰 zhao-course 插件）✓

**Placeholder scan：** 无 TBD/TODO；Step 3 Task 3 的 course.js 检查为可执行的操作项非占位。
**Type consistency：** `quizFlagLabels` 在 form 与 detail 定义一致；`seekModeOptions.index` 与 `form.featureFlags.seekMode` 映射一致；`learnRoles`/`examRoles` 均用 `.name`。