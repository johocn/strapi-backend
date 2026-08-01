<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑应用' : '新增应用'">
      <button class="btn-secondary" @click="goBack">取消</button>
      <button class="btn-primary" @click="handleSubmit" :loading="submitting" :disabled="submitting">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="help-banner">
        <text class="help-icon">ℹ️</text>
        <view class="help-content">
          <text class="help-text">应用配置示例（参考文档第 4 节）：</text>
          <text class="help-code">app_code: admin / vendure / website</text>
          <text class="help-code">redirect_uris: http://h.joho.cn/#/pages/login/callback</text>
          <text class="help-code">allowed_grant_types: authorization_code, refresh_token</text>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">基本信息</view>

        <view class="form-item">
          <text class="form-label">应用编码 (app_code)<text class="required-mark">*</text></text>
          <input v-model="form.app_code" class="form-input" placeholder="如：admin / vendure / website" :disabled="isEdit" />
          <text class="form-hint">应用唯一编码，编辑时不可修改</text>
        </view>

        <view class="form-item">
          <text class="form-label">应用名称 (app_name)<text class="required-mark">*</text></text>
          <input v-model="form.app_name" class="form-input" placeholder="如：后台管理" />
        </view>

        <view class="form-item">
          <text class="form-label">应用密钥 (app_secret)</text>
          <input v-model="form.app_secret" class="form-input" type="password" :placeholder="isEdit ? '留空则不修改' : '留空使用 SSO_DEFAULT_APP_SECRET 环境变量'" />
          <text class="form-hint">{{ isEdit ? '编辑时留空表示不修改原密钥' : '新建时留空将使用环境变量 SSO_DEFAULT_APP_SECRET' }}</text>
        </view>

        <view class="form-item switch-item">
          <view>
            <text class="form-label">启用状态</text>
            <text class="form-hint">禁用后该应用无法进行 OAuth 授权</text>
          </view>
          <switch :checked="form.is_active" @change="form.is_active = $event.detail.value" />
        </view>

        <view class="form-item">
          <text class="form-label">描述</text>
          <textarea v-model="form.description" class="form-textarea" placeholder="应用用途说明（选填）" />
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">OAuth 配置</view>

        <view class="form-item">
          <text class="form-label">回调地址 (redirect_uris)<text class="required-mark">*</text></text>
          <text class="form-hint">一行一个 URL，应用方接收 OAuth 授权码的地址</text>
          <textarea v-model="form.redirect_uris" class="form-textarea" placeholder="http://h.joho.cn/#/pages/login/callback" />
        </view>

        <view class="form-item">
          <text class="form-label">授权类型 (allowed_grant_types)<text class="required-mark">*</text></text>
          <text class="form-hint">多选，至少选 1 项</text>
          <view class="checkbox-list">
            <view
              class="checkbox-item"
              v-for="opt in grantTypeOptions"
              :key="opt.value"
              @click="toggleGrantType(opt.value)"
            >
              <view class="checkbox" :class="{ checked: form.allowed_grant_types.includes(opt.value) }">
                <text v-if="form.allowed_grant_types.includes(opt.value)" class="checkbox-tick">✓</text>
              </view>
              <view class="checkbox-text">
                <text class="checkbox-label">{{ opt.value }}</text>
                <text class="checkbox-desc">{{ opt.desc }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createSsoApp, updateSsoApp, getSsoAppDetail } from '../../../api/sso.js'
import PageHeader from '../../../components/PageHeader.vue'

const grantTypeOptions = [
  { value: 'authorization_code', desc: '标准 OAuth 授权码流程' },
  { value: 'refresh_token', desc: '使用 refresh_token 刷新 access_token' },
]

const appId = ref('')
const isEdit = computed(() => !!appId.value)
const submitting = ref(false)

const form = ref({
  app_code: '',
  app_name: '',
  app_secret: '',
  redirect_uris: '',
  allowed_grant_types: ['authorization_code', 'refresh_token'],
  is_active: true,
  description: '',
})

