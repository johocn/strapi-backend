<template>
  <view class="page-container">
    <PageHeader :title="pageTitle">
      <button class="btn-primary" @click="handleSave" :disabled="saving">保存</button>
    </PageHeader>

    <view class="info-banner">
      <text>{{ modeDescription }}</text>
    </view>

    <!-- channel-admin 模式：显示全局配置（只读参考） -->
    <view v-if="!isAdminMode && Object.keys(globalVisibility).length > 0" class="global-ref">
      <view class="ref-title">📋 全局默认配置（只读参考）</view>
      <view v-for="mod in MODULE_LIST" :key="mod.key" class="ref-item">
        <text class="ref-mod-name">{{ mod.name }}</text>
        <text class="ref-roles">{{ formatRoles(globalVisibility[mod.key]) }}</text>
      </view>
    </view>

    <view class="module-list">
      <view v-for="mod in MODULE_LIST" :key="mod.key" class="module-card">
        <view class="module-header">
          <text class="module-icon">{{ mod.icon }}</text>
          <text class="module-name">{{ mod.name }}</text>
          <view v-if="isChannelAdminEnabled(mod.key)" class="enabled-tag">CA 已开启</view>
        </view>

        <view class="role-list">
          <text class="role-label">可见角色：</text>
          <view class="role-grid">
            <view
              v-for="role in roleList"
              :key="role.value"
              class="role-item"
              :class="{ active: isRoleChecked(mod.key, role.value), disabled: !isRoleEditable(mod.key, role.value) }"
              @click="toggleRole(mod.key, role.value)"
            >
              <text>{{ role.label }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getModuleVisibility, updateModuleVisibility } from '../../api/module-visibility.js'
import { getGlobalConfig, updateGlobalConfig } from '../../api/global-config.js'
import { clearConfigCache, loadSiteConfig } from '../../utils/config-helper.js'
import { useUserStore } from '../../store/user.js'
import PageHeader from '../../components/PageHeader.vue'
import { MODULE_LIST as SHARED_MODULE_LIST } from '../../constants/module.js'

// 从共享常量派生，filter 掉 channel（无 manager 角色映射）
// 共享常量用 label，本页面 Template 用 mod.name，这里做映射
const MODULE_LIST = SHARED_MODULE_LIST
  .filter(m => m.key !== 'channel')
  .map(m => ({ ...m, name: m.label }))

// 角色列表（按中心分组）
const ROLE_GROUPS = [
  { label: '基础角色', roles: [
    { value: 'channel-admin', label: '渠道管理员' },
    { value: 'plugin-manager', label: '插件管理员' },
  ]},
  { label: '官网中心', roles: [
    { value: 'website-manager', label: '官网经理' },
    { value: 'website-editor', label: '官网编辑' },
  ]},
  { label: '物流中心', roles: [
    { value: 'logistics-manager', label: '物流经理' },
    { value: 'logistics-editor', label: '物流编辑' },
  ]},
  { label: '课程中心', roles: [
    { value: 'course-manager', label: '课程经理' },
    { value: 'course-editor', label: '课程编辑' },
  ]},
  { label: '题目中心', roles: [
    { value: 'quiz-manager', label: '题库经理' },
    { value: 'quiz-editor', label: '题库编辑' },
  ]},
  { label: '积分中心', roles: [
    { value: 'point-manager', label: '积分经理' },
    { value: 'point-editor', label: '积分编辑' },
  ]},
  { label: '媒体发布中心', roles: [
    { value: 'studio-manager', label: '媒体经理' },
    { value: 'studio-editor', label: '媒体编辑' },
  ]},
  { label: '系统中心', roles: [
    { value: 'system-manager', label: '系统经理' },
    { value: 'system-editor', label: '系统编辑' },
  ]},
]

const roleList = computed(() => ROLE_GROUPS.flatMap(g => g.roles))

const userStore = useUserStore()
const isAdminMode = computed(() => userStore.hasRole('admin'))

const pageTitle = computed(() => isAdminMode.value ? '默认功能（全局配置）' : '默认功能（租户覆盖）')
const modeDescription = computed(() => {
  if (isAdminMode.value) {
    return '当前为全局配置模式，修改将影响所有租户。开启模块的 channel-admin 角色后，该模块 manager 权限将自动叠加给 channel-admin 用户。'
  }
  return '当前为租户覆盖模式，只能从全局已授权角色中移除（交集收窄），不能新增全局未授权的角色。'
})

