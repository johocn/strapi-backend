<template>
  <view class="page-container">
    <PageHeader title="发布记录" />

    <view class="search-section">
      <view class="search-box">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="搜索外部 ID"
          @confirm="loadData"
          class="search-input"
        />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="contentTypeOptions" @change="handleContentTypeChange">
          <view class="filter-item">
            <text>{{ contentTypeOptions[contentTypeIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <picker mode="selector" :range="platformLabelOptions" @change="handlePlatformChange">
          <view class="filter-item">
            <text>{{ platformLabelOptions[platformIndex] || '全部平台' }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <picker mode="selector" :range="statusLabelOptions" @change="handleStatusChange">
          <view class="filter-item">
            <text>{{ statusLabelOptions[statusIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="data-list">
      <view
        v-for="item in dataList"
        :key="item.documentId"
        class="data-card"
        @click="goDetail(item.documentId)"
      >
        <view class="data-info">
          <view class="data-title">{{ getContentTitle(item) }}</view>
          <view class="data-meta">
            <text class="meta-item">📢 {{ item.account?.name || '未知账号' }}</text>
            <text class="meta-item">🆔 {{ item.externalId || '无外部 ID' }}</text>
          </view>
          <view class="data-meta" v-if="item.jobId || item.queueStage">
            <text class="meta-item">🎯 阶段：{{ item.queueStage || '-' }}</text>
          </view>
          <view class="data-error" v-if="item.errorCode">
            <text class="error-tag">{{ errorText(item.errorCode) }}</text>
            <text class="error-msg">{{ item.error || '' }}</text>
          </view>
          <view class="data-footer">
            <view class="data-status" :class="statusClass(item.status)">{{ statusText(item.status) }}</view>
            <view class="data-date">{{ formatTime(item.publishedAt || item.createdAt) }}</view>
          </view>
        </view>
        <view class="data-actions">
          <view class="action-btn detail" @click.stop="goDetail(item.documentId)">详情</view>
          <view
            v-if="['failed','rejected','partial_success'].includes(item.status) && hasPermission('studio.publish-record.manage')"
            class="action-btn retry"
            @click.stop="handleRetry(item)"
          >重试</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && dataList.length === 0" class="empty-state">
      <text class="empty-icon">📤</text>
      <text class="empty-text">暂无发布记录</text>
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
import { publishRecordApi, publishActionApi, publishPlatformApi } from '../../../api/studio.js'
import { formatDate } from '../../../utils/format.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const statusIndex = ref(0)

const contentTypeOptions = ['全部内容', '短视频', '图集', '文章']
const contentTypeValues = ['', 'video', 'gallery', 'article']
const contentTypeIndex = ref(0)

const platformList = ref([])
const platformIndex = ref(0)
const platformLabelOptions = ref(['全部平台'])

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

const STATUS_ORDER = [
  'pending', 'queued', 'validating', 'uploading_media', 'publishing',
  'checking_status', 'success', 'partial_success', 'failed', 'rejected'
]

const statusEnumList = ['', ...STATUS_ORDER]
const statusLabelOptions = ['全部状态', ...STATUS_ORDER.map((s) => STATUS_TEXT_MAP[s])]

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

function getContentTitle(item) {
  if (item.video) return `🎬 ${item.video.title || item.video.documentId || '-'}`
  if (item.gallery) return `🖼️ ${item.gallery.title || item.gallery.documentId || '-'}`
  if (item.article) return `📝 ${item.article.title || item.article.documentId || '-'}`
  return '未知内容'
}

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
      'populate': 'article,video,gallery,account'
    }
    if (searchKeyword.value) {
      params['filters[externalId][$contains]'] = searchKeyword.value
    }
    if (statusIndex.value > 0) {
      params['filters[status]'] = statusEnumList[statusIndex.value]
    }
    if (platformIndex.value > 0) {
      const platform = platformList.value[platformIndex.value - 1]
      if (platform) {
        params['filters[account][platform][documentId]'] = platform.documentId
      }
    }
    const ctVal = contentTypeValues[contentTypeIndex.value]
    if (ctVal) {
      params['contentType'] = ctVal
    }
    const { list, pagination: pg } = await publishRecordApi.list(params)
    dataList.value = list
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

function handlePlatformChange(e) {
  platformIndex.value = e.detail.value
  loadData(1)
}

async function fetchPlatforms() {
  try {
    const { list } = await publishPlatformApi.list({ 'pagination[pageSize]': 100 })
    platformList.value = list
    platformLabelOptions.value = ['全部平台', ...list.map((p) => p.name || p.documentId)]
  } catch (e) {
    // 平台列表加载失败不影响主流程
  }
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/studio/publish-record/detail?documentId=${id}` })
}

async function handleRetry(item) {
  uni.showModal({
    title: '确认重试',
    content: `确定要重试发布该记录吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await publishActionApi.retryPublish(item.documentId)
        uni.showToast({ title: '已重新入队', icon: 'success' })
        loadData(currentPage.value)
      } catch (e) {
        uni.showToast({ title: e?.message || '重试失败', icon: 'none' })
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

onShow(async () => {
  await fetchPlatforms()
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

.data-error {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 12rpx;
}

.error-tag {
  flex-shrink: 0;
  padding: 2rpx 12rpx;
  border-radius: 4rpx;
  font-size: 22rpx;
  color: #ff4d4f;
  background: #fff0f0;
}

.error-msg {
  flex: 1;
  font-size: 22rpx;
  color: #999;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.data-date {
  font-size: 22rpx;
  color: #999;
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

.action-btn.detail { background: #f5f5f5; color: #1989fa; }
.action-btn.retry { background: #fff7e6; color: #fa8c16; }

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
