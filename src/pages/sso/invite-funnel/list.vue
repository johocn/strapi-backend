<template>
  <view class="page-container">
    <PageHeader title="邀请漏斗" />

    <view class="filter-bar">
      <picker :range="appOptions" @change="onAppChange">
        <view class="filter-select">应用：{{ appLabel }} ▾</view>
      </picker>
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
const appCode = ref('')
const apps = ref([])

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

async function loadData() {
  loading.value = true
  try {
    const data = await ssoInviteCodeApi.funnel(appCode.value ? { appCode: appCode.value } : {})
    summary.value = data?.summary || { totalOpens: 0, totalRegisters: 0, conversionRate: null }
    rows.value = data?.rows || []
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
