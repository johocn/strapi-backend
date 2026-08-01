<template>
  <view class="page-container">
    <PageHeader title="课时详情">
      <button class="btn-secondary" @click="goEdit">编辑</button>
    </PageHeader>

    <scroll-view scroll-y class="detail-scroll">
      <view class="basic-section">
        <view class="section-title">基本信息</view>
        <view class="basic-grid">
          <view class="basic-item">
            <text class="basic-label">所属课程</text>
            <text class="basic-value course-name">{{ lesson.course?.title || '-' }}</text>
          </view>
          <view class="basic-item">
            <text class="basic-label">课时类型</text>
            <text class="basic-value">{{ getTypeText(lesson.type) }}</text>
          </view>
          <view class="basic-item">
            <text class="basic-label">序号</text>
            <text class="basic-value">{{ lesson.sequenceNumber || 0 }}</text>
          </view>
        </view>
      </view>

      <view class="title-section">
        <text class="lesson-title">{{ lesson.title }}</text>
        <view class="lesson-tags">
          <text v-if="lesson.isFreePreview" class="tag free">可预览</text>
          <text v-if="lesson.isRequired" class="tag required">必修</text>
        </view>
      </view>

      <view class="media-section">
        <view class="section-title">媒体资源</view>

        <view v-if="lesson.thumbnailUrl" class="thumbnail-card">
          <text class="media-label">缩略图</text>
          <image :src="lesson.thumbnailUrl" mode="aspectFit" class="thumbnail-image" />
        </view>

        <view v-if="lesson.type === 'video' && lesson.videoUrl" class="media-card">
          <text class="media-label">视频</text>
          <video :src="lesson.videoUrl" class="media-video" controls />
        </view>

        <view v-if="lesson.type === 'audio' && lesson.audioUrl" class="media-card">
          <text class="media-label">音频</text>
          <video :src="lesson.audioUrl" class="media-audio" controls />
        </view>

        <view v-if="lesson.type === 'article' && lesson.content" class="media-card">
          <text class="media-label">图文内容</text>
          <text class="media-content">{{ lesson.content }}</text>
        </view>

        <view v-if="lesson.imageUrls?.length" class="media-card">
          <text class="media-label">图片集（{{ lesson.imageUrls.length }}张）</text>
          <view class="image-gallery">
            <image
              v-for="(url, idx) in lesson.imageUrls"
              :key="idx"
              :src="url"
              mode="aspectFill"
              class="gallery-thumb"
              @click="previewImage(url, lesson.imageUrls)"
            />
          </view>
        </view>

        <view v-if="lesson.attachmentUrls?.length" class="media-card">
          <text class="media-label">附件（{{ lesson.attachmentUrls.length }}个）</text>
          <view class="attachment-list">
            <view v-for="(att, idx) in lesson.attachmentUrls" :key="idx" class="attachment-item">
              <text class="attachment-icon">{{ getAttachmentIcon(att.mime) }}</text>
              <text class="attachment-name">{{ att.name }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="learning-section">
        <view class="section-title">学习设置</view>
        <view class="learning-grid">
          <view class="learning-item">
            <text class="learning-label">时长</text>
            <text class="learning-value">{{ formatDuration(lesson.duration) }}</text>
          </view>
          <view class="learning-item">
            <text class="learning-label">完成阈值</text>
            <text class="learning-value">{{ lesson.completionThreshold }}%</text>
          </view>
          <view class="learning-item">
            <text class="learning-label">是否预览</text>
            <text class="learning-value">{{ lesson.isFreePreview ? '是' : '否' }}</text>
          </view>
          <view class="learning-item">
            <text class="learning-label">是否必修</text>
            <text class="learning-value">{{ lesson.isRequired ? '是' : '否' }}</text>
          </view>
        </view>
      </view>

      <view v-if="lesson.enablePoints" class="points-section">
        <view class="section-title">积分设置</view>
        <view class="points-grid">
          <view class="points-item">
            <text class="points-label">积分值</text>
            <text class="points-value">{{ lesson.points || 0 }} 积分</text>
          </view>
          <view class="points-item">
            <text class="points-label">积分类型</text>
            <text class="points-value">{{ lesson.pointsType }}</text>
          </view>
        </view>
      </view>

      <view v-if="lesson.tags?.length" class="tags-section">
        <view class="section-title">标签</view>
        <view class="tags-list">
          <view v-for="tag in lesson.tags" :key="tag.documentId" class="tag-item">
            {{ tag.name }}
          </view>
        </view>
      </view>

      <view v-if="lesson.summary" class="description-section">
        <view class="section-title">概述</view>
        <text class="description-content">{{ lesson.summary }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getLessonDetail } from '../../../api/course.js'
import PageHeader from '../../../components/PageHeader.vue'

const lesson = ref({})

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
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getAttachmentIcon(mime) {
  if (mime?.startsWith('video/')) return '🎬'
  if (mime?.startsWith('audio/')) return '🎵'
  if (mime?.startsWith('image/')) return '🖼️'
  return '📄'
}

function previewImage(current, urls) {
  uni.previewImage({ current, urls })
}

function goEdit() {
  const id = lesson.value.documentId
  uni.navigateTo({ url: `/pages/course/lesson/form?id=${id}` })
}

onMounted(async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.$page?.options || currentPage.options || {}

  if (options.id) {
    try {
      lesson.value = await getLessonDetail(options.id)
    } catch (e) {
      uni.showToast({ title: '加载失败', icon: 'none' })
    }
  }
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.btn-secondary {
  padding: 16rpx 32rpx;
  border: 1rpx solid #1989fa;
  color: #1989fa;
  background: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.detail-scroll {
  height: calc(100vh - 88rpx);
}

.basic-section {
  background: #fff;
  margin: 20rpx;
  border-radius: 12rpx;
  padding: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.basic-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.basic-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
}

.basic-label {
  font-size: 26rpx;
  color: #666;
}

.basic-value {
  font-size: 26rpx;
  color: #333;
}

.basic-value.course-name {
  color: #1989fa;
}

.title-section {
  background: #fff;
  margin: 20rpx;
  border-radius: 12rpx;
  padding: 24rpx;
}

.lesson-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.lesson-tags {
  display: flex;
  gap: 12rpx;
}

.tag {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
}

.tag.free { background: #e3f2fd; color: #1989fa; }
.tag.required { background: #fff3e0; color: #ff9500; }

.media-section {
  background: #fff;
  margin: 20rpx;
  border-radius: 12rpx;
  padding: 20rpx;
}

.media-card {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.media-card:last-child {
  border-bottom: none;
}

.media-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.thumbnail-card {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.thumbnail-image {
  width: 100%;
  max-height: 300rpx;
  border-radius: 8rpx;
}

.media-video {
  width: 100%;
  height: 400rpx;
  border-radius: 8rpx;
}

.media-audio {
  width: 100%;
}

.media-content {
  font-size: 26rpx;
  color: #333;
  line-height: 1.8;
}

.image-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.gallery-thumb {
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
}

.attachment-icon {
  font-size: 32rpx;
}

.attachment-name {
  font-size: 26rpx;
  color: #333;
}

.learning-section {
  background: #fff;
  margin: 20rpx;
  border-radius: 12rpx;
  padding: 20rpx;
}

.learning-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.learning-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
}

.learning-label {
  font-size: 26rpx;
  color: #666;
}

.learning-value {
  font-size: 26rpx;
  color: #333;
}

.points-section {
  background: #fff;
  margin: 20rpx;
  border-radius: 12rpx;
  padding: 20rpx;
}

.points-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.points-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
}

.points-label {
  font-size: 26rpx;
  color: #666;
}

.points-value {
  font-size: 26rpx;
  color: #07c160;
}

.tags-section {
  background: #fff;
  margin: 20rpx;
  border-radius: 12rpx;
  padding: 20rpx;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag-item {
  padding: 8rpx 20rpx;
  background: #e3f2fd;
  color: #1989fa;
  border-radius: 20rpx;
  font-size: 24rpx;
}

.description-section {
  background: #fff;
  margin: 20rpx;
  margin-bottom: 100rpx;
  border-radius: 12rpx;
  padding: 20rpx;
}

.description-content {
  font-size: 28rpx;
  color: #666;
  line-height: 1.8;
}
</style>
