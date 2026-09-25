<template>
  <view class="page-container">
    <PageHeader title="线下活动">
      <view class="btn-group">
        <button class="btn-primary" @click="goMessages">💬 留言</button>
        <button class="btn-primary" @click="goResources">🎓 讲师/场地</button>
        <button class="btn-primary" @click="goCalendar">📅 日历视图</button>
        <button class="btn-primary" @click="goCreate">+ 新建活动</button>
      </view>
    </PageHeader>

    <view class="search-section">
      <view class="search-row">
        <input
          class="search-input"
          v-model="searchInput"
          placeholder="搜索活动标题"
          confirm-type="search"
          @confirm="handleSearch"
        />
        <view class="search-btn" @click="handleSearch">搜索</view>
        <view class="search-btn ghost" v-if="activeSearch" @click="clearSearch">清空</view>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="statusOptions" @change="handleStatusChange">
          <view class="filter-item">
            <text>{{ statusOptions[statusIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <picker mode="selector" :range="venueOptions" @change="handleVenueFilter">
          <view class="filter-item">
            <text>{{ venueOptions[venueIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <picker mode="selector" :range="lecturerOptions" @change="handleLecturerFilter">
          <view class="filter-item">
            <text>{{ lecturerOptions[lecturerIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <picker mode="selector" :range="categoryOptions" @change="handleCategoryFilter">
          <view class="filter-item">
            <text>{{ categoryOptions[categoryIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="activity-list" v-if="!loading && dataList.length > 0">
      <view v-for="item in dataList" :key="item.documentId || item.id" class="activity-card">
        <view class="card-header">
          <text class="card-title">{{ item.title || '-' }}</text>
          <text v-if="item.type && item.type !== '其他'" class="type-badge">{{ item.type }}</text>
          <text class="status-badge" :class="statusClass(item.status)">{{ statusText(item.status) }}</text>
        </view>
        <view class="card-meta">
          <text class="meta-item">🕐 {{ formatTime(item.startTime) }}</text>
          <text class="meta-item">📍 {{ item.venue?.name || '-' }}</text>
        </view>
        <view class="card-meta">
          <text class="meta-item">名额: {{ item.capacity ?? '-' }}</text>
          <text class="meta-item">已用: {{ item.usedCapacity ?? 0 }}</text>
          <text class="meta-item">已报名: {{ item.signupCount ?? '-' }}</text>
        </view>
        <view class="card-actions">
          <view class="action-btn promo" @click="goPromo(item)">宣传文案设计</view>
          <view class="action-btn" @click="goEdit(item)">编辑</view>
          <view class="action-btn" @click="goDuplicate(item)">一键克隆</view>
          <view class="action-btn" @click="goSignups(item)">到场名单</view>
          <view class="action-btn" @click="goTempAuth(item)">临时授权</view>
          <view class="action-btn" @click="goScan(item)">扫码核销</view>
          <view class="action-btn warning" v-if="item.status === 'ongoing'" @click="confirmClose(item)">关闭活动</view>
          <view class="action-btn" v-if="item.status === 'ended'" @click="confirmArchive(item)">归档</view>
          <view class="action-btn" v-if="item.status === 'archived'" @click="confirmUnarchive(item)">恢复</view>
          <view class="action-btn danger" @click="confirmDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && dataList.length === 0" class="empty-state">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无活动</text>
    </view>

    <view class="pagination" v-if="total > pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}（共 {{ total }} 条）</text>
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
import { onShow } from '@dcloudio/uni-app'
import { listActivities, deleteActivity, duplicateActivity, archiveActivity, unarchiveActivity, closeActivity } from '../../api/activity.js'
import { listLecturers, listVenues } from '../../api/resource.js'
import { getTagList } from '../../api/tag.js'
import PageHeader from '../../components/PageHeader.vue'

const statusOptions = ['全部状态', '草稿', '报名中', '进行中', '已结束', '已归档']
const statusValues = ['', 'draft', 'signup_open', 'ongoing', 'ended', 'archived']
const statusIndex = ref(0)
const searchInput = ref('')
const activeSearch = ref('')
const statusTextMap = { draft: '草稿', signup_open: '报名中', ongoing: '进行中', ended: '已结束', archived: '已归档' }
const statusClassMap = { draft: 'draft', signup_open: 'open', ongoing: 'ongoing', ended: 'ended', archived: 'archived' }

// 服务端拉取（按状态）的原始数据
const dataList = ref([])

// 筛选项数据源（仅用于下拉选项渲染）
const venueList = ref([])
const lecturerList = ref([])
const categoryList = ref([])
const venueIndex = ref(0)
const lecturerIndex = ref(0)
const categoryIndex = ref(0)
// 下拉可选集合（排除停用项）；筛选下发时按同一集合取下标，避免与 venueList/lecturerList 下标错位
const venueSelectable = computed(() => venueList.value.filter(v => !v.disabled))
const lecturerSelectable = computed(() => lecturerList.value.filter(l => !l.disabled))
const venueOptions = computed(() => ['全部场地', ...venueSelectable.value.map(v => v.name || `场地#${v.id}`)])
const lecturerOptions = computed(() => ['全部讲师', ...lecturerSelectable.value.map(l => l.name || `讲师#${l.id}`)])
const categoryOptions = computed(() => ['全部分类', ...categoryList.value.map(t => t.name || '')])

async function loadFilters() {
  try {
    const [v, l] = await Promise.all([
      listVenues({ page: 1, pageSize: 500, includeDisabled: 'true' }),
      listLecturers({ page: 1, pageSize: 500, includeDisabled: 'true' })
    ])
    venueList.value = v.list || []
    lecturerList.value = l.list || []
  } catch (e) {
    venueList.value = []
    lecturerList.value = []
  }
  try {
    const cat = await getTagList({ page: 1, pageSize: 500, 'filters[tagGroup][slug][$eq]': 'activity-category' })
    categoryList.value = (cat.list || []).filter(t => t.name).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  } catch (e) {
    categoryList.value = []
  }
}

function handleVenueFilter(e) { venueIndex.value = Number(e.detail.value); reloadFromFirstPage() }
function handleLecturerFilter(e) { lecturerIndex.value = Number(e.detail.value); reloadFromFirstPage() }
function handleCategoryFilter(e) { categoryIndex.value = Number(e.detail.value); reloadFromFirstPage() }

// 分页：服务端分页，total 来自后端 meta.pagination.total
const currentPage = ref(1)
const pageSize = 10
const total = ref(0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const loading = ref(false)

const showDeleteModal = ref(false)
const deleteItem = ref(null)
const deleting = ref(false)

function statusText(s) { return statusTextMap[s] || s || '-' }
function statusClass(s) { return statusClassMap[s] || 'default' }

function formatTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function docIdOf(row) {
  if (!row) return ''
  return String(row.documentId || row.id || '')
}

async function loadData() {
  loading.value = true
  try {
    const params = { page: currentPage.value, pageSize }
    if (statusIndex.value > 0) params.status = statusValues[statusIndex.value]
    if (activeSearch.value) params.search = activeSearch.value
    if (venueIndex.value > 0) {
      const v = venueSelectable.value[venueIndex.value - 1]
      if (v) params.venue = docIdOf(v)
    }
    if (lecturerIndex.value > 0) {
      const l = lecturerSelectable.value[lecturerIndex.value - 1]
      if (l) params.lecturer = docIdOf(l)
    }
    if (categoryIndex.value > 0) params.category = categoryOptions.value[categoryIndex.value]
    const res = await listActivities(params)
    dataList.value = res.list || []
    total.value = Number(res.pagination?.total ?? dataList.value.length)
  } catch (e) {
    dataList.value = []
    total.value = 0
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleStatusChange(e) { statusIndex.value = Number(e.detail.value); reloadFromFirstPage() }
function reloadFromFirstPage() { currentPage.value = 1; loadData() }
function handleSearch() { activeSearch.value = searchInput.value.trim(); reloadFromFirstPage() }
function clearSearch() { searchInput.value = ''; activeSearch.value = ''; reloadFromFirstPage() }
function prevPage() { if (currentPage.value > 1) { currentPage.value--; loadData() } }
function nextPage() { if (currentPage.value < totalPages.value) { currentPage.value++; loadData() } }

function goCreate() {
  uni.navigateTo({ url: '/pages/activity/form' })
}
function goMessages() {
  uni.navigateTo({ url: '/pages/activity/messages' })
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
function goPromo(item) {
  uni.navigateTo({ url: `/pages/activity/promo?id=${item.documentId}` })
}
function goSignups(item) {
  uni.navigateTo({ url: `/pages/activity/signups?id=${item.documentId}` })
}
const goTempAuth = (item) => {
  uni.navigateTo({ url: `/pages/activity/temp-auth?activityId=${item.documentId || item.id}` })
}
async function goDuplicate(item) {
  try {
    await duplicateActivity(item.documentId)
    uni.showToast({ title: '复制成功', icon: 'success' })
    loadData()
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
    loadData()
  } catch (e) {
    uni.showToast({ title: '删除失败', icon: 'none' })
  } finally {
    deleting.value = false
  }
}

function confirmClose(item) {
  uni.showModal({
    title: '关闭活动',
    content: `确定关闭「${item.title}」吗？关闭后将按到场情况触发回放/复购/未到场回访待办，并生成一张经营台账快照。`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await closeActivity(item.documentId)
        uni.showToast({ title: '已关闭', icon: 'success' })
        loadData()
      } catch (e) {
        uni.showToast({ title: '关闭失败', icon: 'none' })
      }
    }
  })
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
        loadData()
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
        loadData()
      } catch (e) {
        uni.showToast({ title: '恢复失败', icon: 'none' })
      }
    }
  })
}

onShow(() => { loadData() })
onMounted(() => { loadFilters() })
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
.search-row { display: flex; gap: 16rpx; align-items: center; margin-bottom: 16rpx; }
.search-input { flex: 1; height: 72rpx; padding: 0 24rpx; background: #fff; border-radius: 8rpx; font-size: 26rpx; box-sizing: border-box; }
.search-btn { padding: 12rpx 32rpx; background: #667eea; color: #fff; border-radius: 8rpx; font-size: 26rpx; }
.search-btn.ghost { background: #f0f0f0; color: #666; }
.filter-row { display: flex; flex-wrap: wrap; gap: 16rpx; }
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
.type-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; background: #f6ffed; color: #52c41a; margin-left: 12rpx; }
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
.action-btn.promo { background: #eef2ff; color: #6366f1; }
.action-btn.danger { background: #fff1f0; color: #ff4d4f; }
.action-btn.warning { background: #fff7e6; color: #d46b08; }

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