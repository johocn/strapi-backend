<template>
  <view class="page-container">
    <PageHeader title="图文草稿与发布">
      <button class="btn-primary" @click="openCreate" v-if="hasPermission('menu.sso-wx')">+ 新建图文</button>
    </PageHeader>

    <view class="help-banner">
      <text class="help-icon">ℹ️</text>
      <text class="help-text">创建图文草稿，配置标题、作者、摘要、正文与封面（thumb_media_id），确认后点击「发布」推送到公众号。发布中的草稿会轮询更新发布状态。</text>
    </view>

    <!-- 新建/编辑表单 -->
    <view v-if="showForm" class="form-card">
      <view class="section-title">{{ form.id ? '编辑图文' : '新建图文' }}</view>

      <view class="form-item">
        <text class="form-label">标题<text class="required-mark">*</text></text>
        <input v-model="form.title" class="form-input" placeholder="请输入图文标题" />
      </view>
      <view class="form-item">
        <text class="form-label">作者</text>
        <input v-model="form.author" class="form-input" placeholder="请输入作者（选填）" />
      </view>
      <view class="form-item">
        <text class="form-label">摘要</text>
        <textarea v-model="form.digest" class="form-textarea" placeholder="请输入导读摘要（选填）" />
      </view>
      <view class="form-item">
        <text class="form-label">封面 thumb_media_id</text>
        <input v-model="form.thumb_media_id" class="form-input" placeholder="素材库图片的 media_id" />
      </view>
      <view class="form-item">
        <text class="form-label">正文内容<text class="required-mark">*</text></text>
        <textarea v-model="form.content" class="form-textarea content" placeholder="请输入图文正文内容" />
      </view>
      <view class="form-item">
        <text class="form-label">原文链接 content_source_url</text>
        <input v-model="form.content_source_url" class="form-input" placeholder="点击「阅读原文」跳转的 URL（选填）" />
      </view>

      <view class="form-actions">
        <button class="btn-secondary" @click="closeForm">取消</button>
        <button class="btn-primary" @click="handleSave" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
      </view>
    </view>

    <view class="data-list">
      <view v-for="item in dataList" :key="item.documentId || item.id" class="data-card">
        <view class="data-info">
          <view class="data-title">
            <text class="article-title">{{ item.title || '未命名图文' }}</text>
            <view class="data-status" :class="statusMeta(item.publish_state || item.publishStatus || 'draft').cls">
              {{ statusMeta(item.publish_state || item.publishStatus || 'draft').label }}
            </view>
          </view>
          <view class="data-meta" v-if="item.author">
            <text class="meta-item">✍️ {{ item.author }}</text>
          </view>
          <view class="data-meta" v-if="item.digest">
            <text class="meta-item digest">{{ item.digest }}</text>
          </view>
          <view class="data-meta" v-if="item.content">
            <text class="meta-item content-preview">{{ stripHtml(item.content).substring(0, 60) }}</text>
          </view>
          <view class="data-footer">
            <text class="data-date">{{ fmtDateTime(item.updatedAt || item.updated_at) }}</text>
          </view>
        </view>
        <view class="data-actions">
          <view v-if="isPublishing(item) " class="publishing-tip">发布中...</view>
          <view v-if="hasPermission('menu.sso-wx')" class="action-btn edit" @click="openEdit(item)">编辑</view>
          <view v-if="hasPermission('menu.sso-wx')" class="action-btn publish" @click="handlePublish(item)">发布</view>
          <view v-if="hasPermission('menu.sso-wx')" class="action-btn delete" @click="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && dataList.length === 0" class="empty-state">
      <text class="empty-icon">📝</text>
      <text class="empty-text">暂无图文草稿，点击「+ 新建图文」创建</text>
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
import { onShow, onUnload } from '@dcloudio/uni-app'
import { ssoWxArticleApi } from '../../api/wechat.js'
import { useUserStore } from '../../store/user.js'
import PageHeader from '../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const dataList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const saving = ref(false)
const showForm = ref(false)
const form = ref(resetForm())
const pollTimers = []

const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

function resetForm() {
  return {
    id: '',
    title: '',
    author: '',
    digest: '',
    content: '',
    thumb_media_id: '',
    content_source_url: '',
  }
}

function statusMeta(state) {
  const s = String(state || 'draft')
  const map = {
    draft: { label: '草稿', cls: 'inactive' },
    publishing: { label: '发布中', cls: 'publishing' },
    published: { label: '已发布', cls: 'active' },
    success: { label: '已发布', cls: 'active' },
    failed: { label: '发布失败', cls: 'failed' },
  }
  return map[s] || { label: s, cls: 'inactive' }
}

function isPublishing(item) {
  const s = String(item.publish_state || item.publishStatus || 'draft')
  return s === 'publishing'
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
}

function fmtDateTime(dt) {
  if (!dt) return '-'
  return String(dt).replace('T', ' ').substring(0, 19)
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const { list, pagination: pg } = await ssoWxArticleApi.list({
      'pagination[page]': page,
      'pagination[pageSize]': 10,
    })
    dataList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = resetForm()
  showForm.value = true
}

