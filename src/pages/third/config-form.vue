<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑配置' : '新增配置'" />

    <scroll-view scroll-y class="form-body">
      <!-- 基本信息 -->
      <view class="form-section-title">基本信息</view>
      <view class="form-card">
        <view class="form-item">
          <text class="form-label">配置名称</text>
          <input v-model="form.name" class="form-input" placeholder="如：微信公众号-主站" />
          <text class="form-hint">便于识别的配置名称，可自定义</text>
        </view>
        <view class="form-item">
          <text class="form-label">平台</text>
          <picker mode="selector" :range="platformLabels" @change="onPlatformChange" :value="platformIndex" :disabled="isEdit">
            <view class="form-picker">{{ platformLabels[platformIndex] || '请选择' }} ▼</view>
          </picker>
        </view>
        <view class="form-item" v-if="currentAppTypes.length > 1">
          <text class="form-label">应用类型</text>
          <picker mode="selector" :range="appTypeLabels" @change="onAppTypeChange" :value="appTypeIndex" :disabled="isEdit">
            <view class="form-picker">{{ appTypeLabels[appTypeIndex] || '请选择' }} ▼</view>
          </picker>
        </view>
      </view>

      <!-- 通用配置 -->
      <view class="form-section-title">通用配置</view>
      <view class="form-card">
        <view class="form-item switch-item">
          <view>
            <text class="form-label">启用</text>
            <text class="form-hint">是否启用此平台配置</text>
          </view>
          <switch :checked="form.enabled" @change="form.enabled = $event.detail.value" color="#07c160" />
        </view>
        <view class="form-item switch-item">
          <view>
            <text class="form-label">需要授权</text>
            <text class="form-hint">用户登录时是否需要弹窗授权</text>
          </view>
          <switch :checked="form.requireAuth" @change="form.requireAuth = $event.detail.value" color="#07c160" />
        </view>
      </view>

      <!-- 凭证配置（固定字段，hint 按平台变化） -->
      <view class="form-section-title">凭证配置</view>
      <view class="form-card">
        <view class="form-item">
          <text class="form-label">AppID<text class="required-mark">*</text></text>
          <input v-model="form.appId" class="form-input" :placeholder="currentHints.appId || '请输入 AppID'" />
          <text class="form-hint">{{ currentHints.appId || '应用唯一标识' }}</text>
        </view>
        <view class="form-item">
          <text class="form-label">AppSecret<text class="required-mark">*</text></text>
          <input v-model="form.appSecret" class="form-input" type="password" :placeholder="currentHints.appSecret || '请输入 AppSecret'" />
          <text class="form-hint">{{ currentHints.appSecret || '应用密钥' }}</text>
        </view>
      </view>

      <!-- 平台专属配置（动态渲染） -->
      <view v-if="currentFields.length > 0">
        <view class="form-section-title">平台配置</view>
        <view class="form-card">
          <view v-for="field in currentFields" :key="field.key" class="form-item">
            <template v-if="field.type === 'picker'">
              <text class="form-label">{{ field.label }}<text v-if="field.required" class="required-mark">*</text></text>
              <picker mode="selector" :range="field.options" range-key="label" @change="onFieldPickerChange($event, field)" :value="getFieldPickerIndex(field)">
                <view class="form-picker">{{ getFieldPickerLabel(field) }} ▼</view>
              </picker>
              <text class="form-hint">{{ field.hint }}</text>
            </template>
            <template v-else-if="field.type === 'switch'">
              <view class="form-item switch-item">
                <view>
                  <text class="form-label">{{ field.label }}</text>
                  <text class="form-hint">{{ field.hint }}</text>
                </view>
                <switch :checked="form[field.key]" @change="form[field.key] = $event.detail.value" color="#07c160" />
              </view>
            </template>
            <template v-else>
              <text class="form-label">{{ field.label }}<text v-if="field.required" class="required-mark">*</text></text>
              <input
                v-model="form[field.key]"
                class="form-input"
                :type="field.inputType === 'password' ? 'password' : 'text'"
                :placeholder="field.hint"
              />
              <text class="form-hint">{{ field.hint }}</text>
            </template>
          </view>
        </view>
      </view>

      <view style="height: 120rpx;"></view>
    </scroll-view>

    <view class="bottom-bar">
      <button class="btn-save" @click="handleSubmit" :loading="submitting" :disabled="submitting">{{ isEdit ? '保存配置' : '创建配置' }}</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getThirdPartyConfig, createThirdPartyConfig, updateThirdPartyConfig } from '../../api/config.js'
