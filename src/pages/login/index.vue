<template>
  <view class="login-container">
    <view class="login-form">
      <text class="title">管理后台登录</text>
      <view class="form-item">
        <text class="label">账号</text>
        <input
          v-model="identifier"
          class="input"
          placeholder="请输入邮箱或用户名"
          @confirm="handleLogin"
        />
      </view>
      <view class="form-item">
        <text class="label">密码</text>
        <input
          v-model="password"
          class="input"
          type="password"
          placeholder="请输入密码"
          @confirm="handleLogin"
        />
      </view>
      <button class="login-btn" :loading="loading" @click="handleLogin">登录</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '../../store/user.js'

const userStore = useUserStore()
const identifier = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!identifier.value.trim()) {
    uni.showToast({ title: '请输入账号', icon: 'none' })
    return
  }
  if (!password.value) {
    uni.showToast({ title: '请输入密码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    await userStore.login(identifier.value.trim(), password.value)
    uni.reLaunch({ url: '/pages/dashboard/index' })
  } catch (err) {
    uni.showToast({ title: err.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}
.login-form {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
.title {
  display: block;
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 30px;
  color: #333;
}
.form-item {
  margin-bottom: 20px;
}
.label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}
.input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}
.login-btn {
  width: 100%;
  height: 44px;
  margin-top: 10px;
  background-color: #409eff;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 16px;
}
</style>
