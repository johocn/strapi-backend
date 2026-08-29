<template>
  <view class="page-container">
    <PageHeader title="留言管理"></PageHeader>

    <view class="filter-section">
      <view class="filter-row">
        <view class="filter-item">
          <text class="filter-label">活动</text>
          <picker mode="selector" :range="activityNames" :value="activityIndex" @change="handleActivityChange">
            <view class="picker-value">
              <text>{{ activityNames[activityIndex] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
        <view class="filter-item">
          <text class="filter-label">状态</text>
          <picker mode="selector" :range="statusOptions" :value="statusIndex" @change="handleStatusChange">
            <view class="picker-value">
              <text>{{ statusOptions[statusIndex] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>
    </view>

    <view class="msg-list" v-if="!loading && rows.length > 0">
      <view v-for="row in rows" :key="row.documentId || row.id" class="msg-card">
        <view class="msg-head">
          <text class="msg-user">{{ row.user?.username || row.user?.name || row.nickname || '匿名用户' }}</text>
          <text class="status-badge" :class="statusClass(row.status)">{{ statusText(row.status) }}</text>
        </view>
        <view class="msg-meta">
          <text v-if="row.activity?.title" class="msg-activity">{{ row.activity.title }}</text>
          <text class="msg-time">{{ formatTime(row.createdAt || row.created_at) }}</text>
        </view>
        <view class="msg-body">
          <text class="msg-content">{{ row.message || row.content || '（无内容）' }}</text>
        </view>
        <view class="msg-reply" v-if="row.reply">
          <text class="reply-label">回复：</text>
          <text class="reply-text">{{ row.reply }}</text>
        </view>
        <view class="card-actions" v-if="row.status !== 'replied'">
          <view class="action-btn" @click="openReply(row)">回复</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && rows.length === 0" class="empty-state">
      <text class="empty-icon">💬</text>
      <text class="empty-text">暂无留言</text>
    </view>

    <view class="pagination" v-if="pageCount() > 1">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ pageCount() }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= pageCount() }">下一页</view>
    </view>

    <!-- 回复弹层 -->
    <view class="modal-mask" v-if="showReply" @click="closeReply">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">回复留言</text>
          <text class="modal-close" @click="closeReply">✕</text>
        </view>
        <view class="modal-body">
          <view class="msg-preview" v-if="current">
            <text class="msg-preview-label">用户留言：</text>
            <text class="msg-preview-text">{{ current.message || current.content || '（无内容）' }}</text>
          </view>
          <textarea class="reply-textarea" v-model="replyText" placeholder="请输入回复内容" :maxlength="500"></textarea>
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeReply">取消</button>
          <button class="btn-submit" @click="submitReply">提交回复</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { listActivities, listActivityMessages, replyActivityMessage } from '../../api/activity.js'
import PageHeader from '../../components/PageHeader.vue'

const activityOptions = ref([])   // [{documentId,title}]
const statusOptions = ['全部状态', '未回复', '已回复']
const statusValues = ['', 'open', 'replied']
const statusIndex = ref(0)
const activityIndex = ref(0)
const rows = ref([])
const pagination = ref({})
const currentPage = ref(1)
const loading = ref(false)
const showReply = ref(false)
const current = ref(null)
const replyText = ref('')

const statusTextMap = { open: '未回复', replied: '已回复' }
const statusClassMap = { open: 'open', replied: 'replied' }

const activityNames = computed(() => {
  const names = ['全部活动']
  for (const a of activityOptions.value) names.push(a.title || a.documentId || '未命名活动')
  return names
})

function statusText(s) { return statusTextMap[s] || s || '-' }
function statusClass(s) { return statusClassMap[s] || 'default' }

function formatTime(v) {
  if (!v) return '-'
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function handleStatusChange(e) { statusIndex.value = Number(e.detail.value); loadMessages(1) }
function handleActivityChange(e) { activityIndex.value = Number(e.detail.value); loadMessages(1) }

async function loadActivities() {
  try {
    const res = await listActivities({ page: 1, pageSize: 200 })
    const list = res?.list || res?.data || []
    activityOptions.value = list.map(a => ({ documentId: a.documentId, title: a.title }))
  } catch (e) {
    activityOptions.value = []
  }
}

async function loadMessages(page = 1) {
  loading.value = true
  try {
    const params = { page, pageSize: 20 }
    if (statusValues[statusIndex.value]) params.status = statusValues[statusIndex.value]
    if (activityIndex.value > 0) params.activity = activityOptions.value[activityIndex.value - 1].documentId
    const res = await listActivityMessages(params)
    rows.value = res?.list ?? res?.data ?? []
    pagination.value = res?.pagination ?? {}
    currentPage.value = page
  } catch (e) {
    rows.value = []
    pagination.value = {}
  } finally {
    loading.value = false
  }
}

function pageCount() {
  const p = pagination.value
  if (p.pageCount) return p.pageCount
  const total = Number(p.total) || 0
  return Math.max(1, Math.ceil(total / 20))
}

function prevPage() { if (currentPage.value > 1) loadMessages(currentPage.value - 1) }
function nextPage() { if (currentPage.value < pageCount()) loadMessages(currentPage.value + 1) }

function openReply(m) { current.value = m; replyText.value = ''; showReply.value = true }
function closeReply() { showReply.value = false; current.value = null }

async function submitReply() {
  if (!replyText.value.trim()) { uni.showToast({ title: '请输入回复内容', icon: 'none' }); return }
  try {
    await replyActivityMessage(current.value.documentId, replyText.value.trim())
    uni.showToast({ title: '回复成功', icon: 'success' })
    closeReply()
    loadMessages(currentPage.value)
  } catch (e) {
    /* 错误提示由 request.js 统一弹出 */
  }
}

onMounted(() => { loadActivities(); loadMessages(1) })
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.filter-section { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.filter-row { display: flex; flex-direction: column; gap: 16rpx; }
.filter-item { display: flex; align-items: center; gap: 12rpx; }
.filter-label { font-size: 26rpx; color: #666; flex-shrink: 0; width: 88rpx; }
.picker-value {
  flex: 1; display: flex; justify-content: space-between; align-items: center;
  padding: 12rpx 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx;
  min-height: 44rpx;
}
.arrow { font-size: 20rpx; color: #999; }

.msg-list { display: flex; flex-direction: column; gap: 16rpx; }
.msg-card { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.msg-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; gap: 16rpx; }
.msg-user { font-size: 30rpx; font-weight: bold; color: #333; flex: 1; }
.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-badge.open { background: #e6f7ff; color: #1890ff; }
.status-badge.replied { background: #f6ffed; color: #52c41a; }
.status-badge.default { background: #f5f5f5; color: #666; }
.msg-meta { display: flex; gap: 24rpx; margin-bottom: 12rpx; }
.msg-activity { font-size: 24rpx; color: #999; }
.msg-time { font-size: 24rpx; color: #999; }
.msg-body { padding: 16rpx 0; border-top: 1rpx solid #f0f0f0; }
.msg-content { font-size: 28rpx; color: #333; line-height: 1.6; }
.msg-reply { display: flex; align-items: flex-start; gap: 8rpx; padding-top: 12rpx; }
.reply-label { font-size: 26rpx; color: #667eea; flex-shrink: 0; }
.reply-text { font-size: 26rpx; color: #666; line-height: 1.6; flex: 1; }
.card-actions { display: flex; gap: 10rpx; border-top: 1rpx solid #f0f0f0; padding-top: 16rpx; margin-top: 16rpx; }
.action-btn {
  flex: 1; padding: 12rpx 0; border-radius: 8rpx; font-size: 26rpx; text-align: center;
  background: #667eea; color: #fff; font-weight: bold;
}

.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }

.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal-content { width: 90%; background: #fff; border-radius: 16rpx; overflow: hidden; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 30rpx; border-bottom: 1rpx solid #f0f0f0; }
.modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.modal-close { font-size: 36rpx; color: #999; padding: 10rpx; }
.modal-body { padding: 30rpx; }
.msg-preview { background: #f5f5f5; border-radius: 8rpx; padding: 16rpx 20rpx; margin-bottom: 20rpx; }
.msg-preview-label { font-size: 24rpx; color: #999; display: block; margin-bottom: 8rpx; }
.msg-preview-text { font-size: 26rpx; color: #333; line-height: 1.6; }
.reply-textarea { width: 100%; height: 200rpx; background: #f5f5f5; border-radius: 8rpx; padding: 20rpx; box-sizing: border-box; font-size: 28rpx; }
.modal-footer { display: flex; gap: 20rpx; padding: 20rpx 30rpx; border-top: 1rpx solid #f0f0f0; }
.btn-cancel { flex: 1; height: 88rpx; line-height: 88rpx; text-align: center; background: #f5f5f5; color: #666; font-size: 30rpx; border-radius: 8rpx; border: none; }
.btn-submit { flex: 1; height: 88rpx; line-height: 88rpx; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; font-size: 30rpx; border-radius: 8rpx; border: none; }
</style>
