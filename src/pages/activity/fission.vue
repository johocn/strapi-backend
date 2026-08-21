<template>
  <view class="page-container">
    <PageHeader title="裂变榜">
      <view class="header-right">
        <button class="btn-query" @click="loadData">查询</button>
      </view>
    </PageHeader>

    <view class="filter-section">
      <view class="filter-row">
        <view class="filter-item">
          <text class="filter-label">开始</text>
          <picker mode="date" :value="startDate" @change="e => startDate = e.detail.value">
            <view class="picker-value">
              <text :class="{ empty: !startDate }">{{ startDate || '请选择' }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
        <view class="filter-item">
          <text class="filter-label">结束</text>
          <picker mode="date" :value="endDate" @change="e => endDate = e.detail.value">
            <view class="picker-value">
              <text :class="{ empty: !endDate }">{{ endDate || '请选择' }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>
    </view>

    <view class="board-list" v-if="!loading && list.length > 0">
      <view v-for="row in list" :key="row.key" class="board-card">
        <view class="board-row" @click="toggleDetail(row)">
          <view class="rank">
            <text class="rank-num">{{ row.rank ?? '-' }}</text>
          </view>
          <view class="board-info">
            <text class="board-name">{{ shareName(row) }}</text>
            <view class="board-stats">
              <text class="stat-item">带来报名: {{ row.inviteeCount ?? '-' }}</text>
              <text class="stat-item">发放积分: {{ row.totalPoints ?? '-' }}</text>
            </view>
          </view>
          <text class="board-toggle">{{ expandedKey === row.key ? '收起' : '详情' }}</text>
        </view>
        <view v-if="expandedKey === row.key" class="board-detail">
          <view class="detail-item" v-for="(d, di) in row.details" :key="di">
            <text class="detail-main">{{ d.activity || '-' }}</text>
            <text class="detail-sub">
              {{ d.points ?? 0 }} 积分 · {{ formatTime(d.issuedAt ?? d.time) }}
            </text>
          </view>
          <view v-if="!row.details || row.details.length === 0" class="detail-empty">暂无明细</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && list.length === 0" class="empty-state">
      <text class="empty-icon">🏆</text>
      <text class="empty-text">暂无裂变数据</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getShareLeaderboard } from '../../api/activity.js'
import PageHeader from '../../components/PageHeader.vue'

const startDate = ref('')
const endDate = ref('')
const list = ref([])
const loading = ref(false)
const expandedKey = ref('')

function shareName(row) {
  return row.username || row.leaderName || row.shareName || row.sharerName || row.userName || row.name || (row.user?.name ?? '-')
}

function formatTime(v) {
  if (!v) return '-'
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function normalizeRows(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.rows)) return data.rows
  if (data?.data && Array.isArray(data.data)) return data.data
  if (Array.isArray(data?.list)) return data.list
  if (Array.isArray(data?.records)) return data.records
  return []
}

function toggleDetail(row) {
  expandedKey.value = expandedKey.value === row.key ? '' : row.key
}

function rowKey(row, idx) {
  return row.documentId || row.id || row.leaderId || row.sharerId || String(idx)
}

async function loadData() {
  loading.value = true
  try {
    const params = {}
    if (startDate.value) params.start = startDate.value
    if (endDate.value) params.end = endDate.value
    const res = await getShareLeaderboard(params)
    list.value = normalizeRows(res).map((row, idx) => ({
      ...row,
      key: rowKey(row, idx),
      rank: row.rank ?? idx + 1,
      details: Array.isArray(row.details) ? row.details : (Array.isArray(row.records) ? row.records : [])
    }))
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onMounted(() => loadData())
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
.filter-row { display: flex; gap: 20rpx; }
.filter-item { display: flex; align-items: center; gap: 12rpx; flex: 1; }
.filter-label { font-size: 26rpx; color: #666; }
.picker-value {
  flex: 1; display: flex; justify-content: space-between; align-items: center;
  padding: 12rpx 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx;
  min-height: 44rpx;
}
.picker-value.empty { color: #999; }
.arrow { font-size: 20rpx; color: #999; }

.board-list { display: flex; flex-direction: column; gap: 16rpx; }
.board-card { background: #fff; border-radius: 12rpx; overflow: hidden; }
.board-row { display: flex; align-items: center; gap: 20rpx; padding: 24rpx; }
.rank { width: 60rpx; height: 60rpx; border-radius: 50%; background: #f0f2ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rank-num { font-size: 28rpx; font-weight: bold; color: #667eea; }
.board-info { flex: 1; min-width: 0; }
.board-name { font-size: 30rpx; font-weight: bold; color: #333; }
.board-stats { display: flex; gap: 24rpx; margin-top: 8rpx; }
.stat-item { font-size: 24rpx; color: #999; }
.board-toggle { font-size: 24rpx; color: #667eea; flex-shrink: 0; }
.board-detail { border-top: 1rpx solid #f0f0f0; padding: 20rpx 24rpx; background: #fafbfe; }
.detail-item { padding: 12rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.detail-item:last-child { border-bottom: none; }
.detail-main { display: block; font-size: 26rpx; color: #333; }
.detail-sub { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.detail-empty { font-size: 24rpx; color: #999; text-align: center; padding: 12rpx 0; }

.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }
</style>