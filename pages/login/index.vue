<template>
  <view class="login-page">
    <view class="login-box">
      <view class="login-title">TAdmin 管理后台</view>
      <view class="login-subtitle">Strapi 全栈管理系统</view>

      <!-- 渠道邀请提示 -->
      <view v-if="showChannelInviteTip" class="channel-invite-tip">
        <view class="tip-icon">🏢</view>
        <view class="tip-content">
          <text class="tip-title">渠道邀请</text>
          <text class="tip-text">登录后将自动加入渠道</text>
        </view>
      </view>

      <!-- 三方登录模式 -->
      <view v-if="authMode === 'third' && mode === 'login'">
        <view class="third-section">
          <button class="third-btn wechat" @click="handleThirdLogin('wechat', 'open_platform')">
            <text>微信扫码登录</text>
          </button>
          <text class="third-hint">使用微信开放平台扫码登录</text>
        </view>

        <!-- 降级：本地登录 -->
        <view class="divider">
          <view class="line"></view>
          <text class="text">或使用账号密码登录</text>
          <view class="line"></view>
        </view>

        <view class="form-item">
          <input
            v-model="form.identifier"
            class="form-input"
            placeholder="用户名/邮箱"
            type="text"
          />
        </view>
        <view class="form-item">
          <input
            v-model="form.password"
            class="form-input"
            placeholder="密码"
            type="password"
            @confirm="handleLogin"
          />
        </view>
        <view class="form-item">
          <input
            v-model="form.tenantCode"
            class="form-input"
            placeholder="租户代码（可选）"
            type="text"
          />
        </view>
        <button
          class="login-btn"
          :disabled="loading"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>

        <view class="form-links">
          <text class="link" @click="mode = 'register'">注册账号</text>
          <text class="link" @click="goInviteRegister">邀请码注册</text>
          <text class="link" @click="mode = 'forgot'">忘记密码</text>
        </view>
      </view>

      <!-- SSO模式 -->
      <view v-else-if="authMode === 'sso' && mode === 'login'">
        <view class="sso-section">
          <button class="sso-btn" @click="redirectToSso">
            <text>前往SSO登录</text>
          </button>
          <text class="sso-hint">使用统一身份认证登录</text>
        </view>

        <!-- 降级：本地登录 -->
        <view class="divider">
          <view class="line"></view>
          <text class="text">或使用账号密码登录</text>
          <view class="line"></view>
        </view>

        <view class="form-item">
          <input
            v-model="form.identifier"
            class="form-input"
            placeholder="用户名/邮箱"
            type="text"
          />
        </view>
        <view class="form-item">
          <input
            v-model="form.password"
            class="form-input"
            placeholder="密码"
            type="password"
            @confirm="handleLogin"
          />
        </view>
        <view class="form-item">
          <input
            v-model="form.tenantCode"
            class="form-input"
            placeholder="租户代码（可选）"
            type="text"
          />
        </view>
        <button
          class="login-btn"
          :disabled="loading"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>

        <view class="form-links">
          <text class="link" @click="mode = 'register'">注册账号</text>
          <text class="link" @click="goInviteRegister">邀请码注册</text>
          <text class="link" @click="mode = 'forgot'">忘记密码</text>
        </view>
      </view>

      <!-- 本地模式 -->
      <view v-else-if="authMode === 'local' && mode === 'login'">
        <view class="form-item">
          <input
            v-model="form.identifier"
            class="form-input"
            placeholder="用户名/邮箱"
            type="text"
          />
        </view>
        <view class="form-item">
          <input
            v-model="form.password"
            class="form-input"
            placeholder="密码"
            type="password"
            @confirm="handleLogin"
          />
        </view>
        <view class="form-item">
          <input
            v-model="form.tenantCode"
            class="form-input"
            placeholder="租户代码（可选）"
            type="text"
          />
        </view>
        <button
          class="login-btn"
          :disabled="loading"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>
        <view class="form-links">
          <text class="link" @click="mode = 'register'">注册账号</text>
          <text class="link" @click="goInviteRegister">邀请码注册</text>
          <text class="link" @click="mode = 'forgot'">忘记密码</text>
        </view>
      </view>

      <!-- 注册表单 -->
      <view v-else-if="mode === 'register'">
        <view class="form-item">
          <input
            v-model="regForm.username"
            class="form-input"
            placeholder="用户名"
            type="text"
          />
        </view>
        <view class="form-item">
          <input
            v-model="regForm.email"
            class="form-input"
            placeholder="邮箱"
            type="email"
          />
        </view>
        <view class="form-item">
          <input
            v-model="regForm.password"
            class="form-input"
            placeholder="密码（至少6位）"
            type="password"
          />
        </view>
        <view class="form-item">
          <input
            v-model="regForm.confirmPassword"
            class="form-input"
            placeholder="确认密码"
            type="password"
            @confirm="handleRegister"
          />
        </view>
        <button
          class="login-btn"
          :disabled="loading"
          @click="handleRegister"
        >
          {{ loading ? '注册中...' : '注册' }}
        </button>
        <view class="form-links">
          <text class="link" @click="mode = 'login'">已有账号？去登录</text>
          <text class="link" @click="goInviteRegister">邀请码注册</text>
        </view>
      </view>

      <!-- 忘记密码表单 -->
      <view v-else-if="mode === 'forgot'">
        <view class="form-item">
          <input
            v-model="forgotForm.email"
            class="form-input"
            placeholder="注册邮箱"
            type="email"
            @confirm="handleForgot"
          />
        </view>
        <button
          class="login-btn"
          :disabled="loading"
          @click="handleForgot"
        >
          {{ loading ? '发送中...' : '发送重置链接' }}
        </button>
        <view class="form-links">
          <text class="link" @click="mode = 'login'">返回登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../src/store/user.js'
