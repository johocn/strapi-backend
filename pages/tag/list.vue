<template>
  <view class="page-container">
    <PageHeader title="标签列表" />

    <view class="search-bar">
      <input
        type="text"
        v-model="searchKeyword"
        placeholder="搜索标签名称"
        @confirm="loadData(1)"
        class="search-input"
      />
      <button class="search-btn" @click="loadData(1)">搜索</button>
    </view>

    <view class="list">
      <view
        v-for="item in tagList"
        :key="item.documentId"
        class="list-item"
        @click="goEdit(item.documentId)"
        @longpress="handleDelete(item)"
      >
        <view class="item-header">
          <text class="item-name">{{ item.name }}</text>
          <text class="meta-tag">{{ item.group?.name || '未分组' }}</text>
        </view>
        <view class="item-desc">使用次数：{{ item.usageCount ?? 0 }}</view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && tagList.length === 0" class="empty-state">
      <text class="empty-text">暂无标签</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <button class="page-btn" :disabled="currentPage <= 1" @click="loadData(currentPage - 1)">上一页</button>
      <text class="page-info">{{ currentPage }} / {{ totalPages }}</text>
      <button class="page-btn" :disabled="currentPage >= totalPages" @click="loadData(currentPage + 1)">下一页</button>
    </view>

    <view class="add-btn" @click="goAdd">
      <text style="color:#fff;font-size:48rpx;">+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getTagList, deleteTag } from '../../src/api/tag.js'
import { DEFAULT_PAGE_SIZE } from '../../src/config/constant.js'
import PageHeader from '../../src/components/PageHeader.vue'

const searchKeyword = ref('')
const tagList = ref([])
const pagination = ref({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = {
      'pagination[page]': page,
      'pagination[pageSize]': DEFAULT_PAGE_SIZE,
    }
    if (searchKeyword.value) {
      params['filters[name][$contains]'] = searchKeyword.value
    }
    const { list, pagination: pg } = await getTagList(params)
    tagList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goAdd() {
  uni.navigateTo({ url: '/pages/tag/form' })
}

function goEdit(id) {
  uni.navigateTo({ url: `/pages/tag/form?documentId=${id}` })
}

function handleDelete(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除标签「${item.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteTag(item.documentId)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

onMounted(() => loadData(1))
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
.meta-tag { font-size: 22rpx; color: #999; padding: 4rpx 12rpx; background: #f5f5f5; border-radius: 6rpx; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 24rpx; margin-top: 24rpx; padding: 20rpx; }
.page-btn { padding: 12rpx 28rpx; background: #fff; border: 2rpx solid #e0e0e0; border-radius: 12rpx; font-size: 28rpx; }
.page-btn[disabled] { opacity: 0.5; }
.page-info { font-size: 28rpx; color: #666; }
.add-btn { position: fixed; right: 40rpx; bottom: 40rpx; width: 100rpx; height: 100rpx; border-radius: 50%; background: #667eea; color: #fff; font-size: 48rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 16rpx rgba(102,126,234,0.4); }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
