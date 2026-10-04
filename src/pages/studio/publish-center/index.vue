<template>
  <view class="page-container">
    <PageHeader title="发布中心" />

    <TenantSelector v-if="hasPermission('menu.tenant')" v-model="tenantId" @change="onTenantChange" />

    <view class="step-indicator">
      <view class="step-num">{{ step }}/3</view>
      <text class="step-title">{{ stepLabels[step - 1] }}</text>
    </view>

    <!-- Step 1: 选择内容（contentType 驱动） -->
    <view v-if="step === 1" class="step-content">
      <!-- contentType 分段控制器 -->
      <view class="card type-picker-card">
        <view class="card-label">内容类型</view>
        <view class="type-picker">
          <view
            v-for="opt in contentTypeOptions"
            :key="opt.value"
            class="type-tab"
            :class="{ active: contentType === opt.value }"
            @click="onContentTypeChange(opt.value)"
          >
            <text class="type-icon">{{ opt.icon }}</text>
            <text class="type-label">{{ opt.label }}</text>
          </view>
        </view>
      </view>

      <!-- 筛选（文章模式显示分类筛选，视频/图集显示标题搜索） -->
      <view class="card">
        <view class="card-label">筛选</view>
        <view class="filter-row">
          <input
            v-model="keywordFilter"
            :placeholder="currentFilterPlaceholder"
            class="filter-input"
            @confirm="loadContents"
          />
        </view>
      </view>

      <!-- 内容列表 -->
      <view class="card">
        <view class="card-label">
          {{ currentTypeLabel }}（已选 {{ selectedContentIds.length }} 项）
        </view>
        <scroll-view scroll-y class="scroll-list">
          <view
            v-for="item in contents"
            :key="item.documentId"
            class="check-item"
            @click="toggleContent(item.documentId)"
          >
            <!-- 缩略图（video/gallery 有 coverImage） -->
            <view v-if="item.coverImage" class="item-thumb">
              <image :src="item.coverImage" mode="aspectFill" class="thumb-img" />
              <text v-if="contentType === 'gallery' && item.images?.length" class="thumb-badge">{{ item.images.length }}张</text>
            </view>
            <view v-else class="item-thumb placeholder">{{ currentTypeIcon }}</view>

            <view class="item-info">
              <view class="item-title">{{ item.title }}</view>
              <view class="item-meta">
                <text class="meta-text">{{ getContentMeta(item) }}</text>
                <text v-if="hasPermission('menu.tenant') && item.scope" class="scope-tag">{{ getScopeText(item) }}</text>
              </view>
            </view>

            <view class="checkbox" :class="{ checked: selectedContentIds.includes(item.documentId) }">
              <text v-if="selectedContentIds.includes(item.documentId)" class="check-icon">✓</text>
            </view>
          </view>
          <view v-if="!loading && contents.length === 0" class="empty-inline">
            <text class="empty-text">暂无可发布{{ currentTypeLabel }}</text>
          </view>
        </scroll-view>
      </view>

      <view class="btn-row">
        <button class="btn-primary" :disabled="selectedContentIds.length === 0" @click="step = 2">
          下一步（选择账号）
        </button>
      </view>
    </view>

    <!-- Step 2: 选择发布账号 -->
    <view v-if="step === 2" class="step-content">
      <view class="card">
        <view class="card-label">选择发布账号（已选 {{ selectedAccountIds.length }} 个）</view>
        <scroll-view scroll-y class="scroll-list">
          <view v-for="group in accountGroups" :key="group.platformName" class="platform-group">
            <view class="platform-header">{{ group.platformName }}</view>
            <view
              v-for="account in group.accounts"
              :key="account.documentId"
              class="check-item"
              @click="toggleAccount(account.documentId)"
            >
              <view class="checkbox" :class="{ checked: selectedAccountIds.includes(account.documentId) }">
                <text v-if="selectedAccountIds.includes(account.documentId)" class="check-icon">✓</text>
              </view>
              <view class="item-info">
                <view class="item-title">{{ account.name }}</view>
                <view class="item-meta">
                  <text class="meta-text">{{ getPlatformName(account.platform) }}</text>
                </view>
              </view>
            </view>
          </view>
          <view v-if="!loading && accountGroups.length === 0" class="empty-inline">
            <text class="empty-text">暂无可用账号</text>
          </view>
        </scroll-view>
      </view>

      <view class="card">
        <view class="card-label">预约发布</view>
        <view class="schedule-row">
          <picker mode="date" :value="scheduleDate" class="picker-item" @change="onScheduleDateChange">
            <view class="picker-value" :class="{ 'is-placeholder': !scheduleDate }">
              {{ scheduleDate || '选择日期' }}
            </view>
          </picker>
          <picker mode="time" :value="scheduleTime" class="picker-item" @change="onScheduleTimeChange">
            <view class="picker-value" :class="{ 'is-placeholder': !scheduleTime }">
              {{ scheduleTime || '选择时间' }}
            </view>
          </picker>
        </view>
        <input v-model="scheduleName" class="schedule-name-input" placeholder="预约任务名（选填）" />
        <button class="btn-schedule" :disabled="scheduling" @click="createSchedule">
          {{ scheduling ? '创建中...' : '创建预约' }}
        </button>
      </view>

      <view class="btn-row">
        <button class="btn-default" @click="step = 1">上一步</button>
        <button class="btn-preview" :disabled="previewing" @click="openPreview">
          {{ contentType === 'article' ? (previewing ? '预览中...' : '预览') : '暂不支持预览' }}
        </button>
        <button
          class="btn-primary btn-publish"
          :disabled="selectedAccountIds.length === 0 || publishing"
          @click="startPublish"
        >
          {{ publishing ? '发布中...' : `发布到选中平台（${selectedAccountIds.length}）` }}
        </button>
      </view>
    </view>

    <!-- Step 3: 发布结果 -->
    <view v-if="step === 3" class="step-content">
      <view v-if="publishing" class="card">
        <view class="card-label">发布进度（{{ publishResults.length }} / {{ selectedContentIds.length }} 项）</view>
      </view>

      <view v-if="!publishing" class="stats-card">
        <view class="stat-item success">
          <text class="stat-num">{{ successCount }}</text>
          <text class="stat-label">成功</text>
        </view>
        <view class="stat-item fail">
          <text class="stat-num">{{ failCount }}</text>
          <text class="stat-label">失败</text>
        </view>
      </view>

      <view class="result-list">
        <view v-for="(record, idx) in publishResults" :key="idx" class="result-card">
          <view class="result-header">
            <text class="result-content">{{ record.contentTitle }}</text>
            <text class="result-type-tag">{{ contentTypeLabel }}</text>
            <text class="result-status" :class="record.success ? 'ok' : 'fail'">
              {{ record.success ? '成功' : '失败' }}
            </text>
          </view>
          <view class="result-meta">
            <text v-if="record.platformName" class="meta-text">平台：{{ record.platformName }}</text>
            <text v-if="record.externalId" class="meta-text">外部ID：{{ record.externalId }}</text>
            <text v-if="record.error" class="meta-text error-text">{{ record.error }}</text>
          </view>
          <view v-if="!record.success && record.recordId" class="retry-btn" @click="retryRecord(idx)">
            重试
          </view>
        </view>
      </view>

      <view class="btn-row">
        <button class="btn-default" @click="resetAll">重新发布</button>
      </view>
    </view>

    <!-- 发布预览浮层 -->
    <view v-if="previewVisible" class="preview-mask" @click="closePreview">
      <view class="preview-panel" @click.stop>
        <view class="preview-header">
          <text class="preview-title">发布预览</text>
          <text class="preview-close" @click="closePreview">✕</text>
        </view>
        <scroll-view scroll-y class="preview-list">
          <view v-if="previewLoading" class="preview-empty">
            <text class="empty-text">预览生成中...</text>
          </view>
          <view v-else-if="previewGroups.length === 0" class="preview-empty">
            <text class="empty-text">暂无预览结果</text>
          </view>
          <view v-for="(group, gi) in previewGroups" :key="gi" class="preview-group">
            <view class="preview-group-title">{{ group.contentTitle }}</view>
            <view v-if="group.rows.length === 0" class="preview-empty">
              <text class="empty-text">该内容暂无预览结果</text>
            </view>
            <view v-for="(row, ri) in group.rows" :key="ri" class="preview-item">
              <view class="preview-item-head">
                <text class="preview-account">{{ row.accountName || row.accountId }}</text>
                <text class="preview-platform">{{ getPlatformName(row.platform) }}</text>
              </view>
              <view v-if="row.error" class="preview-error">{{ row.error }}</view>
              <view v-else class="preview-body">
                <view class="preview-line">标题：{{ row.adaptedTitle || '—' }}</view>
                <view class="preview-line preview-content">{{ row.adaptedContentPreview || '—' }}</view>
                <view class="preview-length">内容长度：{{ row.contentLength || 0 }}</view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { articleDraftApi, publishAccountApi, publishActionApi, publishScheduleApi, publishVideoApi, publishGalleryApi } from '../../../api/studio.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'
