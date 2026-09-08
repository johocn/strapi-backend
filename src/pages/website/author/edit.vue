<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑作者' : '新增作者'">
      <button class="btn-primary" @click="handleSubmit" v-if="hasPermission('author.update')">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">基本信息</view>

        <view class="form-item">
          <text class="form-label">姓名 *</text>
          <input type="text" v-model="form.name" placeholder="作者姓名" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">slug</text>
          <input type="text" v-model="form.slug" placeholder="URL 别名（留空自动生成）" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">职位头衔</text>
          <input type="text" v-model="form.position" placeholder="如：本地家装行业分析师" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">从业背景（E-E-A-T 背书）</text>
          <textarea v-model="form.bio" placeholder="从业经历/专业资质简介" class="form-textarea" />
        </view>

        <view class="form-item">
          <text class="form-label">从业年限</text>
          <input type="number" v-model="form.experienceYears" placeholder="如：8" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">外部档案链接（JSON）</text>
          <textarea v-model="jsonFields.sameAs" placeholder='["https://example.com/profile"]' class="form-textarea json-textarea" />
        </view>

        <view class="form-item form-row">
          <text class="form-label">启用状态</text>
          <switch :checked="form.status" @change="form.status = !form.status" />
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { authorApi } from '../../../api/website.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)

const form = ref({
  name: '',
  slug: '',
  position: '',
  bio: '',
  experienceYears: '',
  sameAs: [],
  status: true,
})

const jsonFields = ref({ sameAs: '' })

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await authorApi.detail(documentId.value)
    if (!item) return
    form.value = {
      name: item.name || '',
      slug: item.slug || '',
      position: item.position || '',
      bio: item.bio || '',
      experienceYears: item.experienceYears || '',
      sameAs: Array.isArray(item.sameAs) ? item.sameAs : [],
      status: item.status !== false,
    }
    jsonFields.value.sameAs = Array.isArray(item.sameAs) ? JSON.stringify(item.sameAs, null, 2) : ''
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function handleSubmit() {
  if (!form.value.name) {
    uni.showToast({ title: '请填写姓名', icon: 'none' })
    return
  }
  let sameAs = []
  if (jsonFields.value.sameAs.trim()) {
    try {
      sameAs = JSON.parse(jsonFields.value.sameAs)
    } catch (e) {
      uni.showToast({ title: '外部档案链接 JSON 格式错误', icon: 'none' })
      return
    }
  }
  const payload = {
    ...form.value,
    experienceYears: form.value.experienceYears ? Number(form.value.experienceYears) : null,
    sameAs,
  }
  try {
    if (isEdit.value) {
      await authorApi.update(documentId.value, payload)
    } else {
      await authorApi.create(payload)
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

.json-textarea {
  min-height: 160rpx;
  font-family: monospace;
}

.form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
