<template>
  <view class="page-container">
    <PageHeader title="复购线索">
      <view class="header-right">
        <button class="btn-query" @click="loadData(1)">查询</button>
      </view>
    </PageHeader>

    <view class="filter-section">
      <view class="filter-item">
        <text class="filter-label">状态</text>
        <picker mode="selector" :range="statusNames" :value="statusValue" @change="handleStatusChange">
          <view class="picker-value" :class="{ empty: statusIndex !== 0 }">
            <text>{{ statusNames[statusIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
      <view class="filter-item">
        <text class="filter-label">日期</text>
        <picker mode="date" :value="from" @change="(e) => from = e.detail.value">
          <view class="picker-value"><text>{{ from }}</text><text class="arrow">▼</text></view>
        </picker>
        <text class="filter-sep">至</text>
        <picker mode="date" :value="to" @change="(e) => to = e.detail.value">
          <view class="picker-value"><text>{{ to }}</text><text class="arrow">▼</text></view>
        </picker>
      </view>
    </view>

    <!-- 汇总统计卡 -->
    <view class="summary-grid" v-if="summary">
      <view class="summary-card">
        <text class="summary-value">{{ summary.total ?? 0 }}</text>
        <text class="summary-label">线索总数</text>
      </view>
      <view class="summary-card">
        <text class="summary-value" v-bind:class="{ 'summary-good': (summary.followed ?? 0) > 0 }">{{ summary.followed ?? 0 }}</text>
        <text class="summary-label">已跟进</text>
      </view>
      <view class="summary-card">
        <text class="summary-value" v-bind:class="{ 'summary-deal': (summary.deal ?? 0) > 0 }">{{ summary.deal ?? 0 }}</text>
        <text class="summary-label">已成交</text>
      </view>
    </view>

    <view class="lead-list" v-if="!loading && rows.length > 0">
      <view v-for="row in rows" :key="row.id" class="lead-card">
        <view class="lead-head">
          <text class="lead-user">{{ userName(row) }}</text>
          <text v-if="(row.reorderedCount ?? 0) > 0" class="lead-reorder">已再报名{{ row.reorderedCount }}</text>
        </view>
        <view class="lead-meta">
          <text class="lead-time">{{ formatTime(reachAt(row)) }}</text>
          <picker mode="selector" :range="followNames" :value="followIndex(row.followStatus)" @change="(e) => onStatusChange(row, e)">
            <view class="status-chip" :class="statusClass(row.followStatus)">
              <text>{{ statusLabel(row.followStatus) }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
        <view v-if="row.followRemark" class="lead-remark">
          <text class="remark-text">{{ row.followRemark }}</text>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && rows.length === 0" class="empty-state">
      <text class="empty-icon">🔁</text>
      <text class="empty-text">暂无复购线索</text>
    </view>

    <view class="pagination" v-if="pagination.pageCount > 1">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ pagination.pageCount }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= pagination.pageCount }">下一页</view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { repurchaseLeadApi } from '../../api/sso.js'
import PageHeader from '../../components/PageHeader.vue'

const statusNames = ['全部', '未跟进', '已跟进', '已成交']
const followNames = ['未跟进', '已跟进', '已成交']
// picker 状态值(0全部/1/2/3) → 后端 followStatus
const statusValueMap = { 1: 'none', 2: 'followed', 3: 'deal' }

const now = new Date()
const past = new Date(now.getTime() - 30 * 86400000)
const iso = (d) => d.toISOString().slice(0, 10)

const statusIndex = ref(0)
const from = ref(iso(past))
const to = ref(iso(now))
const statusValue = ref('')
const rows = ref([])
const summary = ref(null)
const pagination = ref({ page: 1, pageSize: 20, pageCount: 1 })
const currentPage = ref(1)
const loading = ref(false)

function userName(row) {
  const u = row.user || {}
  return u.username || u.mobile || u.email || '未知用户'
}

function reachAt(row) {
  return row.sentAt || row.scheduledAt || row.createdAt
}

function formatTime(v) {
  if (!v) return '-'
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function statusLabel(s) {
  if (s === 'followed') return '已跟进'
  if (s === 'deal') return '已成交'
  return '未跟进'
}

function statusClass(s) {
  if (s === 'deal') return 'status-deal'
  if (s === 'followed') return 'status-followed'
  return 'status-none'
}

function followIndex(s) {
  if (s === 'followed') return 1
  if (s === 'deal') return 2
  return 0
}

function handleStatusChange(e) {
  statusIndex.value = Number(e.detail.value)
  statusValue.value = statusValueMap[statusIndex.value] ?? ''
}

async function onStatusChange(row, e) {
  const next = followNames[Number(e.detail.value)]
  const map = { '未跟进': 'none', '已跟进': 'followed', '已成交': 'deal' }
  const newStatus = map[next]
  try {
    await repurchaseLeadApi.markFollow(row.id, { status: newStatus })
    uni.showToast({ title: '已更新', icon: 'success' })
    loadData(currentPage.value)
  } catch (err) {
    uni.showToast({ title: err.message || '更新失败', icon: 'none' })
  }
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { page, pageSize: pagination.value.pageSize }
    if (statusValue.value) params.status = statusValue.value
    if (from.value) params.from = from.value
    if (to.value) params.to = to.value
    const res = await repurchaseLeadApi.list(params)
    const payload = res?.data ?? res ?? {}
    rows.value = Array.isArray(payload.rows) ? payload.rows : []
    summary.value = payload.summary ?? null
    pagination.value = { page: 1, pageSize: 20, pageCount: 1, ...(payload.pagination ?? {}) }
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < (pagination.value.pageCount || 1)) loadData(currentPage.value + 1) }

onMounted(() => {
  loadData(1)
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.header-right { display: flex; align-items: center; }
.btn-query {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff; padding: 16rpx 40rpx; font-size: 30rpx;
  border-radius: 40rpx; border: none; line-height: 1.2;
}
.filter-section { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.filter-item { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.filter-item:last-child { margin-bottom: 0; }
.filter-label { font-size: 26rpx; color: #666; flex-shrink: 0; }
.filter-sep { font-size: 24rpx; color: #999; flex-shrink: 0; }
.picker-value {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12rpx 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx;
  min-height: 44rpx; color: #333;
}
.picker-value.empty { color: #999; }
.arrow { font-size: 20rpx; color: #999; }

.summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; margin-bottom: 20rpx; }
.summary-card { background: #fff; border-radius: 12rpx; padding: 24rpx 16rpx; text-align: center; }
.summary-value { display: block; font-size: 44rpx; font-weight: bold; color: #333; }
.summary-value.summary-good { color: #52c41a; }
.summary-value.summary-deal { color: #1677ff; }
.summary-label { display: block; font-size: 24rpx; color: #999; margin-top: 8rpx; }

.lead-list { display: flex; flex-direction: column; gap: 16rpx; }
.lead-card { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.lead-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; gap: 16rpx; }
.lead-user { font-size: 30rpx; font-weight: bold; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lead-reorder { flex-shrink: 0; font-size: 22rpx; color: #52c41a; background: #eaffef; padding: 6rpx 16rpx; border-radius: 20rpx; }
.lead-meta { display: flex; justify-content: space-between; align-items: center; }
.lead-time { font-size: 24rpx; color: #999; }
.status-chip { display: inline-flex; align-items: center; gap: 8rpx; padding: 8rpx 20rpx; border-radius: 20rpx; font-size: 24rpx; }
.status-none { background: #f0f0f0; color: #666; }
.status-followed { background: #e6f4ff; color: #1677ff; }
.status-deal { background: #eaffef; color: #52c41a; }
.lead-remark { padding-top: 16rpx; margin-top: 16rpx; border-top: 1rpx solid #f0f0f0; }
.remark-text { font-size: 24rpx; color: #888; }

.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>