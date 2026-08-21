<template>
  <view class="page-container">
    <PageHeader title="活动系列">
      <button class="btn-primary" @click="goCreate">+ 新建系列</button>
    </PageHeader>

    <view class="series-list" v-if="!loading && list.length > 0">
      <view v-for="item in list" :key="item.documentId || item.id" class="series-card">
        <view class="card-header">
          <view class="card-left">
            <image v-if="item.cover" class="card-cover" :src="item.cover" mode="aspectFill" />
            <view v-else class="card-cover placeholder">📕</view>
          </view>
          <view class="card-main">
            <view class="card-title-row">
              <text class="card-title">{{ item.title || '-' }}</text>
              <text class="status-badge" :class="statusClass(item.status)">{{ statusText(item.status) }}</text>
            </view>
            <view class="card-desc">{{ item.description || '暂无描述' }}</view>
          </view>
        </view>
        <view class="card-meta">
          <text class="meta-item">场次: {{ item.activityCount ?? '-' }}</text>
          <text class="meta-item">排序: {{ item.sortOrder ?? '-' }}</text>
          <text class="meta-item" v-if="hasSchedule(item)">排期: {{ scheduleText(item.schedule) }}</text>
        </view>
        <view class="card-actions">
          <view class="action-btn" @click="goEdit(item)">编辑</view>
          <view class="action-btn" @click="goActivities(item)">场次</view>
          <view class="action-btn" @click="openGenerate(item)">生成排期</view>
          <view class="action-btn danger" @click="confirmDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && list.length === 0" class="empty-state">
      <text class="empty-icon">📕</text>
      <text class="empty-text">暂无系列</text>
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
          <text class="modal-title">删除系列</text>
          <text class="modal-close" @click="closeDelete">✕</text>
        </view>
        <view class="modal-body">
          <text class="modal-tip">确定删除系列「{{ deleteItem?.title }}」吗？删除后不可恢复。</text>
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeDelete">取消</button>
          <button class="btn-submit" @click="handleDelete" :loading="deleting">确认删除</button>
        </view>
      </view>
    </view>

    <!-- 生成排期弹窗 -->
    <view class="modal-mask" v-if="showGenerateModal" @click="closeGenerate">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">生成排期</text>
          <text class="modal-close" @click="closeGenerate">✕</text>
        </view>
        <view class="modal-body">
          <text class="modal-tip">按系列「{{ generateItem?.title }}」的排期规则批量生成多少场草稿场次？</text>
          <input type="number" v-model="generateCount" class="modal-input" placeholder="输入生成场次数量" />
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeGenerate">取消</button>
          <button class="btn-submit generate" @click="handleGenerate" :loading="generating">开始生成</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { listSeries, deleteSeries, generateSeries } from '../../api/activity.js'
import PageHeader from '../../components/PageHeader.vue'

const statusTextMap = { active: '启用', hidden: '隐藏' }
const statusClassMap = { active: 'active', hidden: 'hidden' }

const list = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

const showDeleteModal = ref(false)
const deleteItem = ref(null)
const deleting = ref(false)

const showGenerateModal = ref(false)
const generateItem = ref(null)
const generateCount = ref(1)
const generating = ref(false)

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

function statusText(s) { return statusTextMap[s] || s || '-' }
function statusClass(s) { return statusClassMap[s] || 'default' }

const weekdayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
function hasSchedule(item) {
  return item.schedule && typeof item.schedule === 'object'
}
function scheduleText(schedule) {
  try {
    const weekdays = (schedule.weekdays || []).map(w => weekdayNames[w] || w).join('、')
    const start = schedule.startTime || '-'
    const duration = schedule.durationMin ? ` ${schedule.durationMin}分钟` : ''
    const weeks = schedule.generateWeeks ? ` 共${schedule.generateWeeks}周` : ''
    return `${weekdays || '-'} ${start}${duration}${weeks}`
  } catch (e) { return JSON.stringify(schedule) }
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { page, pageSize: pagination.value.pageSize }
    const res = await listSeries(params)
    list.value = res.list || []
    pagination.value = res.pagination || { page: 1, pageSize: 20, total: 0 }
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }

function goCreate() {
  uni.navigateTo({ url: '/pages/series/form' })
}
function goEdit(item) {
  uni.navigateTo({ url: `/pages/series/form?id=${item.documentId}` })
}
function goActivities(item) {
  uni.navigateTo({ url: `/pages/activity/list?seriesId=${item.documentId}` })
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
    await deleteSeries(deleteItem.value.documentId)
    uni.showToast({ title: '删除成功', icon: 'success' })
    closeDelete()
    loadData(currentPage.value)
  } catch (e) {
    uni.showToast({ title: '删除失败', icon: 'none' })
  } finally {
    deleting.value = false
  }
}

function openGenerate(item) {
  generateItem.value = item
  generateCount.value = 8
  showGenerateModal.value = true
}
function closeGenerate() {
  showGenerateModal.value = false
  generateItem.value = null
  generateCount.value = 1
}
async function handleGenerate() {
  const count = Number(generateCount.value)
  if (!count || count <= 0) return uni.showToast({ title: '请输入有效数量', icon: 'none' })
  if (!generateItem.value) return
  generating.value = true
  try {
    await generateSeries(generateItem.value.documentId, count)
    uni.showToast({ title: '生成成功', icon: 'success' })
    closeGenerate()
    loadData(currentPage.value)
  } catch (e) {
    uni.showToast({ title: '生成失败', icon: 'none' })
  } finally {
    generating.value = false
  }
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

.series-list { display: flex; flex-direction: column; gap: 16rpx; }
.series-card { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.card-header { display: flex; gap: 20rpx; margin-bottom: 12rpx; }
.card-left { flex-shrink: 0; }
.card-cover { width: 120rpx; height: 120rpx; border-radius: 10rpx; background: #f5f5f5; }
.card-cover.placeholder { display: flex; align-items: center; justify-content: center; font-size: 48rpx; }
.card-main { flex: 1; min-width: 0; }
.card-title-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.card-title { font-size: 30rpx; font-weight: bold; color: #333; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-desc { font-size: 24rpx; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-badge.active { background: #f6ffed; color: #52c41a; }
.status-badge.hidden { background: #f5f5f5; color: #999; }
.status-badge.default { background: #f5f5f5; color: #666; }
.card-meta { display: flex; gap: 24rpx; margin-bottom: 8rpx; flex-wrap: wrap; }
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
.modal-tip { font-size: 28rpx; color: #333; line-height: 1.6; display: block; margin-bottom: 20rpx; }
.modal-input { width: 100%; height: 80rpx; border: 1rpx solid #ddd; border-radius: 10rpx; padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box; }
.modal-footer { display: flex; gap: 20rpx; padding: 20rpx 30rpx; border-top: 1rpx solid #f0f0f0; }
.btn-cancel { flex: 1; height: 88rpx; line-height: 88rpx; text-align: center; background: #f5f5f5; color: #666; font-size: 30rpx; border-radius: 8rpx; border: none; }
.btn-submit { flex: 1; height: 88rpx; line-height: 88rpx; text-align: center; background: #ff4d4f; color: #fff; font-size: 30rpx; border-radius: 8rpx; border: none; }
.btn-submit.generate { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
</style>