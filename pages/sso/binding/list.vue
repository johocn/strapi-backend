<template>
  <view class="page-container">
    <PageHeader title="三方绑定" />

    <view class="search-section">
      <view class="search-box">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="搜索 provider / provider_user_id"
          @confirm="loadData"
          class="search-input"
        />
        <text class="search-icon">🔍</text>
      </view>
      <view class="search-actions">
        <button class="action-button wechat" @click="goWechatConfig">配置微信登录</button>
        <button class="action-button primary" @click="openCreateModal">+ 新增绑定</button>
      </view>
    </view>

    <view class="data-list">
      <view v-for="item in dataList" :key="item.documentId" class="data-card">
        <view class="data-info">
          <view class="data-title">{{ item.provider || '-' }} · {{ item.provider_nickname || '无昵称' }}</view>
          <view class="data-meta">
            <text class="meta-item">用户: {{ relDoc(item.user) }}</text>
            <text class="meta-item">三方ID: {{ item.provider_user_id || '-' }}</text>
          </view>
          <view class="data-meta">
            <text class="meta-item">UnionID: {{ item.provider_union_id || '-' }}</text>
          </view>
          <view class="data-footer">
            <view class="data-status active">{{ item.provider }}</view>
            <view class="data-date">绑定: {{ fmtDateTime(item.bound_at) }}</view>
          </view>
        </view>
        <view class="data-actions">
          <view class="action-btn edit" @click.stop="goEditConfig(item)">编辑</view>
          <view v-if="hasPermission('sso.third-party-binding.delete')" class="action-btn delete" @click.stop="handleUnbind(item)">解绑</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && dataList.length === 0" class="empty-state">
      <text class="empty-icon">🔗</text>
      <text class="empty-text">暂无三方绑定记录</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <!-- 新增绑定弹窗 -->
    <view v-if="showCreateModal" class="modal-mask" @click.self="closeCreateModal">
      <view class="modal-dialog" @click.stop>
        <view class="modal-header">
          <text class="modal-title">新增三方绑定</text>
          <text class="modal-close" @click="closeCreateModal">×</text>
        </view>
        <view class="modal-body">
          <view class="modal-item">
            <text class="modal-label">Provider<text class="required-mark">*</text></text>
            <picker mode="selector" :range="bindingProviderOptions" range-key="label" @change="onCreateProviderChange" :value="createProviderIndex">
              <view class="modal-picker">{{ bindingProviderOptions[createProviderIndex] ? bindingProviderOptions[createProviderIndex].label : '请选择' }} ▼</view>
            </picker>
          </view>
          <view class="modal-item">
            <text class="modal-label">Provider User ID<text class="required-mark">*</text></text>
            <input v-model="createForm.provider_user_id" class="modal-input" placeholder="三方平台的用户唯一标识" />
          </view>
          <view class="modal-item">
            <text class="modal-label">Provider Union ID</text>
            <input v-model="createForm.provider_union_id" class="modal-input" placeholder="UnionID（选填）" />
          </view>
          <view class="modal-item">
            <text class="modal-label">Provider Nickname</text>
            <input v-model="createForm.provider_nickname" class="modal-input" placeholder="三方平台用户昵称（选填）" />
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel" @click="closeCreateModal" :disabled="createSubmitting">取消</button>
          <button class="modal-btn confirm" @click="submitCreate" :loading="createSubmitting" :disabled="createSubmitting">提交</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ssoBindingApi } from '../../../src/api/sso.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const dataList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

function relDoc(rel) {
  if (!rel) return '-'
  if (typeof rel === 'object') return rel.documentId || rel.id || '-'
  return rel
}

