<template>
  <view class="page-container">
    <PageHeader title="用户角色管理" />

    <view class="search-bar">
      <input
        v-model="searchKeyword"
        class="search-input"
        placeholder="搜索用户名或邮箱"
        @confirm="handleSearch"
      />
      <picker
        v-model="selectedRole"
        mode="selector"
        :range="roleOptions"
        range-key="label"
        @change="handleRoleFilterChange"
        class="role-picker"
      >
        <view class="picker-display">
          {{ selectedRoleLabel || '全部角色' }}
        </view>
      </picker>
      <button class="search-btn" @click="handleSearch">搜索</button>
    </view>

    <view class="legend-bar" v-if="!isAdmin">
      <text class="legend-item"><text class="legend-dot core"></text>核心</text>
      <text class="legend-item"><text class="legend-dot auto"></text>自动授权</text>
      <text class="legend-item"><text class="legend-dot explicit"></text>显式分配</text>
    </view>

    <view class="batch-bar" v-if="selectedUserIds.length > 0 && hasPermission('menu.user-roles')">
      <text class="batch-info">已选 {{ selectedUserIds.length }} 个用户</text>
      <button class="batch-btn" @click="showBatchAssign = true">批量分配角色</button>
      <button class="batch-btn-clear" @click="clearSelection">清除选择</button>
    </view>

    <view class="list">
      <view
        v-for="item in list"
        :key="item.id"
        class="list-item"
      >
        <checkbox
          v-if="hasPermission('menu.user-roles')"
          :value="item.id"
          :checked="selectedUserIds.includes(item.id)"
          @change="handleUserSelect(item.id)"
          class="user-checkbox"
        />
        <view class="item-main" @click="showUserDetail(item)">
          <view class="item-name">{{ item.username }}</view>
          <view class="item-email">{{ item.email }}</view>
          <view class="item-roles">
            <text
              v-for="role in (item.roleSources || [])"
              :key="role.role"
              :class="['role-tag', role.source, role.source === 'core' ? 'unclickable' : 'clickable']"
              @click.stop="handleRoleTagClick(item, role)"
            >
              {{ role.label }}
            </text>
          </view>
        </view>
        <view class="item-actions">
          <button class="action-btn" @click.stop="openAssignDialog(item)" v-if="hasPermission('menu.user-roles')">分配角色</button>
          <button class="action-btn action-btn-danger" @click.stop="openRevokeDialog(item)" v-if="hasPermission('menu.user-roles')">撤销角色</button>
        </view>
      </view>
    </view>

    <view class="pagination">
      <button
        class="page-btn"
        :disabled="pagination.page <= 1"
        @click="changePage(pagination.page - 1)"
      >上一页</button>
      <text class="page-info">{{ pagination.page }} / {{ pagination.pageCount || 1 }}</text>
      <button
        class="page-btn"
        :disabled="pagination.page >= pagination.pageCount"
        @click="changePage(pagination.page + 1)"
      >下一页</button>
    </view>

    <view class="modal-mask" v-if="showAssignDialog || showRevokeDialog || showBatchAssign || showDetailDialog" @click="closeDialogs"></view>

    <!-- 用户详情弹窗 -->
    <view class="modal modal-detail" v-if="showDetailDialog">
      <view class="modal-header">
        <text class="modal-title">用户详情</text>
      </view>
      <view class="modal-body" v-if="detailData">
        <view class="detail-info">
          <text class="detail-name">{{ detailData.user.username }}</text>
          <text class="detail-email">{{ detailData.user.email }}</text>
          <text class="detail-time">注册时间：{{ formatDate(detailData.user.createdAt) }}</text>
        </view>

        <view class="role-group" v-if="detailData.rolesBySource.core.length > 0">
          <text class="group-title"><text class="legend-dot core"></text>核心角色</text>
          <view class="group-tags">
            <text
              v-for="r in detailData.rolesBySource.core"
              :key="r.role"
              class="role-tag core unclickable"
            >
              {{ r.label }}
            </text>
          </view>
        </view>

        <view class="role-group" v-if="detailData.rolesBySource.auto.length > 0">
          <text class="group-title"><text class="legend-dot auto"></text>自动授权（moduleVisibility）</text>
          <view class="group-tags">
            <text
              v-for="r in detailData.rolesBySource.auto"
              :key="r.role"
              class="role-tag auto clickable"
              @click="handleRoleTagClick({ id: detailData.user.id, username: detailData.user.username }, r)"
            >
              {{ r.label }}
            </text>
          </view>
        </view>

        <view class="role-group" v-if="detailData.rolesBySource.explicit.length > 0">
          <text class="group-title"><text class="legend-dot explicit"></text>显式分配</text>
          <view class="group-tags">
            <text
              v-for="r in detailData.rolesBySource.explicit"
              :key="r.role"
              class="role-tag explicit clickable"
              @click="handleRoleTagClick({ id: detailData.user.id, username: detailData.user.username }, r)"
            >
              {{ r.label }}
            </text>
          </view>
        </view>
      </view>
      <view class="modal-footer">
        <button class="modal-btn modal-btn-cancel" @click="closeDialogs">关闭</button>
        <button class="modal-btn" @click="openAssignDialog(detailData && {id: detailData.user.id, username: detailData.user.username})" v-if="hasPermission('menu.user-roles')">分配角色</button>
      </view>
    </view>

    <view class="modal" v-if="showAssignDialog">
      <view class="modal-header">
        <text class="modal-title">为用户 {{ currentUser?.username }} 分配角色</text>
      </view>
      <view class="modal-body">
        <view class="role-checkbox-list">
          <view
            v-for="role in assignableRoleOptions"
            :key="role.value"
            class="role-checkbox-item"
            @click="toggleAssignRole(role.value)"
          >
            <checkbox
              :value="role.value"
              :checked="selectedAssignRoles.includes(role.value)"
              disabled
            />
            <text class="role-label">{{ role.label }}</text>
            <text class="role-value">{{ role.value }}</text>
          </view>
        </view>
        <textarea
          v-model="assignReason"
          class="reason-input"
          placeholder="操作原因（可选）"
        ></textarea>
      </view>
      <view class="modal-footer">
        <button class="modal-btn modal-btn-cancel" @click="closeDialogs">取消</button>
        <button class="modal-btn" @click="handleAssignRoles">
          确认<text v-if="selectedAssignRoles.length > 0">（已选 {{ selectedAssignRoles.length }}）</text>
        </button>
      </view>
    </view>

    <view class="modal" v-if="showRevokeDialog">
      <view class="modal-header">
        <text class="modal-title">为用户 {{ currentUser?.username }} 撤销角色</text>
      </view>
      <view class="modal-body">
        <view class="role-checkbox-list" v-if="revocableRoles.length > 0">
          <view
            v-for="role in revocableRoles"
            :key="role.role"
            class="role-checkbox-item"
            @click="toggleRevokeRole(role.role)"
          >
            <checkbox
              :value="role.role"
              :checked="selectedRevokeRoles.includes(role.role)"
              disabled
            />
            <text class="role-label">{{ role.label }}</text>
            <text class="role-value">{{ role.role }}</text>
            <text :class="['role-source-dot', role.source]"></text>
          </view>
        </view>
        <view v-else class="empty-tip">该用户没有可撤销的角色（仅剩核心角色）</view>
        <textarea
          v-model="revokeReason"
          class="reason-input"
          placeholder="操作原因（可选）"
        ></textarea>
      </view>
      <view class="modal-footer">
        <button class="modal-btn modal-btn-cancel" @click="closeDialogs">取消</button>
        <button class="modal-btn" @click="handleRevokeRoles">
          确认<text v-if="selectedRevokeRoles.length > 0">（已选 {{ selectedRevokeRoles.length }}）</text>
        </button>
      </view>
    </view>

    <view class="modal" v-if="showBatchAssign">
      <view class="modal-header">
        <text class="modal-title">为选中的 {{ selectedUserIds.length }} 个用户批量分配角色</text>
      </view>
      <view class="modal-body">
        <view class="role-checkbox-list">
          <view
            v-for="role in assignableRoleOptions"
            :key="role.value"
            class="role-checkbox-item"
            @click="toggleBatchRole(role.value)"
          >
            <checkbox
              :value="role.value"
              :checked="selectedBatchRoles.includes(role.value)"
              disabled
            />
            <text class="role-label">{{ role.label }}</text>
            <text class="role-value">{{ role.value }}</text>
          </view>
        </view>
        <textarea
          v-model="batchAssignReason"
          class="reason-input"
          placeholder="操作原因（可选）"
        ></textarea>
      </view>
      <view class="modal-footer">
        <button class="modal-btn modal-btn-cancel" @click="closeDialogs">取消</button>
        <button class="modal-btn" @click="handleBatchAssignRolesMulti">
          确认<text v-if="selectedBatchRoles.length > 0">（已选 {{ selectedBatchRoles.length }}）</text>
        </button>
      </view>
    </view>

  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  getUsers, assignRole, revokeRole, batchAssignRoles,
  getUserDetail, getAssignableRoles,
  assignRoles, revokeRoles, batchAssignRolesMulti,
  ROLES, ROLE_LABELS
} from '../../src/api/role-management.js'
import { getAllRoles } from '../../src/api/auth.js'
import { DEFAULT_PAGE_SIZE } from '../../src/config/constant.js'
import { useUserStore } from '../../src/store/user.js'
import { formatDate } from '../../src/utils/format.js'
import PageHeader from '../../src/components/PageHeader.vue'

