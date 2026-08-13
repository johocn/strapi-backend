export function getToken() {
  try {
    return uni.getStorageSync('tadmin_token') ?? localStorage.getItem('tadmin_token') ?? ''
  } catch {
    return ''
  }
}

export function setToken(token) {
  try {
    uni.setStorageSync('tadmin_token', token)
    localStorage.setItem('tadmin_token', token)
  } catch (e) { /* ignore storage errors */ }
}

export function removeToken() {
  try {
    uni.removeStorageSync('tadmin_token')
    localStorage.removeItem('tadmin_token')
  } catch { /* ignore storage errors */ }
}

export function getRefreshToken() {
  try {
    return uni.getStorageSync('tadmin_refresh_token') ?? localStorage.getItem('tadmin_refresh_token') ?? ''
  } catch {
    return ''
  }
}

export function setRefreshToken(refreshToken) {
  try {
    uni.setStorageSync('tadmin_refresh_token', refreshToken)
    localStorage.setItem('tadmin_refresh_token', refreshToken)
  } catch { /* ignore storage errors */ }
}

export function removeRefreshToken() {
  try {
    uni.removeStorageSync('tadmin_refresh_token')
    localStorage.removeItem('tadmin_refresh_token')
  } catch { /* ignore storage errors */ }
}

// ===== Token 过期管理（对齐 strapi-course 的 SSO 持久化方案）=====
// access_token 有效期较短（通常 15-30 分钟），必须配合 refresh_token 主动续期，
// 否则用户会频繁被登出（这是 SSO 登录"无法持久"问题的根因）

export function getTokenExpiresAt() {
  try {
    return uni.getStorageSync('tadmin_token_expires_at') ?? localStorage.getItem('tadmin_token_expires_at') ?? ''
  } catch {
    return ''
  }
}

export function setTokenExpiresAt(expiresAt) {
  try {
    uni.setStorageSync('tadmin_token_expires_at', String(expiresAt))
    localStorage.setItem('tadmin_token_expires_at', String(expiresAt))
  } catch (e) { /* ignore storage errors */ }
}

export function removeTokenExpiresAt() {
  try {
    uni.removeStorageSync('tadmin_token_expires_at')
    localStorage.removeItem('tadmin_token_expires_at')
  } catch { /* ignore storage errors */ }
}

/**
 * 检查 token 是否即将过期（提前 60 秒触发刷新，避免请求中途过期）
 * 没有 expires_at 时不触发主动刷新，让 401 兜底
 */
export function isTokenExpiring() {
  const expiresAt = getTokenExpiresAt()
  if (!expiresAt) return false
  return Date.now() >= Number(expiresAt)
}

export function getUser() {
  try {
    const userStr = uni.getStorageSync('tadmin_user') ?? localStorage.getItem('tadmin_user') ?? '{}'
    return JSON.parse(userStr)
  } catch {
    return {}
  }
}

export function setUser(user) {
  try {
    const userStr = JSON.stringify(user)
    uni.setStorageSync('tadmin_user', userStr)
    localStorage.setItem('tadmin_user', userStr)
  } catch { /* ignore storage errors */ }
}

export function removeUser() {
  try {
    uni.removeStorageSync('tadmin_user')
    localStorage.removeItem('tadmin_user')
  } catch { /* ignore storage errors */ }
}

/**
 * 绕过 UniApp H5 Vue 3 KeepAlive bug 的安全路由跳转
 * 在 H5 环境下使用 window.location.href 直接跳转，避免 KeepAlive 缓存导致页面空白
 * 在非 H5 环境下回退到 uni.reLaunch 正常行为
 */
function safeReLaunch(url) {
  // #ifdef H5
  window.location.href = window.location.origin + '/#' + url
  // #endif
  // #ifndef H5
  uni.reLaunch({ url })
  // #endif
}

export function logout() {
  removeToken()
  removeRefreshToken()
  removeTokenExpiresAt()
  removeUser()
  safeReLaunch('/pages/login/index')
}

export function isLoggedIn() {
  return !!getToken()
}

export function checkAuth() {
  if (!isLoggedIn()) {
    safeReLaunch('/pages/login/index')
    return false
  }
  return true
}

export function hasRole(role) {
  const user = getUser()
  const roles = user.roles ?? []
  return Array.isArray(roles) ? roles.includes(role) : roles === role
}

export function hasAnyRole(roles) {
  return roles.some(role => hasRole(role))
}

export function isAdmin() {
  return hasRole('admin') || hasRole('channel-admin')
}
