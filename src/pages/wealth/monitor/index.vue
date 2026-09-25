<template>
  <view class="page-container">
    <PageHeader title="净值监察" />

    <view class="summary-row">
      <view class="summary-card ok">
        <text class="summary-num">{{ summary.ok }}</text>
        <text class="summary-label">正常</text>
      </view>
      <view class="summary-card warning">
        <text class="summary-num">{{ summary.warning }}</text>
        <text class="summary-label">预警</text>
      </view>
      <view class="summary-card danger">
        <text class="summary-num">{{ summary.danger }}</text>
        <text class="summary-label">危险</text>
      </view>
      <view class="refresh-btn" @click="loadMonitor">
        <text class="refresh-text">刷新</text>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>

    <view v-for="item in list" :key="item.id" class="monitor-card">
      <view class="card-header">
        <view class="product-info">
          <text class="product-name">{{ item.productName }}</text>
          <text class="company-name">{{ item.companyName || '--' }}</text>
        </view>
        <text class="overall-tag" :class="item.overall">{{ overallLabel(item.overall) }}</text>
      </view>

      <view class="metric-row">
        <view class="metric-main">
          <view class="metric-head">
            <text class="status-dot" :class="item.navStatus"></text>
            <text class="metric-label">最新净值</text>
          </view>
          <text class="metric-value">{{ formatNav(item.latestNav?.unitNav) }}</text>
          <text class="metric-sub">
            {{ item.latestNav?.navDate || '暂无' }}
            <text v-if="item.navDaysBehind !== null && item.navDaysBehind > 0" class="stale-text">（滞后{{ item.navDaysBehind }}天）</text>
          </text>
        </view>
        <view class="metric-main">
          <view class="metric-head">
            <text class="status-dot" :class="item.annualStatus"></text>
            <text class="metric-label">年化收益(1月)</text>
          </view>
          <text class="metric-value" :class="percentClass(item.latestSnapshot?.annual1m)">{{ formatPercent(item.latestSnapshot?.annual1m) }}</text>
          <text class="metric-sub">{{ item.latestSnapshot?.snapshotDate || '未计算' }}</text>
        </view>
        <view class="metric-main">
          <view class="metric-head">
            <text class="status-dot" :class="item.riskStatus"></text>
            <text class="metric-label">风险指标</text>
          </view>
          <text class="metric-value small">{{ formatRisk(item.latestMetrics) }}</text>
          <text class="metric-sub">{{ item.latestMetrics?.snapshotDate || '未计算' }}</text>
        </view>
      </view>

      <view class="action-row">
        <view class="action-btn primary" @click="doCollect(item)">重新采集</view>
        <view class="action-btn" @click="doRecalc(item)">重算年化</view>
        <view class="action-btn" @click="doRiskRecalc(item)">风险重算</view>
      </view>
    </view>

    <view v-if="!loading && list.length === 0" class="empty-state">
      <text class="empty-text">暂无产品</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getProductMonitor, triggerCollect, recalculate, recalculateRiskMetric } from '../../../api/wealth.js'

const list = ref([])
const summary = ref({ ok: 0, warning: 0, danger: 0 })
const loading = ref(false)
const acting = ref(false)

function overallLabel(s) {
  return { ok: '正常', warning: '预警', danger: '危险' }[s] || '--'
}
function formatNav(v) {
  return v === null || v === undefined ? '--' : Number(v).toFixed(4)
}
function formatPercent(v) {
  return v === null || v === undefined ? '--' : (Number(v) * 100).toFixed(2) + '%'
}
function percentClass(v) {
  if (v === null || v === undefined) return ''
  return Number(v) >= 0 ? 'up' : 'down'
}
function formatRisk(m) {
  if (!m) return '--'
  const vol = m.volatility === null || m.volatility === undefined ? '--' : (Number(m.volatility) * 100).toFixed(2) + '%'
  const dd = m.maxDrawdown === null || m.maxDrawdown === undefined ? '--' : (Number(m.maxDrawdown) * 100).toFixed(2) + '%'
  return `波动${vol} 回撤${dd}`
}

