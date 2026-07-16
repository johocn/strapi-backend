<template>
  <view class="page-container">
    <PageHeader title="媒体资源">
      <view class="header-right">
        <text class="action-text" @click="showNewFolderModal" v-if="hasPermission('menu.media')">新建文件夹</text>
        <button class="upload-btn" @click="chooseFile">上传</button>
      </view>
    </PageHeader>

    <!-- 权限 banner -->
    <view class="scope-banner" :class="isAdminLike ? 'admin' : 'user'">
      <text>{{ isAdminLike ? '当前查看全部文件（管理员视图）' : '仅显示你上传的文件' }}</text>
    </view>

    <!-- 文件夹导航 -->
    <view class="folder-nav">
      <text class="folder-seg" @click="navigateTo(-1)">根目录</text>
      <template v-for="(seg, idx) in pathSegments" :key="idx">
        <text class="folder-sep"> / </text>
        <text class="folder-seg" @click="navigateTo(idx)">{{ seg }}</text>
      </template>
    </view>

    <!-- 文件夹卡片区 -->
    <view class="folder-section">
      <scroll-view scroll-x class="folder-scroll" v-if="subFolders.length > 0">
        <view v-for="folder in subFolders" :key="folder.id" class="folder-card"
          @click="enterFolder(folder)">
          <view class="folder-icon">📁</view>
          <view class="folder-name">{{ folder.name }}</view>
        </view>
      </scroll-view>
      <view class="folder-empty" v-else>
        <view>📭 暂无文件夹</view>
        <view class="folder-empty-hint">点击上方"新建文件夹"创建</view>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <input v-model="searchKeyword" class="search-input" placeholder="搜索文件名"
        @confirm="handleSearch" />
      <button class="search-btn" @click="handleSearch">搜索</button>
    </view>

    <!-- MIME tab + 视图切换 -->
    <view class="filter-bar">
      <scroll-view scroll-x class="type-filter">
        <text v-for="t in types" :key="t.value" class="type-item"
          :class="{ active: currentType === t.value }"
          @click="filterByType(t.value)">{{ t.label }}</text>
      </scroll-view>
      <view class="view-switcher">
        <text class="view-btn" :class="{ active: viewMode === 'grid' }" @click="setViewMode('grid')">▦</text>
        <text class="view-btn" :class="{ active: viewMode === 'list' }" @click="setViewMode('list')">≣</text>
      </view>
    </view>

    <!-- 列表 -->
    <view class="list">
      <!-- 网格视图：所有文件统一卡片 -->
      <view class="grid" v-if="viewMode === 'grid' && list.length > 0">
        <view v-for="item in list" :key="item.id" class="grid-card"
          @click="previewFile(item)">
          <image v-if="isImage(item.mime)" :src="getFileUrl(item)" mode="aspectFill"
            class="thumb" lazy-load @error="onThumbError(item)" />
          <view v-else-if="isVideo(item.mime)" class="video-thumb">
            <video :src="getFileUrl(item)" class="thumb" :controls="false"
              :show-center-play-btn="false" />
            <view class="play-overlay">▶</view>
          </view>
          <view v-else class="thumb grid-icon-thumb">
            <text class="grid-icon">{{ getFileIcon(item) }}</text>
          </view>
          <view class="grid-info">
            <text class="grid-name">{{ item.name }}</text>
            <text class="grid-meta">{{ formatFileSize(item.size) }}</text>
          </view>
          <text class="delete-btn" @click.stop="handleDelete(item)">删除</text>
        </view>
      </view>

      <!-- 列表视图：所有文件统一行 -->
      <view class="list-section" v-else-if="viewMode === 'list' && list.length > 0">
        <view v-for="item in list" :key="item.id" class="list-item">
          <view class="item-main" @click="previewFile(item)">
            <view class="item-icon">{{ getFileIcon(item) }}</view>
            <view class="item-info">
              <view class="item-name">{{ item.name }}</view>
              <view class="item-meta">
                <text class="meta-tag">{{ formatFileSize(item.size) }}</text>
                <text class="meta-tag">{{ item.mime }}</text>
                <text class="meta-tag" v-if="item.createdAt">{{ formatDate(item.createdAt) }}</text>
              </view>
            </view>
          </view>
          <view class="item-actions">
            <text class="action-link" @click="previewFile(item)">预览</text>
            <text class="action-link delete-link" @click="handleDelete(item)">删除</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty" v-if="list.length === 0">
        <text>暂无文件</text>
      </view>
    </view>

    <!-- 分页 -->
    <view class="pagination">
      <button :disabled="pagination.page <= 1" @click="changePage(pagination.page - 1)">上一页</button>
      <text>{{ pagination.page }} / {{ pagination.pageCount || 1 }}</text>
      <button :disabled="pagination.page >= pagination.pageCount"
        @click="changePage(pagination.page + 1)">下一页</button>
    </view>

    <!-- 删除确认弹窗 -->
    <MediaDeleteConfirmModal
      :visible="deleteModalVisible"
      :file="deleteTarget"
      @close="deleteModalVisible = false"
      @confirmed="onDeleted"
    />

    <!-- 新建文件夹弹窗 -->
    <view class="modal-mask" v-if="newFolderVisible" @click="newFolderVisible = false">
      <view class="modal-content" @click.stop>
        <view class="modal-title">新建文件夹</view>
        <input v-model="newFolderName" class="folder-input" placeholder="文件夹名称" />
        <view class="modal-actions">
          <button class="modal-btn cancel-btn" @click="newFolderVisible = false">取消</button>
          <button class="modal-btn confirm-btn" @click="createFolder">创建</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getOssMediaList, uploadToOss, getOssFolders, createOssFolder } from '../../src/api/media.js'
