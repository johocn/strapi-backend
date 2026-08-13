<template>
  <view class="page-container">
    <PageHeader title="报名管理">
      <button class="btn-secondary" @click="goAccessCodes">开通码</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="搜索用户/课程名称"
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
        <picker mode="selector" :range="enrollTypeOptions" @change="handleEnrollTypeChange">
          <view class="filter-item">
            <text>{{ enrollTypeOptions[enrollTypeIndex] }}</text>
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

    <view class="enrollment-list">
      <view
        v-for="item in enrollmentList"
        :key="item.documentId"
        class="enrollment-card"
      >
        <view class="card-header">
          <view class="header-left">
            <text class="user-name">{{ item.user?.username || item.user?.email || '用户#' + (item.user?.id || '?') }}</text>
            <text class="separator">|</text>
            <text class="course-name">{{ item.course?.title || '未知课程' }}</text>
          </view>
          <view class="status-badge" :class="item.status">{{ statusMap[item.status] || item.status }}</view>
        </view>

        <view class="card-body">
          <view class="info-row">
            <text class="info-label">报名类型：</text>
            <text class="info-value">{{ enrollTypeMap[item.enrollType] || item.enrollType }}</text>
            <text v-if="item.enrollType === 'points' && item.pointsSpent" class="info-extra">
              （消耗 {{ item.pointsSpent }} 积分）
            </text>
            <text v-else-if="item.enrollType === 'code' && item.accessCode" class="info-extra">
              （码：{{ item.accessCode }}）
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">提交时间：</text>
            <text class="info-value">{{ formatDateTime(item.createdAt) }}</text>
          </view>
          <view v-if="item.enrollType === 'paid' && item.voucherUrl" class="info-row">
            <text class="info-label">付款凭证：</text>
            <view class="voucher-thumb" @click="previewVoucher(item.voucherUrl)">
              <image :src="item.voucherUrl" mode="aspectFill" class="voucher-img" />
              <text class="voucher-tip">点击查看</text>
            </view>
          </view>
          <view v-if="item.voucherNote" class="info-row">
            <text class="info-label">用户备注：</text>
            <text class="info-value">{{ item.voucherNote }}</text>
          </view>
          <view v-if="item.reviewer" class="info-row">
            <text class="info-label">审核人：</text>
            <text class="info-value">{{ item.reviewer?.username || item.reviewer?.email || '管理员' }}</text>
            <text class="info-extra" v-if="item.reviewedAt">（{{ formatDateTime(item.reviewedAt) }}）</text>
          </view>
          <view v-if="item.reviewNote" class="info-row">
            <text class="info-label">审核备注：</text>
            <text class="info-value review-note" :class="{ reject: item.status === 'rejected' }">
              {{ item.reviewNote }}
            </text>
          </view>
        </view>

        <view class="card-actions" v-if="hasPermission('course.update')">
          <view
            v-if="item.status === 'pending_review'"
            class="action-btn approve"
            @click="handleApprove(item)"
          >通过</view>
          <view
            v-if="item.status === 'pending_review'"
            class="action-btn reject"
            @click="handleReject(item)"
          >驳回</view>
          <view
            v-if="item.status === 'enrolled'"
            class="action-btn revoke"
            @click="handleRevoke(item)"
          >撤销权限</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && enrollmentList.length === 0" class="empty-state">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无报名记录</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage <= 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <!-- 驳回弹窗 -->
    <view class="modal-mask" v-if="showRejectModal" @click="showRejectModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-title">驳回报名</view>
        <view class="modal-body">
          <view class="modal-info">
            <text>用户：{{ rejectTarget?.user?.username || '?' }}</text>
            <text>课程：{{ rejectTarget?.course?.title || '?' }}</text>
          </view>
          <view class="form-item">
            <text class="form-label">驳回原因 <text class="required">*</text></text>
            <textarea
              v-model="rejectNote"
              class="form-textarea"
              placeholder="请填写驳回原因，将展示给用户"
              maxlength="200"
            />
          </view>
        </view>
        <view class="modal-actions">
          <button class="btn-cancel" @click="showRejectModal = false">取消</button>
          <button class="btn-submit" @click="confirmReject" :loading="submitting">确认驳回</button>
        </view>
      </view>
    </view>

    <!-- 撤销弹窗 -->
    <view class="modal-mask" v-if="showRevokeModal" @click="showRevokeModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-title">撤销学习权限</view>
        <view class="modal-body">
          <view class="modal-info">
            <text>用户：{{ revokeTarget?.user?.username || '?' }}</text>
            <text>课程：{{ revokeTarget?.course?.title || '?' }}</text>
          </view>
          <view class="form-item">
            <text class="form-label">撤销原因（可选）</text>
            <textarea
              v-model="revokeNote"
              class="form-textarea"
              placeholder="撤销原因，将展示给用户"
              maxlength="200"
            />
          </view>
        </view>
        <view class="modal-actions">
          <button class="btn-cancel" @click="showRevokeModal = false">取消</button>
          <button class="btn-submit danger" @click="confirmRevoke" :loading="submitting">确认撤销</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  getEnrollmentList,
  approveEnrollment,
  rejectEnrollment,
  revokeEnrollment,
  getCourseList,
} from '../../../api/course.js'
import { useUserStore } from '../../../store/user.js'
import { formatDate } from '../../../utils/format.js'
import PageHeader from '../../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const statusIndex = ref(0)
const enrollTypeIndex = ref(0)
const courseIndex = ref(0)