const saving = ref(false)
const form = ref({ moduleVisibility: {} })
const globalVisibility = ref({})

function isRoleChecked(moduleKey, roleValue) {
  return form.value.moduleVisibility[moduleKey]?.includes(roleValue) ?? false
}

function isChannelAdminEnabled(moduleKey) {
  return form.value.moduleVisibility[moduleKey]?.includes('channel-admin') ?? false
}

// channel-admin 模式下，全局未授权的角色不可选（灰显）
function isRoleEditable(moduleKey, roleValue) {
  if (isAdminMode.value) return true
  const globalRoles = globalVisibility.value[moduleKey] ?? []
  return globalRoles.includes(roleValue)
}

function toggleRole(moduleKey, roleValue) {
  // channel-admin 模式下，全局未授权的角色不可切换
  if (!isRoleEditable(moduleKey, roleValue)) return
  if (!form.value.moduleVisibility[moduleKey]) {
    form.value.moduleVisibility[moduleKey] = []
  }
  const list = form.value.moduleVisibility[moduleKey]
  const idx = list.indexOf(roleValue)
  if (idx >= 0) {
    list.splice(idx, 1)
  } else {
    list.push(roleValue)
  }
}

function formatRoles(roles) {
  if (!Array.isArray(roles) || roles.length === 0) return '（未配置）'
  const labels = roles.map(r => {
    const found = roleList.value.find(item => item.value === r)
    return found?.label || r
  })
  return labels.join('、')
}

async function loadConfig() {
  try {
    await loadSiteConfig()
    if (isAdminMode.value) {
      // admin 模式：读取全局配置
      const res = await getGlobalConfig()
      form.value.moduleVisibility = res?.moduleVisibility || {}
    } else {
      // channel-admin 模式：读取租户覆盖 + 全局配置（只读参考）
      const [tenantRes, globalRes] = await Promise.all([
        getModuleVisibility(),
        getGlobalConfig(),
      ])
      form.value.moduleVisibility = tenantRes || {}
      globalVisibility.value = globalRes?.moduleVisibility || {}
    }
  } catch (e) {
    uni.showToast({ title: '加载配置失败', icon: 'none' })
  }
}

async function handleSave() {
  if (saving.value) return
  saving.value = true
  try {
    if (isAdminMode.value) {
      // admin 模式：保存全局配置
      await updateGlobalConfig({ moduleVisibility: form.value.moduleVisibility })
    } else {
      // channel-admin 模式：保存租户覆盖
      await updateModuleVisibility(form.value)
    }
    clearConfigCache()
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (e) {
    const msg = e?.message || '保存失败'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.info-banner { background: #e6f7ff; border-radius: 8rpx; padding: 16rpx; margin-bottom: 20rpx; }
.info-banner text { font-size: 26rpx; color: #1890ff; }

.global-ref { background: #fafafa; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; border: 1rpx solid #e8e8e8; }
.ref-title { font-size: 28rpx; font-weight: bold; color: #666; margin-bottom: 16rpx; }
.ref-item { display: flex; justify-content: space-between; padding: 8rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.ref-mod-name { font-size: 26rpx; color: #333; }
.ref-roles { font-size: 24rpx; color: #999; }

.module-list { display: flex; flex-direction: column; gap: 20rpx; }
.module-card { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.module-header { display: flex; align-items: center; gap: 12rpx; }
.module-icon { font-size: 36rpx; }
.module-name { font-size: 30rpx; font-weight: bold; color: #333; flex: 1; }
.enabled-tag { font-size: 24rpx; color: #07c160; padding: 4rpx 12rpx; background: #e8f5e9; border-radius: 4rpx; }

.role-list { margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx solid #f5f5f5; }
.role-label { font-size: 26rpx; color: #999; display: block; margin-bottom: 12rpx; }
.role-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.role-item {
  padding: 12rpx 24rpx;
  background: #f5f5f5;
  border-radius: 6rpx;
  font-size: 26rpx;
  color: #666;
}
.role-item.active { background: #1890ff; color: #fff; }
.role-item.disabled { opacity: 0.4; }

.btn-primary {
  background: #ff0000; color: #fff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}
</style>