async function loadMonitor() {
  loading.value = true
  try {
    const res = await getProductMonitor()
    list.value = res.list || []
    summary.value = res.summary || { ok: 0, warning: 0, danger: 0 }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function doCollect(item) {
  if (acting.value) return
  acting.value = true
  try {
    await triggerCollect({ productId: item.id })
    uni.showToast({ title: '采集任务已触发', icon: 'none' })
    loadMonitor()
  } catch (e) {
    uni.showToast({ title: '触发失败', icon: 'none' })
  } finally {
    acting.value = false
  }
}

async function doRecalc(item) {
  if (acting.value) return
  acting.value = true
  try {
    await recalculate({ productId: item.id })
    uni.showToast({ title: '年化重算已触发', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '触发失败', icon: 'none' })
  } finally {
    acting.value = false
  }
}

async function doRiskRecalc(item) {
  if (acting.value) return
  acting.value = true
  try {
    await recalculateRiskMetric({ productId: item.id, type: 'risk-metric' })
    uni.showToast({ title: '风险重算已触发', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '触发失败', icon: 'none' })
  } finally {
    acting.value = false
  }
}

onMounted(loadMonitor)
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.summary-row { display: flex; gap: 16rpx; margin-bottom: 20rpx; align-items: center; }
.summary-card {
  flex: 1; background: #fff; border-radius: 12rpx; padding: 24rpx 0;
  display: flex; flex-direction: column; align-items: center;
}
.summary-num { font-size: 44rpx; font-weight: bold; }
.summary-card.ok .summary-num { color: #07c160; }
.summary-card.warning .summary-num { color: #faad14; }
.summary-card.danger .summary-num { color: #f5222d; }
.summary-label { font-size: 24rpx; color: #999; margin-top: 6rpx; }
.refresh-btn {
  width: 120rpx; height: 96rpx; background: #667eea; color: #fff;
  border-radius: 12rpx; display: flex; align-items: center; justify-content: center;
}
.refresh-text { font-size: 26rpx; font-weight: bold; }

.monitor-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx;
  border-left: 8rpx solid #07c160;
}
.monitor-card:has(.overall-tag.warning) { border-left-color: #faad14; }
.monitor-card:has(.overall-tag.danger) { border-left-color: #f5222d; }

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.product-info { display: flex; flex-direction: column; flex: 1; margin-right: 16rpx; }
.product-name { font-size: 30rpx; font-weight: bold; color: #333; }
.company-name { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.overall-tag {
  padding: 6rpx 20rpx; border-radius: 20rpx; font-size: 22rpx; color: #fff; flex-shrink: 0;
}
.overall-tag.ok { background: #07c160; }
.overall-tag.warning { background: #faad14; }
.overall-tag.danger { background: #f5222d; }

.metric-row { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.metric-main {
  flex: 1; background: #f9f9f9; border-radius: 8rpx; padding: 16rpx;
  display: flex; flex-direction: column;
}
.metric-head { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.status-dot { width: 14rpx; height: 14rpx; border-radius: 50%; flex-shrink: 0; }
.status-dot.ok { background: #07c160; }
.status-dot.warning { background: #faad14; }
.status-dot.danger { background: #f5222d; }
.metric-label { font-size: 22rpx; color: #999; }
.metric-value { font-size: 30rpx; font-weight: bold; color: #333; }
.metric-value.small { font-size: 24rpx; line-height: 1.4; }
.metric-value.up { color: #f5222d; }
.metric-value.down { color: #07c160; }
.metric-sub { font-size: 20rpx; color: #aaa; margin-top: 6rpx; }
.stale-text { color: #faad14; }

.action-row { display: flex; gap: 16rpx; }
.action-btn {
  flex: 1; text-align: center; padding: 16rpx 0; border-radius: 8rpx;
  background: #f0f0f0; color: #333; font-size: 26rpx;
}
.action-btn.primary { background: #667eea; color: #fff; }

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0;
}
.empty-text { font-size: 28rpx; color: #999; }
</style>
