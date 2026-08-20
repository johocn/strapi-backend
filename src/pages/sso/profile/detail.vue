<template>
  <view class="page-container">
    <PageHeader title="画像详情">
      <button class="btn-primary" @click="recalc" :disabled="loading" v-if="hasPermission('sso.profile.write')">{{ loading ? '计算中...' : '重新计算' }}</button>
    </PageHeader>

    <view v-if="loading && !detail" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && !detail" class="empty-state">
      <text class="empty-icon">👤</text>
      <text class="empty-text">未找到用户画像</text>
    </view>

    <template v-if="detail">
      <view class="hero-card">
        <view class="hero-left">
          <view class="segment-big" :style="{ background: segmentColor(detail.segment) }">{{ detail.segment || '-' }}</view>
        </view>
        <view class="hero-right">
          <view class="hero-user">{{ detail.upUser?.username || detail.upUser?.email || '-' }}</view>
          <view class="hero-score">综合分 <text class="score-num">{{ detail.segmentScore ?? 0 }}</text></view>
          <view class="hero-reason">{{ detail.segmentReason || '暂无分层原因' }}</view>
          <view class="hero-date">计算时间: {{ fmtDateTime(detail.lastCalculatedAt) }}</view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-title">📊 五维行为画像</view>
        <view v-if="detail.hasData === false" class="no-data-tip">该用户暂无行为数据（学习/浏览/报名等），无法计算画像</view>
        <view v-for="d in dimensions" :key="d.key" class="bar-row">
          <text class="bar-label">{{ d.label }}</text>
          <view class="bar-track">
            <view class="bar-fill" :style="{ width: Math.min(d.value, 100) + '%', background: d.color }"></view>
          </view>
          <text class="bar-value">{{ d.value }}</text>
        </view>
      </view>

      <view class="section-card" v-if="interests.length">
        <view class="section-title">🏷️ 兴趣标签</view>
        <view class="tag-wrap">
          <text v-for="(t, i) in interests" :key="i" class="interest-tag">{{ t }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ssoProfileApi } from '../../../api/sso.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const SEGMENT_COLORS = { S: '#f5222d', A: '#fa8c16', B: '#1677ff', C: '#999' }
function segmentColor(seg) { return SEGMENT_COLORS[seg] || '#999' }

const profileId = ref('')
const detail = ref(null)
const loading = ref(false)

const DIMENSION_META = [
  { key: 'activity', label: '活跃度', color: '#1677ff' },
  { key: 'reading', label: '阅读深度', color: '#52c41a' },
  { key: 'completion', label: '完课率', color: '#fa8c16' },
  { key: 'attendance', label: '到场意愿', color: '#722ed1' },
  { key: 'payment', label: '付费潜力', color: '#f5222d' },
]

const dimensions = computed(() => {
  const src = detail.value || {}
  return DIMENSION_META.map((m) => ({ ...m, value: Number(src[m.key] ?? 0) }))
})

const interests = computed(() => {
  const arr = detail.value?.interests
  if (Array.isArray(arr)) return arr
  if (typeof arr === 'string') { try { return JSON.parse(arr) } catch { return [] } }
  return []
})

function fmtDateTime(dt) {
  if (!dt) return '-'
  return String(dt).replace('T', ' ').substring(0, 19)
}

async function loadDetail() {
  if (!profileId.value) return
  loading.value = true
  try {
    detail.value = await ssoProfileApi.detail(profileId.value)
  } catch (e) {
    uni.showToast({ title: '加载画像失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function recalc() {
  uni.showModal({
    title: '重新计算',
    content: '将实时聚合该用户行为数据并重新分层，确定执行吗？',
    success: (res) => {
      if (res.confirm) loadDetail()
    }
  })
}

onLoad((query) => {
  if (query.id) {
    profileId.value = query.id
    loadDetail()
  }
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.btn-primary {
  background: #ff0000; color: #ffffff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}
.hero-card {
  display: flex; align-items: center; gap: 24rpx;
  background: #fff; border-radius: 16rpx; padding: 32rpx; margin-bottom: 20rpx;
}
.hero-left { flex-shrink: 0; }
.segment-big {
  width: 120rpx; height: 120rpx; border-radius: 24rpx;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 64rpx; font-weight: bold;
}
.hero-right { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.hero-user { font-size: 34rpx; font-weight: bold; color: #333; }
.hero-score { font-size: 26rpx; color: #666; }
.score-num { font-size: 40rpx; font-weight: bold; color: #1677ff; }
.hero-reason { font-size: 24rpx; color: #666; background: #f5f5f5; border-radius: 8rpx; padding: 12rpx 16rpx; }
.hero-date { font-size: 22rpx; color: #999; }
.section-card { background: #fff; border-radius: 16rpx; padding: 28rpx; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 24rpx; }
.no-data-tip { font-size: 26rpx; color: #999; text-align: center; padding: 40rpx 0; }
.bar-row { display: flex; align-items: center; margin-bottom: 24rpx; }
.bar-row:last-child { margin-bottom: 0; }
.bar-label { width: 140rpx; font-size: 26rpx; color: #666; flex-shrink: 0; }
.bar-track { flex: 1; height: 32rpx; background: #f5f5f5; border-radius: 16rpx; margin: 0 24rpx; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 16rpx; transition: width 0.3s ease; min-width: 8rpx; }
.bar-value { width: 64rpx; font-size: 28rpx; font-weight: bold; color: #333; text-align: right; flex-shrink: 0; }
.tag-wrap { display: flex; flex-wrap: wrap; gap: 16rpx; }
.interest-tag { font-size: 24rpx; color: #1677ff; background: #e6f4ff; padding: 8rpx 20rpx; border-radius: 32rpx; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
