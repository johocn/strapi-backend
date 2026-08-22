<template>
  <view class="page-container">
    <PageHeader title="经营对账">
      <view class="header-right">
        <button class="btn-query" @click="handleQuery">查询</button>
      </view>
    </PageHeader>

    <view class="filter-section">
      <view class="filter-row">
        <view class="filter-item">
          <text class="filter-label">活动ID</text>
          <input
            class="filter-input"
            v-model="activityFilter"
            placeholder="活动 documentId，留空查全部"
            confirm-type="search"
            @confirm="handleQuery"
          />
        </view>
      </view>
    </view>

    <view class="board-list" v-if="!loading && rows.length > 0">
      <view v-for="(row, idx) in rows" :key="keyOf(row, idx)" class="board-card">
        <view class="board-head">
          <view class="badge" :class="row.source">{{ row.source === 'manual' ? '手动' : '自动' }}</view>
          <view class="board-info">
            <text class="board-name">{{ row.activityTitle || '-' }}</text>
            <view class="board-sub">
              <text>快照 #{{ row.snapshotNo ?? '-' }}</text>
              <text class="dot">·</text>
              <text>{{ formatTime(row.generatedAt) }}</text>
            </view>
          </view>
          <text class="board-toggle" @click="toggleDetail(row, idx)">
            {{ expandedKey === keyOf(row, idx) ? '收起' : '详情' }}
          </text>
        </view>

        <view class="points-grid">
          <view class="point-item">
            <text class="point-num positive">{{ row.revenuePoints ?? 0 }}</text>
            <text class="point-label">应收报名</text>
          </view>
          <view class="point-item">
            <text class="point-num">{{ row.signinCostPoints ?? 0 }}</text>
            <text class="point-label">签到发放</text>
          </view>
          <view class="point-item">
            <text class="point-num">{{ row.referralCostPoints ?? 0 }}</text>
            <text class="point-label">裂变奖励</text>
          </view>
          <view class="point-item">
            <text class="point-num net" :class="{ negative: (row.netPoints ?? 0) < 0 }">{{ row.netPoints ?? 0 }}</text>
            <text class="point-label">净收支</text>
          </view>
        </view>

        <view class="points-grid cash-grid">
          <view class="point-item">
            <text class="point-num">{{ row.cashRevenue ?? 0 }}</text>
            <text class="point-label">现金应收</text>
          </view>
          <view class="point-item">
            <text class="point-num">{{ row.cashExpense ?? 0 }}</text>
            <text class="point-label">讲师/场地费</text>
          </view>
          <view class="point-item">
            <text class="point-num net" :class="{ negative: (row.cashNet ?? 0) < 0 }">{{ row.cashNet ?? 0 }}</text>
            <text class="point-label">现金净额</text>
          </view>
        </view>

        <view class="summary-row" v-if="row.summary">
          <text class="summary-item">报名 {{ row.summary.signupCount ?? 0 }}</text>
          <text class="summary-item">到场 {{ row.summary.attendedCount ?? 0 }}</text>
          <text class="summary-item">取消 {{ row.summary.cancelledCount ?? 0 }}</text>
          <text class="summary-item">候补 {{ row.summary.waitingCount ?? 0 }}</text>
          <text class="summary-item" :class="row.settleStatus === 'settled' ? 'settled' : 'pending'">{{ row.settleStatus === 'settled' ? '已结算' : '待结算' }}</text>
        </view>

        <view class="board-actions">
          <view class="action-btn primary" @click="handleRegenerate(row)">手动重归档</view>
          <view class="action-btn quiet" @click="handleSettle(row)">
            {{ row.settleStatus === 'settled' ? '回退未结' : '标记已结算' }}
          </view>
        </view>

        <view v-if="expandedKey === keyOf(row, idx)" class="board-detail">
          <view class="detail-sec">报名明细 ({{ (row.detail?.signups || []).length }})</view>
          <view class="detail-item" v-for="(d, di) in row.detail?.signups || []" :key="'s' + di">
            <text class="detail-main">{{ d.userName || '-' }}</text>
            <text class="detail-sub">应收 {{ d.pointsCharged ?? 0 }} 积分</text>
          </view>
          <view class="detail-sec">到场明细 ({{ (row.detail?.attendees || []).length }})</view>
          <view class="detail-item" v-for="(d, di) in row.detail?.attendees || []" :key="'a' + di">
            <text class="detail-main">{{ d.userName || '-' }}</text>
            <text class="detail-sub">发放 {{ d.points ?? 0 }} 积分</text>
          </view>
          <view class="detail-sec">裂变奖励 ({{ (row.detail?.referrals || []).length }})</view>
          <view class="detail-item" v-for="(d, di) in row.detail?.referrals || []" :key="'r' + di">
            <text class="detail-main">邀请人 #{{ d.inviterId ?? '-' }}</text>
            <text class="detail-sub">{{ d.points ?? 0 }} 积分</text>
          </view>
          <view class="detail-sec">现金明细</view>
          <view class="detail-item" v-if="row.detail?.cash">
            <text class="detail-main">现金应收</text>
            <text class="detail-sub">{{ row.detail.cash.revenuePer?.cashPrice ?? 0 }}元 × {{ row.detail.cash.revenuePer?.activeCount ?? 0 }}人</text>
          </view>
          <view class="detail-item" v-if="row.detail?.cash?.lecturer && row.detail.cash.lecturer.cost > 0">
            <text class="detail-main">讲师费 {{ row.detail.cash.lecturer.source === 'activity' ? '(活动登记)' : (row.detail.cash.lecturer.source === 'lecturer' ? '(讲师主档)' : '(未配置)') }}</text>
            <text class="detail-sub">¥{{ row.detail.cash.lecturer.cost }}</text>
          </view>
          <view class="detail-item" v-if="row.detail?.cash?.venue && row.detail.cash.venue.cost > 0">
            <text class="detail-main">场地费 {{ row.detail.cash.venue.source === 'activity' ? '(活动登记)' : (row.detail.cash.venue.source === 'venue' ? '(场地主档)' : '(未配置)') }}</text>
            <text class="detail-sub">¥{{ row.detail.cash.venue.cost }}</text>
          </view>
          <view v-if="isEmptyDetail(row)" class="detail-empty">暂无明细</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && rows.length === 0" class="empty-state">
      <text class="empty-icon">🧾</text>
      <text class="empty-text">暂无台账数据</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getLedgers, regenerateLedger, settleLedger } from '../../api/activity.js'