import PageHeader from '../../components/PageHeader.vue'

// 平台凭证 hint（appId/appSecret 是 schema 字段，不放入 PLATFORM_FIELDS）
const PLATFORM_HINTS = {
  'wechat:official_account': {
    appId: '微信公众号 AppID（开发者ID），登录 mp.weixin.qq.com 获取',
    appSecret: '微信公众号 AppSecret（开发者密码），在公众号后台「开发→基本配置」获取',
  },
  'wechat:mini_program': {
    appId: '微信小程序 AppID，登录 mp.weixin.qq.com 获取',
    appSecret: '微信小程序 AppSecret，在小程序后台「开发→开发管理→开发设置」获取',
  },
  'wechat:open_platform': {
    appId: '微信开放平台 AppID，登录 open.weixin.qq.com 获取',
    appSecret: '微信开放平台 AppSecret，在开放平台「管理中心→开发配置」获取',
  },
  'alipay:default': {
    appId: '支付宝应用 AppID，在 open.alipay.com 「开发者中心」获取',
    appSecret: '支付宝应用私钥（RSA2），使用支付宝密钥工具生成',
  },
  'douyin:default': {
    appId: '抖音应用 AppKey，在 open.douyin.com 「开发者后台」获取',
    appSecret: '抖音应用 AppSecret，在开发者后台「应用详情」获取',
  },
}

const PLATFORM_FIELDS = {
  'wechat:official_account': [
    { key: 'token', label: 'Token', hint: '服务器配置 Token，用于验证消息来源，自定义设置' },
    { key: 'encodingAesKey', label: 'EncodingAESKey', hint: '服务器配置消息加解密密钥，43位字符，可随机生成' },
    { key: 'oauthScope', label: '授权作用域', type: 'picker', hint: 'snsapi_base：静默授权仅获openid；snsapi_userinfo：弹窗授权获取昵称头像', default: 'snsapi_base',
      options: [
        { value: 'snsapi_base', label: 'snsapi_base（静默授权）' },
        { value: 'snsapi_userinfo', label: 'snsapi_userinfo（弹窗授权）' },
      ]
    },
    { key: 'authUpgrade', label: '授权升级', type: 'switch', hint: '开启后：静默授权获取openid，C端需要用户信息时自动升级为snsapi_userinfo', default: false,
      showWhen: (form) => form.oauthScope === 'snsapi_base',
    },
  ],
  'wechat:mini_program': [
    { key: 'mchId', label: '商户号', hint: '微信支付商户号（如需支付功能），在 pay.weixin.qq.com 获取' },
    { key: 'mchKey', label: '商户密钥', hint: '微信支付商户API密钥（如需支付功能），在商户平台「账户中心→API安全」设置', inputType: 'password' },
    { key: 'apiVersion', label: '支付API版本', hint: '微信支付API版本：v2 或 v3，推荐 v3', default: 'v3' },
  ],
  'wechat:open_platform': [
    { key: 'componentAccessToken', label: 'ComponentAccessToken', hint: '第三方平台 component_access_token，用于代公众号/小程序调用接口' },
    { key: 'preAuthCode', label: 'PreAuthCode', hint: '第三方平台预授权码，用于代公众号/小程序授权' },
  ],
  'alipay:default': [
    { key: 'alipayPublicKey', label: '支付宝公钥', hint: '支付宝公钥（用于验签），在应用详情「接口加签方式」中获取' },
    { key: 'signType', label: '签名算法', hint: '签名算法类型，推荐 RSA2', default: 'RSA2' },
  ],
  'douyin:default': [
    { key: 'paymentMerchantId', label: '支付商户号', hint: '抖音支付商户号（如需支付功能），在抖音支付商户后台获取' },
    { key: 'paymentSalt', label: '支付Salt', hint: '抖音支付 Salt（如需支付功能），在商户后台「开发配置」获取', inputType: 'password' },
    { key: 'paymentToken', label: '支付Token', hint: '抖音支付 Token（如需支付功能），用于支付回调验证', inputType: 'password' },
  ],
}

