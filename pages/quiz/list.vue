<template>
  <view class="page-container">
    <PageHeader title="题库管理">
      <button class="btn-secondary" @click="goBatchUpload">批量导入</button>
        <button class="btn-primary" @click="goAdd" v-if="hasPermission('quiz.create')">+ 新增题目</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input 
          type="text" 
          v-model="searchKeyword" 
          placeholder="搜索题目内容"
          @confirm="loadData"
          class="search-input"
        />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="typeOptions" @change="handleTypeChange">
          <view class="filter-item">
            <text>{{ typeOptions[typeIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <picker mode="selector" :range="difficultyOptions" @change="handleDifficultyChange">
          <view class="filter-item">
            <text>{{ difficultyOptions[difficultyIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="question-list">
      <view 
        v-for="item in questionList" 
        :key="item.documentId" 
        class="question-card"
      >
        <view class="question-info">
          <view class="question-title">
            <view class="question-type" :style="{ background: getTypeColor(item.type) }">
              {{ getTypeText(item.type) }}
            </view>
            <text class="title-text">{{ item.title }}</text>
          </view>
          <view class="question-meta">
            <text class="meta-item">难度: {{ getDifficultyText(item.difficulty) }}</text>
            <text class="meta-item">分值: {{ item.points || 0 }}分</text>
            <text class="meta-item" :class="item.isPublished ? 'status-active' : 'status-draft'">
              {{ item.isPublished ? '已发布' : '草稿' }}
            </text>
          </view>
        </view>
        <view class="question-actions">
          <view class="action-btn edit" @click="goEdit(item.documentId)">编辑</view>
          <view class="action-btn delete" @click="handleDelete(item)" v-if="hasPermission('quiz.delete')">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && questionList.length === 0" class="empty-state">
      <text class="empty-icon">📝</text>
      <text class="empty-text">暂无题目</text>
      <button class="btn-primary" @click="goAdd" v-if="hasPermission('quiz.create')">立即添加</button>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <view class="fab-btn" @click="goAdd" v-if="hasPermission('quiz.create')">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import PageHeader from '../../src/components/PageHeader.vue'
import { getQuestionList, deleteQuestion } from '../../src/api/quiz.js'
import { useUserStore } from '../../src/store/user.js'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const typeIndex = ref(0)
const difficultyIndex = ref(0)
const typeOptions = ['全部类型', '单选题', '多选题', '判断题', '填空题', '简答题', '配对题', '排序题']
const typeValues = ['', 'single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'matching', 'ordering']
const difficultyOptions = ['全部难度', '简单', '中等', '困难']
const difficultyValues = ['', 'easy', 'medium', 'hard']

const questionList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

function getTypeText(type) {
  const map = {
    'single_choice': '单选',
    'multiple_choice': '多选',
    'true_false': '判断',
    'fill_blank': '填空',
    'short_answer': '简答',
    'matching': '配对',
    'ordering': '排序'
  }
  return map[type] || type
}

function getTypeColor(type) {
  const map = {
    'single_choice': '#667eea',
    'multiple_choice': '#764ba2',
    'true_false': '#07c160',
    'fill_blank': '#ff9500',
    'short_answer': '#ff4d4f',
    'matching': '#13c2c2',
    'ordering': '#eb2f96'
  }
  return map[type] || '#667eea'
}

function getDifficultyText(difficulty) {
  const map = {
    'easy': '简单',
    'medium': '中等',
    'hard': '困难'
  }
  return map[difficulty] || difficulty
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
    if (typeValues[typeIndex.value]) {
      params['filters[type][$eq]'] = typeValues[typeIndex.value]
    }
    if (difficultyValues[difficultyIndex.value]) {
      params['filters[difficulty][$eq]'] = difficultyValues[difficultyIndex.value]
    }
    const { list, pagination: pg } = await getQuestionList(params)
    questionList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleTypeChange(e) {
  typeIndex.value = e.detail.value
  loadData(1)
}

function handleDifficultyChange(e) {
  difficultyIndex.value = e.detail.value
  loadData(1)
}

function goAdd() {
  uni.navigateTo({ url: '/pages/quiz/form' })
}

function goEdit(id) {
  uni.navigateTo({ url: `/pages/quiz/form?id=${id}` })
}

function goBatchUpload() {
  uni.navigateTo({ url: '/pages/quiz/batch-upload' })
}

async function handleDelete(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除该题目吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteQuestion(item.documentId)
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

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 15rpx 30rpx;
  border: none;
  border-radius: 40rpx;
  font-size: 28rpx;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
  padding: 15rpx 30rpx;
  border: none;
  border-radius: 40rpx;
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
  align-items: center;
}

.filter-item {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.arrow {
  font-size: 20rpx;
  color: #999;
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.question-card {
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  display: flex;
  padding: 20rpx;
  align-items: center;
}

.question-info {
  flex: 1;
  padding-right: 20rpx;
}

.question-title {
  display: flex;
  align-items: flex-start;
  gap: 15rpx;
  margin-bottom: 12rpx;
}

.question-type {
  color: #fff;
  padding: 6rpx 12rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
  flex-shrink: 0;
}

.title-text {
  flex: 1;
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
  line-height: 1.4;
}

.question-meta {
  display: flex;
  gap: 15rpx;
}

.meta-item {
  font-size: 24rpx;
  color: #999;
}

.status-active {
  color: #07c160;
}

.status-draft {
  color: #ff9500;
}

.question-actions {
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
  background: #f0f0f0;
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

.fab-btn {
  position: fixed;
  right: 40rpx;
  bottom: 120rpx;
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 999;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.2);
}

.fab-icon {
  font-size: 48rpx;
  line-height: 1;
}
</style>
