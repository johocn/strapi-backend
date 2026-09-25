<template>
  <view class="promo-card promo-tour">
    <text v-if="title" class="section-title">{{ title }}</text>

    <view v-if="meetupPoint" class="tour-meetup">
      <text class="tour-meetup-label">集合地点</text>
      <text class="tour-meetup-value">{{ meetupPoint }}</text>
    </view>

    <view v-if="groupTip" class="tour-group" :class="{ ok: groupOk }">
      <text>{{ groupTip }}</text>
    </view>

    <view v-if="days.length" class="tour-days">
      <view v-for="(d, di) in days" :key="di" class="tour-day">
        <view class="tour-day-head">
          <text class="tour-day-badge">D{{ d.day }}</text>
          <text v-if="d.title" class="tour-day-title">{{ d.title }}</text>
        </view>
        <view v-if="(d.stops || []).length" class="tour-stops">
          <view v-for="(s, si) in d.stops" :key="si" class="tour-stop">
            <view class="tour-stop-time">
              <text>{{ s.time }}</text>
            </view>
            <view class="tour-stop-track">
              <view class="tour-stop-dot" />
              <view class="tour-stop-line" />
            </view>
            <view class="tour-stop-body">
              <text class="tour-stop-title">{{ s.title }}</text>
              <text v-if="s.desc" class="tour-stop-desc">{{ s.desc }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="costIncludes || costExcludes" class="tour-cost">
      <view v-if="costIncludes" class="tour-cost-block">
        <text class="tour-cost-label">费用包含</text>
        <text class="tour-cost-text">{{ costIncludes }}</text>
      </view>
      <view v-if="costExcludes" class="tour-cost-block">
        <text class="tour-cost-label">费用不含</text>
        <text class="tour-cost-text">{{ costExcludes }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  activity: { type: Object, default: null },
  config: { type: Object, default: null },
})

const title = computed(() => props.config?.title || '行程安排')

// 行程优先取模块配置 config.days；未配置时回退活动 itinerary（day/stops 结构）
const days = computed(() => {
  const fromConfig = props.config?.days
  if (Array.isArray(fromConfig) && fromConfig.length) return fromConfig
  const itinerary = props.activity?.itinerary
  if (Array.isArray(itinerary)) {
    const stops = itinerary.filter((it) => Array.isArray(it.stops))
    if (stops.length) return stops
  }
  return []
})

const meetupPoint = computed(() => props.activity?.meetupPoint || props.config?.meetupPoint || '')
const costIncludes = computed(() => props.activity?.costIncludes || props.config?.costIncludes || '')
const costExcludes = computed(() => props.activity?.costExcludes || props.config?.costExcludes || '')

const minParticipants = computed(() => Number(props.activity?.minParticipants) || 0)
const usedCapacity = computed(() => Number(props.activity?.usedCapacity) || 0)
const groupOk = computed(() => minParticipants.value > 0 && usedCapacity.value >= minParticipants.value)
const groupTip = computed(() => {
  if (minParticipants.value <= 0) return ''
  if (groupOk.value) return `已满 ${minParticipants.value} 人成团，可以出发`
  return `满 ${minParticipants.value} 人成团，已报名 ${usedCapacity.value} 人`
})
</script>

<style lang="scss" scoped>
.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: var(--c-text);
  margin-bottom: 20rpx;
}

.tour-meetup {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 16rpx;
}

.tour-meetup-label {
  flex-shrink: 0;
  font-size: 24rpx;
  color: var(--c-primary);
  font-weight: bold;
  margin-right: 16rpx;
}

.tour-meetup-value {
  font-size: 24rpx;
  color: var(--c-text);
}

.tour-group {
  font-size: 24rpx;
  color: var(--c-primary);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12rpx;
  padding: 14rpx 20rpx;
  margin-bottom: 20rpx;
}

.tour-group.ok {
  color: #52c41a;
}

.tour-day {
  margin-bottom: 24rpx;
}

.tour-day-head {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.tour-day-badge {
  flex-shrink: 0;
  font-size: 22rpx;
  font-weight: bold;
  color: #fff;
  background: var(--c-primary);
  border-radius: 8rpx;
  padding: 4rpx 12rpx;
  margin-right: 12rpx;
}

.tour-day-title {
  font-size: 28rpx;
  font-weight: bold;
  color: var(--c-text);
}

.tour-stop {
  display: flex;
  align-items: flex-start;
}

.tour-stop-time {
  flex-shrink: 0;
  width: 140rpx;
  padding-top: 4rpx;

  text {
    font-size: 24rpx;
    font-weight: bold;
    color: var(--c-primary);
  }
}

.tour-stop-track {
  flex-shrink: 0;
  width: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tour-stop-dot {
  width: 14rpx;
  height: 14rpx;
  margin-top: 8rpx;
  border-radius: 50%;
  background: var(--c-primary);
}

.tour-stop-line {
  flex: 1;
  width: 2rpx;
  min-height: 24rpx;
  background: var(--c-primary);
  opacity: 0.35;
}

.tour-stop:last-child .tour-stop-line {
  display: none;
}

.tour-stop-body {
  flex: 1;
  padding-bottom: 24rpx;
}

.tour-stop-title {
  display: block;
  font-size: 26rpx;
  font-weight: bold;
  color: var(--c-text);
  line-height: 1.4;
}

.tour-stop-desc {
  display: block;
  margin-top: 4rpx;
  font-size: 23rpx;
  color: var(--c-text-dim);
  line-height: 1.5;
}

.tour-cost {
  border-top: 2rpx solid rgba(255, 255, 255, 0.5);
  padding-top: 20rpx;
}

.tour-cost-block {
  margin-bottom: 16rpx;
}

.tour-cost-label {
  display: block;
  font-size: 24rpx;
  font-weight: bold;
  color: var(--c-primary);
  margin-bottom: 6rpx;
}

.tour-cost-text {
  display: block;
  font-size: 24rpx;
  color: var(--c-text);
  line-height: 1.5;
  white-space: pre-wrap;
}
</style>
