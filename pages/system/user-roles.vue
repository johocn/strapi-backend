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
              :class="['role-tag', role.source]"
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
            <text v-for="r in detailData.rolesBySource.core" :key="r.role" class="role-tag core">
              {{ r.label }}
            </text>
          </view>
        </view>

        <view class="role-group" v-if="detailData.rolesBySource.auto.length > 0">
          <text class="group-title"><text class="legend-dot auto"></text>自动授权（moduleVisibility）</text>
          <view class="group-tags">
            <text v-for="r in detailData.rolesBySource.auto" :key="r.role" class="role-tag auto">
              {{ r.label }}
            </text>
          </view>
        </view>

        <view class="role-group" v-if="detailData.rolesBySource.explicit.length > 0">
          <text class="group-title"><text class="legend-dot explicit"></text>显式分配</text>
          <view class="group-tags">
            <text v-for="r in detailData.rolesBySource.explicit" :key="r.role" class="role-tag explicit">
              {{ r.label }}
            </text>
          </view>
        </view>
      </view>
      <view class="modal-footer">
        <button class="modal-btn modal-btn-cancel" @click="closeDialogs">关闭</button>
        <button class="modal-btn" @click="openAssignDialog(detailData && {id: detailData.user.id, username: detailData.user.username, roles: detailData.roles.map(r=>r.role)})" v-if="hasPermission('menu.user-roles')">分配角色</button>
      </view>
    </view>

    <view class="modal" v-if="showAssignDialog">
      <view class="modal-header">
        <text class="modal-title">分配角色</text>
      </view>
      <view class="modal-body">
        <text class="modal-text">为用户 {{ currentUser?.username }} 分配角色</text>
        <picker
          v-model="selectedAssignRole"
          mode="selector"
          :range="assignableRoleOptions"
          range-key="label"
          @change="handleAssignRoleChange"
          class="role-picker"
        >
          <view class="picker-display">
            {{ assignRoleLabel || '请选择角色' }}
          </view>
        </picker>
        <textarea
          v-model="assignReason"
          class="reason-input"
          placeholder="请输入操作原因（可选）"
        ></textarea>
      </view>
      <view class="modal-footer">
        <button class="modal-btn modal-btn-cancel" @click="closeDialogs">取消</button>
        <button class="modal-btn" @click="handleAssignRole">确认</button>
      </view>
    </view>

    <view class="modal" v-if="showRevokeDialog">
      <view class="modal-header">
        <text class="modal-title">撤销角色</text>
      </view>
      <view class="modal-body">
        <text class="modal-text">为用户 {{ currentUser?.username }} 撤销角色</text>
        <picker
          v-model="selectedRevokeRole"
          mode="selector"
          :range="revocableRoles"
          range-key="label"
          @change="handleRevokeRoleChange"
          class="role-picker"
        >
          <view class="picker-display">
            {{ revokeRoleLabel || '请选择要撤销的角色' }}
          </view>
        </picker>
        <textarea
          v-model="revokeReason"
          class="reason-input"
          placeholder="请输入操作原因（可选）"
        ></textarea>
      </view>
      <view class="modal-footer">
        <button class="modal-btn modal-btn-cancel" @click="closeDialogs">取消</button>
        <button class="modal-btn" @click="handleRevokeRole">确认</button>
      </view>
    </view>

    <view class="modal" v-if="showBatchAssign">
      <view class="modal-header">
        <text class="modal-title">批量分配角色</text>
      </view>
      <view class="modal-body">
        <text class="modal-text">为选中的 {{ selectedUserIds.length }} 个用户批量分配角色</text>
        <picker
          v-model="batchAssignRole"
          mode="selector"
          :range="assignableRoleOptions"
          range-key="label"
          @change="handleBatchAssignRoleChange"
          class="role-picker"
        >
          <view class="picker-display">
            {{ batchAssignRoleLabel || '请选择角色' }}
          </view>
        </picker>
        <textarea
          v-model="batchAssignReason"
          class="reason-input"
          placeholder="请输入操作原因（可选）"
        ></textarea>
      </view>
      <view class="modal-footer">
        <button class="modal-btn modal-btn-cancel" @click="closeDialogs">取消</button>
        <button class="modal-btn" @click="handleBatchAssignRole">确认</button>
      </view>
    </view>

  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  getUsers, assignRole, revokeRole, batchAssignRoles,
  getUserDetail, getAssignableRoles,
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

