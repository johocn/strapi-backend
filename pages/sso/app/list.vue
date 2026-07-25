<template>
  <view class="page-container">
    <PageHeader title="应用管理">
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('sso.app-create')">+ 新增</button>
    </PageHeader>

    <view class="help-banner">
      <text class="help-icon">ℹ️</text>
      <text class="help-text">应用管理注册每个接入 SSO 的业务方，分配 app_code/app_secret，配置应用回调地址。每个应用有唯一的 app_code，回调地址用于 OAuth 授权码换取 token 时校验。</text>
    </view>

    <view class="search-section">
      <view class="search-box">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="搜索 app_code / app_name"
          class="search-input"
        />
        <text class="search-icon">🔍</text>
      </view>
    </view>

    <view class="data-list">
      <view
        v-for="item in filteredList"
        :key="item.id"
        class="data-card"
        @click="goEdit(item.id)"
      >
        <view class="data-info">
          <view class="data-title">
            <text class="app-code">{{ item.app_code || '-' }}</text>
            <text class="app-name">{{ item.app_name || '-' }}</text>
          </view>
          <view class="data-meta">
            <text class="meta-item">回调: {{ formatUris(item.redirect_uris) }}</text>
          </view>
          <view class="data-meta">
            <text class="meta-item">授权类型: {{ formatGrantTypes(item.allowed_grant_types) }}</text>
          </view>
          <view class="data-meta" v-if="item.description">
            <text class="meta-item">{{ item.description }}</text>
          </view>
          <view class="data-footer">
            <view class="data-status" :class="item.is_active ? 'active' : 'inactive'">{{ item.is_active ? '已启用' : '已禁用' }}</view>
          </view>
        </view>
        <view class="data-actions">
          <view v-if="hasPermission('sso.app-update')" class="action-btn edit" @click.stop="goEdit(item.id)">编辑</view>
          <view v-if="hasPermission('sso.app-delete')" class="action-btn delete" @click.stop="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && filteredList.length === 0" class="empty-state">
      <text class="empty-icon">📱</text>
      <text class="empty-text">暂无应用</text>
      <text class="empty-hint">点击右上角「+ 新增」创建第一个应用</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getSsoAppList, deleteSsoApp } from '../../../src/api/sso.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const dataList = ref([])
const loading = ref(false)

const filteredList = computed(() => {
  if (!searchKeyword.value) return dataList.value
  const kw = searchKeyword.value.toLowerCase()
  return dataList.value.filter(item =>
    (item.app_code || '').toLowerCase().includes(kw) ||
    (item.app_name || '').toLowerCase().includes(kw)
  )
})

function formatUris(uris) {
  if (!Array.isArray(uris) || uris.length === 0) return '-'
  if (uris.length === 1) return uris[0]
  return `${uris[0]} 等 ${uris.length} 个`
}

function formatGrantTypes(types) {
  if (!Array.isArray(types) || types.length === 0) return '-'
  return types.join(', ')
}

async function loadData() {
  loading.value = true
  try {
    const { list } = await getSsoAppList()
    dataList.value = list || []
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goCreate() {
  uni.navigateTo({ url: '/pages/sso/app/edit' })
}

function goEdit(id) {
  uni.navigateTo({ url: `/pages/sso/app/edit?id=${id}` })
}

function handleDelete(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除应用「${item.app_name || item.app_code}」吗？此操作不可撤销，依赖此 app_code 的接入方将无法登录。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteSsoApp(item.id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData()
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

onShow(() => {
  loadData()
})
</script>

<style scoped>
page {
  background: #f5f5f5;
}
.page-container {
  min-height: 100vh;
  padding: 20rpx;
  box-sizing: border-box;
}

.btn-primary {
  background: #ff0000;
  color: #ffffff;
  padding: 16rpx 32rpx;
  font-size: 30rpx;
  border-radius: 8rpx;
  border: none;
  line-height: 1.2;
}

.help-banner {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  background: #e6f4ff;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  border-left: 6rpx solid #1677ff;
}

.help-icon {
  font-size: 28rpx;
  flex-shrink: 0;
}

.help-text {
  font-size: 26rpx;
  color: #333;
  line-height: 1.5;
}

.search-section {
  background: #fff;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.search-box {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 0 20rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
}

.search-icon {
  font-size: 32rpx;
}

.data-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.data-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
}

.data-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.data-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.app-code {
  font-size: 30rpx;
  font-weight: bold;
  color: #1677ff;
  font-family: monospace;
}

.app-name {
  font-size: 28rpx;
  color: #666;
}

.data-meta {
  margin-bottom: 8rpx;
}

.meta-item {
  font-size: 24rpx;
  color: #999;
  margin-right: 16rpx;
}

.data-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12rpx;
}

.data-status {
  padding: 4rpx 16rpx;
  border-radius: 4rpx;
  font-size: 22rpx;
  color: #fff;
}

.data-status.active { background: #07c160; }
.data-status.inactive { background: #999; }

.data-actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.action-btn {
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  text-align: center;
}

.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }

.loading, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #bbb;
}
</style>
