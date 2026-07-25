<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑 OAuth 配置' : '新增 OAuth 配置'">
      <button class="btn-secondary" @click="goBack">取消</button>
      <button class="btn-primary" @click="handleSubmit" :loading="submitting" :disabled="submitting">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <!-- 基本信息 -->
      <view class="form-section">
        <view class="section-title">基本信息</view>

        <view class="form-item">
          <text class="form-label">配置名称<text class="required-mark">*</text></text>
          <input v-model="form.name" class="form-input" placeholder="如：微信公众号-主站" />
        </view>

        <view class="form-item">
          <text class="form-label">平台<text class="required-mark">*</text></text>
          <picker mode="selector" :range="platformOptions" range-key="label" @change="onPlatformChange" :value="platformIndex" :disabled="isEdit">
            <view class="form-picker">{{ platformOptions[platformIndex] ? platformOptions[platformIndex].label : '请选择' }} ▼</view>
          </picker>
        </view>

        <view class="form-item" v-if="currentAppTypes.length > 1">
          <text class="form-label">应用类型<text class="required-mark">*</text></text>
          <picker mode="selector" :range="currentAppTypes" range-key="label" @change="onAppTypeChange" :value="appTypeIndex" :disabled="isEdit">
            <view class="form-picker">{{ currentAppTypes[appTypeIndex] ? currentAppTypes[appTypeIndex].label : '请选择' }} ▼</view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">AppID<text class="required-mark">*</text></text>
          <input v-model="form.app_id" class="form-input" :placeholder="currentHints.appId || '请输入 AppID'" />
          <text class="form-hint">{{ currentHints.appId || '应用唯一标识' }}</text>
          <view class="provider-portal" v-if="currentProvider">
            <text class="portal-label">申请入口：</text>
            <text class="portal-link" @click="openPortal(currentProvider.portalUrl)">{{ currentProvider.portalUrl }}</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">AppSecret<text class="required-mark">*</text></text>
          <input v-model="form.app_secret" class="form-input" type="password" :placeholder="currentHints.appSecret || '请输入 AppSecret'" />
          <text class="form-hint">{{ currentHints.appSecret || '应用密钥' }}</text>
        </view>

        <view class="form-item switch-item">
          <view>
            <text class="form-label">是否启用</text>
            <text class="form-hint">是否启用此 OAuth 配置</text>
          </view>
          <switch :checked="form.is_enabled" @change="form.is_enabled = $event.detail.value" />
        </view>

        <view class="form-item">
          <text class="form-label">描述</text>
          <textarea v-model="form.description" class="form-textarea" placeholder="请输入描述（选填）" />
        </view>
      </view>

      <!-- 微信专属配置（动态渲染） -->
      <view class="form-section" v-if="showWechatFields">
        <view class="section-title">微信专属配置</view>

        <template v-if="form.app_type === 'official_account'">
          <view class="form-item">
            <text class="form-label">Token</text>
            <text class="form-hint">消息校验 Token，用于验证消息来源，自定义设置</text>
            <input v-model="wechat.token" class="form-input" placeholder="自定义设置 Token" />
          </view>

          <view class="form-item">
            <text class="form-label">EncodingAESKey</text>
            <text class="form-hint">消息加解密密钥，43 位字符，可随机生成</text>
            <input v-model="wechat.encodingAESKey" class="form-input" placeholder="43 位字符，可随机生成" />
          </view>

          <view class="form-item">
            <text class="form-label">OAuth Scope<text class="required-mark">*</text></text>
            <text class="form-hint">多选，至少选 1 项</text>
            <view class="checkbox-list">
              <view
                class="checkbox-item"
                v-for="opt in oauthScopeOptions"
                :key="opt.value"
                @click="toggleScope(opt.value)"
              >
                <view class="checkbox" :class="{ checked: wechat.oauthScopes.includes(opt.value) }">
                  <text v-if="wechat.oauthScopes.includes(opt.value)" class="checkbox-tick">✓</text>
                </view>
                <view class="checkbox-text">
                  <text class="checkbox-label">{{ opt.value }}</text>
                  <text class="checkbox-desc">{{ opt.desc }}</text>
                </view>
              </view>
            </view>
          </view>

          <view class="form-item switch-item">
            <view>
              <text class="form-label">授权升级（authUpgrade）</text>
              <text class="form-hint">开启后：静默授权获取 openid，需要用户信息时自动升级为 snsapi_userinfo</text>
            </view>
            <switch :checked="wechat.authUpgrade" @change="wechat.authUpgrade = $event.detail.value" />
          </view>
        </template>

        <template v-else>
          <view class="info-banner">
            <text class="info-text">当前应用类型（{{ currentAppTypeLabel }}）暂无额外专属字段，仅需配置基础信息即可。</text>
          </view>
        </template>
      </view>

      <!-- 回调配置说明（只读） -->
      <view class="form-section">
        <view class="section-title">回调配置</view>

        <view class="info-banner">
          <text class="info-icon">ℹ️</text>
          <view class="info-content">
            <text class="info-text">SSO 回调地址由系统自动生成，无需手动配置：</text>
            <text class="info-code">/api/zhao-sso/v1/auth/wechat/callback</text>
            <text class="info-text">应用方回调地址请在【应用管理】中配置 sso-app 的 redirect_uris。</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">Scope</text>
          <input v-model="form.scope" class="form-input" placeholder="如：snsapi_userinfo / snsapi_login" />
          <text class="form-hint">非微信平台可填写对应 scope，微信请在上方 OAuth Scope 多选</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ssoOauthConfigApi } from '../../../src/api/sso.js'
