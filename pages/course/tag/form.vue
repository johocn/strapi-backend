<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑标签' : '新增标签'"></PageHeader>

    <view class="form-section">
      <view class="form-item">
        <text class="form-label">标签名称 <text class="required">*</text></text>
        <input
          type="text"
          v-model="form.name"
          placeholder="请输入标签名称"
          class="form-input"
        />
      </view>

      <view class="form-item">
        <text class="form-label">标签颜色</text>
        <view class="color-row">
          <view
            v-for="c in presetColors"
            :key="c"
            class="color-option"
            :class="{ active: form.color === c }"
            :style="{ background: c }"
            @click="form.color = c"
          ></view>
          <input
            type="text"
            v-model="form.color"
            placeholder="#000000"
            class="color-input"
          />
        </view>
        <view class="color-preview" v-if="form.color">
          <view class="preview-dot" :style="{ background: form.color }"></view>
          <text class="preview-text">预览效果</text>
        </view>
      </view>
    </view>

    <view class="form-actions">
      <button class="btn-cancel" @click="goBack">取消</button>
      <button class="btn-submit" @click="handleSubmit" :loading="submitting">
        {{ isEdit ? '保存' : '创建' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getCourseTagDetail, createCourseTag, updateCourseTag } from '../../../src/api/course.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const presetColors = [
  '#ff4d4f', '#ff7a45', '#faad14', '#52c41a', '#13c2c2',
  '#1890ff', '#2f54eb', '#722ed1', '#eb2f96', '#999999',
]

const isEdit = ref(false)
const documentId = ref('')
const submitting = ref(false)
const form = ref({
  name: '',
  color: '#1890ff',
})

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const id = page.options?.id
  if (id) {
    isEdit.value = true
    documentId.value = id
    loadDetail(id)
  }
})

async function loadDetail(id) {
  try {
    const data = await getCourseTagDetail(id)
    if (data) {
      form.value.name = data.name || ''
      form.value.color = data.color || '#1890ff'
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
      color: form.value.color || undefined,
    }
    if (isEdit.value) {
      await updateCourseTag(documentId.value, payload)
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      await createCourseTag(payload)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    setTimeout(() => uni.navigateBack(), 500)
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}


</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.form-section { background: #fff; border-radius: 12rpx; padding: 20rpx; }

.form-item { margin-bottom: 32rpx; }
.form-item:last-child { margin-bottom: 0; }

.form-label { font-size: 28rpx; color: #333; margin-bottom: 12rpx; display: block; }
.required { color: #ff4d4f; }

.form-input {
  width: 100%; height: 80rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box;
}

.color-row {
  display: flex; flex-wrap: wrap; gap: 16rpx; align-items: center;
}
.color-option {
  width: 56rpx; height: 56rpx; border-radius: 8rpx;
  border: 4rpx solid transparent;
}
.color-option.active { border-color: #333; }
.color-input {
  width: 200rpx; height: 56rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 0 16rpx; font-size: 26rpx;
}

.color-preview {
  display: flex; align-items: center; gap: 12rpx; margin-top: 16rpx;
}
.preview-dot { width: 32rpx; height: 32rpx; border-radius: 6rpx; }
.preview-text { font-size: 26rpx; color: #999; }

.form-actions {
  display: flex; gap: 20rpx; margin-top: 40rpx; padding: 0 20rpx;
}

.btn-cancel {
  flex: 1; height: 88rpx; line-height: 88rpx; text-align: center;
  background: #f5f5f5; color: #666; font-size: 30rpx; border-radius: 8rpx; border: none;
}

.btn-submit {
  flex: 1; height: 88rpx; line-height: 88rpx; text-align: center;
  background: #07c160; color: #fff; font-size: 30rpx; border-radius: 8rpx; border: none;
}
</style>
