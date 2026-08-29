<template>
  <view class="page-container">
    <PageHeader title="公众号接入配置">
      <button class="btn-primary" @click="loadConfig" :disabled="loading">刷新</button>
    </PageHeader>

    <view class="help-banner">
      <text class="help-icon">ℹ️</text>
      <text class="help-text">将下方「回调 URL、Token、编码模式」配置到微信公众号后台（mp.weixin.qq.com → 设置与开发 → 基本配置 → 服务器配置），并启用服务器配置后，即可使用菜单 / 自动回复 / 素材 / 图文能力。</text>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>

    <template v-if="!loading && config">
      <view class="data-card">
        <view class="section-title">服务器配置（读自后端 server-config）</view>
        <view class="config-row">
          <text class="config-label">URL</text>
          <view class="config-value-box">
            <text class="config-value" selectable>{{ config.url || config.callbackUrl || '-' }}</text>
            <text class="copy-btn" @click="copyText(config.url || config.callbackUrl)">复制</text>
          </view>
        </view>
        <view class="config-row">
          <text class="config-label">Token</text>
          <view class="config-value-box">
            <text class="config-value" selectable>{{ config.token || '-' }}</text>
            <text class="copy-btn" @click="copyText(config.token)">复制</text>
          </view>
        </view>

        <view class="config-row">
          <text class="config-label">编码模式</text>
          <text class="config-value">{{ encodeModeLabel }}</text>
        </view>
        <view class="config-row" v-if="config.encodingAESKey">
          <text class="config-label">EncodingAESKey</text>
          <view class="config-value-box">
            <text class="config-value" selectable>{{ config.encodingAESKey }}</text>
            <text class="copy-btn" @click="copyText(config.encodingAESKey)">复制</text>
          </view>
        </view>
        <view class="config-row" v-if="config.appId">
          <text class="config-label">AppID</text>
          <view class="config-value-box">
            <text class="config-value" selectable>{{ config.appId }}</text>
            <text class="copy-btn" @click="copyText(config.appId)">复制</text>
          </view>
        </view>
        <view class="config-row" v-if="config.appSecret">
          <text class="config-label">AppSecret</text>
          <text class="config-value">••••••••（已配置）</text>
        </view>
      </view>

      <view class="data-card">
        <view class="section-title">公众号后台配置步骤</view>
        <view class="step-item" v-for="(s, i) in steps" :key="i">
          <view class="step-num">{{ i + 1 }}</view>
          <text class="step-text">{{ s }}</text>
        </view>
      </view>
    </template>

    <view v-if="!loading && !config" class="empty-state">
      <text class="empty-icon">🔧</text>
      <text class="empty-text">暂无服务器配置，请检查后端 wx server-config 接口</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ssoWxServerConfig } from '../../api/wechat.js'
import PageHeader from '../../components/PageHeader.vue'

const config = ref(null)
const loading = ref(false)

const steps = [
  '登录微信公众平台 mp.weixin.qq.com，进入「设置与开发 → 基本配置」。',
  '在「服务器配置」中点击修改，将上方 URL 填入 URL 字段。',
  '随机生成或自定义 Token 与 EncodingAESKey，并保持与上面一致。',
  '消息加解密方式建议选择「安全模式」或「兼容模式」（需与后端 encoding_mode 匹配）。',
  '点击「提交」，微信会向 URL 发送验证请求，验证通过后点击「启用」。',
  '启用成功后，公众号消息将回调到本系统，即可使用自动回复、菜单、图文等功能。',
]

const encodeModeLabel = computed(() => {
  const m = (config.value && (config.value.encodingMode || config.value.encoding_mode)) || ''
  const map = {
    plain: '明文模式',
    compatible: '兼容模式',
    safe: '安全模式',
  }
  return map[m] || m || '明文模式'
})

function copyText(text) {
  if (!text) {
    uni.showToast({ title: '无内容可复制', icon: 'none' })
    return
  }
  uni.setClipboardData({
    data: String(text),
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
  })
}

async function loadConfig() {
  loading.value = true
  try {
    config.value = await ssoWxServerConfig()
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onMounted(loadConfig)
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: #ff0000; color: #fff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.help-banner { display: flex; align-items: flex-start; gap: 12rpx; background: #e6f4ff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; border-left: 6rpx solid #1677ff; }
.help-icon { font-size: 28rpx; flex-shrink: 0; }
.help-text { font-size: 26rpx; color: #333; line-height: 1.5; }
.data-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; padding-left: 8rpx; border-left: 6rpx solid #ff0000; }
.config-row { display: flex; align-items: flex-start; margin-bottom: 20rpx; }
.config-label { width: 180rpx; font-size: 26rpx; color: #666; flex-shrink: 0; margin-top: 4rpx; }
.config-value-box { flex: 1; display: flex; align-items: center; gap: 12rpx; }
.config-value { font-size: 26rpx; color: #333; word-break: break-all; }
.copy-btn { font-size: 24rpx; color: #1677ff; flex-shrink: 0; }
.step-item { display: flex; align-items: flex-start; gap: 16rpx; margin-bottom: 16rpx; }
.step-num { width: 40rpx; height: 40rpx; line-height: 40rpx; text-align: center; background: #ff0000; color: #fff; border-radius: 50%; font-size: 24rpx; flex-shrink: 0; }
.step-text { flex: 1; font-size: 26rpx; color: #666; line-height: 1.5; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }
</style>