import { DEFAULT_PAGE_SIZE } from '../../src/config/constant.js'
import { formatFileSize, getMediaUrl, formatDate } from '../../src/utils/format.js'
import { useUserStore } from '../../src/store/user.js'
import MediaDeleteConfirmModal from '../../src/components/MediaDeleteConfirmModal.vue'

// ===== 状态 =====
const list = ref([])
const searchKeyword = ref('')
const pagination = ref({ page: 1, pageSize: DEFAULT_PAGE_SIZE, pageCount: 0, total: 0 })
const currentType = ref('all')
const currentPath = ref('')
const viewMode = ref('grid')  // 'grid' | 'list'
const folderTree = ref([])
const currentFolderId = ref(null)
const newFolderVisible = ref(false)
const newFolderName = ref('')

// 计算当前层级的子文件夹
const subFolders = computed(() => {
  if (!folderTree.value.length) return []
  const findNode = (nodes, id) => {
    if (id === null) return { children: nodes }
    for (const n of nodes) {
      if (n.id === id) return n
      const found = findNode(n.children || [], id)
      if (found) return found
    }
    return null
  }
  const node = findNode(folderTree.value, currentFolderId.value)
  return node?.children || []
})

// 删除弹窗状态
const deleteModalVisible = ref(false)
const deleteTarget = ref(null)

// ===== 权限 =====
const userStore = useUserStore()
const hasPermission = userStore.hasPermission
const isAdminLike = computed(() => {
  const roles = userStore.roles || []
  return roles.some(r => ['admin', 'channel-admin'].includes(r))
})

// ===== MIME 类型 =====
const types = [
  { label: '全部', value: 'all' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '音频', value: 'audio' },
  { label: '文档', value: 'document' },
  { label: '其他', value: 'other' },
]

// ===== 路径分段 =====
const pathSegments = computed(() => {
  return currentPath.value.split('/').filter(Boolean)
})

// ===== 计算属性：网格/列表分组 =====
const gridItems = computed(() =>
  list.value.filter(f => isImage(f.mime) || isVideo(f.mime))
)
const listItems = computed(() =>
  list.value.filter(f => !isImage(f.mime) && !isVideo(f.mime))
)

// ===== path 与 id 一致性辅助函数 =====
function buildPathFromTree(folderId) {
  if (folderId === null) return '/'
  const path = []
  const find = (nodes, id, ancestors = []) => {
    for (const n of nodes) {
      const newAncestors = [...ancestors, n.name]
      if (n.id === id) {
        path.push(...newAncestors)
        return true
      }
      if (n.children?.length && find(n.children, id, newAncestors)) return true
    }
    return false
  }
  find(folderTree.value, folderId)
  return '/' + path.join('/')
}

function findFolderIdByPath(targetPath) {
  if (targetPath === '/' || !targetPath) return null
  const segs = targetPath.split('/').filter(Boolean)
  let currentNodes = folderTree.value
  let currentId = null
  for (const seg of segs) {
    const found = currentNodes.find(n => n.name === seg)
    if (!found) return null
    currentId = found.id
    currentNodes = found.children || []
  }
  return currentId
}

// ===== MIME 判断工具 =====
function isImage(mime) { return (mime || '').toLowerCase().startsWith('image/') }
function isVideo(mime) { return (mime || '').toLowerCase().startsWith('video/') }

