<template>
  <view class="sso-login-page">
    <view class="page-header">
      <text class="page-title">SSO 统一登录</text>
    </view>

    <view class="component-container">
      <wx-sso-login
        :app-code="appCode"
        :redirect-uri="redirectUri"
        :invite-code="inviteCode"
        :channel-code="channelCode"
        :fallback-mode="mode"
        :fallback-enabled="true"
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

onLoad((options) => {
  appCode.value = options?.app_code || ''
  returnUrl.value = options?.return_url ? decodeURIComponent(options.return_url) : ''
  inviteCode.value = options?.invite_code || ''
  channelCode.value = options?.channel_code || ''
  mode.value = options?.mode || 'token'

  if (!appCode.value) {
    uni.showToast({ title: '缺少 app_code 参数', icon: 'none' })
  }
  if (!returnUrl.value) {
    uni.showToast({ title: '缺少 return_url 参数', icon: 'none' })
  }
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
</style>
