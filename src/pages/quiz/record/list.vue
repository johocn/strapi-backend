<template>
  <view class="page-container">
    <PageHeader title="答题记录" />

    <view class="search-section">
      <view class="search-box">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="搜索用户名或题目"
          @confirm="loadData"
          class="search-input"
        />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <view
          v-for="(tab, index) in statusTabs"
          :key="index"
          class="filter-item"
          :class="{ active: activeTab === index }"
          @click="handleTabChange(index)"
        >
          <text>{{ tab }}</text>
        </view>
      </view>
    </view>

    <view class="record-list">
      <view
        v-for="item in recordList"
        :key="item.documentId"
        class="record-card"
      >
        <view class="record-info">
          <view class="record-title">
            <text class="title-text">{{ item.quiz?.title || item.exam?.title || '-' }}</text>
            <view class="status-badge" :class="item.status">
              {{ item.status === 'pending' ? '待评分' : '已评分' }}
            </view>
          </view>
          <view class="record-meta">
            <text class="meta-item">用户: {{ item.user?.username || item.user?.nickname || '-' }}</text>
            <text class="meta-item">得分: {{ item.score != null ? item.score : '-' }}</text>
          </view>
        </view>
        <view class="record-actions">
          <view class="action-btn detail" @click="goDetail(item.documentId)">详情</view>
          <view v-if="item.status === 'pending'" class="action-btn grade" @click="goGrade(item.documentId)">评分</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && recordList.length === 0" class="empty-state">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无答题记录</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import PageHeader from '../../../components/PageHeader.vue'
import { getQuizRecordList, getPendingGrading } from '../../../api/quiz.js'

const searchKeyword = ref('')
const activeTab = ref(0)
const statusTabs = ['全部', '待评分', '已评分']

const recordList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = {
      'pagination[page]': page,
      'pagination[pageSize]': 10
    }
    if (searchKeyword.value) {
      params['filters[$or][0][user][username][$contains]'] = searchKeyword.value
      params['filters[$or][1][quiz][title][$contains]'] = searchKeyword.value
    }
    if (activeTab.value === 1) {
      params['filters[status][$eq]'] = 'pending'
    } else if (activeTab.value === 2) {
      params['filters[status][$eq]'] = 'graded'
    }

    const apiFn = activeTab.value === 1 ? getPendingGrading : getQuizRecordList
    const { list, pagination: pg } = await apiFn(params)
    recordList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleTabChange(index) {
  activeTab.value = index
  loadData(1)
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/quiz/record/detail?id=${id}` })
}

function goGrade(id) {
  uni.navigateTo({ url: `/pages/quiz/record/detail?id=${id}&action=grade` })
}

function prevPage() {
  if (currentPage.value > 1) {
    loadData(currentPage.value - 1)
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    loadData(currentPage.value + 1)
  }
}

onMounted(() => {
  loadData(1)
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20rpx;
  box-sizing: border-box;
}

.search-section {
  background: #fff;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.search-box {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 0 20rpx;
  margin-bottom: 20rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
}

.search-icon {
  font-size: 32rpx;
}

.filter-row {
  display: flex;
  gap: 20rpx;
}

.filter-item {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12rpx 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #666;
}

.filter-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.record-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
}

.record-info {
  flex: 1;
  padding-right: 20rpx;
}

.record-title {
  display: flex;
  align-items: center;
  gap: 15rpx;
  margin-bottom: 12rpx;
}

.title-text {
  flex: 1;
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
  flex-shrink: 0;
}

.status-badge.pending {
  background: #fff3e0;
  color: #ff9500;
}

.status-badge.graded {
  background: #e8f5e9;
  color: #07c160;
}

.record-meta {
  display: flex;
  gap: 15rpx;
}

.meta-item {
  font-size: 24rpx;
  color: #999;
}

.record-actions {
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

.action-btn.detail {
  background: #f0f0f0;
  color: #1989fa;
}

.action-btn.grade {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

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
