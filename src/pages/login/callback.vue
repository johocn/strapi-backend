<template>
  <view class="callback-page">
    <view class="callback-title">登录回调</view>
    <view v-if="loading" class="status">正在兑换 token...</view>
    <view v-else-if="error" class="status error">{{ error }}</view>
    <view v-else-if="success" class="status success">
      <view>登录成功，正在跳转...</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { publicPost } from '../../utils/request.js'
import { setToken, setRefreshToken, setTokenExpiresAt, setUser } from '../../utils/auth.js'
import { useUserStore } from '../../store/user.js'
import { clearSsoRedirectAttempts } from '../../utils/sso-guard.js'
import { onLoad } from '@dcloudio/uni-app'

const loading = ref(false)
const error = ref('')
const success = ref(false)

const userStore = useUserStore()

onLoad((options) => {
  // 优先从 URL query 取参数（SSO 标准 OAuth2 回跳格式：?code=xxx&state=xxx）
  let code = options?.code || ''
  let tokenParam = options?.token || ''
  let refreshTokenParam = options?.refresh_token || ''
  let expiresInParam = options?.expires_in || ''
  let userEncoded = options?.user || ''
  let isNewFlag = options?.isNew || ''

  // H5 hash 路由兜底：UniApp onLoad 可能因编码问题漏参，从 window.location 补充
  // #ifdef H5
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const hashQuery = window.location.hash.split('?')[1] || ''
    const hashParams = new URLSearchParams(hashQuery)
    code = code || urlParams.get('code') || hashParams.get('code') || ''
    tokenParam = tokenParam || urlParams.get('token') || hashParams.get('token') || ''
    refreshTokenParam = refreshTokenParam || urlParams.get('refresh_token') || hashParams.get('refresh_token') || ''
    expiresInParam = expiresInParam || urlParams.get('expires_in') || hashParams.get('expires_in') || ''
    userEncoded = userEncoded || urlParams.get('user') || hashParams.get('user') || ''
    isNewFlag = isNewFlag || urlParams.get('isNew') || hashParams.get('isNew') || ''
  }
  // #endif

  if (tokenParam) {
    // 场景：URL 已携带 token（SSO login-callback 直接转发），直接写入并跳转
    handleTokenRedirect(tokenParam, refreshTokenParam, expiresInParam, userEncoded, isNewFlag)
  } else if (code) {
    // 场景：标准 OAuth code 兑换流程
    exchangeToken(code)
  } else {
    error.value = '未收到授权码'
  }
})

/**
 * 处理 URL 已携带 token 的场景（SSO login-callback 直接转发）
 * 关键：必须同时保存 refresh_token 和 token_expires_at，
 * 否则 token 过期后会被登出（SSO 登录"无法持久"问题的根因）
 */
async function handleTokenRedirect(token, refreshTokenParam, expiresInParam, userEncoded, isNewFlag) {
  setToken(token)
  // 保存 refresh_token，用于 access_token 过期时主动续期
  if (refreshTokenParam) setRefreshToken(refreshTokenParam)
  // 保存过期时间（提前 60 秒标记，触发主动刷新避免请求中途过期）
  const expiresIn = Number(expiresInParam) || 900
  setTokenExpiresAt(Date.now() + (expiresIn - 60) * 1000)

  let user = {}
  if (userEncoded) {
    try {
      // user 参数是 base64(encodeURIComponent(JSON.stringify(user)))
      user = JSON.parse(decodeURIComponent(atob(userEncoded)))
      setUser(user)
    } catch (e) {
      console.warn('[login-callback] user 解析失败:', e)
    }
  }
  // 即使 user 为空也要调用 setUserData，确保 Pinia store 的 token 状态一致
  userStore.setUserData({ user, token, refresh_token: refreshTokenParam, expires_in: expiresIn })

  if (isNewFlag === '1' || isNewFlag === 'true') {
    uni.setStorageSync('isNewUser', '1')
  }
  // 登录成功：清除 SSO 跳转计数
  clearSsoRedirectAttempts()
  success.value = true

  // 加载完整的用户角色/权限/渠道/租户数据（与 auth-callback 三方登录回调保持一致）
  await loadUserData()
  redirectToDashboard()
}