const list = ref([])
const userStore = useUserStore()
const hasPermission = userStore.hasPermission
const isAdmin = computed(() => userStore.hasRole('admin'))
const searchKeyword = ref('')
const selectedRole = ref('')
const selectedUserIds = ref([])
const pagination = ref({ page: 1, pageSize: DEFAULT_PAGE_SIZE, pageCount: 0, total: 0 })

const showAssignDialog = ref(false)
const showRevokeDialog = ref(false)
const showBatchAssign = ref(false)
const showDetailDialog = ref(false)
const currentUser = ref(null)
const detailData = ref(null)

const selectedAssignRoles = ref([])
const assignReason = ref('')
const selectedRevokeRoles = ref([])
const revokeReason = ref('')
const selectedBatchRoles = ref([])
const batchAssignReason = ref('')

// 角色筛选 picker 选项（全部角色，用 getAllRoles 加载）
const roleOptions = ref([
  { value: '', label: '全部角色' },
  { value: ROLES.ADMIN, label: ROLE_LABELS[ROLES.ADMIN] },
  { value: ROLES.CHANNEL_ADMIN, label: ROLE_LABELS[ROLES.CHANNEL_ADMIN] },
  { value: ROLES.PLUGIN_MANAGER, label: ROLE_LABELS[ROLES.PLUGIN_MANAGER] },
  { value: ROLES.INSTRUCTOR, label: ROLE_LABELS[ROLES.INSTRUCTOR] },
  { value: ROLES.USER, label: ROLE_LABELS[ROLES.USER] }
])