import PageHeader from '../../../src/components/PageHeader.vue'
import { SSO_PROVIDERS, SSO_APP_TYPES, getProvider } from '../../../src/constants/sso-providers.js'

// 平台选项（从共享模块派生）
const platformOptions = SSO_PROVIDERS.map(p => ({ value: p.value, label: p.label }))

// 各平台支持的应用类型（保留原有逻辑：wechat 支持全部，其他平台仅 default）
const APP_TYPE_OPTIONS = {
  wechat: SSO_APP_TYPES,
  alipay: [{ value: 'default', label: '默认' }],
  douyin: [{ value: 'default', label: '默认' }],
  google: [{ value: 'default', label: '默认' }],
  github: [{ value: 'default', label: '默认' }],
}

// 平台/应用类型对应的 AppID/AppSecret 提示
// 保留原有特定文本，未覆盖的组合从共享模块 guide 字段派生
const PLATFORM_HINTS = {
  'wechat:official_account': {
    appId: '微信公众号 AppID（开发者ID），登录 mp.weixin.qq.com 获取',
    appSecret: '微信公众号 AppSecret（开发者密码），在公众号后台「开发→基本配置」获取',
  },
  'wechat:open_platform': {
    appId: '微信开放平台 AppID，登录 open.weixin.qq.com 获取',
    appSecret: '微信开放平台 AppSecret，在开放平台「管理中心→开发配置」获取',
  },
  'wechat:mini_program': {
    appId: '微信小程序 AppID，登录 mp.weixin.qq.com 获取',
    appSecret: '微信小程序 AppSecret，在小程序后台「开发→开发管理→开发设置」获取',
  },
  'wechat:app': {
    appId: '微信开放平台移动应用 AppID，登录 open.weixin.qq.com 获取',
    appSecret: '微信开放平台移动应用 AppSecret，在应用详情获取',
  },
  'wechat:default': {
    appId: '微信应用 AppID',
    appSecret: '微信应用 AppSecret',
  },
  'alipay:default': {
    appId: '支付宝应用 AppID，在 open.alipay.com「开发者中心」获取',
    appSecret: '支付宝应用私钥（RSA2），使用支付宝密钥工具生成',
  },
  'douyin:default': {
    appId: '抖音应用 AppKey，在 open.douyin.com「开发者后台」获取',
    appSecret: '抖音应用 AppSecret，在开发者后台「应用详情」获取',
  },
  'google:default': {
    appId: 'Google OAuth Client ID，在 Google Cloud Console「凭据」获取',
    appSecret: 'Google OAuth Client Secret，在 Google Cloud Console「凭据」获取',
  },
  'github:default': {
    appId: 'GitHub OAuth App Client ID，在 GitHub「Settings→Developer settings」获取',
    appSecret: 'GitHub OAuth App Client Secret，在应用详情获取',
  },
}
SSO_PROVIDERS.forEach(p => {
  SSO_APP_TYPES.forEach(t => {
    const key = `${p.value}:${t.value}`
    if (!PLATFORM_HINTS[key]) {
      PLATFORM_HINTS[key] = { appId: p.guide.appId, appSecret: p.guide.appSecret }
    }
  })
})

