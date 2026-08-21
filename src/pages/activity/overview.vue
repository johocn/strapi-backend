<template>
  <view class="page-container">
    <PageHeader title="活动效果">
      <view class="header-right">
        <button class="btn-query" @click="loadData">刷新</button>
      </view>
    </PageHeader>

    <view class="cards">
      <view class="card" v-for="c in cards" :key="c.label">
        <text class="card-num">{{ c.value }}</text>
        <text class="card-label">{{ c.label }}</text>
      </view>
      <view class="tip">*签到发放积分为全站加总（积分流水无活动维度）</view>
    </view>

    <view class="filter-row">
      <view v-for="opt in statusOptions" :key="opt.value" class="chip"
        :class="{ active: status === opt.value }" @click="setStatus(opt.value)">
        {{ opt.label }}
      </view>
    </view>

    <view class="board-list" v-if="!loading && rows.length > 0">
      <view v-for="(row, idx) in rows" :key="keyOf(row, idx)" class="board-card">
        <view class="board-row" @click="toggleDetail(row, idx)">
          <view class="badge" :class="row.type">{{ row.type === 'series' ? '系列' : '活动' }}</view>
          <view class="board-info">
            <text class="board-name">{{ row.title || '-' }}</text>
            <view class="board-stats">
              <text class="stat-item">报名 {{ row.signupCount ?? '-' }}</text>
              <text class="stat-item">到场 {{ row.attendedCount ?? '-' }} ({{ row.attendanceRate ?? '-' }}%)</text>
              <text class="stat-item">均分 {{ fmtNum(row.avgRating) }}</text>
              <text class="stat-item">实收 {{ row.pointsChargedSum ?? '-' }}</text>
            </view>
          </view>
          <text class="board-toggle">{{ expandedKey === keyOf(row, idx) ? '收起' : '展开' }}</text>
        </view>

        <view v-if="expandedKey === keyOf(row, idx)" class="board-detail">
          <!-- series: 场次级 -->
          <template v-if="row.type === 'series'">
            <view class="detail-item" v-for="(d, di) in row.detail" :key="di">
              <text class="detail-main">{{ d.title || '-' }}</text>
              <text class="detail-sub">
                报名 {{ d.signupCount ?? '-' }} · 到场 {{ d.attendedCount ?? '-' }} ·
                均分 {{ fmtNum(d.avgRating) }} · NPS {{ fmtNum(d.avgNps) }} ·
                裂变 {{ d.referralCount ?? '-' }} · {{ fmtTime(d.startTime) }}
              </text>
            </view>
          </template>
          <!-- activity: reviews / referrers / signups -->
          <template v-else>
            <view class="detail-sec">评价 ({{ (row.detail.reviews || []).length }})</view>
            <view class="detail-item" v-for="(rv, ri) in row.detail.reviews" :key="'r' + ri">
              <text class="detail-main">{{ rv.userName || '-' }} · 评分 {{ rv.rating ?? '-' }} · NPS {{ rv.nps ?? '-' }}</text>
              <text class="detail-sub">{{ rv.review || '(无文字)' }} · {{ fmtTime(rv.reviewedAt) }}</text>
            </view>
            <view class="detail-sec">裂变推荐</view>
            <view class="detail-item" v-for="(rf, fi) in row.detail.referrers" :key="'f' + fi">
              <text class="detail-main">{{ rf.userName || '-' }} · 带来 {{ rf.inviteeCount ?? 0 }} 人 · {{ rf.points ?? 0 }} 积分</text>
            </view>
            <view class="detail-sec">报名名单 ({{ row.detail.signupTotal ?? (row.detail.signups || []).length }})</view>
            <view class="detail-item" v-for="(su, si) in row.detail.signups" :key="'s' + si">
              <text class="detail-main">{{ su.userName || '-' }} · {{ su.status }}</text>
              <text class="detail-sub">{{ su.attendedAt ? '已到场 ' + fmtTime(su.attendedAt) : '未到场' }}</text>
            </view>
            <view v-if="!row.detail.reviews.length && !row.detail.referrers.length && !row.detail.signups.length" class="detail-empty">暂无明细</view>
          </template>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && rows.length === 0" class="empty-state">
      <text class="empty-text">暂无活动数据</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getActivityOverview } from '../../api/activity.js'
