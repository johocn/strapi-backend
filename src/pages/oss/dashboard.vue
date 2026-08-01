<template>
  <view class="page-container">
    <PageHeader title="OSS 同步仪表盘" />

    <view class="stat-grid">
      <view class="stat-card">
        <view class="stat-title">同步记录数</view>
        <view class="stat-value">{{ stats.totalRecords }}</view>
      </view>
      <view class="stat-card">
        <view class="stat-title">成功数</view>
        <view class="stat-value" style="color: #07c160;">{{ stats.successCount }}</view>
      </view>
      <view class="stat-card">
        <view class="stat-title">失败数</view>
        <view class="stat-value" style="color: #ff4d4f;">{{ stats.failCount }}</view>
      </view>
      <view class="stat-card">
        <view class="stat-title">存储用量</view>
        <view class="stat-value">{{ stats.storageUsage }}</view>
      </view>
    </view>

    <view class="section-title">最近同步记录</view>
    <view class="list">
      <view v-for="item in recentRecords" :key="item.id || item.documentId" class="list-item">
        <view class="item-header">
          <text class="item-name">{{ item.fileName || '-' }}</text>
          <text class="meta-tag" :style="{ color: item.status === 'success' ? '#07c160' : item.status === 'failed' ? '#ff4d4f' : '#faad14' }">{{ item.status }}</text>
        </view>
        <view class="item-desc">大小: {{ item.fileSize || '-' }}</view>
        <view class="item-meta">
          <text class="meta-tag">{{ item.syncedAt || '-' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getOssSyncDashboard } from '../../api/oss-admin.js'

const stats = ref({
  totalRecords: 0,
  successCount: 0,
  failCount: 0,
  storageUsage: '0'
})
const recentRecords = ref([])

async function loadDashboard() {
  try {
    const res = await getOssSyncDashboard()
    if (res) {
      stats.value = {
        totalRecords: res.totalRecords || 0,
        successCount: res.successCount || 0,
        failCount: res.failCount || 0,
        storageUsage: res.storageUsage || '0'
      }
      recentRecords.value = res.recentRecords || []
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

onMounted(() => loadDashboard())
</script>

<style scoped>
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; background: #f5f5f5; }
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; margin-bottom: 20rpx; }
.stat-card { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.stat-title { font-size: 26rpx; color: #999; margin-bottom: 8rpx; }
.stat-value { font-size: 48rpx; font-weight: bold; color: #333; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 16rpx; }
.list { background: #fff; border-radius: 16rpx; overflow: hidden; }
.list-item { padding: 24rpx; border-bottom: 2rpx solid #f5f5f5; }
.item-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.item-name { font-size: 30rpx; font-weight: 500; color: #333; }
.item-desc { font-size: 26rpx; color: #999; margin-bottom: 12rpx; }
.item-meta { display: flex; gap: 12rpx; flex-wrap: wrap; }
.meta-tag { font-size: 22rpx; color: #999; padding: 4rpx 12rpx; background: #f5f5f5; border-radius: 6rpx; }
</style>
