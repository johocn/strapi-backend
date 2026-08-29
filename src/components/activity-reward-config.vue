<template>
  <view class="reward-config">
    <view class="fee-block">
      <view class="fee-block-header">
        <text class="fee-block-title">奖励开关</text>
      </view>
      <view class="form-item">
        <text class="form-label">启用报名奖励</text>
        <switch :checked="!!rc.loginEnabled" @change="toggleEnabled" />
      </view>
    </view>

    <template v-if="rc.loginEnabled">
      <!-- 解锁通道：单选四选一 -->
      <view class="fee-block">
        <view class="fee-block-header">
          <text class="fee-block-title">解锁通道</text>
          <text class="fee-block-hint">单选：完成该通道后开放权益领取，其余权益可配置附加条件引导客户达成</text>
        </view>
        <view class="channel-list">
          <view
            v-for="ch in channelOptions"
            :key="ch.type"
            class="channel-opt"
            :class="{ on: rc.channel?.type === ch.type }"
            @click="setChannel(ch)"
          >
            <text class="channel-dot">{{ rc.channel?.type === ch.type ? '●' : '○' }}</text>
            <text class="channel-name">{{ ch.label }}</text>
          </view>
        </view>
      </view>

      <!-- 权益选择方式 -->
      <view class="fee-block">
        <view class="fee-block-header">
          <text class="fee-block-title">权益选择方式</text>
          <text class="fee-block-hint">客户对「客户自选」类权益的选择约束</text>
        </view>
        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">选择方式</text>
            <picker mode="selector" :range="selectModeLabels" :value="selectModeIndex" @change="onSelectModeChange">
              <view class="picker-value"><text>{{ selectModeLabel }}</text><text class="picker-arrow">▼</text></view>
            </picker>
          </view>
          <view v-if="rc.selectMode === 'any'" class="form-item half">
            <text class="form-label">可选数量 N</text>
            <input type="number" v-model="rc.selectN" class="form-input" placeholder="默认 1" />
          </view>
        </view>
      </view>

      <!-- 奖励列表 -->
      <view class="fee-block">
        <view class="fee-block-header">
          <text class="fee-block-title">奖励列表</text>
          <text class="fee-block-hint">基础自动（不进入客户勾选菜单）｜客户自选（按选择方式勾选）</text>
        </view>
        <view v-for="(rw, ri) in rc.rewards" :key="ri" class="reward-block">
          <view class="fee-block-header">
            <text class="fee-block-title">奖励 {{ ri + 1 }} · {{ rewardTypeName(rw.type) }}</text>
            <view class="reward-ops">
              <text class="btn-link" @click="moveReward(ri, -1)">↑</text>
              <text class="btn-link" @click="moveReward(ri, 1)">↓</text>
              <text class="btn-link-danger" @click="removeReward(ri)">删除</text>
            </view>
          </view>
          <view class="form-row">
            <view class="form-item half">
              <text class="form-label">名称</text>
              <input v-model="rw.name" class="form-input" placeholder="如 报名积分" />
            </view>
            <view class="form-item half">
              <text class="form-label">类型</text>
              <picker mode="selector" :range="rewardTypeLabels" :value="rewardTypeIndex(rw.type)" @change="e => rw.type = rewardTypeValues[Number(e.detail.value)] || 'points'">
                <view class="picker-value"><text>{{ rewardTypeName(rw.type) }}</text><text class="picker-arrow">▼</text></view>
              </picker>
            </view>
          </view>
          <view class="form-row">
            <view class="form-item half">
              <text class="form-label">发放方式</text>
              <picker mode="selector" :range="['基础自动', '客户自选']" :value="rw.mode === 'multi' ? 1 : 0" @change="e => rw.mode = Number(e.detail.value) === 1 ? 'multi' : 'single'">
                <view class="picker-value"><text>{{ rw.mode === 'multi' ? '客户自选' : '基础自动' }}</text><text class="picker-arrow">▼</text></view>
              </picker>
            </view>
            <view class="form-item half">
              <text class="form-label">附加条件</text>
              <picker mode="selector" :range="conditionLabels" :value="conditionIndex(rw.condition)" @change="e => onConditionChange(rw, Number(e.detail.value))">
                <view class="picker-value"><text>{{ conditionLabel(rw.condition) }}</text><text class="picker-arrow">▼</text></view>
              </picker>
            </view>
          </view>
          <view v-if="conditionTip(rw.condition)" class="form-tip-warn">{{ conditionTip(rw.condition) }}</view>

          <view v-if="rw.type === 'points'" class="form-item">
            <text class="form-label">积分数量</text>
            <input type="number" v-model="rw.amount" class="form-input" placeholder="如 50" />
          </view>

          <view v-else-if="rw.type === 'course_trial'" class="form-item">
            <text class="form-label">试听课程</text>
            <view v-if="rw.courseTitle" class="rel-chip">
              <text class="rel-chip-name">{{ rw.courseTitle }}</text>
              <text class="rel-chip-del" @click="rw.courseId = undefined; rw.courseTitle = ''">✕</text>
            </view>
            <view v-else class="link-add" @click="pickCourse(ri)">+ 选择课程</view>
          </view>

          <view v-else-if="rw.type === 'course_outline'" class="form-item">
            <text class="form-label">资料类型</text>
            <picker mode="selector" :range="outlineKindLabels" :value="outlineKindIndex(rw.kind)" @change="e => rw.kind = outlineKindValues[Number(e.detail.value)]">
              <view class="picker-value"><text>{{ outlineKindLabel(rw.kind) }}</text><text class="picker-arrow">▼</text></view>
            </picker>
            <view v-if="rw.kind === 'article'" class="form-item-inner">
              <view v-if="rw.articleTitle" class="rel-chip">
                <text class="rel-chip-name">{{ rw.articleTitle }}</text>
                <text class="rel-chip-del" @click="rw.articleId = undefined; rw.articleTitle = ''">✕</text>
              </view>
              <view v-else class="link-add" @click="pickArticle(ri)">+ 选择文章</view>
            </view>
            <view v-else-if="rw.kind === 'file'" class="form-item-inner">
              <input v-model="rw.link" class="form-input" placeholder="资料下载链接" />
            </view>
            <view v-else-if="rw.kind === 'lesson'" class="form-item-inner">
              <view v-if="rw.lessonTitle" class="rel-chip">
                <text class="rel-chip-name">{{ rw.lessonTitle }}</text>
                <text class="rel-chip-del" @click="rw.lessonId = undefined; rw.lessonTitle = ''">✕</text>
              </view>
              <view v-else class="link-add" @click="pickLesson(ri)">+ 选择课时</view>
            </view>
          </view>

          <view v-else-if="rw.type === 'coupon'" class="form-row">
            <view class="form-item half">
              <text class="form-label">优惠券 ID</text>
              <input type="number" v-model="rw.couponId" class="form-input" placeholder="zhao-deal 优惠券 id" />
            </view>
            <view class="form-item half">
              <text class="form-label">优惠券名称</text>
              <input v-model="rw.couponName" class="form-input" placeholder="如 满100减20" />
            </view>
          </view>
        </view>
        <view class="link-add" @click="addReward">+ 添加奖励</view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { getLessonList, getCourseList } from '../api/course.js'
