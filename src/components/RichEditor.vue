<template>
  <view class="rich-editor">
    <view class="toolbar" @mousedown.prevent>
      <view class="tool-group">
        <view class="tool-btn" @click="format('bold')" title="加粗"><text class="btn-bold">B</text></view>
        <view class="tool-btn" @click="format('italic')" title="斜体"><text class="btn-italic">I</text></view>
        <view class="tool-btn" @click="format('underline')" title="下划线"><text class="btn-underline">U</text></view>
        <view class="tool-btn" @click="format('strike')" title="删除线"><text class="btn-strike">S</text></view>
      </view>
      <view class="tool-divider"></view>
      <view class="tool-group">
        <view class="tool-btn" @click="format('header', 2)" title="标题2"><text>H2</text></view>
        <view class="tool-btn" @click="format('header', 3)" title="标题3"><text>H3</text></view>
        <view class="tool-btn" @click="removeFormat" title="正文"><text>P</text></view>
      </view>
      <view class="tool-divider"></view>
      <view class="tool-group">
        <view class="tool-btn" @click="format('list', 'bullet')" title="无序列表"><text>UL</text></view>
        <view class="tool-btn" @click="format('list', 'ordered')" title="有序列表"><text>OL</text></view>
      </view>
      <view class="tool-divider"></view>
      <view class="tool-group">
        <view class="tool-btn" @click="format('align', 'left')" title="左对齐"><text>⬅</text></view>
        <view class="tool-btn" @click="format('align', 'center')" title="居中"><text>⬌</text></view>
        <view class="tool-btn" @click="format('align', 'right')" title="右对齐"><text>➡</text></view>
      </view>
      <view class="tool-divider"></view>
      <view class="tool-group">
        <view class="tool-btn size-btn" @click="openFontSizePicker" title="字体大小"><text>Aa</text></view>
        <view class="tool-btn color-btn" @click="openColorPicker" title="字体颜色">
          <view class="color-indicator" :style="{ background: currentColor }"></view>
        </view>
      </view>
      <view class="tool-divider"></view>
      <view class="tool-group">
        <view class="tool-btn" @click="openLinkDialog" title="插入链接"><text>🔗</text></view>
        <view class="tool-btn" @click="openMediaPicker" title="插入图片"><text>🖼</text></view>
      </view>
    </view>

    <!-- uni-app editor 组件 -->
    <editor
      :id="editorId"
      class="editor-area"
      :style="{ height: editorHeight }"
      :placeholder="placeholder"
      :read-only="false"
      @statuschange="onStatusChange"
      @ready="onEditorReady"
      @input="onEditorInput"
    />

    <!-- 插入链接弹窗 -->
    <view class="mini-modal-mask" v-if="showLinkModal" @click="showLinkModal = false">
      <view class="mini-modal" @click.stop>
        <text class="mini-modal-title">插入链接</text>
        <input v-model="linkUrl" placeholder="请输入链接地址" class="mini-input" />
        <input v-model="linkText" placeholder="链接文字（可选）" class="mini-input" />
        <view class="mini-modal-actions">
          <view class="mini-btn cancel" @click="showLinkModal = false">取消</view>
          <view class="mini-btn confirm" @click="insertLink">确定</view>
        </view>
      </view>
    </view>

    <!-- 颜色选择弹窗 -->
    <view class="mini-modal-mask" v-if="showColorPicker" @click="showColorPicker = false">
      <view class="mini-modal" @click.stop @mousedown.prevent>
        <text class="mini-modal-title">字体颜色</text>
        <view class="color-grid">
          <view
            v-for="color in colorPalette"
            :key="color"
            class="color-item"
            :class="{ active: currentColor === color }"
            :style="{ background: color }"
            @click="selectColor(color)"
          ></view>
        </view>
        <view class="mini-modal-actions">
          <view class="mini-btn cancel" @click="showColorPicker = false">取消</view>
          <view class="mini-btn confirm" @click="showColorPicker = false">确定</view>
        </view>
      </view>
    </view>

    <!-- 字体大小选择弹窗 -->
    <view class="mini-modal-mask" v-if="showFontSizePicker" @click="showFontSizePicker = false">
      <view class="mini-modal" @click.stop @mousedown.prevent>
        <text class="mini-modal-title">字体大小</text>
        <view class="fontsize-grid">
          <view
            v-for="(label, idx) in fontSizeLabels"
            :key="idx"
            class="fontsize-item"
            :class="{ active: currentFontSize === fontSizeValues[idx] }"
            @click="selectFontSize(fontSizeValues[idx], idx)"
          >
            <text>{{ label }}</text>
          </view>
        </view>
        <view class="mini-modal-actions">
          <view class="mini-btn cancel" @click="showFontSizePicker = false">取消</view>
        </view>
      </view>
    </view>

    <!-- 媒体库选择器 -->
    <MediaPicker
      :visible="showMediaPickerFlag"
      folder="/images"
      accept="image/*"
      :multiple="false"
      @select="onMediaSelected"
      @update:visible="showMediaPickerFlag = $event"
    />
  </view>