// 可分配角色选项（按权限过滤，用 getAssignableRoles 加载）
const assignableRoleOptions = ref([])

async function loadRoleOptions() {
  try {
    const roles = await getAllRoles()
    if (roles && roles.length > 0) {
      roleOptions.value = [
        { value: '', label: '全部角色' },
        ...roles.map(r => ({ value: r.role || r.name, label: r.displayName || r.role || r.name }))
      ]
    }
  } catch (e) {
    // 回退到默认硬编码列表
  }
}

async function loadAssignableRoles() {
  try {
    const res = await getAssignableRoles()
    // res 可能是 { roles: [...], isAdmin: boolean } 或直接是数组
    const roles = res?.roles || res || []
    assignableRoleOptions.value = roles.map(r => ({
      value: r.role,
      label: r.label || r.displayName || r.role
    }))
  } catch (e) {
    // 回退到 roleOptions（去掉"全部角色"）
    assignableRoleOptions.value = roleOptions.value.slice(1)
  }
}

const selectedRoleLabel = computed(() => {
  const option = roleOptions.value.find(o => o.value === selectedRole.value)
  return option ? option.label : ''
})

const revocableRoles = computed(() => {
  return (currentUser.value?.roleSources || []).filter(r => r.source !== 'auto')
})

function getRoleLabel(role) {
  return ROLE_LABELS[role] || role
}

