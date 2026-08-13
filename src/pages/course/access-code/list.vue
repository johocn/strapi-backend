<template>
  <view class="page-container">
    <PageHeader title="开通码管理">
      <button class="btn-primary" @click="openBatchModal" v-if="hasPermission('course.create')">+ 生成</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="搜索开通码（精确匹配）"
          @confirm="loadData(1)"
          class="search-input"
        />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="statusOptions" @change="handleStatusChange">
          <view class="filter-item">
            <text>{{ statusOptions[statusIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <picker mode="selector" :range="courseOptions" @change="handleCourseChange" v-if="courseOptions.length > 1">
          <view class="filter-item">
            <text>{{ courseOptions[courseIndex] || '选择课程' }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="code-list">
      <view
        v-for="item in codeList"
        :key="item.documentId"
        class="code-card"
      >
        <view class="card-header">
          <view class="code-text">{{ item.code }}</view>
          <view class="status-badge" :class="item.status">{{ statusMap[item.status] || item.status }}</view>
        </view>

        <view class="card-body">
          <view class="info-row">
            <text class="info-label">课程：</text>
            <text class="info-value">{{ item.course?.title || '未知课程' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">使用情况：</text>
            <text class="info-value">
              {{ item.usedCount }} / {{ item.totalQuota === -1 ? '不限' : item.totalQuota }}
            </text>
          </view>
          <view v-if="item.expireAt" class="info-row">
            <text class="info-label">过期时间：</text>
            <text class="info-value" :class="{ expired: isExpired(item.expireAt) }">
              {{ formatDateTime(item.expireAt) }}
              <text v-if="isExpired(item.expireAt)" class="expired-tip">已过期</text>
            </text>
          </view>
          <view v-if="item.batchNote" class="info-row">
            <text class="info-label">批次备注：</text>
            <text class="info-value">{{ item.batchNote }}</text>
          </view>
          <view v-if="item.usedBy" class="info-row">
            <text class="info-label">最后使用者：</text>
            <text class="info-value">
              {{ item.usedBy?.username || item.usedBy?.email || '用户#' + item.usedBy?.id }}
              <text class="info-extra" v-if="item.usedAt">（{{ formatDateTime(item.usedAt) }}）</text>
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">创建时间：</text>
            <text class="info-value">{{ formatDateTime(item.createdAt) }}</text>
          </view>
        </view>

        <view class="card-actions" v-if="hasPermission('course.update')">
          <view
            v-if="item.status === 'active'"
            class="action-btn disable"
            @click="handleDisable(item)"
          >禁用</view>
          <view
            class="action-btn copy"
            @click="copyCode(item.code)"
          >复制</view>
          <view
            class="action-btn delete"
            @click="handleDelete(item)"
          >删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && codeList.length === 0" class="empty-state">
      <text class="empty-icon">🎫</text>
      <text class="empty-text">暂无开通码</text>
      <button class="btn-primary" @click="openBatchModal" v-if="hasPermission('course.create')">立即生成</button>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage <= 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <!-- 批量生成弹窗 -->
    <view class="modal-mask" v-if="showBatchModal" @click="showBatchModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-title">批量生成开通码</view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">课程 <text class="required">*</text></text>
            <picker mode="selector" :range="courseOptionsForBatch" @change="e => batchForm.courseDocumentId = courseValuesForBatch[e.detail.value]">
              <view class="form-input picker-display">
                <text>{{ batchFormCourseLabel || '请选择课程' }}</text>
                <text class="arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">生成数量 <text class="required">*</text>（1-100）</text>
            <input type="number" v-model="batchForm.count" placeholder="如 10" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">使用配额（-1=不限）</text>
            <input type="number" v-model="batchForm.totalQuota" placeholder="-1 或具体次数" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">过期时间（可选）</text>
            <picker mode="date" @change="e => batchForm.expireAt = e.detail.value">
              <view class="form-input picker-display">
                <text>{{ batchForm.expireAt || '选择日期' }}</text>
                <text class="arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">批次备注（可选）</text>
            <input type="text" v-model="batchForm.batchNote" placeholder="如：8月活动码" class="form-input" maxlength="50" />
          </view>
        </view>
        <view class="modal-actions">
          <button class="btn-cancel" @click="showBatchModal = false">取消</button>
          <button class="btn-submit" @click="confirmBatch" :loading="submitting">确认生成</button>
        </view>
      </view>
    </view>

    <!-- 生成结果弹窗 -->
    <view class="modal-mask" v-if="showResultModal" @click="showResultModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-title">生成成功</view>
        <view class="modal-body">
          <view class="result-info">共生成 {{ batchResult.codes?.length || 0 }} 个开通码：</view>
          <scroll-view scroll-y class="code-result-list">
            <view v-for="code in batchResult.codes" :key="code" class="code-result-item" @click="copyCode(code)">
              <text class="code-result-text">{{ code }}</text>
              <text class="copy-tip">复制</text>
            </view>
          </scroll-view>
          <view class="result-tip">点击单个码可复制，或</view>
          <button class="btn-link" @click="copyAllCodes">复制全部</button>
        </view>
        <view class="modal-actions">
          <button class="btn-submit" @click="showResultModal = false">完成</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  getAccessCodeList,
  batchGenerateAccessCodes,
  disableAccessCode,
  deleteAccessCode,
  getCourseList,
} from '../../../api/course.js'
import { useUserStore } from '../../../store/user.js'
import { formatDate } from '../../../utils/format.js'
import PageHeader from '../../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const statusIndex = ref(0)
const courseIndex = ref(0)

const statusOptions = ['全部状态', '可用', '已禁用', '已过期']
const statusReverse = { 1: 'active', 2: 'disabled', 3: 'expired' }
const statusMap = {
  active: '可用',
  disabled: '已禁用',
  expired: '已过期',
}

const courseOptions = ref(['全部课程'])
const courseValues = ref([''])
const courseOptionsForBatch = ref([])
const courseValuesForBatch = ref([])

const codeList = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const submitting = ref(false)

// 弹窗
const showBatchModal = ref(false)
const batchForm = ref({
  courseDocumentId: '',
  count: 10,
  totalQuota: -1,
  expireAt: '',
  batchNote: '',
})

const showResultModal = ref(false)
const batchResult = ref({ count: 0, codes: [] })

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.value.total / pagination.value.pageSize)))

const batchFormCourseLabel = computed(() => {
  const idx = courseValuesForBatch.value.indexOf(batchForm.value.courseDocumentId)
  if (idx < 0) return ''
  return courseOptionsForBatch.value[idx]
})

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  return formatDate(dateStr, 'YYYY-MM-DD HH:mm')
}

function isExpired(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr).getTime() < Date.now()
}

