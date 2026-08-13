<template>
  <view class="callback-page">
    <view class="callback-title">登录中</view>

    <view v-if="loading" class="status">正在跳转...</view>
    <view v-else-if="redirecting" class="status">检测到登录凭证，正在跳转到目标页面...</view>
    <view v-else-if="error" class="status error">
      <text>{{ error }}</text>
      <view class="retry-btn" @click="backToLogin">返回登录</view>
    </view>
    <view v-else class="status">正在处理登录信息...</view>

    <!-- 调试信息（仅开发环境，可通过 URL 参数 ?debug=1 显示） -->
    <view v-if="showDebug" class="debug-info">
      <text class="debug-text">{{ debugInfo }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { publicPost } from '../../utils/request.js'

const loading = ref(false)
const redirecting = ref(false)
const error = ref('')
const code = ref('')
const returnUrl = ref('')
const cEndUrl = ref('')
const appCode = ref('')
const inviteCode = ref('')
const channelCode = ref('')
const showDebug = ref(false)
const debugInfo = ref('')

let initCalled = false

/**
 * 从 URL hash 中解析查询参数（UniApp H5 hash 模式兜底）
 */
function parseHashParams() {
  if (typeof window === 'undefined') return {}
  try {
    const hashQuery = window.location.hash.split('?')[1] || ''
    if (!hashQuery) return {}
    const urlParams = new URLSearchParams(hashQuery)
    const result = {}
    for (const key of ['token', 'code', 'user', 'return_url', 'c_end_url', 'app_code', 'state', 'error', 'isNew', 'invite_code', 'channel_code']) {
      const val = urlParams.get(key)
      if (val) result[key] = val
    }
    return result
  } catch {
    return {}
  }
}

/**
 * SSO 回调 URL 协议处理：
 * - SSO 服务器自身（h.joho.cn）必须用 HTTPS（微信 OAuth 要求）
 * - C 端域名（v.joho.cn 等）保持原样，不强制转换
 *   （C 端可能未配置 SSL，强制 HTTPS 会导致 ERR_SSL_PROTOCOL_ERROR）
 */
function enforceHttps(url) {
  if (!url) return url
  // 只对 SSO 服务器域名强制 HTTPS
  if (url.includes('h.joho.cn')) {
    return url.replace(/^http:\/\//i, 'https://')
  }
  return url
}

async function init(options) {
  if (initCalled) return
  initCalled = true

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
      console.warn('[SSO login-callback] URL fallback parsing failed:', e)
    }
  }

  // 检查是否显示调试信息
  if (typeof window !== 'undefined') {
    const hashParams = parseHashParams()
    showDebug.value = hashParams.debug === '1' || new URLSearchParams(window.location.search).get('debug') === '1'
  }

  const debugData = {
    token: options?.token ? '(present)' : '(missing)',
    code: options?.code || '(missing)',
    return_url: options?.return_url || '(missing)',
    c_end_url: options?.c_end_url || '(missing)',
    app_code: options?.app_code || '(missing)',
    state: options?.state ? '(present)' : '(missing)',
    error: options?.error || '(missing)',
  }
  console.log('[SSO login-callback] init options:', JSON.stringify(debugData))
  debugInfo.value = JSON.stringify(debugData, null, 2)

  // OAuth 回调失败时后端 302 携带 error 参数
  const errorMsg = options?.error
  if (errorMsg) {
    error.value = decodeURIComponent(errorMsg)
    return
  }

  // 提取所有参数
  const tokenParam = options?.token || ''
  const userParam = options?.user || ''
  const isNewParam = options?.isNew || ''
  code.value = options?.code || ''
  returnUrl.value = options?.return_url ? decodeURIComponent(options.return_url) : ''
  cEndUrl.value = options?.c_end_url ? decodeURIComponent(options.c_end_url) : ''
  appCode.value = options?.app_code || ''
  inviteCode.value = options?.invite_code || ''
  channelCode.value = options?.channel_code || ''

  // 解码 state（Type A：base64url JSON 信封）
  const stateRaw = options?.state || ''
  if (stateRaw) {
    try {
      const stateData = JSON.parse(atob(stateRaw.replace(/-/g, '+').replace(/_/g, '/')))
      if (!inviteCode.value) inviteCode.value = stateData.invite_code || ''
      if (!channelCode.value) channelCode.value = stateData.channel_code || ''
      if (stateData.app_code) appCode.value = stateData.app_code
      // 从 state.redirect_uri 的 query 参数中提取 c_end_url 作为兜底
      if (!cEndUrl.value && stateData.redirect_uri) {
        try {
          const queryPart = stateData.redirect_uri.split('?')[1] || ''
          const stateParams = new URLSearchParams(queryPart)
          const cEndFromState = stateParams.get('c_end_url')
          if (cEndFromState) cEndUrl.value = cEndFromState
        } catch {}
      }
    } catch (e) {
      console.warn('[SSO login-callback] state 解码失败:', e)
    }
  }

  // 场景 1：URL 已携带 token（login.vue onSuccess 直接跳转，或重定向循环回此页）
  // 跳过 code 兑换，直接转发到目标地址（c_end_url 优先，return_url 兜底）
  if (tokenParam) {
    console.log('[SSO login-callback] 检测到 token 参数，跳过 code 兑换，直接转发')
    debugInfo.value += '\n→ 检测到 token，执行 redirectToTarget'
    redirectToTarget(tokenParam, userParam, isNewParam)
    return
  }

  // 场景 2：标准 OAuth code 兑换流程
  if (!code.value) {
    error.value = '未收到授权码'
    debugInfo.value += '\n→ 未收到 token 和 code，无法继续'
    return
  }
  if (!returnUrl.value && !cEndUrl.value) {
    error.value = '未收到 return_url'
    return
  }
  if (!appCode.value) {
    error.value = '未收到 app_code'
    return
  }

  await exchangeToken()
}