const selectedAssignRole = ref('')
const assignReason = ref('')
const selectedRevokeRole = ref('')
const revokeReason = ref('')
const batchAssignRole = ref('')
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

const assignRoleLabel = computed(() => {
  const option = assignableRoleOptions.value.find(o => o.value === selectedAssignRole.value)
  return option ? option.label : ''
})

const revocableRoles = computed(() => {
  return (currentUser.value?.roleSources || []).filter(r => r.source !== 'auto')
})

const revokeRoleLabel = computed(() => {
  const option = revocableRoles.value.find(r => r.role === selectedRevokeRole.value)
  return option ? option.label : ''
})

const batchAssignRoleLabel = computed(() => {
  const option = assignableRoleOptions.value.find(o => o.value === batchAssignRole.value)
  return option ? option.label : ''
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

function openAssignDialog(item) {
  currentUser.value = item
  selectedAssignRole.value = ''
  assignReason.value = ''
  showDetailDialog.value = false
  showAssignDialog.value = true
}

function handleAssignRoleChange(e) {
  selectedAssignRole.value = assignableRoleOptions.value[e.detail.value].value
}

async function handleAssignRole() {
  if (!selectedAssignRole.value) {
    uni.showToast({ title: '请选择角色', icon: 'none' })
    return
  }
  try {
    await assignRole(currentUser.value.id, selectedAssignRole.value, assignReason.value)
    uni.showToast({
      title: '角色已分配，需通知用户重新登录生效',
      icon: 'none',
      duration: 3000,
    })
    closeDialogs()
    loadData()
  } catch (error) {
    uni.showToast({ title: error.message || '分配失败', icon: 'none' })
  }
}

function openRevokeDialog(item) {
  currentUser.value = item
  const revocable = (item.roleSources || []).filter(r => r.source !== 'auto')
  selectedRevokeRole.value = revocable.length > 0 ? revocable[0].role : ''
  revokeReason.value = ''
  showDetailDialog.value = false
  showRevokeDialog.value = true
}

function handleRevokeRoleChange(e) {
  selectedRevokeRole.value = revocableRoles.value[e.detail.value].role
}

async function handleRevokeRole() {
  if (!selectedRevokeRole.value) {
    uni.showToast({ title: '请选择要撤销的角色', icon: 'none' })
    return
  }
  if (revocableRoles.value.length <= 1) {
    uni.showToast({ title: '用户至少需要保留一个角色', icon: 'none' })
    return
  }
  try {
    await revokeRole(currentUser.value.id, selectedRevokeRole.value, revokeReason.value)
    uni.showToast({ title: '角色撤销成功', icon: 'success' })
    closeDialogs()
    loadData()
  } catch (error) {
    uni.showToast({ title: error.message || '撤销失败', icon: 'none' })
  }
}

function handleBatchAssignRoleChange(e) {
  batchAssignRole.value = assignableRoleOptions.value[e.detail.value].value
}

async function handleBatchAssignRole() {
  if (!batchAssignRole.value) {
    uni.showToast({ title: '请选择角色', icon: 'none' })
    return
  }
  try {
    await batchAssignRoles(selectedUserIds.value, batchAssignRole.value, batchAssignReason.value)
    uni.showToast({ title: '批量分配完成', icon: 'success' })
    closeDialogs()
    clearSelection()
    loadData()
  } catch (error) {
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
</style>
