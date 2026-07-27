<template>
  <view class="sso-login-page">
    <view class="page-header">
      <text class="page-title">SSO 统一登录</text>
    </view>

    <!-- 微信环境自动跳转中 -->
    <view v-if="isWechatAutoRedirecting" class="loading-state">
      <view class="loading-spinner"></view>
      <text class="loading-text">正在跳转微信登录...</text>
    </view>

    <!-- 错误提示（OAuth 失败回跳） -->
    <view v-else-if="oauthError" class="error-state">
      <view class="error-text">⚠ {{ oauthError }}</view>
    </view>

    <!-- 正常渲染组件（含降级表单） -->
    <view class="component-container" v-else>
      <wx-sso-login
        :app-code="appCode"
        :redirect-uri="redirectUri"
        :invite-code="inviteCode"
        :channel-code="channelCode"
        :fallback-mode="mode"
        :fallback-enabled="true"
        :auto-redirect="isWechatEnv"
        @success="onSuccess"
        @error="onError"
        @redirect="onRedirect"
      />
    </view>

    <view class="footer">
      <text class="footer-text">没有账号？</text>
      <text class="footer-link" @click="goRegister">去注册</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const appCode = ref('')
const returnUrl = ref('')
const inviteCode = ref('')
const channelCode = ref('')
const mode = ref('token')
const oauthError = ref('')
const isWechatAutoRedirecting = ref(false)

onLoad((options) => {
  appCode.value = options?.app_code || ''
  returnUrl.value = options?.return_url ? decodeURIComponent(options.return_url) : ''
  inviteCode.value = options?.invite_code || ''
  channelCode.value = options?.channel_code || ''
  mode.value = options?.mode || 'token'
  oauthError.value = options?.error ? decodeURIComponent(options.error) : ''

  if (!appCode.value) {
    uni.showToast({ title: '缺少 app_code 参数', icon: 'none' })
  }
  if (!returnUrl.value) {
    uni.showToast({ title: '缺少 return_url 参数', icon: 'none' })
  }
})

// 判断微信浏览器环境（与 strapi-course/utils/env.ts 的 isWechatBrowser 逻辑一致）
const isWechatEnv = computed(() => {
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
})

// wx-sso-login 在微信环境跳转 OAuth 时使用的 redirect_uri
// 指向 SSO 系统的 login-callback 中转页
const redirectUri = computed(() => {
  if (!appCode.value) return ''
  const cbUrl = window.location.origin + '/#/pages/sso/login-callback'
  const params = new URLSearchParams({
    return_url: returnUrl.value,
    app_code: appCode.value,
  })
  return `${cbUrl}?${params.toString()}`
})

function onSuccess(result) {
  // result: { access_token, refresh_token, user }
  const token = result.access_token || result.jwt || result.token
  if (!token || !returnUrl.value) {
    uni.showToast({ title: '登录失败：未获取到 token', icon: 'none' })
    return
  }
  const userEncoded = btoa(encodeURIComponent(JSON.stringify(result.user || {})))
  const sep = returnUrl.value.includes('?') ? '&' : '?'
  window.location.href = `${returnUrl.value}${sep}token=${token}&user=${userEncoded}`
}

function onError(err) {
  const msg = err?.message || err?.error || '登录失败'
  uni.showToast({ title: msg, icon: 'none' })
}

function onRedirect(url) {
  // wx-sso-login 触发跳转后，标记为「跳转中」（仅微信环境）
  if (isWechatEnv.value) {
    isWechatAutoRedirecting.value = true
  }
  console.log('[sso-login] redirect to:', url)
}

function goRegister() {
  const params = new URLSearchParams({
    app_code: appCode.value,
    return_url: encodeURIComponent(returnUrl.value),
  })
  if (inviteCode.value) params.append('invite_code', inviteCode.value)
  if (channelCode.value) params.append('channel_code', channelCode.value)
  uni.navigateTo({ url: `/pages/sso/register?${params.toString()}` })
}
</script>

<style scoped>
.sso-login-page {
  padding: 20px;
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background: #f5f5f5;
}
.page-header { text-align: center; padding: 30px 0 20px; }
.page-title { font-size: 22px; font-weight: bold; color: #333; }
.component-container {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.footer { text-align: center; padding: 20px 0; }
.footer-text { font-size: 14px; color: #666; }
.footer-link { font-size: 14px; color: #667eea; margin-left: 4px; }

/* 微信环境自动跳转加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  gap: 16px;
}
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #07c160;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loading-text {
  font-size: 14px;
  color: #666;
}

/* 错误提示 */
.error-state {
  padding: 30px 20px;
  text-align: center;
}
.error-text {
  font-size: 14px;
  color: #c00;
  background: #fee;
  padding: 12px 16px;
  border-radius: 8px;
  display: inline-block;
}
</style>
