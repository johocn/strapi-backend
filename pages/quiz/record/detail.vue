<template>
  <view class="page-container">
    <PageHeader title="答题详情" />

    <scroll-view scroll-y class="detail-scroll">
      <view class="info-section">
        <view class="section-title">基本信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">用户名</text>
            <text class="info-value">{{ record.user?.username || record.user?.nickname || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">状态</text>
            <view class="status-badge" :class="record.status">
              {{ record.status === 'pending' ? '待评分' : '已评分' }}
            </view>
          </view>
          <view class="info-item">
            <text class="info-label">得分</text>
            <text class="info-value score">{{ record.score != null ? record.score : '-' }}</text>
          </view>
        </view>
      </view>

      <view class="question-section">
        <view class="section-title">题目内容</view>
        <text class="question-content">{{ record.quiz?.title || '-' }}</text>
      </view>

      <view class="answer-section">
        <view class="section-title">答案信息</view>
        <view class="answer-item">
          <text class="answer-label">用户答案</text>
          <text class="answer-value user-answer">{{ record.userAnswer || '-' }}</text>
        </view>
        <view class="answer-item">
          <text class="answer-label">正确答案</text>
          <text class="answer-value correct-answer">{{ record.correctAnswer || '-' }}</text>
        </view>
        <view v-if="record.comment" class="answer-item">
          <text class="answer-label">评语</text>
          <text class="answer-value">{{ record.comment }}</text>
        </view>
      </view>

      <view v-if="record.status === 'pending'" class="grade-section">
        <view class="section-title">评分</view>
        <view class="form-item">
          <text class="form-label">分数 <text class="required">*</text></text>
          <input
            type="digit"
            v-model="gradeForm.score"
            placeholder="请输入分数"
            class="form-input"
          />
        </view>
        <view class="form-item">
          <text class="form-label">评语</text>
          <textarea
            v-model="gradeForm.comment"
            placeholder="请输入评语（可选）"
            class="form-textarea"
          />
        </view>
        <button class="btn-grade" @click="handleGrade" :disabled="submitting">
          {{ submitting ? '提交中...' : '提交评分' }}
        </button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import PageHeader from '../../../src/components/PageHeader.vue'
import { getQuizRecordDetail, gradeQuizRecord } from '../../../src/api/quiz.js'

const record = ref({})
const submitting = ref(false)
const gradeForm = reactive({
  score: '',
  comment: ''
})

async function loadDetail(id) {
  try {
    record.value = await getQuizRecordDetail(id)
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function handleGrade() {
  if (!gradeForm.score && gradeForm.score !== 0) {
    uni.showToast({ title: '请输入分数', icon: 'none' })
    return
  }
  const score = Number(gradeForm.score)
  if (isNaN(score) || score < 0) {
    uni.showToast({ title: '请输入有效分数', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const data = { score, comment: gradeForm.comment }
    await gradeQuizRecord(record.value.documentId, data)
    uni.showToast({ title: '评分成功', icon: 'success' })
    await loadDetail(record.value.documentId)
  } catch (e) {
    uni.showToast({ title: '评分失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.$page?.options || currentPage.options || {}

  if (options.id) {
    loadDetail(options.id)
  }
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.detail-scroll {
  padding: 20rpx 30rpx 40rpx;
  height: 100vh;
}

.info-section,
.question-section,
.answer-section,
.grade-section {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 30rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #eee;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
}

.info-label {
  font-size: 26rpx;
  color: #666;
}

.info-value {
  font-size: 26rpx;
  color: #333;
}

.info-value.score {
  color: #ff9500;
  font-weight: bold;
}

.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
}

.status-badge.pending {
  background: #fff3e0;
  color: #ff9500;
}

.status-badge.graded {
  background: #e8f5e9;
  color: #07c160;
}

.question-content {
  font-size: 30rpx;
  color: #333;
  line-height: 1.8;
}

.answer-item {
  margin-bottom: 20rpx;
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
}

.answer-item:last-child {
  margin-bottom: 0;
}

.answer-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.answer-value {
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
}

.answer-value.user-answer {
  color: #1989fa;
}

.answer-value.correct-answer {
  color: #07c160;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 15rpx;
}

.required {
  color: #ff4d4f;
}

.form-input {
  width: 100%;
  height: 80rpx;
  border: 1rpx solid #ddd;
  border-radius: 10rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  min-height: 160rpx;
  border: 1rpx solid #ddd;
  border-radius: 10rpx;
  padding: 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.btn-grade {
  width: 100%;
  height: 90rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 45rpx;
  font-size: 32rpx;
  font-weight: bold;
}

.btn-grade[disabled] {
  opacity: 0.6;
}
</style>