</template>

<script setup>
import { ref, watch, getCurrentInstance, nextTick } from 'vue'
import MediaPicker from './MediaPicker.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  height: { type: String, default: '400rpx' },
  placeholder: { type: String, default: '请输入内容' },
})

const emit = defineEmits(['update:modelValue'])

const instance = getCurrentInstance()
const editorId = `editor_${Math.random().toString(36).slice(2, 8)}`
const editorCtx = ref(null)
const editorHeight = props.height
const isReady = ref(false)

// 字体大小 — 使用 Quill 原生 size 格式（行内格式）
const fontSizeLabels = ['小', '标准', '大', '特大']
const fontSizeValues = ['small', false, 'large', 'huge']
const showFontSizePicker = ref(false)
const currentFontSize = ref(false)

// 字体颜色
const showColorPicker = ref(false)
const currentColor = ref('#333333')
const colorPalette = [
  '#333333', '#666666', '#999999', '#cccccc',
  '#ff4d4f', '#ff7a45', '#faad14', '#52c41a',
  '#13c2c2', '#1890ff', '#667eea', '#722ed1',
  '#eb2f96', '#f5222d', '#fa541c', '#a0d911',
]

// 链接弹窗
const showLinkModal = ref(false)
const linkUrl = ref('')
const linkText = ref('')

// 媒体库
const showMediaPickerFlag = ref(false)

// 初始化编辑器
function onEditorReady() {
  uni.createSelectorQuery().in(instance)
    .select(`#${editorId}`)
    .context((res) => {
      editorCtx.value = res.context
      isReady.value = true
      if (props.modelValue) {
        editorCtx.value.setContents({ html: props.modelValue })
      }
    })
    .exec()
}

// 监听外部 modelValue 变化
watch(() => props.modelValue, (val) => {
  if (isReady.value && editorCtx.value && val !== undefined) {
    editorCtx.value.getContents({
      success: (res) => {
        if (res.html !== val) {
          editorCtx.value.setContents({ html: val || '' })
        }
      }
    })
  }
})

// 格式化（确保编辑器有焦点）
function format(name, value) {
  if (!editorCtx.value) return
  editorCtx.value.format(name, value)
}

// 移除格式（P 按钮用）
function removeFormat() {
  if (!editorCtx.value) return
  editorCtx.value.removeFormat()
}

// 打开字体大小选择器前保存选区
function openFontSizePicker() {
  showFontSizePicker.value = true
}

// 打开颜色选择器前保存选区
function openColorPicker() {
  showColorPicker.value = true
}

// 字体大小选择
function selectFontSize(value) {
  currentFontSize.value = value
  showFontSizePicker.value = false
  setTimeout(() => {
    if (!editorCtx.value) return
    if (value === false) {
      editorCtx.value.removeFormat()
    } else {
      editorCtx.value.format('size', value)
    }
  }, 100)
}

