<template>
  <view class="page-container">
    <PageHeader title="定时发布">
      <button
        class="btn-primary"
        v-if="hasPermission('studio.publish.publish')"
        @click="goCreate"
      >+ 新建</button>
    </PageHeader>

    <view class="filter-bar">
      <view
        v-for="opt in statusOptions"
        :key="opt.value"
        class="filter-tab"
        :class="{ active: filterStatus === opt.value }"
        @click="handleFilterChange(opt.value)"
      >{{ opt.label }}</view>
    </view>

    <view class="data-list">
      <view
        v-for="item in dataList"
        :key="item.documentId"
        class="data-card"
      >
        <view class="data-info">
          <view class="data-title">{{ item.name || '未命名预约' }}</view>
          <view class="data-meta">
            <text class="meta-item">📄 {{ item.article?.title || item.article?.documentId || '-' }}</text>
            <text class="meta-item">👥 {{ Array.isArray(item.accountIds) ? item.accountIds.length : 0 }} 个账号</text>
          </view>
          <view class="data-meta">
            <text class="meta-item">🕒 预约：{{ formatDate(item.scheduledAt) }}</text>
            <text class="meta-item">✅ 触发：{{ item.triggeredAt ? formatDate(item.triggeredAt) : '-' }}</text>
          </view>
          <view class="data-footer">
            <view class="data-status" :style="{ background: getStatusMeta(item.status).color }">{{ getStatusMeta(item.status).text }}</view>
          </view>
        </view>
        <view class="data-actions">
          <view
            v-if="item.status === 'scheduled' && hasPermission('studio.publish.publish')"
            class="action-btn cancel"
            @click.stop="handleCancel(item)"
          >取消</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && dataList.length === 0" class="empty-state">
      <text class="empty-icon">⏰</text>
      <text class="empty-text">暂无定时发布任务</text>
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
import { publishScheduleApi } from '../../../api/studio.js'
import { formatDate } from '../../../utils/format.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待触发', value: 'scheduled' },
  { label: '已触发', value: 'triggered' },
  { label: '已取消', value: 'cancelled' },
  { label: '已过期', value: 'expired' }
]

const statusMap = {
  scheduled: { text: '待触发', color: '#1989fa' },
  triggered: { text: '已触发', color: '#07c160' },
  cancelled: { text: '已取消', color: '#999' },
  expired: { text: '已过期', color: '#faad14' }
}

function getStatusMeta(status) {
  return statusMap[status] || { text: status || '-', color: '#999' }
}

const filterStatus = ref('')

const dataList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = {
      'pagination[page]': page,
      'pagination[pageSize]': 10,
      'populate': '*'
    }
    if (filterStatus.value) {
      params['filters[status]'] = filterStatus.value
    }
    const { list, pagination: pg } = await publishScheduleApi.list(params)
    // 优先后端过滤；若后端未生效，前端兜底再过滤一次
    dataList.value = filterStatus.value ? list.filter(item => item.status === filterStatus.value) : list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleFilterChange(value) {
  if (filterStatus.value === value) return
  filterStatus.value = value
  loadData(1)
}

function goCreate() {
  uni.navigateTo({ url: '/pages/studio/publish-center/index' })
}

function handleCancel(item) {
  uni.showModal({
    title: '确认取消',
    content: `确定要取消预约「${item.name || '未命名预约'}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await publishScheduleApi.cancel(item.documentId)
          uni.showToast({ title: '已取消', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: e?.message || e?.msg || '取消失败', icon: 'none' })
        }
      }
    }
  })
}

function prevPage() {
  if (currentPage.value > 1) loadData(currentPage.value - 1)
}

function nextPage() {
  if (currentPage.value < totalPages.value) loadData(currentPage.value + 1)
}

onShow(() => {
  loadData(1)
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

.btn-primary {
  background: #ff0000;
  color: #ffffff;
  padding: 16rpx 32rpx;
  font-size: 30rpx;
  border-radius: 8rpx;
  border: none;
  line-height: 1.2;
}

.filter-bar {
  display: flex;
  gap: 16rpx;
  background: #fff;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.filter-tab {
  flex: 1;
  text-align: center;
  padding: 12rpx 0;
  font-size: 26rpx;
  color: #666;
  background: #f5f5f5;
  border-radius: 8rpx;
}

.filter-tab.active {
  background: #1989fa;
  color: #fff;
}

.data-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.data-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
}

.data-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.data-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
}

.data-meta {
  flex: 1;
  margin-bottom: 8rpx;
}

.meta-item {
  font-size: 24rpx;
  color: #999;
  margin-right: 16rpx;
}

.data-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12rpx;
}

.data-status {
  padding: 4rpx 16rpx;
  border-radius: 4rpx;
  font-size: 22rpx;
  color: #fff;
}

.data-actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.action-btn {
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  text-align: center;
}

.action-btn.cancel { background: #fff0f0; color: #ff4d4f; }

.loading, .empty-state {
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
  margin-bottom: 20rpx;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40rpx;
  padding: 40rpx 0;
}

.pagination-btn {
  padding: 16rpx 32rpx;
  background: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.pagination-btn.disabled {
  color: #999;
  background: #f5f5f5;
}

.pagination-info {
  font-size: 28rpx;
  color: #666;
}
</style>