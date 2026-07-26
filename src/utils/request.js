import { BASE_API, ADMIN_BASE_URL, TIMEOUT } from '../config/env.js'
import { getToken, setToken, getRefreshToken, logout } from './auth.js'

let isRefreshing = false
let refreshQueue = []

async function refreshToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token')
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_API}/auth/refresh`,
      method: 'POST',
      data: { refreshToken },
      timeout: TIMEOUT,
      success: (res) => {
        if (res.statusCode === 200) {
          const { token } = res.data
          setToken(token)
          resolve(token)
        } else {
          reject(new Error('Refresh token failed'))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

// 常见英文错误的中文翻译（防御后端遗漏，统一前端兜底）
const ERROR_TRANSLATIONS = {
  'Invalid identifier or password': '账号或密码错误',
  'Invalid credentials': '账号或密码错误',
  'Email or username are already taken': '用户名或邮箱已被注册',
  'Email is already taken': '邮箱已被注册',
  'Username already taken': '用户名已被注册',
  'Provided identifier does not exist': '账号不存在',
  'User does not exist': '账号不存在',
  'Your account has been blocked': '账户已被锁定，请联系管理员',
  'Your account email is not confirmed': '邮箱尚未激活，请先查收激活邮件',
}

function translateError(msg) {
  if (!msg || typeof msg !== 'string') return msg
  // 精确匹配
  if (ERROR_TRANSLATIONS[msg]) return ERROR_TRANSLATIONS[msg]
  // 包含匹配（处理带后缀的消息）
  for (const en of Object.keys(ERROR_TRANSLATIONS)) {
    if (msg.includes(en)) return ERROR_TRANSLATIONS[en]
  }
  return msg
}

function extractErrorMessage(data) {
  // 兼容多种后端错误返回结构：
  // {error: "字符串"} / {error: {message: "..."}} / {message: "..."} / {detail: "..."}
  let msg = data?.error?.message ?? data?.error ?? data?.message ?? data?.detail ?? ''
  if (typeof msg !== 'string') msg = String(msg || '')
  return translateError(msg)
}

async function request(options, isRetry = false) {
  const token = getToken()
  const header = {
    'Content-Type': 'application/json',
    ...options.header
  }
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }
  // 注入 x-site-id（多租户上下文，支持数字 id 或 documentId）
  const tenantId = uni.getStorageSync('tadmin_current_tenant_id')
  if (tenantId) {
    header['x-site-id'] = String(tenantId)
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_API}${options.url}`,
      method: options.method ?? 'GET',
      data: options.data,
      header,
      timeout: TIMEOUT,
      success: async (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data)
        } else if (res.statusCode === 401 && !isRetry) {
          if (!isRefreshing) {
            isRefreshing = true
            try {
              const newToken = await refreshToken()
              isRefreshing = false
              refreshQueue.forEach(cb => cb.resolve(newToken))
              refreshQueue = []
              header['Authorization'] = `Bearer ${newToken}`
              const retryRes = await request({ ...options, header }, true)
              resolve(retryRes)
            } catch (err) {
              isRefreshing = false
              refreshQueue.forEach(cb => cb.reject(err))
              refreshQueue = []
              uni.showToast({ title: '登录已过期', icon: 'none' })
              logout()
              reject(new Error('Unauthorized'))
            }
          } else {
            await new Promise((resolve, reject) => {
              refreshQueue.push({
                resolve: (newToken) => {
                  header['Authorization'] = `Bearer ${newToken}`
                  resolve(newToken)
                },
                reject
              })
            })
            const retryRes = await request({ ...options, header }, true)
            resolve(retryRes)
          }
        } else {
          let msg = extractErrorMessage(res.data)
          if (res.statusCode === 403) {
            msg = '无权访问该资源'
          } else if (res.statusCode === 404) {
            msg = '资源不存在'
          } else if (res.statusCode >= 500) {
            msg = '服务异常，请稍后重试'
          }
          uni.showToast({ title: msg, icon: 'none' })
          reject(new Error(msg))
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络请求失败', icon: 'none' })
        reject(err)
      }
    })
  })
}

export function get(url, params = {}) {
  return request({ url, method: 'GET', data: params })
}

export function post(url, data = {}) {
  return request({ url, method: 'POST', data })
}

export function put(url, data = {}) {
  return request({ url, method: 'PUT', data })
}

export function del(url, data = {}) {
  return request({ url, method: 'DELETE', data })
}

// 公开接口请求（不触发 401 token 刷新/登出逻辑，用于 /zhao-sso/v1/auth/* 等公开认证接口）
// 这些接口自身可能返回 401（如密码错误），不应被误判为"token 过期"而触发 logout 重定向
async function publicRequest(options) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_API}${options.url}`,
      method: options.method ?? 'GET',
      data: options.data,
      header: { 'Content-Type': 'application/json', ...(options.header || {}) },
      timeout: TIMEOUT,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          let msg = extractErrorMessage(res.data)
          if (res.statusCode >= 500) {
            msg = '服务异常，请稍后重试'
          }
          uni.showToast({ title: msg, icon: 'none' })
          reject({ message: msg, status: res.statusCode, data: res.data })
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络请求失败', icon: 'none' })
        reject(err)
      }
    })
  })
}

export function publicPost(url, data = {}) {
  return publicRequest({ url, method: 'POST', data })
}

export function publicGet(url, params = {}) {
  return publicRequest({ url, method: 'GET', data: params })
}

async function adminRequest(options) {
  const token = uni.getStorageSync('tadmin_token') ?? localStorage.getItem('tadmin_token')
  const header = {
    'Content-Type': 'application/json',
  }
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }
  // 注入 x-site-id（多租户上下文，支持数字 id 或 documentId）
  const tenantId = uni.getStorageSync('tadmin_current_tenant_id')
  if (tenantId) {
    header['x-site-id'] = String(tenantId)
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${ADMIN_BASE_URL || BASE_API}${options.url}`,
      method: options.method ?? 'GET',
      data: options.data,
      header,
      timeout: TIMEOUT,
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data)
        } else {
          let msg = extractErrorMessage(res.data)
          if (res.statusCode === 403) {
            msg = '无权访问该资源'
          } else if (res.statusCode === 404) {
            msg = '资源不存在'
          } else if (res.statusCode >= 500) {
            msg = '服务异常，请稍后重试'
          }
          uni.showToast({ title: msg, icon: 'none' })
          reject(new Error(msg))
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络请求失败', icon: 'none' })
        reject(err)
      }
    })
  })
}

export function adminGet(url, params = {}) {
  return adminRequest({ url, method: 'GET', data: params })
}

export function adminPost(url, data = {}) {
  return adminRequest({ url, method: 'POST', data })
}

export function adminPut(url, data = {}) {
  return adminRequest({ url, method: 'PUT', data })
}

export function adminDel(url, data = {}) {
  return adminRequest({ url, method: 'DELETE', data })
}

export default request