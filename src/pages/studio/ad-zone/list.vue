<template>
  <view class="page-container">
    <PageHeader title="广告区域">
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('menu.studio-ad')">+ 新增</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="搜索名称/编码"
          @confirm="loadData"
          class="search-input"
        />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="positionLabelOptions" @change="handlePositionChange">
          <view class="filter-item">
            <text>{{ positionLabelOptions[positionIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <picker mode="selector" :range="displayModeLabelOptions" @change="handleDisplayModeChange">
          <view class="filter-item">
            <text>{{ displayModeLabelOptions[displayModeIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
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
          <view class="data-title">{{ item.name }} · {{ item.code }}</view>
          <view class="data-meta">
            <text class="meta-item">📍 {{ getPositionText(item.position) }}</text>
            <text class="meta-item">🎨 {{ getDisplayModeText(item.displayMode) }}</text>
          </view>
          <view class="data-footer">
            <view class="data-status" :class="item.isActive ? 'active' : 'inactive'">
              {{ item.isActive ? '启用' : '停用' }}
            </view>
            <view class="data-date">{{ item.adSlotCode || '无关联广告位' }}</view>
          </view>
        </view>
        <view class="data-actions">
          <view v-if="hasPermission('studio.ad-zone.update')" class="action-btn edit" @click.stop="goEdit(item.documentId)">编辑</view>
          <view v-if="hasPermission('studio.ad-zone.update')" class="action-btn delete" @click.stop="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && dataList.length === 0" class="empty-state">
      <text class="empty-icon">🎯</text>
      <text class="empty-text">暂无广告区域</text>
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
import { adZoneApi } from '../../../api/studio.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const positionIndex = ref(0)
const displayModeIndex = ref(0)

const positionEnumList = ['', 'home-banner', 'home-sidebar', 'list-top', 'article-top', 'article-bottom', 'article-inline', 'footer', 'popup', 'float', 'custom']
const positionLabelOptions = ['全部位置', '首页横幅', '首页侧边', '列表顶部', '文章顶部', '文章底部', '文章内嵌', '页脚', '弹窗', '悬浮', '自定义']

const displayModeEnumList = ['', 'single', 'rotation', 'slideshow', 'stack']
const displayModeLabelOptions = ['全部展示模式', '单条', '轮替', '幻灯片', '堆叠']

function getPositionText(pos) {
  const idx = positionEnumList.indexOf(pos)
  return idx > 0 ? positionLabelOptions[idx] : pos
}

function getDisplayModeText(mode) {
  const idx = displayModeEnumList.indexOf(mode)
  return idx > 0 ? displayModeLabelOptions[idx] : mode
}

const dataList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = {
      'pagination[page]': page,
      'pagination[pageSize]': 10
    }
    if (searchKeyword.value) {
      params['filters[$or][0][name][$contains]'] = searchKeyword.value
      params['filters[$or][1][code][$contains]'] = searchKeyword.value
    }
    if (positionIndex.value > 0) {
      params['filters[position]'] = positionEnumList[positionIndex.value]
    }
    if (displayModeIndex.value > 0) {
      params['filters[displayMode]'] = displayModeEnumList[displayModeIndex.value]
    }
    const { list, pagination: pg } = await adZoneApi.list(params)
    dataList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handlePositionChange(e) {
  positionIndex.value = e.detail.value
  loadData(1)
}

function handleDisplayModeChange(e) {
  displayModeIndex.value = e.detail.value
  loadData(1)
}

function goCreate() {
  uni.navigateTo({ url: '/pages/studio/ad-zone/edit' })
}

function goEdit(id) {
  uni.navigateTo({ url: `/pages/studio/ad-zone/edit?documentId=${id}` })
}

async function handleDelete(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除广告区域「${item.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await adZoneApi.delete(item.documentId)
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

.data-date {
  font-size: 22rpx;
  color: #999;
}

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
