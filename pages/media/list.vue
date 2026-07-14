<template>
  <view class="page-container">
    <PageHeader title="媒体资源">
      <view class="header-right">
        <text class="action-text" @click="showNewFolderModal" v-if="hasPermission('menu.media')">新建文件夹</text>
        <button class="upload-btn" @click="chooseFile" v-if="hasPermission('menu.media')">上传</button>
      </view>
    </PageHeader>

    <!-- 文件夹导航 -->
    <view class="folder-nav">
      <text
        v-for="(seg, idx) in pathSegments"
        :key="idx"
        class="folder-seg"
        @click="navigateTo(idx)"
      >{{ seg === '/' ? '根目录' : seg }}<text v-if="idx < pathSegments.length - 1" class="folder-sep"> / </text></text>
    </view>

    <view class="search-bar">
      <input
        v-model="searchKeyword"
        class="search-input"
        placeholder="搜索文件名"
        @confirm="handleSearch"
      />
      <button class="search-btn" @click="handleSearch">搜索</button>
    </view>

    <view class="type-filter">
      <text
        v-for="type in types"
        :key="type.value"
        class="type-item"
        :class="{ active: currentType === type.value }"
        @click="filterByType(type.value)"
      >{{ type.label }}</text>
    </view>

    <view class="list">
      <!-- 文件夹 -->
      <view
        v-for="folder in folders"
        :key="'f-' + folder"
        class="list-item folder-item"
        @click="enterFolder(folder)"
      >
        <view class="item-icon folder-icon">📁</view>
        <view class="item-info">
          <view class="item-name">{{ folder }}</view>
        </view>
      </view>
      <!-- 文件 -->
      <view
        v-for="item in list"
        :key="item.id"
        class="list-item"
      >
        <view class="item-main" @click="previewFile(item)">
          <view class="item-icon">{{ getFileIcon(item) }}</view>
          <view class="item-info">
            <view class="item-name">{{ item.originalName || item.filename }}</view>
            <view class="item-meta">
              <text class="meta-tag">{{ formatFileSize(item.size) }}</text>
              <text class="meta-tag">{{ item.mime || item.mimeType }}</text>
              <text class="meta-tag" v-if="item.createdAt">{{ formatDate(item.createdAt) }}</text>
            </view>
          </view>
        </view>
        <view class="item-actions">
          <text class="action-link" @click="previewFile(item)">预览</text>
          <text class="action-link delete-link" @click="deleteItem(item.id)" v-if="hasPermission('menu.media')">删除</text>
        </view>
      </view>
    </view>

    <view class="pagination">
      <button
        class="page-btn"
        :disabled="pagination.page <= 1"
        @click="changePage(pagination.page - 1)"
      >上一页</button>
      <text class="page-info">{{ pagination.page }} / {{ pagination.pageCount || 1 }}</text>
      <button
        class="page-btn"
        :disabled="pagination.page >= pagination.pageCount"
        @click="changePage(pagination.page + 1)"
      >下一页</button>
    </view>

    <!-- 新建文件夹弹窗 -->
    <view class="modal-mask" v-if="newFolderVisible" @click="newFolderVisible = false">
      <view class="modal-content" @click.stop>
        <view class="modal-title">新建文件夹</view>
        <input
          v-model="newFolderName"
          class="modal-input"
          placeholder="请输入文件夹名称"
          :focus="newFolderVisible"
        />
        <view class="modal-actions">
          <button class="modal-btn cancel-btn" @click="newFolderVisible = false">取消</button>
          <button class="modal-btn confirm-btn" @click="createFolder">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getOssMediaList, uploadToOss, getOssFolders, createOssFolder, deleteOssMedia, getOssSyncStatus } from '../../src/api/media.js'
import { DEFAULT_PAGE_SIZE } from '../../src/config/constant.js'
import { formatFileSize } from '../../src/utils/format.js'
import { useUserStore } from '../../src/store/user.js'

const list = ref([])
const userStore = useUserStore()
const hasPermission = userStore.hasPermission
const folders = ref([])
const searchKeyword = ref('')
const pagination = ref({ page: 1, pageSize: DEFAULT_PAGE_SIZE, pageCount: 0, total: 0 })
const currentType = ref('all')
const currentPath = ref('/')
const newFolderVisible = ref(false)
const newFolderName = ref('')

const types = [
  { label: '全部', value: 'all' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '音频', value: 'audio' },
]

const pathSegments = computed(() => {
  if (currentPath.value === '/') return ['/']
  const parts = currentPath.value.split('/').filter(Boolean)
  return ['/', ...parts]
})

function buildPath(upToIndex) {
  if (upToIndex === 0) return '/'
  return '/' + pathSegments.value.slice(1, upToIndex + 1).join('/') 
}

function navigateTo(idx) {
  currentPath.value = buildPath(idx)
  pagination.value.page = 1
  loadData()
}

async function loadFolders() {
  try {
    const res = await getOssFolders({ path: currentPath.value })
    folders.value = Array.isArray(res) ? res : (res.folders || res.list || [])
  } catch (e) {
    folders.value = []
  }
}

