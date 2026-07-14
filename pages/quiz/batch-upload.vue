<template>
  <view class="page-container">
    <PageHeader title="批量导入" />

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">下载模板</view>
        <view class="tip-text">请先下载模板文件，按照格式填写题目后再上传</view>
        
        <view class="download-btn" @click="handleDownload">
          <text class="download-icon">📥</text>
          <text class="download-text">下载导入模板</text>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">上传文件</view>
        
        <view class="upload-area" @click="handleChooseFile">
          <view v-if="!fileInfo" class="upload-placeholder">
            <text class="upload-icon">📤</text>
            <text class="upload-text">点击选择文件</text>
            <text class="upload-hint">支持 Excel (.xlsx, .xls) 或 CSV 文件</text>
          </view>
          <view v-else class="file-info">
            <text class="file-icon">📄</text>
            <text class="file-name">{{ fileInfo.name }}</text>
            <text class="file-size">{{ formatFileSize(fileInfo.size) }}</text>
            <view class="delete-btn" @click.stop="clearFile">删除</view>
          </view>
        </view>
      </view>

      <view class="form-section" v-if="importResult">
        <view class="section-title">导入结果</view>
        
        <view class="result-summary">
          <view class="result-item success">
            <text class="result-count">{{ importResult.successCount }}</text>
            <text class="result-label">成功</text>
          </view>
          <view class="result-item failed">
            <text class="result-count">{{ importResult.failedCount }}</text>
            <text class="result-label">失败</text>
          </view>
        </view>

        <view class="error-list" v-if="importResult.errors && importResult.errors.length > 0">
          <view class="error-item" v-for="(err, index) in importResult.errors" :key="index">
            <text class="error-line">第 {{ err.line }} 行：</text>
            <text class="error-msg">{{ err.message }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="bottom-action" v-if="fileInfo && !importResult">
      <button class="btn-save" @click="handleUpload" :disabled="uploading">
        {{ uploading ? '导入中...' : '开始导入' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import PageHeader from '../../src/components/PageHeader.vue'
import { createQuizBatch, importQuizBatch, downloadQuizTemplate } from '../../src/api/quiz.js'

const fileInfo = ref(null)
const uploading = ref(false)
const importResult = ref(null)

async function handleDownload() {
  try {
    uni.showLoading({ title: '下载中...' })
    await downloadQuizTemplate()
    uni.hideLoading()
    uni.showToast({ title: '下载成功', icon: 'success' })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '下载失败', icon: 'none' })
  }
}

function handleChooseFile() {
  uni.chooseFile({
    count: 1,
    extension: ['.xlsx', '.xls', '.csv'],
    success: (res) => {
      const file = res.tempFiles[0]
      fileInfo.value = {
        name: file.name,
        size: file.size,
        path: res.tempFilePaths[0]
      }
      importResult.value = null
    }
  })
}

function clearFile() {
  fileInfo.value = null
  importResult.value = null
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

async function handleUpload() {
  if (!fileInfo.value) {
    uni.showToast({ title: '请先选择文件', icon: 'none' })
    return
  }
  
  try {
    uploading.value = true
    uni.showLoading({ title: '导入中...' })
    
    // 创建批量上传记录
    const batchResult = await createQuizBatch({
      fileName: fileInfo.value.name,
      fileSize: fileInfo.value.size
    })
    
    // 执行导入
    const result = await importQuizBatch(batchResult.id)
    
    importResult.value = {
      successCount: result.successCount || 0,
      failedCount: result.failedCount || 0,
      errors: result.errors || []
    }
    
    uni.hideLoading()
    
    if (result.successCount > 0) {
      uni.showToast({ title: '导入成功', icon: 'success' })
    } else {
      uni.showToast({ title: '导入失败', icon: 'none' })
    }
  } catch (e) {
    uploading.value = false
    uni.hideLoading()
    uni.showToast({ title: '导入失败', icon: 'none' })
  }
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.form-scroll {
  padding: 100rpx 30rpx 140rpx;
  height: 100vh;
}

.form-section {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.tip-text {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 30rpx;
}

.download-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15rpx;
  padding: 30rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
  color: #fff;
  font-size: 30rpx;
}

.download-icon {
  font-size: 40rpx;
}

.download-text {
  font-weight: bold;
}

.upload-area {
  border: 2rpx dashed #ddd;
  border-radius: 16rpx;
  padding: 60rpx 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15rpx;
}

.upload-icon {
  font-size: 80rpx;
  opacity: 0.5;
}

.upload-text {
  font-size: 30rpx;
  color: #666;
}

.upload-hint {
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 20rpx;
  width: 100%;
}

.file-icon {
  font-size: 50rpx;
}

.file-name {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.file-size {
  font-size: 24rpx;
  color: #999;
}

.delete-btn {
  padding: 10rpx 20rpx;
  background: #fff0f0;
  color: #ff4d4f;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.result-summary {
  display: flex;
  gap: 30rpx;
  margin-bottom: 30rpx;
}

.result-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
}

.result-item.success {
  background: #e8f5e9;
}

.result-item.failed {
  background: #fff0f0;
}

.result-count {
  font-size: 48rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
}

.result-item.success .result-count {
  color: #07c160;
}

.result-item.failed .result-count {
  color: #ff4d4f;
}

.result-label {
  font-size: 26rpx;
  color: #666;
}

.error-list {
  background: #fff5f5;
  border-radius: 12rpx;
  padding: 20rpx;
}

.error-item {
  padding: 15rpx 0;
  border-bottom: 1rpx solid #ffdede;
}

.error-item:last-child {
  border-bottom: none;
}

.error-line {
  font-size: 26rpx;
  color: #ff4d4f;
  font-weight: bold;
}

.error-msg {
  font-size: 26rpx;
  color: #666;
  margin-left: 10rpx;
}

.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  background: #fff;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.btn-save {
  width: 100%;
  height: 90rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 45rpx;
  font-size: 32rpx;
  font-weight: bold;
}

.btn-save[disabled] {
  opacity: 0.5;
}
</style>