function openEdit(item) {
  form.value = {
    id: item.documentId || item.id,
    title: item.title || '',
    author: item.author || '',
    digest: item.digest || '',
    content: item.content || '',
    thumb_media_id: item.thumb_media_id || '',
    content_source_url: item.content_source_url || '',
  }
  showForm.value = true
}

function closeForm() { showForm.value = false }

async function handleSave() {
  if (!form.value.title) {
    uni.showToast({ title: '请填写标题', icon: 'none' })
    return
  }
  if (!form.value.content) {
    uni.showToast({ title: '请填写正文内容', icon: 'none' })
    return
  }
  saving.value = true
  const payload = {
    title: form.value.title,
    author: form.value.author,
    digest: form.value.digest,
    content: form.value.content,
    thumb_media_id: form.value.thumb_media_id,
    content_source_url: form.value.content_source_url,
  }
  try {
    if (form.value.id) {
      await ssoWxArticleApi.update(form.value.id, payload)
    } else {
      await ssoWxArticleApi.create(payload)
    }
    uni.showToast({ title: '保存成功', icon: 'success' })
    closeForm()
    loadData(currentPage.value)
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function handlePublish(item) {
  const id = item.documentId || item.id
  uni.showModal({
    title: '发布图文',
    content: `确定将「${item.title || '该图文'}」发布到公众号吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await ssoWxArticleApi.publish(id)
        uni.showToast({ title: '已提交发布', icon: 'success' })
        startPollStatus(item)
        loadData(currentPage.value)
      } catch (e) {
        uni.showToast({ title: '发布失败', icon: 'none' })
      }
    },
  })
}

// 发布中轮询 status（刷新单条 publish_state）
function startPollStatus(item) {
  const id = item.documentId || item.id
  const timer = setInterval(async () => {
    try {
      const st = await ssoWxArticleApi.status(id)
      const state = st?.publish_state || st?.publishStatus || st?.status || ''
      if (state && state !== 'publishing') {
        clearInterval(timer)
        const idx = pollTimers.indexOf(timer)
        if (idx >= 0) pollTimers.splice(idx, 1)
        uni.showToast({ title: state === 'published' || state === 'success' ? '发布成功' : '发布状态: ' + state, icon: 'none' })
        loadData(currentPage.value)
      }
    } catch (e) {
      clearInterval(timer)
      const idx = pollTimers.indexOf(timer)
      if (idx >= 0) pollTimers.splice(idx, 1)
    }
  }, 3000)
  pollTimers.push(timer)
}

function handleDelete(item) {
  const id = item.documentId || item.id
  uni.showModal({
    title: '确认删除',
    content: `确定要删除「${item.title || '该图文'}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await ssoWxArticleApi.delete(id)
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

onShow(() => {
  // 避免重复启动轮询（onShow 在返回页面时触发）
  if (pollTimers.length === 0) loadData(1)
})

onUnload(() => {
  pollTimers.forEach(t => clearInterval(t))
  pollTimers.length = 0
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: #ff0000; color: #fff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.btn-secondary { background: #f5f5f5; color: #333; padding: 14rpx 32rpx; font-size: 28rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.help-banner { display: flex; align-items: flex-start; gap: 12rpx; background: #e6f4ff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; border-left: 6rpx solid #1677ff; }
.help-icon { font-size: 28rpx; flex-shrink: 0; }
.help-text { font-size: 26rpx; color: #333; line-height: 1.5; }
.form-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; padding-left: 8rpx; border-left: 6rpx solid #ff0000; }
.form-item { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; }
.required-mark { color: #ff4d4f; margin-left: 4rpx; }
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.form-textarea { width: 100%; min-height: 160rpx; padding: 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.form-textarea.content { min-height: 300rpx; }
.form-hint { display: block; font-size: 24rpx; color: #999; margin-top: 6rpx; }
.form-actions { display: flex; justify-content: flex-end; gap: 20rpx; }
.data-list { display: flex; flex-direction: column; gap: 20rpx; }
.data-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: flex-start; }
.data-info { flex: 1; display: flex; flex-direction: column; }
.data-title { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.article-title { font-size: 30rpx; font-weight: bold; color: #333; }
.data-status { padding: 4rpx 16rpx; border-radius: 4rpx; font-size: 22rpx; color: #fff; }
.data-status.active { background: #07c160; }
.data-status.inactive { background: #999; }
.data-status.publishing { background: #fa8c16; }
.data-status.failed { background: #ff4d4f; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.meta-item.digest { color: #666; }
.meta-item.content-preview { color: #aaa; }
.data-footer { display: flex; justify-content: space-between; margin-top: 12rpx; }
.data-date { font-size: 22rpx; color: #999; }
.data-actions { display: flex; flex-direction: column; gap: 12rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.publish { background: #e6f6ef; color: #07c160; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }
.publishing-tip { font-size: 22rpx; color: #fa8c16; text-align: center; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>