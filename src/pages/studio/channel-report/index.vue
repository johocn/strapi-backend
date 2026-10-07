<template>
  <view class="page-container">
    <PageHeader title="渠道报表" />

    <view class="card">
      <view class="card-label">推广渠道</view>
      <picker v-if="channels.length > 0" mode="selector" :range="channelNames" @change="onChannelChange" :value="channelIndex">
        <view class="picker-value">{{ channelNames[channelIndex] || '选择渠道' }}</view>
      </picker>
      <input
        v-else
        class="picker-value input-fallback"
        v-model="channelCode"
        placeholder="输入渠道编码（如 xxl-wechat）"
        @confirm="loadReport"
      />

      <view class="card-label" style="margin-top: 24rpx;">日期范围</view>
      <picker mode="selector" :range="dateRangeOptions" @change="onDateRangeChange" :value="dateRangeIndex">
        <view class="picker-value">{{ dateRangeOptions[dateRangeIndex] }}</view>
      </picker>
      <view v-if="dateRangeIndex === 3" class="custom-date-row">
        <picker mode="date" :value="customStartDate" @change="e => { customStartDate = e.detail.value; loadReport() }">
          <view class="picker-value">{{ customStartDate || '开始日期' }}</view>
        </picker>
        <text class="date-sep">至</text>
        <picker mode="date" :value="customEndDate" @change="e => { customEndDate = e.detail.value; loadReport() }">
          <view class="picker-value">{{ customEndDate || '结束日期' }}</view>
        </picker>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view class="tab-item" :class="{ active: activeTab === 'variant' }" @click="switchTab('variant')">变体对比</view>
      <view class="tab-item" :class="{ active: activeTab === 'overview' }" @click="switchTab('overview')">渠道总览</view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-else-if="!report" class="empty">
      <text class="empty-text">{{ emptyHint }}</text>
    </view>

    <template v-else>
      <!-- ============ 变体对比（A/B 文案） ============ -->
      <view v-if="activeTab === 'variant' && byVariant.length > 0" class="section">
        <view class="section-title">文案变体效果对比</view>
        <scroll-view scroll-x class="table-scroll">
          <view class="table">
            <view class="table-row table-head">
              <text class="th th-name">变体</text>
              <text class="th">曝光</text>
              <text class="th">点击</text>
              <text class="th">CTR</text>
              <text class="th">订单</text>
              <text class="th">佣金</text>
            </view>
            <view v-for="(row, idx) in byVariant" :key="row.variantId" class="table-row">
              <view class="td td-name">
                <view class="variant-name-row">
                  <text class="variant-name">{{ row.variantName }}</text>
                  <text v-if="idx === leadIndex" class="lead-tag">领先</text>
                </view>
                <text class="campaign-name">{{ row.campaignName || row.campaignCode }}</text>
              </view>
              <text class="td">{{ formatNum(row.impressions) }}</text>
              <text class="td">{{ formatNum(row.clicks) }}</text>
              <text class="td td-ctr" :class="{ lead: idx === leadIndex }">{{ formatPercent(row.ctr) }}</text>
              <text class="td">{{ formatNum(row.orders) }}</text>
              <text class="td">{{ formatCommission(row.matchedCommission) }}</text>
            </view>
          </view>
        </scroll-view>

        <!-- CTR 相对条 -->
        <view class="ctr-bars">
          <view v-for="(row, idx) in byVariant" :key="'bar-' + row.variantId" class="bar-item">
            <view class="bar-header">
              <text class="bar-label">{{ row.variantName }}</text>
              <text class="bar-value">{{ formatPercent(row.ctr) }}</text>
            </view>
            <view class="progress-bar">
              <view class="progress-fill" :class="{ lead: idx === leadIndex }" :style="{ width: ctrBarWidth(row.ctr) + '%' }"></view>
            </view>
          </view>
        </view>

        <view v-if="byVariant.length > 1 && leadIndex >= 0" class="conclusion">
          「{{ byVariant[leadIndex].variantName }}」点击率领先，可考虑提高其流量权重
        </view>
      </view>

      <view v-if="activeTab === 'variant' && byVariant.length === 0" class="empty">
        <text class="empty-text">该渠道暂无 A/B 实验变体数据</text>
      </view>

      <!-- ============ 渠道总览 ============ -->
      <template v-if="activeTab === 'overview'">
        <view class="section">
          <view class="section-title">转化漏斗</view>
          <view class="overview-grid">
            <view class="overview-card">
              <text class="overview-num">{{ formatNum(funnel.impressions) }}</text>
              <text class="overview-label">曝光</text>
            </view>
            <view class="overview-card">
              <text class="overview-num">{{ formatNum(funnel.adClicks) }}</text>
              <text class="overview-label">广告点击</text>
            </view>
            <view class="overview-card">
              <text class="overview-num">{{ formatNum(funnel.couponClicks) }}</text>
              <text class="overview-label">券点击</text>
            </view>
          </view>
          <view class="overview-grid">
            <view class="overview-card">
              <text class="overview-num">{{ formatNum(funnel.orders) }}</text>
              <text class="overview-label">订单</text>
            </view>
            <view class="overview-card">
              <text class="overview-num">{{ formatNum(funnel.paidOrders) }}</text>
              <text class="overview-label">已支付</text>
            </view>
          </view>
        </view>

        <view class="section">
          <view class="section-title">收益与成本</view>
          <view class="conversion-box">
            <view class="conversion-row">
              <text class="conv-label">总佣金</text>
              <text class="conv-value">¥{{ formatCommission(revenue.totalCommission) }}</text>
            </view>
            <view class="conversion-row">
              <text class="conv-label">有效佣金（归因匹配）</text>
              <text class="conv-value">¥{{ formatCommission(revenue.matchedCommission) }}</text>
            </view>
            <view class="conversion-row">
              <text class="conv-label">实际成本</text>
              <text class="conv-value">¥{{ formatCommission(cost.actualCost) }}</text>
            </view>
            <view class="conversion-row">
              <text class="conv-label">ROI</text>
              <text class="conv-value highlight">{{ formatRoi(roi) }}</text>
            </view>
          </view>
        </view>

        <view class="section">
          <view class="section-title">关联活动</view>
          <view class="ad-list">
            <view v-for="(c, idx) in byCampaign" :key="idx" class="ad-card">
              <view class="ad-title">{{ c.campaign }}</view>
              <text class="meta-text">{{ c.code }}</text>
            </view>
            <view v-if="byCampaign.length === 0" class="empty-inline">
              <text class="empty-text">暂无关联活动</text>
            </view>
          </view>
        </view>
      </template>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { channelReportApi } from '../../../api/studio.js'