const platformOptions = [
  { value: 'wechat', label: '微信' },
  { value: 'alipay', label: '支付宝' },
  { value: 'douyin', label: '抖音' },
]

const APP_TYPE_OPTIONS = {
  wechat: [
    { value: 'official_account', label: '公众号' },
    { value: 'mini_program', label: '小程序' },
    { value: 'open_platform', label: '开放平台' },
  ],
  alipay: [{ value: 'default', label: '默认' }],
  douyin: [{ value: 'default', label: '默认' }],
}

const isEdit = ref(false)
const documentId = ref('')
const submitting = ref(false)

const platformIndex = ref(0)
const appTypeIndex = ref(0)

const platformLabels = computed(() => platformOptions.map(p => p.label))
const currentAppTypes = computed(() => {
  const p = platformOptions[platformIndex.value]?.value
  return APP_TYPE_OPTIONS[p] || []
})
const appTypeLabels = computed(() => currentAppTypes.value.map(a => a.label))
const currentFields = computed(() => {
  const p = platformOptions[platformIndex.value]?.value
  const a = currentAppTypes.value[appTypeIndex.value]?.value || 'default'
  const allFields = PLATFORM_FIELDS[`${p}:${a}`] || []
  return allFields.filter(f => !f.showWhen || f.showWhen(form.value))
})
const currentHints = computed(() => {
  const p = platformOptions[platformIndex.value]?.value
  const a = currentAppTypes.value[appTypeIndex.value]?.value || 'default'
  return PLATFORM_HINTS[`${p}:${a}`] || {}
})

const form = ref({
  name: '',
  platform: '',
  appType: '',
  appId: '',
  appSecret: '',
  enabled: true,
  requireAuth: false,
})

function generateDefaultName() {
  const p = platformOptions[platformIndex.value]?.value
  const a = currentAppTypes.value[appTypeIndex.value]?.value || 'default'
  const pLabel = PLATFORM_MAP[p]?.label || p
  const aLabel = APP_TYPE_MAP[a] || ''
  return aLabel ? `${pLabel}-${aLabel}` : pLabel
}

const PLATFORM_MAP = {
  wechat: { label: '微信' },
  alipay: { label: '支付宝' },
  douyin: { label: '抖音' },
}

const APP_TYPE_MAP = {
  official_account: '公众号',
  mini_program: '小程序',
  open_platform: '开放平台',
  default: '',
}

function onPlatformChange(e) {
  platformIndex.value = e.detail.value
  appTypeIndex.value = 0
  form.value.platform = platformOptions[platformIndex.value].value
  form.value.appType = currentAppTypes.value[0]?.value || 'default'
  if (!isEdit.value && !form.value.name) {
    form.value.name = generateDefaultName()
  }
  currentFields.value.forEach(field => {
    if (field.type === 'switch') {
      form.value[field.key] = field.default ?? false
    } else if (field.type === 'picker') {
      form.value[field.key] = field.default ?? ''
    } else {
      form.value[field.key] = field.default ?? ''
    }
  })
}

function onAppTypeChange(e) {
  appTypeIndex.value = e.detail.value
  form.value.appType = currentAppTypes.value[appTypeIndex.value]?.value || 'default'
  if (!isEdit.value && !form.value.name) {
    form.value.name = generateDefaultName()
  }
  currentFields.value.forEach(field => {
    if (field.type === 'switch') {
      form.value[field.key] = field.default ?? false
    } else if (field.type === 'picker') {
      form.value[field.key] = field.default ?? ''
    } else {
      form.value[field.key] = field.default ?? ''
    }
  })
}

// picker 字段辅助
function onFieldPickerChange(e, field) {
  const idx = e.detail.value
  const opt = field.options[idx]
  if (opt) form.value[field.key] = opt.value
}

