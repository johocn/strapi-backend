<template>
  <view class="page-container">
    <PageHeader title="素材库">
      <button class="btn-secondary" @click="syncFromWechat" :disabled="syncing || uploadType === 'thumb'" v-if="hasPermission('menu.sso-wx')">
        {{ syncing ? '同步中...' : '↻ 从微信获取' }}
      </button>
      <button class="btn-primary" @click="chooseAndUpload" :disabled="uploading" v-if="hasPermission('menu.sso-wx')">
        {{ uploading ? '上传中...' : '+ 上传素材' }}
      </button>
    </PageHeader>

    <view class="help-banner">
      <text class="help-icon">ℹ️</text>
      <text class="help-text">上传图片 / 语音 / 视频 / 缩略图素材到公众号永久素材库，供图文（thumb_media_id）与自动回复使用；「从微信获取」可一键拉取公众号后台已有的图片 / 语音 / 视频素材入库。</text>
    </view>

    <!-- 上传表单 -->
    <view class="upload-card">
      <view class="upload-row">
        <view class="form-item upload-type">
          <text class="form-label">素材类型</text>
          <picker mode="selector" :range="typeOptions" range-key="label" @change="onTypeChange" :value="typeIndex">
            <view class="form-picker">{{ typeOptions[typeIndex].label }} ▼</view>
          </picker>
        </view>
        <view class="form-item upload-name">
          <text class="form-label">素材名称</text>
          <input v-model="materialName" class="form-input" :placeholder="'请输入' + typeOptions[typeIndex].label + '名称'" />
        </view>
      </view>
      <view class="upload-preview">
        <image v-if="previewPath && (uploadType === 'image' || uploadType === 'thumb')" :src="previewPath" class="preview-img" mode="aspectFill" />
        <image v-if="previewPath && uploadType === 'video'" :src="previewPath" class="preview-img" mode="aspectFill" />
        <text v-if="previewPath && uploadType === 'voice'" class="preview-text">🎵 已选择语音文件</text>
        <text v-if="!previewPath" class="preview-placeholder">未选择文件</text>
      </view>
    </view>

    <view class="data-list">
      <view v-for="item in dataList" :key="item.documentId || item.id" class="data-card">
        <view class="material-preview">
          <image v-if="isPreviewable(item.type) && item.url" :src="item.url" class="material-img" mode="aspectFill" />
          <text v-else class="material-icon">{{ typeIcon(item.type) }}</text>
        </view>
        <view class="data-info">
          <view class="data-title">
            <text class="material-name">{{ item.name || item.filename || '未命名素材' }}</text>
            <view class="material-type" :style="{ background: typeMeta(item.type).bg, color: typeMeta(item.type).color }">{{ typeMeta(item.type).label }}</view>
          </view>
          <view class="data-meta">
            <text class="meta-item">media_id: {{ item.media_id || item.mediaId || '-' }}</text>
          </view>
          <view class="data-meta" v-if="item.url">
            <text class="meta-item link">{{ item.url }}</text>
          </view>
          <view class="data-footer">
            <text class="data-date">{{ fmtDateTime(item.updatedAt || item.updated_at) }}</text>
          </view>
        </view>
        <view class="data-actions">
          <view v-if="hasPermission('menu.sso-wx')" class="action-btn delete" @click="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && dataList.length === 0" class="empty-state">
      <text class="empty-icon">🖼️</text>
      <text class="empty-text">暂无素材，点击「+ 上传素材」上传</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ssoWxMaterialApi } from '../../api/wechat.js'
import { useUserStore } from '../../store/user.js'
import PageHeader from '../../components/PageHeader.vue'
import { getMediaUrl, toWxProxy } from '../../utils/format.js'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const typeOptions = [
  { value: 'image', label: '图片' },
  { value: 'voice', label: '语音' },
  { value: 'video', label: '视频' },
  { value: 'thumb', label: '缩略图' },
]

const dataList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const uploading = ref(false)
const typeIndex = ref(0)
const uploadType = ref('image')
const materialName = ref('')
const previewPath = ref('')

const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

function typeMeta(value) {
  const map = {
    image: { label: '图片', bg: '#e6f4ff', color: '#1677ff' },
    voice: { label: '语音', bg: '#f9f0ff', color: '#722ed1' },
    video: { label: '视频', bg: '#fff7e6', color: '#fa8c16' },
    thumb: { label: '缩略图', bg: '#f6ffed', color: '#07c160' },
  }
  return map[value] || { label: value || '-', bg: '#f5f5f5', color: '#666' }
}

function typeIcon(value) {
  const map = { image: '🖼️', voice: '🎵', video: '🎬', thumb: '🔲' }
  return map[value] || '📦'
}

function isPreviewable(type) {
  return type === 'image' || type === 'thumb' || type === 'video'
}

function fmtDateTime(dt) {
  if (!dt) return '-'
  return String(dt).replace('T', ' ').substring(0, 19)
}

