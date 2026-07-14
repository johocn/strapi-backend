<template>
  <view class="page-container">
    <PageHeader title="积分记录">
      <button class="btn-primary" @click="openAdjust">+ 调整</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input v-model="searchUserId" class="search-input" placeholder="搜索用户ID" type="number" @confirm="handleSearch" />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="typeOptions" @change="handleTypeChange">
          <view class="filter-item">
            <text>{{ typeOptions[typeIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <picker mode="selector" :range="actionOptions" @change="handleActionChange">
          <view class="filter-item">
            <text>{{ actionOptions[actionIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="record-list">
      <view v-for="item in list" :key="item.id || item.documentId" class="record-card">
        <view class="record-info">
          <view class="record-header">
            <text class="record-action">{{ item.action || item.typeCode || '-' }}</text>
            <text class="record-points" :class="(item.points ?? item.amount ?? 0) >= 0 ? 'positive' : 'negative'">
              {{ (item.points ?? item.amount ?? 0) >= 0 ? '+' : '' }}{{ item.points ?? item.amount ?? 0 }}
            </text>
          </view>
          <view class="record-meta">
            <text class="meta-item">用户: {{ item.userId || item.user?.id || '-' }}</text>
            <text class="meta-item">{{ item.type || '-' }}</text>
          </view>
          <view class="record-meta">
            <text class="meta-item">{{ item.remark || '' }}</text>
          </view>
          <view class="record-time">{{ item.createdAt || '-' }}</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && list.length === 0" class="empty-state">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无积分记录</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <!-- 管理员调整积分弹窗 -->
    <view class="modal-mask" v-if="showAdjustModal" @click="closeAdjust">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">调整积分</text>
          <text class="modal-close" @click="closeAdjust">✕</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">用户ID <text class="required">*</text></text>
            <input type="number" v-model="adjustForm.userId" placeholder="请输入用户ID" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">积分数 <text class="required">*</text></text>
            <input type="number" v-model="adjustForm.points" placeholder="正数增加，负数扣除" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">操作类型</text>
            <input type="text" v-model="adjustForm.action" placeholder="如: admin_adjust" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">备注</text>
            <textarea v-model="adjustForm.remark" placeholder="请输入备注" class="form-textarea" />
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeAdjust">取消</button>
          <button class="btn-submit" @click="handleAdjust" :loading="adjusting">确认调整</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getRecordList, adminAdjust } from '../../src/api/points.js'
import PageHeader from '../../src/components/PageHeader.vue'

const searchUserId = ref('')
const typeIndex = ref(0)
const actionIndex = ref(0)
const typeOptions = ['全部类型', 'earn', 'deduct', 'adjust']
const actionOptions = ['全部操作', 'course_complete', 'lesson_complete', 'daily_sign_in', 'admin_adjust']

const list = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

const showAdjustModal = ref(false)
const adjusting = ref(false)
const adjustForm = ref({ userId: '', points: '', action: 'admin_adjust', remark: '' })

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { page, pageSize: pagination.value.pageSize }
    if (searchUserId.value) params.userId = searchUserId.value
    if (typeIndex.value > 0) params.type = typeOptions[typeIndex.value]
    if (actionIndex.value > 0) params.action = actionOptions[actionIndex.value]
    const res = await getRecordList(params)
    list.value = res.list || []
    pagination.value = res.pagination || { page: 1, pageSize: 20, total: 0 }
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleSearch() { loadData(1) }
function handleTypeChange(e) { typeIndex.value = e.detail.value; loadData(1) }
function handleActionChange(e) { actionIndex.value = e.detail.value; loadData(1) }
function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }
const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

function openAdjust() {
  adjustForm.value = { userId: '', points: '', action: 'admin_adjust', remark: '' }
  showAdjustModal.value = true
}
function closeAdjust() { showAdjustModal.value = false }

async function handleAdjust() {
  if (!adjustForm.value.userId) return uni.showToast({ title: '请输入用户ID', icon: 'none' })
  if (!adjustForm.value.points) return uni.showToast({ title: '请输入积分数', icon: 'none' })
  adjusting.value = true
  try {
    await adminAdjust({
      userId: Number(adjustForm.value.userId),
      points: Number(adjustForm.value.points),
      action: adjustForm.value.action || 'admin_adjust',
      remark: adjustForm.value.remark || undefined,
    })
    uni.showToast({ title: '调整成功', icon: 'success' })
    closeAdjust()
    loadData(currentPage.value)
  } catch (e) {
    uni.showToast({ title: '调整失败', icon: 'none' })
  } finally {
    adjusting.value = false
  }
}

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
  border-radius: 8rpx; padding: 0 20rpx; margin-bottom: 20rpx;
}
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }

.filter-row { display: flex; gap: 20rpx; }
.filter-item {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx;
}
.arrow { font-size: 20rpx; color: #999; }

.record-list { display: flex; flex-direction: column; gap: 16rpx; }

.record-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx;
}
.record-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx;
}
.record-action { font-size: 30rpx; font-weight: bold; color: #333; }
.record-points { font-size: 34rpx; font-weight: bold; }
.record-points.positive { color: #07c160; }
.record-points.negative { color: #ff4d4f; }

.record-meta { display: flex; gap: 16rpx; margin-bottom: 8rpx; }
.meta-item { font-size: 24rpx; color: #999; }
.record-time { font-size: 24rpx; color: #ccc; }

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

.modal-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.modal-content {
  width: 90%; background: #fff; border-radius: 16rpx;
  overflow: hidden; display: flex; flex-direction: column;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 30rpx; border-bottom: 1rpx solid #f0f0f0;
}
.modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.modal-close { font-size: 36rpx; color: #999; padding: 10rpx; }
.modal-body { padding: 30rpx; }

.form-item { margin-bottom: 32rpx; }
.form-item:last-child { margin-bottom: 0; }
.form-label { font-size: 28rpx; color: #333; margin-bottom: 12rpx; display: block; }
.required { color: #ff4d4f; }

.form-input {
  width: 100%; height: 80rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box;
}
.form-textarea {
  width: 100%; min-height: 120rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 20rpx; font-size: 28rpx; box-sizing: border-box;
}

.modal-footer {
  display: flex; gap: 20rpx; padding: 20rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
}
.btn-cancel {
  flex: 1; height: 88rpx; line-height: 88rpx; text-align: center;
  background: #f5f5f5; color: #666; font-size: 30rpx; border-radius: 8rpx; border: none;
}
.btn-submit {
  flex: 1; height: 88rpx; line-height: 88rpx; text-align: center;
  background: #07c160; color: #fff; font-size: 30rpx; border-radius: 8rpx; border: none;
}
</style>
