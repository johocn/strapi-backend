<template>
  <view class="page-container">
    <PageHeader title="报名名单" />

    <view class="tabs">
      <view class="tab-item" :class="{ active: activeTab === 'signup' }" @click="switchTab('signup')">报名名单</view>
      <view class="tab-item" :class="{ active: activeTab === 'attendance' }" @click="switchTab('attendance')">到场记录</view>
    </view>

    <!-- 报名名单 -->
    <view v-if="activeTab === 'signup'" class="list">
      <view v-if="loadingSignup" class="loading"><text>加载中...</text></view>
      <template v-else>
        <view v-for="item in signupList" :key="item.id || item.documentId" class="card">
          <view class="card-header">
            <text class="user-name">{{ item.user?.nickname || item.user?.username || `用户#${item.user?.id}` }}</text>
            <text class="status-badge" :class="item.status === 'active' ? 'active' : item.status === 'waiting' ? 'waiting' : 'cancelled'">
              {{ item.status === 'active' ? '已报名' : item.status === 'waiting' ? '候补中' : '已取消' }}
            </text>
            <text v-if="item.attendedAt" class="status-badge checked">已到场</text>
          </view>
          <view class="card-meta">
            <text class="meta-item">用户ID: {{ item.user?.id || '-' }}</text>
            <text class="meta-item">报名时间: {{ formatTime(item.signupAt) }}</text>
          </view>
          <view v-if="item.formData && formFieldList(item).length" class="card-form" @click.stop>
            <view class="card-form-head" @click="toggleForm(item.id || item.documentId)">
              <text>报名信息</text>
              <text class="form-toggle">{{ expandedForm === (item.id || item.documentId) ? '收起' : '展开' }}</text>
            </view>
            <view v-if="expandedForm === (item.id || item.documentId)" class="form-fields">
              <view v-for="fd in formFieldList(item)" :key="fd.key" class="form-field-row">
                <text class="ff-label">{{ fd.label }}</text>
                <text class="ff-value">{{ fd.value }}</text>
              </view>
            </view>
          </view>
          <view v-if="item.status === 'waiting'" class="card-actions">
            <view class="remove-btn" @click="removeWaiting(item)"><text>移出候补</text></view>
          </view>
        </view>
        <view v-if="signupList.length === 0" class="empty-state">
          <text class="empty-text">暂无报名记录</text>
        </view>
      </template>
    </view>

    <!-- 到场记录 -->
    <view v-if="activeTab === 'attendance'" class="list">
      <view v-if="loadingAttendance" class="loading"><text>加载中...</text></view>
      <template v-else>
        <view v-for="item in attendanceList" :key="item.id || item.documentId" class="card">
          <view class="card-header">
            <text class="user-name">{{ item.signup?.user?.nickname || item.signup?.user?.username || `用户#${item.signup?.user?.id}` }}</text>
            <text class="status-badge checked">已到场</text>
          </view>
          <view class="card-meta">
            <text class="meta-item">用户ID: {{ item.signup?.user?.id || '-' }}</text>
            <text class="meta-item">到场时间: {{ formatTime(item.checkinAt) }}</text>
          </view>
          <view class="card-meta" v-if="item.method">
            <text class="meta-item">核销方式: {{ methodText(item.method) }}</text>
          </view>
        </view>
        <view v-if="attendanceList.length === 0" class="empty-state">
          <text class="empty-text">暂无到场记录</text>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getActivitySignups, getActivityAttendance, cancelActivitySignup, getActivity } from '../../api/activity.js'
import PageHeader from '../../components/PageHeader.vue'

const activityId = ref('')
const activeTab = ref('signup')
const signupList = ref([])
const attendanceList = ref([])
const loadingSignup = ref(false)
const loadingAttendance = ref(false)
const formConfig = ref([])
const expandedForm = ref('')

function formatTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function methodText(m) {
  const map = { self: '自助核销', worker_scan: '工作人员扫码', both: '双方核销' }
  return map[m] || m || '-'
}

