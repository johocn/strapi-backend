<template>
  <view class="page-container">
    <PageHeader title="分组管理">
      <button class="btn-primary" @click="handleAdd" v-if="hasPermission('tag-group.create')">+ 新增分组</button>
    </PageHeader>

    <view class="list">
      <view
        v-for="item in groupList"
        :key="item.documentId"
        class="list-item"
      >
        <view class="item-header">
          <text class="item-name">{{ item.name }}</text>
          <view class="item-actions">
            <text class="action-link" @click="handleEdit(item)" v-if="hasPermission('tag-group.update')">编辑</text>
            <text class="action-link delete" @click="handleDelete(item)" v-if="hasPermission('tag-group.delete')">删除</text>
          </view>
        </view>
        <view class="item-desc">Slug：{{ item.slug || '-' }}</view>
        <view class="item-desc">{{ item.description || '暂无描述' }}</view>
        <view class="item-meta">
          <text class="meta-tag">{{ item.tags?.length || 0 }} 个标签</text>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && groupList.length === 0" class="empty-state">
      <text class="empty-text">暂无分组</text>
    </view>

    <view class="add-btn" @click="handleAdd">
      <text style="color:#fff;font-size:48rpx;">+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getTagGroupList, createTagGroup, updateTagGroup, deleteTagGroup } from '../../api/tag.js'
import { useUserStore } from '../../store/user.js'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const groupList = ref([])
const loading = ref(false)

async function loadData() {
  loading.value = true
  try {
    const { list } = await getTagGroupList({ 'pagination[pageSize]': 100 })
    groupList.value = list || []
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function showGroupModal(title, defaults = {}, callback) {
  let formData = { name: defaults.name || '', slug: defaults.slug || '', description: defaults.description || '' }

  uni.showModal({
    title,
    editable: true,
    placeholderText: '分组名称',
    content: formData.name,
    success: async (res) => {
      if (res.confirm) {
        const name = (res.content || '').trim()
        if (!name) {
          uni.showToast({ title: '名称不能为空', icon: 'none' })
          return
        }
        try {
          const payload = { ...defaults, name }
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
  showGroupModal('新增分组', {}, async (data) => {
    await createTagGroup(data)
  })
}

function handleEdit(item) {
  showGroupModal('编辑分组', { slug: item.slug, description: item.description }, async (data) => {
    await updateTagGroup(item.documentId, data)
  })
}

function handleDelete(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除分组「${item.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteTagGroup(item.documentId)
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
.item-desc { font-size: 26rpx; color: #999; margin-bottom: 8rpx; }
.item-meta { display: flex; gap: 12rpx; flex-wrap: wrap; }
.meta-tag { font-size: 22rpx; color: #999; padding: 4rpx 12rpx; background: #f5f5f5; border-radius: 6rpx; }
.add-btn { position: fixed; right: 40rpx; bottom: 40rpx; width: 100rpx; height: 100rpx; border-radius: 50%; background: #667eea; color: #fff; font-size: 48rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 16rpx rgba(102,126,234,0.4); }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
