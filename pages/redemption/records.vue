<template>
  <view class="page-container">
    <PageHeader title="兑换记录" />

    <view class="search-bar">
      <input 
        v-model="searchUserId" 
        class="search-input" 
        placeholder="用户ID" 
        type="number"
        @confirm="handleSearch"
      />
      <button class="search-btn" @click="handleSearch">搜索</button>
    </view>
    
    <view class="list">
      <view 
        v-for="item in list" 
        :key="item.id"
        class="list-item"
      >
        <view class="item-header">
          <view class="item-code">兑换码: {{ item.code }}</view>
          <view class="item-status" :class="item.status">{{ item.status }}</view>
        </view>
        <view class="item-meta">
          <text class="meta-tag">用户: {{ item.userId }}</text>
          <text class="meta-tag">产品: {{ item.productId }}</text>
          <text class="meta-tag">{{ formatDate(item.createdAt) }}</text>
        </view>
      </view>
    </view>
    
    <view class="pagination">
      <button 
        class="page-btn" 
        :disabled="pagination.page <= 1"
        @click="changePage(pagination.page - 1)"
      >上一页</button>
      <text class="page-info">{{ pagination.page }} / {{ pagination.pageCount || 1 }}</text>
      <button 
        class="page-btn" 
        :disabled="pagination.page >= pagination.pageCount"
        @click="changePage(pagination.page + 1)"
      >下一页</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getRedemptionRecordList } from '../../src/api/points.js'
import { DEFAULT_PAGE_SIZE } from '../../src/config/constant.js'
import { formatDate } from '../../src/utils/format.js'
import PageHeader from '../../src/components/PageHeader.vue'

const list = ref([])
const searchUserId = ref('')
const pagination = ref({ page: 1, pageSize: DEFAULT_PAGE_SIZE, pageCount: 0, total: 0 })

async function loadData() {
  try {
    const params = {
      'pagination[page]': pagination.value.page,
      'pagination[pageSize]': pagination.value.pageSize
    }
    if (searchUserId.value) {
      params['filters[userId][$eq]'] = searchUserId.value
    }
    const res = await getRedemptionRecordList(params)
    list.value = res.list
    pagination.value = res.pagination
  } catch (error) {
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

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  padding: 20rpx;
  box-sizing: border-box;
  background: #f5f5f5;
}

.search-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.search-input {
  flex: 1;
  height: 80rpx;
  padding: 0 24rpx;
  border: 1rpx solid #e0e0e0;
  border-radius: 16rpx;
  background: #fff;
  font-size: 28rpx;
}

.search-btn {
  width: 160rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: #667eea;
  color: #fff;
  border: none;
  border-radius: 16rpx;
  font-size: 28rpx;
}

.list {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
}

.list-item {
  padding: 32rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.item-code {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
}

.item-status {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  text-transform: uppercase;
}

.item-status.success {
  background: #e8f5e9;
  color: #07c160;
}

.item-status.failed {
  background: #ffebee;
  color: #ff4d4f;
}

.item-meta {
  display: flex;
  gap: 16rpx;
}

.meta-tag {
  font-size: 24rpx;
  color: #999;
  padding: 4rpx 16rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32rpx;
  margin-top: 32rpx;
  padding: 24rpx;
}

.page-btn {
  padding: 16rpx 32rpx;
  background: #fff;
  border: 1rpx solid #e0e0e0;
  border-radius: 16rpx;
  font-size: 28rpx;
}

.page-btn[disabled] {
  opacity: 0.5;
}

.page-info {
  font-size: 28rpx;
  color: #666;
}
</style>