import PageHeader from '../../../components/PageHeader.vue'

const loading = ref(false)
const channels = ref([])
const channelIndex = ref(0)
const channelCode = ref('')

const dateRangeIndex = ref(0)
const dateRangeOptions = ['近7天', '近30天', '近90天', '自定义']
const customStartDate = ref('')
const customEndDate = ref('')

const activeTab = ref('variant')
const report = ref(null)
const emptyHint = ref('')

const channelNames = computed(() => channels.value.map(c => c.name || c.code))
const byVariant = computed(() => report.value?.byVariant || [])
const funnel = computed(() => report.value?.funnel || {})
const revenue = computed(() => report.value?.revenue || {})
const cost = computed(() => report.value?.cost || {})
const roi = computed(() => report.value?.roi ?? 0)
const byCampaign = computed(() => report.value?.byCampaign || [])

// CTR 最高的变体为「领先」（排除无曝光的变体）
const leadIndex = computed(() => {
  let best = -1
  let bestCtr = 0
  byVariant.value.forEach((row, idx) => {
    if ((row.impressions || 0) > 0 && (row.ctr || 0) > bestCtr) {
      bestCtr = row.ctr
      best = idx
    }
  })
  return best
})

const maxCtr = computed(() => {
  return byVariant.value.reduce((max, row) => Math.max(max, row.ctr || 0), 0)
})

