<template>
  <view class="register-page">
    <view class="register-box">
      <view class="register-title">TAdmin 管理后台</view>
      <view class="register-subtitle">渠道邀请码注册</view>

      <!-- 步骤指示器 -->
      <view class="steps">
        <view class="step" :class="{ active: step === 1, done: step > 1 }">
          <view class="step-num">{{ step > 1 ? '✔' : '1' }}</view>
          <text class="step-label">验证邀请码</text>
        </view>
        <view class="step-line" :class="{ active: step > 1 }"></view>
        <view class="step" :class="{ active: step === 2 }">
          <view class="step-num">2</view>
          <text class="step-label">填写注册信息</text>
        </view>
      </view>

      <!-- 步骤1: 验证邀请码 -->
      <view v-if="step === 1">
        <view class="form-item">
          <input
            v-model="inviteCode"
            class="form-input"
            placeholder="请输入渠道邀请码"
            type="text"
            :disabled="validatingCode"
            @confirm="handleValidate"
          />
        </view>

        <view v-if="validError" class="error-text">{{ validError }}</view>

        <button
          class="register-btn"
          :disabled="validatingCode || !inviteCode.trim()"
          @click="handleValidate"
        >
          {{ validatingCode ? '验证中...' : '验证邀请码' }}
        </button>

        <view v-if="validatedChannel" class="channel-info">
          <text class="channel-info-label">邀请码有效</text>
          <text class="channel-info-item">渠道: {{ validatedChannel.name }}</text>
          <text class="channel-info-item">层级: {{ validatedChannel.channelTier }}</text>
        </view>

        <view class="form-links">
          <text class="link" @click="goLogin">已有账号？去登录</text>
        </view>
      </view>

      <!-- 步骤2: 填写注册信息 -->
      <view v-else-if="step === 2">
        <view class="form-item">
          <input
            v-model="form.name"
            class="form-input"
            placeholder="渠道名称"
            type="text"
          />
        </view>

        <!-- 层级类型选择 -->
        <view class="form-item">
          <text class="form-label">层级类型（可选）</text>
          <text class="form-hint">父渠道层级: {{ validatedChannel?.channelTier }}，不选则自动推断</text>
          <view class="tier-tree">
            <view
              class="tier-option"
              :class="{ selected: !form.channelTier }"
              @click="form.channelTier = ''"
            >
              <text class="tier-radio">{{ !form.channelTier ? '◉' : '○' }}</text>
              <text class="tier-label">不选（自动推断）</text>
            </view>
            <template v-for="node in tierTree" :key="node.tier">
              <view
                class="tier-option"
                :class="{ selected: form.channelTier === node.tier }"
                :style="{ paddingLeft: (node._depth || 0) * 20 + 8 + 'px' }"
                @click="toggleTier(node)"
              >
                <text class="tier-radio">{{ form.channelTier === node.tier ? '◉' : '○' }}</text>
                <text class="tier-label">{{ node.tier }}</text>
              </view>
              <template v-if="node.children.length">
                <view
                  v-for="child in node.children"
                  :key="child.tier"
                  class="tier-option"
                  :class="{ selected: form.channelTier === child.tier }"
                  :style="{ paddingLeft: ((child._depth || 0)) * 20 + 8 + 'px' }"
                  @click="toggleTier(child)"
                >
                  <text class="tier-radio">{{ form.channelTier === child.tier ? '◉' : '○' }}</text>
                  <text class="tier-label">{{ child.tier }}</text>
                </view>
              </template>
            </template>
          </view>
        </view>

        <view class="form-item">
          <input
            v-model="form.email"
            class="form-input"
            placeholder="邮箱"
            type="email"
          />
        </view>

        <view class="form-item">
          <input
            v-model="form.username"
            class="form-input"
            placeholder="用户名"
            type="text"
          />
        </view>

        <view class="form-item">
          <input
            v-model="form.password"
            class="form-input"
            placeholder="密码（至少6位）"
            type="password"
          />
        </view>

        <view class="form-item">
          <input
            v-model="form.confirmPassword"
            class="form-input"
            placeholder="确认密码"
            type="password"
            @confirm="handleRegister"
          />
        </view>

        <view v-if="registerError" class="error-text">{{ registerError }}</view>

        <button
          class="register-btn"
          :disabled="registering"
          @click="handleRegister"
        >
          {{ registering ? '注册中...' : '提交注册' }}
        </button>

        <view class="form-links">
          <text class="link" @click="step = 1">返回上一步</text>
          <text class="link" @click="goLogin">已有账号？去登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { validateInviteCode, registerWithInviteCode } from '../../api/register.js'

// ── 层级父子关系映射表（与服务端 config/tiers.ts 保持一致）──
const TIER_CHILDREN_MAP = {
  root:       ['core', 'senior', 'global', 'authorized', 'official', 'partner', 'agent'],
  core:       ['national'],
  senior:     ['national'],
  global:     ['national'],
  authorized: ['national'],
  official:   ['national'],
  partner:    ['national'],
  agent:      ['national'],
  national:   ['regional'],
  regional:   ['city'],
  city:       ['county'],
  county:     ['local'],
  local:      ['store'],
  store:      [],
}

/** 递归构建层级树（附加 _depth 用于缩进） */
function buildTierTree(parentTier, depth = 0) {
  const children = TIER_CHILDREN_MAP[parentTier] || []
  return children.map((tier) => {
    const node = { tier, _depth: depth, children: [] }
    node.children = buildTierTree(tier, depth + 1)
    return node
  })
}

