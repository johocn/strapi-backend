<template>
  <view v-if="visible" class="media-picker-overlay" @click="handleClose">
    <view class="media-picker" @click.stop>
      <view class="picker-header">
        <text class="picker-title">媒体库</text>
        <view class="picker-actions">
          <button class="btn-upload" @click="handleUpload">上传</button>
          <text class="btn-close" @click="handleClose">×</text>
        </view>
      </view>

      <view class="picker-body">
        <view class="folder-sidebar">
          <view
            class="folder-item"
            :class="{ active: currentFolderId === null }"
            @click="selectFolder('/', null)"
          >
            <text>全部</text>
          </view>
          <view
            v-for="f in flatFolderList"
            :key="f.id"
            class="folder-item"
            :class="{ active: currentFolderId === f.id }"
            :style="{ paddingLeft: (f.depth * 24 + 12) + 'rpx' }"
            @click="handleFolderClick(f)"
          >
            <text
              v-if="f.hasChildren"
              class="folder-toggle"
            >{{ expandedSet.has(f.id) ? '▼' : '▶' }}</text>
            <text v-else class="folder-toggle-placeholder"></text>
            <text class="folder-name">{{ f.name }}</text>
          </view>
        </view>

        <view class="file-area">
          <view class="search-bar">
            <input
              v-model="searchKeyword"
              class="search-input"
              placeholder="搜索文件名"
              @confirm="doSearch"
            />
            <text v-if="searchKeyword" class="search-clear" @click="clearSearch">×</text>
          </view>

          <scroll-view scroll-y class="file-grid" @scrolltolower="loadMore">
            <view class="grid">
              <view
                v-for="item in mediaList"
                :key="item.id"
                class="file-card"
                :class="{ selected: isSelected(item) }"
                @click="handleSelect(item)"
              >
                <image
                  v-if="isImage(item.mime)"
                  :src="getFileUrl(item)"
                  mode="aspectFill"
                  class="file-thumb"
                />
                <view v-else class="file-icon">
                  <text>{{ iconForMime(item.mime) }}</text>
                </view>
                <text class="file-name">{{ item.name }}</text>
              </view>
            </view>
            <view v-if="loading" class="loading-text">
              <text>加载中...</text>
            </view>
            <view v-if="!loading && mediaList.length === 0" class="empty-text">
              <text>暂无文件</text>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { getOssMediaList, getOssFolders, uploadToOss } from '../api/media.js'
import { STRAPI_URL } from '../config/env.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  folder: { type: String, default: '' },
  folderId: { type: Number, default: null },
  accept: { type: String, default: '*' },
  multiple: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'update:visible'])

const mediaList = ref([])
const folderTree = ref([])
const currentFolder = ref('/')
const currentFolderId = ref(null)
const expandedSet = ref(new Set())
const searchKeyword = ref('')
const loading = ref(false)
const pagination = ref({ page: 1, pageSize: 20, total: 0, pageCount: 0 })

const flatFolderList = computed(() => {
  return flattenTree(folderTree.value, 0)
})

function flattenTree(nodes, depth) {
  const result = []
  for (const node of nodes) {
    const hasChildren = node.children && node.children.length > 0
    result.push({
      id: node.id,
      name: node.name,
      path: node.path,
      depth,
      hasChildren,
    })
    if (hasChildren && expandedSet.value.has(node.id)) {
      result.push(...flattenTree(node.children, depth + 1))
    }
  }
  return result
}

watch(() => props.visible, (val) => {
  if (val) {
    loadFolders().then(() => {
      applyDefaultFolder()
      loadMedia()
    })
  }
})

function applyDefaultFolder() {
  if (props.folderId) {
    const found = findInTree(folderTree.value, props.folderId)
    if (found) {
      currentFolder.value = found.path
      currentFolderId.value = found.id
      expandToFolder(found.id)
      return
    }
  }
  if (props.folder) {
    let found = findByPath(folderTree.value, props.folder)
    if (!found) found = findByHumanPath(folderTree.value, props.folder)
    if (found) {
      currentFolder.value = found.path
      currentFolderId.value = found.id
      expandToFolder(found.id)
      return
    }
  }
  currentFolder.value = '/'
  currentFolderId.value = null
}

function findInTree(tree, id) {
  for (const f of tree) {
    if (f.id === id) return f
    if (f.children?.length) {
      const found = findInTree(f.children, id)
      if (found) return found
    }
  }
  return null
}

function findByPath(tree, path) {
  for (const f of tree) {
    if (f.path === path) return f
    if (f.children?.length) {
      const found = findByPath(f.children, path)
      if (found) return found
    }
  }
  return null
}

function findByHumanPath(tree, humanPath) {
  const segments = humanPath.split('/').filter(Boolean)
  let nodes = tree
  let found = null
  for (const segment of segments) {
    found = nodes.find(f => f.name === segment)
    if (!found) return null
    nodes = found.children || []
  }
  return found
}

function expandToFolder(folderId) {
  const pathIds = getPathIds(folderTree.value, folderId)
  if (pathIds) {
    const newSet = new Set(expandedSet.value)
    for (const id of pathIds) {
      newSet.add(id)
    }
    expandedSet.value = newSet
  }
}

function getPathIds(tree, targetId, ancestors = []) {
  for (const f of tree) {
    if (f.id === targetId) return ancestors
    if (f.children?.length) {
      const result = getPathIds(f.children, targetId, [...ancestors, f.id])
      if (result) return result
    }
  }
  return null
}

