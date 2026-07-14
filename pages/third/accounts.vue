<template>
  <view class="page-container">
    <PageHeader title="第三方账号管理" />

    <view class="search-bar">
      <input v-model="keyword" class="search-input" placeholder="搜索用户名" @confirm="handleSearch" />
      <button class="search-btn" @click="handleSearch">搜索</button>
    </view>

    <view class="list">
      <view v-for="item in list" :key="item.documentId || item.id" class="list-item">
        <view class="item-header">
          <text class="item-name">{{ item.username || '-' }}</text>
          <text class="action-link" @click="handleUnbind(item)">解绑</text>
        </view>
        <view class="item-desc">提供商: {{ item.provider || '-' }} | OpenID: {{ item.openid || '-' }}</view>
        <view class="item-meta">
          <text class="meta-tag">绑定时间: {{ item.bindAt || item.createdAt || '-' }}</text>
        </view>
      </view>
    </view>

    <view class="pagination">
      <button class="page-btn" :disabled="pagination.page <= 1" @click="changePage(pagination.page - 1)">上一页</button>
      <text class="page-info">{{ pagination.page }} / {{ totalPages }}</text>
      <button class="page-btn" :disabled="pagination.page >= totalPages" @click="changePage(pagination.page + 1)">下一页</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getThirdPartyAccountList, deleteThirdPartyAccount } from '../../src/api/third-party.js'
import { DEFAULT_PAGE_SIZE } from '../../src/config/constant.js'

const list = ref([])
const keyword = ref('')
const pagination = ref({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.value.total / pagination.value.pageSize)))

async function loadData() {
  try {
    const params = {
      'pagination[page]': pagination.value.page,
      'pagination[pageSize]': pagination.value.pageSize
    }
    if (keyword.value) {
      params.keyword = keyword.value
    }
    const res = await getThirdPartyAccountList(params)
    list.value = res.list || []
    pagination.value = res.pagination || { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function handleSearch() {
  pagination.value.page = 1
  loadData()
}

function changePage(page) {
  pagination.value.page = page
  loadData()
}

function handleUnbind(item) {
  uni.showModal({
    title: '确认解绑',
    content: `确定要解绑用户「${item.username || ''}」的 ${item.provider} 账号吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteThirdPartyAccount(item.documentId || item.id)
          uni.showToast({ title: '解绑成功', icon: 'success' })
          loadData()
        } catch (e) {
          uni.showToast({ title: '解绑失败', icon: 'none' })
        }
      }
    }
  })
}

onMounted(() => loadData())
</script>

<style scoped>
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; background: #f5f5f5; }
.search-bar { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.search-input { flex: 1; height: 72rpx; padding: 0 24rpx; border: 2rpx solid #e0e0e0; border-radius: 12rpx; background: #fff; font-size: 28rpx; }
.search-btn { width: 140rpx; height: 72rpx; line-height: 72rpx; background: #667eea; color: #fff; border: none; border-radius: 12rpx; font-size: 28rpx; }
.list { background: #fff; border-radius: 16rpx; overflow: hidden; }
.list-item { padding: 24rpx; border-bottom: 2rpx solid #f5f5f5; }
.item-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.item-name { font-size: 30rpx; font-weight: 500; color: #333; }
.item-desc { font-size: 26rpx; color: #999; margin-bottom: 12rpx; }
.item-meta { display: flex; gap: 12rpx; flex-wrap: wrap; }
.meta-tag { font-size: 22rpx; color: #999; padding: 4rpx 12rpx; background: #f5f5f5; border-radius: 6rpx; }
.action-link { font-size: 26rpx; color: #ff4d4f; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 24rpx; margin-top: 24rpx; padding: 20rpx; }
.page-btn { padding: 12rpx 28rpx; background: #fff; border: 2rpx solid #e0e0e0; border-radius: 12rpx; font-size: 28rpx; }
.page-btn[disabled] { opacity: 0.5; }
.page-info { font-size: 28rpx; color: #666; }
</style>