function onTypeChange(e) {
  typeIndex.value = e.detail.value
  uploadType.value = typeOptions[typeIndex.value].value
  previewPath.value = ''
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const { list, pagination: pg } = await ssoWxMaterialApi.list({
      'pagination[page]': page,
      'pagination[pageSize]': 10,
    })
    // wx_url 为微信永久素材链接（mmbiz.qpic.cn），经 h.joho.cn/wximg/ 反代绕过防盗链展示
    dataList.value = (list || []).map(m => ({ ...m, url: getMediaUrl(m.file, true) || getMediaUrl(m.media, true) || toWxProxy(m.wx_url) || m.url || m.thumb_url }) )
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function chooseAndUpload() {
  const uploadPaths = (paths) => {
    if (paths && paths.length) batchUpload(paths)
  }
  if (uploadType.value === 'image' || uploadType.value === 'thumb') {
    // 图片/缩略图支持多选批量上传
    uni.chooseImage({
      count: 9,
      sizeType: ['compressed'],
      success: (res) => {
        if (res.tempFilePaths && res.tempFilePaths.length) uploadPaths(res.tempFilePaths)
      },
    })
  } else {
    uni.chooseFile({
      count: 1,
      success: (res) => {
        const fp = res.tempFiles && res.tempFiles[0] ? res.tempFiles[0].path : (res.tempFilePath || '')
        if (fp) uploadPaths([fp])
      },
    })
  }
}

/** 批量上传（串行，避免并发打爆公众号接口） */
async function batchUpload(paths) {
  uploading.value = true
  let ok = 0
  try {
    for (const fp of paths) {
      previewPath.value = fp
      const name = materialName.value || fp.split('/').pop() || '未命名素材'
      try {
        await ssoWxMaterialApi.upload(fp, uploadType.value, name)
        ok++
      } catch (e) {
        // 单张失败继续下一张
      }
    }
    uni.showToast({ title: ok ? `上传成功 ${ok}/${paths.length} 张` : '上传失败', icon: ok ? 'success' : 'none' })
    materialName.value = ''
    previewPath.value = ''
    loadData(1)
  } finally {
    uploading.value = false
  }
}

async function doUpload(filePath) {
  await batchUpload([filePath])
}

function handleDelete(item) {
  const id = item.documentId || item.id
  uni.showModal({
    title: '确认删除',
    content: `确定要删除素材「${item.name || '未命名'}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await ssoWxMaterialApi.delete(id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }

/** 图片点击放大预览 */
function previewMaterial(item) {
  if (isPreviewable(item.type) && item.url) {
    uni.previewImage({ urls: [item.url], current: item.url })
  }
}

onShow(() => loadData(1))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: #ff0000; color: #fff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.btn-secondary { background: #e6f4ff; color: #1677ff; border: 2rpx solid #91caff; padding: 14rpx 32rpx; font-size: 28rpx; border-radius: 8rpx; line-height: 1.2; }
.btn-secondary[disabled] { color: #ccc; background: #f5f5f5; border-color: #eee; }
.help-banner { display: flex; align-items: flex-start; gap: 12rpx; background: #e6f4ff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; border-left: 6rpx solid #1677ff; }
.help-icon { font-size: 28rpx; flex-shrink: 0; }
.help-text { font-size: 26rpx; color: #333; line-height: 1.5; }
.upload-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.upload-row { display: flex; gap: 20rpx; }
.upload-type { flex: 1; }
.upload-name { flex: 2; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; }
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.form-picker { width: 100%; height: 72rpx; line-height: 72rpx; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box; color: #333; }
.upload-preview { display: flex; align-items: center; justify-content: center; min-height: 200rpx; background: #fafafa; border-radius: 8rpx; margin-top: 16rpx; border: 2rpx dashed #ddd; }
.preview-img { width: 200rpx; height: 200rpx; border-radius: 8rpx; }
.preview-text { font-size: 26rpx; color: #999; }
.preview-placeholder { font-size: 24rpx; color: #ccc; }
.material-grid { display: flex; flex-wrap: wrap; gap: 20rpx; }
.material-card { width: calc((100% - 20rpx) / 2); background: #fff; border-radius: 12rpx; overflow: hidden; box-sizing: border-box; }
.card-media { position: relative; width: 100%; height: 280rpx; background: #f5f5f5; display: flex; align-items: center; justify-content: center; }
.card-img { width: 100%; height: 100%; }
.card-icon { font-size: 80rpx; }
.card-type { position: absolute; top: 12rpx; left: 12rpx; padding: 4rpx 14rpx; border-radius: 6rpx; font-size: 20rpx; }
.card-delete { position: absolute; top: 12rpx; right: 12rpx; width: 48rpx; height: 48rpx; line-height: 48rpx; text-align: center; background: rgba(0,0,0,0.55); color: #fff; border-radius: 50%; font-size: 26rpx; }
.card-info { padding: 16rpx 20rpx; display: flex; flex-direction: column; gap: 8rpx; }
.card-name { font-size: 28rpx; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-date { font-size: 22rpx; color: #999; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>