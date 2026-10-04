<template>
  <view class="page-container">
    <PageHeader title="发布记录详情" />

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <scroll-view scroll-y v-else class="detail-scroll">
      <view class="detail-section">
        <view class="section-title">基本信息</view>
        <view class="detail-row">
          <text class="detail-label">文章</text>
          <text class="detail-value">{{ detail.article?.title || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">发布账号</text>
          <text class="detail-value">{{ detail.account?.name || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">所属平台</text>
          <text class="detail-value">{{ detail.account?.platform?.name || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">外部 ID</text>
          <text class="detail-value">{{ detail.externalId || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">状态</text>
          <view class="data-status" :class="statusClass(detail.status)">{{ statusText(detail.status) }}</view>
        </view>
        <view class="detail-row">
          <text class="detail-label">错误码</text>
          <text class="detail-value">{{ detail.errorCode ? errorText(detail.errorCode) : '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">重试次数</text>
          <text class="detail-value">{{ detail.retryCount ?? 0 }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">队列阶段</text>
          <text class="detail-value">{{ detail.queueStage || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">任务 ID</text>
          <text class="detail-value">{{ detail.jobId || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">计划发布</text>
          <text class="detail-value">{{ formatTime(detail.scheduledAt) }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">开始时间</text>
          <text class="detail-value">{{ formatTime(detail.startedAt) }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">发布时间</text>
          <text class="detail-value">{{ formatTime(detail.publishedAt) }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">完成时间</text>
          <text class="detail-value">{{ formatTime(detail.finishedAt) }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">创建时间</text>
          <text class="detail-value">{{ formatTime(detail.createdAt) }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">更新时间</text>
          <text class="detail-value">{{ formatTime(detail.updatedAt) }}</text>
        </view>
      </view>

      <view class="detail-section" v-if="detail.error">
        <view class="section-title">错误信息</view>
        <view class="error-box">
          <text class="error-text">{{ detail.error }}</text>
        </view>
      </view>

      <view
        v-if="detail.status === 'failed' || detail.status === 'rejected'"
        class="retry-wrap"
      >
        <button class="btn-primary" :disabled="retrying" @click="handleRetry">
          {{ retrying ? '重试中...' : '重新发布' }}
        </button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { publishRecordApi, publishActionApi } from '../../../api/studio.js'
import { formatDate } from '../../../utils/format.js'
import PageHeader from '../../../components/PageHeader.vue'

const documentId = ref('')
const detail = ref({})
const loading = ref(false)
const retrying = ref(false)

const STATUS_TEXT_MAP = {
  pending: '待发布',
  queued: '已入队',
  validating: '校验中',
  uploading_media: '上传媒体',
  publishing: '发布中',
  checking_status: '状态回查',
  success: '成功',
  partial_success: '部分成功',
  failed: '失败',
  rejected: '审核拒绝'
}

const ERROR_TEXT_MAP = {
  PUB_009: '账号授权已失效，请重新授权',
  PUB_010: 'OAuth token 续期失败',
  PUB_011: '平台限流',
  PUB_012: '平台审核拒绝'
}

function statusText(status) {
  if (!status) return '-'
  return STATUS_TEXT_MAP[status] || status
}

function statusClass(status) {
  return STATUS_TEXT_MAP[status] ? status : ''
}

function errorText(code) {
  if (!code) return ''
  return ERROR_TEXT_MAP[code] || code
}

function formatTime(t) {
  return t ? formatDate(t) : '-'
}

async function loadDetail() {
  if (!documentId.value) return
  loading.value = true
  try {
    const item = await publishRecordApi.detail(documentId.value)
    detail.value = item || {}
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function handleRetry() {
  if (retrying.value) return
  retrying.value = true
  uni.showLoading({ title: '重试中...' })
  try {
    await publishActionApi.retryPublish(documentId.value)
    uni.showToast({ title: '已重新入队', icon: 'success' })
    loadDetail()
  } catch (e) {
    uni.showToast({ title: e?.message || '重试失败', icon: 'none' })
  } finally {
    retrying.value = false
    uni.hideLoading()
  }
}

onLoad((options) => {
  if (options?.documentId) {
    documentId.value = options.documentId
    loadDetail()
  }
})
</script>

<style scoped>
page {
  background: #f5f5f5;
}
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.detail-scroll {
  flex: 1;
  padding: 20rpx;
  box-sizing: border-box;
}

.detail-section {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
  padding-left: 8rpx;
  border-left: 6rpx solid #ff0000;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 28rpx;
  color: #666;
  flex-shrink: 0;
}

.detail-value {
  font-size: 28rpx;
  color: #333;
  text-align: right;
  flex: 1;
  margin-left: 20rpx;
  word-break: break-all;
}

.data-status {
  padding: 4rpx 16rpx;
  border-radius: 4rpx;
  font-size: 22rpx;
  color: #fff;
  background: #999;
}

.data-status.pending { background: #999; }
.data-status.queued,
.data-status.validating,
.data-status.uploading_media,
.data-status.publishing,
.data-status.checking_status { background: #1989fa; }
.data-status.success { background: #07c160; }
.data-status.partial_success { background: #faad14; }
.data-status.failed,
.data-status.rejected { background: #ff4d4f; }

.error-box {
  background: #fff0f0;
  border-radius: 8rpx;
  padding: 20rpx;
}

.error-text {
  font-size: 26rpx;
  color: #ff4d4f;
  white-space: pre-wrap;
  word-break: break-all;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 100rpx 0;
  font-size: 28rpx;
  color: #999;
}
</style>