import TenantSelector from '../../../components/TenantSelector.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const step = ref(1)
const stepLabels = ['选择内容', '选择发布账号', '发布']
const loading = ref(false)
const publishing = ref(false)

const tenantId = ref('')

// contentType 配置
const contentTypeOptions = [
  { value: 'article', label: '文章', icon: '📝' },
  { value: 'video', label: '短视频', icon: '🎬' },
  { value: 'gallery', label: '图集', icon: '🖼️' },
]
const contentType = ref('article')

// 当前内容类型的 API 映射
const contentApiMap = {
  article: articleDraftApi,
  video: publishVideoApi,
  gallery: publishGalleryApi,
}

// Step 1 通用化
const contents = ref([])
const selectedContentIds = ref([])
const keywordFilter = ref('')

// Step 2
const accounts = ref([])
const selectedAccountIds = ref([])

// Step 3
const publishResults = ref([])

// 发布预览（仅 article 支持）
const previewVisible = ref(false)
const previewing = ref(false)
const previewLoading = ref(false)
const previewGroups = ref([])

// 预约发布
const scheduleDate = ref('')
const scheduleTime = ref('')
const scheduleName = ref('')
const scheduling = ref(false)

const successCount = computed(() => publishResults.value.filter(r => r.success).length)
const failCount = computed(() => publishResults.value.filter(r => !r.success).length)

