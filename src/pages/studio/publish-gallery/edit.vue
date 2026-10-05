<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑图集' : '新增图集'">
      <button class="btn-secondary" @click="goBack">取消</button>
      <button class="btn-primary" @click="handleSubmit">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">基本信息</view>

        <view class="form-item">
          <text class="form-label">标题 *</text>
          <input type="text" v-model="form.title" placeholder="请输入图集标题" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">描述</text>
          <textarea v-model="form.description" placeholder="请输入图集正文/笔记" class="form-textarea" />
        </view>

        <view class="form-item">
          <text class="form-label">话题标签（逗号分隔）</text>
          <input type="text" v-model="form.tags" placeholder="如：穿搭,美食,旅行" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">发布状态</text>
          <picker mode="selector" :range="statusLabelOptions" :value="statusValueIndex" @change="handleStatusChange">
            <view class="form-picker">
              <text>{{ statusLabelOptions[statusValueIndex] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">可见范围</text>
          <picker mode="selector" :range="scopeLabelOptions" :value="scopeValueIndex" @change="handleScopeChange">
            <view class="form-picker">
              <text>{{ scopeLabelOptions[scopeValueIndex] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item" v-if="form.scope === 'tenant'">
          <text class="form-label">指定租户 ID</text>
          <input type="text" v-model="form.scopeTenantId" placeholder="请输入租户 ID" class="form-input" />
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">图集图片 ({{ form.images.length }})</view>
        <view class="section-hint">封面图自动取第一张，至少 1 张</view>

        <view v-for="(img, idx) in form.images" :key="idx" class="image-row">
          <view class="image-preview">
            <image v-if="img.url" :src="img.url" mode="aspectFill" class="thumb" @click="previewImg(idx)" />
            <view v-else class="thumb-placeholder">无图</view>
          </view>
          <view class="image-fields">
            <input type="text" v-model="img.url" placeholder="图片 URL" class="form-input" />
            <input type="text" v-model="img.caption" placeholder="说明（可选）" class="form-input" />
          </view>
          <view class="image-actions">
            <button v-if="idx > 0" class="btn-icon" @click="moveUp(idx)">↑</button>
            <button v-if="idx < form.images.length - 1" class="btn-icon" @click="moveDown(idx)">↓</button>
            <button class="btn-icon btn-danger" @click="removeImage(idx)">×</button>
          </view>
        </view>

        <button class="btn-add" @click="addImage">+ 添加图片</button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { publishGalleryApi } from '../../../api/studio.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'

const userStore = useUserStore()

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)

const statusEnumList = ['draft', 'processing', 'ready', 'published']
const statusLabelOptions = ['草稿', '处理中', '就绪', '已发布']

const scopeEnumList = ['current', 'global', 'tenant']
const scopeLabelOptions = ['当前租户', '全局可见', '指定租户']

const form = ref({
  title: '',
  description: '',
  tags: '',
  status: 'draft',
  scope: 'current',
  scopeTenantId: '',
  images: [{ url: '', caption: '' }]
})

// 首图自动同步为 coverImage
watch(() => form.value.images, (imgs) => {
  if (imgs.length > 0 && imgs[0].url) {
    form.value.coverImage = imgs[0].url
  }
}, { deep: true })

const statusValueIndex = computed(() => {
  const idx = statusEnumList.indexOf(form.value.status)
  return idx >= 0 ? idx : 0
})

const scopeValueIndex = computed(() => {
  const idx = scopeEnumList.indexOf(form.value.scope)
  return idx >= 0 ? idx : 0
})

function handleStatusChange(e) {
  form.value.status = statusEnumList[e.detail.value]
}

function handleScopeChange(e) {
  form.value.scope = scopeEnumList[e.detail.value]
  if (form.value.scope !== 'tenant') form.value.scopeTenantId = ''
}

function addImage() {
  form.value.images.push({ url: '', caption: '' })
}

function removeImage(idx) {
  if (form.value.images.length <= 1) return
  form.value.images.splice(idx, 1)
}

function moveUp(idx) {
  const arr = form.value.images
  ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
  form.value.images = [...arr]
}

function moveDown(idx) {
  const arr = form.value.images
  ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
  form.value.images = [...arr]
}

function previewImg(idx) {
  const urls = form.value.images.map(i => i.url).filter(Boolean)
  uni.previewImage({ urls, current: urls[idx] })
}

function goBack() {
  uni.navigateBack()
}

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await publishGalleryApi.detail(documentId.value)
    if (item) {
      form.value = {
        title: item.title || '',
        description: item.description || '',
        tags: Array.isArray(item.tags) ? item.tags.join(',') : (item.tags || ''),
        status: item.status || 'draft',
        scope: item.scope || 'current',
        scopeTenantId: item.scopeTenantId || '',
        images: Array.isArray(item.images) && item.images.length > 0
          ? item.images.map(i => ({ url: i.url || '', caption: i.caption || '' }))
          : [{ url: '', caption: '' }]
      }
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function handleSubmit() {
  if (!form.value.title) {
    uni.showToast({ title: '请填写标题', icon: 'none' })
    return
  }
  const validImages = form.value.images.filter(i => i.url.trim())
  if (validImages.length === 0) {
    uni.showToast({ title: '至少添加 1 张图片', icon: 'none' })
    return
  }

  const payload = { ...form.value }
  payload.images = validImages
  // coverImage 自动取首图
  payload.coverImage = validImages[0].url
  // tags 逗号分隔 → json array
  if (typeof payload.tags === 'string' && payload.tags.trim()) {
    payload.tags = payload.tags.split(',').map(s => s.trim()).filter(Boolean)
  } else {
    payload.tags = []
  }
  // 不要把 coverImage 放错位置 — 后端有 coverImage 字段
  try {
    if (isEdit.value) {
      await publishGalleryApi.update(documentId.value, payload)
    } else {
      await publishGalleryApi.create(payload)
    }
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

onLoad((options) => {
  if (options?.documentId) {
    documentId.value = options.documentId
    loadDetail()
  }
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; display: flex; flex-direction: column; }
.form-scroll { flex: 1; padding: 20rpx; box-sizing: border-box; }

.btn-primary {
  background: #ff0000; color: #fff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; margin-left: 12rpx;
}
.btn-secondary {
  background: #f5f5f5; color: #333; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none;
}
.btn-add {
  width: 100%; margin-top: 20rpx; padding: 20rpx;
  background: #fff; border: 2rpx dashed #ddd; border-radius: 8rpx;
  color: #999; font-size: 26rpx;
}
.btn-icon {
  width: 56rpx; height: 56rpx; line-height: 56rpx;
  background: #f5f5f5; border: none; border-radius: 8rpx;
  font-size: 24rpx; color: #666; margin-bottom: 8rpx;
}
.btn-danger { background: #ffebeb; color: #ff0000; }

.form-section {
  background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx;
}
.section-title {
  font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 8rpx;
  padding-left: 8rpx; border-left: 6rpx solid #ff0000;
}
.section-hint { font-size: 22rpx; color: #999; margin-bottom: 20rpx; }

.form-item { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; }
.form-input {
  width: 100%; height: 72rpx; padding: 0 20rpx;
  background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box;
}
.form-textarea {
  width: 100%; min-height: 160rpx; padding: 20rpx;
  background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box;
}
.form-picker {
  display: flex; justify-content: space-between; align-items: center; height: 72rpx;
  padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx;
}
.arrow { font-size: 20rpx; color: #999; }

.image-row {
  display: flex; gap: 16rpx; padding: 16rpx; margin-bottom: 12rpx;
  background: #f9f9f9; border-radius: 8rpx;
}
.image-preview { flex-shrink: 0; }
.thumb { width: 120rpx; height: 120rpx; border-radius: 8rpx; }
.thumb-placeholder {
  width: 120rpx; height: 120rpx; border-radius: 8rpx;
  background: #eee; display: flex; align-items: center; justify-content: center;
  font-size: 22rpx; color: #ccc;
}
.image-fields { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.image-fields .form-input { height: 56rpx; font-size: 24rpx; }
.image-actions { flex-shrink: 0; display: flex; flex-direction: column; }
</style>