/**
 * 直接转发 token 到目标地址（c_end_url 优先，return_url 兜底）
 * 用于 URL 已携带 token 的场景
 */
function redirectToTarget(token, userEncoded, isNewFlag) {
  // c_end_url 优先，return_url 兜底
  let targetUrl = cEndUrl.value || returnUrl.value
  if (!targetUrl) {
    error.value = '未收到跳转地址（c_end_url 和 return_url 均缺失）'
    return
  }

  // 强制 HTTPS：所有回调地址必须使用 HTTPS
  targetUrl = enforceHttps(targetUrl)

  // 安全检查：如果 targetUrl 与 SSO 服务器同域且指向 auth-callback，
  // 说明 C 端未正确配置 return_url/c_end_url
  try {
    const targetOrigin = new URL(targetUrl).origin
    const currentOrigin = window.location.origin
    if (targetOrigin === currentOrigin && targetUrl.includes('auth-callback')) {
      console.error('[SSO login-callback] 目标地址指向 SSO 服务器自身:', targetUrl)
      error.value = '回调地址配置错误：return_url 应指向 C 端域名（如 v.joho.cn），当前指向 SSO 服务器。'
      return
    }
  } catch {}

  const sep = targetUrl.includes('?') ? '&' : '?'
  const userPart = userEncoded ? `&user=${userEncoded}` : ''
  const isNewPart = isNewFlag ? `&isNew=${isNewFlag}` : ''
  redirecting.value = true
  console.log('[SSO login-callback] redirectToTarget:', targetUrl)
  debugInfo.value += `\n→ 跳转到: ${targetUrl}`
  window.location.href = `${targetUrl}${sep}token=${token}${userPart}${isNewPart}`
}

// 主生命周期：onLoad（UniApp 标准）
onLoad((options) => {
  init(options)
})

// 兜底：onMounted 确保即使 onLoad 未触发也能执行
// 某些 UniApp 版本在直接 URL 导航时 onLoad 可能不触发
onMounted(() => {
  if (!initCalled) {
    console.warn('[SSO login-callback] onLoad 未触发，使用 onMounted 兜底')
    init(parseHashParams())
  }
})

async function exchangeToken() {
  loading.value = true
  try {
    const result = await publicPost('/zhao-sso/v1/auth/exchange-token', {
      code: code.value,
      app_code: appCode.value,
      redirect_uri: window.location.origin + '/#/pages/sso/login-callback',
    })

    const token = result.access_token || result.jwt || result.token
    if (!token) {
      throw new Error('未获取到 token')
    }

    const userEncoded = btoa(encodeURIComponent(JSON.stringify(result.user || {})))
    // c_end_url 优先，return_url 兜底
    let targetUrl = cEndUrl.value || returnUrl.value

    // 强制 HTTPS
    targetUrl = enforceHttps(targetUrl)

    // 安全检查
    try {
      const targetOrigin = new URL(targetUrl).origin
      if (targetOrigin === window.location.origin && targetUrl.includes('auth-callback')) {
        throw new Error('回调地址配置错误：return_url 应指向 C 端域名（如 v.joho.cn），当前指向 SSO 服务器。')
      }
    } catch (urlErr) {
      if (urlErr.message.includes('回调地址配置错误')) throw urlErr
    }

    const sep = targetUrl.includes('?') ? '&' : '?'
    const isNewFlag = result.is_new === true || result.isNew === true ? '1' : ''
    const isNewParam = isNewFlag ? `&isNew=${isNewFlag}` : ''
    console.log('[SSO login-callback] exchangeToken redirect:', targetUrl)
    window.location.href = `${targetUrl}${sep}token=${token}&user=${userEncoded}${isNewParam}`
  } catch (e) {
    error.value = e?.message || e?.error || 'token 兑换失败'
    const params = new URLSearchParams({
      app_code: appCode.value,
      return_url: returnUrl.value,
      error: error.value,
    })
    if (cEndUrl.value) params.append('c_end_url', cEndUrl.value)
    if (inviteCode.value) params.append('invite_code', inviteCode.value)
    if (channelCode.value) params.append('channel_code', channelCode.value)
    setTimeout(() => {
      window.location.href = window.location.origin + '/#/pages/sso/login?' + params.toString()
    }, 1500)
  } finally {
    loading.value = false
  }
}

function backToLogin() {
  const params = new URLSearchParams({
    app_code: appCode.value,
    return_url: returnUrl.value,
  })
  if (cEndUrl.value) params.append('c_end_url', cEndUrl.value)
  if (inviteCode.value) params.append('invite_code', inviteCode.value)
  if (channelCode.value) params.append('channel_code', channelCode.value)
  window.location.href = window.location.origin + '/#/pages/sso/login?' + params.toString()
}
</script>

<style scoped>
.callback-page {
  padding: 40px 20px;
  max-width: 480px;
  margin: 0 auto;
  text-align: center;
}
.callback-title { font-size: 20px; font-weight: bold; margin-bottom: 20px; }
.status { padding: 16px; border-radius: 8px; color: #666; }
.status.error { background: #fee; color: #c00; }
.retry-btn {
  margin-top: 20px;
  padding: 10px 24px;
  background: #667eea;
  color: #fff;
  border-radius: 6px;
  display: inline-block;
}
.debug-info {
  margin-top: 20px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  text-align: left;
  overflow-x: auto;
}
.debug-text {
  font-size: 12px;
  color: #999;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