import { post } from '../../src/utils/request.js'
import { adminLogin } from '../../src/api/auth.js'
import { fetchAuthConfig, getStoredAuthConfig } from '../../src/utils/auth-config.js'
import { loadSiteConfig, isFeatureEnabled } from '../../src/utils/config-helper.js'

const userStore = useUserStore()
const loading = ref(false)
const mode = ref('login')

// 认证配置
const authConfig = ref({ mode: 'local', ssoLoginUrl: '' })
const authMode = computed(() => authConfig.value?.mode ?? 'local')
const ssoLoginUrl = computed(() => authConfig.value?.ssoLoginUrl ?? '')

// 渠道邀请码
const channelInviteCode = ref('')
const showChannelInviteTip = ref(false)
const showChannelInviteEnabled = ref(true)

const form = ref({
  identifier: '',
  password: '',
  tenantCode: ''
})

const regForm = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const forgotForm = ref({
  email: ''
})

onMounted(async () => {
  // 1. 获取认证配置
  const stored = getStoredAuthConfig()
  if (stored) {
    authConfig.value = stored
  } else {
    authConfig.value = await fetchAuthConfig()
    uni.setStorageSync('webAuthConfig', JSON.stringify(authConfig.value))
  }

  console.log('[Web Login] Auth mode:', authMode.value)
  console.log('[Web Login] SSO enabled:', authMode.value === 'sso')

  // 2. 加载站点配置并检查渠道邀请开关
  await loadSiteConfig()
  showChannelInviteEnabled.value = isFeatureEnabled('channelInviteEnabled')

  // 3. 读取渠道邀请码
  channelInviteCode.value = uni.getStorageSync('webChannelInviteCode') ?? ''
  if (channelInviteCode.value && showChannelInviteEnabled.value) {
    showChannelInviteTip.value = true
  }
})

function goInviteRegister() {
  uni.navigateTo({ url: '/pages/register/index' })
}

function redirectToSso() {
  if (!ssoLoginUrl.value) {
    uni.showToast({ title: 'SSO登录地址未配置', icon: 'none' })
    return
  }

  // 保存当前页面路径
  const currentPage = '/pages/dashboard/index'
  uni.setStorageSync('ssoRedirectUrl', currentPage)

  // 跳转到SSO登录页
  // #ifdef H5
  const separator = ssoLoginUrl.value.includes('?') ? '&' : '?'
  window.location.href = ssoLoginUrl.value + separator + 'redirect=' + encodeURIComponent(currentPage)
  // #endif

  // #ifndef H5
  uni.showToast({ title: '请在浏览器中打开SSO登录', icon: 'none' })
  // #endif
}

