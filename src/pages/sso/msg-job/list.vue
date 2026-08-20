<template>
  <view class="page-container">
    <PageHeader title="消息任务" />

    <view class="help-banner">
      <text class="help-icon">📤</text>
      <text class="help-text">消息任务由 SOP 规则/业务埋点/手动发送生成，cron 每 1 分钟扫描到期任务下发。「失败」任务可手动重试；未绑定微信 openid（toTarget 空）会失败为 no_target。</text>
    </view>

    <view class="search-section">
      <view class="filter-row">
        <view v-for="s in STATUSES" :key="s.value" class="filter-item" :class="{ active: statusFilter === s.value }" @click="toggleStatus(s.value)">{{ s.label }}</view>
      </view>
    </view>

    <view class="data-list">
      <view v-for="item in dataList" :key="item.documentId" class="data-card">
        <view class="data-info">
          <view class="data-title">
            <text class="scene-name">{{ item.scene || '-' }}</text>
            <text class="status-tag" :class="item.status">{{ statusLabel(item.status) }}</text>
          </view>
          <view class="data-meta">
            <text class="meta-item">模板: {{ tmplCode(item) }}</text>
            <text class="meta-item">用户: {{ userName(item) }}</text>
          </view>
          <view class="data-meta">
            <text class="meta-item" v-if="item.provider">通道: {{ item.provider }}</text>
            <text class="meta-item" v-if="item.wxMsgId">msgId: {{ item.wxMsgId }}</text>
            <text class="meta-item" v-if="item.retryCount">重试: {{ item.retryCount }} 次</text>
          </view>
          <view class="data-meta" v-if="failReason(item)">
            <text class="meta-item fail">失败原因: {{ failReason(item) }}</text>
          </view>
          <view class="data-footer">
            <text class="data-date">创建: {{ fmt(item.createdAt) }}</text>
            <text class="data-date" v-if="item.scheduledAt">计划: {{ fmt(item.scheduledAt) }}</text>
            <text class="data-date" v-if="item.sentAt">发送: {{ fmt(item.sentAt) }}</text>
          </view>
        </view>
        <view class="data-actions">
          <view v-if="item.status === 'failed' && hasPermission('sso.msg.write')" class="action-btn retry" @click.stop="handleRetry(item)">重试</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && dataList.length === 0" class="empty-state">
      <text class="empty-icon">🗂️</text>
      <text class="empty-text">暂无消息任务</text>
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
import { ssoMsgJobApi } from '../../../api/sso.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'

const STATUSES = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待发送' },
  { value: 'sending', label: '发送中' },
  { value: 'sent', label: '已发送' },
  { value: 'failed', label: '失败' },
]

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const statusFilter = ref('')
const dataList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

function statusLabel(s) { return { pending: '待发送', sending: '发送中', sent: '已发送', failed: '失败', cancelled: '已取消' }[s] || s || '-' }
function tmplCode(item) { return item.template && (item.template.code || item.template.name) || '-' }
function userName(item) {
  const u = item.user
  if (!u) return '-'
  return u.username || u.email || u.mobile || (u.id ? '#' + u.id : '-')
}
function fmt(dt) { return dt ? String(dt).replace('T', ' ').substring(0, 19) : '' }
function failReason(item) {
  if (!item.result) return ''
  const r = item.result
  if (typeof r === 'string') return r
  return r.message || r.error || ''
}

function toggleStatus(v) { statusFilter.value = statusFilter.value === v ? '' : v; loadData(1) }

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { page, pageSize: 10 }
    if (statusFilter.value) params['status[$eq]'] = statusFilter.value
    const { list, pagination: pg } = await ssoMsgJobApi.list(params)
    dataList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleRetry(item) {
  uni.showModal({
    title: '重试发送',
    content: '确定重试该消息任务吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await ssoMsgJobApi.retry(item.id)
          uni.showToast({ title: '已重试', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '重试失败', icon: 'none' })
        }
      }
    }
  })
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }

onShow(() => { loadData(1) })
</script>

<style scoped>
page { background: #f5f5f5; }
.help-banner {
  display: flex; align-items: flex-start; gap: 12rpx;
  background: #e6f4ff; padding: 20rpx; border-radius: 12rpx;
  margin-bottom: 20rpx; border-left: 6rpx solid #1677ff;
}
.help-icon { font-size: 28rpx; flex-shrink: 0; }
.help-text { font-size: 26rpx; color: #333; line-height: 1.5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.filter-row { display: flex; flex-wrap: wrap; gap: 16rpx; }
.filter-item { padding: 10rpx 24rpx; border-radius: 8rpx; background: #f5f5f5; font-size: 26rpx; color: #666; }
.filter-item.active { background: #1677ff; color: #fff; }
.data-list { display: flex; flex-direction: column; gap: 20rpx; }
.data-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; }
.data-info { flex: 1; display: flex; flex-direction: column; }
.data-title { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; flex-wrap: wrap; }
.scene-name { font-size: 30rpx; font-weight: bold; color: #333; }
.status-tag { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 6rpx; color: #fff; }
.status-tag.pending { background: #1677ff; }
.status-tag.sending { background: #d48806; }
.status-tag.sent { background: #07c160; }
.status-tag.failed { background: #ff4d4f; }
.status-tag.cancelled { background: #999; }
.data-meta { margin-bottom: 8rpx; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.meta-item.fail { color: #ff4d4f; }
.data-footer { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 8rpx; }
.data-date { font-size: 22rpx; color: #aaa; }
.data-actions { display: flex; flex-direction: column; gap: 12rpx; margin-left: 16rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.retry { background: #e6f4ff; color: #1677ff; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>
