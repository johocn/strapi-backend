<template>
  <view class="page-container">
    <PageHeader title="角色操作日志" />

    <view class="filter-bar">
      <input 
        v-model="filterOperatorId" 
        class="filter-input" 
        placeholder="操作人ID（可选）" 
        type="number"
      />
      <input 
        v-model="filterTargetUserId" 
        class="filter-input" 
        placeholder="目标用户ID（可选）" 
        type="number"
      />
      <button class="filter-btn" @click="handleFilter">筛选</button>
    </view>
    
    <view class="list">
      <view 
        v-for="item in list" 
        :key="item.id"
        class="list-item"
      >
        <view class="item-header">
          <text class="item-action" :class="item.action === 'assign' ? 'action-assign' : 'action-revoke'">
            {{ item.action === 'assign' ? '分配角色' : '撤销角色' }}
          </text>
          <text class="item-time">{{ formatTime(item.timestamp) }}</text>
        </view>
        <view class="item-body">
          <view class="item-row">
            <text class="item-label">操作人ID：</text>
            <text class="item-value">{{ item.operatorId }}</text>
          </view>
          <view class="item-row">
            <text class="item-label">目标用户ID：</text>
            <text class="item-value">{{ item.targetUserId }}</text>
          </view>
          <view class="item-row">
            <text class="item-label">角色：</text>
            <text class="item-value role-name">{{ getRoleLabel(item.role) }}</text>
          </view>
          <view class="item-row" v-if="item.reason">
            <text class="item-label">原因：</text>
            <text class="item-value reason">{{ item.reason }}</text>
          </view>
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
import { getActionLogs, ROLES, ROLE_LABELS } from '../../api/role-management.js'
import { DEFAULT_PAGE_SIZE } from '../../config/constant.js'
import { checkAuth } from '../../utils/auth.js'
import { useUserStore } from '../../store/user.js'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const list = ref([])
const filterOperatorId = ref('')
const filterTargetUserId = ref('')
const pagination = ref({ page: 1, pageSize: DEFAULT_PAGE_SIZE, pageCount: 0, total: 0 })

function getRoleLabel(role) {
  return ROLE_LABELS[role] || role
}

function formatTime(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

async function loadData() {
  try {
    const params = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    }
    if (filterOperatorId.value) {
      params.operatorId = parseInt(filterOperatorId.value)
    }
    if (filterTargetUserId.value) {
      params.userId = parseInt(filterTargetUserId.value)
    }
    
    const res = await getActionLogs(params)
    list.value = res.list || []
    pagination.value = res.pagination || { page: 1, pageSize: DEFAULT_PAGE_SIZE, pageCount: 0, total: 0 }
  } catch (error) {
    uni.showToast({ title: '加载失败，请稍后重试', icon: 'none' })
  }
}

function handleFilter() {
  pagination.value.page = 1
  loadData()
}

function changePage(page) {
  pagination.value.page = page
  loadData()
}

onMounted(() => {
  if (!checkAuth()) {
    return
  }
  if (!hasPermission('menu.role-logs')) {
    uni.showToast({ title: '无权限访问', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
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

.filter-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
  flex-wrap: wrap;
}

.filter-input {
  flex: 1;
  min-width: 240rpx;
  height: 80rpx;
  background: white;
  border-radius: 8rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}

.filter-btn {
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 32rpx;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.list {
  margin-bottom: 24rpx;
}

.list-item {
  background: white;
  padding: 24rpx;
  margin-bottom: 16rpx;
  border-radius: 8rpx;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #eee;
}

.item-action {
  font-size: 28rpx;
  font-weight: 500;
}

.action-assign {
  color: #52c41a;
}

.action-revoke {
  color: #ff4d4f;
}

.item-time {
  font-size: 24rpx;
  color: #999;
}

.item-body {
  padding-top: 8rpx;
}

.item-row {
  display: flex;
  margin-bottom: 12rpx;
}

.item-label {
  font-size: 26rpx;
  color: #666;
  min-width: 160rpx;
}

.item-value {
  font-size: 26rpx;
  color: #333;
  flex: 1;
}

.role-name {
  color: #1890ff;
  font-weight: 500;
}

.reason {
  color: #666;
  word-break: break-all;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.page-btn {
  padding: 12rpx 32rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  background: white;
  font-size: 26rpx;
}

.page-info {
  font-size: 26rpx;
  color: #666;
}
</style>