import PageHeader from '../../components/PageHeader.vue'

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '草稿', value: 'draft' },
  { label: '报名中', value: 'signup_open' },
  { label: '进行中', value: 'ongoing' },
  { label: '已结束', value: 'ended' },
]

const status = ref('all')
const summary = ref({})
const rows = ref([])
const loading = ref(false)
const expandedKey = ref('')

const cards = computed(() => {
  const s = summary.value || {}
  return [
    { label: '活动数', value: s.activityCount ?? 0 },
    { label: '总报名', value: s.signupCount ?? 0 },
    { label: '总到场', value: s.attendedCount ?? 0 },
    { label: '到场率', value: (s.attendanceRate ?? 0) + '%' },
    { label: '评价数', value: s.reviewCount ?? 0 },
    { label: '均分', value: fmtNum(s.avgRating) },
    { label: 'NPS', value: fmtNum(s.avgNps) },
    { label: '实收积分', value: s.pointsChargedSum ?? 0 },
    { label: '裂变奖励', value: s.referralPoints ?? 0 },
    { label: '签到发放*', value: s.attendPointsGlobal ?? 0 },
  ]
})

function fmtNum(v) {
  return (v === undefined || v === null || v === '') ? '-' : v
}
function fmtTime(v) {
  if (!v) return '-'
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function keyOf(row, idx) {
  return row.documentId || `${row.type}_${idx}`
}
function toggleDetail(row, idx) {
  const k = keyOf(row, idx)
  expandedKey.value = expandedKey.value === k ? '' : k
}
function setStatus(v) {
  status.value = v
  loadData()
}
async function loadData() {
  loading.value = true
  try {
    const res = await getActivityOverview({ status: status.value })
    const d = res && (res.data || res)
    summary.value = (d && d.summary) || {}
    rows.value = Array.isArray(d && d.rows) ? d.rows : []
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
.cards {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx;
  background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx;
}
.card { text-align: center; display: flex; flex-direction: column; gap: 8rpx; }
.card-num { font-size: 40rpx; font-weight: bold; color: #333; }
.card-label { font-size: 22rpx; color: #999; }
.tip { grid-column: 1 / -1; font-size: 20rpx; color: #bbb; }
.filter-row { display: flex; gap: 16rpx; flex-wrap: wrap; background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.chip {
  padding: 12rpx 28rpx; border-radius: 32rpx; font-size: 26rpx; color: #666;
  background: #f5f5f5;
}
.chip.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }
.board-list { display: flex; flex-direction: column; gap: 16rpx; }
.board-card { background: #fff; border-radius: 12rpx; overflow: hidden; }
.board-row { display: flex; align-items: center; gap: 20rpx; padding: 24rpx; }
.badge {
  width: 72rpx; height: 40rpx; border-radius: 8rpx; display: flex; align-items: center;
  justify-content: center; font-size: 22rpx; color: #fff; flex-shrink: 0;
}
.badge.series { background: #764ba2; }
.badge.activity { background: #667eea; }
.board-info { flex: 1; min-width: 0; }
.board-name { font-size: 30rpx; font-weight: bold; color: #333; display: block; }
.board-stats { display: flex; flex-wrap: wrap; gap: 20rpx; margin-top: 8rpx; }
.stat-item { font-size: 24rpx; color: #999; }
.board-toggle { font-size: 24rpx; color: #667eea; flex-shrink: 0; }
.board-detail { border-top: 1rpx solid #f0f0f0; padding: 20rpx 24rpx; background: #fafbfe; }
.detail-sec { font-size: 24rpx; color: #667eea; font-weight: bold; margin: 16rpx 0 8rpx; }
.detail-item { padding: 12rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.detail-item:last-child { border-bottom: none; }
.detail-main { display: block; font-size: 26rpx; color: #333; }
.detail-sub { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.detail-empty { font-size: 24rpx; color: #999; text-align: center; padding: 12rpx 0; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