import { articleApi } from '../api/website.js'

const props = defineProps({
  rewardConfig: { type: Object, default: () => null },
  formConfig: { type: Array, default: () => [] },
  questionnaire: { type: Object, default: () => null },
})
const emit = defineEmits(['update:rewardConfig'])

/** 工作副本：与 props.rewardConfig 共享引用，变更后 emit 回写 */
const rc = ref(defaultConfig())
function defaultConfig() {
  return { loginEnabled: false, channel: null, selectMode: 'all', selectN: 1, rewards: [] }
}
/** 外部引用回写标记：避免「emit→父更新→props 同引用→重建 rc」死循环 */
let lastEmitted = null
watch(
  () => props.rewardConfig,
  (v) => {
    if (!v || v === lastEmitted || v === rc.value) return
    rc.value = normalize(v)
  }
)
// 深度回写：组件内任意修改（含裸 v-model：名称/积分数量/链接等）实时同步父组件 form
watch(
  rc,
  (v) => {
    lastEmitted = v
    emit('update:rewardConfig', v)
  },
  { deep: true }
)
onMounted(() => {
  // 旧数据迁移：无 channel 时从 infoChannels 首个映射（contact/survey 直映，其余默认 contact）
  if (!rc.value.channel?.type && Array.isArray(props.rewardConfig?.infoChannels)) {
    const legacy = props.rewardConfig.infoChannels.find((c) => c?.channel)
    if (legacy?.channel === 'survey') rc.value.channel = { type: 'survey', label: '回答调查问卷' }
    else if (legacy?.channel === 'contact') rc.value.channel = { type: 'contact', label: '留联系方式' }
  }
})