async function handleThirdLogin(platform, appType) {
  loading.value = true
  try {
    const redirectUrl = window.location.origin + '/pages/auth-callback/index'
    const res = await post('/zhao-third/v1/third/auth-url', {
      platform,
      appType,
      redirectUrl,
    })

    if (res?.authorizeUrl) {
      // #ifdef H5
      window.location.href = res.authorizeUrl
      // #endif

      // #ifndef H5
      uni.showToast({ title: '请在浏览器中打开三方登录', icon: 'none' })
      // #endif
    } else {
      uni.showToast({ title: '获取授权地址失败', icon: 'none' })
    }
  } catch (error) {
    uni.showToast({ title: error?.error ?? '三方登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function handleLogin() {
  if (!form.value.identifier || !form.value.password) {
    uni.showToast({ title: '请输入用户名和密码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const res = await adminLogin(form.value.identifier, form.value.password, form.value.tenantCode)

    userStore.setUserData(res)
    await userStore.fetchUserRoles()

    // 处理渠道邀请码
    await handleChannelInviteAfterLogin(res.user?.id)

    uni.showToast({ title: '登录成功', icon: 'success' })

    setTimeout(() => {
      uni.reLaunch({ url: '/pages/dashboard/index' })
    }, 500)
  } catch (error) {
    // adminRequest 已通过 uni.showToast 显示后端返回的中文错误（如"密码错误"/"账号不存在或已注销"）
    // 这里只在 console 留痕便于排查，不再覆盖toast
    console.warn('[Login] login failed:', error)
  } finally {
    loading.value = false
  }
}

async function handleChannelInviteAfterLogin(userId) {
  if (!channelInviteCode.value) return

  try {
    uni.showLoading({ title: '正在加入渠道...' })

    const { joinChannelByInvite } = await import('../../src/api/channel.js')
    const joinResult = await joinChannelByInvite(channelInviteCode.value)

    uni.hideLoading()
    uni.showToast({
      title: '已成功加入渠道',
      icon: 'success',
      duration: 2000
    })

    uni.removeStorageSync('webChannelInviteCode')
    channelInviteCode.value = ''

    const joinedChannelId = joinResult?.channelId || joinResult?.channel?.id || joinResult?.id
    setTimeout(() => {
      uni.navigateTo({ url: joinedChannelId ? `/pages/channel/members?channelId=${joinedChannelId}` : '/pages/channel/members' })
    }, 2000)
  } catch (e) {
    uni.hideLoading()
    uni.showModal({
      title: '渠道邀请失败',
      content: '邀请码无效或已过期',
      showCancel: false
    })
  }
}

async function handleRegister() {
  if (!regForm.value.username || !regForm.value.email || !regForm.value.password) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }
  if (regForm.value.password.length < 6) {
    uni.showToast({ title: '密码至少6位', icon: 'none' })
    return
  }
  if (regForm.value.password !== regForm.value.confirmPassword) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const res = await post('/zhao-auth/v1/register', {
      username: regForm.value.username,
      email: regForm.value.email,
      password: regForm.value.password
    })

    userStore.setUserData(res)
    uni.showToast({ title: '注册成功', icon: 'success' })

    setTimeout(() => {
      uni.reLaunch({ url: '/pages/dashboard/index' })
    }, 500)
  } catch (error) {
    console.warn('[Login] register failed:', error)
  } finally {
    loading.value = false
  }
}

async function handleForgot() {
  if (!forgotForm.value.email) {
    uni.showToast({ title: '请输入邮箱', icon: 'none' })
    return
  }

  loading.value = true
  try {
    await post('/zhao-auth/v1/reset-password', {
      email: forgotForm.value.email
    })
    uni.showToast({ title: '重置链接已发送', icon: 'success' })
    setTimeout(() => {
      mode.value = 'login'
    }, 1000)
  } catch (error) {
    console.warn('[Login] forgot password failed:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.channel-invite-tip {
  background: #e3f2fd;
  border: 2rpx solid #2196f3;
  border-radius: 16rpx;
  padding: 20rpx 30rpx;
  margin-bottom: 30rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.tip-icon {
  font-size: 48rpx;
}

.tip-content {
  flex: 1;
}

.tip-title {
  font-size: 28rpx;
  color: #2196f3;
  font-weight: bold;
}

.tip-text {
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
}

.sso-section {
  margin-bottom: 30rpx;
}

.third-section {
  margin-bottom: 30rpx;
}

.third-btn {
  width: 100%;
  height: 96rpx;
  border: none;
  border-radius: 48rpx;
  font-size: 32rpx;
  font-weight: bold;
  color: #fff;
}

.third-btn.wechat {
  background: #07c160;
}

.third-hint {
  font-size: 24rpx;
  color: #999;
  text-align: center;
  margin-top: 10rpx;
}

.sso-btn {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 48rpx;
  font-size: 32rpx;
  font-weight: bold;
}

.sso-hint {
  font-size: 24rpx;
  color: #999;
  text-align: center;
  margin-top: 10rpx;
}

.divider {
  display: flex;
  align-items: center;
  margin-top: 30rpx;
}

.line {
  flex: 1;
  height: 1rpx;
  background: #e0e0e0;
}

.text {
  font-size: 24rpx;
  color: #999;
  padding: 0 20rpx;
}

.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 90%;
  max-width: 400px;
  padding: 40px 30px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.login-title {
  font-size: 28px;
  font-weight: bold;
  text-align: center;
  color: #333;
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 14px;
  text-align: center;
  color: #999;
  margin-bottom: 32px;
}

.form-item {
  margin-bottom: 16px;
}

.form-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  box-sizing: border-box;
}

.login-btn {
  width: 100%;
  height: 48px;
  line-height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  margin-top: 8px;
}

.login-btn[disabled] {
  opacity: 0.7;
}

.form-links {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding: 0 4px;
}

.link {
  font-size: 14px;
  color: #667eea;
  cursor: pointer;
}

.link:active {
  opacity: 0.7;
}
</style>