function toggleExpand(id) {
  const newSet = new Set(expandedSet.value)
  if (newSet.has(id)) {
    newSet.delete(id)
  } else {
    newSet.add(id)
  }
  expandedSet.value = newSet
}

function handleFolderClick(f) {
  if (f.hasChildren) {
    toggleExpand(f.id)
  }
  selectFolder(f.path, f.id)
}

function isImage(mime) {
  return mime?.startsWith('image/')
}

function iconForMime(mime) {
  if (mime?.startsWith('video/')) return '🎬'
  if (mime?.startsWith('audio/')) return '🎵'
  return '📄'
}

function getFileUrl(item) {
  const meta = item.provider_metadata
  if (meta?.ossUrl && meta.ossStatus === 'success') return meta.ossUrl
  if (meta?.localUrl) {
    if (meta.localUrl.startsWith('http')) return meta.localUrl
    return `${STRAPI_URL}${meta.localUrl}`
  }
  if (item.url?.startsWith('http')) return item.url
  return `${STRAPI_URL}${item.url}`
}

function isSelected(item) {
  return false
}

function selectFolder(path, folderId = null) {
  currentFolder.value = path
  currentFolderId.value = folderId
  pagination.value.page = 1
  loadMedia()
}

async function loadFolders() {
  try {
    const result = await getOssFolders()
    folderTree.value = result.folders || []
  } catch (e) {
    /* ignore */
  }
}

async function loadMedia(append = false) {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    }
    if (currentFolderId.value) {
      params.folderPath = currentFolder.value
    }
    if (searchKeyword.value) {
      params.search = searchKeyword.value
    }
    const result = await getOssMediaList(params)
    if (append) {
      mediaList.value.push(...(result.list || []))
    } else {
      mediaList.value = result.list || []
    }
    pagination.value = result.pagination || {}
  } catch (e) {
    /* ignore */
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (pagination.value.page < pagination.value.pageCount) {
    pagination.value.page++
    loadMedia(true)
  }
}

function doSearch() {
  pagination.value.page = 1
  loadMedia()
}

function clearSearch() {
  searchKeyword.value = ''
  pagination.value.page = 1
  loadMedia()
}

function handleSelect(item) {
  emit('select', {
    id: item.id,
    documentId: item.documentId,
    url: getFileUrl(item),
    name: item.name,
    mime: item.mime,
    size: item.size,
  })
  handleClose()
}

function handleUpload() {
  const chooseFn = props.accept.startsWith('video') ? 'chooseVideo' : 'chooseImage'

  if (chooseFn === 'chooseVideo') {
    uni.chooseVideo({
      sourceType: ['album', 'camera'],
      success: async (res) => {
        await doUpload(res.tempFilePath)
      }
    })
  } else {
    uni.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      success: async (res) => {
        if (res.tempFilePaths?.length > 0) {
          await doUpload(res.tempFilePaths[0])
        }
      }
    })
  }
}

async function doUpload(filePath) {
  try {
    uni.showLoading({ title: '上传中...' })
    await uploadToOss(filePath, currentFolder.value, currentFolderId.value)
    uni.hideLoading()
    uni.showToast({ title: '上传成功', icon: 'success' })
    loadMedia()
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '上传失败', icon: 'none' })
  }
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<style scoped>
.media-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-picker {
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  background: #fff;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #eee;
}

.picker-title {
  font-size: 32rpx;
  font-weight: bold;
}

.picker-actions {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.btn-upload {
  background: #667eea;
  color: #fff;
  border: none;
  padding: 10rpx 24rpx;
  border-radius: 20rpx;
  font-size: 26rpx;
}

.btn-close {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
}

.picker-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.folder-sidebar {
  width: 220rpx;
  border-right: 1rpx solid #eee;
  padding: 16rpx 8rpx;
  overflow-y: auto;
}

.folder-item {
  display: flex;
  align-items: center;
  padding: 14rpx 12rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #333;
  margin-bottom: 4rpx;
}

.folder-item.active {
  background: #667eea;
  color: #fff;
}

.folder-toggle {
  font-size: 20rpx;
  margin-right: 8rpx;
  width: 28rpx;
  flex-shrink: 0;
}

.folder-toggle-placeholder {
  width: 28rpx;
  flex-shrink: 0;
  margin-right: 8rpx;
}

.folder-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.search-bar {
  position: relative;
  padding: 16rpx 20rpx;
  border-bottom: 1rpx solid #eee;
}

.search-input {
  width: 100%;
  height: 64rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  padding: 0 48rpx 0 16rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}

.search-clear {
  position: absolute;
  right: 36rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 32rpx;
  color: #999;
  padding: 0 8rpx;
}

.file-grid {
  flex: 1;
  padding: 20rpx;
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.file-card {
  width: calc(33.33% - 12rpx);
  border: 2rpx solid #eee;
  border-radius: 8rpx;
  overflow: hidden;
  cursor: pointer;
}

.file-card.selected {
  border-color: #667eea;
  box-shadow: 0 0 0 2rpx rgba(102, 126, 234, 0.3);
}

.file-thumb {
  width: 100%;
  height: 160rpx;
}

.file-icon {
  width: 100%;
  height: 160rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  font-size: 48rpx;
}

.file-name {
  display: block;
  padding: 8rpx;
  font-size: 22rpx;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-text, .empty-text {
  text-align: center;
  padding: 40rpx;
  color: #999;
  font-size: 26rpx;
}
</style>
