<template>
  <view class="float-contact">
    <view v-if="contact?.phone" class="float-btn float-btn--tel">
      <text class="float-icon">📞</text>
      <text class="float-label">电话</text>
    </view>
    <view class="float-btn float-btn--wx">
      <text class="float-icon">💬</text>
      <text class="float-label">微信</text>
    </view>
    <view class="float-btn float-btn--msg">
      <text class="float-icon">✍️</text>
      <text class="float-label">留言</text>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  contact: { type: Object, default: null },
  inWechat: { type: Boolean, default: false },
})
</script>

<style lang="scss" scoped>
.float-contact {
  position: absolute;
  right: 20rpx;
  top: 40%;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.float-btn {
  width: 92rpx;
  height: 92rpx;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.18);
}
.float-icon { font-size: 36rpx; line-height: 1; }
.float-label { font-size: 18rpx; margin-top: 4rpx; }
.float-btn--wx { background: #07c160; }
</style>