function normalize(v) {
  return {
    loginEnabled: v.loginEnabled !== false,
    channel: v.channel && v.channel.type ? { type: v.channel.type, label: v.channel.label || '' } : null,
    selectMode: ['all', 'one', 'any'].includes(v.selectMode) ? v.selectMode : 'all',
    selectN: Math.max(1, Number(v.selectN) || 1),
    rewards: Array.isArray(v.rewards) ? v.rewards.map(normReward) : [],
  }
}
const normReward = (r) => {
  if (!r || typeof r !== 'object') return {}
  return {
    id: r.id || `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: r.type || 'points',
    name: r.name || '',
    mode: r.mode === 'multi' ? 'multi' : 'single',
    condition: r.condition || (r.loginRequired ? 'wechat_auth' : (r.channel || 'none')),
    amount: r.amount,
    courseId: r.courseId, courseTitle: r.courseTitle || '',
    kind: r.kind || 'article',
    articleId: r.articleId, articleTitle: r.articleTitle || '',
    lessonId: r.lessonId, lessonTitle: r.lessonTitle || '',
    link: r.link || '',
    couponId: r.couponId, couponName: r.couponName || '',
  }
}

// ---- 奖励类型/条件/资料类型常量 ----
const rewardTypeLabels = ['积分', '课程权益', '资料与文章', '优惠券']
const rewardTypeValues = ['points', 'course_trial', 'course_outline', 'coupon']
const conditionLabels = ['无条件', '微信授权登录', '关注公众号', '留联系方式', '回答调查问卷']
const conditionValues = ['none', 'wechat_auth', 'subscribe', 'contact', 'survey']
const outlineKindLabels = ['文章', '文件链接', '课时']
const outlineKindValues = ['article', 'file', 'lesson']
const selectModeLabels = ['全选（自动勾选全部可领）', '任选（最多 N 项）', '单选（只选 1 项）']
const selectModeValues = ['all', 'any', 'one']

const channelOptions = [
  { type: 'contact', label: '留联系方式' },
  { type: 'survey', label: '回答调查问卷' },
  { type: 'wechat_auth', label: '微信授权登录' },
  { type: 'subscribe', label: '关注公众号' },
]

function rewardTypeName(t) { const i = rewardTypeValues.indexOf(t); return i >= 0 ? rewardTypeLabels[i] : rewardTypeLabels[0] }
function rewardTypeIndex(t) { const i = rewardTypeValues.indexOf(t); return i >= 0 ? i : 0 }
function conditionLabel(c) { const i = conditionValues.indexOf(c); return i >= 0 ? conditionLabels[i] : conditionLabels[0] }
function conditionIndex(c) { const i = conditionValues.indexOf(c); return i >= 0 ? i : 0 }
function outlineKindLabel(k) { const i = outlineKindValues.indexOf(k); return i >= 0 ? outlineKindLabels[i] : outlineKindLabels[0] }
function outlineKindIndex(k) { const i = outlineKindValues.indexOf(k); return i >= 0 ? i : 0 }
const selectModeIndex = computed(() => Math.max(0, selectModeValues.indexOf(rc.value.selectMode)))
const selectModeLabel = computed(() => selectModeLabels[selectModeIndex.value])

// ---- 通道 ----
function setChannel(ch) {
  rc.value.channel = { type: ch.type, label: ch.label }
  emit('update:rewardConfig', rc.value)
}
function toggleEnabled(e) {
  const on = e?.detail?.value === true || e?.detail?.value === 'true'
  rc.value.loginEnabled = on
  if (!on) rc.value.rewards = []
  emit('update:rewardConfig', rc.value)
}
function onSelectModeChange(e) {
  rc.value.selectMode = selectModeValues[Number(e.detail.value)] || 'all'
  if (rc.value.selectMode !== 'any') rc.value.selectN = 1
  emit('update:rewardConfig', rc.value)
}

// ---- 条件可用性提示（仅提示，不阻断选择：解锁通道与权益条件相互独立） ----
const contactAvailable = computed(() =>
  props.formConfig.some((f) => f?.type === 'phone' && f?.required === true))
const surveyAvailable = computed(() =>
  !!props.questionnaire && props.questionnaire.enabled === true &&
  Array.isArray(props.questionnaire.fields) && props.questionnaire.fields.length > 0)
function conditionTip(c) {
  if (c === 'contact' && !contactAvailable.value) return '该条件需报名表单设置「电话必填」字段后方可达成'
  if (c === 'survey' && !surveyAvailable.value) return '该条件需开启调查问卷并添加题目后方可达成'
  return ''
}
function onConditionChange(rw, idx) {
  rw.condition = conditionValues[idx]
  emit('update:rewardConfig', rc.value)
}

// ---- 奖励列表操作 ----
function addReward() {
  rc.value.rewards.push({ id: `r_${Date.now()}_${rc.value.rewards.length}`, type: 'points', name: '报名积分', mode: 'single', condition: 'none', amount: 50 })
  emit('update:rewardConfig', rc.value)
}
function removeReward(ri) { rc.value.rewards.splice(ri, 1); emit('update:rewardConfig', rc.value) }
function moveReward(ri, dir) {
  const arr = rc.value.rewards
  const ni = ri + dir
  if (ni < 0 || ni >= arr.length) return
  const it = arr.splice(ri, 1)[0]
  arr.splice(ni, 0, it)
  emit('update:rewardConfig', rc.value)
}

async function pickCourse(ri) {
  uni.showLoading({ title: '加载中...' })
  let list = []
  try {
    const res = await getCourseList({ page: 1, pageSize: 500 })
    list = (res.list || []).map((c) => ({ id: c.id, documentId: c.documentId, title: c.title || '' })).filter((c) => c.id || c.documentId)
  } catch (e) { list = [] }
  uni.hideLoading()
  if (!list.length) { uni.showToast({ title: '暂无课程', icon: 'none' }); return }
  uni.showActionSheet({
    itemList: list.map((c) => c.title),
    success: (res) => {
      const it = list[res.tapIndex]
      const rw = rc.value.rewards[ri]
      rw.courseId = it.id ?? it.documentId
      rw.courseTitle = it.title
      emit('update:rewardConfig', rc.value)
    }
  })
}
async function pickArticle(ri) {
  uni.showLoading({ title: '加载中...' })
  let list = []
  try {
    const res = await articleApi.list({ page: 1, pageSize: 500 })
    list = (res.list || []).map((a) => ({ id: a.id, documentId: a.documentId, title: a.title || '' })).filter((a) => a.id || a.documentId)
  } catch (e) { list = [] }
  uni.hideLoading()
  if (!list.length) { uni.showToast({ title: '暂无文章', icon: 'none' }); return }
  uni.showActionSheet({
    itemList: list.map((a) => a.title),
    success: (res) => {
      const it = list[res.tapIndex]
      const rw = rc.value.rewards[ri]
      rw.articleId = it.id ?? it.documentId
      rw.articleTitle = it.title
      emit('update:rewardConfig', rc.value)
    }
  })
}
async function pickLesson(ri) {
  uni.showLoading({ title: '加载中...' })
  let list = []
  try {
    const res = await getLessonList({ page: 1, pageSize: 500 })
    list = (res.list || []).map((l) => ({ id: l.id, documentId: l.documentId, title: l.title || '' })).filter((l) => l.id || l.documentId)
  } catch (e) { list = [] }
  uni.hideLoading()
  if (!list.length) { uni.showToast({ title: '暂无课时', icon: 'none' }); return }
  uni.showActionSheet({
    itemList: list.map((l) => l.title),
    success: (res) => {
      const it = list[res.tapIndex]
      const rw = rc.value.rewards[ri]
      rw.lessonId = it.id ?? it.documentId
      rw.lessonTitle = it.title
      emit('update:rewardConfig', rc.value)
    }
  })
}
</script>

<style scoped>
.fee-block { border: 1rpx solid #f0f0f0; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.fee-block-header { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-bottom: 16rpx; }
.fee-block-title { font-size: 28rpx; font-weight: 600; color: #333; }
.fee-block-hint { font-size: 22rpx; color: #999; flex: 1; text-align: right; }
.form-item { margin-bottom: 16rpx; }
.form-item.half { width: 48%; }
.form-row { display: flex; gap: 16rpx; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 10rpx; }
.form-input { border: 1rpx solid #e5e5e5; border-radius: 8rpx; padding: 14rpx 16rpx; font-size: 28rpx; }
.picker-value { border: 1rpx solid #e5e5e5; border-radius: 8rpx; padding: 14rpx 16rpx; font-size: 28rpx; display: flex; justify-content: space-between; align-items: center; }
.picker-arrow { font-size: 20rpx; color: #bbb; }
.form-tip-warn { font-size: 22rpx; color: #e6a23c; margin-bottom: 12rpx; }
.link-add { color: #667eea; font-size: 26rpx; padding: 12rpx 0; }
.reward-block { border: 1rpx solid #f0f0f0; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.reward-ops { display: flex; align-items: center; gap: 16rpx; }
.btn-link { color: #667eea; font-size: 26rpx; padding: 0; line-height: 1; }
.btn-link-danger { color: #e74c3c; font-size: 26rpx; padding: 0; line-height: 1; }
.form-item-inner { margin-top: 12rpx; }
.rel-chip { display: inline-flex; align-items: center; gap: 12rpx; background: #f4f6ff; border-radius: 8rpx; padding: 10rpx 14rpx; margin-top: 10rpx; }
.rel-chip-name { font-size: 26rpx; color: #667eea; }
.rel-chip-del { color: #999; font-size: 24rpx; }
.channel-list { display: flex; flex-wrap: wrap; gap: 16rpx; }
.channel-opt { display: flex; align-items: center; gap: 8rpx; padding: 14rpx 20rpx; border: 1rpx solid #e5e5e5; border-radius: 40rpx; font-size: 26rpx; color: #666; }
.channel-opt.on { border-color: #667eea; color: #667eea; background: #f4f6ff; }
.channel-dot { font-size: 24rpx; line-height: 1; }
.channel-name { line-height: 1; }
</style>
