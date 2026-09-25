<!-- src/components/sso-loading-facade/sso-loading-facade.vue -->
<template>
  <view class="slf" :class="{ 'slf--compact': compact }" :style="brandVars">
    <view class="slf-card">
      <view v-if="!compact" class="slf-logo">{{ logoText }}</view>
      <view class="slf-spinner"></view>
      <text class="slf-title">{{ title }}</text>
      <text class="slf-tagline" :key="tagline">{{ tagline }}</text>
      <view v-if="statusText" class="slf-status">{{ statusText }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { BRAND, getSlogan } from './dict.js'

const props = defineProps({
  title: { type: String, default: '星枢统一关系中心' },
  logoText: { type: String, default: '星' },
  statusText: { type: String, default: '' },
  autoRotateTagline: { type: Boolean, default: true },
  // 紧凑靠上门面：用于非全屏场景（如 SSO 登录页微信自动跳转等待区）。
  // 默认 false 保持全屏居中卡片（login-callback 复用不受影响）。
  compact: { type: Boolean, default: false },
})

// UniApp 编译下 CSS 内联 v-bind('BRAND.xx') 可能不支持，
// 改为根元素 :style 注入品牌 CSS 变量，子元素通过 var(--brand-*) 引用（scoped 动态变量可继承至子元素）。
const brandVars = {
  '--brand-primary': BRAND.primary,
  '--brand-soft': BRAND.soft,
  '--brand-bg': BRAND.bg,
  '--brand-text': BRAND.text,
  '--brand-muted': BRAND.muted,
  '--brand-line': BRAND.line,
}

const tagline = ref(getSlogan())
let timer = null
const reduceMotion = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

function start() {
  if (props.autoRotateTagline && !reduceMotion) {
    timer = setInterval(() => { tagline.value = getSlogan() }, 3000)
  }
}
function stop() { if (timer) clearInterval(timer) }

onMounted(start)
onUnmounted(stop)
</script>

<style scoped>
.slf { min-height: 100vh; background: var(--brand-bg); display: flex; align-items: center; justify-content: center; padding: 24px; }
.slf-card { width: 100%; max-width: 360px; background: #fff; border-radius: 20px; padding: 48px 28px 36px; display: flex; flex-direction: column; align-items: center; gap: 14px; box-shadow: 0 8px 28px rgba(102, 126, 234, 0.12); }
.slf--compact { min-height: 0; background: transparent; padding: 12vh 24px 0; align-items: flex-start; justify-content: flex-start; }
.slf--compact .slf-card { background: transparent; box-shadow: none; max-width: none; padding: 0; gap: 16px; }
.slf--compact .slf-title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 1px;
  background: linear-gradient(120deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.slf--compact .slf-tagline { margin-top: 0; }
.slf--compact .slf-status { margin-top: 2px; }
.slf-logo { width: 72px; height: 72px; border-radius: 18px; background: var(--brand-primary); color: #fff; font-size: 34px; font-weight: bold; display: flex; align-items: center; justify-content: center; }
.slf-spinner { width: 34px; height: 34px; border: 3px solid var(--brand-line); border-top-color: var(--brand-primary); border-radius: 50%; animation: slf-spin 0.8s linear infinite; }
@keyframes slf-spin { to { transform: rotate(360deg); } }
.slf-title { font-size: 20px; font-weight: bold; color: var(--brand-text); }
.slf-tagline { font-size: 13px; color: var(--brand-muted); text-align: center; transition: opacity 0.3s; }
.slf-status { margin-top: 6px; padding: 8px 18px; background: var(--brand-soft); color: var(--brand-primary); border-radius: 999px; font-size: 14px; }
</style>