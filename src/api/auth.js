import { get, post, put, del } from '../utils/request.js'
import { extractItem } from '../utils/format.js'

const V1 = '/zhao-auth/v1'
const MY = `${V1}/my`
const ADMIN = `${V1}/admin`

export function login(identifier, password) {
  return post(`${V1}/login`, { identifier, password })
}

export function adminLogin(identifier, password, tenantCode) {
  const data = { identifier, password }
  if (tenantCode) data.tenantCode = tenantCode
  return post(`${ADMIN}/auth/local`, data)
}

export function getMyRoles() {
  return get(`${MY}/roles`)
}

export function getMyPermissionKeys() {
  return get(`${MY}/permission-keys`).then(res => {
    const data = res?.data ?? res
    return data?.permissions ?? []
  })
}

// ===== 权限管理（Admin） =====

export function getPermissionTree() {
  return get(`${ADMIN}/permissions/tree`).then(res => {
    return res?.data ?? res
  })
}

export function getRolePermissions(role) {
  return get(`${ADMIN}/permissions/role/${role}`).then(res => {
    return res?.data ?? res
  })
}

export function updateRolePermissions(role, permissions) {
  return put(`${ADMIN}/permissions/role/${role}`, { permissions }).then(extractItem)
}

export function initRoles() {
  return post(`${ADMIN}/permissions/init`).then(extractItem)
}

export function initPermissions() {
  return initRoles()
}

// ===== 角色管理 CRUD =====

export function getRoles(params = {}) {
  return get(`${ADMIN}/roles`, params).then(res => {
    const data = res?.data ?? res
    return { list: data.list ?? [], pagination: data.pagination ?? {} }
  })
}

export function getAllRoles() {
  return get(`${ADMIN}/roles/all`).then(res => {
    const data = res?.data ?? res
    return data.list ?? []
  })
}

export function getRole(role) {
  return get(`${ADMIN}/roles/${role}`).then(res => res?.data ?? res)
}

export function createRole(data) {
  return post(`${ADMIN}/roles`, data).then(res => res?.data ?? res)
}

export function updateRole(role, data) {
  return put(`${ADMIN}/roles/${role}`, data).then(res => res?.data ?? res)
}

export function deleteRole(role) {
  return del(`${ADMIN}/roles/${role}`).then(res => res?.data ?? res)
}

// ===== 当前用户渠道范围 =====
export function getMyChannelScope() {
  return get(`${MY}/channel-scope`)
}

// ===== 角色-渠道授权 =====

export function getRoleChannels(role, params = {}) {
  return get(`${ADMIN}/role-channels`, { ...params, role }).then(res => {
    const data = res?.data ?? res
    return data.list ?? data ?? []
  })
}

export function grantRoleChannel(role, channelId) {
  return post(`${ADMIN}/role-channels`, { role, channelId }).then(extractItem)
}

export function batchGrantRoleChannel(role, channelIds) {
  return post(`${ADMIN}/role-channels/batch`, { role, channelIds }).then(extractItem)
}

export function revokeRoleChannel(id) {
  return del(`${ADMIN}/role-channels/${id}`).then(extractItem)
}

export function revokeRoleChannelByRole(role) {
  return del(`${ADMIN}/role-channels/role/${role}`).then(extractItem)
}

// ===== 当前用户租户列表 =====
export function getMyTenants() {
  return get(`${MY}/tenants`)
}

// ===== 切换当前租户（签发新 JWT 携带 currentTenantId） =====
export function switchTenant(tenantId) {
  return post(`${V1}/auth/switch-tenant`, { tenantId }).then(res => res?.data ?? res)
}