async function loadData() {
  try {
    const params = {
      'pagination[page]': pagination.value.page,
      'pagination[pageSize]': pagination.value.pageSize
    }
    if (searchKeyword.value) {
      params['filters[username][$contains]'] = searchKeyword.value
    }
    if (selectedRole.value) {
      params['filters[role][$contains]'] = selectedRole.value
    }

    const res = await getUsers(params)
    list.value = res.list || res.data || []
    pagination.value = res.pagination || { page: 1, pageSize: DEFAULT_PAGE_SIZE, pageCount: 0, total: 0 }
  } catch (error) {
    uni.showToast({ title: '加载失败，请稍后重试', icon: 'none' })
  }
}

function handleSearch() {
  pagination.value.page = 1
  loadData()
}

function handleRoleFilterChange(e) {
  selectedRole.value = roleOptions.value[e.detail.value].value
  handleSearch()
}

function changePage(page) {
  pagination.value.page = page
  loadData()
}

async function showUserDetail(user) {
  try {
    const detail = await getUserDetail(user.id)
    // 后端返回 { user, roles, rolesBySource }
    detailData.value = detail
    showDetailDialog.value = true
  } catch (error) {
    uni.showToast({ title: error.message || '加载详情失败', icon: 'none' })
  }
}

function handleUserSelect(userId) {
  const index = selectedUserIds.value.indexOf(userId)
  if (index > -1) {
    selectedUserIds.value.splice(index, 1)
  } else {
    selectedUserIds.value.push(userId)
  }
}

function clearSelection() {
  selectedUserIds.value = []
}

async function handleRoleTagClick(user, roleSource) {
  // core 角色不可点击撤销
  if (roleSource.source === 'core') return

  uni.showModal({
    title: '撤销角色',
    content: `是否确定取消角色「${roleSource.label}」？`,
    success: async (res) => {
      if (!res.confirm) return
      uni.showLoading({ title: '撤销中...' })
      try {
        await revokeRole(user.id, roleSource.role, '')
        uni.hideLoading()
        uni.showToast({ title: '角色已撤销', icon: 'success' })
        loadData()
        // 如果详情弹窗打开，刷新详情
        if (showDetailDialog.value && detailData.value && detailData.value.user.id === user.id) {
          try {
            detailData.value = await getUserDetail(user.id)
          } catch (e) {
            // 刷新详情失败忽略
          }
        }
      } catch (error) {
        uni.hideLoading()
        const msg = error.message || '撤销失败'
        // auto 角色撤销失败的特殊提示
        if (roleSource.source === 'auto' && msg.includes('not assigned')) {
          uni.showModal({
            title: '无法撤销',
            content: '自动授权角色不能通过此方式撤销，请调整 moduleVisibility 配置',
            showCancel: false
          })
        } else {
          uni.showToast({ title: msg, icon: 'none' })
        }
      }
    }
  })
}

function openAssignDialog(item) {
  currentUser.value = item
  selectedAssignRoles.value = []
  assignReason.value = ''
  showDetailDialog.value = false
  showAssignDialog.value = true
}

function toggleAssignRole(role) {
  const idx = selectedAssignRoles.value.indexOf(role)
  if (idx > -1) {
    selectedAssignRoles.value.splice(idx, 1)
  } else {
    selectedAssignRoles.value.push(role)
  }
}

