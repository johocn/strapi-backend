<template>
  <view class="page-container">
    <PageHeader title="渠道管理">
      <view class="header-right">
        <button class="btn-secondary" @click="goNetwork">网络</button>
        <button class="btn-primary" @click="goAdd">+ 新增</button>
      </view>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="搜索渠道名称"
          @confirm="handleSearch"
          class="search-input"
        />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="tierOptions" @change="handleTierChange">
          <view class="filter-item">
            <text>{{ tierOptions[tierIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <picker mode="selector" :range="statusOptions" @change="handleStatusChange">
          <view class="filter-item">
            <text>{{ statusOptions[statusIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="channel-list">
      <view
        v-for="item in list"
        :key="item.id"
        class="channel-card"
      >
        <view class="channel-info" @click="goDetail(item.id)">
          <view class="channel-name-row">
            <text class="channel-name">{{ item.name }}</text>
            <view class="tier-badge">{{ item.channelTier }}</view>
          </view>
          <view class="channel-code">代码: {{ item.code }}</view>
          <view class="channel-desc" v-if="item.description">{{ item.description }}</view>
          <view class="channel-meta">
            <text class="status-badge" :class="item.status ? 'active' : 'inactive'">
              {{ item.status ? '启用' : '禁用' }}
            </text>
            <text class="meta-item" v-if="item.depth !== undefined">层级: {{ item.depth }}</text>
            <text class="meta-item" v-if="item.parentChannelId">上级: {{ item.parentChannelId.name }}</text>
          </view>
        </view>
        <view class="channel-actions" v-if="hasPermission('menu.channel')">
          <view class="action-btn members" @click="goMembers(item.id)">成员</view>
          <view class="action-btn edit" @click="goEdit(item.id)">编辑</view>
          <view class="action-btn delete" @click="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && list.length === 0" class="empty-state">
      <text class="empty-icon">📡</text>
      <text class="empty-text">暂无渠道</text>
      <button class="btn-primary" @click="goAdd">立即添加</button>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <view class="fab-btn" @click="goAdd" v-if="hasPermission('menu.channel')">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getAdminChannelList, deleteChannel } from '../../src/api/channel.js'
import { useUserStore } from '../../src/store/user.js'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const tierIndex = ref(0)
const statusIndex = ref(0)
const tierOptions = ['全部层级', 'root', 'core', 'senior', 'global', 'authorized', 'official', 'partner', 'agent', 'national', 'regional', 'city', 'county', 'local', 'store']
const statusOptions = ['全部状态', '启用', '禁用']

const list = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = {
      page,
      pageSize: pagination.value.pageSize,
    }
    if (searchKeyword.value) {
      params.name = { $contains: searchKeyword.value }
    }
    if (tierIndex.value > 0) {
      params.channelTier = tierOptions[tierIndex.value]
    }
    if (statusIndex.value === 1) {
      params.status = true
    } else if (statusIndex.value === 2) {
      params.status = false
    }
    const res = await getAdminChannelList(params)
    list.value = res.list || []
    pagination.value = res.pagination || { page: 1, pageSize: 20, total: 0 }
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  loadData(1)
}

function handleTierChange(e) {
  tierIndex.value = e.detail.value
  loadData(1)
}

function handleStatusChange(e) {
  statusIndex.value = e.detail.value
  loadData(1)
}

function goAdd() {
  uni.navigateTo({ url: '/pages/channel/detail' })
}

function goEdit(id) {
  uni.navigateTo({ url: `/pages/channel/detail?id=${id}` })
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/channel/detail?id=${id}` })
}

function goMembers(id) {
  uni.navigateTo({ url: `/pages/channel/members?channelId=${id}` })
}

function goNetwork() {
  uni.navigateTo({ url: '/pages/channel/network' })
}

async function handleDelete(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除渠道「${item.name}」吗？将级联删除所有子渠道和成员，此操作不可恢复。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteChannel(item.id)
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

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

onShow(() => loadData(1))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.btn-primary {
  background: #ff0000; color: #fff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}
.btn-secondary {
  background: #f5f5f5; color: #333; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}
.header-right { display: flex; gap: 16rpx; }

.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.search-box {
  display: flex; align-items: center; background: #f5f5f5;
  border-radius: 8rpx; padding: 0 20rpx; margin-bottom: 20rpx;
}
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }

.filter-row { display: flex; gap: 20rpx; align-items: center; }
.filter-item {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx;
}
.arrow { font-size: 20rpx; color: #999; }

.channel-list { display: flex; flex-direction: column; gap: 20rpx; }

.channel-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx;
  display: flex; justify-content: space-between; align-items: center;
}
.channel-info { flex: 1; }
.channel-name-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.channel-name { font-size: 32rpx; font-weight: bold; color: #333; }
.tier-badge {
  font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 4rpx;
  background: #e3f2fd; color: #1976d2;
}
.channel-code { font-size: 26rpx; color: #666; margin-bottom: 8rpx; }
.channel-desc { font-size: 26rpx; color: #999; margin-bottom: 8rpx; }

.channel-meta { display: flex; gap: 16rpx; align-items: center; }
.status-badge {
  font-size: 24rpx; padding: 4rpx 16rpx; border-radius: 16rpx;
}
.status-badge.active { background: #e8f5e9; color: #07c160; }
.status-badge.inactive { background: #ffebee; color: #ff4d4f; }
.meta-item { font-size: 24rpx; color: #999; }

.channel-actions { display: flex; gap: 12rpx; flex-shrink: 0; }
.action-btn { padding: 12rpx 20rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.members { background: #e3f2fd; color: #1976d2; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0;
}
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }

.pagination {
  display: flex; justify-content: center; align-items: center;
  gap: 40rpx; padding: 40rpx 0;
}
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }

.fab-btn {
  position: fixed; right: 40rpx; bottom: 120rpx; width: 120rpx; height: 120rpx;
  background: #07c160; color: white; border-radius: 60rpx;
  display: flex; align-items: center; justify-content: center;
  z-index: 999; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.2);
}
.fab-icon { font-size: 40rpx; line-height: 1; }
</style>
