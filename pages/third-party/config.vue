<template>
  <view class="page-container">
    <PageHeader title="三方配置">
      <view class="header-right">
        <button class="btn-primary" @click="openAdd">+ 新增</button>
      </view>
    </PageHeader>

    <view class="config-list">
      <view v-for="item in list" :key="item.id || item.documentId" class="config-card">
        <view class="config-info">
          <view class="config-header">
            <text class="config-name">{{ getPlatformLabel(item.platform) }} - {{ getAppTypeLabel(item.appType) }}</text>
            <view class="status-badge" :class="item.enabled ? 'active' : 'inactive'">
              {{ item.enabled ? '启用' : '停用' }}
            </view>
          </view>
          <view class="config-meta">
            <text class="meta-item">AppID: {{ item.appId }}</text>
            <text class="meta-item" v-if="item.requireAuth">需授权</text>
          </view>
        </view>
        <view class="config-actions">
          <view class="action-btn edit" @click="openEdit(item)">编辑</view>
          <view class="action-btn delete" @click="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="!loading && list.length === 0" class="empty-state">
      <text class="empty-text">暂无三方配置</text>
      <button class="btn-primary" @click="openAdd">立即添加</button>
    </view>

    <!-- 新增/编辑弹窗 -->
    <view class="modal-mask" v-if="showModal" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isEdit ? '编辑配置' : '新增配置' }}</text>
          <text class="modal-close" @click="closeModal">✕</text>
        </view>
        <scroll-view scroll-y class="modal-body" :style="{ maxHeight: '70vh' }">
          <view class="form-item">
            <text class="form-label">平台 <text class="required">*</text></text>
            <picker mode="selector" :range="platformLabels" @change="onPlatformChange" :value="platformIndex">
              <view class="form-picker">{{ platformLabels[platformIndex] }} ▼</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">应用类型 <text class="required">*</text></text>
            <picker mode="selector" :range="appTypeLabels" @change="onAppTypeChange" :value="appTypeIndex">
              <view class="form-picker">{{ appTypeLabels[appTypeIndex] }} ▼</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">AppID <text class="required">*</text></text>
            <input type="text" v-model="form.appId" placeholder="请输入 AppID" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">AppSecret <text class="required">*</text></text>
            <input type="text" v-model="form.appSecret" placeholder="请输入 AppSecret" class="form-input" />
          </view>
          <view class="form-item switch-item">
            <text class="form-label">启用</text>
            <switch :checked="form.enabled" @change="form.enabled = $event.detail.value" color="#07c160" />
          </view>
          <view class="form-item switch-item">
            <text class="form-label">要求用户授权（获取头像昵称）</text>
            <switch :checked="form.requireAuth" @change="form.requireAuth = $event.detail.value" color="#07c160" />
          </view>
        </scroll-view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeModal">取消</button>
          <button class="btn-submit" @click="handleSubmit" :loading="submitting">{{ isEdit ? '保存' : '创建' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getThirdPartyConfigs, createThirdPartyConfig, updateThirdPartyConfig, deleteThirdPartyConfig } from '../../src/api/config.js'
import PageHeader from '../../src/components/PageHeader.vue'

const list = ref([])
const loading = ref(false)
const showModal = ref(false)
const isEdit = ref(false)
const editId = ref('')
const submitting = ref(false)

const platforms = ['wechat', 'alipay', 'douyin']
const platformLabels = ['微信', '支付宝', '抖音']
const platformIndex = ref(0)

const appTypes = ['official_account', 'mini_program', 'open_platform', 'default']
const appTypeLabels = ['公众号', '小程序', '开放平台', '默认']
const appTypeIndex = ref(1)

const form = ref({
  platform: 'wechat',
  appType: 'mini_program',
  appId: '',
  appSecret: '',
  enabled: true,
  requireAuth: false,
})

function getPlatformLabel(p) { return { wechat: '微信', alipay: '支付宝', douyin: '抖音' }[p] || p }
function getAppTypeLabel(t) { return { official_account: '公众号', mini_program: '小程序', open_platform: '开放平台', default: '默认' }[t] || t }

function onPlatformChange(e) {
  platformIndex.value = e.detail.value
  form.value.platform = platforms[platformIndex.value]
}
function onAppTypeChange(e) {
  appTypeIndex.value = e.detail.value
  form.value.appType = appTypes[appTypeIndex.value]
}

async function loadData() {
  loading.value = true
  try {
    const res = await getThirdPartyConfigs()
    list.value = res || []
  } catch { list.value = [] }
  finally { loading.value = false }
}

function openAdd() {
  isEdit.value = false; editId.value = ''
  form.value = { platform: 'wechat', appType: 'mini_program', appId: '', appSecret: '', enabled: true, requireAuth: false }
  platformIndex.value = 0; appTypeIndex.value = 1
  showModal.value = true
}

function openEdit(item) {
  isEdit.value = true; editId.value = item.documentId || item.id
  form.value = {
    platform: item.platform,
    appType: item.appType,
    appId: item.appId || '',
    appSecret: item.appSecret || '',
    enabled: item.enabled !== false,
    requireAuth: item.requireAuth === true,
  }
  platformIndex.value = platforms.indexOf(item.platform)
  appTypeIndex.value = appTypes.indexOf(item.appType)
  showModal.value = true
}

function closeModal() { showModal.value = false }

async function handleSubmit() {
  if (!form.value.appId || !form.value.appSecret) {
    return uni.showToast({ title: '请填写 AppID 和 AppSecret', icon: 'none' })
  }
  submitting.value = true
  try {
    const data = {
      platform: form.value.platform,
      appType: form.value.appType,
      appId: form.value.appId,
      appSecret: form.value.appSecret,
      enabled: form.value.enabled,
      requireAuth: form.value.requireAuth,
    }
    if (isEdit.value) {
      await updateThirdPartyConfig(editId.value, data)
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      await createThirdPartyConfig(data)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    closeModal(); loadData()
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally { submitting.value = false }
}

async function handleDelete(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除 ${getPlatformLabel(item.platform)} - ${getAppTypeLabel(item.appType)} 配置吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteThirdPartyConfig(item.documentId || item.id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData()
        } catch { uni.showToast({ title: '删除失败', icon: 'none' }) }
      }
    }
  })
}

