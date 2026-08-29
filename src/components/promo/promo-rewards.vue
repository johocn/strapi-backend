<template>
  <view v-if="rewards?.enabled && rewardsList.length" class="promo-card promo-rewards">
    <text class="section-title">活动奖励</text>
    <view class="reward-list">
      <view v-for="r in rewardsList" :key="r.id" class="reward-item">
        <text class="reward-name">{{ r.name }}</text>
        <text class="reward-cond">{{ conditionText(r.condition) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  activity: { type: Object, default: null },
  config: { type: Object, default: null },
  rewards: { type: Object, default: null },
})

const rewardsList = computed(() => props.rewards?.rewards || [])

function conditionText(condition) {
  const map = {
    none: '无条件',
    wechat_auth: '微信授权',
    contact: '留联系方式',
    survey: '答问卷'
  }
  return map[condition || 'none'] || '无条件'
}
</script>

<style lang="scss" scoped>
.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: var(--c-text);
  margin-bottom: 20rpx;
}

.reward-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 0;
}

.reward-name {
  flex: 1;
  font-size: 28rpx;
  color: var(--c-text);
}

.reward-cond {
  flex-shrink: 0;
  margin-left: 16rpx;
  padding: 4rpx 16rpx;
  font-size: 22rpx;
  border-radius: 8rpx;
  background: var(--c-primary);
  color: #fff;
}
</style>