const currentTypeLabel = computed(() => contentTypeOptions.find(o => o.value === contentType.value)?.label || '内容')
const currentTypeIcon = computed(() => contentTypeOptions.find(o => o.value === contentType.value)?.icon || '📄')
const contentTypeLabel = computed(() => contentTypeOptions.find(o => o.value === contentType.value)?.label || '')

const currentFilterPlaceholder = computed(() => {
  if (contentType.value === 'article') return '按标题筛选'
  if (contentType.value === 'video') return '按视频标题筛选'
  return '按图集标题筛选'
})

const accountGroups = computed(() => {
  const groups = {}
  accounts.value.forEach(account => {
    const platformName = getPlatformName(account.platform)
    if (!groups[platformName]) {
      groups[platformName] = { platformName, accounts: [] }
    }
    groups[platformName].accounts.push(account)
  })
  return Object.values(groups)
})

function getPlatformName(platform) {
  if (!platform) return '未绑定'
  if (typeof platform === 'string') return platform
  return platform.name || platform.documentId || '未命名'
}

function getScopeText(item) {
  const scopeMap = { global: '全局', tenant: '指定租户', current: '当前租户' }
  return scopeMap[item.scope] || '当前租户'
}

// 内容元数据（按 contentType 显示不同字段）
function getContentMeta(item) {
  switch (contentType.value) {
    case 'article':
      return `📂 ${item.category || '未分类'}`
    case 'video':
      return `⏱️ ${item.duration ? item.duration + 's' : '--'} · ${item.tags?.length || 0} 标签`
    case 'gallery':
      return `📁 ${item.images?.length || 0} 张 · ${item.tags?.length || 0} 标签`
    default:
      return ''
  }
}

function onContentTypeChange(type) {
  if (contentType.value === type) return
  contentType.value = type
  selectedContentIds.value = []
  keywordFilter.value = ''
  step.value = 1
  loadContents()
}

