<template>
  <view class="wx-sso-login">
    <!-- #ifdef H5 -->
    <!-- 加载登录配置 -->
    <view v-if="loading" class="loading-tip">
      <text class="loading-text">正在加载登录配置...</text>
    </view>

    <!-- H5 微信浏览器：根据 oauthScopes 动态渲染 -->
    <template v-else-if="isWechatBrowser()">
      <view v-if="!hasScopes" class="empty-tip">
        <text class="empty-text">未配置可用的微信登录方式</text>
      </view>
      <template v-else>
        <button
          v-if="hasScope('snsapi_base')"
          class="login-btn h5-wechat-btn"
          :loading="logging"
          @click="handleLogin('snsapi_base')"
        >快速登录</button>
        <button
          v-if="hasScope('snsapi_userinfo')"
          class="login-btn h5-wechat-btn"
          :loading="logging"
          @click="handleLogin('snsapi_userinfo')"
        >完善资料登录</button>
        <text class="tip-text">将跳转至微信完成授权</text>
      </template>
    </template>

    <!-- 非微信浏览器：降级为账号密码登录 -->
    <template v-else-if="fallbackEnabled">
      <view class="fallback-form">
        <view class="form-title">账号登录</view>
        <input
          v-model="fallbackForm.identifier"
          class="form-input"
          placeholder="用户名 / 邮箱 / 手机号"
        />
        <input
          v-model="fallbackForm.password"
          class="form-input"
          type="password"
          placeholder="密码"
          @confirm="handleFallbackLogin"
        />
        <button
          class="login-btn fallback-btn"
          :loading="fallbackLogging"
          :disabled="fallbackLogging"
          @click="handleFallbackLogin"
        >{{ fallbackLogging ? '登录中...' : '登录' }}</button>
        <text class="fallback-tip-text">非微信环境，使用账号密码登录</text>
      </view>
    </template>

    <!-- fallbackEnabled=false 且非微信：保持原扫码逻辑 -->
    <template v-else>
      <button
        class="login-btn h5-wechat-btn"
        :loading="logging"
        @click="handleLogin()"
      >微信扫码登录</button>
      <text class="tip-text">将跳转至微信扫码页面</text>
    </template>
    <!-- #endif -->

    <!-- #ifdef MP-WEIXIN -->
    <button
      class="login-btn h5-wechat-btn"
      :loading="logging"
      @click="handleLogin()"
    >微信登录</button>
    <text class="tip-text">使用当前微信账号登录</text>
    <!-- #endif -->

    <!-- #ifdef APP-PLUS -->
    <button
      class="login-btn h5-wechat-btn"
      :loading="logging"
      @click="handleLogin()"
    >微信登录</button>
    <text class="tip-text">使用微信账号登录</text>
    <!-- #endif -->
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  ssoWechatMiniProgramLogin,
  ssoWechatAppLogin,
  ssoJssdkSignature,
  ssoWechatConfig,
  ssoPasswordAuthorize,
  ssoPasswordLogin,
} from '../../src/api/sso.js'

const props = defineProps({
  appCode: { type: String, required: true },
  redirectUri: { type: String, default: '' },
  inviteCode: { type: String, default: '' },
  channelCode: { type: String, default: '' },
  fallbackMode: {
    type: String,
    default: 'code',
    validator: (v) => ['code', 'token'].includes(v)
  },
  fallbackEnabled: {
    type: Boolean,
    default: true
  },
  autoRedirect: {
    type: Boolean,
    default: false
  },
})
const emit = defineEmits(['success', 'error', 'redirect'])

