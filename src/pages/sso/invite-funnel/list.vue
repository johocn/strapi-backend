<template>
  <view class="page-container">
    <PageHeader title="邀请漏斗" />

    <view class="filter-bar">
      <picker :range="appOptions" @change="onAppChange">
        <view class="filter-select">应用：{{ appLabel }} ▾</view>
      </picker>
      <view class="range-group">
        <view
          v-for="opt in rangeOptions"
          :key="opt.value"
          class="range-btn"
          :class="{ active: rangeValue === opt.value }"
          @click="onRangeChange(opt.value)"
        >{{ opt.label }}</view>
      </view>
    </view>

    <view class="summary-bar">
      <view class="sum-cell">
        <view class="sum-num">{{ summary.totalOpens }}</view>
        <view class="sum-label">打开数</view>
      </view>
      <view class="sum-cell">
        <view class="sum-num">{{ summary.totalRegisters }}</view>
        <view class="sum-label">注册数</view>
      </view>
      <view class="sum-cell highlight">
        <view class="sum-num">{{ fmtRate(summary.conversionRate) }}</view>
        <view class="sum-label">打开→注册</view>
      </view>
    </view>

    <view v-if="daily.length > 0" class="daily-block">
      <view class="daily-title">按日趋势</view>
      <view v-for="d in daily" :key="d.date" class="daily-row">
        <text class="daily-date">{{ d.date.slice(5) }}</text>
        <view class="daily-bars">
          <view class="daily-bar opens"><view class="daily-fill opens" :style="{ width: dayWidth(d, 'opens') + '%' }"></view></view>
          <view class="daily-bar regs"><view class="daily-fill regs" :style="{ width: dayWidth(d, 'registers') + '%' }"></view></view>
        </view>
        <text class="daily-nums">{{ d.opens }} / {{ d.registers }}</text>
      </view>
      <view class="daily-legend"><text class="lg opens">■ 打开</text><text class="lg regs">■ 注册</text></view>
    </view>

    <view class="funnel-table">
      <view class="table-head">
        <text class="col-code">邀请码</text>
        <text class="col-num">打开</text>
        <text class="col-num">注册</text>
        <text class="col-rate">转化率</text>
      </view>
      <view v-for="row in rows" :key="row.code" class="table-row">
        <view class="col-code">
          <view class="code-text">{{ row.code }}</view>
          <view class="app-tag">{{ row.appCode || '-' }}</view>
        </view>
        <text class="col-num">{{ row.opens }}</text>
        <text class="col-num">{{ row.registers }}</text>
        <view class="col-rate">
          <text class="rate-text">{{ fmtRate(row.conversionRate) }}</text>
          <view class="rate-track">
            <view class="rate-fill" :style="{ width: ratePercent(row) + '%' }"></view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>

    <view v-if="!loading && rows.length === 0" class="empty-state">
      <text class="empty-icon">📈</text>
      <text class="empty-text">暂无邀请码数据</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ssoInviteCodeApi, getSsoAppList } from '../../../api/sso.js'
import PageHeader from '../../../components/PageHeader.vue'

const loading = ref(false)
const summary = ref({ totalOpens: 0, totalRegisters: 0, conversionRate: null, lastOpenAt: null })
const rows = ref([])
const daily = ref([])
const appCode = ref('')
const apps = ref([])
const rangeValue = ref('all')
const rangeOptions = [
  { label: '近7天', value: '7' },
  { label: '近30天', value: '30' },
  { label: '全部', value: 'all' },
]

const appOptions = computed(() => ['全部', ...apps.value.map((a) => a.app_code)])
const appLabel = computed(() => appCode.value || '全部')

const ratePercent = (row) => {
  if (!row.opens) return 0
  return Math.min(100, (row.registers / row.opens) * 100)
}

// 埋点上线前的历史注册没有对应打开记录，转化率可能 >100%，展示统一封顶 100%
const fmtRate = (rate) => (rate === null ? '—' : Math.min(100, rate) + '%')

function onAppChange(e) {
  const idx = Number(e.detail.value)
  appCode.value = idx === 0 ? '' : apps.value[idx - 1]?.app_code || ''
  loadData()
}