function toggleGrantType(value) {
  const idx = form.value.allowed_grant_types.indexOf(value)
  if (idx >= 0) {
    if (form.value.allowed_grant_types.length > 1) {
      form.value.allowed_grant_types.splice(idx, 1)
    } else {
      uni.showToast({ title: '至少保留一个授权类型', icon: 'none' })
    }
  } else {
    form.value.allowed_grant_types.push(value)
  }
}

function goBack() {
  uni.navigateBack()
}

async function loadDetail() {
  if (!appId.value) return
  try {
    const item = await getSsoAppDetail(appId.value)
    if (!item) return
    form.value.app_code = item.app_code || ''
    form.value.app_name = item.app_name || ''
    form.value.app_secret = ''
    form.value.redirect_uris = Array.isArray(item.redirect_uris) ? item.redirect_uris.join('\n') : ''
    form.value.allowed_grant_types = Array.isArray(item.allowed_grant_types) ? item.allowed_grant_types.slice() : ['authorization_code', 'refresh_token']
    form.value.is_active = item.is_active ?? true
    form.value.description = item.description || ''
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function handleSubmit() {
  if (submitting.value) return
  if (!form.value.app_code) {
    uni.showToast({ title: '请填写应用编码', icon: 'none' })
    return
  }
  if (!form.value.app_name) {
    uni.showToast({ title: '请填写应用名称', icon: 'none' })
    return
  }
  if (!isEdit.value && !form.value.app_secret && !process.env.SSO_DEFAULT_APP_SECRET) {
    uni.showToast({ title: '请填写应用密钥', icon: 'none' })
    return
  }
  const uriLines = (form.value.redirect_uris || '').split('\n').map(s => s.trim()).filter(Boolean)
  if (uriLines.length === 0) {
    uni.showToast({ title: '请填写至少一个回调地址', icon: 'none' })
    return
  }
  if (form.value.allowed_grant_types.length === 0) {
    uni.showToast({ title: '请选择授权类型', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const payload = {
      app_name: form.value.app_name,
      redirect_uris: uriLines,
      allowed_grant_types: form.value.allowed_grant_types.slice(),
      is_active: form.value.is_active,
      description: form.value.description,
    }
    if (!isEdit.value) {
      payload.app_code = form.value.app_code
    }
    if (form.value.app_secret) {
      payload.app_secret = form.value.app_secret
    }

    if (isEdit.value) {
      await updateSsoApp(appId.value, payload)
    } else {
      await createSsoApp(payload)
    }
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onLoad((options) => {
  if (options && options.id) {
    appId.value = options.id
    loadDetail()
  }
})
</script>

<style scoped>
page {
  background: #f5f5f5;
}
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.form-scroll {
  flex: 1;
  padding: 20rpx;
  box-sizing: border-box;
}

.btn-primary {
  background: #ff0000;
  color: #ffffff;
  padding: 16rpx 32rpx;
  font-size: 30rpx;
  border-radius: 8rpx;
  border: none;
  line-height: 1.2;
  margin-left: 12rpx;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
  padding: 16rpx 32rpx;
  font-size: 30rpx;
  border-radius: 8rpx;
  border: none;
  line-height: 1.2;
}

.help-banner {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 20rpx;
  background: #fff8e6;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  border-left: 6rpx solid #faad14;
}

.help-icon {
  font-size: 28rpx;
  flex-shrink: 0;
}

.help-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.help-text {
  font-size: 26rpx;
  color: #666;
  font-weight: bold;
}

.help-code {
  font-size: 24rpx;
  color: #333;
  font-family: monospace;
}

.form-section {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
  padding-left: 8rpx;
  border-left: 6rpx solid #ff0000;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.required-mark {
  color: #ff4d4f;
  margin-left: 4rpx;
}

.form-input {
  width: 100%;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-input[disabled] {
  color: #999;
  background: #f0f0f0;
}

.form-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-hint {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 6rpx;
}

.switch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 12rpx;
}

.checkbox-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 16rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #ccc;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.checkbox.checked {
  background: #ff0000;
  border-color: #ff0000;
}

.checkbox-tick {
  font-size: 24rpx;
  color: #fff;
  line-height: 1;
}

.checkbox-text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.checkbox-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.checkbox-desc {
  font-size: 24rpx;
  color: #999;
}
</style>
