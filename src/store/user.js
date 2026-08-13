import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ROLES } from '../api/role-management.js'
import { adminLogin as adminLoginApi, getMyPermissionKeys, getMyChannelScope, getMyRoles, getMyTenants, switchTenant as switchTenantApi } from '../api/auth.js'
import { clearConfigCache } from '../utils/config-helper.js'
import {
  setToken, setRefreshToken, setTokenExpiresAt,
  removeToken, removeRefreshToken, removeTokenExpiresAt,
  setUser, removeUser
} from '../utils/auth.js'

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
    // 兼容多种字段命名：jwt(Strapi) / token / access_token(SSO) / accessToken
    token.value = data.jwt ?? data.token ?? data.access_token ?? data.accessToken ?? ''
    userInfo.value = data.user ?? data.data ?? {}

    // 关键：保存 refresh_token 和 expires_in，否则 token 一过期就被登出（SSO 无法持久）
    // SSO 登录返回 refresh_token + expires_in；本地登录返回 refresh_token + expiresIn
    const refreshTokenValue = data.refresh_token ?? data.refreshToken ?? ''
    const expiresIn = data.expires_in ?? data.expiresIn ?? 900 // 默认 15 分钟

    try {
      setToken(token.value)
      setUser(userInfo.value)
      if (refreshTokenValue) {
        setRefreshToken(refreshTokenValue)
        // 提前 60 秒标记过期，触发主动刷新
        setTokenExpiresAt(Date.now() + (expiresIn - 60) * 1000)
      }
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

      // 检查 currentTenantId 是否仍在新加载的 tenantList 中
      // 场景：用户被取消租户授权、租户被删除、localStorage 残留旧值
      const tenantExists = currentTenantId.value
        ? tenantList.value.some(t => (t.documentId || t.id) === currentTenantId.value)
        : false

      if (tenantList.value.length > 0 && (!currentTenantId.value || !tenantExists)) {
        // currentTenantId 无效，需要重新选择
        const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
        // 优先匹配当前域名对应的租户
        const matched = hostname
          ? tenantList.value.find(t => t.domain === hostname)
          : null
        const newId = matched?.documentId || matched?.id || tenantList.value[0].documentId || tenantList.value[0].id
        if (newId && newId !== currentTenantId.value) {
          currentTenantId.value = newId
          uni.setStorageSync('tadmin_current_tenant_id', newId)
          localStorage.setItem('tadmin_current_tenant_id', newId)
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
        // 自动选中后调用 switchTenant，让后端 JWT 也携带 currentTenantId
        // 避免出现「列表有租户但 currentTenantId 未同步到后端」导致 TenantSwitcher 显示「请选择」
        try {
          await switchTenant(currentTenantId.value)
        } catch (e) {
          // switchTenant 失败不阻塞，前端 currentTenantId 已设置，下次操作会重新同步
          console.warn('[user] auto switchTenant after fetchTenants failed:', e)
        }
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
    // 登录后自动选择默认租户（仅对有租户的用户生效）
    if (tenantList.value.length > 0 && !currentTenantId.value) {
      const defaultTenant = tenantList.value[0]?.documentId || tenantList.value[0]?.id
      if (defaultTenant) {
        await switchTenant(defaultTenant)
      }
    } else if (tenantList.value.length > 0 && currentTenantId.value) {
      // 已有 currentTenantId，调 switchTenant 让后端 JWT 也携带
      await switchTenant(currentTenantId.value)
    }
    return result
  }

  async function switchTenant(tenantId) {
    try {
      const res = await switchTenantApi(tenantId)
      if (res?.jwt) {
        token.value = res.jwt
        currentTenantId.value = tenantId
        try {
          setToken(res.jwt)
          uni.setStorageSync('tadmin_current_tenant_id', tenantId)
          localStorage.setItem('tadmin_current_tenant_id', tenantId)
          // 切换租户若返回新 refresh_token，一并更新
          const newRefresh = res.refresh_token ?? res.refreshToken
          if (newRefresh) setRefreshToken(newRefresh)
          const newExpiresIn = res.expires_in ?? res.expiresIn
          if (newExpiresIn) setTokenExpiresAt(Date.now() + (newExpiresIn - 60) * 1000)
        } catch (e) { /* ignore storage errors */ }
        // 清除配置缓存，强制重新加载合并后的 moduleVisibility
        clearConfigCache()
        // 重新加载权限（新 JWT 携带 currentTenantId，后端会按新租户计算权限）
        await fetchPermissions()
      }
      return res
    } catch (e) {
      console.error('[user] switchTenant failed:', e)
      throw e
    }
  }

  function clearUser() {
    token.value = ''
    userInfo.value = {}
    roles.value = []
    permissions.value = []
    tenantList.value = []
    currentTenantId.value = null
    try {
      removeToken()
      removeRefreshToken()
      removeTokenExpiresAt()
      removeUser()
      uni.removeStorageSync('tadmin_roles')
      uni.removeStorageSync('tadmin_permissions')
      uni.removeStorageSync('tadmin_tenant_list')
      uni.removeStorageSync('tadmin_current_tenant_id')
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
    switchTenant,
    login,
    clearUser,
    updateUserInfo
  }
})
