<template>
  <view class="page-container">
    <PageHeader title="指标看板" />

    <view class="filter-section">
      <view class="form-item">
        <text class="form-label">选择产品</text>
        <picker mode="selector" :range="productNames" @change="handleProductChange">
          <view class="picker-value">
            <text>{{ selectedProductName || '请选择产品' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="form-label">周期</text>
        <view class="period-tabs">
          <text
            v-for="p in periods"
            :key="p.key"
            class="period-tab"
            :class="{ active: period === p.key }"
            @click="period = p.key; loadMetrics()"
          >{{ p.label }}</text>
        </view>
      </view>
    </view>

    <view v-if="metrics" class="metrics-content">
      <view class="annual-highlight">
        <text class="annual-label">{{ periodLabel }}年化收益</text>
        <text class="annual-value" :class="getAnnualClass(metrics.annualizedReturn)">
          {{ formatPercent(metrics.annualizedReturn) }}
        </text>
        <text class="annual-sub">历史业绩不预示未来收益</text>
      </view>

      <view class="trend-section">
        <view class="section-title">年化趋势</view>
        <view class="trend-chart">
          <view v-for="(point, idx) in trend" :key="idx" class="trend-bar-wrapper">
            <view class="trend-bar-bg">
              <view
                class="trend-bar"
                :class="getAnnualClass(point.value)"
                :style="{ height: getBarHeight(point.value) }"
              ></view>
            </view>
            <text class="trend-date">{{ formatDateShort(point.date) }}</text>
          </view>
          <view v-if="trend.length === 0" class="empty-row">暂无趋势数据</view>
        </view>
      </view>

      <view class="risk-section">
        <view class="section-title">风险指标</view>
        <view class="risk-grid">
          <view class="risk-card">
            <text class="risk-label">波动率</text>
            <text class="risk-value">{{ formatPercent(metrics.volatility) }}</text>
          </view>
          <view class="risk-card">
            <text class="risk-label">最大回撤</text>
            <text class="risk-value down">{{ formatPercent(metrics.maxDrawdown) }}</text>
          </view>
          <view class="risk-card">
            <text class="risk-label">Calmar 比率</text>
            <text class="risk-value">{{ formatNumber(metrics.calmarRatio) }}</text>
          </view>
          <view class="risk-card">
            <text class="risk-label">同类排名</text>
            <text class="risk-value" :class="getRankClass(metrics.peerRankPercentile)">
              前 {{ formatPercent(metrics.peerRankPercentile) }}
            </text>
          </view>
        </view>
      </view>

      <view class="nav-section">
        <view class="section-title">最新净值</view>
        <view class="nav-row">
          <view class="nav-item">
            <text class="nav-label">单位净值</text>
            <text class="nav-value">{{ metrics.latestNav?.unitNav || '--' }}</text>
          </view>
          <view class="nav-item">
            <text class="nav-label">累计净值</text>
            <text class="nav-value">{{ metrics.latestNav?.accumNav || '--' }}</text>
          </view>
          <view class="nav-item">
            <text class="nav-label">净值日期</text>
            <text class="nav-value">{{ metrics.latestNav?.navDate || '--' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-icon">📊</text>
      <text class="empty-text">请选择产品查看指标</text>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>

    <view class="footer-disclaimer">理财非存款，产品有风险，投资需谨慎</view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAdminProductList, getRiskMetrics, getRiskTrend } from '../../../api/wealth.js'

const products = ref([])
const productNames = computed(() => products.value.map(p => p.productName))
const selectedProductName = computed(() => {
  if (!selectedProductId.value) return ''
  return products.value.find(p => p.id === selectedProductId.value)?.productName || ''
})
const selectedProductId = ref(null)

const periods = [
  { key: 'd1', label: '1日' },
  { key: 'd3', label: '3日' },
  { key: 'w1', label: '1周' },
  { key: 'w2', label: '2周' },
  { key: 'm1', label: '1月' },
  { key: 'm3', label: '3月' },
  { key: 'm6', label: '6月' },
  { key: 'y1', label: '1年' }
]
const period = ref('m1')
const periodLabel = computed(() => periods.find(p => p.key === period.value)?.label || '')

const metrics = ref(null)
const trend = ref([])
const loading = ref(false)
const maxAbsValue = computed(() => {
  if (trend.value.length === 0) return 1
  return Math.max(...trend.value.map(p => Math.abs(p.value || 0)), 0.01)
})

function formatPercent(val) {
  if (val === null || val === undefined) return '--'
  return (val * 100).toFixed(2) + '%'
}
function formatNumber(val) {
  if (val === null || val === undefined) return '--'
  return Number(val).toFixed(2)
}
function formatDateShort(dateStr) {
  if (!dateStr) return ''
  return dateStr.slice(5)
}
function getAnnualClass(val) {
  if (val > 0) return 'up'
  if (val < 0) return 'down'
  return 'flat'
}
function getRankClass(val) {
  if (val === null || val === undefined) return 'flat'
  if (val < 0.25) return 'up'
  if (val > 0.5) return 'down'
  return 'flat'
}
function getBarHeight(val) {
  if (val === null || val === undefined) return '0%'
  const pct = Math.abs(val) / maxAbsValue.value * 100
  return pct + '%'
}

function handleProductChange(e) {
  selectedProductId.value = products.value[e.detail.value]?.id || null
  loadMetrics()
}

async function loadProducts() {
  try {
    const res = await getAdminProductList({ page: 1, pageSize: 200 })
    products.value = res.list || []
  } catch (e) {
    console.error('loadProducts', e)
  }
}

async function loadMetrics() {
  if (!selectedProductId.value) return
  loading.value = true
  try {
    const [m, t] = await Promise.all([
      getRiskMetrics(selectedProductId.value, { period: period.value }),
      getRiskTrend(selectedProductId.value, { period: period.value })
    ])
    metrics.value = m
    trend.value = t?.points || t?.list || []
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProducts()
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.filter-section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.form-item { margin-bottom: 20rpx; }
.form-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 10rpx; }
.picker-value {
  display: flex; justify-content: space-between; align-items: center;
  height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx;
}
.picker-arrow { font-size: 20rpx; color: #999; }

.period-tabs { display: flex; flex-wrap: wrap; gap: 12rpx; }
.period-tab {
  padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx;
  font-size: 26rpx; color: #666;
}
.period-tab.active { background: #667eea; color: #fff; }

.annual-highlight {
  background: #fff; border-radius: 12rpx; padding: 40rpx; text-align: center; margin-bottom: 20rpx;
}
.annual-label { font-size: 26rpx; color: #999; display: block; }
.annual-value { font-size: 64rpx; font-weight: bold; display: block; margin: 12rpx 0; }
.annual-value.up { color: #f5222d; }
.annual-value.down { color: #07c160; }
.annual-value.flat { color: #999; }
.annual-sub { font-size: 22rpx; color: #ccc; display: block; }

.trend-section, .risk-section, .nav-section {
  background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx;
}
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; }

.trend-chart {
  display: flex; align-items: flex-end; gap: 8rpx; height: 280rpx;
  overflow-x: auto; padding-bottom: 30rpx;
}
.trend-bar-wrapper { display: flex; flex-direction: column; align-items: center; min-width: 40rpx; height: 100%; }
.trend-bar-bg {
  flex: 1; width: 100%; display: flex; align-items: flex-end;
  justify-content: center; background: #f9f9f9; border-radius: 4rpx;
}
.trend-bar { width: 60%; min-height: 4rpx; border-radius: 4rpx 4rpx 0 0; }
.trend-bar.up { background: #f5222d; }
.trend-bar.down { background: #07c160; }
.trend-bar.flat { background: #ccc; }
.trend-date { font-size: 18rpx; color: #999; margin-top: 8rpx; }

.risk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.risk-card { background: #f9f9f9; border-radius: 8rpx; padding: 24rpx; text-align: center; }
.risk-label { font-size: 24rpx; color: #999; display: block; }
.risk-value { font-size: 36rpx; font-weight: bold; color: #333; display: block; margin-top: 8rpx; }
.risk-value.up { color: #f5222d; }
.risk-value.down { color: #07c160; }

.nav-row { display: flex; justify-content: space-between; }
.nav-item { text-align: center; flex: 1; }
.nav-label { font-size: 24rpx; color: #999; display: block; }
.nav-value { font-size: 30rpx; color: #333; font-weight: bold; display: block; margin-top: 8rpx; }

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0;
}
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }
.empty-row { text-align: center; padding: 40rpx; color: #999; font-size: 26rpx; }

.footer-disclaimer {
  text-align: center; padding: 30rpx 0; color: #999;
  font-size: 22rpx;
}
</style>