// OAuth Scope 选项（微信公众号）
const oauthScopeOptions = [
  { value: 'snsapi_userinfo', desc: '完善资料登录，授权获取昵称头像' },
  { value: 'snsapi_base', desc: '快速登录，静默授权' },
]

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)
const submitting = ref(false)

const platformIndex = ref(0)
const appTypeIndex = ref(0)

const form = ref({
  name: '',
  provider: '',
  app_type: '',
  app_id: '',
  app_secret: '',
  is_enabled: true,
  description: '',
  scope: '',
})

// 微信专属字段（存入 extra_config）
const wechat = ref({
  token: '',
  encodingAESKey: '',
  oauthScopes: [],
  authUpgrade: false,
})

const currentAppTypes = computed(() => {
  const p = platformOptions[platformIndex.value] ? platformOptions[platformIndex.value].value : ''
  return APP_TYPE_OPTIONS[p] || [{ value: 'default', label: '默认' }]
})

const currentAppTypeLabel = computed(() => {
  const opt = currentAppTypes.value[appTypeIndex.value]
  return opt ? opt.label : ''
})

const currentHints = computed(() => {
  const p = platformOptions[platformIndex.value] ? platformOptions[platformIndex.value].value : ''
  const a = currentAppTypes.value[appTypeIndex.value] ? currentAppTypes.value[appTypeIndex.value].value : 'default'
  return PLATFORM_HINTS[`${p}:${a}`] || {}
})

const showWechatFields = computed(() => form.value.provider === 'wechat')

// 当前 provider 元数据（用于展示申请入口等引导）
const currentProvider = computed(() => {
  const p = platformOptions[platformIndex.value] ? platformOptions[platformIndex.value].value : ''
  return getProvider(p)
})

function openPortal(url) {
  // #ifdef H5
  window.open(url, '_blank')
  // #endif
  // #ifndef H5
  uni.setClipboardData({
    data: url,
    success: () => uni.showToast({ title: '链接已复制', icon: 'none' })
  })
  // #endif
}

function onPlatformChange(e) {
  platformIndex.value = e.detail.value
  appTypeIndex.value = 0
  form.value.provider = platformOptions[platformIndex.value].value
  form.value.app_type = currentAppTypes.value[0] ? currentAppTypes.value[0].value : 'default'
  // 切换平台时重置微信专属字段
  resetWechatFields()
}

function onAppTypeChange(e) {
  appTypeIndex.value = e.detail.value
  form.value.app_type = currentAppTypes.value[appTypeIndex.value] ? currentAppTypes.value[appTypeIndex.value].value : 'default'
  resetWechatFields()
}

function resetWechatFields() {
  wechat.value.token = ''
  wechat.value.encodingAESKey = ''
  wechat.value.oauthScopes = []
  wechat.value.authUpgrade = false
}

function toggleScope(value) {
  const idx = wechat.value.oauthScopes.indexOf(value)
  if (idx >= 0) {
    wechat.value.oauthScopes.splice(idx, 1)
  } else {
    wechat.value.oauthScopes.push(value)
  }
}

function goBack() {
  uni.navigateBack()
}

function findPlatformIndex(value) {
  return platformOptions.findIndex(p => p.value === value)
}

function findAppTypeIndex(platformValue, appTypeValue) {
  const opts = APP_TYPE_OPTIONS[platformValue] || []
  const idx = opts.findIndex(a => a.value === appTypeValue)
  return idx >= 0 ? idx : 0
}