import PageHeader from '../../components/PageHeader.vue'

const activityFilter = ref('')
const rows = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const expandedKey = ref('')
const regeneratingId = ref('')

const totalPages = computed(() => Math.ceil((pagination.value.total || 0) / (pagination.value.pageSize || 20)))

function formatTime(v) {
  if (!v) return '-'
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function keyOf(row, idx) {
  return row.documentId || `${row.activityDocumentId}_${row.snapshotNo ?? 0}_${idx}`
}

function toggleDetail(row, idx) {
  const k = keyOf(row, idx)
  expandedKey.value = expandedKey.value === k ? '' : k
}

function isEmptyDetail(row) {
  const d = row.detail
  return !d || (!(d.signups || []).length && !(d.attendees || []).length && !(d.referrals || []).length && !d.cash)
}

function handleQuery() {
  currentPage.value = 1
  loadData(1)
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { page, pageSize: pagination.value.pageSize }
    if (activityFilter.value) params.activityDocumentId = activityFilter.value.trim()
    const res = await getLedgers(params)
    rows.value = Array.isArray(res?.data) ? res.data : []
    pagination.value = res?.meta?.pagination || { page: 1, pageSize: pagination.value.pageSize, total: 0 }
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleRegenerate(row) {
  const id = row.activityDocumentId
  if (!id) {
    uni.showToast({ title: '缺少活动ID，无法重归档', icon: 'none' })
    return
  }
  uni.showModal({
    title: '手动重归档',
    content: `确定对「${row.activityTitle || id}」重新生成一张手动快照吗？`,
    success: (res) => { if (res.confirm) doRegenerate(row) }
  })
}

async function doRegenerate(row) {
  const id = row.activityDocumentId
  regeneratingId.value = id
  try {
    await regenerateLedger(id)
    uni.showToast({ title: '重归档成功', icon: 'success' })
    loadData(currentPage.value)
  } catch (e) {
    uni.showToast({ title: e.message || '重归档失败', icon: 'none' })
  } finally {
    regeneratingId.value = ''
  }
}

function handleSettle(row) {
  const id = row.documentId
  if (!id) {
    uni.showToast({ title: '缺少快照ID，无法结算', icon: 'none' })
    return
  }
  const next = row.settleStatus === 'settled' ? 'pending' : 'settled'
  const text = next === 'settled' ? '标记该快照为已结算？' : '将该快照回退为未结？'
  uni.showModal({
    title: '结算登记',
    content: text,
    success: (res) => { if (res.confirm) doSettle(id, next) }
  })
}

async function doSettle(id, next) {
  try {
    await settleLedger(id, next)
    uni.showToast({ title: next === 'settled' ? '已标记结算' : '已回退未结', icon: 'success' })
    loadData(currentPage.value)
  } catch (e) {
    uni.showToast({ title: e.message || '结算失败', icon: 'none' })
  }
}

onMounted(() => loadData(1))
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
.filter-row { display: flex; }
.filter-item { display: flex; align-items: center; gap: 12rpx; flex: 1; }
.filter-label { font-size: 26rpx; color: #666; flex-shrink: 0; }
.filter-input {
  flex: 1; padding: 12rpx 20rpx; background: #f5f5f5; border-radius: 8rpx;
  font-size: 26rpx; min-height: 44rpx;
}

.board-list { display: flex; flex-direction: column; gap: 16rpx; }
.board-card { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.board-head { display: flex; align-items: center; gap: 16rpx; }
.badge {
  width: 72rpx; height: 40rpx; border-radius: 8rpx; display: flex; align-items: center;
  justify-content: center; font-size: 22rpx; color: #fff; flex-shrink: 0;
}
.badge.auto { background: #667eea; }
.badge.manual { background: #764ba2; }
.board-info { flex: 1; min-width: 0; }
.board-name { font-size: 30rpx; font-weight: bold; color: #333; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.board-sub { display: flex; align-items: center; gap: 12rpx; margin-top: 6rpx; font-size: 24rpx; color: #999; }
.dot { color: #ccc; }
.board-toggle { font-size: 24rpx; color: #667eea; flex-shrink: 0; }

.points-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; margin-top: 20rpx; background: #fafbfe; border-radius: 12rpx; padding: 16rpx 8rpx; }
.points-grid.cash-grid { grid-template-columns: repeat(3, 1fr); margin-top: 8rpx; }
.point-item { display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.point-num { font-size: 30rpx; font-weight: bold; color: #333; }
.point-num.positive { color: #52c41a; }
.point-num.net { color: #fa8c16; }
.point-num.net.negative { color: #ff4d4f; }
.point-label { font-size: 20rpx; color: #999; }

.summary-row { display: flex; flex-wrap: wrap; gap: 20rpx; margin-top: 16rpx; }
.summary-item { font-size: 24rpx; color: #666; background: #f5f5f5; padding: 6rpx 16rpx; border-radius: 8rpx; }
.summary-item.settled { color: #52c41a; background: #f0fff4; }
.summary-item.pending { color: #fa8c16; background: #fffbe6; }

.board-actions { display: flex; margin-top: 16rpx; }
.action-btn {
  flex: 1; padding: 12rpx 0; border-radius: 8rpx; font-size: 26rpx; text-align: center;
  background: #f5f5f5; color: #333; font-weight: bold;
}
.action-btn.primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }
.action-btn.quiet { background: #f0f5ff; color: #667eea; margin-left: 16rpx; }

.board-detail { border-top: 1rpx solid #f0f0f0; padding: 8rpx 4rpx 0; margin-top: 16rpx; }
.detail-sec { font-size: 24rpx; color: #667eea; font-weight: bold; margin: 16rpx 0 8rpx; }
.detail-sec:first-child { margin-top: 12rpx; }
.detail-item { padding: 12rpx 0; border-bottom: 1rpx solid #f0f0f0; display: flex; justify-content: space-between; }
.detail-item:last-child { border-bottom: none; }
.detail-main { font-size: 26rpx; color: #333; }
.detail-sub { font-size: 22rpx; color: #999; }
.detail-empty { font-size: 24rpx; color: #999; text-align: center; padding: 12rpx 0; }

.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>