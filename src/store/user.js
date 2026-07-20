import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ROLES } from '../api/role-management.js'
import { adminLogin as adminLoginApi, getMyPermissionKeys, getMyChannelScope, getMyRoles, getMyTenants } from '../api/auth.js'
import { clearConfigCache } from '../utils/config-helper.js'

function safeJsonParse(str, fallback) {
  if (!str || typeof str !== 'string' || str.trim() === '') return fallback
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const userInfo = ref({})
  const roles = ref([])
  const permissions = ref([])
  const channelScope = ref({ all: false, channelIds: [] })
  const tenantList = ref([])
  const currentTenantId = ref(null)

  function loadFromStorage() {
    try {
      return {
        token: uni.getStorageSync('tadmin_token') ?? localStorage.getItem('tadmin_token') ?? '',
        user: uni.getStorageSync('tadmin_user') ?? localStorage.getItem('tadmin_user') ?? '{}',
        roles: uni.getStorageSync('tadmin_roles') ?? localStorage.getItem('tadmin_roles') ?? '[]',
        permissions: uni.getStorageSync('tadmin_permissions') ?? localStorage.getItem('tadmin_permissions') ?? '[]',
        tenantList: uni.getStorageSync('tadmin_tenant_list') ?? localStorage.getItem('tadmin_tenant_list') ?? '[]',
        currentTenantId: uni.getStorageSync('tadmin_current_tenant_id') ?? localStorage.getItem('tadmin_current_tenant_id') ?? null,
      }
    } catch (e) {
      return {
        token: localStorage.getItem('tadmin_token') ?? '',
        user: localStorage.getItem('tadmin_user') ?? '{}',
        roles: localStorage.getItem('tadmin_roles') ?? '[]',
        permissions: localStorage.getItem('tadmin_permissions') ?? '[]',
        tenantList: localStorage.getItem('tadmin_tenant_list') ?? '[]',
        currentTenantId: localStorage.getItem('tadmin_current_tenant_id') ?? null,
      }
    }
  }

  const stored = loadFromStorage()
  token.value = stored.token
  userInfo.value = safeJsonParse(stored.user, {})
  roles.value = safeJsonParse(stored.roles, []).map(r => typeof r === 'string' ? r.toLowerCase() : r)
  permissions.value = safeJsonParse(stored.permissions, [])
  tenantList.value = safeJsonParse(stored.tenantList, [])
  if (stored.currentTenantId) {
    currentTenantId.value = stored.currentTenantId
  }

  const isLoggedIn = computed(() => !!token.value)
  const channelId = computed(() => userInfo.value?.channelId ?? null)
  const role = computed(() => userInfo.value?.role ?? 'user')
  const userId = computed(() => {
    return userInfo.value?.id ?? userInfo.value?.userId ?? userInfo.value?.user?.id ?? userInfo.value?.user?.userId ?? null
  })

  const hasRoleManagementPermission = computed(() => {
    return hasPermission('menu.user-roles')
  })

  function hasRole(roleName) {
    return roles.value.includes(roleName)
  }

  function hasPermission(key) {
    return permissions.value.includes(key)
  }

  function setUserData(data) {
    token.value = data.jwt ?? data.token ?? data.accessToken ?? ''
    userInfo.value = data.user ?? data.data ?? {}
    try {
      uni.setStorageSync('tadmin_token', token.value)
      uni.setStorageSync('tadmin_user', JSON.stringify(userInfo.value))
      localStorage.setItem('tadmin_token', token.value)
      localStorage.setItem('tadmin_user', JSON.stringify(userInfo.value))
    } catch (e) { /* ignore storage errors */ }
  }

  function setUserRoles(roleList) {
    roles.value = roleList || []
    try {
      uni.setStorageSync('tadmin_roles', JSON.stringify(roles.value))
      localStorage.setItem('tadmin_roles', JSON.stringify(roles.value))
    } catch (e) { /* ignore storage errors */ }
  }

  function setUserPermissions(permsList) {
    permissions.value = permsList || []
    try {
      uni.setStorageSync('tadmin_permissions', JSON.stringify(permissions.value))
      localStorage.setItem('tadmin_permissions', JSON.stringify(permissions.value))
    } catch (e) { /* ignore storage errors */ }
  }

  async function fetchUserRoles() {
    if (!userId.value) {
      return []
    }
    try {
      const result = await getMyRoles()
      const roleNames = result?.roles?.map(r => r.name.toLowerCase()) ?? []
      setUserRoles(roleNames)
      return roleNames
    } catch (e) {
      return []
    }
  }

  async function fetchPermissions() {
    try {
      const perms = await getMyPermissionKeys()
      setUserPermissions(perms)
      return perms
    } catch (e) {
      return []
    }
  }

  async function fetchChannelScope() {
    try {
      const res = await getMyChannelScope()
      channelScope.value = res.data ?? { all: false, channelIds: [] }
    } catch {
      channelScope.value = { all: false, channelIds: [] }
    }
  }

  async function fetchTenants() {
    try {
      const res = await getMyTenants()
      tenantList.value = res?.data || []
      if (tenantList.value.length > 0 && !currentTenantId.value) {
        const saved = uni.getStorageSync('tadmin_current_tenant_id')
        if (saved) {
          currentTenantId.value = saved
        } else {
          // 优先匹配当前域名对应的租户
          const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
          const matched = hostname
            ? tenantList.value.find(t => t.domain === hostname)
            : null
          currentTenantId.value = matched?.documentId || matched?.id || tenantList.value[0].documentId || tenantList.value[0].id
        }
      }
      // 租户列表为空时，清除 currentTenantId（避免残留 header 导致 403）
      if (tenantList.value.length === 0 && currentTenantId.value) {
        currentTenantId.value = null
        uni.removeStorageSync('tadmin_current_tenant_id')
        localStorage.removeItem('tadmin_current_tenant_id')
      }
      uni.setStorageSync('tadmin_tenant_list', JSON.stringify(tenantList.value))
      if (currentTenantId.value) {
        uni.setStorageSync('tadmin_current_tenant_id', currentTenantId.value)
      }
    } catch (e) {
      console.warn('[user] fetchTenants failed:', e)
    }
  }

  function setCurrentTenant(id) {
    currentTenantId.value = id
    uni.setStorageSync('tadmin_current_tenant_id', id)
    // 清空 config-helper 缓存，下次 loadSiteConfig 重新拉取对应租户配置
    clearConfigCache()
  }

  function hasChannelAccess(channelId) {
    if (channelScope.value.all) return true
    return channelScope.value.channelIds.includes(channelId)
  }

  async function login(identifier, password) {
    const result = await adminLoginApi(identifier, password)
    setUserData(result)
    // 清除上一个用户的 currentTenantId 残留（避免新用户带旧租户上下文请求 API）
    currentTenantId.value = null
    uni.removeStorageSync('tadmin_current_tenant_id')
    localStorage.removeItem('tadmin_current_tenant_id')
    await Promise.all([fetchUserRoles(), fetchPermissions(), fetchChannelScope(), fetchTenants()])
    if (roles.value.length === 0 && permissions.value.length === 0) {
      console.warn('[user] roles/permissions failed to load after login')
    }
    return result
  }

  function clearUser() {
    token.value = ''
    userInfo.value = {}
    roles.value = []
    permissions.value = []
    tenantList.value = []
    currentTenantId.value = null
    try {
      uni.removeStorageSync('tadmin_token')
      uni.removeStorageSync('tadmin_user')
      uni.removeStorageSync('tadmin_roles')
      uni.removeStorageSync('tadmin_permissions')
      uni.removeStorageSync('tadmin_tenant_list')
      uni.removeStorageSync('tadmin_current_tenant_id')
      localStorage.removeItem('tadmin_token')
      localStorage.removeItem('tadmin_user')
      localStorage.removeItem('tadmin_roles')
      localStorage.removeItem('tadmin_permissions')
      localStorage.removeItem('tadmin_tenant_list')
      localStorage.removeItem('tadmin_current_tenant_id')
    } catch (e) { /* ignore storage errors */ }
  }

  function updateUserInfo(data) {
    userInfo.value = { ...userInfo.value, ...data }
    try {
      const userStr = JSON.stringify(userInfo.value)
      uni.setStorageSync('tadmin_user', userStr)
      localStorage.setItem('tadmin_user', userStr)
    } catch (e) { /* ignore storage errors */ }
  }

  return {
    token,
    userInfo,
    roles,
    permissions,
    channelScope,
    tenantList,
    currentTenantId,
    isLoggedIn,
    channelId,
    role,
    userId,
    hasRoleManagementPermission,
    hasRole,
    hasPermission,
    hasChannelAccess,
    setUserData,
    setUserRoles,
    setUserPermissions,
    fetchUserRoles,
    fetchPermissions,
    fetchChannelScope,
    fetchTenants,
    setCurrentTenant,
    login,
    clearUser,
    updateUserInfo
  }
})
