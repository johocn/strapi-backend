<template>
  <view class="sso-login-page">
    <view class="page-header">
      <text class="page-title">星枢统一关系中心</text>
      <text class="page-tagline">{{ tagline }}</text>
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
const cEndUrl = ref('')
const inviteCode = ref('')
const channelCode = ref('')
const mode = ref('token')
const oauthError = ref('')
const isWechatAutoRedirecting = ref(false)

// 星枢统一关系中心：随机标语（解释核心理念：一个身份串联所有系统）
const TAGS = [
  '一个账号，玩转全部系统',
  '一登录，全平台畅通',
  '统一身份，串联所有系统',
  '把散落的系统串成一个整体',
  '一次登录，处处是你的主场',
  '星枢，理清你与好友的联结',
  '一个身份，链接所有业务',
  '打通各系统，一个身份就够',
  '账号在手，关系全有',
  '你来登录，我们连起所有',
  '所有系统，围绕你一个身份',
  '星枢，让系统彼此相连',
  '一键登录，关系自动串联',
  '统一身份，连接课程与活动',
  '星枢轴心，转动整个生态',
  '关系即资产，星枢帮你理',
  '一个他，联结你全部服务',
  '登录一次，身份遍行全线',
  '星枢，你做主的登录中枢',
  '人人皆一点，处处通星枢',
]
const tagline = ref(TAGS[Math.floor(Math.random() * TAGS.length)])

/**
 * 从 URL hash 中解析查询参数（UniApp H5 hash 模式兜底）
 * UniApp onLoad 可能因 return_url/c_end_url 中编码的 %23（#）导致参数解析异常，
 * 当关键参数缺失时，直接从 window.location.hash 解析补充。
 * 与 login-callback.vue 的 parseHashParams 逻辑保持一致。
 */
function parseHashParams() {
  if (typeof window === 'undefined') return {}
  try {
    const hashQuery = window.location.hash.split('?')[1] || ''
    if (!hashQuery) return {}
    const urlParams = new URLSearchParams(hashQuery)
    const result = {}
    for (const key of ['app_code', 'return_url', 'c_end_url', 'invite_code', 'channel_code', 'mode', 'error']) {
      const val = urlParams.get(key)
      if (val) result[key] = val
    }
    return result
  } catch {
    return {}
  }
}

onLoad((options) => {
  // 兜底：UniApp onLoad 可能因 return_url 中编码的 %23（#）导致参数解析异常
  // 当关键参数缺失时，直接从 window.location.hash 解析补充
  if (typeof window !== 'undefined') {
    try {
      const hashParams = parseHashParams()
      const merged = { ...(options || {}) }
      for (const key of Object.keys(hashParams)) {
        if (!merged[key] && hashParams[key]) {
          merged[key] = hashParams[key]
        }
      }
      options = merged
    } catch (e) {
      console.warn('[SSO login] URL fallback parsing failed:', e)
    }
  }

  appCode.value = options?.app_code || ''
  returnUrl.value = options?.return_url ? decodeURIComponent(options.return_url) : ''
  cEndUrl.value = options?.c_end_url ? decodeURIComponent(options.c_end_url) : ''
  inviteCode.value = options?.invite_code || ''
  channelCode.value = options?.channel_code || ''
  mode.value = options?.mode || 'token'
  oauthError.value = options?.error ? decodeURIComponent(options.error) : ''

  console.log('[SSO login] onLoad options:', { app_code: appCode.value, return_url: returnUrl.value, c_end_url: cEndUrl.value, mode: mode.value })

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
// 显式透传 invite_code/channel_code，避免依赖 state 解码兜底（state 由后端构造，前端不可见）
// 透传 c_end_url 以便 login-callback 认证成功后直接跳回 C 端
const redirectUri = computed(() => {
  if (!appCode.value) return ''
  const cbUrl = window.location.origin + '/#/pages/sso/login-callback'
  const params = new URLSearchParams({
    return_url: returnUrl.value,
    app_code: appCode.value,
  })
  if (cEndUrl.value) params.append('c_end_url', cEndUrl.value)
  if (inviteCode.value) params.append('invite_code', inviteCode.value)
  if (channelCode.value) params.append('channel_code', channelCode.value)
  return `${cbUrl}?${params.toString()}`
})

function onSuccess(result) {
  console.log('[SSO login] onSuccess called with result:', { hasToken: !!(result?.access_token || result?.jwt || result?.token), cEndUrl: cEndUrl.value, returnUrl: returnUrl.value })
  // result: { access_token, refresh_token, user, is_new }
  const token = result.access_token || result.jwt || result.token
  // 优先跳转到 C 端（c_end_url），无 c_end_url 时回退到 return_url
  const targetUrl = cEndUrl.value || returnUrl.value
  if (!token || !targetUrl) {
    console.warn('[SSO login] Redirect aborted: token or targetUrl missing', { token: !!token, targetUrl })
    uni.showToast({ title: '登录失败：未获取到 token', icon: 'none' })
    return
  }

  // 安全检查：如果 targetUrl 与 SSO 服务器同域且指向 auth-callback，
  // 说明 C 端未正确配置 return_url/c_end_url（应指向 v.joho.cn 等 C 端域名）
  try {
    const targetOrigin = new URL(targetUrl).origin
    if (targetOrigin === window.location.origin && targetUrl.includes('auth-callback')) {
      console.error('[sso-login] 目标地址指向 SSO 服务器自身，C 端 return_url/c_end_url 配置有误:', targetUrl)
      uni.showToast({ title: '回调地址配置错误：return_url 应指向 C 端域名', icon: 'none', duration: 5000 })
      return
    }
  } catch {}

  const userEncoded = btoa(encodeURIComponent(JSON.stringify(result.user || {})))
  const sep = targetUrl.includes('?') ? '&' : '?'
  const isNewFlag = result.is_new === true || result.isNew === true ? '1' : ''
  const isNewParam = isNewFlag ? `&isNew=${isNewFlag}` : ''
  // 传递 refresh_token 和 expires_in，供 C 端实现 token 刷新
  const refreshToken = result.refresh_token || ''
  const expiresIn = result.expires_in || 900
  const refreshParam = refreshToken ? `&refresh_token=${encodeURIComponent(refreshToken)}` : ''
  const expiresInParam = `&expires_in=${expiresIn}`
  const redirectUrl = `${targetUrl}${sep}token=${token}&user=${userEncoded}${isNewParam}${refreshParam}${expiresInParam}`
  console.log('[SSO login] Redirecting to:', redirectUrl)
  window.location.href = redirectUrl
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
  // URLSearchParams.toString() 会自动编码，不要手动 encodeURIComponent 避免双重编码
  const params = new URLSearchParams({
    app_code: appCode.value,
    return_url: returnUrl.value,
  })
  if (cEndUrl.value) params.append('c_end_url', cEndUrl.value)
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
.page-tagline { display: block; margin-top: 8px; font-size: 13px; color: #8898aa; }
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
