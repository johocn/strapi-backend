<template>
  <view class="page-container">
    <PageHeader title="课时管理">
      <button class="btn-primary" @click="goAdd" v-if="hasPermission('lesson.create')">+ 新增课时</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input 
          type="text" 
          v-model="searchKeyword" 
          placeholder="搜索课时名称"
          @confirm="loadData"
          class="search-input"
        />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="courseOptions" @change="handleCourseChange">
          <view class="filter-item">
            <text>{{ courseOptions[courseIndex] || '选择课程' }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <picker mode="selector" :range="typeOptions" @change="handleTypeChange">
          <view class="filter-item">
            <text>{{ typeOptions[typeIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="lesson-list">
      <view 
        v-for="item in lessonList" 
        :key="item.documentId" 
        class="lesson-card"
        @click="goDetail(item.documentId)"
      >
        <view class="lesson-cover">
          <image
            v-if="item.thumbnailUrl"
            :src="item.thumbnailUrl"
            mode="aspectFill"
            class="cover-image"
          />
          <view v-else class="cover-placeholder">
            <text class="cover-type">{{ getTypeText(item.type) }}</text>
          </view>
          <view class="lesson-type">
            {{ getTypeText(item.type) }}
          </view>
          <view v-if="item.imageUrls?.length" class="image-count">
            {{ item.imageUrls.length }}图
          </view>
        </view>
        <view class="lesson-info">
          <view class="lesson-title">{{ item.title }}</view>
          <view class="lesson-meta">
            <text class="meta-item">{{ item.course?.title || '未关联课程' }}</text>
          </view>
          <view class="lesson-footer">
            <view class="lesson-duration">
              <text>⏱️ {{ formatDuration(item.duration) }}</text>
            </view>
            <view class="lesson-status">
              <text v-if="item.isFreePreview" class="free-tag">可预览</text>
              <text v-if="item.isRequired" class="required-tag">必修</text>
            </view>
          </view>
        </view>
        <view class="lesson-actions">
          <view class="action-btn edit" @click.stop="goEdit(item.documentId)">编辑</view>
          <view class="action-btn delete" @click.stop="handleDelete(item)" v-if="hasPermission('lesson.delete')">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && lessonList.length === 0" class="empty-state">
      <text class="empty-icon">🎬</text>
      <text class="empty-text">暂无课时</text>
      <button class="btn-primary" @click="goAdd">立即添加</button>
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
import { onPageShow, onShow } from '@dcloudio/uni-app'
import { getLessonList, deleteLesson, getCourseList } from '../../../src/api/course.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const courseIndex = ref(0)
const typeIndex = ref(0)
const courseOptions = ['全部课程']
const courseMap = {}
const typeOptions = ['全部类型', 'video', 'audio', 'article', 'quiz']

const lessonList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

const typeMap = {
  video: '视频',
  audio: '音频',
  article: '图文',
  quiz: '测验'
}

function getTypeText(type) {
  return typeMap[type] || type
}

function formatDuration(seconds) {
  if (!seconds) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

async function loadCourses() {
  try {
    const { list } = await getCourseList()
    list.forEach(course => {
      courseOptions.push(course.title)
      courseMap[course.title] = course.documentId
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
    if (courseIndex.value > 0) {
      const courseId = courseMap[courseOptions[courseIndex.value]]
      if (courseId) {
        params['filters[course][documentId]'] = courseId
      }
    }
    if (typeIndex.value > 0) {
      params['filters[type]'] = typeOptions[typeIndex.value]
    }
    const { list, pagination: pg } = await getLessonList(params)
    lessonList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleCourseChange(e) {
  courseIndex.value = e.detail.value
  loadData(1)
}

function handleTypeChange(e) {
  typeIndex.value = e.detail.value
  loadData(1)
}

function goAdd() {
  uni.navigateTo({ url: '/pages/course/lesson/form' })
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/course/lesson/detail?id=${id}` })
}

function goEdit(id) {
  uni.navigateTo({ url: `/pages/course/lesson/form?id=${id}` })
}

async function handleDelete(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除课时「${item.title}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteLesson(item.documentId)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
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
  await loadCourses()
  loadData(1)
})

onPageShow(() => loadData(currentPage.value))
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20rpx;
}

.btn-primary {
  background: #1989fa;
  color: #fff;
  border: none;
  padding: 16rpx 32rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
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

.lesson-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.lesson-card {
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  display: flex;
  padding: 20rpx;
}

.lesson-cover {
  position: relative;
  width: 160rpx;
  height: 120rpx;
  flex-shrink: 0;
}

.cover-image {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
}

.cover-type {
  font-size: 28rpx;
  color: #999;
}

.image-count {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  padding: 4rpx 12rpx;
  background: rgba(0,0,0,0.6);
  border-radius: 4rpx;
  font-size: 20rpx;
  color: #fff;
}

.lesson-type {
  position: absolute;
  bottom: 8rpx;
  left: 8rpx;
  padding: 4rpx 12rpx;
  background: rgba(0,0,0,0.6);
  border-radius: 4rpx;
  font-size: 20rpx;
  color: #fff;
}

.lesson-info {
  flex: 1;
  padding: 0 20rpx;
  display: flex;
  flex-direction: column;
}

.lesson-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
}

.lesson-meta {
  flex: 1;
}

.meta-item {
  font-size: 24rpx;
  color: #999;
}

.lesson-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12rpx;
}

.lesson-duration {
  font-size: 22rpx;
  color: #666;
}

.lesson-status {
  display: flex;
  gap: 8rpx;
}

.free-tag {
  padding: 4rpx 12rpx;
  background: #e3f2fd;
  color: #1989fa;
  border-radius: 4rpx;
  font-size: 20rpx;
}

.required-tag {
  padding: 4rpx 12rpx;
  background: #fff3e0;
  color: #ff9500;
  border-radius: 4rpx;
  font-size: 20rpx;
}

.lesson-actions {
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