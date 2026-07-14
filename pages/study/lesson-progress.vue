<template>
  <view class="page-container">
    <PageHeader title="课时学习进度" />

    <view class="search-section">
      <view class="search-box">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="搜索用户或课时"
          @confirm="loadData"
          class="search-input"
        />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="statusOptions" @change="handleStatusChange">
          <view class="filter-item">
            <text>{{ statusOptions[statusIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="progress-list">
      <view
        v-for="item in progressList"
        :key="item.documentId"
        class="progress-card"
      >
        <view class="progress-info">
          <view class="progress-user">{{ item.user?.username || item.user?.email || '未知用户' }}</view>
          <view class="progress-lesson">{{ item.lesson?.title || '未知课时' }}</view>
          <view class="progress-course-sub" v-if="item.course?.title">{{ item.course.title }}</view>
          <view class="progress-bar-row">
            <view class="progress-bar">
              <view class="progress-fill" :style="{ width: (item.progress || 0) + '%' }"></view>
            </view>
            <text class="progress-pct">{{ (item.progress || 0) }}%</text>
          </view>
          <view class="progress-meta">
            <view class="status-badge" :class="{ completed: item.isCompleted }">
              {{ item.isCompleted ? '已完成' : '学习中' }}
            </view>
            <text class="meta-item" v-if="item.duration">时长: {{ formatDuration(item.duration) }}</text>
            <text class="meta-item" v-if="item.isAnswered">{{ item.isCorrect ? '答对' : '答错' }}</text>
            <text class="meta-item" v-if="item.pointsEarned">{{ item.pointsEarned }} 积分</text>
            <text class="meta-item" v-if="item.lastStudyAt">{{ formatDate(item.lastStudyAt) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && progressList.length === 0" class="empty-state">
      <text class="empty-icon">📊</text>
      <text class="empty-text">暂无课时进度</text>
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
import { getLessonProgressList } from '../../src/api/course.js'

const searchKeyword = ref('')
const statusIndex = ref(0)
const statusOptions = ['全部状态', '学习中', '已完成']

const progressList = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = {
      'pagination[page]': page,
      'pagination[pageSize]': 20,
    }
    if (searchKeyword.value) {
      params['filters[user][username][$contains]'] = searchKeyword.value
    }
    if (statusIndex.value === 1) {
      params['filters[isCompleted][$eq]'] = 'false'
    } else if (statusIndex.value === 2) {
      params['filters[isCompleted][$eq]'] = 'true'
    }
    const { list, pagination: pg } = await getLessonProgressList(params)
    progressList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleStatusChange(e) {
  statusIndex.value = e.detail.value
  loadData(1)
}

function prevPage() {
  if (currentPage.value > 1) loadData(currentPage.value - 1)
}

function nextPage() {
  if (currentPage.value < totalPages.value) loadData(currentPage.value + 1)
}

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

onMounted(() => loadData(1))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.search-box {
  display: flex; align-items: center; background: #f5f5f5;
  border-radius: 8rpx; padding: 0 20rpx; margin-bottom: 16rpx;
}
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }

.filter-row { display: flex; gap: 20rpx; }
.filter-item {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx;
}
.arrow { font-size: 20rpx; color: #999; }

.progress-list { display: flex; flex-direction: column; gap: 20rpx; }

.progress-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx;
}
.progress-user { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 6rpx; }
.progress-lesson { font-size: 28rpx; color: #333; margin-bottom: 4rpx; }
.progress-course-sub { font-size: 24rpx; color: #999; margin-bottom: 16rpx; }

.progress-bar-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.progress-bar {
  flex: 1; height: 16rpx; background: #f0f0f0; border-radius: 8rpx; overflow: hidden;
}
.progress-fill {
  height: 100%; background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 8rpx; transition: width 0.3s;
}
.progress-pct { font-size: 26rpx; color: #667eea; font-weight: bold; min-width: 80rpx; text-align: right; }

.progress-meta { display: flex; align-items: center; gap: 16rpx; flex-wrap: wrap; }
.meta-item { font-size: 24rpx; color: #999; }

.status-badge {
  padding: 4rpx 16rpx; border-radius: 6rpx; font-size: 22rpx;
  background: #fff3e0; color: #faad14;
}
.status-badge.completed { background: #e8f5e9; color: #52c41a; }

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0;
}
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }

.pagination {
  display: flex; justify-content: center; align-items: center;
  gap: 40rpx; padding: 40rpx 0;
}
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>