async function loadApps() {
  if (apps.value.length > 0) return
  try {
    const { list } = await getSsoAppList()
    apps.value = list || []
  } catch (e) { /* 筛选不可用时保持仅「全部」 */ }
}

function onRangeChange(v) {
  rangeValue.value = v
  loadData()
}

function dateParams() {
  if (rangeValue.value === 'all') return {}
  const days = Number(rangeValue.value)
  const end = new Date()
  const start = new Date(Date.now() - (days - 1) * 86400000)
  const fmt = (d) => d.toISOString().slice(0, 10)
  return { startDate: fmt(start), endDate: fmt(end) }
}

function dayWidth(d, key) {
  const max = Math.max(...daily.value.map((x) => Math.max(x.opens, x.registers)), 1)
  return (d[key] / max) * 100
}

async function loadData() {
  loading.value = true
  try {
    const params = { ...dateParams() }
    if (appCode.value) params.appCode = appCode.value
    const data = await ssoInviteCodeApi.funnel(params)
    summary.value = data?.summary || { totalOpens: 0, totalRegisters: 0, conversionRate: null }
    rows.value = data?.rows || []
    daily.value = data?.daily || []
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onShow(() => {
  loadApps()
  loadData()
})
</script>

<style scoped>
page {
  background: #f5f5f5;
}
.page-container {
  min-height: 100vh;
  padding: 20rpx;
  box-sizing: border-box;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.filter-select {
  display: inline-block;
  background: #fff;
  border-radius: 8rpx;
  padding: 14rpx 24rpx;
  font-size: 26rpx;
  color: #666;
}
.range-group {
  margin-left: auto;
  display: flex;
  gap: 8rpx;
}
.range-btn {
  font-size: 22rpx;
  color: #666;
  background: #fff;
  border-radius: 8rpx;
  padding: 10rpx 16rpx;
}
.range-btn.active {
  color: #fff;
  background: #07c160;
}

.daily-block {
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 20rpx;
}
.daily-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}
.daily-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.daily-date {
  width: 84rpx;
  font-size: 22rpx;
  color: #999;
}
.daily-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.daily-bar {
  height: 12rpx;
  background: #f5f5f5;
  border-radius: 6rpx;
  overflow: hidden;
}
.daily-fill.opens {
  height: 100%;
  background: #3b82f6;
}
.daily-fill.regs {
  height: 100%;
  background: #07c160;
}
.daily-nums {
  width: 90rpx;
  text-align: right;
  font-size: 22rpx;
  color: #333;
}
.daily-legend {
  display: flex;
  gap: 24rpx;
  font-size: 20rpx;
  color: #999;
}
.daily-legend .lg.opens {
  color: #3b82f6;
}
.daily-legend .lg.regs {
  color: #07c160;
}

.summary-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.sum-cell {
  flex: 1;
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx 0;
  text-align: center;
}
.sum-num {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
}
.sum-cell.highlight .sum-num {
  color: #07c160;
}
.sum-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}

.funnel-table {
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
}
.table-head,
.table-row {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
}
.table-head {
  background: #fafafa;
  border-bottom: 1rpx solid #eee;
  font-size: 24rpx;
  color: #999;
}
.table-row {
  border-bottom: 1rpx solid #f2f2f2;
}
.table-row:last-child {
  border-bottom: none;
}
.col-code {
  width: 34%;
  display: flex;
  flex-direction: column;
}
.col-num {
  width: 16%;
  text-align: center;
  font-size: 26rpx;
  color: #333;
}
.col-rate {
  width: 34%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.code-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  font-family: monospace;
  letter-spacing: 1rpx;
}
.app-tag {
  display: inline-block;
  font-size: 20rpx;
  color: #07c160;
  background: rgba(7, 193, 96, 0.1);
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
  margin-top: 6rpx;
  align-self: flex-start;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rate-text {
  font-size: 26rpx;
  color: #07c160;
  font-weight: bold;
}
.rate-track {
  width: 100rpx;
  height: 8rpx;
  background: #f0f0f0;
  border-radius: 4rpx;
  margin-top: 8rpx;
  overflow: hidden;
}
.rate-fill {
  height: 100%;
  background: #07c160;
  border-radius: 4rpx;
}

.loading,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}
.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #999;
}
</style>
