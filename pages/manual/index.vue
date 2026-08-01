<template>
  <view class="manual-index">
    <PageHeader title="使用手册" />

    <view class="search-entry" @click="goSearch">
      <text class="search-icon">🔍</text>
      <text class="search-placeholder">搜索文档...</text>
    </view>

    <view class="manual-card" v-for="m in manuals" :key="m.key" @click="goViewer(m.indexDoc)">
      <text class="manual-title">{{ m.title }}</text>
      <text class="manual-desc">{{ m.desc }}</text>
      <text class="manual-arrow">→</text>
    </view>

  </view>
</template>

<script setup>
import PageHeader from '../../src/components/PageHeader.vue'
const manuals = [
  { key: 'admin', title: '后台管理手册', desc: '面向 admin 超级管理员，覆盖系统管理 + 业务监督', indexDoc: 'admin/index.md' },
  { key: 'shao', title: '课程学习答题用户使用手册', desc: '面向 C 端学员，覆盖课程学习、答题、积分兑换全流程', indexDoc: 'shao-catalog/index.md' },
  { key: 'user', title: '课程学习答题管理用户手册', desc: '面向运营/内容管理员，覆盖课程、课时、题库、积分规则配置', indexDoc: 'user-guide/index.md' },
  { key: 'website', title: '官网使用手册', desc: '面向内容运营，覆盖 GEO/SEO 内容发布全流程，含字段规范、行业案例', indexDoc: 'website/index.html' },
  { key: 'sso-login', title: 'SSO 登录配置手册', desc: '面向运营/管理员，从零配置 SSO 单点登录，以 h.joho.cn + v.joho.cn 为例', indexDoc: 'sso-login/index.md' },
]

function goViewer(doc) {
  uni.navigateTo({ url: `/pages/manual/viewer?doc=${encodeURIComponent(doc)}` })
}

function goSearch() {
  uni.navigateTo({ url: '/pages/manual/search' })
}
</script>

<style scoped>
.manual-index { padding: 20rpx; padding-bottom: 20rpx; }

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
</style>
