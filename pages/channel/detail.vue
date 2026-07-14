<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑渠道' : '新增渠道'">
      <button class="btn-primary" @click="handleSave" :disabled="submitting">保存</button>
    </PageHeader>

    <view class="form-section">
      <view class="form-card">
        <view class="form-item">
          <text class="form-label"><text class="required">*</text> 渠道名称</text>
          <input class="form-input" v-model="form.name" placeholder="请输入渠道名称" />
        </view>

        <view class="form-item">
          <text class="form-label">渠道代码</text>
          <input class="form-input" v-model="form.code" placeholder="自动生成，可手动输入" />
        </view>

        <view class="form-item">
          <text class="form-label"><text class="required">*</text> 渠道层级</text>
          <picker mode="selector" :range="tierList" @change="handleTierChange">
            <view class="form-picker">
              <text>{{ form.channelTier || '请选择层级' }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item" v-if="form.channelTier !== 'root'">
          <text class="form-label">上级渠道</text>
          <picker mode="selector" :range="parentChannelNames" @change="handleParentChange">
            <view class="form-picker">
              <text>{{ selectedParentName || '请选择上级渠道' }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">描述</text>
          <textarea class="form-textarea" v-model="form.description" placeholder="请输入描述（可选）" :maxlength="500" />
        </view>

        <view class="form-item switch-item">
          <text class="form-label">状态</text>
          <view class="switch-wrap">
            <switch :checked="form.status" @change="onStatusChange" color="#07c160" />
            <text class="switch-text">{{ form.status ? '启用' : '禁用' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 编辑模式显示额外信息 -->
    <view class="info-section" v-if="isEdit && detail">
      <view class="section-title">渠道信息</view>
      <view class="info-card">
        <view class="info-row">
          <text class="info-label">渠道ID</text>
          <text class="info-value">{{ channelId }}</text>
        </view>
        <view class="info-row" v-if="detail.path">
          <text class="info-label">路径</text>
          <text class="info-value">{{ detail.path }}</text>
        </view>
        <view class="info-row" v-if="detail.depth !== undefined">
          <text class="info-label">深度</text>
          <text class="info-value">{{ detail.depth }}</text>
        </view>
        <view class="info-row" v-if="detail.parentChannelId">
          <text class="info-label">上级渠道</text>
          <text class="info-value">{{ detail.parentChannelId.name }}</text>
        </view>
      </view>
    </view>

    <view class="bottom-actions" v-if="isEdit">
      <button class="btn-danger" @click="handleDelete">删除渠道</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAdminChannelDetail, createChannel, updateChannel, deleteChannel, getAdminChannelList } from '../../src/api/channel.js'
import PageHeader from '../../src/components/PageHeader.vue'

const channelId = ref(null)
const isEdit = computed(() => !!channelId.value)
const detail = ref(null)
const submitting = ref(false)

const tierList = ['root', 'core', 'senior', 'global', 'authorized', 'official', 'partner', 'agent', 'national', 'regional', 'city', 'county', 'local', 'store']

const form = ref({
  name: '',
  code: '',
  description: '',
  status: true,
  channelTier: 'store',
  parentChannel: null,
})

const parentChannels = ref([])
const parentChannelNames = computed(() => ['无'].concat(parentChannels.value.map(c => c.name)))
const selectedParentName = computed(() => {
  if (!form.value.parentChannel) return ''
  const found = parentChannels.value.find(c => c.id === form.value.parentChannel)
  return found ? found.name : ''
})

function onStatusChange(e) {
  form.value.status = e.detail.value
}

function handleTierChange(e) {
  form.value.channelTier = tierList[e.detail.value]
  form.value.parentChannel = null
  loadParentChannels()
}

function handleParentChange(e) {
  const idx = e.detail.value
  if (idx === 0) {
    form.value.parentChannel = null
  } else {
    form.value.parentChannel = parentChannels.value[idx - 1].id
  }
}

async function loadParentChannels() {
  if (form.value.channelTier === 'root') {
    parentChannels.value = []
    return
  }
  try {
    const res = await getAdminChannelList({ pageSize: 200 })
    parentChannels.value = (res.list || []).filter(c => c.channelTier !== form.value.channelTier)
  } catch (e) {
    parentChannels.value = []
  }
}

async function loadDetail() {
  try {
    const res = await getAdminChannelDetail(channelId.value)
    detail.value = res
    form.value = {
      name: res.name || '',
      code: res.code || '',
      description: res.description || '',
      status: res.status !== false,
      channelTier: res.channelTier || 'store',
      parentChannel: res.parentChannelId?.id || null,
    }
    await loadParentChannels()
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function handleSave() {
  if (submitting.value) return
  if (!form.value.name) {
    return uni.showToast({ title: '请输入渠道名称', icon: 'none' })
  }

  submitting.value = true
  try {
    const data = {
      name: form.value.name,
      code: form.value.code || undefined,
      description: form.value.description || undefined,
      status: form.value.status,
      channelTier: form.value.channelTier,
    }
    if (form.value.parentChannel) {
      data.parentChannel = form.value.parentChannel
    }

    if (isEdit.value) {
      await updateChannel(channelId.value, data)
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      await createChannel(data)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    setTimeout(() => uni.navigateBack(), 500)
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function handleDelete() {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除该渠道吗？将级联删除所有子渠道和成员，此操作不可恢复。',
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteChannel(channelId.value)
          uni.showToast({ title: '删除成功', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 500)
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

onMounted(() => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  channelId.value = current.$page?.options?.id || current.options?.id
  if (channelId.value) {
    loadDetail()
  } else {
    loadParentChannels()
  }
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.btn-primary {
  background: #ff0000; color: #fff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}

.form-section, .info-section { margin-bottom: 20rpx; }
.form-card, .info-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx;
}

.form-item {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.form-item:last-child { border-bottom: none; }

.form-label {
  font-size: 28rpx; color: #333; margin-bottom: 12rpx; display: block;
}
.required { color: #ff4d4f; }

.form-input {
  width: 100%; height: 72rpx; background: #f5f5f5;
  border-radius: 8rpx; padding: 0 20rpx; font-size: 28rpx;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%; min-height: 160rpx; background: #f5f5f5;
  border-radius: 8rpx; padding: 20rpx; font-size: 28rpx;
  box-sizing: border-box;
}

.form-picker {
  display: flex; justify-content: space-between; align-items: center;
  height: 72rpx; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx;
  font-size: 28rpx;
}
.arrow { font-size: 20rpx; color: #999; }

.switch-item {
  display: flex; justify-content: space-between; align-items: center;
}
.switch-item .form-label { margin-bottom: 0; }
.switch-wrap { display: flex; align-items: center; gap: 12rpx; }
.switch-text { font-size: 28rpx; color: #666; }

.section-title {
  font-size: 30rpx; font-weight: bold; color: #333;
  margin-bottom: 16rpx; padding-left: 4rpx;
}

.info-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16rpx 0; border-bottom: 1rpx solid #f5f5f5;
}
.info-row:last-child { border-bottom: none; }
.info-label { font-size: 28rpx; color: #999; }
.info-value { font-size: 28rpx; color: #333; }

.bottom-actions { padding: 20rpx 0; }
.btn-danger {
  width: 100%; height: 88rpx; line-height: 88rpx;
  background: #fff; color: #ff4d4f; border: 2rpx solid #ff4d4f;
  border-radius: 8rpx; font-size: 30rpx;
}
</style>