async function loadCourseOptions() {
  try {
    const res = await getCourseList({ 'pagination[pageSize]': 200 })
    const list = res.list || []
    const labels = list.map(c => c.title || c.documentId)
    const values = list.map(c => c.documentId)
    courseOptions.value = ['全部课程', ...labels]
    courseValues.value = ['', ...values]
    // 批量生成弹窗不含"全部"
    courseOptionsForBatch.value = labels
    courseValuesForBatch.value = values
  } catch (e) {
    console.warn('加载课程选项失败', e)
  }
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = {
      'pagination[page]': page,
      'pagination[pageSize]': pagination.value.pageSize,
    }
    if (searchKeyword.value) {
      params['filters[code][$eq]'] = searchKeyword.value.toUpperCase()
    }
    if (statusIndex.value > 0) {
      params['filters[status][$eq]'] = statusReverse[statusIndex.value]
    }
    if (courseIndex.value > 0 && courseValues.value[courseIndex.value]) {
      params['filters[course][documentId][$eq]'] = courseValues.value[courseIndex.value]
    }

    const { list, pagination: pg } = await getAccessCodeList(params)
    codeList.value = list
    pagination.value = pg || { page, pageSize: 20, total: list.length }
    currentPage.value = page
  } catch (e) {
    console.error('加载开通码列表失败', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleStatusChange(e) {
  statusIndex.value = e.detail.value
  loadData(1)
}

function handleCourseChange(e) {
  courseIndex.value = e.detail.value
  loadData(1)
}

function copyCode(code) {
  uni.setClipboardData({
    data: code,
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
  })
}

function copyAllCodes() {
  const text = (batchResult.value.codes || []).join('\n')
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '已复制全部', icon: 'success' }),
  })
}

function openBatchModal() {
  batchForm.value = {
    courseDocumentId: '',
    count: 10,
    totalQuota: -1,
    expireAt: '',
    batchNote: '',
  }
  showBatchModal.value = true
}

