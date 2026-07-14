<template>
  <view class="page-container">
    <PageHeader title="积分统计" />

    <view class="stats-grid">
      <view class="stat-card">
        <view class="stat-value">{{ formatNumber(stats.totalIssued) }}</view>
        <view class="stat-label">总发放积分</view>
      </view>
      <view class="stat-card">
        <view class="stat-value redeemed">{{ formatNumber(stats.totalRedeemed) }}</view>
        <view class="stat-label">总兑换积分</view>
      </view>
      <view class="stat-card">
        <view class="stat-value balance">{{ formatNumber(stats.totalBalance) }}</view>
        <view class="stat-label">当前余额</view>
      </view>
      <view class="stat-card">
        <view class="stat-value users">{{ formatNumber(stats.activeUsers) }}</view>
        <view class="stat-label">活跃用户数</view>
      </view>
      <view class="stat-card">
        <view class="stat-value pending">{{ formatNumber(stats.pendingRedemptions) }}</view>
        <view class="stat-label">待审核兑换</view>
      </view>
      <view class="stat-card">
        <view class="stat-value pickup">{{ formatNumber(stats.pendingPickups) }}</view>
        <view class="stat-label">待兑付自提</view>
      </view>
      <view class="stat-card">
        <view class="stat-value location">{{ formatNumber(stats.pickupLocationCount) }}</view>
        <view class="stat-label">自提点数量</view>
      </view>
      <view class="stat-card" v-if="stats.expiringSoonPoints > 0">
        <view class="stat-value expiring">{{ formatNumber(stats.expiringSoonPoints) }}</view>
        <view class="stat-label">即将过期积分</view>
      </view>
    </view>

    <view class="chart-section">
      <view class="section-title">近7日积分趋势</view>
      <view class="bar-chart">
        <view v-for="item in trendData" :key="item.date" class="bar-row">
          <text class="bar-label">{{ item.label }}</text>
          <view class="bar-track">
            <view class="bar-fill earn" :style="{ width: item.earnPercent + '%' }"></view>
          </view>
          <text class="bar-value earn-value">+{{ item.earn }}</text>
        </view>
        <view v-for="item in trendData" :key="'s' + item.date" class="bar-row">
          <text class="bar-label">{{ item.label }}</text>
          <view class="bar-track">
            <view class="bar-fill spend" :style="{ width: item.spendPercent + '%' }"></view>
          </view>
          <text class="bar-value spend-value">-{{ item.spend }}</text>
        </view>
      </view>
    </view>

    <view class="rank-section">
      <view class="section-title">积分排行 TOP5</view>
      <view v-if="topUsers.length === 0" class="empty-tip">暂无数据</view>
      <view v-for="(item, index) in topUsers" :key="index" class="rank-item">
        <view class="rank-index" :class="index < 3 ? 'top' : ''">{{ index + 1 }}</view>
        <view class="rank-info">
          <text class="rank-name">{{ item.username || item.userId || '-' }}</text>
        </view>
        <text class="rank-points">{{ formatNumber(item.balance || item.totalPoints || 0) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getPointDashboard, getPointStatistics } from '../../src/api/points.js'

const stats = ref({
  totalIssued: 0,
  totalRedeemed: 0,
  totalBalance: 0,
  activeUsers: 0,
  pendingRedemptions: 0,
  pendingPickups: 0,
  pickupLocationCount: 0,
  expiringSoonPoints: 0,
})

const trendData = ref([])
const topUsers = ref([])

function formatNumber(num) {
  if (num === undefined || num === null) return '0'
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toLocaleString ? num.toLocaleString() : String(num)
}

async function loadData() {
  try {
    // 尝试使用 admin dashboard API
    const dashRes = await getPointDashboard().catch(() => null)
    if (dashRes) {
      stats.value = {
        totalIssued: dashRes.totalIssued ?? dashRes.totalEarned ?? dashRes.totalPointsIssued ?? 0,
        totalRedeemed: dashRes.totalRedeemed ?? dashRes.totalSpent ?? dashRes.totalPointsSpent ?? 0,
        totalBalance: dashRes.totalBalance ?? 0,
        activeUsers: dashRes.activeUsers ?? dashRes.activeUsersToday ?? dashRes.totalUsers ?? 0,
        pendingRedemptions: dashRes.pendingRedemptions ?? 0,
        pendingPickups: dashRes.pendingPickups ?? 0,
        pickupLocationCount: dashRes.pickupLocationCount ?? 0,
        expiringSoonPoints: dashRes.expiringSoonPoints ?? 0,
      }
      if (dashRes.trend) {
        const maxEarn = Math.max(...dashRes.trend.map(t => t.earn ?? t.issued ?? 0), 1)
        const maxSpend = Math.max(...dashRes.trend.map(t => t.spend ?? t.redeemed ?? 0), 1)
        trendData.value = dashRes.trend.map(t => ({
          date: t.date,
          label: (t.date || '').slice(5),
          earn: t.earn ?? t.issued ?? 0,
          spend: t.spend ?? t.redeemed ?? 0,
          earnPercent: ((t.earn ?? t.issued ?? 0) / maxEarn) * 100,
          spendPercent: ((t.spend ?? t.redeemed ?? 0) / maxSpend) * 100,
        }))
      }
      if (dashRes.topUsers) {
        topUsers.value = dashRes.topUsers.slice(0, 5)
      }
    } else {
      // 降级使用用户端统计 API
      const res = await getPointStatistics().catch(() => null)
      if (res) {
        stats.value = {
          totalIssued: res.totalIssued ?? 0,
          totalRedeemed: res.totalRedeemed ?? 0,
          totalBalance: res.totalBalance ?? 0,
          activeUsers: res.activeUsers ?? 0,
        }
      }
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

onMounted(() => loadData())
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.stats-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 16rpx; margin-bottom: 24rpx;
}

.stat-card {
  background: #fff; border-radius: 12rpx; padding: 32rpx 24rpx; text-align: center;
}
.stat-value { font-size: 44rpx; font-weight: bold; color: #667eea; margin-bottom: 12rpx; }
.stat-value.redeemed { color: #ff4d4f; }
.stat-value.balance { color: #07c160; }
.stat-value.users { color: #ff9800; }
.stat-value.pending { color: #faad14; }
.stat-value.pickup { color: #667eea; }
.stat-value.location { color: #13c2c2; }
.stat-value.expiring { color: #ff4d4f; }
.stat-label { font-size: 26rpx; color: #999; }

.chart-section, .rank-section {
  background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx; font-weight: bold; color: #333;
  margin-bottom: 20rpx; padding-bottom: 16rpx; border-bottom: 1rpx solid #f5f5f5;
}

.bar-chart { display: flex; flex-direction: column; gap: 16rpx; }
.bar-row { display: flex; align-items: center; }
.bar-label { width: 80rpx; font-size: 24rpx; color: #999; flex-shrink: 0; }
.bar-track {
  flex: 1; height: 32rpx; background: #f5f5f5; border-radius: 16rpx;
  margin: 0 16rpx; overflow: hidden;
}
.bar-fill { height: 100%; border-radius: 16rpx; min-width: 4rpx; transition: width 0.3s ease; }
.bar-fill.earn { background: #667eea; }
.bar-fill.spend { background: #ff4d4f; }
.bar-value { width: 100rpx; font-size: 24rpx; text-align: right; flex-shrink: 0; }
.bar-value.earn-value { color: #667eea; }
.bar-value.spend-value { color: #ff4d4f; }

.rank-item {
  display: flex; align-items: center; padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.rank-item:last-child { border-bottom: none; }

.rank-index {
  width: 48rpx; height: 48rpx; border-radius: 24rpx;
  background: #f5f5f5; color: #999; display: flex;
  align-items: center; justify-content: center;
  font-size: 24rpx; font-weight: bold; margin-right: 16rpx; flex-shrink: 0;
}
.rank-index.top { background: #fff3e0; color: #ff9800; }

.rank-info { flex: 1; }
.rank-name { font-size: 28rpx; color: #333; }
.rank-points { font-size: 30rpx; font-weight: bold; color: #667eea; }

.empty-tip { text-align: center; padding: 40rpx; color: #999; font-size: 28rpx; }
</style>
