<template>
  <view class="page-container">
    <PageHeader title="选品需求榜" />

    <!-- 筛选 -->
    <view class="search-section">
      <view class="filter-row">
        <picker mode="selector" :range="channelNames" @change="handleChannelChange">
          <view class="filter-item">
            <text>{{ channelNames[channelIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <view class="search-box">
          <input v-model="roundKey" class="search-input" placeholder="周期（如 2026-W40）" @confirm="loadBoard" />
        </view>
        <view class="search-box">
          <input v-model="source" class="search-input" placeholder="投放来源（活动 documentId，可空）" @confirm="loadBoard" />
        </view>
        <button class="btn-primary" :loading="loading" @click="loadBoard">查询</button>
      </view>
    </view>

    <!-- summary -->
    <view class="summary-card">
      <view class="summary-item">
        <text class="summary-num">{{ summary.participants }}</text>
        <text class="summary-label">参与人数</text>
      </view>
      <view class="summary-item">
        <text class="summary-num">{{ summary.votes }}</text>
        <text class="summary-label">总票数</text>
      </view>
      <view class="summary-item">
        <text class="summary-num">{{ summary.products }}</text>
        <text class="summary-label">候选商品数</text>
      </view>
    </view>

    <!-- 榜表 -->
    <view class="board-head">
      <text class="board-title">选品榜</text>
      <button class="btn-export" :disabled="!selectedIds.length" @click="exportSelected">
        加入本周上架（导出 {{ selectedIds.length }}）
      </button>
    </view>

    <view v-if="errorMsg" class="empty-state">
      <text class="empty-icon">⚠️</text>
      <text class="empty-text">{{ errorMsg }}</text>
    </view>
    <view v-else-if="loading" class="loading"><text>加载中...</text></view>
    <view v-else-if="!rows.length" class="empty-state">
      <text class="empty-icon">📋</text>
      <text class="empty-text">本期暂无数据</text>
    </view>

    <view v-else class="board-list">
      <view v-for="row in rows" :key="row.productId" class="board-row">
        <view class="row-check" :class="{ on: isSelected(row.productId) }" @click="toggleRow(row.productId)">
          <text v-if="isSelected(row.productId)">✓</text>
        </view>
        <text class="row-rank">{{ row.rank }}</text>
        <view class="row-body">
          <view class="row-title">
            <text class="row-name">{{ row.productName || ('商品#' + row.productId) }}</text>
            <text v-if="row.collectionLabel" class="row-cat">{{ row.collectionLabel }}</text>
          </view>
          <view class="ratio-bar"><view class="ratio-fill" :style="{ width: ratioPercent(row) + '%' }"></view></view>
          <view class="variant-chips" v-if="row.variantBreakdown?.length">
            <text v-for="v in row.variantBreakdown" :key="v.variantId" class="variant-chip">{{ v.variantId }} ×{{ v.count }}</text>
          </view>
        </view>
        <view class="row-voters">
          <text class="voters-num">{{ row.voterCount }}</text>
          <text class="voters-label">人</text>
        </view>
      </view>
    </view>

    <!-- 隐藏需求 -->
    <view class="demands-section">
      <text class="board-title">隐藏需求</text>
      <view v-if="demands.length" class="demand-list">
        <view v-for="(d, di) in demands" :key="di" class="demand-item">
          <view class="demand-head">
            <text class="demand-user">{{ d.userLabel || '匿名' }}</text>
            <text class="demand-time">{{ fmtTime(d.createdAt) }}</text>
          </view>
          <text class="demand-text">{{ d.text }}</text>
        </view>
      </view>
      <text v-else class="demand-empty">暂无隐藏需求</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { fetchSurveyBoard } from '../../api/activity.js'
import { getAdminChannelList } from '../../api/channel.js'

// 当前 ISO 周（ISO 8601：周一为一周首日，含首个周四的那一周为第 1 周）
function currentIsoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

const channels = ref([])
const channelIndex = ref(0)
const channelNames = computed(() => ['全部渠道', ...channels.value.map(c => c.name || c.documentId || c.id)])

const roundKey = ref(currentIsoWeek())
const source = ref('')

const loading = ref(false)
const errorMsg = ref('')
const summary = ref({ participants: 0, votes: 0, products: 0 })
const rows = ref([])
const demands = ref([])
const selectedIds = ref([])

async function loadChannels() {
  try {
    const res = await getAdminChannelList({ pageSize: 200 })
    channels.value = (res?.list ?? res?.records ?? []).filter(Boolean)
  } catch { channels.value = [] }
}

function handleChannelChange(e) { channelIndex.value = Number(e.detail.value) || 0 }

async function loadBoard() {
  errorMsg.value = ''
  if (!/^\d{4}-W\d{2}$/.test(roundKey.value.trim())) {
    errorMsg.value = '周期格式应为 YYYY-Www（如 2026-W40）'
    return
  }
  loading.value = true
  selectedIds.value = []
  try {
    const params = { roundKey: roundKey.value.trim() }
    if (channelIndex.value > 0) {
      const ch = channels.value[channelIndex.value - 1]
      // 后端 channelScope.channelIds 是数字渠道 id，必须传 id（传 documentId 会 403/查不到）
      params.channel = ch?.id ?? ch?.documentId
    }
    if (source.value.trim()) params.source = source.value.trim()
    const data = await fetchSurveyBoard(params)
    summary.value = data?.summary || { participants: 0, votes: 0, products: 0 }
    rows.value = Array.isArray(data?.rows) ? data.rows : []
    demands.value = Array.isArray(data?.demands) ? data.demands : []
  } catch (e) {
    rows.value = []
    demands.value = []
    summary.value = { participants: 0, votes: 0, products: 0 }
    errorMsg.value = e?.message || '查询失败'
  } finally {
    loading.value = false
  }
}

function isSelected(id) { return selectedIds.value.includes(String(id)) }
function toggleRow(id) {
  const key = String(id)
  const i = selectedIds.value.indexOf(key)
  if (i >= 0) selectedIds.value.splice(i, 1)
  else selectedIds.value.push(key)
}

const ratioPercent = row => Math.round((Number(row?.ratio) || 0) * 100)

// 只做导出：复制「商品id / 名称 / 品类」清单；榜单无 slug，slug 由运营在 Vendure 自查
function exportSelected() {
  if (!selectedIds.value.length) return
  const lines = rows.value
    .filter(r => isSelected(r.productId))
    .map(r => `${r.productId}\t${r.productName || ''}\t${r.collectionLabel || ''}`)
  uni.setClipboardData({
    data: lines.join('\n'),
    success: () => uni.showToast({ title: '已复制上架清单', icon: 'success' }),
    fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
  })
}

function fmtTime(v) {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(() => { loadChannels(); loadBoard() })
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.btn-primary {
  background: #ff0000; color: #fff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}

.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.filter-row { display: flex; flex-wrap: wrap; gap: 16rpx; align-items: center; }
.filter-item {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx;
}
.arrow { font-size: 20rpx; color: #999; }
.search-box {
  display: flex; align-items: center; background: #f5f5f5;
  border-radius: 8rpx; padding: 0 20rpx;
}
.search-input { height: 72rpx; font-size: 26rpx; min-width: 260rpx; }

.summary-card {
  display: flex; background: #fff; border-radius: 12rpx; padding: 30rpx 0; margin-bottom: 20rpx;
}
.summary-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
.summary-num { font-size: 44rpx; font-weight: bold; color: #333; }
.summary-label { font-size: 24rpx; color: #999; margin-top: 8rpx; }

.board-head {
  display: flex; justify-content: space-between; align-items: center;
  margin: 0 0 16rpx;
}
.board-title { font-size: 30rpx; font-weight: bold; color: #333; }
.btn-export {
  background: #07c160; color: #fff; font-size: 26rpx; padding: 12rpx 24rpx;
  border-radius: 8rpx; border: none; line-height: 1.2;
}
.btn-export[disabled] { background: #f5f5f5; color: #999; }

.board-list { display: flex; flex-direction: column; gap: 16rpx; }
.board-row {
  display: flex; align-items: center; gap: 16rpx;
  background: #fff; border-radius: 12rpx; padding: 24rpx;
}
.row-check {
  width: 40rpx; height: 40rpx; flex-shrink: 0; border: 2rpx solid #d9d9d9; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #fff;
}
.row-check.on { background: #07c160; border-color: #07c160; }
.row-rank { font-size: 32rpx; font-weight: bold; color: #667eea; width: 48rpx; text-align: center; flex-shrink: 0; }
.row-body { flex: 1; min-width: 0; }
.row-title { display: flex; align-items: center; gap: 12rpx; }
.row-name { font-size: 30rpx; font-weight: bold; color: #333; }
.row-cat { font-size: 22rpx; color: #667eea; background: #f0f4ff; padding: 2rpx 12rpx; border-radius: 6rpx; }
.ratio-bar { height: 12rpx; background: #f5f5f5; border-radius: 6rpx; margin-top: 14rpx; overflow: hidden; }
.ratio-fill { height: 100%; background: #ff0000; border-radius: 6rpx; }
.variant-chips { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 12rpx; }
.variant-chip { font-size: 22rpx; color: #999; background: #f5f5f5; padding: 2rpx 12rpx; border-radius: 6rpx; }
.row-voters { flex-shrink: 0; display: flex; align-items: baseline; }
.voters-num { font-size: 36rpx; font-weight: bold; color: #333; }
.voters-label { font-size: 22rpx; color: #999; margin-left: 2rpx; }

.demands-section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-top: 24rpx; }
.demand-list { display: flex; flex-direction: column; gap: 16rpx; margin-top: 16rpx; }
.demand-item { border-bottom: 1rpx solid #f0f0f0; padding-bottom: 12rpx; }
.demand-item:last-child { border-bottom: none; padding-bottom: 0; }
.demand-head { display: flex; justify-content: space-between; align-items: center; }
.demand-user { font-size: 26rpx; color: #667eea; }
.demand-time { font-size: 22rpx; color: #999; }
.demand-text { display: block; font-size: 28rpx; color: #333; margin-top: 8rpx; line-height: 1.5; }
.demand-empty { display: block; font-size: 26rpx; color: #999; padding: 20rpx 0; }

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0;
}
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; text-align: center; padding: 0 40rpx; }
</style>