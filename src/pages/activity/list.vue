<template>
  <view class="page-container">
    <PageHeader title="线下活动">
      <view class="btn-group">
        <button class="btn-primary" @click="goResources">🎓 讲师/场地</button>
        <button class="btn-primary" @click="goCalendar">📅 日历视图</button>
        <button class="btn-primary" @click="goCreate">+ 新建活动</button>
      </view>
    </PageHeader>

    <view class="search-section">
      <view class="filter-row">
        <picker mode="selector" :range="statusOptions" @change="handleStatusChange">
          <view class="filter-item">
            <text>{{ statusOptions[statusIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="activity-list" v-if="!loading && list.length > 0">
      <view v-for="item in list" :key="item.documentId || item.id" class="activity-card">
        <view class="card-header">
          <text class="card-title">{{ item.title || '-' }}</text>
          <text class="status-badge" :class="statusClass(item.status)">{{ statusText(item.status) }}</text>
        </view>
        <view class="card-meta">
          <text class="meta-item">🕐 {{ formatTime(item.startTime) }}</text>
          <text class="meta-item">📍 {{ item.venueName || '-' }}</text>
        </view>
        <view class="card-meta">
          <text class="meta-item">名额: {{ item.capacity ?? '-' }}</text>
          <text class="meta-item">已用: {{ item.usedCapacity ?? 0 }}</text>
          <text class="meta-item">已报名: {{ item.signupCount ?? '-' }}</text>
        </view>
        <view class="card-actions">
          <view class="action-btn" @click="goEdit(item)">编辑</view>
          <view class="action-btn" @click="goDuplicate(item)">一键克隆</view>
          <view class="action-btn" @click="goSignups(item)">到场名单</view>
          <view class="action-btn" @click="goScan(item)">扫码核销</view>
          <view class="action-btn" v-if="item.status === 'ended'" @click="confirmArchive(item)">归档</view>
          <view class="action-btn" v-if="item.status === 'archived'" @click="confirmUnarchive(item)">恢复</view>
          <view class="action-btn danger" @click="confirmDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && list.length === 0" class="empty-state">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无活动</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <!-- 删除确认弹窗 -->
    <view class="modal-mask" v-if="showDeleteModal" @click="closeDelete">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">删除活动</text>
          <text class="modal-close" @click="closeDelete">✕</text>
        </view>
        <view class="modal-body">
          <text class="modal-tip">确定删除活动「{{ deleteItem?.title }}」吗？删除后不可恢复。</text>
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeDelete">取消</button>
          <button class="btn-submit" @click="handleDelete" :loading="deleting">确认删除</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { listActivities, deleteActivity, duplicateActivity, archiveActivity, unarchiveActivity } from '../../api/activity.js'
import PageHeader from '../../components/PageHeader.vue'

const statusOptions = ['全部状态', '草稿', '报名中', '进行中', '已结束', '已归档']
const statusValues = ['', 'draft', 'signup_open', 'ongoing', 'ended', 'archived']
const statusIndex = ref(0)
const statusTextMap = { draft: '草稿', signup_open: '报名中', ongoing: '进行中', ended: '已结束', archived: '已归档' }
const statusClassMap = { draft: 'draft', signup_open: 'open', ongoing: 'ongoing', ended: 'ended', archived: 'archived' }

const list = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

const showDeleteModal = ref(false)
const deleteItem = ref(null)
const deleting = ref(false)

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

function statusText(s) { return statusTextMap[s] || s || '-' }
function statusClass(s) { return statusClassMap[s] || 'default' }

function formatTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { page, pageSize: pagination.value.pageSize }
    if (statusIndex.value > 0) params.status = statusValues[statusIndex.value]
    const res = await listActivities(params)
    list.value = res.list || []
    pagination.value = res.pagination || { page: 1, pageSize: 20, total: 0 }
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleStatusChange(e) { statusIndex.value = Number(e.detail.value); loadData(1) }
function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }

function goCreate() {
  uni.navigateTo({ url: '/pages/activity/form' })
}
function goCalendar() {
  uni.navigateTo({ url: '/pages/activity/calendar' })
}
function goResources() {
  uni.showActionSheet({
    itemList: ['讲师管理', '场地管理'],
    success: (res) => {
      const url = res.tapIndex === 0 ? '/pages/activity/resource-lecturer' : '/pages/activity/resource-venue'
      uni.navigateTo({ url })
    }
  })
}
function goEdit(item) {
  uni.navigateTo({ url: `/pages/activity/form?id=${item.documentId}` })
}
function goSignups(item) {
  uni.navigateTo({ url: `/pages/activity/signups?id=${item.documentId}` })
}
async function goDuplicate(item) {
  try {
    await duplicateActivity(item.documentId)
    uni.showToast({ title: '复制成功', icon: 'success' })
    loadData(currentPage.value)
  } catch (e) {
    uni.showToast({ title: '复制失败', icon: 'none' })
  }
}
function goScan(item) {
  uni.navigateTo({ url: `/pages/activity/scan?id=${item.documentId}` })
}

function confirmDelete(item) {
  deleteItem.value = item
  showDeleteModal.value = true
}
function closeDelete() {
  showDeleteModal.value = false
  deleteItem.value = null
}
async function handleDelete() {
  if (!deleteItem.value) return
  deleting.value = true
  try {
    await deleteActivity(deleteItem.value.documentId)
    uni.showToast({ title: '删除成功', icon: 'success' })
    closeDelete()
    loadData(currentPage.value)
  } catch (e) {
    uni.showToast({ title: '删除失败', icon: 'none' })
  } finally {
    deleting.value = false
  }
}

function confirmArchive(item) {
  uni.showModal({
    title: '归档活动',
    content: `确定归档「${item.title}」吗？归档后 C 端不再展示。`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await archiveActivity(item.documentId)
        uni.showToast({ title: '已归档', icon: 'success' })
        loadData(currentPage.value)
      } catch (e) {
        uni.showToast({ title: '归档失败', icon: 'none' })
      }
    }
  })
}

