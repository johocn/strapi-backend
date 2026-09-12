<template>
  <view>
    <!-- 基本信息 -->
    <view class="form-section">
      <view class="section-title">基本信息</view>

      <view class="form-item">
        <text class="form-label">标题</text>
        <input type="text" v-model="model.title" placeholder="请输入标题" class="form-input" />
      </view>

      <view class="form-item">
        <text class="form-label">slug</text>
        <input type="text" v-model="model.slug" placeholder="URL 别名（留空自动生成）" class="form-input" />
      </view>

      <view class="form-item">
        <text class="form-label">正文</text>
        <textarea v-model="model.content" placeholder="请输入正文内容" class="form-textarea content-textarea" />
      </view>

      <!-- 关联内容插槽 -->
      <slot name="relations" />
    </view>

    <!-- SEO 区（独立容器，放置两个区块之间） -->
    <view class="form-section seo-section">
      <slot name="meta" />
    </view>

    <!-- 收录设置 -->
    <view class="form-section">
      <view class="section-title">收录设置</view>

      <view class="form-item">
        <text class="form-label">canonical URL</text>
        <input type="text" v-model="model.canonicalUrl" placeholder="规范链接" class="form-input" />
      </view>

      <view class="form-item form-row">
        <text class="form-label">允许收录</text>
        <switch :checked="model.allowIndex" @change="model.allowIndex = !model.allowIndex" />
      </view>

      <view class="form-item form-row">
        <text class="form-label">nofollow</text>
        <switch :checked="model.noFollow" @change="model.noFollow = !model.noFollow" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

// 只读别名：模板中修改 model.xxx 实际改的是父级传入对象对应属性，从而同步
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({}),
  },
})

defineEmits(['update:modelValue'])

const model = computed(() => props.modelValue)
</script>

<style scoped>
.form-section {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
  padding-left: 8rpx;
  border-left: 6rpx solid #ff0000;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.content-textarea {
  min-height: 400rpx;
}

.form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.seo-section {
  min-height: 40rpx;
}
</style>