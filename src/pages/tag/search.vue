<template>
  <view class="page-container">
    <PageHeader title="全局标签检索" />

    <view class="search-bar">
      <input
        type="text"
        v-model="searchKeyword"
        placeholder="输入标签名称搜索"
        @confirm="handleSearch"
        class="search-input"
      />
      <button class="search-btn" @click="handleSearch">搜索</button>
    </view>

    <view v-if="tagSuggestions.length" class="tag-suggestions">
      <text class="suggestion-label">热门标签</text>
      <view class="tag-cloud">
        <text
          class="cloud-tag"
          v-for="tag in tagSuggestions"
          :key="tag.documentId"
          @click="selectTag(tag)"
        >{{ tag.name }}</text>
      </view>
    </view>

    <view v-if="searching" class="loading">
      <text>搜索中...</text>
    </view>

    <view v-if="searchResults.length" class="result-section">
      <view
        v-for="group in searchResults"
        :key="group.type"
        class="result-group"
      >
        <view class="group-header">
          <text class="group-title">{{ group.label }}</text>
          <text class="group-count">{{ group.items.length }} 条结果</text>
        </view>
        <view class="group-list">
          <view
            v-for="item in group.items"
            :key="item.documentId"
            class="result-item"
          >
            <text class="result-name">{{ item.name || item.title }}</text>
            <text class="result-desc" v-if="item.description">{{ item.description }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="!searching && searched && searchResults.length === 0" class="empty-state">
      <text class="empty-text">未找到相关内容</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { searchByTag, getPublicTagList } from '../../api/tag.js'

const searchKeyword = ref('')
const tagSuggestions = ref([])
const searchResults = ref([])
const searching = ref(false)
const searched = ref(false)

const targetTypeMap = {
  course: '课程',
  lesson: '课时',
  knowledge: '知识点',
}

async function loadSuggestions() {
  try {
    const { list } = await getPublicTagList({ 'pagination[pageSize]': 20 })
    tagSuggestions.value = list || []
  } catch (e) {
    // ignore
  }
}

async function handleSearch() {
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    uni.showToast({ title: '请输入标签名称', icon: 'none' })
    return
  }
  searching.value = true
  searched.value = false
  searchResults.value = []
  try {
    const data = await searchByTag(keyword)
    searched.value = true
    const grouped = {}
    if (data && typeof data === 'object') {
      for (const [type, items] of Object.entries(data)) {
        if (Array.isArray(items) && items.length > 0) {
          grouped[type] = {
            type,
            label: targetTypeMap[type] || type,
            items,
          }
        }
      }
    }
    searchResults.value = Object.values(grouped)
  } catch (e) {
    searched.value = true
    uni.showToast({ title: '搜索失败', icon: 'none' })
  } finally {
    searching.value = false
  }
}

function selectTag(tag) {
  searchKeyword.value = tag.name
  handleSearch()
}

onMounted(() => loadSuggestions())
</script>

<style scoped>
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; background: #f5f5f5; }
.search-bar { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.search-input { flex: 1; height: 72rpx; padding: 0 24rpx; border: 2rpx solid #e0e0e0; border-radius: 12rpx; background: #fff; font-size: 28rpx; }
.search-btn { width: 140rpx; height: 72rpx; line-height: 72rpx; background: #667eea; color: #fff; border: none; border-radius: 12rpx; font-size: 28rpx; }
.tag-suggestions { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.suggestion-label { font-size: 26rpx; color: #999; margin-bottom: 16rpx; display: block; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 12rpx; }
.cloud-tag { font-size: 24rpx; color: #667eea; padding: 8rpx 20rpx; background: #f0f2ff; border-radius: 20rpx; }
.result-section { display: flex; flex-direction: column; gap: 20rpx; }
.result-group { background: #fff; border-radius: 16rpx; overflow: hidden; }
.group-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; border-bottom: 2rpx solid #f5f5f5; }
.group-title { font-size: 30rpx; font-weight: 500; color: #333; }
.group-count { font-size: 24rpx; color: #999; }
.group-list { padding: 0 24rpx; }
.result-item { padding: 20rpx 0; border-bottom: 2rpx solid #f5f5f5; }
.result-item:last-child { border-bottom: none; }
.result-name { font-size: 28rpx; color: #333; display: block; }
.result-desc { font-size: 24rpx; color: #999; margin-top: 8rpx; display: block; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
