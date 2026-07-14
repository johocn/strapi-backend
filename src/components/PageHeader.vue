<template>
  <view class="page-header">
    <view class="header-left">
      <text class="back-btn" @click="goBack">← 返回</text>
      <text class="page-title">{{ title }}</text>
    </view>
    <view class="header-right">
      <slot></slot>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  title: { type: String, default: '' },
  fallbackUrl: { type: String, default: '/pages/dashboard/index' },
})

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else if (props.fallbackUrl) {
    uni.redirectTo({ url: props.fallbackUrl })
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;
}

.header-left {
  display: flex;
  align-items: center;
}

.back-btn {
  font-size: 28rpx;
  color: #1989fa;
  margin-right: 20rpx;
  cursor: pointer;
}

.page-title {
  font-size: 32rpx;
  font-weight: bold;
}

.header-right {
  display: flex;
  align-items: center;
}
</style>