function ctrBarWidth(ctr) {
  if (!maxCtr.value) return 0
  return Math.round(((ctr || 0) / maxCtr.value) * 100)
}

function onChannelChange(e) {
  channelIndex.value = e.detail.value
  const ch = channels.value[e.detail.value]
  channelCode.value = ch?.code || ''
  loadReport()
}

function onDateRangeChange(e) {
  dateRangeIndex.value = e.detail.value
  if (e.detail.value !== 3) {
    loadReport()
  }
}

function switchTab(tab) {
  activeTab.value = tab
  // 切 Tab 时若当前数据不含对应分组则重新拉取
  if (tab === 'variant' && report.value && !report.value.byVariant) {
    loadReport()
  } else if (tab === 'overview' && report.value && !report.value.funnel) {
    loadReport()
  }
}

function formatDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dateParams() {
  const now = new Date()
  const end = new Date(now)
  let start = new Date(now)

  if (dateRangeIndex.value === 0) {
    start.setDate(start.getDate() - 7)
  } else if (dateRangeIndex.value === 1) {
    start.setDate(start.getDate() - 30)
  } else if (dateRangeIndex.value === 2) {
    start.setDate(start.getDate() - 90)
  } else {
    if (customStartDate.value && customEndDate.value) {
      // 后端按 datetime 字符串比较（timestamp >= startDate AND <= endDate），
      // endDate 需加一天才是"含当日"，否则当天带时间分量的记录会被排除
      const endNext = new Date(customEndDate.value)
      endNext.setDate(endNext.getDate() + 1)
      return { startDate: customStartDate.value, endDate: formatDateStr(endNext) }
    }
    start.setDate(start.getDate() - 7)
  }

  // 同上：endDate 含当日需加一天
  const endNext = new Date(end)
  endNext.setDate(endNext.getDate() + 1)
  return {
    startDate: formatDateStr(start),
    endDate: formatDateStr(endNext)
  }
}

async function loadChannels() {
  try {
    const res = await channelReportApi.channels()
    channels.value = res.list || []
  } catch (e) {
    // 无 promo-channel.manage 权限时列表不可用，退化为手动输入渠道编码
    channels.value = []
  }
}

async function loadReport() {
  if (!channelCode.value) {
    report.value = null
    emptyHint.value = '请先选择推广渠道'
    return
  }
  loading.value = true
  try {
    const params = {
      channelCode: channelCode.value,
      ...dateParams()
    }
    // 变体对比需要 byVariant 分组；总览走默认汇总
    if (activeTab.value === 'variant') {
      params.groupBy = 'variant'
    }
    report.value = await channelReportApi.report(params)
    emptyHint.value = ''
  } catch (e) {
    report.value = null
    emptyHint.value = e.message || '报表加载失败'
  } finally {
    loading.value = false
  }
}

function formatNum(num) {
  if (num == null) return '0'
  return Number(num).toLocaleString('zh-CN')
}

function formatPercent(val) {
  if (val == null) return '0%'
  const num = Number(val)
  if (isNaN(num)) return '0%'
  if (num <= 1) return (num * 100).toFixed(2) + '%'
  return num.toFixed(2) + '%'
}

function formatCommission(val) {
  const num = Number(val)
  if (isNaN(num)) return '0.00'
  return num.toFixed(2)
}

function formatRoi(val) {
  const num = Number(val)
  if (isNaN(num)) return '0%'
  return num.toFixed(2) + '%'
}