async function handleAssignRoles() {
  if (selectedAssignRoles.value.length === 0) {
    uni.showToast({ title: '请至少选择一个角色', icon: 'none' })
    return
  }
  uni.showLoading({ title: '分配中...' })
  try {
    const results = await assignRoles(currentUser.value.id, selectedAssignRoles.value, assignReason.value)
    uni.hideLoading()
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    if (failCount === 0) {
      uni.showToast({ title: `成功分配 ${successCount} 个角色`, icon: 'success' })
    } else {
      const failList = results.filter(r => !r.success).map(r => `${r.role}: ${r.error}`).join('\n')
      uni.showModal({
        title: '部分失败',
        content: `成功 ${successCount} 个，失败 ${failCount} 个：\n${failList}`,
        showCancel: false
      })
    }
    closeDialogs()
    loadData()
  } catch (error) {
    uni.hideLoading()
    uni.showToast({ title: error.message || '分配失败', icon: 'none' })
  }
}

function openRevokeDialog(item) {
  currentUser.value = item
  selectedRevokeRoles.value = []
  revokeReason.value = ''
  showDetailDialog.value = false
  showRevokeDialog.value = true
}

function toggleRevokeRole(role) {
  const idx = selectedRevokeRoles.value.indexOf(role)
  if (idx > -1) {
    selectedRevokeRoles.value.splice(idx, 1)
  } else {
    selectedRevokeRoles.value.push(role)
  }
}

async function handleRevokeRoles() {
  if (selectedRevokeRoles.value.length === 0) {
    uni.showToast({ title: '请至少选择一个角色', icon: 'none' })
    return
  }
  uni.showLoading({ title: '撤销中...' })
  try {
    const results = await revokeRoles(currentUser.value.id, selectedRevokeRoles.value, revokeReason.value)
    uni.hideLoading()
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    if (failCount === 0) {
      uni.showToast({ title: `成功撤销 ${successCount} 个角色`, icon: 'success' })
    } else {
      const failList = results.filter(r => !r.success).map(r => `${r.role}: ${r.error}`).join('\n')
      uni.showModal({
        title: '部分失败',
        content: `成功 ${successCount} 个，失败 ${failCount} 个：\n${failList}`,
        showCancel: false
      })
    }
    closeDialogs()
    loadData()
  } catch (error) {
    uni.hideLoading()
    uni.showToast({ title: error.message || '撤销失败', icon: 'none' })
  }
}

function toggleBatchRole(role) {
  const idx = selectedBatchRoles.value.indexOf(role)
  if (idx > -1) {
    selectedBatchRoles.value.splice(idx, 1)
  } else {
    selectedBatchRoles.value.push(role)
  }
}

async function handleBatchAssignRolesMulti() {
  if (selectedBatchRoles.value.length === 0) {
    uni.showToast({ title: '请至少选择一个角色', icon: 'none' })
    return
  }
  uni.showLoading({ title: '批量分配中...' })
  try {
    const results = await batchAssignRolesMulti(selectedUserIds.value, selectedBatchRoles.value, batchAssignReason.value)
    uni.hideLoading()
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    if (failCount === 0) {
      uni.showToast({ title: `成功为 ${selectedUserIds.value.length} 个用户分配 ${selectedBatchRoles.value.length} 个角色`, icon: 'success' })
    } else {
      const failList = results.filter(r => !r.success).map(r => `用户${r.userId}-${r.role}: ${r.error}`).join('\n')
      uni.showModal({
        title: '部分失败',
        content: `成功 ${successCount} 个，失败 ${failCount} 个：\n${failList}`,
        showCancel: false
      })
    }
    closeDialogs()
    clearSelection()
    loadData()
  } catch (error) {
    uni.hideLoading()
    uni.showToast({ title: error.message || '批量分配失败', icon: 'none' })
  }
}

function closeDialogs() {
  showAssignDialog.value = false
  showRevokeDialog.value = false
  showBatchAssign.value = false
  showDetailDialog.value = false
  currentUser.value = null
  detailData.value = null
}

onMounted(() => {
  loadRoleOptions()
  loadAssignableRoles()
  loadData()
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  padding: 20rpx;
  box-sizing: border-box;
  background: #f5f5f5;
}

.search-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
  align-items: center;
}

.search-input {
  flex: 1;
  height: 80rpx;
  background: white;
  border-radius: 8rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}

