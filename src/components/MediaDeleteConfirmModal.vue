<template>
  <view v-if="visible" class="modal-mask" @click="handleClose">
    <view class="modal-content" @click.stop>
      <!-- Loading 状态 -->
      <view v-if="loading" class="loading-section">
        <text>正在检查引用...</text>
      </view>

      <!-- 错误状态 -->
      <view v-else-if="error" class="error-section">
        <view class="error-title">⚠️ 预检失败</view>
        <text class="error-msg">{{ error }}</text>
        <view class="modal-actions">
          <button class="modal-btn cancel-btn" @click="handleClose">关闭</button>
          <button class="modal-btn confirm-btn" @click="loadReferences">重试</button>
        </view>
      </view>

      <!-- 形态 A: 无引用简单确认 -->
      <view v-else-if="form === 'A'" class="form-a">
        <view class="modal-title">确认删除</view>
        <view class="file-info">
          <text class="file-name">{{ file?.name }}</text>
          <text class="file-meta">{{ formatFileSize(refData?.fileSize) }} · {{ refData?.fileMime }}</text>
        </view>
        <view class="hint">该文件无引用，可直接删除</view>
        <view class="hint-sub">删除将同时清理本地文件和云端 OSS 备份</view>
        <view class="modal-actions">
          <button class="modal-btn cancel-btn" @click="handleClose">取消</button>
          <button class="modal-btn confirm-btn danger" @click="confirmDelete">删除</button>
        </view>
      </view>

      <!-- 形态 B: 有引用警告 + 清单 -->
      <view v-else-if="form === 'B'" class="form-b">
        <view class="modal-title danger">⚠️ 危险操作</view>
        <view class="file-info">
          <text class="file-name">{{ file?.name }}</text>
        </view>
        <view class="warning-text">
          该文件被 {{ refData?.totalCount }} 处引用，删除后这些位置将显示异常：
        </view>

        <scroll-view scroll-y class="ref-list">
          <view v-for="(ref, idx) in refData?.references" :key="idx" class="ref-group">
            <view class="ref-group-title">
              <text class="ref-label">{{ ref.label }}</text>
              <text class="ref-count">({{ ref.items.length }})</text>
            </view>
            <view v-for="(item, i) in ref.items.slice(0, 5)" :key="i" class="ref-item">
              <text class="ref-bullet">•</text>
              <text class="ref-item-title">{{ item.title }}</text>
              <text v-if="ref.required" class="ref-required-tag">必填</text>
            </view>
            <view v-if="ref.items.length > 5" class="ref-more">
              等共 {{ ref.items.length }} 条
            </view>
          </view>
        </scroll-view>

        <view class="hint-sub">删除将同时清理本地文件和云端 OSS 备份</view>

        <view class="confirm-check">
          <view class="checkbox" :class="{ checked: ackChecked }" @click="ackChecked = !ackChecked">
            <text v-if="ackChecked">✓</text>
          </view>
          <text class="check-label" @click="ackChecked = !ackChecked">我已知晓后果，仍要删除</text>
        </view>

        <view class="modal-actions">
          <button class="modal-btn cancel-btn" @click="handleClose">取消</button>
          <button class="modal-btn confirm-btn danger" :disabled="!ackChecked"
            @click="confirmDelete">确认删除</button>
        </view>
      </view>

      <!-- 形态 C: 必填字段阻断 -->
      <view v-else-if="form === 'C'" class="form-c">
        <view class="modal-title block">⛔ 阻断操作</view>
        <view class="file-info">
          <text class="file-name">{{ file?.name }}</text>
        </view>
        <view class="warning-text">
          该文件被 {{ refData?.totalCount }} 处引用，其中包含必填字段：
        </view>

        <scroll-view scroll-y class="ref-list">
          <view v-for="(ref, idx) in refData?.references" :key="idx" class="ref-group">
            <view class="ref-group-title">
              <text class="ref-label">{{ ref.label }}</text>
              <text v-if="ref.required" class="ref-required-tag">必填字段</text>
            </view>
            <view v-for="(item, i) in ref.items.slice(0, 5)" :key="i" class="ref-item">
              <text class="ref-bullet">•</text>
              <text class="ref-item-title">{{ item.title }}</text>
            </view>
          </view>
        </scroll-view>

        <view class="block-hint">
          必填字段引用的文件删除后，对应记录将无法保存。建议先到该记录中替换文件。
        </view>

        <view class="hint-sub">如确认删除，将同时清理本地文件和云端 OSS 备份</view>

        <view class="confirm-check">
          <view class="checkbox" :class="{ checked: ackChecked }" @click="ackChecked = !ackChecked">
            <text v-if="ackChecked">✓</text>
          </view>
          <text class="check-label">我已知晓后果，仍要删除（不可恢复）</text>
        </view>

        <view class="modal-actions">
          <button class="modal-btn cancel-btn" @click="handleClose">我知道了</button>
          <button class="modal-btn confirm-btn danger" :disabled="!ackChecked"
            @click="confirmDelete">确认删除</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getReferences, deleteOssMedia } from '../api/media.js'