onLoad(async () => {
  await loadChannels()
  // 默认选中第一个「有活动/实验」的渠道（无活动渠道无报表数据），否则退化为第一个渠道
  const withCampaigns = channels.value.find(c => (c.campaigns || []).length > 0)
  const preferred = withCampaigns || channels.value[0]
  if (preferred) {
    channelIndex.value = channels.value.indexOf(preferred)
    channelCode.value = preferred.code || ''
  }
  loadReport()
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

.card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.card-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.picker-value {
  font-size: 28rpx;
  color: #333;
  padding: 16rpx 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
}
.input-fallback {
  width: 100%;
  box-sizing: border-box;
}

.custom-date-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 16rpx;
}
.date-sep {
  font-size: 28rpx;
  color: #666;
}

.tab-bar {
  display: flex;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #666;
  position: relative;
}
.tab-item.active {
  color: #1989fa;
  font-weight: bold;
}
.tab-item.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 64rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: #1989fa;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 100rpx 0;
  font-size: 28rpx;
  color: #999;
}
.empty {
  display: flex;
  justify-content: center;
  padding: 100rpx 0;
}
.empty-text {
  font-size: 28rpx;
  color: #999;
}

.section {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  padding-left: 16rpx;
  border-left: 6rpx solid #1989fa;
}

/* 表格 */
.table-scroll {
  width: 100%;
  white-space: nowrap;
}
.table {
  display: inline-block;
  min-width: 100%;
}
.table-row {
  display: flex;
  align-items: center;
  border-bottom: 1rpx solid #f0f0f0;
  padding: 16rpx 0;
}
.table-row:last-child {
  border-bottom: none;
}
.table-head {
  border-bottom: 2rpx solid #e5e5e5;
}
.th {
  width: 110rpx;
  font-size: 24rpx;
  color: #999;
  text-align: right;
  flex-shrink: 0;
}
.th-name {
  width: 220rpx;
  text-align: left;
}
.td {
  width: 110rpx;
  font-size: 26rpx;
  color: #333;
  text-align: right;
  flex-shrink: 0;
}
.td-name {
  width: 220rpx;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.td-ctr.lead {
  color: #ff0000;
  font-weight: bold;
}
.variant-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.variant-name {
  font-size: 26rpx;
  color: #333;
  font-weight: bold;
  max-width: 160rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lead-tag {
  font-size: 20rpx;
  color: #fff;
  background: #ff0000;
  border-radius: 6rpx;
  padding: 2rpx 8rpx;
  flex-shrink: 0;
}
.campaign-name {
  font-size: 22rpx;
  color: #999;
  max-width: 200rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* CTR 相对条 */
.ctr-bars {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.bar-item {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.bar-header {
  display: flex;
  justify-content: space-between;
}
.bar-label {
  font-size: 26rpx;
  color: #333;
}
.bar-value {
  font-size: 24rpx;
  color: #999;
}
.progress-bar {
  height: 16rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1989fa, #36cfc9);
  border-radius: 8rpx;
  transition: width 0.3s;
}
.progress-fill.lead {
  background: linear-gradient(90deg, #ff6034, #ee0a24);
}

.conclusion {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #1989fa;
  background: #ecf5ff;
  border-radius: 8rpx;
  padding: 16rpx 20rpx;
}

/* 总览 */
.overview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.overview-card {
  flex: 1;
  min-width: 30%;
  background: #f9f9f9;
  border-radius: 12rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.overview-num {
  font-size: 40rpx;
  font-weight: bold;
  color: #1989fa;
}
.overview-label {
  font-size: 24rpx;
  color: #999;
}

.conversion-box {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.conversion-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}
.conv-label {
  font-size: 28rpx;
  color: #666;
}
.conv-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}
.conv-value.highlight {
  color: #ff0000;
}

.ad-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.ad-card {
  background: #f9f9f9;
  border-radius: 12rpx;
  padding: 20rpx;
}
.ad-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}
.meta-text {
  font-size: 24rpx;
  color: #999;
}
.empty-inline {
  padding: 40rpx 0;
  text-align: center;
}
</style>
