<template>
  <view class="page-container">
    <PageHeader title="角色管理" />

    <view class="top-bar">
      <input
        class="search-input"
        v-model="searchKeyword"
        placeholder="搜索角色名/显示名"
        @confirm="handleSearch"
      />
      <button class="action-btn primary" @click="openCreateDialog" v-if="userStore.hasPermission('menu.user-roles')">新增角色</button>
    </view>

    <view v-if="loading" class="loading-tip">加载中...</view>

    <view v-else class="role-list">
      <view v-for="role in list" :key="role.name" class="role-card">
        <view class="role-main">
          <view class="role-header">
            <text class="role-name">{{ role.displayName || role.name }}</text>
            <view class="role-tags">
              <text v-if="role.isSystem" class="role-tag system">系统</text>
              <text v-else class="role-tag custom">自定义</text>
            </view>
          </view>
          <view class="role-info">
            <text class="role-key">标识: {{ role.name }}</text>
            <text class="role-users">用户数: {{ role.userCount || 0 }}</text>
            <text class="role-perms">权限数: {{ (role.permissions || []).length }}</text>
          </view>
          <view v-if="role.description" class="role-desc">{{ role.description }}</view>
        </view>
        <view class="role-actions" v-if="userStore.hasPermission('menu.user-roles')">
          <button class="action-btn" @click="openEditDialog(role)">编辑</button>
          <button class="action-btn channel-btn" @click="openChannelDialog(role)">渠道授权</button>
          <button class="action-btn action-btn-danger" :disabled="!!role.isSystem || (role.userCount || 0) > 0" @click="confirmDelete(role)">删除</button>
        </view>
      </view>

      <view v-if="list.length === 0" class="empty-tip">暂无角色</view>
    </view>

    <!-- 分页 -->
    <view v-if="pagination.total > pagination.pageSize" class="pagination">
      <button class="page-btn" :disabled="pagination.page <= 1" @click="changePage(pagination.page - 1)">上一页</button>
      <text class="page-info">{{ pagination.page }} / {{ pagination.pageCount || 1 }}</text>
      <button class="page-btn" :disabled="pagination.page >= pagination.pageCount" @click="changePage(pagination.page + 1)">下一页</button>
    </view>

    <!-- 新增/编辑弹窗 -->
    <view v-if="showFormDialog" class="modal-mask" @click="closeFormDialog"></view>
    <view v-if="showFormDialog" class="modal">
      <view class="modal-header">
        <text class="modal-title">{{ formMode === 'create' ? '新增角色' : '编辑角色' }}</text>
      </view>
      <view class="modal-body">
        <view class="form-item">
          <text class="form-label">角色标识 *</text>
          <input class="form-input" v-model="formData.role" placeholder="英文/小写/短横线 例: content-editor" :disabled="formMode === 'edit'" />
        </view>
        <view class="form-item">
          <text class="form-label">显示名称 *</text>
          <input class="form-input" v-model="formData.displayName" placeholder="例: 内容编辑" />
        </view>
        <view class="form-item">
          <text class="form-label">描述</text>
          <textarea class="form-textarea" v-model="formData.description" placeholder="角色描述（可选）" />
        </view>
      </view>
      <view class="modal-footer">
        <button class="modal-btn modal-btn-cancel" @click="closeFormDialog">取消</button>
        <button class="modal-btn" :disabled="saving" @click="submitForm">{{ saving ? '保存中...' : '确认' }}</button>
      </view>
    </view>

    <!-- 渠道授权弹窗 -->
    <view v-if="showChannelDialog" class="modal-mask" @click="closeChannelDialog"></view>
    <view v-if="showChannelDialog" class="modal channel-modal">
      <view class="modal-header">
        <text class="modal-title">渠道授权 - {{ channelRole?.displayName || channelRole?.name }}</text>
      </view>
      <view class="modal-body channel-body">
        <view v-if="channelLoading" class="loading-tip">加载渠道中...</view>
        <scroll-view v-else scroll-y class="channel-scroll">
          <view v-for="ch in channelTree" :key="ch.id" class="channel-node">
            <view class="channel-node-row" @click="toggleChannelExpand(ch)">
              <view class="checkbox" :class="{ checked: isChannelChecked(ch.id), partial: isChannelPartial(ch.id) }" @click.stop="toggleChannelCheck(ch)">
                <text v-if="isChannelChecked(ch.id)">&#10003;</text>
                <text v-else-if="isChannelPartial(ch.id)">-</text>
              </view>
              <text class="channel-name">{{ ch.name }}</text>
              <text v-if="ch.children && ch.children.length" class="expand-icon">{{ channelExpanded[ch.id] ? '&#9660;' : '&#9654;' }}</text>
            </view>
            <view v-if="ch.children && ch.children.length && channelExpanded[ch.id]" class="channel-children">
              <view v-for="child in ch.children" :key="child.id" class="channel-node">
                <view class="channel-node-row level-1" @click="toggleChannelExpand(child)">
                  <view class="checkbox" :class="{ checked: isChannelChecked(child.id) }" @click.stop="toggleChannelCheck(child)">
                    <text v-if="isChannelChecked(child.id)">&#10003;</text>
                  </view>
                  <text class="channel-name">{{ child.name }}</text>
                  <text v-if="child.children && child.children.length" class="expand-icon">{{ channelExpanded[child.id] ? '&#9660;' : '&#9654;' }}</text>
                </view>
                <view v-if="child.children && child.children.length && channelExpanded[child.id]" class="channel-children">
                  <view v-for="gc in child.children" :key="gc.id" class="channel-node">
                    <view class="channel-node-row level-2">
                      <view class="checkbox" :class="{ checked: isChannelChecked(gc.id) }" @click.stop="toggleChannelCheck(gc)">
                        <text v-if="isChannelChecked(gc.id)">&#10003;</text>
                      </view>
                      <text class="channel-name">{{ gc.name }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
          <view v-if="channelTree.length === 0" class="empty-tip">暂无渠道数据</view>
        </scroll-view>
      </view>
      <view class="modal-footer">
        <button class="modal-btn modal-btn-cancel" @click="closeChannelDialog">取消</button>
        <button class="modal-btn" :disabled="channelSaving" @click="saveChannelGrant">
          {{ channelSaving ? '保存中...' : '确定授权' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getRoles, createRole, updateRole, deleteRole, initRoles, getRoleChannels, batchGrantRoleChannel } from '../../api/auth.js'
import { getAdminChannelList } from '../../api/channel.js'
import PageHeader from '../../components/PageHeader.vue'
import { useUserStore } from '../../store/user.js'
import { DEFAULT_PAGE_SIZE } from '../../config/constant.js'

const userStore = useUserStore()
const list = ref([])
const loading = ref(false)
const saving = ref(false)
const searchKeyword = ref('')
const pagination = ref({ page: 1, pageSize: DEFAULT_PAGE_SIZE, pageCount: 0, total: 0 })

const showFormDialog = ref(false)
const formMode = ref('create')
const formData = ref({ role: '', displayName: '', description: '', permissions: [] })
const editingRole = ref(null)

// 渠道授权
const showChannelDialog = ref(false)
const channelRole = ref(null)
const channelTree = ref([])
const channelLoading = ref(false)
const channelSaving = ref(false)
const channelExpanded = reactive({})
const checkedChannelIds = ref(new Set())
const originalChannelIds = ref(new Set())

async function loadData() {
  loading.value = true
  try {
    const params = { page: pagination.value.page, pageSize: pagination.value.pageSize }
    if (searchKeyword.value) params.role = searchKeyword.value
    const result = await getRoles(params)
    list.value = result.list || []
    pagination.value = result.pagination || { page: 1, pageSize: DEFAULT_PAGE_SIZE, pageCount: 0, total: 0 }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.value.page = 1
  loadData()
}

function changePage(page) {
  pagination.value.page = page
  loadData()
}

function openCreateDialog() {
  formMode.value = 'create'
  formData.value = { role: '', displayName: '', description: '', permissions: [] }
  editingRole.value = null
  showFormDialog.value = true
}

function openEditDialog(role) {
  formMode.value = 'edit'
  editingRole.value = role
  formData.value = {
    role: role.name,
    displayName: role.displayName || '',
    description: role.description || '',
    permissions: role.permissions || [],
  }
  showFormDialog.value = true
}

function closeFormDialog() {
  showFormDialog.value = false
}

async function submitForm() {
  const { role, displayName, description, permissions } = formData.value
  if (!role || !role.trim()) {
    uni.showToast({ title: '请输入角色标识', icon: 'none' })
    return
  }
  if (!displayName || !displayName.trim()) {
    uni.showToast({ title: '请输入显示名称', icon: 'none' })
    return
  }

  saving.value = true
  try {
    if (formMode.value === 'create') {
      await createRole({ role: role.trim().toLowerCase().replace(/\s+/g, '-'), displayName, description, permissions })
      uni.showToast({ title: '创建成功', icon: 'success' })
    } else {
      await updateRole(editingRole.value.name, { displayName, description, permissions })
      uni.showToast({ title: '保存成功', icon: 'success' })
    }
    closeFormDialog()
    loadData()
  } catch (e) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function confirmDelete(role) {
  if (role.isSystem) {
    uni.showToast({ title: '系统角色不可删除', icon: 'none' })
    return
  }
  uni.showModal({
    title: '确认删除',
    content: `确定删除角色 "${role.displayName || role.name}"？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteRole(role.name)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData()
        } catch (e) {
          uni.showToast({ title: e.message || '删除失败', icon: 'none' })
        }
      }
    },
  })
}

// ===== 渠道授权 =====

function buildTree(flatList) {
  const map = {}
  const roots = []
  for (const ch of flatList) {
    map[ch.id] = { ...ch, children: [] }
  }
  for (const ch of flatList) {
    const parentId = ch.parentChannel || ch.parentChannelId
    if (parentId && map[parentId]) {
      map[parentId].children.push(map[ch.id])
    } else {
      roots.push(map[ch.id])
    }
  }
  return roots
}

async function openChannelDialog(role) {
  channelRole.value = role
  showChannelDialog.value = true
  channelLoading.value = true
  checkedChannelIds.value = new Set()
  originalChannelIds.value = new Set()
  Object.keys(channelExpanded).forEach(k => delete channelExpanded[k])

  try {
    const [channels, granted] = await Promise.all([
      getAdminChannelList({ page: 1, pageSize: 200 }),
      getRoleChannels(role.name),
    ])
    channelTree.value = buildTree(channels.list || channels || [])

    const grantedIds = (granted || []).map(rc => {
      const ch = rc.channel
      return typeof ch === 'object' ? ch?.id : ch
    }).filter(Boolean)
    checkedChannelIds.value = new Set(grantedIds)
    originalChannelIds.value = new Set(grantedIds)

    // 默认展开第一层
    channelTree.value.forEach(ch => { channelExpanded[ch.id] = true })
  } catch (e) {
    uni.showToast({ title: '加载渠道数据失败', icon: 'none' })
  } finally {
    channelLoading.value = false
  }
}

function closeChannelDialog() {
  showChannelDialog.value = false
  channelRole.value = null
}

function toggleChannelExpand(ch) {
  channelExpanded[ch.id] = !channelExpanded[ch.id]
}

function isChannelChecked(id) {
  return checkedChannelIds.value.has(id)
}

function isChannelPartial(id) {
  if (isChannelChecked(id)) return false
  // 检查子节点是否有被选中的
  const node = findNode(channelTree.value, id)
  if (!node || !node.children || !node.children.length) return false
  return node.children.some(c => isChannelChecked(c.id))
}

function findNode(tree, id) {
  for (const node of tree) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

function toggleChannelCheck(ch) {
  const newSet = new Set(checkedChannelIds.value)
  const node = findNode(channelTree.value, ch.id)

  if (newSet.has(ch.id)) {
    newSet.delete(ch.id)
    // 同时取消子节点
    if (node && node.children) {
      const removeChildIds = (children) => {
        for (const c of children) {
          newSet.delete(c.id)
          if (c.children) removeChildIds(c.children)
        }
      }
      removeChildIds(node.children)
    }
  } else {
    newSet.add(ch.id)
    // 同时选中子节点
    if (node && node.children) {
      const addChildIds = (children) => {
        for (const c of children) {
          newSet.add(c.id)
          if (c.children) addChildIds(c.children)
        }
      }
      addChildIds(node.children)
    }
  }
  checkedChannelIds.value = newSet
}

async function saveChannelGrant() {
  if (!channelRole.value) return
  channelSaving.value = true
  try {
    const newIds = Array.from(checkedChannelIds.value)
    await batchGrantRoleChannel(channelRole.value.name, newIds)
    uni.showToast({ title: '渠道授权已保存', icon: 'success' })
    closeChannelDialog()
  } catch (e) {
    uni.showToast({ title: e.message || '授权失败', icon: 'none' })
  } finally {
    channelSaving.value = false
  }
}

onMounted(async () => {
  try { await initRoles() } catch {}
  loadData()
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 40rpx;
}

.top-bar {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  align-items: center;
}

.search-input {
  flex: 1;
  height: 72rpx;
  background: #fff;
  border-radius: 8rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}

.role-list {
  padding: 0 32rpx;
}

.role-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
}

.role-main {
  flex: 1;
}

.role-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.role-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
}

.role-tags {
  display: flex;
  gap: 8rpx;
}

.role-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.role-tag.system {
  background: #f6ffed;
  color: #52c41a;
}

.role-tag.custom {
  background: #e6f7ff;
  color: #1890ff;
}

.role-info {
  display: flex;
  gap: 24rpx;
  flex-wrap: wrap;
  margin-bottom: 8rpx;
}

.role-info text {
  font-size: 24rpx;
  color: #999;
}

.role-desc {
  font-size: 24rpx;
  color: #666;
}

.role-actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.action-btn {
  padding: 12rpx 24rpx;
  background: #f0f0f0;
  color: #333;
  border: none;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.action-btn.primary {
  background: #1890ff;
  color: #fff;
}

.action-btn.channel-btn {
  background: #722ed1;
  color: #fff;
}

.action-btn-danger {
  background: #ff4d4f;
  color: #fff;
}

.action-btn[disabled] {
  opacity: 0.5;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 32rpx;
}

.page-btn {
  padding: 12rpx 32rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  background: #fff;
  font-size: 26rpx;
}

.page-info {
  font-size: 26rpx;
  color: #666;
}

.loading-tip, .empty-tip {
  text-align: center;
  padding: 80rpx;
  color: #999;
  font-size: 28rpx;
}

.modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.modal {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 85%;
  max-width: 800rpx;
  background: #fff;
  border-radius: 16rpx;
  z-index: 1000;
}

.channel-modal {
  width: 92%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 32rpx;
  border-bottom: 1rpx solid #eee;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
}

.modal-body {
  padding: 32rpx;
}

.channel-body {
  padding: 16rpx;
  flex: 1;
  overflow: hidden;
}

.channel-scroll {
  max-height: 55vh;
}

.channel-node-row {
  display: flex;
  align-items: center;
  padding: 20rpx 12rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.channel-node-row.level-1 {
  padding-left: 40rpx;
}

.channel-node-row.level-2 {
  padding-left: 72rpx;
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
  background: #722ed1;
  border-color: #722ed1;
}

.checkbox.partial {
  background: #722ed1;
  border-color: #722ed1;
  opacity: 0.6;
}

.channel-name {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.expand-icon {
  font-size: 22rpx;
  color: #999;
  margin-left: 12rpx;
}

.channel-children {
  background: #fafafa;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 72rpx;
  background: #fafafa;
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}

.form-textarea {
  width: 100%;
  min-height: 120rpx;
  background: #fafafa;
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
  padding: 16rpx 24rpx;
  font-size: 28rpx;
}

.modal-footer {
  display: flex;
  border-top: 1rpx solid #eee;
}

.modal-btn {
  flex: 1;
  padding: 24rpx;
  background: #1890ff;
  color: #fff;
  border: none;
  font-size: 28rpx;
}

.modal-btn[disabled] {
  opacity: 0.6;
}

.modal-btn-cancel {
  background: #fff;
  color: #666;
  border-right: 1rpx solid #eee;
}
</style>
