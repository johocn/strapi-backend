<template>
  <view class="page-container">
    <PageHeader title="用户画像">
      <button class="btn-primary" @click="handleRecalcAll" v-if="hasPermission('sso.profile.write')">全部重算</button>
    </PageHeader>

    <view class="help-banner">
      <text class="help-icon">ℹ️</text>
      <text class="help-text">用户画像基于活跃/阅读/完课/到场/付费五维行为实时聚合打分，按综合分自动分层（S≥80 / A≥60 / B≥40 / C）。点击用户可查看六维画像详情并单独重算。</text>
    </view>

    <view class="filter-section">
      <view
        v-for="seg in segmentOptions"
        :key="seg.value"
        class="segment-pill"
        :class="{ active: currentSegment === seg.value }"
        @click="selectSegment(seg.value)"
      >
        <text v-if="seg.value" class="pill-dot" :style="{ background: segmentColor(seg.value) }"></text>
        {{ seg.label }}
      </view>
    </view>

    <view class="data-list">
      <view v-for="item in dataList" :key="item.documentId || item.id" class="data-card" @click="goDetail(item.id)">
        <view class="data-info">
          <view class="data-title">
            <text class="user-name">{{ item.user?.username || '-' }}</text>
            <text class="segment-badge" :style="{ background: segmentColor(item.segment) }">{{ item.segment || '-' }}</text>
            <text class="score-tag">综合分 {{ item.segmentScore ?? '-' }}</text>
          </view>
          <view class="data-meta">
            <text class="meta-item">邮箱: {{ item.user?.email || '-' }}</text>
            <text class="meta-item">计算时间: {{ fmtDateTime(item.lastCalculatedAt) }}</text>
          </view>
          <view class="data-meta" v-if="item.segmentReason">
            <text class="meta-item reason">原因: {{ item.segmentReason }}</text>
          </view>
        </view>
        <view class="data-arrow">›</view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && dataList.length === 0" class="empty-state">
      <text class="empty-icon">👤</text>
      <text class="empty-text">暂无用户画像，点击右上角「全部重算」生成</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ssoProfileApi } from '../../../api/sso.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const segmentOptions = [
  { value: '', label: '全部' },
  { value: 'S', label: 'S' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
]
const SEGMENT_COLORS = { S: '#f5222d', A: '#fa8c16', B: '#1677ff', C: '#999' }
function segmentColor(seg) { return SEGMENT_COLORS[seg] || '#999' }

const currentSegment = ref('')
const dataList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

function fmtDateTime(dt) {
  if (!dt) return '-'
  return String(dt).replace('T', ' ').substring(0, 19)
}

function selectSegment(seg) {
  currentSegment.value = seg
  loadData(1)
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { page, pageSize: 10 }
    if (currentSegment.value) params.segment = currentSegment.value
    const { list, pagination: pg } = await ssoProfileApi.list(params)
    dataList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goDetail(id) {
  if (!id) return
  uni.navigateTo({ url: `/pages/sso/profile/detail?id=${id}` })
}

function handleRecalcAll() {
  uni.showModal({
    title: '全部重算',
    content: '将遍历全部用户实时聚合六维行为并重新分层，耗时较长，确定执行吗？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        const r = await ssoProfileApi.recalcAll()
        uni.showToast({ title: `重算完成 ${r.calculated ?? 0} 人`, icon: 'success' })
        loadData(currentPage.value)
      } catch (e) {
        uni.showToast({ title: '重算失败', icon: 'none' })
      }
    }
  })
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }

onShow(() => { loadData(1) })
</script>

<style scoped>
page { background: #f5f5f5; }
.help-banner {
  display: flex; align-items: flex-start; gap: 12rpx;
  background: #e6f4ff; padding: 20rpx; border-radius: 12rpx;
  margin-bottom: 20rpx; border-left: 6rpx solid #1677ff;
}
.help-icon { font-size: 28rpx; flex-shrink: 0; }
.help-text { font-size: 26rpx; color: #333; line-height: 1.5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.btn-primary {
  background: #ff0000; color: #ffffff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}
.filter-section { display: flex; gap: 16rpx; background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.segment-pill {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 28rpx; border-radius: 32rpx; font-size: 28rpx; color: #666; background: #f5f5f5;
}
.segment-pill.active { background: #1677ff; color: #fff; }
.pill-dot { width: 20rpx; height: 20rpx; border-radius: 50%; }
.data-list { display: flex; flex-direction: column; gap: 20rpx; }
.data-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; }
.data-info { flex: 1; display: flex; flex-direction: column; }
.data-title { display: flex; align-items: center; gap: 12rpx; font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; flex-wrap: wrap; }
.user-name { font-size: 30rpx; font-weight: bold; color: #333; }
.segment-badge { min-width: 40rpx; text-align: center; color: #fff; padding: 4rpx 16rpx; border-radius: 8rpx; font-size: 24rpx; font-weight: bold; }
.score-tag { font-size: 22rpx; color: #1677ff; background: #e6f4ff; padding: 4rpx 12rpx; border-radius: 6rpx; }
.data-meta { margin-bottom: 8rpx; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; word-break: break-all; }
.meta-item.reason { color: #666; display: block; }
.data-arrow { font-size: 48rpx; color: #ccc; padding-left: 16rpx; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>
