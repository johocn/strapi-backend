import { get, post } from '../utils/request.js'
import { extractList, extractItem } from '../utils/format.js'

export const ROLES = {
  ADMIN: 'admin',
  CHANNEL_ADMIN: 'channel-admin',
  PLUGIN_MANAGER: 'plugin-manager',
  INSTRUCTOR: 'instructor',
  USER: 'user'
}

export const ROLE_LABELS = {
  [ROLES.ADMIN]: '系统管理员',
  [ROLES.CHANNEL_ADMIN]: '渠道管理员',
  [ROLES.PLUGIN_MANAGER]: '插件管理员',
  [ROLES.INSTRUCTOR]: '讲师',
  [ROLES.USER]: '普通用户'
}

const ADMIN_PREFIX = '/zhao-auth/v1/admin'

export function getUsers(params = {}) {
  return get(`${ADMIN_PREFIX}/users`, params).then(res => {
    const result = extractList(res)
    return result
  })
}

export function assignRole(userId, role, reason) {
  return post(`${ADMIN_PREFIX}/roles/assign`, { userId, role, reason }).then(extractItem)
}

export function revokeRole(userId, role, reason) {
  return post(`${ADMIN_PREFIX}/roles/revoke`, { userId, role, reason }).then(extractItem)
}

export function getUserRoles(userId) {
  return get(`${ADMIN_PREFIX}/users/${userId}/roles`).then(extractItem)
}

export function batchAssignRoles(userIds, role, reason) {
  return post(`${ADMIN_PREFIX}/roles/batch-assign`, { userIds, role, reason }).then(extractItem)
}

export function getActionLogs(params = {}) {
  return get(`${ADMIN_PREFIX}/roles/logs`, params).then(extractList)
}

export function getUserDetail(userId) {
  return get(`${ADMIN_PREFIX}/users/${userId}/detail`).then(extractItem)
}

export function getAssignableRoles() {
  return get(`${ADMIN_PREFIX}/assignable-roles`).then(extractItem)
}

/**
 * 单用户多角色分配（前端循环调用单角色 API）
 * @param {number} userId
 * @param {string[]} roles 角色名数组
 * @param {string} reason 操作原因
 * @returns {Promise<Array<{role: string, success: boolean, error?: string}>>}
 */
export async function assignRoles(userId, roles, reason = '') {
  const results = []
  for (const role of roles) {
    try {
      await assignRole(userId, role, reason)
      results.push({ role, success: true })
    } catch (e) {
      results.push({ role, success: false, error: e.message })
    }
  }
  return results
}

/**
 * 单用户多角色撤销（前端循环调用单角色 API）
 * @param {number} userId
 * @param {string[]} roles 角色名数组
 * @param {string} reason 操作原因
 * @returns {Promise<Array<{role: string, success: boolean, error?: string}>>}
 */
export async function revokeRoles(userId, roles, reason = '') {
  const results = []
  for (const role of roles) {
    try {
      await revokeRole(userId, role, reason)
      results.push({ role, success: true })
    } catch (e) {
      results.push({ role, success: false, error: e.message })
    }
  }
  return results
}

/**
 * 多用户多角色批量分配（前端双层循环调用单角色 API）
 * @param {number[]} userIds
 * @param {string[]} roles 角色名数组
 * @param {string} reason 操作原因
 * @returns {Promise<Array<{userId: number, role: string, success: boolean, error?: string}>>}
 */
export async function batchAssignRolesMulti(userIds, roles, reason = '') {
  const results = []
  for (const userId of userIds) {
    for (const role of roles) {
      try {
        await assignRole(userId, role, reason)
        results.push({ userId, role, success: true })
      } catch (e) {
        results.push({ userId, role, success: false, error: e.message })
      }
    }
  }
  return results
}
