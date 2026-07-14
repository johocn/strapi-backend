<template>
  <view class="page-container">
    <PageHeader title="OSS 存储设置" />

    <view class="form-section">
      <view class="form-group">
        <text class="form-label">存储提供商</text>
        <picker mode="selector" :range="providerOptions" @change="onProviderChange">
          <view class="form-input picker-input">{{ form.provider || '请选择' }}</view>
        </picker>
      </view>
      <view class="form-group">
        <text class="form-label">Bucket</text>
        <input v-model="form.bucket" class="form-input" placeholder="请输入 Bucket 名称" />
      </view>
      <view class="form-group">
        <text class="form-label">Region</text>
        <input v-model="form.region" class="form-input" placeholder="请输入 Region" />
      </view>
      <view class="form-group">
        <text class="form-label">Access Key</text>
        <input v-model="form.accessKey" class="form-input" placeholder="请输入 Access Key" />
      </view>
      <view class="form-group">
        <text class="form-label">Secret Key</text>
        <input v-model="form.secretKey" class="form-input" placeholder="请输入 Secret Key" type="password" />
      </view>
    </view>

    <view class="btn-group">
      <button class="submit-btn" @click="handleSave">保存设置</button>
      <button class="test-btn" @click="handleTestConnection">测试连接</button>
      <button class="repair-btn" @click="handleRepairFolders">修复目录</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getOssSettings, updateOssSettings, testOssProvider, repairOssFolders } from '../../src/api/oss-admin.js'
import PageHeader from '../../src/components/PageHeader.vue'

const providerOptions = ['aliyun', 'tencent', 'aws', 'qiniu']
const form = ref({
  provider: '',
  bucket: '',
  region: '',
  accessKey: '',
  secretKey: ''
})

function onProviderChange(e) {
  form.value.provider = providerOptions[e.detail.value]
}

async function loadSettings() {
  try {
    const res = await getOssSettings()
    if (res) {
      form.value = {
        provider: res.provider || '',
        bucket: res.bucket || '',
        region: res.region || '',
        accessKey: res.accessKey || '',
        secretKey: res.secretKey || ''
      }
    }
  } catch (e) {
    // 设置可能不存在，使用默认值
  }
}

async function handleSave() {
  if (!form.value.bucket.trim()) {
    uni.showToast({ title: '请输入 Bucket', icon: 'none' })
    return
  }
  try {
    await updateOssSettings(form.value)
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

async function handleTestConnection() {
  try {
    await testOssProvider(form.value)
    uni.showToast({ title: '连接成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '连接失败', icon: 'none' })
  }
}

async function handleRepairFolders() {
  try {
    await repairOssFolders()
    uni.showToast({ title: '修复完成', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '修复失败', icon: 'none' })
  }
}

onMounted(() => loadSettings())
</script>

<style scoped>
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; background: #f5f5f5; }
.form-section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.form-group { margin-bottom: 24rpx; }
.form-label { font-size: 28rpx; color: #666; margin-bottom: 8rpx; }
.form-input { width: 100%; height: 80rpx; padding: 0 24rpx; border: 2rpx solid #e0e0e0; border-radius: 12rpx; background: #fff; font-size: 28rpx; box-sizing: border-box; }
.picker-input { line-height: 80rpx; color: #333; }
.btn-group { display: flex; flex-direction: column; gap: 20rpx; }
.submit-btn { width: 100%; height: 88rpx; background: #667eea; color: #fff; border: none; border-radius: 12rpx; font-size: 32rpx; }
.test-btn { width: 100%; height: 88rpx; background: #07c160; color: #fff; border: none; border-radius: 12rpx; font-size: 32rpx; }
.repair-btn { width: 100%; height: 88rpx; background: #fff; color: #667eea; border: 2rpx solid #667eea; border-radius: 12rpx; font-size: 32rpx; }
</style>
