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
import { publicPost } from '../../utils/request.js'

const loading = ref(false)
const error = ref('')
const code = ref('')
const returnUrl = ref('')
const cEndUrl = ref('')
const appCode = ref('')
const inviteCode = ref('')
const channelCode = ref('')

async function init(options) {
  // OAuth 回调失败时后端 302 携带 error 参数
  const errorMsg = options?.error
  if (errorMsg) {
    error.value = decodeURIComponent(errorMsg)
    return // 不再调 exchangeToken
  }

  code.value = options?.code || ''
  returnUrl.value = options?.return_url ? decodeURIComponent(options.return_url) : ''
  cEndUrl.value = options?.c_end_url ? decodeURIComponent(options.c_end_url) : ''
  appCode.value = options?.app_code || ''

  // 解码 state（Type A：base64url JSON 信封，由 SSO 后端 wechatRedirect/alipayRedirect 构造）
  // 提取 invite_code 和 channel_code 用于失败回跳时透传；redirect_uri/app_code 更可靠，覆盖
  const stateRaw = options?.state || ''
  if (stateRaw) {
    try {
      const stateData = JSON.parse(atob(stateRaw.replace(/-/g, '+').replace(/_/g, '/')))
      inviteCode.value = stateData.invite_code || ''
      channelCode.value = stateData.channel_code || ''
      // state 中的 return_url 和 app_code 更可靠，覆盖
      if (stateData.redirect_uri) returnUrl.value = stateData.redirect_uri
      if (stateData.app_code) appCode.value = stateData.app_code
    } catch (e) {
      console.warn('[SSO login-callback] state 解码失败:', e)
    }
  }

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
    // 优先跳转到 C 端（c_end_url），SSO 认证完成后直接回 C 端 auth-callback 写入 token
    // 无 c_end_url 时回退到 return_url（SSO 端 auth-callback 中转）
    const targetUrl = cEndUrl.value || returnUrl.value
    const sep = targetUrl.includes('?') ? '&' : '?'
    // 透传 is_new（标识首登用户），C 端 auth-callback 会存 storage，首页据此显示欢迎提示
    const isNewFlag = result.is_new === true || result.isNew === true ? '1' : ''
    const isNewParam = isNewFlag ? `&isNew=${isNewFlag}` : ''
    window.location.href = `${targetUrl}${sep}token=${token}&user=${userEncoded}${isNewParam}`
  } catch (e) {
    // 失败：跳回 sso/login 携带 error 参数，让用户用降级表单登录
    // 透传 invite_code/channel_code，保证降级登录也能建立分销关系
    // 透传 c_end_url，保证降级后仍能跳回 C 端
    error.value = e?.message || e?.error || 'token 兑换失败'
    // 注意：URLSearchParams.toString() 会自动对值做 application/x-www-form-urlencoded 编码
    // 不要再手动 encodeURIComponent，否则会导致 return_url 被双重编码
    const params = new URLSearchParams({
      app_code: appCode.value,
      return_url: returnUrl.value,
      error: error.value,
    })
    if (cEndUrl.value) params.append('c_end_url', cEndUrl.value)
    if (inviteCode.value) params.append('invite_code', inviteCode.value)
    if (channelCode.value) params.append('channel_code', channelCode.value)
    setTimeout(() => {
      uni.reLaunch({ url: `/pages/sso/login?${params.toString()}` })
    }, 1500) // 1.5 秒后跳转，让用户看到错误提示
  } finally {
    loading.value = false
  }
}

function backToLogin() {
  // 同样避免双重编码：URLSearchParams 会自动编码
  const params = new URLSearchParams({
    app_code: appCode.value,
    return_url: returnUrl.value,
  })
  if (cEndUrl.value) params.append('c_end_url', cEndUrl.value)
  if (inviteCode.value) params.append('invite_code', inviteCode.value)
  if (channelCode.value) params.append('channel_code', channelCode.value)
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
