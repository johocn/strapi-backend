<template>
  <view class="page-container">
    <PageHeader title="渠道成员">
      <button class="btn-primary" @click="openInvite">+ 邀请</button>
    </PageHeader>

    <view class="channel-info-bar" v-if="channelName">
      <text class="channel-label">当前渠道: </text>
      <text class="channel-name-text">{{ channelName }}</text>
    </view>

    <view class="member-list">
      <view v-for="item in memberList" :key="item.id" class="member-card">
        <view class="member-info">
          <view class="member-avatar">{{ (item.username || item.email || '?')[0].toUpperCase() }}</view>
          <view class="member-detail">
            <view class="member-name">{{ item.username || item.email }}</view>
            <view class="member-email" v-if="item.username && item.email">{{ item.email }}</view>
          </view>
        </view>
        <view class="member-right">
          <view class="role-badge" :class="item.role">{{ roleText(item.role) }}</view>
          <view class="action-btn remove" @click="handleRemove(item)" v-if="item.role !== 'owner'">移除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && memberList.length === 0" class="empty-state">
      <text class="empty-icon">👥</text>
      <text class="empty-text">暂无成员</text>
      <button class="btn-primary" @click="openInvite" v-if="hasPermission('menu.members')">邀请成员</button>
    </view>

    <!-- 邀请成员弹窗 -->
    <view class="modal-mask" v-if="showInviteModal" @click="closeInvite">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">邀请成员</text>
          <text class="modal-close" @click="closeInvite">✕</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">邮箱 <text class="required">*</text></text>
            <input type="text" v-model="inviteForm.email" placeholder="请输入成员邮箱" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">角色</text>
            <picker mode="selector" :range="roleOptions" :range-key="'label'" @change="handleRoleChange">
              <view class="form-picker">
                <text>{{ inviteForm.roleLabel }}</text>
                <text class="arrow">▼</text>
              </view>
            </picker>
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeInvite">取消</button>
          <button class="btn-submit" @click="handleInvite" :loading="inviting">邀请</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getChannelMembers, addChannelMember, removeChannelMember, getAdminChannelDetail } from '../../api/channel.js'
import { useUserStore } from '../../store/user.js'
import PageHeader from '../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const channelId = ref(null)
const channelName = ref('')
const memberList = ref([])
const loading = ref(false)
const showInviteModal = ref(false)
const inviting = ref(false)

const roleOptions = [
  { value: 'member', label: '成员' },
  { value: 'admin', label: '管理员' },
]

const inviteForm = ref({
  email: '',
  role: 'member',
  roleLabel: '成员',
})

function roleText(role) {
  const map = { owner: '所有者', admin: '管理员', member: '成员' }
  return map[role] || role
}

async function loadData() {
  loading.value = true
  try {
    const params = { populate: ['user', 'channel'] }
    if (channelId.value) params.channel = channelId.value
    const res = await getChannelMembers(params)
    memberList.value = res.list ?? res.members ?? []
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadChannelInfo() {
  try {
    const res = await getAdminChannelDetail(channelId.value)
    channelName.value = res.name || ''
  } catch (e) {
    // ignore
  }
}

function openInvite() {
  inviteForm.value = { email: '', role: 'member', roleLabel: '成员' }
  showInviteModal.value = true
}

function closeInvite() {
  showInviteModal.value = false
}

function handleRoleChange(e) {
  const selected = roleOptions[e.detail.value]
  inviteForm.value.role = selected.value
  inviteForm.value.roleLabel = selected.label
}

async function handleInvite() {
  if (!inviteForm.value.email) {
    return uni.showToast({ title: '请输入邮箱', icon: 'none' })
  }
  inviting.value = true
  try {
    await addChannelMember({
      channelId: channelId.value,
      inviterId: userStore.userId,
      email: inviteForm.value.email,
      role: inviteForm.value.role,
    })
    uni.showToast({ title: '邀请成功', icon: 'success' })
    closeInvite()
    loadData()
  } catch (e) {
    uni.showToast({ title: '邀请失败', icon: 'none' })
  } finally {
    inviting.value = false
  }
}

async function handleRemove(item) {
  uni.showModal({
    title: '确认移除',
    content: `确定要将「${item.username || item.email}」从渠道中移除吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await removeChannelMember(item.id)
          uni.showToast({ title: '已移除', icon: 'success' })
          loadData()
        } catch (e) {
          uni.showToast({ title: '移除失败', icon: 'none' })
        }
      }
    }
  })
}

onMounted(() => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  channelId.value = current.$page?.options?.channelId || current.options?.channelId
  if (channelId.value) {
    loadChannelInfo()
  }
  loadData()
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.btn-primary {
  background: #ff0000; color: #fff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}

.channel-info-bar {
  background: #fff; padding: 20rpx 24rpx; border-radius: 12rpx;
  margin-bottom: 20rpx; display: flex; align-items: center;
}
.channel-label { font-size: 28rpx; color: #999; }
.channel-name-text { font-size: 28rpx; color: #333; font-weight: bold; }

.member-list { display: flex; flex-direction: column; gap: 16rpx; }

.member-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx;
  display: flex; justify-content: space-between; align-items: center;
}
.member-info { display: flex; align-items: center; gap: 20rpx; flex: 1; }
.member-avatar {
  width: 72rpx; height: 72rpx; border-radius: 36rpx;
  background: #e3f2fd; color: #1976d2; display: flex;
  align-items: center; justify-content: center;
  font-size: 32rpx; font-weight: bold; flex-shrink: 0;
}
.member-detail { flex: 1; }
.member-name { font-size: 30rpx; font-weight: bold; color: #333; }
.member-email { font-size: 24rpx; color: #999; margin-top: 4rpx; }

.member-right { display: flex; align-items: center; gap: 16rpx; }
.role-badge {
  font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx;
}
.role-badge.owner { background: #fff3e0; color: #ff9800; }
.role-badge.admin { background: #e3f2fd; color: #1976d2; }
.role-badge.member { background: #f5f5f5; color: #666; }

.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.remove { background: #fff0f0; color: #ff4d4f; }

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0;
}
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }

.modal-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.modal-content {
  width: 90%; background: #fff; border-radius: 16rpx;
  overflow: hidden; display: flex; flex-direction: column;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 30rpx; border-bottom: 1rpx solid #f0f0f0;
}
.modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.modal-close { font-size: 36rpx; color: #999; padding: 10rpx; }

.modal-body { padding: 30rpx; }

.form-item { margin-bottom: 32rpx; }
.form-item:last-child { margin-bottom: 0; }
.form-label { font-size: 28rpx; color: #333; margin-bottom: 12rpx; display: block; }
.required { color: #ff4d4f; }

.form-input {
  width: 100%; height: 80rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box;
}
.form-picker {
  display: flex; justify-content: space-between; align-items: center;
  height: 80rpx; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx;
  font-size: 28rpx;
}
.arrow { font-size: 20rpx; color: #999; }

.modal-footer {
  display: flex; gap: 20rpx; padding: 20rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
}
.btn-cancel {
  flex: 1; height: 88rpx; line-height: 88rpx; text-align: center;
  background: #f5f5f5; color: #666; font-size: 30rpx; border-radius: 8rpx; border: none;
}
.btn-submit {
  flex: 1; height: 88rpx; line-height: 88rpx; text-align: center;
  background: #07c160; color: #fff; font-size: 30rpx; border-radius: 8rpx; border: none;
}
</style>
