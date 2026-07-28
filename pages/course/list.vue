<template>
  <view class="page-container">
    <PageHeader title="课程管理">
      <button class="btn-secondary" @click="goCategory">分类</button>
      <button class="btn-secondary" @click="goTag">标签</button>
      <button class="btn-primary" @click="goAdd" v-if="hasPermission('course.create')">+ 新增课程</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input 
          type="text" 
          v-model="searchKeyword" 
          placeholder="搜索课程名称"
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
        <picker mode="selector" :range="categoryOptions" @change="handleCategoryChange">
          <view class="filter-item">
            <text>{{ categoryOptions[categoryIndex] || '课程分类' }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="course-list">
      <view 
        v-for="item in courseList" 
        :key="item.documentId" 
        class="course-card"
        @click="goDetail(item.documentId)"
      >
        <view class="course-cover">
          <image
            :src="item.coverUrl || '/static/default-course.jpg'"
            mode="aspectFill"
            class="cover-image"
            @error="onCoverError(item)"
          />
          <view class="course-status" :class="item.status">
            {{ getStatusText(item.status) }}
          </view>
        </view>
        <view class="course-info">
          <view class="course-title">{{ item.title }}</view>
          <view class="course-meta">
            <text class="meta-item">📝 {{ item.description?.substring(0, 50) }}...</text>
          </view>
          <view class="course-footer">
            <view class="course-price">
              <text v-if="item.isFree" class="free-tag">免费</text>
              <text v-else class="price-tag">¥{{ (item.price / 100).toFixed(2) }}</text>
            </view>
            <view class="course-stats">
              <text class="stat-item">{{ item.studentCount || 0 }} 学员</text>
              <text class="stat-item">⏱️ {{ item.duration }}</text>
            </view>
          </view>
        </view>
        <view class="course-actions">
          <view v-if="(item.status === 'draft' || item.status === 'pending') && hasPermission('course.publish')" class="action-btn publish" @click.stop="handlePublish(item)">发布</view>
          <view v-if="item.status === 'published' && hasPermission('course.publish')" class="action-btn unpublish" @click.stop="handleUnpublish(item)">下架</view>
          <view v-if="hasPermission('course.update')" class="action-btn edit" @click.stop="goEdit(item.documentId)">编辑</view>
          <view v-if="hasPermission('course.delete')" class="action-btn delete" @click.stop="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && courseList.length === 0" class="empty-state">
      <text class="empty-icon">📚</text>
      <text class="empty-text">暂无课程</text>
      <button class="btn-primary" @click="goAdd" v-if="hasPermission('course.create')">立即添加</button>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <view class="fab-btn" @click="goAdd" v-if="hasPermission('course.create')">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onPageShow, onShow } from '@dcloudio/uni-app'
import { getCourseList, deleteCourse, publishCourse, unpublishCourse, getCourseCategoryList } from '../../src/api/course.js'
import { useUserStore } from '../../src/store/user.js'
import PageHeader from '../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const statusIndex = ref(0)
const categoryIndex = ref(0)
const statusOptions = ['全部状态', '草稿', '待审核', '已发布', '已归档']
const categoryOptions = ['全部分类']
const categoryMap = {}

const courseList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

const statusMap = {
  draft: '草稿',
  pending: '待审核',
  published: '已发布',
  archived: '已归档'
}

function getStatusText(status) {
  return statusMap[status] || status
}

// 图片加载失败时清空 coverUrl，避免破图（fallback 到占位图）
function onCoverError(item) {
  if (item) item.coverUrl = ''
}