.role-picker {
  width: 240rpx;
  height: 80rpx;
  background: white;
  border-radius: 8rpx;
}

.picker-display {
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 16rpx;
  font-size: 26rpx;
  color: #333;
  text-align: center;
}

.search-btn {
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 32rpx;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
  padding: 16rpx 24rpx;
  background: white;
  border-radius: 8rpx;
}

.batch-info {
  font-size: 26rpx;
  color: #666;
}

.batch-btn {
  padding: 12rpx 24rpx;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.batch-btn-clear {
  padding: 12rpx 24rpx;
  background: #999;
  color: white;
  border: none;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.list {
  margin-bottom: 24rpx;
}

.list-item {
  display: flex;
  align-items: center;
  background: white;
  padding: 24rpx;
  margin-bottom: 16rpx;
  border-radius: 8rpx;
}

.user-checkbox {
  margin-right: 16rpx;
}

.item-main {
  flex: 1;
}

.item-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 8rpx;
}

.item-email {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.item-roles {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}

.role-tag {
  display: inline-block;
  padding: 4rpx 16rpx;
  background: #e6f7ff;
  color: #1890ff;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.role-tag.core {
  background: #e6f7ff;
  color: #1890ff;
  border: 1rpx solid #91d5ff;
}

.role-tag.auto {
  background: #f6ffed;
  color: #52c41a;
  border: 1rpx solid #b7eb8f;
}

.role-tag.explicit {
  background: #fff7e6;
  color: #fa8c16;
  border: 1rpx solid #ffd591;
}

.legend-bar {
  display: flex;
  gap: 24rpx;
  padding: 12rpx 16rpx;
  margin-bottom: 16rpx;
  background: white;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #666;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.legend-dot {
  display: inline-block;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}

.legend-dot.core { background: #1890ff; }
.legend-dot.auto { background: #52c41a; }
.legend-dot.explicit { background: #fa8c16; }

.modal-detail {
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-detail .modal-body {
  overflow-y: auto;
  flex: 1;
}

.detail-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 24rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #eee;
}

.detail-name {
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
}

.detail-email {
  font-size: 26rpx;
  color: #666;
}

.detail-time {
  font-size: 24rpx;
  color: #999;
}

.role-group {
  margin-bottom: 24rpx;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 12rpx;
}

.group-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.item-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  padding: 12rpx 24rpx;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.action-btn-danger {
  background: #ff4d4f;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.page-btn {
  padding: 12rpx 32rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  background: white;
  font-size: 26rpx;
}

.page-info {
  font-size: 26rpx;
  color: #666;
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  max-width: 800rpx;
  background: white;
  border-radius: 16rpx;
  z-index: 1000;
  overflow: hidden;
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

.modal-text {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 24rpx;
}

.reason-input {
  width: 100%;
  min-height: 120rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  padding: 16rpx 24rpx;
  font-size: 28rpx;
  margin-top: 16rpx;
}

.modal-footer {
  display: flex;
  border-top: 1rpx solid #eee;
}

.modal-btn {
  flex: 1;
  padding: 24rpx;
  border: none;
  background: #1890ff;
  color: white;
  font-size: 28rpx;
}

.modal-btn-cancel {
  background: white;
  color: #666;
  border-right: 1rpx solid #eee;
}

.role-tag.clickable {
  cursor: pointer;
}

.role-tag.unclickable {
  cursor: not-allowed;
  opacity: 0.7;
}

.role-checkbox-list {
  max-height: 400rpx;
  overflow-y: auto;
  margin-bottom: 16rpx;
}

.role-checkbox-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.role-label {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  margin-left: 16rpx;
}

.role-value {
  font-size: 22rpx;
  color: #999;
}

.role-source-dot {
  display: inline-block;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  margin-left: 8rpx;
}

.role-source-dot.auto { background: #52c41a; }
.role-source-dot.explicit { background: #fa8c16; }

.empty-tip {
  text-align: center;
  color: #999;
  font-size: 26rpx;
  padding: 32rpx 0;
}
</style>