// ── 步骤1: 验证邀请码 ──

const step = ref(1)
const inviteCode = ref('')

// 扫码进入时从 URL hash 读取 code 参数预填
onMounted(() => {
  const hashQuery = window.location.hash.split('?')[1] || ''
  const hashParams = new URLSearchParams(hashQuery)
  const code = hashParams.get('channelcode') || hashParams.get('code')
  if (code) {
    inviteCode.value = code
  }
})

const validatingCode = ref(false)
const validError = ref('')
const validatedChannel = ref(null)
const tierTree = ref([])

async function handleValidate() {
  if (!inviteCode.value.trim()) {
    uni.showToast({ title: '请输入邀请码', icon: 'none' })
    return
  }

  validatingCode.value = true
  validError.value = ''
  validatedChannel.value = null

  try {
    const res = await validateInviteCode(inviteCode.value.trim())
    if (res?.data?.valid && res?.data?.channel) {
      validatedChannel.value = res.data.channel
      // 根据父渠道层级构建可选子层级树
      tierTree.value = buildTierTree(res.data.channel.channelTier)
      step.value = 2
    } else {
      validError.value = '邀请码无效或已过期'
    }
  } catch (err) {
    validError.value = err.message || '验证失败，请检查网络'
  } finally {
    validatingCode.value = false
  }
}

// ── 步骤2: 注册 ──

const form = ref({
  name: '',
  channelTier: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
})
const registering = ref(false)
const registerError = ref('')

/** 点击层级选项：选中或取消 */
function toggleTier(node) {
  form.value.channelTier = form.value.channelTier === node.tier ? '' : node.tier
}

async function handleRegister() {
  // 表单验证
  if (!form.value.name.trim()) {
    uni.showToast({ title: '请输入渠道名称', icon: 'none' })
    return
  }
  if (!form.value.email.trim()) {
    uni.showToast({ title: '请输入邮箱', icon: 'none' })
    return
  }
  if (!form.value.username.trim()) {
    uni.showToast({ title: '请输入用户名', icon: 'none' })
    return
  }
  if (form.value.password.length < 6) {
    uni.showToast({ title: '密码至少6位', icon: 'none' })
    return
  }
  if (form.value.password !== form.value.confirmPassword) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }

  registering.value = true
  registerError.value = ''

  try {
    const res = await registerWithInviteCode({
      code: inviteCode.value.trim(),
      name: form.value.name.trim(),
      channelTier: form.value.channelTier || undefined,
      email: form.value.email.trim(),
      username: form.value.username.trim(),
      password: form.value.password,
    })

    // 不自动登录：避免"半登录"状态绕过 adminLocal 校验，跳登录页让用户走完整登录流程
    uni.showToast({ title: '注册成功，请重新登录', icon: 'success' })

    // 使用 window.location.href 强制跳转，绕过 UniApp 路由系统的 KeepAlive bug
    setTimeout(() => {
      window.location.href = window.location.origin + '/#/pages/login/index'
    }, 1000)
  } catch (err) {
    registerError.value = err.message || '注册失败，请稍后重试'
  } finally {
    registering.value = false
  }
}

// ── 导航 ──

function goLogin() {
  // 使用 window.location.href 强制跳转，绕过 UniApp 路由系统的 KeepAlive bug
  window.location.href = window.location.origin + '/#/pages/login/index'
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 0;
}

.register-box {
  width: 90%;
  max-width: 400px;
  padding: 40px 30px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.register-title {
  font-size: 28px;
  font-weight: bold;
  text-align: center;
  color: #333;
  margin-bottom: 4px;
}

.register-subtitle {
  font-size: 14px;
  text-align: center;
  color: #999;
  margin-bottom: 24px;
}

/* ── 步骤指示器 ── */

.steps {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.step-num {
  width: 28px;
  height: 28px;
  line-height: 28px;
  text-align: center;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
  color: #999;
  background: #f0f0f0;
  transition: all 0.3s;
}

.step.active .step-num {
  color: #fff;
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.step.done .step-num {
  color: #fff;
  background: #52c41a;
}

.step-label {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.step.active .step-label {
  color: #667eea;
  font-weight: 500;
}

.step-line {
  width: 40px;
  height: 2px;
  background: #f0f0f0;
  margin: 0 8px;
  margin-bottom: 20px;
  transition: all 0.3s;
}

.step-line.active {
  background: #52c41a;
}

/* ── 表单 ── */

.form-item {
  margin-bottom: 14px;
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

.form-input:focus {
  border-color: #667eea;
  outline: none;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.form-hint {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
}

.register-btn {
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

.register-btn[disabled] {
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

/* ── 错误提示 ── */

.error-text {
  color: #ff4d4f;
  font-size: 13px;
  margin-bottom: 8px;
  padding: 0 4px;
}

/* ── 邀请码有效信息 ── */

.channel-info {
  margin-top: 12px;
  padding: 12px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.channel-info-label {
  font-size: 13px;
  font-weight: 600;
  color: #52c41a;
}

.channel-info-item {
  font-size: 13px;
  color: #333;
}

/* ── 层级树 ── */

.tier-tree {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 6px;
  max-height: 200px;
  overflow-y: auto;
  background: #fff;
}

.tier-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.tier-option:active {
  background: #f0f0f0;
}

.tier-option.selected {
  background: #e9eaff;
}

.tier-radio {
  font-size: 14px;
  color: #667eea;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

.tier-label {
  font-size: 14px;
  color: #333;
}
</style>
