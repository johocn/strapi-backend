<template>
  <view class="page-container">
    <PageHeader title="分类预设管理" />

    <view class="list">
      <view
        v-for="item in presetList"
        :key="item.documentId"
        class="list-item"
      >
        <view class="item-header">
          <text class="item-name">{{ item.categoryName }}</text>
          <view class="item-actions">
            <text class="action-link" @click="handleEdit(item)">编辑</text>
            <text class="action-link delete" @click="handleDelete(item)">删除</text>
          </view>
        </view>
        <view class="item-desc">类型：{{ categoryTypeMap[item.categoryType] || item.categoryType }}</view>
        <view class="tag-cloud" v-if="item.presetTags?.length">
          <text class="cloud-tag" v-for="(tag, idx) in item.presetTags" :key="idx">{{ tag }}</text>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && presetList.length === 0" class="empty-state">
      <text class="empty-text">暂无预设</text>
    </view>

    <view class="add-btn" @click="handleAdd">
      <text style="color:#fff;font-size:48rpx;">+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getCategoryPresetList, createCategoryPreset, updateCategoryPreset, deleteCategoryPreset } from '../../api/tag.js'
import PageHeader from '../../components/PageHeader.vue'

const categoryTypeMap = {
  course: '课程',
  knowledge: '知识点',
  article: '文章',
  video: '视频',
}
const categoryTypeOptions = ['course', 'knowledge', 'article', 'video']

const presetList = ref([])
const loading = ref(false)

async function loadData() {
  loading.value = true
  try {
    const { list } = await getCategoryPresetList({ 'pagination[pageSize]': 100 })
    presetList.value = list || []
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function showPresetModal(title, defaults = {}, callback) {
  uni.showModal({
    title,
    editable: true,
    placeholderText: '分类名称',
    content: defaults.categoryName || '',
    success: async (res) => {
      if (res.confirm) {
        const categoryName = (res.content || '').trim()
        if (!categoryName) {
          uni.showToast({ title: '名称不能为空', icon: 'none' })
          return
        }
        try {
          const payload = { ...defaults, categoryName }
          await callback(payload)
          uni.showToast({ title: '操作成功', icon: 'success' })
          loadData()
        } catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    }
  })
}

function handleAdd() {
  showPresetModal('新增预设', { categoryType: 'course', presetTags: [] }, async (data) => {
    await createCategoryPreset(data)
  })
}

function handleEdit(item) {
  showPresetModal('编辑预设', {
    categoryType: item.categoryType,
    presetTags: item.presetTags || [],
  }, async (data) => {
    await updateCategoryPreset(item.documentId, data)
  })
}

function handleDelete(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除预设「${item.categoryName}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteCategoryPreset(item.documentId)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData()
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

onMounted(() => loadData())
</script>

<style scoped>
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; background: #f5f5f5; }
.list { background: #fff; border-radius: 16rpx; overflow: hidden; }
.list-item { padding: 24rpx; border-bottom: 2rpx solid #f5f5f5; }
.item-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.item-name { font-size: 30rpx; font-weight: 500; color: #333; }
.item-actions { display: flex; gap: 24rpx; }
.action-link { font-size: 26rpx; color: #1989fa; }
.action-link.delete { color: #ff4d4f; }
.item-desc { font-size: 26rpx; color: #999; margin-bottom: 12rpx; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 12rpx; }
.cloud-tag { font-size: 22rpx; color: #667eea; padding: 6rpx 16rpx; background: #f0f2ff; border-radius: 20rpx; }
.add-btn { position: fixed; right: 40rpx; bottom: 40rpx; width: 100rpx; height: 100rpx; border-radius: 50%; background: #667eea; color: #fff; font-size: 48rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 16rpx rgba(102,126,234,0.4); }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
