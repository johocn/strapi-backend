<template>
  <view class="callback-page">
    <view class="callback-title">登录中</view>

    <view v-if="loading" class="status">正在兑换 token...</view>
    <view v-else-if="error" class="status error">
      <text>{{ error }}</text>
      <view class="retry-btn" @click="backToLogin">返回登录</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { publicPost } from '../../utils/request.js'

const loading = ref(false)
const error = ref('')
const code = ref('')
const returnUrl = ref('')
const cEndUrl = ref('')
const appCode = ref('')
const inviteCode = ref('')
const channelCode = ref('')

async function init(options) {
  // 兜底：UniApp onLoad 可能因 return_url 中编码的 %23（#）导致参数解析异常
  // 当关键参数缺失时，直接从 window.location.hash 解析补充
  if (typeof window !== 'undefined') {
    try {
      const hashQuery = window.location.hash.split('?')[1] || ''
      if (hashQuery) {
        const urlParams = new URLSearchParams(hashQuery)
        const merged = { ...(options || {}) }
        for (const key of ['token', 'code', 'user', 'return_url', 'c_end_url', 'app_code', 'state', 'error', 'isNew']) {
          if (!merged[key] && urlParams.get(key)) {
            merged[key] = urlParams.get(key)
          }
        }
        options = merged
      }
    } catch (e) {
      console.warn('[SSO login-callback] URL fallback parsing failed:', e)
    }
  }

  console.log('[SSO login-callback] init options:', JSON.stringify({
    token: options?.token ? '(present)' : '(missing)',
    code: options?.code || '(missing)',
    return_url: options?.return_url || '(missing)',
    c_end_url: options?.c_end_url || '(missing)',
    app_code: options?.app_code || '(missing)',
    state: options?.state ? '(present)' : '(missing)',
    error: options?.error || '(missing)',
  }))

  // OAuth 回调失败时后端 302 携带 error 参数
  const errorMsg = options?.error
  if (errorMsg) {
    error.value = decodeURIComponent(errorMsg)
    return // 不再调 exchangeToken
  }

  // 提取所有参数
  const tokenParam = options?.token || ''
  const userParam = options?.user || ''
  const isNewParam = options?.isNew || ''
  code.value = options?.code || ''
  returnUrl.value = options?.return_url ? decodeURIComponent(options.return_url) : ''
  cEndUrl.value = options?.c_end_url ? decodeURIComponent(options.c_end_url) : ''
  appCode.value = options?.app_code || ''

  // 解码 state（Type A：base64url JSON 信封，由 SSO 后端 wechatRedirect/alipayRedirect 构造）
  // 提取 invite_code 和 channel_code 用于失败回跳时透传
  // 注意：state.redirect_uri 是 OAuth redirect_uri（即 login-callback 自身地址），不是 return_url
  // 不能用它覆盖 returnUrl，否则会导致 redirect 回 login-callback 自身形成死循环
  const stateRaw = options?.state || ''
  if (stateRaw) {
    try {
      const stateData = JSON.parse(atob(stateRaw.replace(/-/g, '+').replace(/_/g, '/')))
      inviteCode.value = stateData.invite_code || ''
      channelCode.value = stateData.channel_code || ''
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
    redirectToTarget(tokenParam, userParam, isNewParam)
    return
  }

  // 场景 2：标准 OAuth code 兑换流程
  if (!code.value) {
    error.value = '未收到授权码'
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
 * 用于 URL 已携带 token 的场景（login.vue onSuccess 跳转、重定向循环回此页等）
 */
function redirectToTarget(token, userEncoded, isNewFlag) {
  const targetUrl = cEndUrl.value || returnUrl.value
  if (!targetUrl) {
    error.value = '未收到跳转地址（c_end_url 和 return_url 均缺失）'
    return
  }

  // 安全检查：如果 targetUrl 与 SSO 服务器同域且指向 auth-callback，
  // 说明 C 端未正确配置 return_url/c_end_url（应指向 v.joho.cn 等 C 端域名）
  try {
    const targetOrigin = new URL(targetUrl).origin
    const currentOrigin = window.location.origin
    if (targetOrigin === currentOrigin && targetUrl.includes('auth-callback')) {
      console.error('[SSO login-callback] 目标地址指向 SSO 服务器自身，C 端 return_url/c_end_url 配置有误:', targetUrl)
      error.value = '回调地址配置错误：return_url 应指向 C 端域名（如 v.joho.cn），当前指向 SSO 服务器。请检查 C 端 authConfig 配置并重新部署。'
      return
    }
  } catch {}

  const sep = targetUrl.includes('?') ? '&' : '?'
  const userPart = userEncoded ? `&user=${userEncoded}` : ''
  const isNewPart = isNewFlag ? `&isNew=${isNewFlag}` : ''
  loading.value = true
  console.log('[SSO login-callback] redirectToTarget:', targetUrl)
  window.location.href = `${targetUrl}${sep}token=${token}${userPart}${isNewPart}`
}

onLoad((options) => {
  init(options)
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
    // 优先跳转到 C 端（c_end_url），SSO 认证完成后直接回 C 端 auth-callback 写入 token
    // 无 c_end_url 时回退到 return_url（SSO 端 auth-callback 中转）
    const targetUrl = cEndUrl.value || returnUrl.value

    // 安全检查：同 redirectToTarget，防止 targetUrl 指向 SSO 服务器自身
    try {
      const targetOrigin = new URL(targetUrl).origin
      if (targetOrigin === window.location.origin && targetUrl.includes('auth-callback')) {
        throw new Error('回调地址配置错误：return_url 应指向 C 端域名（如 v.joho.cn），当前指向 SSO 服务器。请检查 C 端配置。')
      }
    } catch (urlErr) {
      if (urlErr.message.includes('回调地址配置错误')) throw urlErr
    }

    const sep = targetUrl.includes('?') ? '&' : '?'
    // 透传 is_new（标识首登用户），C 端 auth-callback 会存 storage，首页据此显示欢迎提示
    const isNewFlag = result.is_new === true || result.isNew === true ? '1' : ''
    const isNewParam = isNewFlag ? `&isNew=${isNewFlag}` : ''
    window.location.href = `${targetUrl}${sep}token=${token}&user=${userEncoded}${isNewParam}`
  } catch (e) {
    // 失败：跳回 sso/login 携带 error 参数，让用户用降级表单登录
    // 透传 invite_code/channel_code，保证降级登录也能建立分销关系
    // 透传 c_end_url，保证降级后仍能跳回 C 端
    error.value = e?.message || e?.error || 'token 兑换失败'
    // 注意：URLSearchParams.toString() 会自动对值做 application/x-www-form-urlencoded 编码
    // 不要再手动 encodeURIComponent，否则会导致 return_url 被双重编码
    const params = new URLSearchParams({
      app_code: appCode.value,
      return_url: returnUrl.value,
      error: error.value,
    })
    if (cEndUrl.value) params.append('c_end_url', cEndUrl.value)
    if (inviteCode.value) params.append('invite_code', inviteCode.value)
    if (channelCode.value) params.append('channel_code', channelCode.value)
    setTimeout(() => {
      uni.reLaunch({ url: `/pages/sso/login?${params.toString()}` })
    }, 1500) // 1.5 秒后跳转，让用户看到错误提示
  } finally {
    loading.value = false
  }
}

function backToLogin() {
  // 同样避免双重编码：URLSearchParams 会自动编码
  const params = new URLSearchParams({
    app_code: appCode.value,
    return_url: returnUrl.value,
  })
  if (cEndUrl.value) params.append('c_end_url', cEndUrl.value)
  if (inviteCode.value) params.append('invite_code', inviteCode.value)
  if (channelCode.value) params.append('channel_code', channelCode.value)
  uni.reLaunch({ url: `/pages/sso/login?${params.toString()}` })
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
.status { padding: 16px; border-radius: 8px; }
.status.error { background: #fee; color: #c00; }
.retry-btn {
  margin-top: 20px;
  padding: 10px 24px;
  background: #667eea;
  color: #fff;
  border-radius: 6px;
  display: inline-block;
}
</style>
