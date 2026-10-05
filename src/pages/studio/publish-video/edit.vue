<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑短视频' : '新增短视频'">
      <button class="btn-secondary" @click="goBack">取消</button>
      <button class="btn-primary" @click="handleSubmit">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">基本信息</view>

        <view class="form-item">
          <text class="form-label">标题 *</text>
          <input type="text" v-model="form.title" placeholder="请输入视频标题" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">视频地址 *</text>
          <input type="text" v-model="form.videoUrl" placeholder="请输入视频 URL" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">封面图 URL</text>
          <input type="text" v-model="form.coverImage" placeholder="请输入封面图 URL" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">时长（秒）</text>
          <input type="number" v-model="form.duration" placeholder="请输入视频时长" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">文件大小（字节）</text>
          <input type="number" v-model="form.size" placeholder="请输入文件大小（可选）" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">描述</text>
          <textarea v-model="form.description" placeholder="请输入视频描述" class="form-textarea" />
        </view>

        <view class="form-item">
          <text class="form-label">话题标签（逗号分隔）</text>
          <input type="text" v-model="form.tags" placeholder="如：搞笑,短视频,热门" class="form-input" />
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
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { publishVideoApi } from '../../../api/studio.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)

const statusEnumList = ['draft', 'processing', 'ready', 'published']
const statusLabelOptions = ['草稿', '处理中', '就绪', '已发布']

const scopeEnumList = ['current', 'global', 'tenant']
const scopeLabelOptions = ['当前租户', '全局可见', '指定租户']

const form = ref({
  title: '',
  videoUrl: '',
  coverImage: '',
  description: '',
  duration: '',
  size: '',
  tags: '',
  status: 'draft',
  scope: 'current',
  scopeTenantId: ''
})

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

function goBack() {
  uni.navigateBack()
}

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await publishVideoApi.detail(documentId.value)
    if (item) {
      form.value = {
        title: item.title || '',
        videoUrl: item.videoUrl || '',
        coverImage: item.coverImage || '',
        duration: item.duration || '',
        size: item.size || '',
        description: item.description || '',
        tags: Array.isArray(item.tags) ? item.tags.join(',') : (item.tags || ''),
        status: item.status || 'draft',
        scope: item.scope || 'current',
        scopeTenantId: item.scopeTenantId || ''
      }
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function handleSubmit() {
  if (!form.value.title || !form.value.videoUrl) {
    uni.showToast({ title: '请填写标题和视频地址', icon: 'none' })
    return
  }
  const payload = { ...form.value }
  // tags 从逗号分隔 string → json array
  if (typeof payload.tags === 'string' && payload.tags.trim()) {
    payload.tags = payload.tags.split(',').map(s => s.trim()).filter(Boolean)
  } else {
    payload.tags = []
  }
  try {
    if (isEdit.value) {
      await publishVideoApi.update(documentId.value, payload)
    } else {
      await publishVideoApi.create(payload)
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
page {
  background: #f5f5f5;
}
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.form-scroll {
  flex: 1;
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
  margin-left: 12rpx;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
  padding: 16rpx 32rpx;
  font-size: 30rpx;
  border-radius: 8rpx;
  border: none;
  line-height: 1.2;
}

.form-section {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
  padding-left: 8rpx;
  border-left: 6rpx solid #ff0000;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.arrow {
  font-size: 20rpx;
  color: #999;
}

.form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
