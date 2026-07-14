<template>
  <view class="page-container">
    <PageHeader title="OSS 同步记录" />

    <view class="search-bar">
      <input v-model="keyword" class="search-input" placeholder="搜索文件名" @confirm="handleSearch" />
      <button class="search-btn" @click="handleSearch">搜索</button>
    </view>

    <view class="action-bar">
      <button class="action-btn" @click="handleTriggerSync">手动同步</button>
    </view>

    <view class="list">
      <view v-for="item in list" :key="item.id || item.documentId" class="list-item">
        <view class="item-header">
          <text class="item-name">{{ item.fileName || '-' }}</text>
          <text class="meta-tag" :style="{ color: item.status === 'success' ? '#07c160' : item.status === 'failed' ? '#ff4d4f' : '#faad14' }">{{ item.status }}</text>
        </view>
        <view class="item-desc">大小: {{ item.fileSize || '-' }}</view>
        <view class="item-meta">
          <text class="meta-tag">同步时间: {{ item.syncedAt || '-' }}</text>
        </view>
      </view>
    </view>

    <view class="pagination">
      <button class="page-btn" :disabled="pagination.page <= 1" @click="changePage(pagination.page - 1)">上一页</button>
      <text class="page-info">{{ pagination.page }} / {{ totalPages }}</text>
      <button class="page-btn" :disabled="pagination.page >= totalPages" @click="changePage(pagination.page + 1)">下一页</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getOssSyncRecords, triggerOssSync, batchOssSync, deleteOssSyncRemote } from '../../src/api/oss-admin.js'
import { DEFAULT_PAGE_SIZE } from '../../src/config/constant.js'
import PageHeader from '../../src/components/PageHeader.vue'

const list = ref([])
const keyword = ref('')
const pagination = ref({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.value.total / pagination.value.pageSize)))

async function loadData() {
  try {
    const params = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    }
    if (keyword.value) {
      params.keyword = keyword.value
    }
    const res = await getOssSyncRecords(params)
    list.value = res.list || []
    pagination.value = res.pagination || { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function handleSearch() {
  pagination.value.page = 1
  loadData()
}

function changePage(page) {
  pagination.value.page = page
  loadData()
}

async function handleTriggerSync() {
  try {
    await triggerOssSync({})
    uni.showToast({ title: '同步已触发', icon: 'success' })
    loadData()
  } catch (e) {
    uni.showToast({ title: '触发失败', icon: 'none' })
  }
}

onMounted(() => loadData())
</script>

<style scoped>
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; background: #f5f5f5; }
.search-bar { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.search-input { flex: 1; height: 72rpx; padding: 0 24rpx; border: 2rpx solid #e0e0e0; border-radius: 12rpx; background: #fff; font-size: 28rpx; }
.search-btn { width: 140rpx; height: 72rpx; line-height: 72rpx; background: #667eea; color: #fff; border: none; border-radius: 12rpx; font-size: 28rpx; }
.action-bar { margin-bottom: 20rpx; }
.action-btn { background: #667eea; color: #fff; height: 72rpx; line-height: 72rpx; border: none; border-radius: 12rpx; font-size: 28rpx; }
.list { background: #fff; border-radius: 16rpx; overflow: hidden; }
.list-item { padding: 24rpx; border-bottom: 2rpx solid #f5f5f5; }
.item-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.item-name { font-size: 30rpx; font-weight: 500; color: #333; }
.item-desc { font-size: 26rpx; color: #999; margin-bottom: 12rpx; }
.item-meta { display: flex; gap: 12rpx; flex-wrap: wrap; }
.meta-tag { font-size: 22rpx; color: #999; padding: 4rpx 12rpx; background: #f5f5f5; border-radius: 6rpx; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 24rpx; margin-top: 24rpx; padding: 20rpx; }
.page-btn { padding: 12rpx 28rpx; background: #fff; border: 2rpx solid #e0e0e0; border-radius: 12rpx; font-size: 28rpx; }
.page-btn[disabled] { opacity: 0.5; }
.page-info { font-size: 28rpx; color: #666; }
</style>
