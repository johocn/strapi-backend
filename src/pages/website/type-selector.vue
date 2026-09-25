<template>
  <view class="page-container">
    <PageHeader title="发布文章" />

    <scroll-view scroll-y class="form-scroll">
      <view class="group-title">本地增长</view>

      <view
        v-for="item in geoTypes"
        :key="item.type"
        class="type-card geo"
        @click="goGeo(item.type)"
      >
        <view class="type-name">{{ item.name }}</view>
        <view class="type-desc">{{ item.desc }}</view>
      </view>

      <view class="group-title">品牌内容</view>

      <view class="type-card brand" @click="goBrand">
        <view class="type-name">品牌资讯文章</view>
        <view class="type-desc">原创/品牌栏目，当前暂未投入使用</view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import PageHeader from '../../components/PageHeader.vue'

const geoTypes = [
  { type: 'geo-article', name: 'GEO 文章', desc: '本地地域词深度长文（需真值背书、知识实体、E-E-A-T、合规验收）' },
  { type: 'geo-faq', name: 'GEO 问答', desc: 'FAQ 问答页（FAQPage 结构化）' },
  { type: 'local-report', name: '本地报告', desc: '本地业务数据报告' },
  { type: 'local-comparison', name: '本地对比', desc: '本地多对象评分对比' },
  { type: 'local-list', name: '本地清单', desc: '本地清单条目' },
]

function goGeo(type) {
  uni.navigateTo({ url: '/pages/website/geo-article/edit?type=' + type })
}

function goBrand() {
  uni.navigateTo({ url: '/pages/website/article/edit' })
}
</script>

<style scoped>
page {
  background: #f5f5f5;
}
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.form-scroll {
  flex: 1;
  padding: 24rpx 20rpx;
  box-sizing: border-box;
}

.group-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin: 16rpx 8rpx 20rpx;
  padding-left: 8rpx;
  border-left: 6rpx solid #ff0000;
}

.type-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  border-left: 6rpx solid #07c160;
}

.type-card.brand {
  border-left-color: #909399;
}

.type-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.type-card.brand .type-name {
  color: #909399;
}

.type-desc {
  font-size: 24rpx;
  color: #999;
  line-height: 1.5;
}
</style>