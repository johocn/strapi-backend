<template>
  <view class="manual-index">
    <view class="page-header">
      <view class="back-btn" @click="goBack">←</view>
      <text class="page-title">使用手册</text>
    </view>

    <view class="search-entry" @click="goSearch">
      <text class="search-icon">🔍</text>
      <text class="search-placeholder">搜索文档...</text>
    </view>

    <view class="manual-card" v-for="m in manuals" :key="m.key" @click="goViewer(m.indexDoc)">
      <text class="manual-title">{{ m.title }}</text>
      <text class="manual-desc">{{ m.desc }}</text>
      <text class="manual-arrow">→</text>
    </view>

    <view class="footer-bar" @click="goDashboard">
      <text class="footer-text">返回面板</text>
    </view>
  </view>
</template>

<script setup>
const manuals = [
  { key: 'admin', title: '后台管理手册', desc: '面向 admin 超级管理员，覆盖系统管理 + 业务监督', indexDoc: 'admin/index.md' },
  { key: 'shao', title: 'C 端目录', desc: 'shao 用户端页面清单', indexDoc: 'shao-catalog/index.md' },
  { key: 'user', title: '用户使用手册', desc: '面向终端用户，按使用流程顺序书写', indexDoc: 'user-guide/index.md' },
]

function goViewer(doc) {
  uni.navigateTo({ url: `/pages/manual/viewer?doc=${encodeURIComponent(doc)}` })
}

function goSearch() {
  uni.navigateTo({ url: '/pages/manual/search' })
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.reLaunch({ url: '/pages/dashboard/index' })
  }
}

function goDashboard() {
  uni.reLaunch({ url: '/pages/dashboard/index' })
}
</script>

<style scoped>
.manual-index { padding: 20rpx; padding-bottom: 120rpx; }
.page-header { display: flex; align-items: center; padding: 24rpx; background: #fff; border-bottom: 1rpx solid #e4e7ed; margin: -20rpx -20rpx 20rpx; gap: 16rpx; }
.back-btn { font-size: 40rpx; color: #303133; padding: 0 8rpx; }
.page-title { font-size: 36rpx; font-weight: 600; color: #303133; }

.search-entry {
  display: flex; align-items: center;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid #e4e7ed;
}
.search-icon { font-size: 32rpx; margin-right: 16rpx; }
.search-placeholder { color: #a8abb2; font-size: 28rpx; }

.manual-card {
  position: relative;
  padding: 32rpx 24rpx;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid #e4e7ed;
}
.manual-title { display: block; font-size: 32rpx; font-weight: 600; color: #303133; margin-bottom: 8rpx; }
.manual-desc { display: block; font-size: 26rpx; color: #909399; }
.manual-arrow { position: absolute; right: 24rpx; top: 50%; transform: translateY(-50%); color: #c0c4cc; font-size: 32rpx; }

.footer-bar {
  position: fixed; left: 0; right: 0; bottom: 0;
  height: 96rpx; line-height: 96rpx;
  background: #07c160; color: #fff;
  text-align: center; font-size: 30rpx; font-weight: 600;
}
.footer-text { color: #fff; }
</style>
