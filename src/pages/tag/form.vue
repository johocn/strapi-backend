<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑标签' : '新增标签'" />

    <view class="form-section">
      <view class="form-group">
        <text class="form-label">标签名称 <text style="color:#ff4d4f;">*</text></text>
        <input
          type="text"
          v-model="form.name"
          placeholder="请输入标签名称"
          class="form-input"
        />
      </view>

      <view class="form-group">
        <text class="form-label">标签分组</text>
        <picker :range="groupOptions" range-key="name" @change="onGroupChange">
          <view class="form-input picker-value">
            {{ selectedGroupName || '请选择分组' }}
          </view>
        </picker>
      </view>

      <view class="form-group">
        <text class="form-label">排序</text>
        <input
          type="number"
          v-model="form.sort"
          placeholder="请输入排序值"
          class="form-input"
        />
      </view>
    </view>

    <button class="submit-btn" @click="handleSubmit" :loading="submitting">
      {{ isEdit ? '保存' : '创建' }}
    </button>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getTagDetail, createTag, updateTag, getTagGroupList } from '../../api/tag.js'
import PageHeader from '../../components/PageHeader.vue'

const isEdit = ref(false)
const documentId = ref('')
const submitting = ref(false)
const groupOptions = ref([])

const form = ref({
  name: '',
  group: '',
  sort: 0,
})

const selectedGroupName = computed(() => {
  const g = groupOptions.value.find(item => item.documentId === form.value.group)
  return g ? g.name : ''
})

function onGroupChange(e) {
  const idx = e.detail.value
  form.value.group = groupOptions.value[idx]?.documentId || ''
}

async function loadGroups() {
  try {
    const { list } = await getTagGroupList({ 'pagination[pageSize]': 100 })
    groupOptions.value = list || []
  } catch (e) {
    // ignore
  }
}

async function loadDetail(id) {
  try {
    const data = await getTagDetail(id)
    if (data) {
      form.value.name = data.name || ''
      form.value.group = data.group?.documentId || data.group || ''
      form.value.sort = data.sort ?? 0
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    uni.showToast({ title: '请输入标签名称', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      group: form.value.group || undefined,
      sort: Number(form.value.sort) || 0,
    }
    if (isEdit.value) {
      await updateTag(documentId.value, payload)
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      await createTag(payload)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    setTimeout(() => uni.navigateBack(), 500)
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadGroups()
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const id = page.options?.documentId
  if (id) {
    isEdit.value = true
    documentId.value = id
    loadDetail(id)
  }
})
</script>

<style scoped>
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; background: #f5f5f5; }
.form-section { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.form-group { margin-bottom: 24rpx; }
.form-label { font-size: 28rpx; color: #666; margin-bottom: 8rpx; display: block; }
.form-input { width: 100%; height: 80rpx; padding: 0 24rpx; border: 2rpx solid #e0e0e0; border-radius: 12rpx; background: #fff; font-size: 28rpx; box-sizing: border-box; }
.picker-value { display: flex; align-items: center; color: #333; }
.submit-btn { width: 100%; height: 88rpx; background: #667eea; color: #fff; border: none; border-radius: 12rpx; font-size: 32rpx; margin-top: 40rpx; }
</style>
