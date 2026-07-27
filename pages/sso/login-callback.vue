<template>
  <view class="callback-page">
    <view class="callback-title">登录中</view>

    <view v-if="loading" class="status">正在兑换 token...</view>
    <view v-else-if="error" class="status error">
      <text>{{ error }}</text>
      <view class="retry-btn" @click="backToLogin">返回登录</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { publicPost } from '../../src/utils/request.js'

const loading = ref(false)
const error = ref('')
const code = ref('')
const returnUrl = ref('')
const appCode = ref('')

async function init(options) {
  // OAuth 回调失败时后端 302 携带 error 参数
  const errorMsg = options?.error
  if (errorMsg) {
    error.value = decodeURIComponent(errorMsg)
    return // 不再调 exchangeToken
  }

  code.value = options?.code || ''
  returnUrl.value = options?.return_url ? decodeURIComponent(options.return_url) : ''
  appCode.value = options?.app_code || ''

  if (!code.value) {
    error.value = '未收到授权码'
    return
  }
  if (!returnUrl.value) {
    error.value = '未收到 return_url'
    return
  }
  if (!appCode.value) {
    error.value = '未收到 app_code'
    return
  }

  await exchangeToken()
}

onLoad((options) => {
  init(options)
})

async function exchangeToken() {
  loading.value = true
  try {
    const result = await publicPost('/zhao-sso/v1/auth/exchange-token', {
      code: code.value,
      app_code: appCode.value,
      redirect_uri: window.location.origin + '/#/pages/sso/login-callback',
    })

    const token = result.access_token || result.jwt || result.token
    if (!token) {
      throw new Error('未获取到 token')
    }

    const userEncoded = btoa(encodeURIComponent(JSON.stringify(result.user || {})))
    const sep = returnUrl.value.includes('?') ? '&' : '?'
    window.location.href = `${returnUrl.value}${sep}token=${token}&user=${userEncoded}`
  } catch (e) {
    // 失败：跳回 sso/login 携带 error 参数，让用户用降级表单登录
    error.value = e?.message || e?.error || 'token 兑换失败'
    const errMsg = encodeURIComponent(error.value)
    const params = new URLSearchParams({
      app_code: appCode.value,
      return_url: encodeURIComponent(returnUrl.value),
      error: errMsg,
    })
    setTimeout(() => {
      uni.reLaunch({ url: `/pages/sso/login?${params.toString()}` })
    }, 1500) // 1.5 秒后跳转，让用户看到错误提示
  } finally {
    loading.value = false
  }
}

function backToLogin() {
  const params = new URLSearchParams({
    app_code: appCode.value,
    return_url: encodeURIComponent(returnUrl.value),
  })
  uni.reLaunch({ url: `/pages/sso/login?${params.toString()}` })
}
</script>

<script>
export default {
  onLoad(options) {
    if (this.$options.setup && this.$options.setup.onLoad) {
      this.$options.setup.onLoad(options)
    }
  }
}
</script>

<style scoped>
.callback-page {
  padding: 40px 20px;
  max-width: 480px;
  margin: 0 auto;
  text-align: center;
}
.callback-title { font-size: 20px; font-weight: bold; margin-bottom: 20px; }
.status { padding: 16px; border-radius: 8px; }
.status.error { background: #fee; color: #c00; }
.retry-btn {
  margin-top: 20px;
  padding: 10px 24px;
  background: #667eea;
  color: #fff;
  border-radius: 6px;
  display: inline-block;
}
</style>
