<template>
  <view class="sso-login-page">
    <view class="page-header">
      <text class="page-title">joho 统一登录</text>
	  <text class="page-slogan">{{ randomSlogan }}</text>
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
// ==========【新增 20条广告语数组+响应式变量】==========
const sloganList = [
  "joho · 连接美好，共创未来",
  "一站式统一账号，通行所有服务",
  "一个账号，解锁全部精彩",
  "安全便捷登录，开启全新体验",
  "以信任为基石，伴你一路前行",
  "智慧互联，服务随心可达",
  "joho相伴，万事简单",
  "打通数字世界，只需一次登录",
  "守护你的账号安全，我们全力以赴",
  "同心同行，共建有温度的数字平台",
  "便捷通行，智慧生活由此开始",
  "一份信任，无限服务",
  "简化登录流程，释放更多可能",
  "链接资源，赋能每一位使用者",
  "安心登录，放心使用",
  "汇聚价值，共享成长",
  "开启账号之旅，遇见更多精彩",
  "以人为本，打造人性化数字服务",
  "跨平台无缝通行，体验无边界服务",
  "joho，让连接更有价值"
]
const randomSlogan = ref('')
onLoad((options) => {
  appCode.value = options?.app_code || ''
  returnUrl.value = options?.return_url ? decodeURIComponent(options.return_url) : ''
  cEndUrl.value = options?.c_end_url ? decodeURIComponent(options.c_end_url) : ''
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
// ==========【新增：页面加载随机抽取一条标语】==========
  randomSlogan.value = sloganList[Math.floor(Math.random() * sloganList.length)]
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
  // result: { access_token, refresh_token, user, is_new, expires_in }
  const token = result.access_token || result.jwt || result.token
  // 优先跳转到 C 端（c_end_url），无 c_end_url 时回退到 return_url
  const targetUrl = cEndUrl.value || returnUrl.value
  if (!token || !targetUrl) {
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
  // 透传 refresh_token 和 expires_in，C 端 auth-callback 需要存储以支持 token 刷新
  const refreshTokenVal = result.refresh_token || ''
  const expiresInVal = result.expires_in || 900
  const refreshTokenParam = refreshTokenVal ? `&refresh_token=${refreshTokenVal}` : ''
  const expiresInParam = `&expires_in=${expiresInVal}`
  window.location.href = `${targetUrl}${sep}token=${token}&user=${userEncoded}${isNewParam}${refreshTokenParam}${expiresInParam}`
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
/* ==========【新增标语样式】========== */
.page-slogan {
  display:block;
  margin-top:10px;
  font-size:14px;
  color:#666;
  line-height:1.6;
}
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