async function loadContents() {
  loading.value = true
  try {
    const api = contentApiMap[contentType.value]
    const params = {
      'pagination[pageSize]': 100,
      'filters[status]': contentType.value === 'article' ? 'ready' : 'ready',
    }
    if (keywordFilter.value) {
      params['filters[title][$contains]'] = keywordFilter.value
    }
    if (tenantId.value) {
      params['filters[tenantId]'] = tenantId.value
    }
    const { list } = await api.list(params)
    contents.value = list
  } catch (e) {
    uni.showToast({ title: `加载${currentTypeLabel.value}失败`, icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadAccounts() {
  loading.value = true
  try {
    const params = {
      'pagination[pageSize]': 100,
      'filters[isActive]': true,
      'populate': '*'
    }
    if (tenantId.value) {
      params['filters[tenantId]'] = tenantId.value
    }
    const { list } = await publishAccountApi.list(params)
    accounts.value = list
  } catch (e) {
    uni.showToast({ title: '加载账号失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onTenantChange() {
  selectedContentIds.value = []
  selectedAccountIds.value = []
  loadContents()
  loadAccounts()
}

function toggleContent(id) {
  const i = selectedContentIds.value.indexOf(id)
  if (i >= 0) {
    selectedContentIds.value.splice(i, 1)
  } else {
    selectedContentIds.value.push(id)
  }
}

function toggleAccount(id) {
  const i = selectedAccountIds.value.indexOf(id)
  if (i >= 0) {
    selectedAccountIds.value.splice(i, 1)
  } else {
    selectedAccountIds.value.push(id)
  }
}

function validateSelection() {
  if (selectedContentIds.value.length === 0) {
    uni.showToast({ title: `请先选择${currentTypeLabel.value}`, icon: 'none' })
    return false
  }
  if (selectedAccountIds.value.length === 0) {
    uni.showToast({ title: '请至少选择一个发布账号', icon: 'none' })
    return false
  }
  return true
}

// 仅 article 支持 preview
async function openPreview() {
  if (!validateSelection()) return
  if (contentType.value !== 'article') {
    uni.showToast({ title: '短视频/图集暂不支持预览', icon: 'none' })
    return
  }
  previewVisible.value = true
  previewing.value = true
  previewLoading.value = true
  previewGroups.value = []
  try {
    for (const contentId of selectedContentIds.value) {
      const res = await publishActionApi.preview(contentId, selectedAccountIds.value)
      const rows = Array.isArray(res) ? res : (res?.results || [])
      previewGroups.value.push({
        contentTitle: res?.articleTitle || contentId,
        rows: rows || []
      })
    }
    if (previewGroups.value.every(group => group.rows.length === 0)) {
      uni.showToast({ title: '暂无预览结果', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: e?.message || '预览失败', icon: 'none' })
  } finally {
    previewing.value = false
    previewLoading.value = false
  }
}

function closePreview() {
  previewVisible.value = false
}

function onScheduleDateChange(e) {
  scheduleDate.value = e.detail.value
}

function onScheduleTimeChange(e) {
  scheduleTime.value = e.detail.value
}

async function createSchedule() {
  if (!validateSelection()) return
  if (!scheduleDate.value || !scheduleTime.value) {
    uni.showToast({ title: '请选择晚于当前时间的预约时间', icon: 'none' })
    return
  }
  const scheduledAt = new Date(`${scheduleDate.value}T${scheduleTime.value}:00`)
  if (isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
    uni.showToast({ title: '请选择晚于当前时间的预约时间', icon: 'none' })
    return
  }
  scheduling.value = true
  try {
    const baseName = scheduleName.value.trim()
    for (const contentId of selectedContentIds.value) {
      const payload = {
        accountIds: selectedAccountIds.value,
        scheduledAt: scheduledAt.toISOString(),
        name: baseName || undefined
      }
      // 按 contentType 传对应 ID 字段
      if (contentType.value === 'article') payload.articleId = contentId
      else if (contentType.value === 'video') payload.videoId = contentId
      else if (contentType.value === 'gallery') payload.galleryId = contentId
      await publishScheduleApi.create(payload)
    }
    uni.showToast({ title: '已创建 ' + selectedContentIds.value.length + ' 个预约', icon: 'success' })
    scheduleDate.value = ''
    scheduleTime.value = ''
    scheduleName.value = ''
  } catch (e) {
    uni.showToast({ title: e?.message || '创建预约失败', icon: 'none' })
  } finally {
    scheduling.value = false
  }
}

// 按 contentType 分支发布
async function startPublish() {
  step.value = 3
  publishing.value = true
  publishResults.value = []

  for (const contentId of selectedContentIds.value) {
    const content = contents.value.find(c => c.documentId === contentId)
    const contentTitle = content?.title || contentId

    try {
      let result
      if (contentType.value === 'article') {
        result = await publishActionApi.publishArticle(contentId, selectedAccountIds.value)
      } else if (contentType.value === 'video') {
        result = await publishActionApi.publishVideo(contentId, selectedAccountIds.value)
      } else {
        result = await publishActionApi.publishGallery(contentId, selectedAccountIds.value)
      }
      const records = Array.isArray(result) ? result : (result?.results || [result])
      records.forEach(record => {
        publishResults.value.push({
          contentTitle,
          contentId,
          recordId: record.recordId || record.documentId || record.id,
          accountId: record.accountId,
          platformName: record.platformName || getPlatformName(record.platform),
          success: record.success !== false && record.status !== 'failed',
          externalId: record.externalId || '',
          error: record.error || record.errorMessage || ''
        })
      })
    } catch (e) {
      publishResults.value.push({
        contentTitle,
        contentId,
        success: false,
        error: e?.message || '发布请求失败'
      })
    }
  }

  publishing.value = false
  const msg = `发布完成：成功 ${successCount.value} 条，失败 ${failCount.value} 条`
  uni.showToast({ title: msg, icon: 'none', duration: 3000 })
}

async function retryRecord(idx) {
  const record = publishResults.value[idx]
  if (!record.recordId) return

  uni.showLoading({ title: '重试中...' })
  try {
    const result = await publishActionApi.retryPublish(record.recordId)
    publishResults.value[idx] = {
      ...record,
      success: result?.success !== false && result?.status !== 'failed',
      externalId: result?.externalId || record.externalId || '',
      error: result?.error || result?.errorMessage || ''
    }
    uni.showToast({ title: '重试成功', icon: 'success' })
  } catch (e) {
    publishResults.value[idx].error = e?.message || '重试失败'
    uni.showToast({ title: '重试失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

function resetAll() {
  step.value = 1
  selectedContentIds.value = []
  selectedAccountIds.value = []
  publishResults.value = []
}

onLoad(() => {
  loadContents()
  loadAccounts()
})
</script>

<style scoped>
page {
  background: #f5f5f5;
}
.page-container {
  min-height: 100vh;
  padding: 20rpx;
  box-sizing: border-box;
}

.step-indicator {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  padding: 20rpx 24rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}
.step-num {
  font-size: 28rpx;
  font-weight: bold;
  color: #fff;
  background: #1989fa;
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
}
.step-title {
  font-size: 30rpx;
  color: #333;
  font-weight: bold;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
}
.card-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

/* contentType 分段控制器 */
.type-picker-card {
  padding: 20rpx 24rpx;
}
.type-picker {
  display: flex;
  gap: 12rpx;
}
.type-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 16rpx 0;
  background: #f5f5f5;
  border-radius: 10rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}
.type-tab.active {
  background: #fff0f0;
  border-color: #ff0000;
}
.type-icon {
  font-size: 36rpx;
}
.type-label {
  font-size: 26rpx;
  color: #666;
}
.type-tab.active .type-label {
  color: #ff0000;
  font-weight: bold;
}

.filter-row {
  display: flex;
  gap: 16rpx;
}
.filter-input {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 0 20rpx;
}

.scroll-list {
  max-height: 800rpx;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.check-item:last-child {
  border-bottom: none;
}
.item-thumb {
  width: 100rpx;
  height: 80rpx;
  border-radius: 8rpx;
  overflow: hidden;
  flex-shrink: 0;
  background: #f5f5f5;
  position: relative;
}
.item-thumb.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
}
.thumb-img {
  width: 100%;
  height: 100%;
}
.thumb-badge {
  position: absolute;
  bottom: 2rpx;
  right: 2rpx;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 18rpx;
  padding: 2rpx 6rpx;
  border-radius: 16rpx;
}
.item-info {
  flex: 1;
  min-width: 0;
}
.item-title {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-meta {
  display: flex;
  gap: 16rpx;
  align-items: center;
}
.meta-text {
  font-size: 24rpx;
  color: #999;
}
.scope-tag {
  font-size: 22rpx;
  color: #1989fa;
  background: #e6f3ff;
  padding: 2rpx 12rpx;
  border-radius: 4rpx;
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #ddd;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.checkbox.checked {
  background: #1989fa;
  border-color: #1989fa;
}
.check-icon {
  color: #fff;
  font-size: 28rpx;
  font-weight: bold;
}

.platform-group {
  margin-bottom: 20rpx;
}
.platform-header {
  font-size: 26rpx;
  font-weight: bold;
  color: #666;
  padding: 12rpx 0;
  border-bottom: 2rpx solid #f0f0f0;
}

.empty-inline {
  padding: 40rpx 0;
  text-align: center;
}
.empty-text {
  font-size: 28rpx;
  color: #999;
}

.btn-row {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
}
.btn-primary {
  flex: 1;
  background: #ff0000;
  color: #fff;
  padding: 20rpx;
  font-size: 30rpx;
  border-radius: 8rpx;
  border: none;
  text-align: center;
}
.btn-primary[disabled] {
  background: #ccc;
  color: #fff;
}
.btn-default {
  flex: 1;
  background: #f5f5f5;
  color: #333;
  padding: 20rpx;
  font-size: 30rpx;
  border-radius: 8rpx;
  border: none;
  text-align: center;
}
.btn-preview {
  flex: 1;
  background: #e6f3ff;
  color: #1989fa;
  padding: 20rpx;
  font-size: 30rpx;
  border-radius: 8rpx;
  border: none;
  text-align: center;
}
.btn-preview[disabled] {
  background: #f5f5f5;
  color: #999;
}
.btn-publish {
  flex: 2;
}

.schedule-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.picker-item {
  flex: 1;
}
.picker-value {
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
  color: #333;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 0 20rpx;
}
.picker-value.is-placeholder {
  color: #999;
}
.schedule-name-input {
  height: 72rpx;
  font-size: 28rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 0 20rpx;
  margin-bottom: 16rpx;
}
.btn-schedule {
  width: 100%;
  background: #07c160;
  color: #fff;
  padding: 20rpx;
  font-size: 30rpx;
  border-radius: 8rpx;
  border: none;
  text-align: center;
}
.btn-schedule[disabled] {
  background: #ccc;
  color: #fff;
}

.preview-mask {
  position: fixed;
  left: 0; right: 0; top: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.preview-panel {
  width: 640rpx;
  max-height: 80vh;
  background: #fff;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.preview-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}
.preview-close {
  font-size: 32rpx;
  color: #999;
  padding: 0 10rpx;
}
.preview-list {
  max-height: 66vh;
  padding: 12rpx 24rpx 24rpx;
  box-sizing: border-box;
}
.preview-group { margin-bottom: 16rpx; }
.preview-group-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #666;
  padding: 12rpx 0;
}
.preview-item {
  border: 1rpx solid #f0f0f0;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
}
.preview-item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.preview-account {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}
.preview-platform {
  font-size: 22rpx;
  color: #1989fa;
  background: #e6f3ff;
  padding: 2rpx 12rpx;
  border-radius: 4rpx;
}
.preview-error { font-size: 24rpx; color: #ff4d4f; }
.preview-body { display: flex; flex-direction: column; gap: 8rpx; }
.preview-line { font-size: 24rpx; color: #333; }
.preview-content { color: #666; line-height: 1.5; }
.preview-length { font-size: 22rpx; color: #999; }
.preview-empty { padding: 60rpx 0; text-align: center; }

.stats-card {
  display: flex;
  gap: 20rpx;
  background: #fff;
  border-radius: 12rpx;
  padding: 40rpx 24rpx;
}
.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.stat-num { font-size: 56rpx; font-weight: bold; }
.stat-item.success .stat-num { color: #07c160; }
.stat-item.fail .stat-num { color: #ff4d4f; }
.stat-label { font-size: 26rpx; color: #999; }

.result-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.result-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
}
.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.result-content {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-type-tag {
  font-size: 20rpx;
  color: #999;
  background: #f5f5f5;
  padding: 2rpx 12rpx;
  border-radius: 4rpx;
}
.result-status {
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 4rpx;
  color: #fff;
  flex-shrink: 0;
}
.result-status.ok { background: #07c160; }
.result-status.fail { background: #ff4d4f; }
.result-meta {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.error-text { color: #ff4d4f; }
.retry-btn {
  display: inline-block;
  margin-top: 12rpx;
  padding: 8rpx 24rpx;
  background: #fff0f0;
  color: #ff4d4f;
  font-size: 24rpx;
  border-radius: 8rpx;
  text-align: center;
  align-self: flex-start;
}
</style>