async function loadSignups() {
  if (!activityId.value) return
  loadingSignup.value = true
  try {
    const res = await getActivitySignups(activityId.value)
    signupList.value = res.list || []
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loadingSignup.value = false
  }
}

async function loadAttendance() {
  if (!activityId.value) return
  loadingAttendance.value = true
  try {
    const res = await getActivityAttendance(activityId.value)
    attendanceList.value = res.list || []
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loadingAttendance.value = false
  }
}

async function loadFormConfig() {
  try {
    const act = await getActivity(activityId.value)
    formConfig.value = Array.isArray(act?.formConfig) ? act.formConfig : []
  } catch (e) {
    formConfig.value = []
  }
}

function formFieldList(item) {
  const fd = item.formData && typeof item.formData === 'object' ? item.formData : {}
  return (formConfig.value || []).filter(f => f?.key && fd[f.key] !== undefined && fd[f.key] !== null && fd[f.key] !== '')
    .map(f => ({
      key: f.key,
      label: f.label || f.key,
      value: Array.isArray(fd[f.key]) ? fd[f.key].join('、') : String(fd[f.key]),
    }))
}

function toggleForm(k) {
  expandedForm.value = expandedForm.value === k ? '' : k
}

function switchTab(tab) {
  activeTab.value = tab
  if (tab === 'signup') {
    if (signupList.value.length === 0) loadSignups()
  } else {
    if (attendanceList.value.length === 0) loadAttendance()
  }
}

async function removeWaiting(item) {
  uni.showModal({
    title: '移出候补',
    content: '确定将该用户移出候补名单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const r = await cancelActivitySignup(activityId.value, item.id)
          if (r?.ok === false) {
            uni.showToast({ title: '仅可移出候补', icon: 'none' })
          } else {
            uni.showToast({ title: '已移出', icon: 'success' })
          }
          loadSignups()
        } catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

onLoad((options) => {
  if (options.id) {
    activityId.value = options.id
    loadSignups()
    loadFormConfig()
  }
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.tabs { display: flex; background: #fff; border-radius: 12rpx; padding: 8rpx; margin-bottom: 20rpx; }
.tab-item { flex: 1; text-align: center; padding: 16rpx 0; font-size: 28rpx; color: #666; border-radius: 8rpx; }
.tab-item.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; font-weight: bold; }

.list { display: flex; flex-direction: column; gap: 16rpx; }
.card { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.card-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 10rpx; flex-wrap: wrap; }
.user-name { font-size: 30rpx; font-weight: bold; color: #333; flex: 1; }
.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-badge.active { background: #e6f7ff; color: #1890ff; }
.status-badge.cancelled { background: #f5f5f5; color: #999; }
.status-badge.waiting { background: #fff7e6; color: #fa8c16; }
.status-badge.checked { background: #f6ffed; color: #52c41a; }
.card-meta { display: flex; gap: 16rpx; flex-wrap: wrap; }
.meta-item { font-size: 24rpx; color: #999; }
.card-actions { margin-top: 16rpx; text-align: right; }
.remove-btn { display: inline-block; font-size: 24rpx; color: #ff4d4f; border: 1rpx solid #ff4d4f; border-radius: 8rpx; padding: 6rpx 20rpx; }

.loading { text-align: center; padding: 60rpx 0; color: #999; }
.empty-state { text-align: center; padding: 80rpx 0; }
.empty-text { font-size: 28rpx; color: #999; }
.card-form { margin-top: 16rpx; border-top: 1rpx solid #f0f0f0; padding-top: 12rpx; }
.card-form-head { display: flex; justify-content: space-between; font-size: 26rpx; color: #333; }
.form-toggle { color: #667eea; }
.form-fields { margin-top: 12rpx; }
.form-field-row { display: flex; justify-content: space-between; gap: 20rpx; padding: 8rpx 0; font-size: 26rpx; }
.ff-label { color: #999; flex-shrink: 0; }
.ff-value { color: #333; text-align: right; word-break: break-all; }
</style>