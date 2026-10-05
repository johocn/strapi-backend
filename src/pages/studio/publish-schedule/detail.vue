<template>
  <view class="page-container">
    <PageHeader :title="loading ? '加载中...' : '定时发布详情'" />

    <view v-if="loading" class="loading-wrap">
      <text>加载中...</text>
    </view>

    <template v-else-if="item">
      <!-- 状态卡 -->
      <view class="status-card" :class="statusClass(item.status)">
        <view class="status-header">
          <text class="status-badge">{{ statusText(item.status) }}</text>
        </view>
        <view class="status-title">{{ item.name || '未命名预约' }}</view>
      </view>

      <!-- 发布内容 -->
      <view class="section">
        <view class="section-title">📦 发布内容</view>
        <view class="info-row">
          <text class="info-label">类型</text>
          <text class="info-value">{{ contentTypeLabel }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">标题</text>
          <text class="info-value title">{{ contentTitle }}</text>
        </view>
      </view>

      <!-- 时间信息 -->
      <view class="section">
        <view class="section-title">⏱️ 时间线</view>
        <view class="info-row">
          <text class="info-label">计划时间</text>
          <text class="info-value">{{ formatTime(item.scheduledAt) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">创建时间</text>
          <text class="info-value">{{ formatTime(item.createdAt) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">触发时间</text>
          <text class="info-value">{{ formatTime(item.triggeredAt) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">更新时间</text>
          <text class="info-value">{{ formatTime(item.updatedAt) }}</text>
        </view>
      </view>

      <!-- 账号 -->
      <view class="section">
        <view class="section-title">👤 目标账号 ({{ accountCount }})</view>
        <view v-if="accountCount === 0" class="empty-hint">暂无账号</view>
        <view v-for="(accId, idx) in accountIds" :key="idx" class="account-item">
          <text class="account-index">#{{ idx + 1 }}</text>
          <text class="account-name">{{ getAccountLabel(accId) }}</text>
          <text v-if="accountMap[accId]?.platform?.name" class="account-platform">
            {{ accountMap[accId].platform.name }}
          </text>
        </view>
      </view>

      <!-- 操作 -->
      <view class="action-bar" v-if="item.status === 'scheduled'">
        <button class="btn-danger" @click="handleCancel" :disabled="cancelling">
          {{ cancelling ? '取消中...' : '🚫 取消预约' }}
        </button>
      </view>
    </template>

    <view v-else class="empty-wrap">
      <text>定时任务不存在</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { publishScheduleApi, publishAccountApi } from '../../../api/studio.js'
import { formatDate } from '../../../utils/format.js'
import PageHeader from '../../../components/PageHeader.vue'

const scheduleId = ref('')
const item = ref(null)
const loading = ref(true)
const cancelling = ref(false)
const accountMap = ref({}) // documentId → account

onLoad((options) => {
  scheduleId.value = options?.documentId || options?.id || ''
  if (scheduleId.value) loadDetail()
  else { loading.value = false }
})

async function loadAccounts() {
  try {
    const { list } = await publishAccountApi.list({
      'pagination[pageSize]': 100,
      'populate': '*'
    })
    const map = {}
    list.forEach(acc => { map[acc.documentId] = acc })
    accountMap.value = map
  } catch {}
}

function getAccountLabel(id) {
  const acc = accountMap.value[id]
  if (acc) return `${acc.name}${acc.platform?.name ? ' · ' + acc.platform.name : ''}`
  return id
}

async function loadDetail() {
  loading.value = true
  try {
    await Promise.all([
      loadAccounts(),
      (async () => { item.value = await publishScheduleApi.detail(scheduleId.value) })()
    ])
  } catch (e) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally { loading.value = false }
}

function formatTime(t) { return t ? formatDate(t) : '-' }

const STATUS_TEXT_MAP = {
  scheduled: '⏰ 等待触发', triggered: '✅ 已触发',
  cancelled: '🚫 已取消', expired: '⏸️ 已过期', failed: '❌ 触发失败',
}

function statusText(s) { return STATUS_TEXT_MAP[s] || s || '-' }
function statusClass(s) {
  if (s === 'triggered') return 'status-ok'
  if (s === 'cancelled' || s === 'failed') return 'status-fail'
  return 'status-pending'
}

const contentTypeLabel = computed(() => {
  if (!item.value) return '-'
  if (item.value.video) return '🎬 短视频'
  if (item.value.gallery) return '🖼️ 图集'
  if (item.value.article) return '📝 文章'
  return '-'
})

const contentTitle = computed(() => {
  if (!item.value) return '-'
  const r = item.value
  return (r.video?.title || r.gallery?.title || r.article?.title || '-')
})

const accountIds = computed(() => Array.isArray(item.value?.accountIds) ? item.value.accountIds : [])
const accountCount = computed(() => accountIds.value.length)

async function handleCancel() {
  uni.showModal({
    title: '确认取消', content: '取消后定时任务不会再自动发布，确定继续？',
    success: async (res) => {
      if (!res.confirm) return
      cancelling.value = true
      try {
        await publishScheduleApi.cancel(scheduleId.value)
        uni.showToast({ title: '已取消', icon: 'success' })
        setTimeout(() => loadDetail(), 1200)
      } catch (e) {
        uni.showToast({ title: e?.message || '取消失败', icon: 'none' })
      } finally { cancelling.value = false }
    },
  })
}

function copyText(text) {
  uni.setClipboardData({ data: String(text), success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
}
</script>

<style scoped>
.page-container { min-height: 100vh; background: #f5f6fa; padding-bottom: 32rpx; }
.loading-wrap, .empty-wrap { padding: 120rpx 0; text-align: center; color: #999; font-size: 28rpx; }

.status-card { margin: 24rpx; padding: 32rpx; border-radius: 16rpx; background: #fff; border-left: 8rpx solid #ccc; }
.status-card.status-ok { border-color: #07c160; background: #f0faf4; }
.status-card.status-fail { border-color: #fa5151; background: #fef0f0; }
.status-card.status-pending { border-color: #ff9500; background: #fff8e6; }
.status-header { display: flex; align-items: center; }
.status-badge { font-size: 34rpx; font-weight: 600; }
.status-title { margin-top: 12rpx; font-size: 30rpx; color: #666; }

.section { margin: 24rpx; padding: 28rpx; background: #fff; border-radius: 16rpx; }
.section-title { font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; }
.info-row { display: flex; padding: 14rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.info-row:last-child { border-bottom: none; }
.info-label { width: 160rpx; font-size: 26rpx; color: #999; flex-shrink: 0; }
.info-value { flex: 1; font-size: 26rpx; color: #333; word-break: break-all; }
.info-value.title { font-weight: 600; }
.info-value.mono { font-family: monospace; font-size: 22rpx; color: #666; }

.account-item { display: flex; align-items: center; padding: 12rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.account-item:last-child { border-bottom: none; }
.account-index { width: 60rpx; font-size: 22rpx; color: #999; }
.account-name { flex: 1; font-size: 26rpx; color: #333; font-weight: 500; }
.account-platform { font-size: 22rpx; color: #1989fa; background: #e6f3ff; padding: 2rpx 12rpx; border-radius: 4rpx; }
.empty-hint { font-size: 26rpx; color: #999; padding: 8rpx 0; }

.action-bar { padding: 24rpx; }
.btn-danger { background: linear-gradient(135deg, #fa5151, #d4380d); color: #fff; border-radius: 12rpx; font-size: 30rpx; padding: 24rpx; }
.btn-danger[disabled] { opacity: 0.6; }
</style>
