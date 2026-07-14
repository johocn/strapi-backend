<template>
  <view class="page-container">
    <PageHeader title="用户课程授权">
      <button class="btn-primary" @click="showGrantModal = true" v-if="hasPermission('menu.auth')">+ 授权</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="搜索用户或课程"
          @confirm="loadData"
          class="search-input"
        />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="authTypeOptions" @change="handleAuthTypeChange">
          <view class="filter-item">
            <text>{{ authTypeOptions[authTypeIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="auth-list">
      <view
        v-for="item in authList"
        :key="item.documentId"
        class="auth-card"
      >
        <view class="auth-info">
          <view class="auth-user">{{ item.user?.username || item.user?.email || '未知用户' }}</view>
          <view class="auth-course">{{ item.course?.title || '未知课程' }}</view>
          <view class="auth-meta">
            <view class="auth-type-badge" :class="item.authType">{{ authTypeMap[item.authType] || item.authType }}</view>
            <text class="meta-item" v-if="item.expiresAt">到期: {{ formatDate(item.expiresAt) }}</text>
            <view class="expired-badge" v-if="item.isExpired">已过期</view>
          </view>
        </view>
        <view class="auth-actions">
          <view class="action-btn revoke" @click="handleRevoke(item)" v-if="hasPermission('menu.auth')">撤销</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && authList.length === 0" class="empty-state">
      <text class="empty-icon">🔐</text>
      <text class="empty-text">暂无授权记录</text>
      <button class="btn-primary" @click="showGrantModal = true" v-if="hasPermission('menu.auth')">立即授权</button>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <!-- 授权弹窗 -->
    <view class="modal-mask" v-if="showGrantModal" @click="showGrantModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-title">新增授权</view>
        <view class="form-item">
          <text class="form-label">用户 ID <text class="required">*</text></text>
          <input type="number" v-model="grantForm.userId" placeholder="输入用户ID" class="form-input" />
        </view>
        <view class="form-item">
          <text class="form-label">课程 ID <text class="required">*</text></text>
          <input type="text" v-model="grantForm.courseId" placeholder="输入课程documentId" class="form-input" />
        </view>
        <view class="form-item">
          <text class="form-label">授权类型</text>
          <picker mode="selector" :range="grantTypeList" @change="e => grantForm.authType = grantTypeValues[e.detail.value]">
            <view class="form-input picker-display">
              <text>{{ grantTypeMap[grantForm.authType] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">过期时间（可选）</text>
          <picker mode="date" @change="e => grantForm.expiresAt = e.detail.value">
            <view class="form-input picker-display">
              <text>{{ grantForm.expiresAt || '选择日期' }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
        <view class="modal-actions">
          <button class="btn-cancel" @click="showGrantModal = false">取消</button>
          <button class="btn-submit" @click="handleGrant" :loading="granting">确认授权</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getUserCourseList, grantUserCourse, revokeUserCourse } from '../../../src/api/course.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const searchKeyword = ref('')
const userStore = useUserStore()
const hasPermission = userStore.hasPermission
const authTypeIndex = ref(0)
const authTypeOptions = ['全部类型', '免费', '付费', '管理员授权']
const authTypeMap = { free: '免费', paid: '付费', admin_grant: '管理员授权' }
const authTypeReverse = { 1: 'free', 2: 'paid', 3: 'admin_grant' }

const grantTypeList = ['免费', '付费', '管理员授权']
const grantTypeValues = ['free', 'paid', 'admin_grant']
const grantTypeMap = { free: '免费', paid: '付费', admin_grant: '管理员授权' }

const authList = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

const showGrantModal = ref(false)
const granting = ref(false)
const grantForm = ref({
  userId: '',
  courseId: '',
  authType: 'admin_grant',
  expiresAt: '',
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = {
      'pagination[page]': page,
      'pagination[pageSize]': 20,
    }
    if (searchKeyword.value) {
      params['filters[user][username][$contains]'] = searchKeyword.value
    }
    if (authTypeIndex.value > 0) {
      params['filters[authType][$eq]'] = authTypeReverse[authTypeIndex.value]
    }
    const { list, pagination: pg } = await getUserCourseList(params)
    authList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleAuthTypeChange(e) {
  authTypeIndex.value = e.detail.value
  loadData(1)
}

async function handleGrant() {
  if (!grantForm.value.userId || !grantForm.value.courseId) {
    uni.showToast({ title: '请填写用户ID和课程ID', icon: 'none' })
    return
  }
  granting.value = true
  try {
    const data = {
      user: grantForm.value.userId,
      course: grantForm.value.courseId,
      authType: grantForm.value.authType,
    }
    if (grantForm.value.expiresAt) {
      data.expiresAt = new Date(grantForm.value.expiresAt).toISOString()
    }
    await grantUserCourse(data)
    uni.showToast({ title: '授权成功', icon: 'success' })
    showGrantModal.value = false
    grantForm.value = { userId: '', courseId: '', authType: 'admin_grant', expiresAt: '' }
    loadData(1)
  } catch (e) {
    uni.showToast({ title: '授权失败', icon: 'none' })
  } finally {
    granting.value = false
  }
}

async function handleRevoke(item) {
  uni.showModal({
    title: '确认撤销',
    content: `确定要撤销用户「${item.user?.username || '未知'}」对课程「${item.course?.title || '未知'}」的授权吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await revokeUserCourse(item.documentId)
          uni.showToast({ title: '撤销成功', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '撤销失败', icon: 'none' })
        }
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

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

onMounted(() => loadData(1))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.btn-primary {
  background: #ff0000; color: #fff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}

.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.search-box {
  display: flex; align-items: center; background: #f5f5f5;
  border-radius: 8rpx; padding: 0 20rpx; margin-bottom: 16rpx;
}
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }

.filter-row { display: flex; gap: 20rpx; }
.filter-item {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx;
}
.arrow { font-size: 20rpx; color: #999; }

.auth-list { display: flex; flex-direction: column; gap: 20rpx; }

.auth-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx;
  display: flex; justify-content: space-between; align-items: center;
}
.auth-info { flex: 1; }
.auth-user { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 6rpx; }
.auth-course { font-size: 26rpx; color: #666; margin-bottom: 10rpx; }
.auth-meta { display: flex; align-items: center; gap: 16rpx; flex-wrap: wrap; }

.auth-type-badge {
  padding: 4rpx 16rpx; border-radius: 6rpx; font-size: 22rpx;
}
.auth-type-badge.free { background: #e8f5e9; color: #52c41a; }
.auth-type-badge.paid { background: #fff3e0; color: #faad14; }
.auth-type-badge.admin_grant { background: #e3f2fd; color: #1890ff; }

.meta-item { font-size: 24rpx; color: #999; }

.expired-badge {
  padding: 4rpx 16rpx; border-radius: 6rpx; font-size: 22rpx;
  background: #fff0f0; color: #ff4d4f;
}

.auth-actions { display: flex; gap: 16rpx; flex-shrink: 0; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.revoke { background: #fff0f0; color: #ff4d4f; }

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0;
}
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }

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
  background: rgba(0,0,0,0.5); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.modal-content {
  width: 85%; background: #fff; border-radius: 16rpx; padding: 40rpx;
}
.modal-title { font-size: 34rpx; font-weight: bold; color: #333; margin-bottom: 32rpx; text-align: center; }

.form-item { margin-bottom: 24rpx; }
.form-label { font-size: 28rpx; color: #333; margin-bottom: 12rpx; display: block; }
.required { color: #ff4d4f; }
.form-input {
  width: 100%; height: 80rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box;
}
.picker-display {
  display: flex; justify-content: space-between; align-items: center;
}

.modal-actions { display: flex; gap: 20rpx; margin-top: 32rpx; }
.btn-cancel {
  flex: 1; height: 80rpx; line-height: 80rpx; text-align: center;
  background: #f5f5f5; color: #666; font-size: 28rpx; border-radius: 8rpx; border: none;
}
.btn-submit {
  flex: 1; height: 80rpx; line-height: 80rpx; text-align: center;
  background: #07c160; color: #fff; font-size: 28rpx; border-radius: 8rpx; border: none;
}
</style>