function getFieldPickerIndex(field) {
  if (!field.options) return 0
  return field.options.findIndex(o => o.value === form.value[field.key])
}

function getFieldPickerLabel(field) {
  if (!field.options) return ''
  const opt = field.options.find(o => o.value === form.value[field.key])
  return opt?.label || '请选择'
}

async function loadDetail(id) {
  try {
    const data = await getThirdPartyConfig(id)
    if (data) {
      // schema 字段直接赋值
      form.value.name = data.name || ''
      form.value.platform = data.platform || ''
      form.value.appType = data.appType || 'default'
      form.value.appId = data.appId || ''
      form.value.appSecret = data.appSecret || ''
      form.value.enabled = data.enabled ?? true
      form.value.requireAuth = data.requireAuth ?? false
      // 从 extraConfig 读取动态字段（PLATFORM_FIELDS 中不再有 appId/appSecret）
      const ec = data.extraConfig || {}
      const key = `${data.platform}:${data.appType || 'default'}`
      const allFields = PLATFORM_FIELDS[key] || []
      allFields.forEach(field => {
        if (field.type === 'switch') {
          form.value[field.key] = ec[field.key] ?? field.default ?? false
        } else {
          form.value[field.key] = ec[field.key] ?? field.default ?? ''
        }
      })
      // 设置 picker 索引
      const pi = platformOptions.findIndex(p => p.value === data.platform)
      if (pi >= 0) {
        platformIndex.value = pi
        const ai = currentAppTypes.value.findIndex(a => a.value === (data.appType || 'default'))
        if (ai >= 0) appTypeIndex.value = ai
      }
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function handleSubmit() {
  if (submitting.value) return
  if (!form.value.platform) {
    uni.showToast({ title: '请选择平台', icon: 'none' })
    return
  }
  for (const field of currentFields.value) {
    if (field.required && !form.value[field.key]) {
      uni.showToast({ title: `请填写${field.label}`, icon: 'none' })
      return
    }
  }
  submitting.value = true
  try {
    const SCHEMA_KEYS = new Set(['name', 'platform', 'appType', 'appId', 'appSecret', 'enabled', 'requireAuth'])
    const schemaData = {}
    const extraData = {}
    for (const [key, value] of Object.entries(form.value)) {
      if (SCHEMA_KEYS.has(key)) {
        schemaData[key] = value
      } else if (value !== undefined) {
        extraData[key] = value
      }
    }
    schemaData.extraConfig = extraData

    if (isEdit.value) {
      await updateThirdPartyConfig(documentId.value, schemaData)
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      await createThirdPartyConfig(schemaData)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    setTimeout(() => uni.navigateBack(), 500)
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const id = page.options?.documentId
  if (id) {
    isEdit.value = true
    documentId.value = id
    loadDetail(id)
  }
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding-bottom: 120rpx; box-sizing: border-box; }
.form-body { padding: 20rpx; }
.form-section-title {
  font-size: 28rpx; font-weight: bold; color: #333;
  margin: 24rpx 0 16rpx; padding-bottom: 8rpx;
  border-bottom: 2rpx solid #667eea;
}
.form-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx;
}
.form-item { margin-bottom: 24rpx; }
.form-label { font-size: 28rpx; color: #333; margin-bottom: 10rpx; display: block; }
.required-mark { color: #ff4d4f; margin-left: 4rpx; }
.form-input {
  width: 100%; height: 76rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box;
}
.form-picker {
  width: 100%; height: 76rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box;
  line-height: 76rpx; color: #333;
}
.form-hint {
  font-size: 24rpx; color: #999; margin-top: 6rpx; display: block;
}
.switch-item {
  display: flex; justify-content: space-between; align-items: center;
}
.switch-item .form-label { margin-bottom: 0; }
.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  padding: 20rpx 30rpx; background: #fff;
  border-top: 1rpx solid #f0f0f0; z-index: 100;
}
.btn-save {
  width: 100%; height: 88rpx; line-height: 88rpx; text-align: center;
  background: #667eea; color: #fff; font-size: 30rpx; border-radius: 8rpx; border: none;
}
</style>