const statusOptions = ['全部状态', '待审核', '已开通', '已驳回', '已撤销']
const statusReverse = { 1: 'pending_review', 2: 'enrolled', 3: 'rejected', 4: 'revoked' }
const statusMap = {
  pending_review: '待审核',
  enrolled: '已开通',
  rejected: '已驳回',
  revoked: '已撤销',
}

const enrollTypeOptions = ['全部类型', '免费', '积分', '付费', '开通码']
const enrollTypeReverse = { 1: 'free', 2: 'points', 3: 'paid', 4: 'code' }
const enrollTypeMap = {
  free: '免费',
  points: '积分兑换',
  paid: '付费',
  code: '开通码',
}

const courseOptions = ref(['全部课程'])
const courseValues = ref([''])

const enrollmentList = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const submitting = ref(false)

// 弹窗状态
const showRejectModal = ref(false)
const rejectTarget = ref(null)
const rejectNote = ref('')

const showRevokeModal = ref(false)
const revokeTarget = ref(null)
const revokeNote = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.value.total / pagination.value.pageSize)))

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  return formatDate(dateStr, 'YYYY-MM-DD HH:mm')
}

async function loadCourseOptions() {
  try {
    const res = await getCourseList({ 'pagination[pageSize]': 200 })
    const list = res.list || []
    courseOptions.value = ['全部课程', ...list.map(c => c.title || c.documentId)]
    courseValues.value = ['', ...list.map(c => c.documentId)]
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
      params['filters[user][username][$contains]'] = searchKeyword.value
    }
    if (statusIndex.value > 0) {
      params['filters[status][$eq]'] = statusReverse[statusIndex.value]
    }
    if (enrollTypeIndex.value > 0) {
      params['filters[enrollType][$eq]'] = enrollTypeReverse[enrollTypeIndex.value]
    }
    if (courseIndex.value > 0 && courseValues.value[courseIndex.value]) {
      params['filters[course][documentId][$eq]'] = courseValues.value[courseIndex.value]
    }

    const { list, pagination: pg } = await getEnrollmentList(params)
    enrollmentList.value = list
    pagination.value = pg || { page, pageSize: 20, total: list.length }
    currentPage.value = page
  } catch (e) {
    console.error('加载报名列表失败', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleStatusChange(e) {
  statusIndex.value = e.detail.value
  loadData(1)
}

function handleEnrollTypeChange(e) {
  enrollTypeIndex.value = e.detail.value
  loadData(1)
}

function handleCourseChange(e) {
  courseIndex.value = e.detail.value
  loadData(1)
}

function previewVoucher(url) {
  if (!url) return
  uni.previewImage({ urls: [url] })
}

function handleApprove(item) {
  uni.showModal({
    title: '确认通过',
    content: `确定通过「${item.user?.username || '?'}」对课程「${item.course?.title || '?'}」的报名？`,
    success: async (res) => {
      if (!res.confirm) return
      submitting.value = true
      try {
        await approveEnrollment(item.documentId)
        uni.showToast({ title: '已通过', icon: 'success' })
        loadData(currentPage.value)
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      } finally {
        submitting.value = false
      }
    }
  })
}

function handleReject(item) {
  rejectTarget.value = item
  rejectNote.value = ''
  showRejectModal.value = true
}

async function confirmReject() {
  if (!rejectNote.value.trim()) {
    uni.showToast({ title: '请填写驳回原因', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await rejectEnrollment(rejectTarget.value.documentId, rejectNote.value.trim())
    uni.showToast({ title: '已驳回', icon: 'success' })
    showRejectModal.value = false
    loadData(currentPage.value)
  } catch (e) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function handleRevoke(item) {
  revokeTarget.value = item
  revokeNote.value = ''
  showRevokeModal.value = true
}

async function confirmRevoke() {
  submitting.value = true
  try {
    await revokeEnrollment(revokeTarget.value.documentId, revokeNote.value.trim())
    uni.showToast({ title: '已撤销', icon: 'success' })
    showRevokeModal.value = false
    loadData(currentPage.value)
  } catch (e) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function goAccessCodes() {
  uni.navigateTo({ url: '/pages/course/access-code/list' })
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

.btn-secondary {
  background: #f0f2ff; color: #667eea; padding: 16rpx 28rpx;
  font-size: 26rpx; border-radius: 8rpx; border: none; line-height: 1.2;
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

.enrollment-list { display: flex; flex-direction: column; gap: 20rpx; }

.enrollment-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx;
  display: flex; flex-direction: column; gap: 16rpx;
}

.card-header {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 16rpx; border-bottom: 1rpx solid #f0f0f0;
}
.header-left { display: flex; align-items: center; gap: 12rpx; flex: 1; min-width: 0; }
.user-name { font-size: 28rpx; font-weight: bold; color: #333; }
.separator { color: #ddd; font-size: 24rpx; }
.course-name {
  font-size: 26rpx; color: #666; flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.status-badge {
  padding: 6rpx 16rpx; border-radius: 6rpx; font-size: 22rpx;
  flex-shrink: 0;
}
.status-badge.pending_review { background: #fff4e6; color: #fa8c16; }
.status-badge.enrolled { background: #e6f7ec; color: #52c41a; }
.status-badge.rejected { background: #fff1f0; color: #f5222d; }
.status-badge.revoked { background: #f5f5f5; color: #999; }

.card-body { display: flex; flex-direction: column; gap: 8rpx; }
.info-row { display: flex; align-items: flex-start; gap: 8rpx; font-size: 24rpx; }
.info-label { color: #999; flex-shrink: 0; }
.info-value { color: #333; flex: 1; }
.info-extra { color: #666; font-size: 22rpx; }
.review-note.reject { color: #f5222d; }

.voucher-thumb {
  display: flex; align-items: center; gap: 12rpx;
}
.voucher-img {
  width: 80rpx; height: 80rpx; border-radius: 6rpx;
  border: 1rpx solid #eee;
}
.voucher-tip { font-size: 22rpx; color: #1890ff; }

.card-actions { display: flex; gap: 12rpx; justify-content: flex-end; padding-top: 12rpx; border-top: 1rpx solid #f0f0f0; }
.action-btn {
  padding: 12rpx 28rpx; border-radius: 8rpx; font-size: 24rpx;
  text-align: center; min-width: 100rpx;
}
.action-btn.approve { background: #e6f7ec; color: #52c41a; }
.action-btn.reject { background: #fff1f0; color: #f5222d; }
.action-btn.revoke { background: #fff4e6; color: #fa8c16; }

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0;
}
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
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
  width: 90%; max-width: 600rpx;
}
.modal-title { font-size: 32rpx; font-weight: bold; margin-bottom: 20rpx; }
.modal-body { display: flex; flex-direction: column; gap: 20rpx; }
.modal-info {
  background: #f9f9f9; padding: 16rpx; border-radius: 8rpx;
  display: flex; flex-direction: column; gap: 8rpx; font-size: 26rpx; color: #666;
}
.form-item { display: flex; flex-direction: column; gap: 10rpx; }
.form-label { font-size: 26rpx; color: #666; }
.required { color: #f5222d; }
.form-textarea {
  background: #f5f5f5; border-radius: 8rpx; padding: 20rpx;
  font-size: 26rpx; min-height: 150rpx; width: 100%; box-sizing: border-box;
}
.modal-actions {
  display: flex; gap: 20rpx; margin-top: 30rpx;
}
.btn-cancel, .btn-submit {
  flex: 1; padding: 20rpx 0; border-radius: 8rpx; font-size: 28rpx; border: none;
}
.btn-cancel { background: #f5f5f5; color: #666; }
.btn-submit { background: #ff4d4f; color: #fff; }
.btn-submit.danger { background: #ff4d4f; }
</style>