async function loadData() {
  try {
    const params = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      path: currentPath.value
    }
    if (currentType.value !== 'all') {
      params.mimeType = currentType.value
    }
    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }
    const res = await getOssMediaList(params)
    list.value = res.list
    pagination.value = res.pagination
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function handleSearch() {
  pagination.value.page = 1
  loadData()
}

function changePage(page) {
  pagination.value.page = page
  loadData()
}

function filterByType(type) {
  currentType.value = type
  pagination.value.page = 1
  loadData()
}

function enterFolder(name) {
  currentPath.value = currentPath.value === '/'
    ? '/' + name
    : currentPath.value + '/' + name
  pagination.value.page = 1
  loadData()
  loadFolders()
}

function chooseFile() {
  uni.chooseImage({
    count: 9,
    sizeType: ['original', 'compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      for (const tempFilePath of res.tempFilePaths) {
        await uploadFile(tempFilePath)
      }
    }
  })
}

async function uploadFile(filePath) {
  try {
    uni.showLoading({ title: '上传中...' })
    await uploadToOss(filePath, currentPath.value)
    uni.showToast({ title: '上传成功', icon: 'success' })
    loadData()
    loadFolders()
  } catch (error) {
    uni.showToast({ title: '上传失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

function previewFile(item) {
  const url = item.url || item.src || item.path
  if (!url) {
    uni.showToast({ title: '无预览地址', icon: 'none' })
    return
  }
  const mime = (item.mime || item.mimeType || '').toLowerCase()
  if (mime.startsWith('image')) {
    uni.previewImage({ urls: [url], current: url })
  } else {
    uni.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(url)}` })
  }
}

async function deleteItem(id) {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个文件吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteOssMedia(id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData()
        } catch (error) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

function showNewFolderModal() {
  newFolderName.value = ''
  newFolderVisible.value = true
}

async function createFolder() {
  const name = newFolderName.value.trim()
  if (!name) {
    uni.showToast({ title: '请输入文件夹名称', icon: 'none' })
    return
  }
  try {
    await createOssFolder(name, currentPath.value)
    uni.showToast({ title: '创建成功', icon: 'success' })
    newFolderVisible.value = false
    loadFolders()
  } catch (error) {
    uni.showToast({ title: '创建失败', icon: 'none' })
  }
}

function getFileIcon(item) {
  const mime = (item.mime || item.mimeType || '').toLowerCase()
  if (mime.startsWith('image')) return '🖼️'
  if (mime.startsWith('video')) return '🎬'
  if (mime.startsWith('audio')) return '🎵'
  if (mime.includes('pdf')) return '📄'
  if (mime.includes('zip') || mime.includes('rar')) return '📦'
  return '📎'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

onMounted(() => {
  loadData()
  loadFolders()
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  padding: 20rpx;
  box-sizing: border-box;
  background: #f5f5f5;
}

.action-text {
  font-size: 28rpx;
  color: #1989fa;
}

.upload-btn {
  height: 60rpx;
  line-height: 60rpx;
  padding: 0 24rpx;
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  font-size: 28rpx;
}

/* 文件夹导航 */
.folder-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 16rpx 20rpx;
  margin-bottom: 16rpx;
  background: #fff;
  border-radius: 12rpx;
}

.folder-seg {
  font-size: 26rpx;
  color: #1989fa;
}

.folder-sep {
  color: #999;
  margin: 0 4rpx;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  background: #fff;
  font-size: 28rpx;
}

.search-btn {
  width: 140rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: #667eea;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  font-size: 28rpx;
}

/* 类型筛选 */
.type-filter {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
  overflow-x: auto;
}

.type-item {
  padding: 12rpx 28rpx;
  background: #fff;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #666;
  white-space: nowrap;
}

.type-item.active {
  background: #667eea;
  color: #fff;
}

/* 列表 */
.list {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 2rpx solid #f5f5f5;
}

.folder-item {
  cursor: pointer;
}

.item-main {
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
}

.item-icon {
  font-size: 44rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.folder-icon {
  font-size: 48rpx;
}

.item-info {
  flex: 1;
  overflow: hidden;
}

.item-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 8rpx;
}

.item-meta {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.meta-tag {
  font-size: 22rpx;
  color: #999;
  padding: 4rpx 12rpx;
  background: #f5f5f5;
  border-radius: 6rpx;
}

.item-actions {
  display: flex;
  gap: 20rpx;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.action-link {
  font-size: 26rpx;
  color: #1989fa;
}

.delete-link {
  color: #ff4d4f;
}

/* 分页 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  margin-top: 24rpx;
  padding: 20rpx;
}

.page-btn {
  padding: 12rpx 28rpx;
  background: #fff;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.page-btn[disabled] {
  opacity: 0.5;
}

.page-info {
  font-size: 28rpx;
  color: #666;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-content {
  width: 600rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin-bottom: 32rpx;
}

.modal-input {
  height: 80rpx;
  padding: 0 24rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  font-size: 28rpx;
  margin-bottom: 32rpx;
}

.modal-actions {
  display: flex;
  gap: 20rpx;
}

.modal-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;
}

.confirm-btn {
  background: #667eea;
  color: #fff;
}
</style>