// 颜色选择
function selectColor(color) {
  currentColor.value = color
  showColorPicker.value = false
  setTimeout(() => {
    if (!editorCtx.value) return
    editorCtx.value.format('color', color)
  }, 100)
}

// 编辑器状态变化
function onStatusChange(e) {}

// 编辑器输入
function onEditorInput(e) {
  const html = e.detail?.html || e.detail?.text || ''
  emit('update:modelValue', html)
}

// 插入链接
function openLinkDialog() {
  linkUrl.value = ''
  linkText.value = ''
  showLinkModal.value = true
}

function insertLink() {
  if (!linkUrl.value || !editorCtx.value) return
  const text = linkText.value || linkUrl.value
  editorCtx.value.insertText({ text: text })
  showLinkModal.value = false
}

// 媒体选择
function openMediaPicker() {
  showMediaPickerFlag.value = true
}

function onMediaSelected(file) {
  if (!editorCtx.value) return
  editorCtx.value.insertImage({
    src: file.url,
    width: '100%',
    success: () => {
      editorCtx.value.getContents({
        success: (res) => {
          emit('update:modelValue', res.html)
        }
      })
    }
  })
  showMediaPickerFlag.value = false
}
</script>

<style scoped>
.rich-editor {
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  overflow: hidden;
  background: #fff;
}

.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding: 10rpx 12rpx;
  background: #fafafa;
  border-bottom: 2rpx solid #e0e0e0;
  gap: 4rpx;
}

.tool-group {
  display: flex;
  gap: 4rpx;
}

.tool-btn {
  min-width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6rpx;
  font-size: 24rpx;
  color: #333;
  cursor: pointer;
  background: #fff;
  border: 1rpx solid #ddd;
  padding: 0 8rpx;
}

.tool-btn:active {
  background: #667eea;
  color: #fff;
  border-color: #667eea;
}

.btn-bold { font-weight: bold; }
.btn-italic { font-style: italic; }
.btn-underline { text-decoration: underline; }
.btn-strike { text-decoration: line-through; }

.tool-divider {
  width: 1rpx;
  height: 40rpx;
  background: #ddd;
  margin: 0 6rpx;
}

.editor-area {
  width: 100%;
  padding: 20rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  line-height: 1.6;
}
/* Quill size 格式样式 */
:deep(.ql-size-small) { font-size: 0.75em; }
:deep(.ql-size-large) { font-size: 1.5em; }
:deep(.ql-size-huge) { font-size: 2.5em; }

.size-btn {
  font-size: 22rpx;
  min-width: 64rpx;
}

.color-btn {
  position: relative;
  min-width: 48rpx;
}

.color-indicator {
  width: 32rpx;
  height: 32rpx;
  border-radius: 4rpx;
  border: 2rpx solid #ddd;
}

.color-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.color-item {
  width: 56rpx;
  height: 56rpx;
  border-radius: 8rpx;
  border: 3rpx solid transparent;
}

.color-item.active {
  border-color: #667eea;
  box-shadow: 0 0 0 2rpx #667eea;
}

.fontsize-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.fontsize-item {
  min-width: 80rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  border: 2rpx solid #ddd;
  background: #fff;
  padding: 0 16rpx;
}

.fontsize-item.active {
  border-color: #667eea;
  background: #f0f4ff;
  color: #667eea;
}

/* 小弹窗 */
.mini-modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-modal {
  width: 80%;
  max-width: 500px;
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}

.mini-modal-title {
  font-size: 30rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  display: block;
}

.mini-input {
  width: 100%;
  height: 72rpx;
  border: 2rpx solid #ddd;
  border-radius: 8rpx;
  padding: 0 16rpx;
  font-size: 28rpx;
  margin-bottom: 16rpx;
  box-sizing: border-box;
}

.mini-modal-actions {
  display: flex;
  gap: 20rpx;
  justify-content: flex-end;
}

.mini-btn {
  padding: 14rpx 32rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.mini-btn.cancel {
  background: #f5f5f5;
  color: #666;
}

.mini-btn.confirm {
  background: #667eea;
  color: #fff;
}
</style>
