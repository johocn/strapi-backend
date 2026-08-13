<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑广告区域' : '新增广告区域'">
      <button class="btn-secondary" @click="goBack">取消</button>
      <button class="btn-primary" @click="handleSubmit">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">基本信息</view>

        <view class="form-item">
          <text class="form-label">名称 *</text>
          <input type="text" v-model="form.name" placeholder="请输入广告区域名称" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">编码 *</text>
          <input type="text" v-model="form.code" placeholder="请输入唯一编码" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">位置</text>
          <picker mode="selector" :range="positionLabelOptions" :value="positionValueIndex" @change="handlePositionChange">
            <view class="form-picker">
              <text>{{ positionLabelOptions[positionValueIndex] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">展示模式</text>
          <picker mode="selector" :range="displayModeLabelOptions" :value="displayModeValueIndex" @change="handleDisplayModeChange">
            <view class="form-picker">
              <text>{{ displayModeLabelOptions[displayModeValueIndex] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">是否启用</text>
          <view class="form-switch-row">
            <switch :checked="form.isActive" @change="form.isActive = $event.detail.value" />
            <text class="switch-text">{{ form.isActive ? '启用' : '停用' }}</text>
          </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">尺寸与配置</view>

        <view class="form-item">
          <text class="form-label">建议宽度</text>
          <input type="number" v-model="form.suggestedWidth" placeholder="请输入建议宽度（px）" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">建议高度</text>
          <input type="number" v-model="form.suggestedHeight" placeholder="请输入建议高度（px）" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">关联广告位编码</text>
          <input type="text" v-model="form.adSlotCode" placeholder="关联 zhao-studio 广告位用于追踪" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">排序</text>
          <input type="number" v-model="form.sortOrder" placeholder="请输入排序值" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">描述</text>
          <textarea v-model="form.description" placeholder="请输入描述" class="form-textarea" />
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { adZoneApi } from '../../../api/studio.js'
import PageHeader from '../../../components/PageHeader.vue'

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)

const positionEnumList = ['home-banner', 'home-sidebar', 'list-top', 'article-top', 'article-bottom', 'article-inline', 'footer', 'popup', 'float', 'custom']
const positionLabelOptions = ['首页横幅', '首页侧边', '列表顶部', '文章顶部', '文章底部', '文章内嵌', '页脚', '弹窗', '悬浮', '自定义']

const displayModeEnumList = ['single', 'rotation', 'slideshow', 'stack']
const displayModeLabelOptions = ['单条', '轮替', '幻灯片', '堆叠']

const form = ref({
  name: '',
  code: '',
  position: 'home-banner',
  displayMode: 'single',
  suggestedWidth: null,
  suggestedHeight: null,
  adSlotCode: '',
  description: '',
  isActive: true,
  sortOrder: 0
})

const positionValueIndex = computed(() => {
  const idx = positionEnumList.indexOf(form.value.position)
  return idx >= 0 ? idx : 0
})

const displayModeValueIndex = computed(() => {
  const idx = displayModeEnumList.indexOf(form.value.displayMode)
  return idx >= 0 ? idx : 0
})

function handlePositionChange(e) {
  form.value.position = positionEnumList[e.detail.value]
}

function handleDisplayModeChange(e) {
  form.value.displayMode = displayModeEnumList[e.detail.value]
}

function goBack() {
  uni.navigateBack()
}

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await adZoneApi.detail(documentId.value)
    if (item) {
      form.value = {
        name: item.name || '',
        code: item.code || '',
        position: item.position || 'home-banner',
        displayMode: item.displayMode || 'single',
        suggestedWidth: item.suggestedWidth ?? null,
        suggestedHeight: item.suggestedHeight ?? null,
        adSlotCode: item.adSlotCode || '',
        description: item.description || '',
        isActive: item.isActive !== false,
        sortOrder: item.sortOrder ?? 0
      }
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function handleSubmit() {
  if (!form.value.name || !form.value.code) {
    uni.showToast({ title: '请填写名称和编码', icon: 'none' })
    return
  }
  const payload = { ...form.value }
  try {
    if (isEdit.value) {
      await adZoneApi.update(documentId.value, payload)
    } else {
      await adZoneApi.create(payload)
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

.form-switch-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.switch-text {
  font-size: 28rpx;
  color: #666;
}

.arrow {
  font-size: 20rpx;
  color: #999;
}
</style>
