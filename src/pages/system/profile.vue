<template>
  <view class="page-container">
    <PageHeader title="个人中心" />

    <view class="profile-header">
      <view class="avatar">👤</view>
      <view class="info">
        <view class="username">{{ userStore.userInfo?.username || '管理员' }}</view>
        <view class="email">{{ userStore.userInfo?.email || '' }}</view>
        <view class="roles-row">
          <text
            v-for="role in userStore.roles"
            :key="role"
            class="role-tag"
          >{{ getRoleLabel(role) }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">编辑信息</view>
      <view class="form-group">
        <text class="form-label">昵称</text>
        <input
          v-model="form.username"
          class="form-input"
          placeholder="请输入昵称"
        />
      </view>
      <view class="form-group">
        <text class="form-label">邮箱</text>
        <input
          v-model="form.email"
          class="form-input"
          placeholder="请输入邮箱"
        />
      </view>
      <button class="save-btn" @click="handleSave" :loading="saving">保存修改</button>
    </view>

    <view class="section">
      <button class="logout-btn" @click="logout">退出登录</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../../store/user.js'
import { logout as doLogout } from '../../utils/auth.js'
import { updateProfile } from '../../api/user.js'
import { ROLE_LABELS } from '../../api/role-management.js'

const userStore = useUserStore()

const form = ref({
  username: '',
  email: ''
})
const saving = ref(false)

onMounted(() => {
  form.value.username = userStore.userInfo?.username || ''
  form.value.email = userStore.userInfo?.email || ''
})

function getRoleLabel(role) {
  return ROLE_LABELS[role] || role
}

async function handleSave() {
  if (!form.value.username.trim()) {
    uni.showToast({ title: '昵称不能为空', icon: 'none' })
    return
  }
  if (!form.value.email.trim()) {
    uni.showToast({ title: '邮箱不能为空', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await updateProfile({
      username: form.value.username,
      email: form.value.email
    })
    userStore.updateUserInfo({
      username: form.value.username,
      email: form.value.email
    })
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: error.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function logout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.clearUser()
        doLogout()
      }
    }
  })
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  padding: 20rpx;
  box-sizing: border-box;
  background: #f5f5f5;
}

.profile-header {
  display: flex;
  align-items: center;
  padding: 40rpx 32rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
  margin-bottom: 24rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60rpx;
  margin-right: 32rpx;
}

.info {
  flex: 1;
}

.username {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
}

.email {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 8rpx;
}

.roles-row {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  margin-top: 12rpx;
}

.role-tag {
  display: inline-block;
  padding: 4rpx 16rpx;
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 24rpx;
}

.form-group {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  background: #f9f9f9;
  border: 1rpx solid #e5e5e5;
  border-radius: 8rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #333;
}

.save-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: #1890ff;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 30rpx;
  margin-top: 16rpx;
}

.logout-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: #fff;
  color: #ff4d4f;
  border: 1rpx solid #ff4d4f;
  border-radius: 8rpx;
  font-size: 30rpx;
}
</style>
