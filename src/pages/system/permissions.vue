<template>
  <view class="page-container">
    <PageHeader title="权限管理" />

    <!-- 角色选择 -->
    <view class="role-tabs">
      <view
        v-for="r in roleList"
        :key="r.key"
        class="role-tab"
        :class="{ active: selectedRole === r.key }"
        @click="selectRole(r.key)"
      >
        {{ r.label }}
      </view>
    </view>

    <!-- 权限树 -->
    <view v-if="loading" class="loading-tip">加载中...</view>
    <view v-else class="permission-tree">
      <view v-for="(item, key) in permissionTree" :key="key" class="tree-group">
        <view class="tree-node level-0" @click="toggleNode(key)">
          <view class="checkbox" :class="{ checked: isChecked(key), partial: isPartial(key) }">
            <text v-if="isChecked(key)">✓</text>
            <text v-else-if="isPartial(key)">-</text>
          </view>
          <text class="node-label">{{ item.label }}</text>
          <text class="node-type menu">菜单</text>
          <text class="expand-icon">{{ expandedNodes[key] ? '▼' : '▶' }}</text>
        </view>

        <view v-if="expandedNodes[key] && item.children" class="tree-children">
          <view v-for="(child, childKey) in item.children" :key="childKey" class="tree-child">
            <view class="tree-node level-1" @click="toggleNode(childKey, key)">
              <view class="checkbox" :class="{ checked: isChecked(childKey), partial: isPartial(childKey) }">
                <text v-if="isChecked(childKey)">✓</text>
                <text v-else-if="isPartial(childKey)">-</text>
              </view>
              <text class="node-label">{{ child.label }}</text>
              <text class="node-type" :class="child.type">{{ child.type === 'menu' ? '菜单' : '按钮' }}</text>
              <text v-if="child.children" class="expand-icon">{{ expandedNodes[childKey] ? '▼' : '▶' }}</text>
            </view>

            <view v-if="expandedNodes[childKey] && child.children" class="tree-children">
              <view v-for="(grandChild, gcKey) in child.children" :key="gcKey" class="tree-child">
                <view class="tree-node level-2" @click="toggleCheck(gcKey)">
                  <view class="checkbox" :class="{ checked: isChecked(gcKey) }">
                    <text v-if="isChecked(gcKey)">✓</text>
                  </view>
                  <text class="node-label">{{ grandChild.label }}</text>
                  <text class="node-type" :class="grandChild.type">{{ grandChild.type === 'menu' ? '菜单' : '按钮' }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 保存按钮 -->
    <view class="save-bar">
      <button class="save-btn" :disabled="saving" @click="savePermissions">
        {{ saving ? '保存中...' : '保存权限配置' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getPermissionTree, getRolePermissions, updateRolePermissions, initPermissions, getAllRoles } from '../../api/auth.js'
import PageHeader from '../../components/PageHeader.vue'

const roleList = ref([])
const selectedRole = ref('')
const permissionTree = ref({})
const checkedKeys = ref(new Set())
const expandedNodes = reactive({})
const loading = ref(false)
const saving = ref(false)

async function selectRole(role) {
  selectedRole.value = role
  await loadRolePermissions()
}

async function loadPermissionTree() {
  try {
    const tree = await getPermissionTree()
    permissionTree.value = tree || {}
    // 默认展开所有顶级节点
    Object.keys(tree).forEach(key => {
      expandedNodes[key] = true
    })
  } catch (e) {
    uni.showToast({ title: '加载权限树失败', icon: 'none' })
  }
}

async function loadRolePermissions() {
  loading.value = true
  try {
    const result = await getRolePermissions(selectedRole.value)
    const perms = result?.permissions || []
    checkedKeys.value = new Set(perms)
  } catch (e) {
    checkedKeys.value = new Set()
  } finally {
    loading.value = false
  }
}

// 获取节点及其所有子节点的 key
function getAllDescendantKeys(key, tree) {
  const keys = [key]
  const findChildren = (nodes) => {
    for (const [k, item] of Object.entries(nodes)) {
      if (k === key && item.children) {
        const childKeys = Object.keys(item.children)
        keys.push(...childKeys)
        childKeys.forEach(ck => {
          if (item.children[ck].children) {
            keys.push(...Object.keys(item.children[ck].children))
          }
        })
        return true
      }
      if (item.children && findChildren(item.children)) {
        return true
      }
    }
    return false
  }
  findChildren(tree)
  return keys
}

// 获取节点的所有子节点 key（不含自身）
function getChildKeys(key, tree) {
  const keys = []
  const findNode = (nodes) => {
    for (const [k, item] of Object.entries(nodes)) {
      if (k === key) {
        if (item.children) {
          Object.entries(item.children).forEach(([ck, ci]) => {
            keys.push(ck)
            if (ci.children) {
              keys.push(...Object.keys(ci.children))
            }
          })
        }
        return true
      }
      if (item.children && findNode(item.children)) {
        return true
      }
    }
    return false
  }
  findNode(tree)
  return keys
}

// 获取节点的所有祖先 key
function getAncestorKeys(key, tree) {
  const ancestors = []
  const findPath = (nodes, path = []) => {
    for (const [k, item] of Object.entries(nodes)) {
      if (k === key) {
        ancestors.push(...path)
        return true
      }
      if (item.children && findPath(item.children, [...path, k])) {
        return true
      }
    }
    return false
  }
  findPath(tree)
  return ancestors
}

function isChecked(key) {
  return checkedKeys.value.has(key)
}

function isPartial(key) {
  if (isChecked(key)) return false
  const childKeys = getChildKeys(key, permissionTree.value)
  if (childKeys.length === 0) return false
  return childKeys.some(ck => checkedKeys.value.has(ck))
}

function toggleNode(key, parentKey) {
  if (expandedNodes[key] !== undefined) {
    expandedNodes[key] = !expandedNodes[key]
  } else {
    expandedNodes[key] = true
  }
  toggleCheck(key)
}

function toggleCheck(key) {
  const newChecked = new Set(checkedKeys.value)
  const allKeys = getAllDescendantKeys(key, permissionTree.value)

  if (newChecked.has(key)) {
    // 取消选中：移除自身和所有子节点
    allKeys.forEach(k => newChecked.delete(k))
  } else {
    // 选中：添加自身和所有子节点
    allKeys.forEach(k => newChecked.add(k))
    // 同时添加所有祖先
    const ancestors = getAncestorKeys(key, permissionTree.value)
    ancestors.forEach(a => newChecked.add(a))
  }

  checkedKeys.value = newChecked
}

async function savePermissions() {
  saving.value = true
  try {
    await updateRolePermissions(selectedRole.value, Array.from(checkedKeys.value))
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  // 动态加载角色列表
  try {
    const roles = await getAllRoles()
    roleList.value = (roles || []).map(r => ({ key: r.role || r.name, label: r.displayName || r.role || r.name }))
    if (roleList.value.length > 0 && !selectedRole.value) {
      selectedRole.value = roleList.value[0].key
    }
  } catch (e) {
    // 角色加载失败不影响后续
  }
  await loadPermissionTree()
  if (selectedRole.value) {
    await loadRolePermissions()
  }
  // 尝试初始化默认权限（如果尚未初始化）
  try {
    await initPermissions()
  } catch (e) {
    // 已初始化过则忽略
  }
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 140rpx;
}

.role-tabs {
  display: flex;
  padding: 24rpx 32rpx;
  gap: 16rpx;
  overflow-x: auto;
  background: #fff;
  border-bottom: 1rpx solid #eee;
}

.role-tab {
  padding: 16rpx 28rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #666;
  background: #f5f5f5;
  white-space: nowrap;
}

.role-tab.active {
  background: #1890ff;
  color: #fff;
}

.permission-tree {
  padding: 24rpx 32rpx;
}

.tree-group {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  overflow: hidden;
}

.tree-node {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.tree-node.level-0 {
  padding-left: 24rpx;
  font-weight: bold;
}

.tree-node.level-1 {
  padding-left: 56rpx;
}

.tree-node.level-2 {
  padding-left: 88rpx;
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  font-size: 24rpx;
  color: #fff;
  flex-shrink: 0;
}

.checkbox.checked {
  background: #1890ff;
  border-color: #1890ff;
}

.checkbox.partial {
  background: #1890ff;
  border-color: #1890ff;
  opacity: 0.6;
}

.node-label {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.node-type {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  margin-right: 16rpx;
}

.node-type.menu {
  background: #e3f2fd;
  color: #1565c0;
}

.node-type.button {
  background: #fff3e0;
  color: #e65100;
}

.expand-icon {
  font-size: 22rpx;
  color: #999;
}

.tree-children {
  background: #fafafa;
}

.tree-child {
  border-bottom: 1rpx solid #f0f0f0;
}

.tree-child:last-child {
  border-bottom: none;
}

.loading-tip {
  text-align: center;
  padding: 80rpx;
  color: #999;
  font-size: 28rpx;
}

.save-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  background: #fff;
  border-top: 1rpx solid #eee;
  z-index: 100;
}

.save-btn {
  width: 100%;
  height: 88rpx;
  background: #1890ff;
  color: #fff;
  font-size: 32rpx;
  border-radius: 16rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-btn[disabled] {
  background: #b0c4de;
}
</style>
