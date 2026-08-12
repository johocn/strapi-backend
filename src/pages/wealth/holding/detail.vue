<template>
  <view class="page-container">
    <PageHeader title="持仓详情" />

    <view v-if="holding" class="detail-content">
      <view class="info-card">
        <view class="info-header">
          <view>
            <text class="customer-name">{{ holding.user?.name || holding.user?.nickname || '客户' }}</text>
            <text class="product-name">{{ holding.product?.productName || '--' }}</text>
          </view>
          <view class="status-badge" :class="holding.status">
            {{ holding.status === 'holding' ? '持有中' : '已赎回' }}
          </view>
        </view>
        <view class="info-row">
          <view class="info-item">
            <text class="info-label">买入日期</text>
            <text class="info-value">{{ holding.buyDate }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">买入金额</text>
            <text class="info-value">¥{{ formatAmount(holding.buyAmount) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">买入净值</text>
            <text class="info-value">{{ holding.buyNav || '--' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">持有天数</text>
            <text class="info-value">{{ holding.holdingDays || 0 }} 天</text>
          </view>
        </view>
      </view>

      <view class="profit-highlight">
        <view class="profit-main">
          <text class="profit-label">当前市值</text>
          <text class="profit-value">¥{{ formatAmount(holding.currentValue) }}</text>
        </view>
        <view class="profit-row">
          <view class="profit-item">
            <text class="profit-sub-label">累计盈亏</text>
            <text class="profit-sub-value" :class="getProfitClass(holding.profit)">
              {{ formatProfit(holding.profit) }}
            </text>
          </view>
          <view class="profit-item">
            <text class="profit-sub-label">收益率</text>
            <text class="profit-sub-value" :class="getProfitClass(holding.profitPercent)">
              {{ formatPercent(holding.profitPercent) }}
            </text>
          </view>
          <view class="profit-item">
            <text class="profit-sub-label">持有年化</text>
            <text class="profit-sub-value" :class="getProfitClass(holding.annualizedProfit)">
              {{ formatPercent(holding.annualizedProfit) }}
            </text>
          </view>
        </view>
      </view>

      <view class="profit-experience">
        <text class="experience-text">
          假设投入 ¥{{ formatAmount(holding.buyAmount) }}，
          <text class="experience-result" :class="getProfitClass(holding.profit)">
            {{ holding.profit >= 0 ? '已赚' : '已亏' }} ¥{{ formatAmount(Math.abs(holding.profit || 0)) }}
          </text>
        </text>
      </view>

      <view class="chart-section">
        <view class="section-title">市值曲线</view>
        <view class="trend-chart">
          <view v-for="(point, idx) in profitTrend" :key="idx" class="trend-bar-wrapper">
            <view class="trend-bar-bg">
              <view
                class="trend-bar"
                :class="getProfitClass(point.profit)"
                :style="{ height: getBarHeight(point.profit) }"
              ></view>
            </view>
            <text class="trend-date">{{ formatDateShort(point.date) }}</text>
          </view>
          <view v-if="profitTrend.length === 0" class="empty-row">暂无市值数据</view>
        </view>
      </view>

      <view v-if="alertRules.length > 0" class="alert-section">
        <view class="section-title">提醒规则</view>
        <view v-for="rule in alertRules" :key="rule.id" class="rule-card">
          <view class="rule-info">
            <text class="rule-type">{{ getRuleTypeLabel(rule.ruleType) }}</text>
            <text class="rule-threshold" v-if="rule.threshold">阈值 {{ formatPercent(rule.threshold) }}</text>
          </view>
          <switch :checked="rule.status" @change="toggleRule(rule)" />
        </view>
      </view>

      <view class="alert-section">
        <view class="section-title">提醒历史</view>
        <view v-if="alertLogs.length === 0" class="empty-row">暂无提醒记录</view>
        <view v-for="log in alertLogs" :key="log.id" class="log-card">
          <view class="log-header">
            <text class="log-date">{{ log.triggeredAt }}</text>
            <text class="log-status" :class="{ unread: !log.readStatus }">
              {{ log.readStatus ? '已读' : '未读' }}
            </text>
          </view>
          <text class="log-message">{{ log.message }}</text>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>

    <view class="footer-disclaimer">理财非存款，产品有风险，投资需谨慎</view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAdminHoldingDetail, getHoldingProfitTrend } from '../../../api/wealth.js'

const holdingId = ref(null)
const holding = ref(null)
const profitTrend = ref([])
const alertRules = ref([])
const alertLogs = ref([])
const loading = ref(false)

const maxAbsProfit = computed(() => {
  if (profitTrend.value.length === 0) return 1
  return Math.max(...profitTrend.value.map(p => Math.abs(p.profit || 0)), 1)
})

function formatAmount(val) {
  if (val === null || val === undefined) return '--'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatPercent(val) {
  if (val === null || val === undefined) return '--'
  return (val * 100).toFixed(2) + '%'
}
function formatProfit(val) {
  if (val === null || val === undefined) return '--'
  return (val >= 0 ? '+' : '') + formatAmount(val)
}
function formatDateShort(dateStr) {
  if (!dateStr) return ''
  return dateStr.slice(5)
}
function getProfitClass(val) {
  if (val > 0) return 'up'
  if (val < 0) return 'down'
  return 'flat'
}
function getBarHeight(val) {
  if (val === null || val === undefined) return '0%'
  return Math.abs(val) / maxAbsProfit.value * 100 + '%'
}
function getRuleTypeLabel(type) {
  const map = {
    nav_drop_percent: '净值跌幅提醒',
    annual_negative: '年化转负提醒',
    nav_anomaly: '净值异常提醒',
    custom: '自定义提醒'
  }
  return map[type] || type
}

async function loadData() {
  if (!holdingId.value) return
  loading.value = true
  try {
    const [detail, trend] = await Promise.all([
      getAdminHoldingDetail(holdingId.value),
      getHoldingProfitTrend(holdingId.value).catch(() => null)
    ])
    holding.value = detail
    profitTrend.value = trend?.points || trend?.list || []
    alertRules.value = detail?.alertRules || []
    alertLogs.value = detail?.alertLogs || []
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function toggleRule(rule) {
  rule.status = !rule.status
}

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const id = page.$page?.options?.id || page.options?.id
  if (id) {
    holdingId.value = id
    loadData()
  }
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.info-card, .profit-highlight, .profit-experience, .chart-section, .alert-section {
  background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx;
}

.info-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20rpx; }
.customer-name { font-size: 32rpx; font-weight: bold; color: #333; display: block; }
.product-name { font-size: 24rpx; color: #999; margin-top: 4rpx; display: block; }
.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-badge.holding { background: #e8f5e9; color: #07c160; }
.status-badge.redeemed { background: #f5f5f5; color: #999; }

.info-row { display: flex; flex-wrap: wrap; gap: 20rpx; }
.info-item { flex: 1; min-width: 40%; }
.info-label { font-size: 22rpx; color: #999; display: block; }
.info-value { font-size: 28rpx; color: #333; font-weight: bold; display: block; margin-top: 4rpx; }

.profit-highlight { text-align: center; }
.profit-main { margin-bottom: 20rpx; }
.profit-label { font-size: 26rpx; color: #999; display: block; }
.profit-value { font-size: 56rpx; font-weight: bold; color: #333; display: block; margin: 8rpx 0; }

.profit-row { display: flex; justify-content: space-around; }
.profit-item { text-align: center; }
.profit-sub-label { font-size: 22rpx; color: #999; display: block; }
.profit-sub-value { font-size: 32rpx; font-weight: bold; display: block; margin-top: 4rpx; }
.profit-sub-value.up { color: #f5222d; }
.profit-sub-value.down { color: #07c160; }

.profit-experience { text-align: center; }
.experience-text { font-size: 30rpx; color: #666; }
.experience-result { font-size: 36rpx; font-weight: bold; }
.experience-result.up { color: #f5222d; }
.experience-result.down { color: #07c160; }

.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; }

.trend-chart { display: flex; align-items: flex-end; gap: 8rpx; height: 280rpx; overflow-x: auto; padding-bottom: 30rpx; }
.trend-bar-wrapper { display: flex; flex-direction: column; align-items: center; min-width: 40rpx; height: 100%; }
.trend-bar-bg { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; background: #f9f9f9; border-radius: 4rpx; }
.trend-bar { width: 60%; min-height: 4rpx; border-radius: 4rpx 4rpx 0 0; }
.trend-bar.up { background: #f5222d; }
.trend-bar.down { background: #07c160; }
.trend-bar.flat { background: #ccc; }
.trend-date { font-size: 18rpx; color: #999; margin-top: 8rpx; }

.rule-card { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.rule-card:last-child { border-bottom: none; }
.rule-info { display: flex; align-items: center; gap: 12rpx; }
.rule-type { font-size: 28rpx; color: #333; }
.rule-threshold { font-size: 24rpx; color: #999; }

.log-card { background: #f9f9f9; border-radius: 8rpx; padding: 20rpx; margin-bottom: 12rpx; }
.log-header { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.log-date { font-size: 22rpx; color: #999; }
.log-status { font-size: 22rpx; color: #999; }
.log-status.unread { color: #ff4d4f; }
.log-message { font-size: 26rpx; color: #333; }

.empty-row { text-align: center; padding: 40rpx; color: #999; font-size: 26rpx; }
.loading { display: flex; justify-content: center; padding: 100rpx 0; color: #999; }

.footer-disclaimer { text-align: center; padding: 30rpx 0; color: #999; font-size: 22rpx; }
</style>