// SSO 基地址（H5/PC 跳转用），可按需配置
const SSO_BASE_URL = import.meta.env?.VITE_SSO_BASE_URL
  || (typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}/api/zhao-sso/v1`
      : 'http://h.joho.cn/api/zhao-sso/v1')

// 降级密码登录表单状态
const fallbackForm = ref({ identifier: '', password: '' })
const fallbackLogging = ref(false)

// 降级密码登录：非微信环境下用账号密码登录
async function handleFallbackLogin() {
  if (fallbackLogging.value) return
  if (!fallbackForm.value.identifier || !fallbackForm.value.password) {
    uni.showToast({ title: '请填写账号和密码', icon: 'none' })
    return
  }

  fallbackLogging.value = true

  try {
    if (props.fallbackMode === 'code') {
      // Code 模式：调 /v1/auth/password-authorize，跳转 redirectUri
      const result = await ssoPasswordAuthorize({
        app_code: props.appCode,
        identifier: fallbackForm.value.identifier,
        password: fallbackForm.value.password,
        redirect_uri: props.redirectUri,
        state: '',
        invite_code: props.inviteCode,
        channel_code: props.channelCode,
      })
      const url = `${result.redirect_uri}?code=${result.code}&state=${result.state || ''}`
      emit('redirect', url)
      // #ifdef H5
      window.location.href = url
      // #endif
    } else {
      // Token 模式：调 /v1/auth/login，emit success
      const result = await ssoPasswordLogin({
        type: 'password',
        app_code: props.appCode,
        identifier: fallbackForm.value.identifier,
        password: fallbackForm.value.password,
        invite_code: props.inviteCode,
        channel_code: props.channelCode,
      })
      emit('success', result)
    }
  } catch (e) {
    const msg = e?.message || e?.error || '登录失败'
    uni.showToast({ title: msg, icon: 'none' })
    emit('error', e)
  } finally {
    fallbackLogging.value = false
  }
}

const loading = ref(false)
const logging = ref(false)
const config = ref(null)

// 检测微信浏览器
function isWechatBrowser() {
  // #ifdef H5
  const ua = (navigator.userAgent || '').toLowerCase()
  if (ua.includes('micromessenger')) return true
  // 调试开关：?debugWx=1 强制识别为微信环境
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const hashQuery = window.location.hash.split('?')[1] || ''
    const hashParams = new URLSearchParams(hashQuery)
    if (params.get('debugWx') === '1' || hashParams.get('debugWx') === '1') return true
  }
  return false
  // #endif
  return false
}

// 检测 PC 浏览器（H5 且非微信浏览器）
function isPcBrowser() {
  // #ifdef H5
  return !isWechatBrowser()
  // #endif
  return false
}

// 从 config 中提取 oauthScopes（兼容多种返回结构）
const oauthScopes = computed(() => {
  const cfg = config.value
  if (!cfg) return []
  const scopes = cfg.oauthScopes || cfg.oauth_scopes || cfg.data?.oauthScopes || []
  return Array.isArray(scopes) ? scopes : []
})
const hasScopes = computed(() => oauthScopes.value.length > 0)
function hasScope(scope) {
  return oauthScopes.value.includes(scope)
}

// 主登录函数：按环境调用对应的 sso 微信登录方式
async function handleLogin(scope) {
  if (logging.value) return
  logging.value = true

  // #ifdef MP-WEIXIN
  // 小程序：uni.login 拿 code → POST sso /v1/auth/wechat/miniprogram
  uni.login({
    provider: 'weixin',
    success: async (res) => {
      try {
        const result = await ssoWechatMiniProgramLogin({
          code: res.code,
          appCode: props.appCode,
          inviteCode: props.inviteCode,
          channelCode: props.channelCode,
        })
        emit('success', result)
      } catch (e) {
        emit('error', e)
      } finally {
        logging.value = false
      }
    },
    fail: (err) => {
      emit('error', err)
      logging.value = false
    },
  })
  // #endif

  // #ifdef APP-PLUS
  // APP：uni.login 拿 code → POST sso /v1/auth/wechat/app
  uni.login({
    provider: 'weixin',
    success: async (res) => {
      try {
        const result = await ssoWechatAppLogin({
          code: res.code,
          appCode: props.appCode,
          inviteCode: props.inviteCode,
          channelCode: props.channelCode,
        })
        emit('success', result)
      } catch (e) {
        emit('error', e)
      } finally {
        logging.value = false
      }
    },
    fail: (err) => {
      emit('error', err)
      logging.value = false
    },
  })
  // #endif

  // #ifdef H5
  // H5/PC：跳转 sso 授权页，sso 处理 JSSDK 与 OAuth 后 302 回 redirectUri?code=<authCode>
  // 业务方在 redirectUri 页面用 authCode 调 /v1/auth/token 换 token
  try {
    const params = new URLSearchParams()
    params.append('app_code', props.appCode)
    if (props.redirectUri) params.append('redirect_uri', props.redirectUri)
    if (isWechatBrowser()) {
      params.append('scope', scope || 'snsapi_userinfo')
      // 显式声明公众号场景，避免后端仅靠 UA 误判为 open_platform（本地调试 debugWx 也能命中）
      params.append('app_type', 'official_account')
      // 透传 debugWx 让后端按 official_account 处理，并便于联调
      if (typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search)
        const hp = new URLSearchParams((window.location.hash.split('?')[1]) || '')
        if (sp.get('debugWx') === '1' || hp.get('debugWx') === '1') {
          params.append('debugWx', '1')
        }
      }
    }
    if (props.inviteCode) params.append('invite_code', props.inviteCode)
    if (props.channelCode) params.append('channel_code', props.channelCode)
    const url = `${SSO_BASE_URL}/auth/wechat?${params.toString()}`
    emit('redirect', url)
    window.location.href = url
  } catch (e) {
    emit('error', e)
    logging.value = false
  }
  // #endif
}

// 加载可用登录方式（仅 H5 微信浏览器需要拉取 oauthScopes 用于动态渲染）
async function loadWechatConfig() {
  // #ifdef H5
  if (!isWechatBrowser()) return null
  loading.value = true
  try {
    const res = await ssoWechatConfig({ appType: 'official_account' })
    config.value = res?.data ?? res
    return config.value
  } catch {
    config.value = null
    return null
  } finally {
    loading.value = false
  }
  // #endif
  // #ifndef H5
  return null
  // #endif
}

onMounted(async () => {
  await loadWechatConfig()
  // #ifdef H5
  // 微信环境 + 自动跳转模式 + 配置含 snsapi_base → 自动静默登录
  if (props.autoRedirect && isWechatBrowser() && hasScope('snsapi_base')) {
    handleLogin('snsapi_base')
  }
  // #endif
})
</script>

<style scoped>
.wx-sso-login {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
}

/* 基础按钮风格，参考 login.vue 的 .login-btn */
.login-btn {
  width: 100%;
  height: 44px;
  margin-top: 10px;
  background-color: #409eff;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  line-height: 44px;
  padding: 0;
  box-sizing: border-box;
}

/* 微信登录按钮：微信绿，覆盖 .login-btn 蓝色背景 */
.h5-wechat-btn {
  background-color: #07c160;
}

/* 多按钮时间距 */
.login-btn + .login-btn {
  margin-top: 16px;
}

.loading-tip {
  padding: 20px 0;
  text-align: center;
}

.loading-text {
  font-size: 14px;
  color: #999;
}

.empty-tip {
  padding: 20px 0;
  text-align: center;
}

.empty-text {
  font-size: 14px;
  color: #999;
}

.tip-text {
  display: block;
  margin-top: 12px;
  font-size: 12px;
  color: #999;
  text-align: center;
}

/* 降级密码登录表单 */
.fallback-form {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 20rpx 0;
}

.form-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin-bottom: 10rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.fallback-btn {
  background: #1677ff !important;
  color: #fff !important;
  margin-top: 10rpx;
}

.fallback-tip-text {
  font-size: 24rpx;
  color: #999;
  text-align: center;
  margin-top: 10rpx;
}
</style>
