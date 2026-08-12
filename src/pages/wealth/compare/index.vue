<template>
  <view class="page-container">
    <PageHeader title="产品对比" />

    <view class="filter-section">
      <view class="form-item">
        <text class="form-label">选择产品（{{ selectedProducts.length }}/4）</text>
        <view class="product-picker" @click="showPicker = true">
          <text v-if="selectedProducts.length === 0" class="placeholder">点击选择 2-4 个产品</text>
          <view v-else class="selected-tags">
            <view v-for="p in selectedProducts" :key="p.id" class="selected-tag">
              <text class="tag-text">{{ p.productName }}</text>
              <text class="tag-remove" @click.stop="removeProduct(p)">×</text>
            </view>
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">对比周期</text>
        <view class="period-tabs">
          <text
            v-for="p in periods"
            :key="p.key"
            class="period-tab"
            :class="{ active: period === p.key }"
            @click="period = p.key; loadCompare()"
          >{{ p.label }}</text>
        </view>
      </view>

      <button
        class="btn-primary"
        :disabled="selectedProducts.length < 2 || loading"
        @click="loadCompare"
      >开始对比</button>
    </view>

    <view v-if="compareResult && compareResult.length > 0" class="compare-table">
      <view class="table-row header-row">
        <view class="table-cell label-cell">指标</view>
        <view
          v-for="item in compareResult"
          :key="item.productId"
          class="table-cell product-cell"
        >
          <text class="product-name">{{ item.productName }}</text>
          <text class="tag risk" :class="'risk-' + (item.riskLevel || 'R2').toLowerCase()">{{ item.riskLevel }}</text>
        </view>
      </view>

      <view class="table-row">
        <view class="table-cell label-cell">产品类型</view>
        <view v-for="item in compareResult" :key="item.productId" class="table-cell">
          {{ getTypeLabel(item.productType) }}
        </view>
      </view>

      <view class="table-row">
        <view class="table-cell label-cell">{{ periodLabel }}年化</view>
        <view
          v-for="item in compareResult"
          :key="item.productId"
          class="table-cell"
          :class="getCellClass(item.annualSnapshot?.annualizedReturn, 'annual', true)"
        >
          {{ formatPercent(item.annualSnapshot?.annualizedReturn) }}
          <text v-if="getMark(item.annualSnapshot?.annualizedReturn, 'annual', true)" class="mark">{{ getMark(item.annualSnapshot?.annualizedReturn, 'annual', true) }}</text>
        </view>
      </view>

      <view class="table-row">
        <view class="table-cell label-cell">近1年年化</view>
        <view
          v-for="item in compareResult"
          :key="item.productId"
          class="table-cell"
          :class="getCellClass(item.annualSnapshot?.y1Return, 'y1annual', true)"
        >
          {{ formatPercent(item.annualSnapshot?.y1Return) }}
          <text v-if="getMark(item.annualSnapshot?.y1Return, 'y1annual', true)" class="mark">{{ getMark(item.annualSnapshot?.y1Return, 'y1annual', true) }}</text>
        </view>
      </view>

      <view class="table-row">
        <view class="table-cell label-cell">最大回撤</view>
        <view
          v-for="item in compareResult"
          :key="item.productId"
          class="table-cell"
          :class="getCellClass(item.riskMetric?.maxDrawdown, 'drawdown', false)"
        >
          {{ formatPercent(item.riskMetric?.maxDrawdown) }}
          <text v-if="getMark(item.riskMetric?.maxDrawdown, 'drawdown', false)" class="mark">{{ getMark(item.riskMetric?.maxDrawdown, 'drawdown', false) }}</text>
        </view>
      </view>

      <view class="table-row">
        <view class="table-cell label-cell">波动率</view>
        <view
          v-for="item in compareResult"
          :key="item.productId"
          class="table-cell"
          :class="getCellClass(item.riskMetric?.volatility, 'volatility', false)"
        >
          {{ formatPercent(item.riskMetric?.volatility) }}
          <text v-if="getMark(item.riskMetric?.volatility, 'volatility', false)" class="mark">{{ getMark(item.riskMetric?.volatility, 'volatility', false) }}</text>
        </view>
      </view>

      <view class="table-row">
        <view class="table-cell label-cell">Calmar</view>
        <view
          v-for="item in compareResult"
          :key="item.productId"
          class="table-cell"
          :class="getCellClass(item.riskMetric?.calmarRatio, 'calmar', true)"
        >
          {{ formatNumber(item.riskMetric?.calmarRatio) }}
          <text v-if="getMark(item.riskMetric?.calmarRatio, 'calmar', true)" class="mark">{{ getMark(item.riskMetric?.calmarRatio, 'calmar', true) }}</text>
        </view>
      </view>

      <view class="table-row">
        <view class="table-cell label-cell">同类排名</view>
        <view
          v-for="item in compareResult"
          :key="item.productId"
          class="table-cell"
          :class="getCellClass(item.peerRankPercentile, 'rank', true)"
        >
          前 {{ formatPercent(item.peerRankPercentile) }}
          <text v-if="getMark(item.peerRankPercentile, 'rank', true)" class="mark">{{ getMark(item.peerRankPercentile, 'rank', true) }}</text>
        </view>
      </view>

      <view class="table-row">
        <view class="table-cell label-cell">最新净值</view>
        <view v-for="item in compareResult" :key="item.productId" class="table-cell">
          {{ item.latestNav?.unitNav || '--' }}
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>对比中...</text></view>

    <view v-if="!loading && !compareResult" class="empty-state">
      <text class="empty-icon">⚖️</text>
      <text class="empty-text">选择产品后点击"开始对比"</text>
    </view>

    <view class="footer-disclaimer">理财非存款，产品有风险，投资需谨慎</view>

    <view v-if="showPicker" class="picker-modal" @click="showPicker = false">
      <view class="picker-content" @click.stop>
        <view class="picker-header">
          <text class="picker-title">选择产品（{{ selectedProducts.length }}/4）</text>
          <text class="picker-close" @click="showPicker = false">完成</text>
        </view>
        <scroll-view scroll-y class="picker-list">
          <view
            v-for="p in products"
            :key="p.id"
            class="picker-item"
            :class="{ selected: isSelected(p), disabled: selectedProducts.length >= 4 && !isSelected(p) }"
            @click="toggleProduct(p)"
          >
            <text class="picker-item-name">{{ p.productName }}</text>
            <text class="tag risk" :class="'risk-' + (p.riskLevel || 'R2').toLowerCase()">{{ p.riskLevel || 'R2' }}</text>
            <text v-if="isSelected(p)" class="check-icon">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAdminProductList, compareProducts } from '../../../api/wealth.js'