function fillWechatFromExtra(ec) {
  wechat.value.token = ec.token || ''
  wechat.value.encodingAESKey = ec.encodingAESKey || ''
  wechat.value.oauthScopes = Array.isArray(ec.oauthScopes) ? ec.oauthScopes.slice() : []
  wechat.value.authUpgrade = ec.authUpgrade ?? false
}

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await ssoOauthConfigApi.detail(documentId.value)
    if (!item) return
    form.value.name = item.name || ''
    form.value.provider = item.provider || ''
    form.value.app_type = item.app_type || 'default'
    form.value.app_id = item.app_id || ''
    // 安全考虑：编辑时 AppSecret 不回填
    form.value.app_secret = ''
    form.value.is_enabled = item.is_enabled ?? true
    form.value.description = item.description || ''
    form.value.scope = item.scope || ''
    // 设置 picker 索引
    const pi = findPlatformIndex(form.value.provider)
    if (pi >= 0) {
      platformIndex.value = pi
      appTypeIndex.value = findAppTypeIndex(form.value.provider, form.value.app_type)
    }
    // 加载微信专属字段（从 extra_config）
    let ec = item.extra_config || {}
    if (typeof ec === 'string') {
      try {
        ec = JSON.parse(ec)
      } catch (e) {
        ec = {}
      }
    }
    fillWechatFromExtra(ec)
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function handleSubmit() {
  if (submitting.value) return
  if (!form.value.name) {
    uni.showToast({ title: '请填写配置名称', icon: 'none' })
    return
  }
  if (!form.value.provider) {
    uni.showToast({ title: '请选择平台', icon: 'none' })
    return
  }
  if (!form.value.app_id) {
    uni.showToast({ title: '请填写 AppID', icon: 'none' })
    return
  }
  if (!isEdit.value && !form.value.app_secret) {
    uni.showToast({ title: '请填写 AppSecret', icon: 'none' })
    return
  }
  // 微信公众号：OAuth Scope 至少选 1 项
  if (form.value.provider === 'wechat' && form.value.app_type === 'official_account') {
    if (wechat.value.oauthScopes.length === 0) {
      uni.showToast({ title: '请至少选择一个 OAuth Scope', icon: 'none' })
      return
    }
  }

  submitting.value = true
  try {
    const payload = {
      name: form.value.name,
      provider: form.value.provider,
      app_type: form.value.app_type,
      app_id: form.value.app_id,
      is_enabled: form.value.is_enabled,
      description: form.value.description,
      scope: form.value.scope,
    }
    // 编辑模式且未填写新密钥则不传 AppSecret
    if (!isEdit.value || form.value.app_secret) {
      payload.app_secret = form.value.app_secret
    }
    // 微信专属字段打包到 extra_config
    if (form.value.provider === 'wechat' && form.value.app_type === 'official_account') {
      payload.extra_config = {
        token: wechat.value.token,
        encodingAESKey: wechat.value.encodingAESKey,
        oauthScopes: wechat.value.oauthScopes.slice(),
        authUpgrade: wechat.value.authUpgrade,
      }
    } else {
      payload.extra_config = {}
    }

    if (isEdit.value) {
      await ssoOauthConfigApi.update(documentId.value, payload)
    } else {
      await ssoOauthConfigApi.create(payload)
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
  if (options && options.documentId) {
    documentId.value = options.documentId
    loadDetail()
  } else {
    // 新建模式默认值
    form.value.provider = platformOptions[0].value
    form.value.app_type = APP_TYPE_OPTIONS[platformOptions[0].value][0] ? APP_TYPE_OPTIONS[platformOptions[0].value][0].value : 'default'
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

.form-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-picker {
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

.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 20rpx;
  background: #f5f7ff;
  border-radius: 8rpx;
  border-left: 6rpx solid #667eea;
  margin-bottom: 24rpx;
}

.info-icon {
  font-size: 28rpx;
  flex-shrink: 0;
}

.info-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.info-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
}

.info-code {
  font-size: 24rpx;
  color: #333;
  font-family: monospace;
  background: #fff;
  padding: 8rpx 12rpx;
  border-radius: 4rpx;
  word-break: break-all;
}

.provider-portal {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
  padding: 8rpx 12rpx;
  background: #f5f5f5;
  border-radius: 6rpx;
}

.portal-label {
  font-size: 22rpx;
  color: #999;
}

.portal-link {
  font-size: 22rpx;
  color: #1677ff;
  text-decoration: underline;
}
</style>
