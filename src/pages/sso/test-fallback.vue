<template>
  <view class="test-page">
    <view class="page-title">wx-sso-login 组件降级测试</view>
    <view class="page-desc">PC 浏览器（非微信环境）应自动显示账号密码降级表单</view>

    <view class="component-container">
      <wx-sso-login
        app-code="admin"
        :redirect-uri="redirectUri"
        :invite-code="inviteCode"
        :channel-code="channelCode"
        fallback-mode="code"
        :fallback-enabled="true"
        @success="onSuccess"
        @error="onError"
        @redirect="onRedirect"
      />
    </view>

    <view class="event-log">
      <view class="log-title">事件日志：</view>
      <view v-for="(log, idx) in logs" :key="idx" class="log-line">{{ log }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const redirectUri = window.location.origin + '/#/pages/login/callback'
const inviteCode = 'TEST_INVITER_003'
const channelCode = 'CH_TEST_003'

const logs = ref([])

function addLog(msg) {
  const time = new Date().toLocaleTimeString()
  logs.value.unshift(`[${time}] ${msg}`)
}

function onSuccess(payload) {
  addLog('success: ' + JSON.stringify(payload).slice(0, 200))
}

function onError(err) {
  addLog('error: ' + JSON.stringify(err).slice(0, 200))
}

function onRedirect(url) {
  addLog('redirect: ' + url)
}
</script>

<style scoped>
.test-page {
  padding: 20px;
  max-width: 480px;
  margin: 0 auto;
}

.page-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 8px;
}

.page-desc {
  font-size: 13px;
  color: #999;
  margin-bottom: 20px;
}

.component-container {
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 20px;
}

.event-log {
  padding: 12px;
  background: #1e1e1e;
  border-radius: 8px;
  min-height: 100px;
}

.log-title {
  color: #fff;
  font-size: 13px;
  margin-bottom: 8px;
}

.log-line {
  color: #0f0;
  font-size: 12px;
  font-family: monospace;
  margin-bottom: 4px;
  word-break: break-all;
}
</style>
