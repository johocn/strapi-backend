<template>
  <view class="page-container">
    <PageHeader title="三方配置" />

    <scroll-view scroll-y class="list-body">
      <view v-if="list.length === 0" class="empty-tip">暂无配置数据</view>
      <view v-for="item in list" :key="item.documentId || item.id" class="list-card" @click="goEdit(item)">
        <view class="card-header">
          <view class="card-title-row">
            <text class="platform-icon">{{ getPlatformIcon(item.platform) }}</text>
            <text class="card-title">{{ item.name || getPlatformLabel(item) }}</text>
          </view>
          <view class="status-badge" :class="item.enabled !== false ? 'active' : 'inactive'">
            {{ item.enabled !== false ? '已启用' : '未启用' }}
          </view>
        </view>
        <view class="card-info">
          <text class="info-label">AppID：</text>
          <text class="info-value">{{ item.appId || '未配置' }}</text>
        </view>
        <view class="card-info" v-if="item.extraConfig && Object.keys(item.extraConfig).length > 0">
          <text class="info-label">配置项：</text>
          <text class="info-value">{{ Object.keys(item.extraConfig).length }} 个</text>
        </view>
      </view>

      <view style="height: 120rpx;"></view>
    </scroll-view>

    <view class="bottom-bar">
      <button class="btn-add" @click="goAdd">+ 新增配置</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getThirdPartyConfigs } from '../../api/config.js'
import PageHeader from '../../components/PageHeader.vue'

const list = ref([])

const PLATFORM_MAP = {
  wechat: { label: '微信', icon: '💬' },
  alipay: { label: '支付宝', icon: '💰' },
  douyin: { label: '抖音', icon: '🎵' },
}

const APP_TYPE_MAP = {
  official_account: '公众号',
  mini_program: '小程序',
  open_platform: '开放平台',
  default: '',
}

function getPlatformIcon(platform) {
  return PLATFORM_MAP[platform]?.icon || '🌐'
}

function getPlatformLabel(item) {
  const pLabel = PLATFORM_MAP[item.platform]?.label || item.platform || '未知'
  const aLabel = APP_TYPE_MAP[item.appType] || ''
  return aLabel ? `${pLabel} · ${aLabel}` : pLabel
}

async function loadData() {
  try {
    const res = await getThirdPartyConfigs()
    list.value = res?.list ?? res ?? []
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function goAdd() {
  uni.navigateTo({ url: '/pages/third/config-form' })
}

function goEdit(item) {
  uni.navigateTo({ url: `/pages/third/config-form?documentId=${item.documentId || item.id}` })
}

onShow(() => loadData())
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding-bottom: 120rpx; box-sizing: border-box; }
.list-body { padding: 20rpx; }

.list-card {
  background: #fff; border-radius: 16rpx; padding: 28rpx; margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.card-title-row { display: flex; align-items: center; gap: 12rpx; }
.platform-icon { font-size: 36rpx; }
.card-title { font-size: 30rpx; font-weight: bold; color: #333; }

.status-badge { font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-badge.active { background: #e8f5e9; color: #07c160; }
.status-badge.inactive { background: #f5f5f5; color: #999; }

.card-info { display: flex; align-items: center; margin-top: 8rpx; }
.info-label { font-size: 26rpx; color: #999; }
.info-value { font-size: 26rpx; color: #666; }

.empty-tip { text-align: center; padding: 80rpx; color: #999; font-size: 28rpx; }

.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  padding: 20rpx 30rpx; background: #fff;
  border-top: 1rpx solid #f0f0f0; z-index: 100;
}
.btn-add {
  width: 100%; height: 88rpx; line-height: 88rpx; text-align: center;
  background: #667eea; color: #fff; font-size: 30rpx; border-radius: 8rpx; border: none;
}
</style>