import { formatFileSize } from '../utils/format.js'

const props = defineProps({
  visible: Boolean,
  file: { type: Object, default: null },
})
const emit = defineEmits(['close', 'confirmed'])

const loading = ref(false)
const error = ref('')
const refData = ref(null)
const form = ref('')
const ackChecked = ref(false)
const deleting = ref(false)

watch(
  () => [props.visible, props.file?.id],
  ([isVisible]) => {
    if (isVisible && props.file) {
      loadReferences()
    } else {
      refData.value = null
      form.value = ''
      ackChecked.value = false
      error.value = ''
    }
  }
)

async function loadReferences() {
  loading.value = true
  error.value = ''
  refData.value = null
  form.value = ''

  try {
    const res = await getReferences(props.file.id)
    refData.value = res

    if (res.totalCount === 0) {
      form.value = 'A'
    } else if (res.hasRequiredReference) {
      form.value = 'C'
    } else {
      form.value = 'B'
    }
  } catch (e) {
    error.value = e.message || '获取引用信息失败'
  } finally {
    loading.value = false
  }
}

async function confirmDelete() {
  if (deleting.value) return
  deleting.value = true

  try {
    await deleteOssMedia(props.file.id)
    emit('confirmed', props.file.id)
  } catch (e) {
    uni.showToast({ title: e.message || '删除失败', icon: 'none' })
  } finally {
    deleting.value = false
  }
}

function handleClose() {
  emit('close')
}
</script>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  width: 600rpx;
  max-height: 80vh;
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
}
.loading-section, .error-section {
  padding: 40rpx 0;
  text-align: center;
}
.error-title {
  font-size: 32rpx;
  color: #ff4d4f;
  margin-bottom: 16rpx;
}
.error-msg {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 24rpx;
}
.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 24rpx;
  color: #333;
}
.modal-title.danger, .modal-title.block {
  color: #ff4d4f;
}
.file-info {
  background: #f5f5f5;
  padding: 16rpx 24rpx;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}
.file-name {
  font-size: 28rpx;
  font-weight: 500;
  display: block;
  margin-bottom: 8rpx;
  word-break: break-all;
}
.file-meta {
  font-size: 24rpx;
  color: #999;
}
.hint {
  font-size: 26rpx;
  color: #52c41a;
  margin-bottom: 8rpx;
}
.hint-sub {
  font-size: 22rpx;
  color: #999;
  margin: 8rpx 0 16rpx;
}
.warning-text {
  font-size: 26rpx;
  color: #333;
  margin-bottom: 16rpx;
  line-height: 1.5;
}
.ref-list {
  max-height: 400rpx;
  margin: 16rpx 0;
}
.ref-group {
  margin-bottom: 16rpx;
}
.ref-group-title {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}
.ref-label {
  font-size: 26rpx;
  font-weight: 500;
  color: #333;
}
.ref-count {
  font-size: 24rpx;
  color: #999;
}
.ref-required-tag {
  font-size: 20rpx;
  background: #ff4d4f;
  color: #fff;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
}
.ref-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 4rpx 0 4rpx 24rpx;
}
.ref-bullet {
  color: #999;
}
.ref-item-title {
  font-size: 24rpx;
  color: #666;
  flex: 1;
}
.ref-more {
  font-size: 22rpx;
  color: #999;
  padding-left: 24rpx;
}
.block-hint {
  background: #fff7e6;
  border: 2rpx solid #ffd591;
  padding: 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #d46b08;
  margin: 16rpx 0;
  line-height: 1.5;
}
.confirm-check {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 24rpx 0;
}
.checkbox {
  width: 32rpx;
  height: 32rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 4rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #fff;
}
.checkbox.checked {
  background: #ff4d4f;
  border-color: #ff4d4f;
}
.check-label {
  font-size: 26rpx;
  color: #666;
}
.modal-actions {
  display: flex;
  gap: 16rpx;
  justify-content: flex-end;
  margin-top: 16rpx;
}
.modal-btn {
  font-size: 26rpx;
  padding: 12rpx 32rpx;
  border-radius: 8rpx;
  border: none;
  min-width: 140rpx;
}
.cancel-btn {
  background: #f5f5f5;
  color: #666;
}
.confirm-btn {
  background: #1890ff;
  color: #fff;
}
.confirm-btn.danger {
  background: #ff4d4f;
}
.confirm-btn.danger[disabled] {
  opacity: 0.4;
}
</style>
