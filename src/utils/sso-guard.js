/**
 * SSO 跳转守卫（管理后台版）
 *
 * 防止 SSO 服务不可用或回跳未登录导致死循环：
 * - 每次 SSO 跳转计数 +1，并启动 3 秒超时定时器
 * - 连续 3 次跳转未完成登录，阻断 SSO 强制逻辑，引导本地登录
 * - 登录成功后清除计数（由 login/callback 调用 clearSsoRedirectAttempts）
 *
 * storage 键：
 * - webSsoRedirectAttempts：连续跳转次数
 * - webSsoRedirectLastAt：上次跳转时间戳（调试用）
 */

const STORAGE_KEY = 'webSsoRedirectAttempts'
const STORAGE_TS = 'webSsoRedirectLastAt'

/** 最大连续跳转次数，超过即阻断 */
export const MAX_SSO_ATTEMPTS = 3

/** 单次跳转超时时间（毫秒），超时后认为本次跳转未完成登录 */
export const SSO_REDIRECT_TIMEOUT = 3000

/**
 * 检查 SSO 跳转是否被阻断
 * - 当连续跳转次数 >= MAX_SSO_ATTEMPTS 时返回 true
 */
export function isSsoRedirectBlocked() {
  const count = Number(uni.getStorageSync(STORAGE_KEY) || 0)
  return count >= MAX_SSO_ATTEMPTS
}

/**
 * 获取当前连续跳转次数
 */
export function getSsoRedirectAttempts() {
  return Number(uni.getStorageSync(STORAGE_KEY) || 0)
}

/**
 * SSO 跳转前置守卫
 *
 * 在执行 window.location.href 跳转 SSO 前调用：
 * - 已达上限：返回 false，调用方应降级到本地登录
 * - 未达上限：计数 +1，写入时间戳，启动 3 秒超时定时器，返回 true
 *
 * 3 秒超时定时器：window.location.href 成功跳转后页面卸载，定时器自然失效；
 * 若 3 秒后仍在原页面（SSO 服务不可达/网络异常），仅打印警告，计数已写入 storage，
 * 下次进入页面时由 isSsoRedirectBlocked 判断是否阻断。
 *
 * @returns 是否允许继续跳转
 */
export function guardSsoRedirect() {
  const count = Number(uni.getStorageSync(STORAGE_KEY) || 0)
  if (count >= MAX_SSO_ATTEMPTS) {
    console.warn(`[sso-guard] SSO 跳转已达上限（${count}/${MAX_SSO_ATTEMPTS}），阻断强制跳转`)
    return false
  }

  const next = count + 1
  uni.setStorageSync(STORAGE_KEY, String(next))
  uni.setStorageSync(STORAGE_TS, String(Date.now()))
  console.log(`[sso-guard] SSO 跳转计数 ${next}/${MAX_SSO_ATTEMPTS}，启动 3 秒超时定时器`)

  setTimeout(() => {
    console.warn(`[sso-guard] SSO 跳转 3 秒后仍在原页面，可能跳转失败（第 ${next} 次）`)
  }, SSO_REDIRECT_TIMEOUT)

  return true
}

/**
 * 清除 SSO 跳转计数
 *
 * 登录成功后必须调用，否则用户主动取消登录后再进入会被误阻断。
 * 由 login/callback 在写入 token 后调用。
 */
export function clearSsoRedirectAttempts() {
  uni.removeStorageSync(STORAGE_KEY)
  uni.removeStorageSync(STORAGE_TS)
}