/**
 * 标准 OAuth code 兑换流程
 * 使用 /auth/exchange-token 端点（前端代理，不暴露 app_secret）
 */
async function exchangeToken(authCode) {
  loading.value = true
  try {
    // 管理后台 SSO 回调地址（与 login/index.vue redirectToSso 中一致）
    const redirectUri = window.location.origin + '/#/pages/login/callback'
    // app_code 从 storage 读取（登录页跳转前已存 authConfig），默认 'admin'
    const storedConfig = uni.getStorageSync('webAuthConfig')
    let appCode = 'admin'
    try {
      if (storedConfig) {
        const cfg = JSON.parse(storedConfig)
        appCode = cfg?.ssoAppCode || 'admin'
      }
    } catch { /* ignore */ }

    const result = await publicPost('/zhao-sso/v1/auth/exchange-token', {
      code: authCode,
      app_code: appCode,
      redirect_uri: redirectUri,
    })

    const token = result.access_token || result.jwt || result.token
    if (!token) throw new Error('未获取到 token')

    setToken(token)
    // 关键：保存 refresh_token 和 token_expires_at，否则 access_token 过期后会被登出（无法持久）
    const refreshTokenVal = result.refresh_token || ''
    const expiresIn = result.expires_in || 900
    if (refreshTokenVal) setRefreshToken(refreshTokenVal)
    setTokenExpiresAt(Date.now() + (expiresIn - 60) * 1000)

    const user = result.user || {}
    if (result.user) setUser(user)
    // 即使 user 为空也要调用 setUserData，确保 Pinia store 的 token 状态一致
    userStore.setUserData({ user, token, refresh_token: refreshTokenVal, expires_in: expiresIn })

    if (result.is_new === true || result.isNew === true) {
      uni.setStorageSync('isNewUser', '1')
    }

    // 登录成功：清除 SSO 跳转计数
    clearSsoRedirectAttempts()
    success.value = true
    loading.value = false

    // 加载完整的用户角色/权限/渠道/租户数据（与 auth-callback 三方登录回调保持一致）
    await loadUserData()
    redirectToDashboard()
  } catch (e) {
    loading.value = false
    error.value = e?.message || e?.error_description || 'token 兑换失败'
    console.error('[login-callback] exchangeToken failed:', e)
    // 兑换失败：3 秒后跳回登录页
    setTimeout(() => {
      // #ifdef H5
      window.location.href = window.location.origin + '/#/pages/login/index'
      // #endif
      // #ifndef H5
      uni.redirectTo({ url: '/pages/login/index' })
      // #endif
    }, 3000)
  }
}

/**
 * 加载完整的用户数据（角色/权限/渠道范围/租户列表）
 * 缺失会导致：dashboard 模块入口全部不显示（v-if="hasPermission(...)" 失败）
 *            多租户场景下 x-site-id header 不被注入，请求 403
 */
async function loadUserData() {
  try {
    await Promise.all([
      userStore.fetchUserRoles(),
      userStore.fetchPermissions(),
      userStore.fetchChannelScope(),
      userStore.fetchTenants(),
    ])
  } catch (e) {
    console.warn('[login-callback] loadUserData 部分失败:', e)
  }
}

/**
 * 跳转仪表盘
 * 使用 window.location.href 绕过 UniApp H5 KeepAlive bug（符合 memory 规范）
 */
function redirectToDashboard() {
  setTimeout(() => {
    // #ifdef H5
    window.location.href = window.location.origin + '/#/pages/dashboard/index'
    // #endif
    // #ifndef H5
    uni.redirectTo({ url: '/pages/dashboard/index' })
    // #endif
  }, 500)
}
</script>

<style scoped>
.callback-page {
  padding: 40px 20px;
  max-width: 480px;
  margin: 0 auto;
}

.callback-title {
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
}

.status {
  text-align: center;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.status.error {
  background: #fee;
  color: #c00;
}

.status.success {
  background: #efe;
  color: #060;
}
</style>