const products = ref([])
const selectedProducts = ref([])
const showPicker = ref(false)
const loading = ref(false)
const compareResult = ref(null)

const periods = [
  { key: 'm1', label: '1月' },
  { key: 'm3', label: '3月' },
  { key: 'm6', label: '6月' },
  { key: 'y1', label: '1年' }
]
const period = ref('m1')
const periodLabel = computed(() => periods.find(p => p.key === period.value)?.label || '')

const typeMap = {
  'bank-wealth': '银行理财',
  'stock-fund': '股票基金',
  'bond-fund': '债券基金',
  'mixed-fund': '混合基金',
  'money-fund': '货币基金'
}

function getTypeLabel(type) { return typeMap[type] || type || '--' }
function formatPercent(val) {
  if (val === null || val === undefined) return '--'
  return (val * 100).toFixed(2) + '%'
}
function formatNumber(val) {
  if (val === null || val === undefined) return '--'
  return Number(val).toFixed(2)
}

function isSelected(p) {
  return selectedProducts.value.some(s => s.id === p.id)
}

function toggleProduct(p) {
  const idx = selectedProducts.value.findIndex(s => s.id === p.id)
  if (idx >= 0) {
    selectedProducts.value.splice(idx, 1)
  } else {
    if (selectedProducts.value.length >= 4) {
      uni.showToast({ title: '最多选择4个产品', icon: 'none' })
      return
    }
    selectedProducts.value.push(p)
  }
}

function removeProduct(p) {
  const idx = selectedProducts.value.findIndex(s => s.id === p.id)
  if (idx >= 0) selectedProducts.value.splice(idx, 1)
}

function getValues(field, subField) {
  if (!compareResult.value) return []
  return compareResult.value.map(item => {
    if (field === 'annual') return item.annualSnapshot?.annualizedReturn
    if (field === 'y1annual') return item.annualSnapshot?.y1Return
    if (field === 'drawdown') return item.riskMetric?.maxDrawdown
    if (field === 'volatility') return item.riskMetric?.volatility
    if (field === 'calmar') return item.riskMetric?.calmarRatio
    if (field === 'rank') return item.peerRankPercentile
    return null
  })
}

function getCellClass(val, field, higherBetter) {
  const values = getValues(field)
  const validValues = values.filter(v => v !== null && v !== undefined)
  if (validValues.length === 0 || val === null || val === undefined) return ''
  if (higherBetter) {
    if (val === Math.max(...validValues)) return 'best'
    if (val === Math.min(...validValues)) return 'worst'
  } else {
    if (val === Math.min(...validValues)) return 'best'
    if (val === Math.max(...validValues)) return 'worst'
  }
  return ''
}

