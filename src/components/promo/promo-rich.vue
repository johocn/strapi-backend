<template>
  <view class="promo-card promo-rich">
    <rich-text class="rich-body" :nodes="nodes" />
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  activity: { type: Object, default: null },
  config: { type: Object, default: null },
})

const nodes = computed(() => props.config?.html || props.activity?.description || '')
</script>

<style lang="scss" scoped>
.rich-body {
  font-size: 28rpx;
  color: var(--c-text);
  line-height: 1.7;
}
</style>
