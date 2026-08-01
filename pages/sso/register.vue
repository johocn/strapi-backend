<template>
  <view class="register-page">
    <view class="page-header">
      <text class="page-title">注册账号</text>
    </view>

    <view class="form-container">
      <view class="form-item">
        <text class="form-label">用户名 *</text>
        <input class="form-input" v-model="form.username" placeholder="请输入用户名" />
      </view>
      <view class="form-item">
        <text class="form-label">密码 *</text>
        <input class="form-input" v-model="form.password" type="password" placeholder="至少 6 位" />
      </view>
      <view class="form-item">
        <text class="form-label">确认密码 *</text>
        <input class="form-input" v-model="form.confirmPassword" type="password" placeholder="再次输入密码" />
      </view>
      <view class="form-item">
        <text class="form-label">手机号</text>
        <input class="form-input" v-model="form.mobile" type="number" placeholder="可选" />
      </view>
      <view class="form-item">
        <text class="form-label">邮箱</text>
        <input class="form-input" v-model="form.email" placeholder="可选" />
      </view>
      <view v-if="form.invite_code" class="form-item">
        <text class="form-label">邀请码</text>
        <input class="form-input" v-model="form.invite_code" disabled />
      </view>
      <view v-if="form.channel_code" class="form-item">
        <text class="form-label">渠道码</text>
        <input class="form-input" v-model="form.channel_code" disabled />
      </view>

      <view class="submit-btn" :class="{ disabled: submitting }" @click="handleSubmit">
        <text>{{ submitting ? '注册中...' : '注册' }}</text>
      </view>

      <view class="footer">
        <text class="footer-text">已有账号？</text>
        <text class="footer-link" @click="backToLogin">去登录</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { publicPost } from '../../src/utils/request.js'

const appCode = ref('')
const returnUrl = ref('')
const cEndUrl = ref('')
const submitting = ref(false)

const form = ref({
  username: '',
  password: '',
  confirmPassword: '',
  mobile: '',
  email: '',
  invite_code: '',
  channel_code: '',
})

function init(options) {
  appCode.value = options?.app_code || ''
  returnUrl.value = options?.return_url ? decodeURIComponent(options.return_url) : ''
  cEndUrl.value = options?.c_end_url ? decodeURIComponent(options.c_end_url) : ''
  form.value.invite_code = options?.invite_code || ''
  form.value.channel_code = options?.channel_code || ''
}

onLoad((options) => {
  init(options)
})

function validate() {
  if (!form.value.username.trim()) {
    uni.showToast({ title: '请填写用户名', icon: 'none' }); return false
  }
  if (form.value.password.length < 6) {
    uni.showToast({ title: '密码至少 6 位', icon: 'none' }); return false
  }
  if (form.value.password !== form.value.confirmPassword) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' }); return false
  }
  if (form.value.mobile && !/^1\d{10}$/.test(form.value.mobile)) {
    uni.showToast({ title: '手机号格式错误', icon: 'none' }); return false
  }
  if (form.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    uni.showToast({ title: '邮箱格式错误', icon: 'none' }); return false
  }
  return true
}

async function handleSubmit() {
  if (submitting.value) return
  if (!validate()) return
  if (!appCode.value || !returnUrl.value) {
    uni.showToast({ title: '参数缺失', icon: 'none' }); return
  }

  submitting.value = true
  try {
    const result = await publicPost('/zhao-sso/v1/auth/register', {
      app_code: appCode.value,
      username: form.value.username,
      password: form.value.password,
      mobile: form.value.mobile || undefined,
      email: form.value.email || undefined,
      invite_code: form.value.invite_code || undefined,
      channel_code: form.value.channel_code || undefined,
    })

    const token = result.access_token || result.jwt || result.token
    if (!token) throw new Error('注册成功但未获取到 token')

    const userEncoded = btoa(encodeURIComponent(JSON.stringify(result.user || {})))
    // 优先跳转到 C 端（c_end_url），无 c_end_url 时回退到 return_url
    const targetUrl = cEndUrl.value || returnUrl.value
    const sep = targetUrl.includes('?') ? '&' : '?'
    window.location.href = `${targetUrl}${sep}token=${token}&user=${userEncoded}`
  } catch (e) {
    const msg = e?.message || e?.error || '注册失败'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function backToLogin() {
  // URLSearchParams.toString() 会自动编码，不要手动 encodeURIComponent 避免双重编码
  const params = new URLSearchParams({
    app_code: appCode.value,
    return_url: returnUrl.value,
  })
  if (cEndUrl.value) params.append('c_end_url', cEndUrl.value)
  if (form.value.invite_code) params.append('invite_code', form.value.invite_code)
  if (form.value.channel_code) params.append('channel_code', form.value.channel_code)
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
.register-page {
  padding: 20px;
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background: #f5f5f5;
}
.page-header { text-align: center; padding: 30px 0 20px; }
.page-title { font-size: 22px; font-weight: bold; color: #333; }
.form-container {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.form-item { margin-bottom: 16px; }
.form-label { display: block; font-size: 14px; color: #666; margin-bottom: 6px; }
.form-input {
  width: 100%;
  height: 40px;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 14px;
  box-sizing: border-box;
}
.form-input[disabled] { background: #f5f5f5; color: #999; }
.submit-btn {
  margin-top: 24px;
  height: 44px;
  background: #667eea;
  color: #fff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}
.submit-btn.disabled { opacity: 0.6; }
.footer { text-align: center; padding: 20px 0; }
.footer-text { font-size: 14px; color: #666; }
.footer-link { font-size: 14px; color: #667eea; margin-left: 4px; }
</style>