function getMark(val, field, higherBetter) {
  const cellClass = getCellClass(val, field, higherBetter)
  if (cellClass === 'best') return '▲'
  if (cellClass === 'worst') return '▼'
  return ''
}

async function loadProducts() {
  try {
    const res = await getAdminProductList({ page: 1, pageSize: 200, status: true })
    products.value = res.list || []
  } catch (e) {
    console.error('loadProducts', e)
  }
}

async function loadCompare() {
  if (selectedProducts.value.length < 2) {
    uni.showToast({ title: '请至少选择2个产品', icon: 'none' })
    return
  }
  loading.value = true
  compareResult.value = null
  try {
    const ids = selectedProducts.value.map(p => p.id)
    const res = await compareProducts(ids, period.value)
    compareResult.value = res?.list || res?.items || (Array.isArray(res) ? res : [])
  } catch (e) {
    uni.showToast({ title: '对比失败', icon: 'none' })
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

.product-picker {
  background: #f5f5f5; border-radius: 8rpx; padding: 20rpx; min-height: 72rpx;
  display: flex; align-items: center;
}
.placeholder { font-size: 28rpx; color: #999; }
.selected-tags { display: flex; flex-wrap: wrap; gap: 8rpx; }
.selected-tag {
  display: flex; align-items: center; gap: 8rpx;
  background: #e6f0ff; padding: 8rpx 16rpx; border-radius: 6rpx;
}
.tag-text { font-size: 24rpx; color: #667eea; max-width: 200rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tag-remove { font-size: 28rpx; color: #999; }

.period-tabs { display: flex; gap: 12rpx; }
.period-tab { padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx; color: #666; }
.period-tab.active { background: #667eea; color: #fff; }

.btn-primary {
  width: 100%; background: #667eea; color: #fff; padding: 20rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none;
}
.btn-primary[disabled] { opacity: 0.5; }

.compare-table {
  background: #fff; border-radius: 12rpx; overflow: hidden; margin-bottom: 20rpx;
}
.table-row {
  display: flex; border-bottom: 1rpx solid #f0f0f0;
}
.table-row:last-child { border-bottom: none; }
.header-row { background: #f9f9f9; }
.table-cell {
  flex: 1; padding: 20rpx 12rpx; font-size: 26rpx; color: #333;
  text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8rpx;
  border-right: 1rpx solid #f0f0f0;
}
.table-cell:last-child { border-right: none; }
.label-cell {
  flex: 0 0 140rpx; font-weight: bold; color: #666; text-align: left;
  align-items: flex-start; font-size: 24rpx;
}
.product-cell { padding: 16rpx 8rpx; }
.product-name { font-size: 22rpx; font-weight: bold; line-height: 1.3; text-align: center; }

.tag { font-size: 20rpx; padding: 2rpx 8rpx; border-radius: 4rpx; }
.tag.risk { background: #fff7e6; color: #fa8c16; }
.tag.risk.r1 { background: #f6ffed; color: #52c41a; }
.tag.risk.r2 { background: #e6f7ff; color: #1890ff; }
.tag.risk.r3 { background: #fff7e6; color: #fa8c16; }
.tag.risk.r4 { background: #fff2e8; color: #fa541c; }
.tag.risk.r5 { background: #ffebee; color: #f5222d; }

.table-cell.best { background: #f6ffed; color: #52c41a; font-weight: bold; }
.table-cell.worst { background: #fff1f0; color: #ff4d4f; }
.mark { font-size: 20rpx; }
.mark.best { color: #52c41a; }
.mark.worst { color: #ff4d4f; }

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0;
}
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }

.footer-disclaimer {
  text-align: center; padding: 30rpx 0; color: #999;
  font-size: 22rpx;
}

.picker-modal {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 999;
  display: flex; align-items: flex-end;
}
.picker-content {
  background: #fff; border-radius: 16rpx 16rpx 0 0; width: 100%;
  max-height: 70vh; display: flex; flex-direction: column;
}
.picker-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24rpx; border-bottom: 1rpx solid #eee;
}
.picker-title { font-size: 30rpx; font-weight: bold; }
.picker-close { font-size: 30rpx; color: #667eea; }
.picker-list { max-height: 50vh; }
.picker-item {
  display: flex; align-items: center; gap: 12rpx;
  padding: 24rpx; border-bottom: 1rpx solid #f5f5f5;
}
.picker-item.selected { background: #f0f4ff; }
.picker-item.disabled { opacity: 0.4; }
.picker-item-name { flex: 1; font-size: 28rpx; color: #333; }
.check-icon { color: #667eea; font-size: 32rpx; }
</style>