function fmtDateTime(dt) {
  if (!dt) return '-'
  return String(dt).replace('T', ' ').substring(0, 19)
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = {
      'pagination[page]': page,
      'pagination[pageSize]': 10
    }
    if (searchKeyword.value) {
      params['filters[$or][0][provider][$contains]'] = searchKeyword.value
      params['filters[$or][1][provider_user_id][$contains]'] = searchKeyword.value
    }
    const { list, pagination: pg } = await ssoBindingApi.list(params)
    dataList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleUnbind(item) {
  uni.showModal({
    title: '确认解绑',
    content: `确定要解绑「${item.provider}」的绑定吗？解绑后用户将无法通过该三方账号登录。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await ssoBindingApi.delete(item.documentId)
          uni.showToast({ title: '解绑成功', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '解绑失败', icon: 'none' })
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

// ==================== 顶部操作按钮 ====================

function goWechatConfig() {
  uni.navigateTo({ url: '/pages/sso/oauth-config/edit' })
}

// ==================== 新增绑定弹窗 ====================

const bindingProviderOptions = [
  { value: 'wechat', label: '微信' },
  { value: 'alipay', label: '支付宝' },
  { value: 'douyin', label: '抖音' },
]

const showCreateModal = ref(false)
const createSubmitting = ref(false)
const createProviderIndex = ref(0)
const createForm = ref({
  provider: '',
  provider_user_id: '',
  provider_union_id: '',
  provider_nickname: '',
})

function resetCreateForm() {
  createProviderIndex.value = 0
  createForm.value = {
    provider: bindingProviderOptions[0].value,
    provider_user_id: '',
    provider_union_id: '',
    provider_nickname: '',
  }
}

function openCreateModal() {
  resetCreateForm()
  showCreateModal.value = true
}

function closeCreateModal() {
  if (createSubmitting.value) return
  showCreateModal.value = false
}

function onCreateProviderChange(e) {
  createProviderIndex.value = e.detail.value
  createForm.value.provider = bindingProviderOptions[createProviderIndex.value].value
}

async function submitCreate() {
  if (createSubmitting.value) return
  if (!createForm.value.provider) {
    uni.showToast({ title: '请选择 Provider', icon: 'none' })
    return
  }
  if (!createForm.value.provider_user_id) {
    uni.showToast({ title: '请填写 Provider User ID', icon: 'none' })
    return
  }
  createSubmitting.value = true
  try {
    const payload = {
      provider: createForm.value.provider,
      provider_user_id: createForm.value.provider_user_id,
      provider_union_id: createForm.value.provider_union_id || undefined,
      provider_nickname: createForm.value.provider_nickname || undefined,
    }
    await ssoBindingApi.create(payload)
    uni.showToast({ title: '创建成功', icon: 'success' })
    showCreateModal.value = false
    loadData(1)
  } catch (e) {
    uni.showToast({ title: '创建失败', icon: 'none' })
  } finally {
    createSubmitting.value = false
  }
}

// ==================== 行内编辑按钮 ====================

function goEditConfig(item) {
  if (item && item.oauth_config_id) {
    uni.navigateTo({
      url: '/pages/sso/oauth-config/edit?documentId=' + item.oauth_config_id
    })
  } else {
    // 没有关联的 OAuth 配置 ID，跳转到 OAuth 配置列表页
    uni.navigateTo({ url: '/pages/sso/oauth-config/list' })
  }
}

onShow(() => {
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
}

.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
}

.search-icon {
  font-size: 32rpx;
}

.search-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.action-button {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  font-size: 26rpx;
  border-radius: 8rpx;
  border: none;
  padding: 0;
}

.action-button.primary {
  background: #ff0000;
  color: #fff;
}

.action-button.wechat {
  background: #07c160;
  color: #fff;
}

.action-button[disabled] {
  opacity: 0.6;
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
  margin-bottom: 8rpx;
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
}

.data-status.active { background: #1989fa; }

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

.action-btn.delete { background: #fff0f0; color: #ff4d4f; }
.action-btn.edit { background: #e6f4ff; color: #1989fa; }

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

/* 弹窗样式 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 40rpx;
  box-sizing: border-box;
}

.modal-dialog {
  width: 100%;
  max-width: 640rpx;
  background: #fff;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.modal-close {
  font-size: 40rpx;
  color: #999;
  line-height: 1;
  padding: 0 8rpx;
}

.modal-body {
  padding: 24rpx;
  overflow-y: auto;
  flex: 1;
}

.modal-item {
  margin-bottom: 24rpx;
}

.modal-label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.required-mark {
  color: #ff4d4f;
  margin-left: 4rpx;
}

.modal-input {
  width: 100%;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.modal-picker {
  width: 100%;
  height: 72rpx;
  line-height: 72rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  color: #333;
}

.modal-footer {
  display: flex;
  gap: 16rpx;
  padding: 24rpx;
  border-top: 1rpx solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  font-size: 30rpx;
  border-radius: 8rpx;
  border: none;
  padding: 0;
}

.modal-btn.cancel {
  background: #f5f5f5;
  color: #666;
}

.modal-btn.confirm {
  background: #ff0000;
  color: #fff;
}

.modal-btn[disabled] {
  opacity: 0.6;
}
</style>
