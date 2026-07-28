<template>
  <view class="callback-page">
    <view class="callback-box">
      <view v-if="loading" class="loading-state">
        <view class="loading-spinner"></view>
        <text class="loading-text">正在完成登录...</text>
      </view>
      <view v-else-if="error" class="error-state">
        <text class="error-text">{{ error }}</text>
        <button class="retry-btn" @click="goLogin">返回登录</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../../src/store/user.js'
import { post } from '../../src/utils/request.js'

const userStore = useUserStore()
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  // 兼容 hash 路由：参数可能在 location.search，也可能在 location.hash 的 ? 之后
  const urlParams = new URLSearchParams(window.location.search)
  const hashQuery = window.location.hash.split('?')[1] || ''
  const hashParams = new URLSearchParams(hashQuery)

  // 从 URL 参数获取 code 和 state
  const code = urlParams.get('code') || hashParams.get('code')
  const state = urlParams.get('state') || hashParams.get('state') || ''

  if (!code) {
    error.value = '授权失败：未获取到授权码'
    loading.value = false
    return
  }

  try {
    // 解析 state 获取 platform 和 appType
    let platform = 'wechat'
    let appType = 'open_platform'
    try {
      const stateData = JSON.parse(decodeURIComponent(state))
      if (stateData.platform) platform = stateData.platform
      if (stateData.appType) appType = stateData.appType
    } catch {}

    const res = await post('/zhao-third/v1/third/callback', {
      platform,
      appType,
      code,
    })

    if (res?.jwt) {
      userStore.setUserData(res)
      // 与 user.js login() 保持一致：拉取完整角色/权限/渠道范围/租户列表
      // 缺失 fetchTenants 会导致多租户场景下 x-site-id header 不被注入，请求 403 或拿到默认租户数据
      await Promise.all([
        userStore.fetchUserRoles(),
        userStore.fetchPermissions(),
        userStore.fetchChannelScope(),
        userStore.fetchTenants(),
      ])

      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/dashboard/index' })
      }, 500)
    } else {
      error.value = '登录失败：未获取到令牌'
    }
  } catch (e) {
    error.value = e?.error || e?.message || '登录失败'
  } finally {
    loading.value = false
  }
})

function goLogin() {
  uni.reLaunch({ url: '/pages/login/index' })
}
</script>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.callback-box {
  width: 90%;
  max-width: 400px;
  padding: 40px 30px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 16px;
  color: #333;
}

.error-text {
  font-size: 16px;
  color: #e53935;
  margin-bottom: 16px;
}

.retry-btn {
  width: 100%;
  height: 44px;
  line-height: 44px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
}
</style>