// ===== 文件 URL 解析 =====
function getFileUrl(item) {
  return getMediaUrl(item, false)
}

// ===== 文件图标 =====
function getFileIcon(item) {
  const mime = (item.mime || '').toLowerCase()
  if (mime.startsWith('audio/')) return '🎵'
  if (mime.includes('pdf')) return '📄'
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('compressed')) return '📦'
  return '📎'
}

// ===== 加载数据 =====
async function loadData() {
  try {
    const params = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    }
    if (currentPath.value) {
      params.folderPath = currentPath.value
    }
    if (currentType.value !== 'all') {
      const mimeMap = { image: 'image', video: 'video', audio: 'audio', document: 'application' }
      if (mimeMap[currentType.value]) params.mime = mimeMap[currentType.value]
    }
    if (searchKeyword.value) params.search = searchKeyword.value
    const res = await getOssMediaList(params)
    list.value = res.list || []
    pagination.value = { ...pagination.value, ...res.pagination }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

// ===== 文件夹加载与进入 =====
async function loadFolders() {
  try {
    const res = await getOssFolders()
    folderTree.value = res?.folders || []
  } catch (e) {
    uni.showToast({ title: '文件夹加载失败', icon: 'none' })
  }
}

function enterFolder(folder) {
  currentFolderId.value = folder.id
  currentPath.value = buildPathFromTree(folder.id)
  currentType.value = 'all'
  pagination.value.page = 1
  loadData()
}

// ===== 筛选与导航 =====
function filterByType(type) {
  currentType.value = type
  pagination.value.page = 1
  loadData()
}

function setViewMode(mode) {
  viewMode.value = mode
}

function handleSearch() {
  pagination.value.page = 1
  loadData()
}

function navigateTo(idx) {
  if (idx < 0) {
    // 点击"根目录"标签
    currentPath.value = ''
    currentFolderId.value = null
  } else {
    const segs = pathSegments.value.slice(0, idx + 1)
    currentPath.value = '/' + segs.join('/')
    currentFolderId.value = findFolderIdByPath(currentPath.value)
  }
  currentType.value = 'all'
  pagination.value.page = 1
  loadData()
}

function changePage(page) {
  pagination.value.page = page
  loadData()
}

// ===== 上传 =====
function chooseFile() {
  uni.chooseImage({
    count: 9,
    success: async (res) => {
      for (const path of res.tempFilePaths) {
        try {
          await uploadToOss(path, currentPath.value)
        } catch (e) {
          uni.showToast({ title: '上传失败', icon: 'none' })
        }
      }
      loadData()
      uni.showToast({ title: '上传成功', icon: 'success' })
    }
  })
}

// ===== 预览 =====
function previewFile(item) {
  if (isImage(item.mime)) {
    uni.previewImage({
      urls: [getFileUrl(item)],
      current: getFileUrl(item)
    })
  } else if (isVideo(item.mime)) {
    uni.navigateTo({
      url: `/pages/media/preview?url=${encodeURIComponent(getFileUrl(item))}`
    })
  } else {
    uni.showToast({ title: '无法预览此文件', icon: 'none' })
  }
}

// ===== 缩略图加载失败 =====
function onThumbError(item) {
  item._thumbError = true
}

// ===== 删除流程 =====
function handleDelete(item) {
  deleteTarget.value = item
  deleteModalVisible.value = true
}

function onDeleted() {
  deleteModalVisible.value = false
  deleteTarget.value = null
  uni.showToast({ title: '删除成功', icon: 'success' })
  loadData()
}

// ===== 新建文件夹 =====
function showNewFolderModal() {
  newFolderName.value = ''
  newFolderVisible.value = true
}

async function createFolder() {
  if (!newFolderName.value) {
    uni.showToast({ title: '请输入文件夹名称', icon: 'none' })
    return
  }
  try {
    await createOssFolder(newFolderName.value, currentFolderId.value)
    newFolderVisible.value = false
    uni.showToast({ title: '创建成功', icon: 'success' })
    await loadFolders()
  } catch (e) {
    uni.showToast({ title: '创建失败', icon: 'none' })
  }
}

// ===== 初始化 =====
onMounted(() => {
  loadFolders()
  loadData()
})
</script>

<style scoped>
.page-container {
  padding: 20rpx;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.action-text {
  font-size: 26rpx;
  color: #1890ff;
}
.upload-btn {
  font-size: 26rpx;
  background: #1890ff;
  color: #fff;
  padding: 8rpx 24rpx;
  border-radius: 8rpx;
  border: none;
}
.scope-banner {
  padding: 12rpx 24rpx;
  margin-bottom: 16rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
  text-align: center;
}
.scope-banner.admin {
  background: #e6f7ff;
  color: #1890ff;
  border: 2rpx solid #91d5ff;
}
.scope-banner.user {
  background: #f6ffed;
  color: #52c41a;
  border: 2rpx solid #b7eb8f;
}
.folder-nav {
  padding: 12rpx 0;
  margin-bottom: 16rpx;
  font-size: 26rpx;
  color: #1890ff;
}
.folder-seg {
  cursor: pointer;
}
.folder-sep {
  color: #999;
  margin: 0 4rpx;
}
.folder-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
}
.folder-scroll {
  white-space: nowrap;
}
.folder-card {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 180rpx;
  height: 200rpx;
  background: #fff;
  border: 2rpx solid #f0f0f0;
  border-radius: 16rpx;
  margin-right: 16rpx;
  vertical-align: top;
}
.folder-card:active {
  border-color: #1890ff;
  background: #e6f7ff;
}
.folder-icon {
  font-size: 80rpx;
  margin-bottom: 12rpx;
}
.folder-name {
  font-size: 24rpx;
  color: #333;
  max-width: 160rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
.folder-empty {
  padding: 40rpx;
  text-align: center;
  background: #fafafa;
  border: 2rpx dashed #d9d9d9;
  border-radius: 16rpx;
  color: #999;
  font-size: 26rpx;
}
.folder-empty-hint {
  font-size: 22rpx;
  color: #bbb;
  margin-top: 8rpx;
}
.search-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.search-input {
  flex: 1;
  height: 60rpx;
  padding: 0 24rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 8rpx;
  font-size: 26rpx;
}
.search-btn {
  background: #1890ff;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  padding: 0 32rpx;
  font-size: 26rpx;
}
.type-filter {
  display: flex;
  gap: 8rpx;
  white-space: nowrap;
  flex: 1;
}
.type-item {
  padding: 8rpx 24rpx;
  font-size: 26rpx;
  color: #666;
  background: #f5f5f5;
  border-radius: 8rpx;
  display: inline-block;
}
.type-item.active {
  background: #1890ff;
  color: #fff;
}
.filter-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.view-switcher {
  display: flex;
  gap: 4rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 4rpx;
}
.view-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #999;
  border-radius: 6rpx;
}
.view-btn.active {
  background: #1890ff;
  color: #fff;
}
.grid-icon-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}
.grid-icon {
  font-size: 72rpx;
}
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 16rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}
.grid-card {
  width: calc(25% - 12rpx);
  position: relative;
  background: #f5f5f5;
  border-radius: 12rpx;
  overflow: hidden;
}
.thumb {
  width: 100%;
  height: 150rpx;
  display: block;
}
.video-thumb {
  position: relative;
}
.play-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60rpx;
  height: 60rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 32rpx;
}
.grid-info {
  padding: 8rpx 12rpx;
}
.grid-name {
  font-size: 22rpx;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.grid-meta {
  font-size: 20rpx;
  color: #999;
  display: block;
}
.delete-btn {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  background: rgba(255, 77, 79, 0.9);
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.list-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 16rpx;
}
.list-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
}
.list-item:last-child {
  border-bottom: none;
}
.item-main {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 16rpx;
}
.item-icon {
  font-size: 48rpx;
}
.item-info {
  flex: 1;
}
.item-name {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 8rpx;
}
.item-meta {
  display: flex;
  gap: 16rpx;
}
.meta-tag {
  font-size: 22rpx;
  color: #999;
}
.item-actions {
  display: flex;
  gap: 16rpx;
}
.action-link {
  font-size: 26rpx;
  color: #1890ff;
  padding: 8rpx 16rpx;
}
.delete-link {
  color: #ff4d4f;
}
.empty {
  padding: 80rpx 0;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 24rpx 0;
  font-size: 26rpx;
}
.pagination button {
  padding: 8rpx 32rpx;
  background: #f5f5f5;
  border: none;
  border-radius: 8rpx;
  font-size: 26rpx;
}
.pagination button[disabled] {
  opacity: 0.4;
}
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
  width: 500rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
}
.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 24rpx;
}
.folder-input {
  height: 60rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 8rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  margin-bottom: 24rpx;
}
.modal-actions {
  display: flex;
  gap: 16rpx;
  justify-content: flex-end;
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
</style>
