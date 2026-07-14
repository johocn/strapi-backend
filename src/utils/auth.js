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

export function logout() {
  removeToken()
  removeRefreshToken()
  removeUser()
  uni.reLaunch({ url: '/pages/login/index' })
}

export function isLoggedIn() {
  return !!getToken()
}

export function checkAuth() {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/login/index' })
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
