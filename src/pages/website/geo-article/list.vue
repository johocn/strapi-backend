<template>
  <view class="page-container">
    <PageHeader title="GEO 文章">
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('article.create')">+ 新增 GEO 文章</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="搜索文章标题"
          @confirm="loadData"
          class="search-input"
        />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="typeOptions" @change="handleTypeChange">
          <view class="filter-item">
            <text>{{ typeOptions[typeIndex] }}</text>
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

    <view class="article-list">
      <view
        v-for="item in articleList"
        :key="item.documentId"
        class="article-card"
        @click="goEdit(item.documentId)"
      >
        <view class="article-info">
          <view class="article-title-row">
            <text class="type-badge" :class="item.type">{{ typeMap[item.type] || item.type }}</text>
            <text class="article-title">{{ item.title }}</text>
          </view>
          <view class="article-meta">
            <text class="meta-item" v-if="item.authorName || item.author">👤 {{ item.authorName || item.author?.name || '' }}</text>
            <text class="meta-item" v-if="item.category">📂 {{ item.category?.name || '' }}</text>
          </view>
          <view class="article-footer">
            <view class="article-status" :class="item.status">{{ statusMap[item.status] || item.status }}</view>
            <view class="article-date">{{ formatDate(item.updatedAt || item.createdAt) }}</view>
          </view>
        </view>
        <view class="article-actions">
          <view v-if="(item.status === 'draft' || item.status === 'review') && hasPermission('article.publish')" class="action-btn publish" @click.stop="handlePublish(item)">发布</view>
          <view v-if="item.status === 'published' && hasPermission('article.publish')" class="action-btn unpublish" @click.stop="handleArchive(item)">下架</view>
          <view v-if="hasPermission('article.update')" class="action-btn edit" @click.stop="goEdit(item.documentId)">编辑</view>
          <view v-if="hasPermission('article.update')" class="action-btn delete" @click.stop="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && articleList.length === 0" class="empty-state">
      <text class="empty-icon">📄</text>
      <text class="empty-text">暂无 GEO 文章</text>
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('article.create')">立即添加</button>
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
import { geoArticleApi } from '../../../api/website.js'
import { useUserStore } from '../../../store/user.js'
import { formatDate } from '../../../utils/format.js'
import PageHeader from '../../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const typeIndex = ref(0)
const typeOptions = ['全部类型', 'GEO 文章', 'GEO 问答', '本地报告', '本地对比', '本地清单']
const typeValueMap = { 1: 'geo-article', 2: 'geo-faq', 3: 'local-report', 4: 'local-comparison', 5: 'local-list' }
const typeMap = {
  'geo-article': '文章',
  'geo-faq': '问答',
  'local-report': '报告',
  'local-comparison': '对比',
  'local-list': '清单',
}

const statusIndex = ref(0)
const statusOptions = ['全部状态', '草稿', '审核中', '已发布', '已归档']
const statusValueMap = { 1: 'draft', 2: 'review', 3: 'published', 4: 'archived' }
const statusMap = { draft: '草稿', review: '审核中', published: '已发布', archived: '已归档' }

const articleList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = {
      page,
      pageSize: 10,
    }
    if (searchKeyword.value) params.q = searchKeyword.value
    if (typeIndex.value > 0) params.type = typeValueMap[typeIndex.value]
    if (statusIndex.value > 0) params.status = statusValueMap[statusIndex.value]
    const { list, pagination: pg } = await geoArticleApi.list(params)
    articleList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleTypeChange(e) {
  typeIndex.value = e.detail.value
  loadData(1)
}

function handleStatusChange(e) {
  statusIndex.value = e.detail.value
  loadData(1)
}

function goCreate() {
  uni.navigateTo({ url: '/pages/website/geo-article/edit' })
}

function goEdit(id) {
  uni.navigateTo({ url: `/pages/website/geo-article/edit?documentId=${id}` })
}

async function handleDelete(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除 GEO 文章「${item.title}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await geoArticleApi.delete(item.documentId)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

async function handlePublish(item) {
  uni.showModal({
    title: '确认发布',
    content: `确定要发布 GEO 文章「${item.title}」吗？发布前会执行合规检查。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await geoArticleApi.publish(item.documentId)
          uni.showToast({ title: '发布成功', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showModal({
            title: '发布被拦截',
            content: e.message || '存在未通过的门禁检查项，请到编辑页查看检查清单',
            showCancel: false,
            confirmText: '知道了',
          })
        }
      }
    }
  })
}

async function handleArchive(item) {
  uni.showModal({
    title: '确认下架',
    content: `确定要下架 GEO 文章「${item.title}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await geoArticleApi.archive(item.documentId)
          uni.showToast({ title: '已下架', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '下架失败', icon: 'none' })
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

const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

onShow(() => {
  loadData(1)
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
  margin-bottom: 20rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
}

.search-icon {
  font-size: 32rpx;
}

.filter-row {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.arrow {
  font-size: 20rpx;
  color: #999;
}

.article-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.article-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
}

.article-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.article-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.type-badge {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 20rpx;
  color: #fff;
}
.type-badge.geo-article { background: #1989fa; }
.type-badge.geo-faq { background: #722ed1; }
.type-badge.local-report { background: #13c2c2; }
.type-badge.local-comparison { background: #fa8c16; }
.type-badge.local-list { background: #eb2f96; }

.article-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.article-meta {
  flex: 1;
}

.meta-item {
  font-size: 24rpx;
  color: #999;
  margin-right: 16rpx;
}

.article-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12rpx;
}

.article-status {
  padding: 4rpx 16rpx;
  border-radius: 4rpx;
  font-size: 22rpx;
  color: #fff;
}

.article-status.draft { background: #999; }
.article-status.review { background: #faad14; }
.article-status.published { background: #07c160; }
.article-status.archived { background: #666; }

.article-date {
  font-size: 22rpx;
  color: #999;
}

.article-actions {
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
.action-btn.publish { background: #e8f5e9; color: #07c160; }
.action-btn.unpublish { background: #fff3e0; color: #faad14; }

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
