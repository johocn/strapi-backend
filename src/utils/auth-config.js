/**
 * Web后台认证配置工具
 */
import { get } from './request.js'

let cachedConfig = null

const DEFAULT_CONFIG = {
  mode: 'local',
  methods: ['password'],
  ssoLoginUrl: null,
  wechatOfficialAccountEnabled: false,
  wechatMiniProgramEnabled: false,
  wechatOpenPlatformEnabled: false,
  alipayEnabled: false,
  douyinEnabled: false,
  thirdPartyEnabled: false,
  ssoEnabled: false,
  registerEnabled: true
}

/**
 * 获取认证配置（带缓存）
 */
export async function fetchAuthConfig() {
  if (cachedConfig) return cachedConfig

  try {
    const res = await get('/zhao-auth/v1/auth/config')
    cachedConfig = res
    return res
  } catch (e) {
    console.warn('[auth-config] Failed to fetch, use default:', e)
    return DEFAULT_CONFIG
  }
}

/**
 * 清除缓存
 */
export function clearAuthConfigCache() {
  cachedConfig = null
}

/**
 * 从storage读取（同步）
 */
export function getStoredAuthConfig() {
  try {
    const stored = uni.getStorageSync('webAuthConfig')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // ignore
  }
  return null
}