async function confirmBatch() {
  const { courseDocumentId, count, totalQuota, expireAt, batchNote } = batchForm.value
  if (!courseDocumentId) {
    uni.showToast({ title: '请选择课程', icon: 'none' })
    return
  }
  const countNum = Number(count)
  if (!countNum || countNum < 1 || countNum > 100) {
    uni.showToast({ title: '数量需在 1-100 之间', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const data = {
      courseDocumentId,
      count: countNum,
      totalQuota: Number(totalQuota),
      batchNote: batchNote || undefined,
    }
    if (expireAt) {
      data.expireAt = new Date(expireAt + 'T23:59:59').toISOString()
    }

    const res = await batchGenerateAccessCodes(data)
    batchResult.value = {
      count: res?.count || res?.codes?.length || 0,
      codes: res?.codes || [],
    }
    showBatchModal.value = false
    showResultModal.value = true
    loadData(1)
  } catch (e) {
    uni.showToast({ title: e?.message || '生成失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function handleDisable(item) {
  uni.showModal({
    title: '确认禁用',
    content: `确定要禁用开通码「${item.code}」吗？禁用后将无法继续使用。`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await disableAccessCode(item.documentId)
        uni.showToast({ title: '已禁用', icon: 'success' })
        loadData(currentPage.value)
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    }
  })
}

function handleDelete(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除开通码「${item.code}」吗？此操作不可恢复。`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await deleteAccessCode(item.documentId)
        uni.showToast({ title: '已删除', icon: 'success' })
        loadData(currentPage.value)
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
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

onMounted(() => {
  loadCourseOptions()
  loadData(1)
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.btn-primary {
  background: #667eea; color: #fff; padding: 16rpx 32rpx;
  font-size: 28rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}
.btn-link {
  background: transparent; color: #667eea; font-size: 26rpx;
  border: none; padding: 10rpx 0;
}

.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.search-box {
  display: flex; align-items: center; background: #f5f5f5;
  border-radius: 8rpx; padding: 0 20rpx; margin-bottom: 16rpx;
}
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }

.filter-row { display: flex; gap: 16rpx; flex-wrap: wrap; }
.filter-item {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx;
}
.arrow { font-size: 20rpx; color: #999; }

.code-list { display: flex; flex-direction: column; gap: 20rpx; }

.code-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx;
  display: flex; flex-direction: column; gap: 16rpx;
}

.card-header {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 16rpx; border-bottom: 1rpx solid #f0f0f0;
}
.code-text {
  font-size: 36rpx; font-weight: bold; color: #667eea;
  font-family: 'Courier New', monospace; letter-spacing: 2rpx;
}

.status-badge {
  padding: 6rpx 16rpx; border-radius: 6rpx; font-size: 22rpx;
}
.status-badge.active { background: #e6f7ec; color: #52c41a; }
.status-badge.disabled { background: #f5f5f5; color: #999; }
.status-badge.expired { background: #fff1f0; color: #f5222d; }

.card-body { display: flex; flex-direction: column; gap: 8rpx; }
.info-row { display: flex; align-items: flex-start; gap: 8rpx; font-size: 24rpx; }
.info-label { color: #999; flex-shrink: 0; }
.info-value { color: #333; flex: 1; }
.info-extra { color: #666; font-size: 22rpx; }
.info-value.expired { color: #f5222d; }
.expired-tip { margin-left: 8rpx; font-size: 20rpx; }

.card-actions { display: flex; gap: 12rpx; justify-content: flex-end; padding-top: 12rpx; border-top: 1rpx solid #f0f0f0; }
.action-btn {
  padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx;
  text-align: center; min-width: 80rpx;
}
.action-btn.disable { background: #fff4e6; color: #fa8c16; }
.action-btn.copy { background: #e3f2fd; color: #1890ff; }
.action-btn.delete { background: #fff1f0; color: #f5222d; }

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0; gap: 20rpx;
}
.empty-icon { font-size: 80rpx; }
.empty-text { font-size: 28rpx; color: #999; }

.pagination {
  display: flex; justify-content: center; align-items: center;
  gap: 40rpx; padding: 40rpx 0;
}
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }

/* 弹窗 */
.modal-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5); display: flex; align-items: center;
  justify-content: center; z-index: 1000;
}
.modal-content {
  background: #fff; border-radius: 16rpx; padding: 30rpx;
  width: 90%; max-width: 600rpx; max-height: 80vh; overflow-y: auto;
}
.modal-title { font-size: 32rpx; font-weight: bold; margin-bottom: 20rpx; }
.modal-body { display: flex; flex-direction: column; gap: 20rpx; }
.form-item { display: flex; flex-direction: column; gap: 10rpx; }
.form-label { font-size: 26rpx; color: #666; }
.required { color: #f5222d; }
.form-input {
  background: #f5f5f5; border-radius: 8rpx; padding: 20rpx;
  font-size: 26rpx; min-height: 40rpx; width: 100%; box-sizing: border-box;
}
.picker-display {
  display: flex; justify-content: space-between; align-items: center;
}

.modal-actions {
  display: flex; gap: 20rpx; margin-top: 30rpx;
}
.btn-cancel, .btn-submit {
  flex: 1; padding: 20rpx 0; border-radius: 8rpx; font-size: 28rpx; border: none;
}
.btn-cancel { background: #f5f5f5; color: #666; }
.btn-submit { background: #667eea; color: #fff; }

.result-info { font-size: 26rpx; color: #666; }
.code-result-list {
  max-height: 400rpx; background: #f9f9f9; border-radius: 8rpx; padding: 12rpx;
}
.code-result-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16rpx 20rpx; border-bottom: 1rpx solid #eee;
  font-family: 'Courier New', monospace;
}
.code-result-item:last-child { border-bottom: none; }
.code-result-text { font-size: 28rpx; color: #667eea; font-weight: bold; }
.copy-tip { font-size: 22rpx; color: #1890ff; }
.result-tip { font-size: 22rpx; color: #999; text-align: center; }
</style>