onMounted(() => loadData())
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: #ff0000; color: #fff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; }

.config-list { display: flex; flex-direction: column; gap: 16rpx; }
.config-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; gap: 20rpx; }
.config-info { flex: 1; min-width: 0; }
.config-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.config-name { font-size: 30rpx; font-weight: bold; color: #333; }
.config-meta { display: flex; gap: 12rpx; flex-wrap: wrap; }
.meta-item { font-size: 22rpx; color: #999; background: #f5f5f5; padding: 2rpx 10rpx; border-radius: 6rpx; }

.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-badge.active { background: #e8f5e9; color: #07c160; }
.status-badge.inactive { background: #ffebee; color: #ff4d4f; }

.config-actions { display: flex; gap: 12rpx; flex-shrink: 0; }
.action-btn { padding: 12rpx 20rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }

.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal-content { width: 90%; max-height: 85vh; background: #fff; border-radius: 16rpx; overflow: hidden; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 30rpx; border-bottom: 1rpx solid #f0f0f0; }
.modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.modal-close { font-size: 36rpx; color: #999; padding: 10rpx; }
.modal-body { padding: 30rpx; flex: 1; overflow-y: auto; }

.form-item { margin-bottom: 24rpx; }
.form-label { font-size: 28rpx; color: #333; margin-bottom: 10rpx; display: block; }
.required { color: #ff4d4f; }
.form-input { width: 100%; height: 76rpx; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box; }
.form-picker { width: 100%; height: 76rpx; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box; line-height: 76rpx; color: #333; }
.switch-item { display: flex; justify-content: space-between; align-items: center; }
.switch-item .form-label { margin-bottom: 0; }

.modal-footer { display: flex; gap: 20rpx; padding: 20rpx 30rpx; border-top: 1rpx solid #f0f0f0; }
.btn-cancel { flex: 1; height: 88rpx; line-height: 88rpx; text-align: center; background: #f5f5f5; color: #666; font-size: 30rpx; border-radius: 8rpx; border: none; }
.btn-submit { flex: 1; height: 88rpx; line-height: 88rpx; text-align: center; background: #07c160; color: #fff; font-size: 30rpx; border-radius: 8rpx; border: none; }
</style>