function confirmUnarchive(item) {
  uni.showModal({
    title: '恢复活动',
    content: `确定恢复「${item.title}」吗？恢复后重新对 C 端展示。`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await unarchiveActivity(item.documentId)
        uni.showToast({ title: '已恢复', icon: 'success' })
        loadData(currentPage.value)
      } catch (e) {
        uni.showToast({ title: '恢复失败', icon: 'none' })
      }
    }
  })
}

onMounted(() => loadData(1))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 40rpx; border: none; line-height: 1.2;
}
.btn-group { display: flex; gap: 16rpx; align-items: center; }

.search-section { margin-bottom: 20rpx; }
.filter-row { display: flex; }
.filter-item {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 24rpx; background: #fff; border-radius: 8rpx; font-size: 26rpx;
}
.arrow { font-size: 20rpx; color: #999; }

.activity-list { display: flex; flex-direction: column; gap: 16rpx; }
.activity-card { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-title { font-size: 30rpx; font-weight: bold; color: #333; flex: 1; margin-right: 12rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-badge.draft { background: #f5f5f5; color: #999; }
.status-badge.open { background: #e6f7ff; color: #1890ff; }
.status-badge.ongoing { background: #fff7e6; color: #fa8c16; }
.status-badge.ended { background: #f6ffed; color: #52c41a; }
.status-badge.archived { background: #f0f0f0; color: #8c8c8c; text-decoration: line-through; }
.status-badge.default { background: #f5f5f5; color: #666; }
.card-meta { display: flex; gap: 16rpx; margin-bottom: 8rpx; flex-wrap: wrap; }
.meta-item { font-size: 24rpx; color: #999; }
.card-actions { display: flex; gap: 10rpx; border-top: 1rpx solid #f0f0f0; padding-top: 16rpx; }
.action-btn { flex: 1; padding: 12rpx 0; border-radius: 8rpx; font-size: 26rpx; text-align: center; background: #f5f5f5; color: #333; font-weight: bold; }
.action-btn.danger { background: #fff1f0; color: #ff4d4f; }

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
.modal-tip { font-size: 28rpx; color: #333; line-height: 1.6; }
.modal-footer { display: flex; gap: 20rpx; padding: 20rpx 30rpx; border-top: 1rpx solid #f0f0f0; }
.btn-cancel { flex: 1; height: 88rpx; line-height: 88rpx; text-align: center; background: #f5f5f5; color: #666; font-size: 30rpx; border-radius: 8rpx; border: none; }
.btn-submit { flex: 1; height: 88rpx; line-height: 88rpx; text-align: center; background: #ff4d4f; color: #fff; font-size: 30rpx; border-radius: 8rpx; border: none; }
</style>