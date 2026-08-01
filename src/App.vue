<template>
  <view class="app-container">
    <slot />
  </view>
</template>

<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('App Launch - localStorage:', {
    tadmin_token: uni.getStorageSync('tadmin_token'),
    tadmin_user: uni.getStorageSync('tadmin_user')
  })

  // 处理渠道邀请码（链接进入）
  handleChannelInviteCode()
})

onShow(() => {
  console.log('App Show - localStorage:', {
    tadmin_token: uni.getStorageSync('tadmin_token'),
    tadmin_user: uni.getStorageSync('tadmin_user')
  })

  // 每次显示都检查渠道邀请码
  handleChannelInviteCode()
})

onHide(() => {
  console.log('App Hide - localStorage:', {
    tadmin_token: uni.getStorageSync('tadmin_token'),
    tadmin_user: uni.getStorageSync('tadmin_user')
  })
})

function handleChannelInviteCode() {
  // #ifdef H5
  const urlParams = new URLSearchParams(window.location.search)
  const channelCode = urlParams.get('channelCode') || urlParams.get('inviteCode')

  if (channelCode) {
    console.log('[Web App] Channel invite code detected:', channelCode)

    // 存储渠道邀请码
    uni.setStorageSync('webChannelInviteCode', channelCode)

    // 清除URL参数
    const cleanUrl = removeChannelCodeFromUrl(window.location.href)
    window.history.replaceState({}, '', cleanUrl)
  }
  // #endif
}

function removeChannelCodeFromUrl(url) {
  const urlObj = new URL(url)
  urlObj.searchParams.delete('channelCode')
  urlObj.searchParams.delete('inviteCode')
  return urlObj.pathname + urlObj.search + urlObj.hash
}
</script>

<style>
page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f5f5f5;
}

.app-container {
  min-height: 100vh;
}
</style>