async function loadCategories() {
  try {
    const { list } = await getCourseCategoryList()
    list.forEach(cat => {
      categoryOptions.push(cat.name)
      categoryMap[cat.name] = cat.documentId
    })
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = {
      'pagination[page]': page,
      'pagination[pageSize]': 10
    }
    if (searchKeyword.value) {
      params['filters[title][$contains]'] = searchKeyword.value
    }
    if (statusIndex.value > 0) {
      const statusMapReverse = {
        1: 'draft',
        2: 'pending',
        3: 'published',
        4: 'archived'
      }
      params['filters[status]'] = statusMapReverse[statusIndex.value]
    }
    if (categoryIndex.value > 0) {
      const categoryId = categoryMap[categoryOptions[categoryIndex.value]]
      if (categoryId) {
        params['filters[category][documentId]'] = categoryId
      }
    }
    const { list, pagination: pg } = await getCourseList(params)
    courseList.value = list
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

function handleCategoryChange(e) {
  categoryIndex.value = e.detail.value
  loadData(1)
}

function goAdd() {
  uni.navigateTo({ url: '/pages/course/form' })
}

function goCategory() {
  uni.navigateTo({ url: '/pages/course/category/list' })
}

function goTag() {
  uni.navigateTo({ url: '/pages/course/tag/list' })
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/course/detail?id=${id}` })
}

function goEdit(id) {
  uni.navigateTo({ url: `/pages/course/form?id=${id}` })
}

async function handleDelete(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除课程「${item.title}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteCourse(item.documentId)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

async function handlePublish(item) {
  uni.showModal({
    title: '确认发布',
    content: `确定要发布课程「${item.title}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await publishCourse(item.documentId)
          uni.showToast({ title: '发布成功', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '发布失败', icon: 'none' })
        }
      }
    }
  })
}

async function handleUnpublish(item) {
  uni.showModal({
    title: '确认下架',
    content: `确定要下架课程「${item.title}」吗？下架后C端将无法查看该课程。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await unpublishCourse(item.documentId)
          uni.showToast({ title: '已下架', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '下架失败', icon: 'none' })
        }
      }
    }
  })
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

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

onShow(async () => {
  await loadCategories()
  loadData(1)
})

onPageShow(() => loadData(currentPage.value))
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

/* 顶部红色按钮 */
.btn-primary {
  background: #ff0000;
  color: #ffffff;
  padding: 16rpx 32rpx;
  font-size: 30rpx;
  border-radius: 8rpx;
  border: none;
  line-height: 1.2;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
  padding: 16rpx 32rpx;
  font-size: 30rpx;
  border-radius: 8rpx;
  border: none;
  line-height: 1.2;
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
  align-items: center;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.arrow {
  font-size: 20rpx;
  color: #999;
}

.course-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.course-card {
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  display: flex;
  padding: 20rpx;
  align-items: center;
}

.course-cover {
  position: relative;
  width: 200rpx;
  height: 150rpx;
  flex-shrink: 0;
}

.cover-image {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
}

.course-status {
  position: absolute;
  bottom: 8rpx;
  left: 8rpx;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 20rpx;
  color: #fff;
}

.course-status.draft { background: #999; }
.course-status.pending { background: #ff9500; }
.course-status.published { background: #07c160; }
.course-status.archived { background: #666; }

.course-info {
  flex: 1;
  padding: 0 20rpx;
  display: flex;
  flex-direction: column;
}

.course-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
}

.course-meta {
  flex: 1;
}

.meta-item {
  font-size: 24rpx;
  color: #999;
}

.course-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12rpx;
}

.course-price {
  display: flex;
  gap: 8rpx;
}

.free-tag {
  color: #07c160;
  font-size: 24rpx;
  font-weight: bold;
}

.price-tag {
  color: #ff5722;
  font-size: 28rpx;
  font-weight: bold;
}

.course-stats {
  display: flex;
  gap: 16rpx;
}

.stat-item {
  font-size: 22rpx;
  color: #999;
}

.course-actions {
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

.action-btn.edit {
  background: #f5f5f5;
  color: #1989fa;
}

.action-btn.delete {
  background: #fff0f0;
  color: #ff4d4f;
}

.action-btn.publish { background: #e8f5e9; color: #07c160; }
.action-btn.unpublish { background: #fff3e0; color: #faad14; }

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

/* 悬浮按钮 */
.fab-btn {
  position: fixed;
  right: 40rpx;
  bottom: 120rpx;
  width: 120rpx;
  height: 120rpx;
  background: #07c160;
  color: white;
  border-radius: 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 999;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.2);
}
.fab-icon {
  font-size: 40rpx;
  line-height: 1;
}
.fab-text {
  font-size: 22rpx;
  margin-top: 6rpx;
}
</style>