import { BASE_API, ADMIN_BASE_URL, TIMEOUT } from '../config/env.js'
import {
  getToken, setToken,
  getRefreshToken, setRefreshToken, removeRefreshToken,
  isTokenExpiring, setTokenExpiresAt, removeTokenExpiresAt,
  logout
} from './auth.js'

let isRefreshing = false
let refreshQueue = []

/**
 * 用 refresh_token 换取新的 access_token（对齐 strapi-course 的 SSO 持久化方案）
 *
 * 之前实现的 4 个 bug（导致 SSO 登录无法持久）：
 * 1. 刷新端点错误：用了 `/auth/refresh`，正确应为 `/zhao-sso/v1/auth/refresh`
 * 2. 字段名错误：解析 `res.data.token`，SSO 后端返回的是 `access_token`
 * 3. 不存过期时间：无法主动续期，只能被动等 401，用户频繁掉线
 * 4. body 字段名错误：传 `refreshToken`，后端期望 `refresh_token`
 */
async function refreshToken() {
  const refreshTokenValue = getRefreshToken()
  if (!refreshTokenValue) {
    throw new Error('No refresh token')
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_API}/zhao-sso/v1/auth/refresh`,
      method: 'POST',
      // 后端期望字段名为 refresh_token（snake_case），不是 refreshToken
      data: JSON.stringify({ refresh_token: refreshTokenValue }),
      timeout: TIMEOUT,
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          // SSO 后端返回字段：access_token / refresh_token / expires_in
          const newToken = res.data.access_token || res.data.jwt || res.data.token
          if (!newToken) {
            reject(new Error('Refresh response missing access_token'))
            return
          }
          const newRefreshToken = res.data.refresh_token || refreshTokenValue
          const expiresIn = res.data.expires_in || 900 // 默认 15 分钟

          setToken(newToken)
          setRefreshToken(newRefreshToken)
          // 提前 60 秒标记为过期，触发下次请求前主动刷新，避免请求中途过期
          setTokenExpiresAt(Date.now() + (expiresIn - 60) * 1000)
          console.log('[request] Token 刷新成功，下次到期:', new Date(Date.now() + (expiresIn - 60) * 1000).toLocaleTimeString())
          resolve(newToken)
        } else {
          // refresh_token 失效（被撤销/记录不存在）：清除无效 token，避免反复尝试
          const errMsg =
            typeof res.data?.error === 'string'
              ? res.data.error
              : res.data?.error?.message || ''
          if (
            errMsg.includes('Token 记录不存在') ||
            errMsg.includes('已被撤销') ||
            res.statusCode === 404
          ) {
            console.warn('[request] Refresh token 无效:', errMsg)
            removeRefreshToken()
            removeTokenExpiresAt()
          } else {
            console.warn('[request] Token 刷新失败:', res.statusCode, errMsg)
          }
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
  let token = getToken()

  // 主动刷新：token 即将过期（提前 60 秒）且本次请求不是刷新重试，
  // 先用 refresh_token 换新 token 再发请求，避免请求中途 401
  // 这是 SSO 登录"持久化"的关键 —— 不等 401 被动触发，提前续期
  if (token && !isRetry && isTokenExpiring() && !options.url.includes('/auth/refresh')) {
    try {
      if (!isRefreshing) {
        isRefreshing = true
        try {
          token = await refreshToken()
        } finally {
          isRefreshing = false
        }
      } else {
        // 复用正在进行的刷新请求
        token = await new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        })
      }
    } catch (e) {
      // 主动刷新失败不阻断请求，让旧 token 继续尝试，后续 401 时再走 logout
      console.warn('[request] 主动刷新 token 失败，使用旧 token 继续:', e.message)
      token = getToken()
    }
  }

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

  // UniApp H5 的 uni.request 不会自动对 POST/PUT/DELETE 的对象 data 进行 JSON.stringify，
  // 需要显式序列化，否则后端收到的是未经正确编码的请求体导致 400 错误。
  // 但 GET 请求的 data 应保持对象，由 UniApp 自动转为 URL query string（?key=value&...），
  // 如果先 JSON.stringify，参数会变成字符串 body，URL 上不会出现任何 query 参数。
  const method = (options.method ?? 'GET').toUpperCase()
  const isGet = method === 'GET'
  const requestData = !isGet && options.data !== undefined && options.data !== null && typeof options.data === 'object'
    ? JSON.stringify(options.data)
    : options.data

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_API}${options.url}`,
      method: options.method ?? 'GET',
      data: requestData,
      header,
      timeout: TIMEOUT,
      success: async (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data)
        } else if (res.statusCode === 401 && !isRetry) {
          // 被动兜底：主动刷新没拦住的 401（如后端提前过期/时钟漂移）
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

// 手动拼接 GET 请求的 query string，不依赖 uni.request 的自动转换（H5 端行为不可靠）
function buildQueryString(params) {
  if (!params || typeof params !== 'object') return ''
  return Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&')
}

function appendQuery(url, params) {
  const query = buildQueryString(params)
  if (!query) return url
  return url + (url.includes('?') ? '&' : '?') + query
}

export function get(url, params = {}) {
  return request({ url: appendQuery(url, params), method: 'GET' })
}

/**
 * 二进制文件下载（H5 用 Blob + <a download> 触发浏览器真实下载到下载目录）
 * @param {string} url 接口地址（不含 BASE_API）
 * @param {object} params 查询参数
 * @param {string} filename 下载保存的文件名
 */
export function downloadFile(url, params = {}, filename = 'download') {
  const dest = appendQuery(url, params)

  const doRequest = (retried) => new Promise((resolve, reject) => {
    const header = { 'Content-Type': 'application/x-www-form-urlencoded' }
    const token = getToken()
    if (token) header['Authorization'] = `Bearer ${token}`
    const tenantId = uni.getStorageSync('tadmin_current_tenant_id')
    if (tenantId) header['x-site-id'] = String(tenantId)

    uni.request({
      url: `${BASE_API}${dest}`,
      method: 'GET',
      header,
      responseType: 'arraybuffer',
      timeout: TIMEOUT,
      success: async (res) => {
        if (res.statusCode === 200) {
          try {
            const saved = triggerBrowserDownload(res.data, filename)
            resolve(saved)
          } catch (e) {
            reject(e)
          }
        } else if (res.statusCode === 401 && !retried) {
          try {
            await refreshToken()
            resolve(doRequest(true))
          } catch (e) {
            logout()
            uni.showToast({ title: '登录已过期', icon: 'none' })
            reject(new Error('Unauthorized'))
          }
        } else {
          const msg = extractErrorMessage(res.data)
          uni.showToast({ title: msg || '下载失败', icon: 'none' })
          reject(new Error(msg))
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络请求失败', icon: 'none' })
        reject(err)
      }
    })
  })

  return doRequest(false)
}

function triggerBrowserDownload(arrayBuffer, filename) {
  // 仅 H5 端支持 Blob + <a download>；非 H5 环境直接抛错由调用方提示
  if (typeof document === 'undefined' || typeof Blob === 'undefined') {
    throw new Error('当前平台不支持文件下载')
  }
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return filename
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
  // GET 请求保持对象 data，由 UniApp 自动转为 query string
  const method = (options.method ?? 'GET').toUpperCase()
  const isGet = method === 'GET'
  const requestData = !isGet && options.data !== undefined && options.data !== null && typeof options.data === 'object'
    ? JSON.stringify(options.data)
    : options.data
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_API}${options.url}`,
      method: options.method ?? 'GET',
      data: requestData,
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
  return publicRequest({ url: appendQuery(url, params), method: 'GET' })
}

async function adminRequest(options) {
  let token = getToken()

  // 主动刷新：管理后台 API 同样需要 token 续期（与 request() 一致）
  if (token && isTokenExpiring() && !options.url.includes('/auth/refresh')) {
    try {
      if (!isRefreshing) {
        isRefreshing = true
        try {
          token = await refreshToken()
        } finally {
          isRefreshing = false
        }
      } else {
        token = await new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        })
      }
    } catch (e) {
      console.warn('[adminRequest] 主动刷新 token 失败，使用旧 token 继续:', e.message)
      token = getToken()
    }
  }

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

  // GET 请求保持对象 data，由 UniApp 自动转为 query string
  const method = (options.method ?? 'GET').toUpperCase()
  const isGet = method === 'GET'
  const requestData = !isGet && options.data !== undefined && options.data !== null && typeof options.data === 'object'
    ? JSON.stringify(options.data)
    : options.data

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${ADMIN_BASE_URL || BASE_API}${options.url}`,
      method: options.method ?? 'GET',
      data: requestData,
      header,
      timeout: TIMEOUT,
      success: async (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data)
        } else if (res.statusCode === 401) {
          // 被动兜底：token 过期，尝试刷新一次
          try {
            const newToken = await refreshToken()
            header['Authorization'] = `Bearer ${newToken}`
            const retryRes = await adminRequest({ ...options, header })
            resolve(retryRes)
          } catch (err) {
            uni.showToast({ title: '登录已过期', icon: 'none' })
            logout()
            reject(new Error('Unauthorized'))
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

export function adminGet(url, params = {}) {
  return adminRequest({ url: appendQuery(url, params), method: 'GET' })
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