<template>
  <view class="callback-page">
    <view class="callback-title">登录回调</view>
    <view v-if="loading" class="status">正在兑换 token...</view>
    <view v-else-if="error" class="status error">{{ error }}</view>
    <view v-else-if="success" class="status success">
      <view>登录成功</view>
      <view class="user-info">用户：{{ userInfo?.username || userInfo?.uuid }}</view>
    </view>

    <view v-if="code" class="code-display">
      <view class="code-label">授权码：</view>
      <view class="code-value">{{ code }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { publicPost } from '../../src/utils/request.js'

const loading = ref(false)
const error = ref('')
const success = ref(false)
const code = ref('')
const userInfo = ref(null)

function onLoad(options) {
  // uniapp 页面生命周期：接收路由参数
  code.value = options?.code || ''
  if (code.value) {
    exchangeToken(code.value)
  } else {
    error.value = '未收到授权码'
  }
}

async function exchangeToken(authCode) {
  loading.value = true
  try {
    const result = await publicPost('/zhao-sso/v1/auth/token', {
      grant_type: 'authorization_code',
      code: authCode,
      app_code: 'admin',
      app_secret: 'AdminAppSecret@12345',
      redirect_uri: window.location.origin + '/#/pages/login/callback',
    })
    success.value = true
    userInfo.value = result
  } catch (e) {
    error.value = e?.message || 'token 兑换失败'
  } finally {
    loading.value = false
  }
}
</script>

<script>
export default {
  onLoad(options) {
    // 调用 setup 中的 onLoad（uniapp 页面生命周期在 options API 中）
    if (this.$options.setup) {
      this.$options.setup.onLoad?.(options)
    }
  }
}
</script>

<style scoped>
.callback-page {
  padding: 40px 20px;
  max-width: 480px;
  margin: 0 auto;
}

.callback-title {
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
}

.status {
  text-align: center;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.status.error {
  background: #fee;
  color: #c00;
}

.status.success {
  background: #efe;
  color: #060;
}

.user-info {
  margin-top: 8px;
  font-size: 13px;
}

.code-display {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
  margin-top: 20px;
}

.code-label {
  font-size: 13px;
  color: #999;
  margin-bottom: 4px;
}

.code-value {
  font-size: 12px;
  font-family: monospace;
  word-break: break-all;
  color: #333;
}
</style>
