<template>
  <view class="page-container">
    <PageHeader title="OAuth 配置">
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('sso.oauth-config.create')">+ 新增</button>
    </PageHeader>

    <view class="help-banner">
      <text class="help-icon">ℹ️</text>
      <text class="help-text">OAuth 配置管理各第三方平台（微信/支付宝/抖音等）的 AppID/AppSecret，全局共享，按应用类型区分。配置后所有接入方应用可共用。</text>
    </view>

    <view class="search-section">
      <view class="search-box">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="搜索 provider / app_id"
          @confirm="loadData"
          class="search-input"
        />
        <text class="search-icon">🔍</text>
      </view>
    </view>

    <view class="data-list">
      <view
        v-for="item in dataList"
        :key="item.documentId"
        class="data-card"
        @click="goEdit(item.documentId)"
      >
        <view class="data-info">
          <view class="data-title">
            <view class="provider-tag" :style="{ background: providerMeta(item.provider).bgColor, color: providerMeta(item.provider).color }">
              <text>{{ providerMeta(item.provider).icon }}</text>
              <text>{{ providerMeta(item.provider).label }}</text>
            </view>
            <text class="config-name">{{ item.name || '-' }}</text>
          </view>
          <view class="data-meta">
            <text class="meta-item">应用类型: {{ appTypeMeta(item.app_type).label }}</text>
            <text class="meta-item">AppID: {{ item.app_id || '-' }}</text>
          </view>
          <view class="data-meta" v-if="extractScopes(item).length > 0">
            <text class="meta-item">Scope: {{ extractScopes(item).join(', ') }}</text>
          </view>
          <view class="data-meta" v-if="item.description">
            <text class="meta-item">{{ item.description }}</text>
          </view>
          <view class="data-footer">
            <view class="data-status" :class="item.is_enabled ? 'active' : 'inactive'">{{ item.is_enabled ? '已启用' : '已禁用' }}</view>
            <view class="data-date">{{ fmtDateTime(item.createdAt) }}</view>
          </view>
        </view>
        <view class="data-actions">
          <view v-if="hasPermission('sso.oauth-config.update')" class="action-btn edit" @click.stop="goEdit(item.documentId)">编辑</view>
          <view v-if="hasPermission('sso.oauth-config.delete')" class="action-btn delete" @click.stop="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && dataList.length === 0" class="empty-state">
      <text class="empty-icon">⚙️</text>
      <text class="empty-text">暂无 OAuth 配置</text>
      <view class="empty-guide">
        <text class="guide-title">快速配置入口：</text>
        <view class="guide-list">
          <text class="guide-item" v-for="p in SSO_PROVIDERS" :key="p.value" @click="goCreate">
            {{ p.icon }} {{ p.label }}：{{ p.portalUrl }}
          </text>
        </view>
      </view>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ssoOauthConfigApi } from '../../../api/sso.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'
import { SSO_PROVIDERS, getProvider, getAppType } from '../../../constants/sso-providers.js'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const dataList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

function providerMeta(value) {
  const p = getProvider(value)
  return p || { icon: '⚙️', label: value || '-', color: '#999', bgColor: '#f5f5f5' }
}

function appTypeMeta(value) {
  const t = getAppType(value)
  return t || { label: value || '-', desc: '' }
}

function extractScopes(item) {
  if (!item.extra_config) return []
  let ec = item.extra_config
  if (typeof ec === 'string') {
    try { ec = JSON.parse(ec) } catch { return [] }
  }
  return ec.oauthScopes || []
}

function fmtDateTime(dt) {
  if (!dt) return '-'
  return String(dt).replace('T', ' ').substring(0, 19)
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = {
      'pagination[page]': page,
      'pagination[pageSize]': 10
    }
    if (searchKeyword.value) {
      params['filters[$or][0][provider][$contains]'] = searchKeyword.value
      params['filters[$or][1][app_id][$contains]'] = searchKeyword.value
    }
    const { list, pagination: pg } = await ssoOauthConfigApi.list(params)
    dataList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goCreate() {
  uni.navigateTo({ url: '/pages/sso/oauth-config/edit' })
}

function goEdit(id) {
  uni.navigateTo({ url: `/pages/sso/oauth-config/edit?documentId=${id}` })
}

function handleDelete(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除「${item.provider}」的 OAuth 配置吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await ssoOauthConfigApi.delete(item.documentId)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

function prevPage() {
  if (currentPage.value > 1) loadData(currentPage.value - 1)
}

function nextPage() {
  if (currentPage.value < totalPages.value) loadData(currentPage.value + 1)
}

onShow(() => {
  loadData(1)
})
</script>

<style scoped>
page {
  background: #f5f5f5;
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

.provider-tag {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
  font-size: 24rpx;
  margin-right: 12rpx;
}

.config-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.data-date {
  font-size: 22rpx;
  color: #999;
}

.empty-guide {
  margin-top: 20rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 12rpx;
  text-align: left;
}

.guide-title {
  font-size: 26rpx;
  color: #666;
  font-weight: bold;
  margin-bottom: 12rpx;
  display: block;
}

.guide-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.guide-item {
  font-size: 24rpx;
  color: #1677ff;
  padding: 8rpx 0;
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
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
}

.data-meta {
  flex: 1;
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
  margin-bottom: 20rpx;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40rpx;
  padding: 40rpx 0;
}

.pagination-btn {
  padding: 16rpx 32rpx;
  background: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.pagination-btn.disabled {
  color: #999;
  background: #f5f5f5;
}

.pagination-info {
  font-size: 28rpx;
  color: #666;
}
</style>
