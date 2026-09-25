<template>
  <view class="page-container">
    <PageHeader title="关键字自动回复">
      <button class="btn-primary" @click="openCreate" v-if="hasPermission('menu.sso-wx')">+ 新建规则</button>
    </PageHeader>

    <view class="help-banner">
      <text class="help-icon">ℹ️</text>
      <text class="help-text">配置自动回复规则：支持欢迎语 / 兜底 / 关键字三种触发，回复类型覆盖文本、图片、语音、视频、音乐、图文、转客服等微信全部被动回复能力。图片/语音/视频可联动素材库选择。</text>
    </view>

    <!-- ============ 新建/编辑表单 ============ -->
    <view v-if="showForm" class="form-card">
      <view class="section-title">{{ form.id ? '编辑规则' : '新建规则' }}</view>

      <view class="form-item">
        <text class="form-label">触发方式<text class="required-mark">*</text></text>
        <picker mode="selector" :range="triggerOptions" range-key="label" @change="onTriggerChange" :value="triggerIndex">
          <view class="form-picker">{{ triggerOptions[triggerIndex].label }} ▼</view>
        </picker>
      </view>

      <view class="form-item" v-if="form.trigger === 'keyword'">
        <text class="form-label">关键字 / 匹配内容<text class="required-mark">*</text></text>
        <input v-model="form.match" class="form-input" placeholder="如：你好 / 关注" />
        <text class="form-hint">用户发送的消息命中该关键字时触发回复</text>
      </view>

      <view class="form-item">
        <text class="form-label">回复类型<text class="required-mark">*</text></text>
        <view class="type-grid">
          <view
            v-for="t in replyTypes"
            :key="t.value"
            class="type-card"
            :class="{ active: form.reply_type === t.value }"
            @click="onReplyTypeChange(t.value)"
          >
            <text class="type-icon">{{ t.icon }}</text>
            <text class="type-label">{{ t.label }}</text>
          </view>
        </view>
      </view>

      <!-- ===== 文本 ===== -->
      <view class="form-item" v-if="form.reply_type === 'text'">
        <text class="form-label">回复文本<text class="required-mark">*</text></text>
        <textarea v-model="form.text" class="form-textarea" placeholder="请输入自动回复的文本内容" />
      </view>

      <!-- ===== 图片 / 语音 / 视频（素材联动） ===== -->
      <template v-if="['image', 'voice', 'video'].includes(form.reply_type)">
        <view class="form-item">
          <text class="form-label">选择素材（{{ materialTypeLabel }}）<text class="required-mark">*</text></text>
          <view v-if="selectedMaterial" class="material-selected">
            <image v-if="form.reply_type === 'image' && selectedMaterial.wx_url" class="material-thumb-img" :src="toWxProxy(selectedMaterial.wx_url)" mode="aspectFill" />
            <text class="material-thumb-icon">{{ replyTypeIcon(form.reply_type) }}</text>
            <view class="material-selected-info">
              <text class="material-name">{{ selectedMaterial.name || '未命名素材' }}</text>
              <text class="material-media">media_id: {{ (selectedMaterial.media_id || '').slice(0, 18) }}...</text>
            </view>
            <view class="material-change" @click="loadMaterials(form.reply_type)">更换</view>
          </view>
          <view v-else class="material-picker-btn" @click="loadMaterials(form.reply_type)">＋ 从素材库选择</view>
          <view v-if="materials.length" class="material-list">
            <view
              v-for="m in materials"
              :key="m.documentId || m.id"
              class="material-item"
              :class="{ picked: form.media_id === m.media_id }"
              @click="pickMaterial(m)"
            >
              <image v-if="m.type === 'image' && m.wx_url" class="material-img" :src="toWxProxy(m.wx_url)" mode="aspectFill" />
              <text v-else class="material-icon">{{ replyTypeIcon(m.type) }}</text>
              <text class="material-item-name">{{ m.name || m.type }}</text>
            </view>
          </view>
        </view>
        <view class="form-item" v-if="form.reply_type === 'video'">
          <text class="form-label">视频标题</text>
          <input v-model="form.title" class="form-input" placeholder="选填" />
        </view>
        <view class="form-item" v-if="form.reply_type === 'video'">
          <text class="form-label">视频描述</text>
          <input v-model="form.desc" class="form-input" placeholder="选填" />
        </view>
        <view class="form-item" v-if="!materials.length && !loadingMaterials">
          <text class="form-hint warn-hint">素材库暂无{{ materialTypeLabel }}，请先到「素材库」上传</text>
        </view>
      </template>

      <!-- ===== 音乐 ===== -->
      <template v-if="form.reply_type === 'music'">
        <view class="form-item">
          <text class="form-label">音乐标题<text class="required-mark">*</text></text>
          <input v-model="form.title" class="form-input" placeholder="请输入音乐标题" />
        </view>
        <view class="form-item">
          <text class="form-label">音乐描述</text>
          <textarea v-model="form.desc" class="form-textarea" placeholder="选填" />
        </view>
        <view class="form-item">
          <text class="form-label">音乐链接 URL<text class="required-mark">*</text></text>
          <input v-model="form.music_url" class="form-input" placeholder="https://... 音乐文件地址" />
        </view>
        <view class="form-item">
          <text class="form-label">高质量音乐链接 URL</text>
          <input v-model="form.hq_music_url" class="form-input" placeholder="选填，无损音质地址" />
        </view>
        <view class="form-item">
          <text class="form-label">缩略图素材（thumb）</text>
          <view v-if="form.thumb_media_id" class="material-selected">
            <text class="material-thumb-icon">🎵</text>
            <text class="material-media">thumb_media_id: {{ form.thumb_media_id.slice(0, 18) }}...</text>
            <view class="material-change" @click="loadMaterials('thumb')">更换</view>
          </view>
          <view v-else class="material-picker-btn" @click="loadMaterials('thumb')">＋ 选择缩略图</view>
          <view v-if="materials.length" class="material-list">
            <view
              v-for="m in materials"
              :key="m.documentId || m.id"
              class="material-item"
              :class="{ picked: form.thumb_media_id === m.media_id }"
              @click="pickThumb(m)"
            >
              <image v-if="m.wx_url" class="material-img" :src="toWxProxy(m.wx_url)" mode="aspectFill" />
              <text v-else class="material-icon">🖼️</text>
              <text class="material-item-name">{{ m.name || m.type }}</text>
            </view>
          </view>
        </view>
      </template>

      <!-- ===== 图文（多图文编辑器） ===== -->
      <template v-if="form.reply_type === 'news'">
        <view class="form-item">
          <text class="form-label">图文列表（{{ form.articles.length }}/8）</text>
          <view class="article-editor">
            <view v-for="(a, i) in form.articles" :key="i" class="article-card">
              <view class="article-head" @click="toggleArticle(i)">
                <text class="article-index">{{ i + 1 }}</text>
                <text class="article-title">{{ a.title || '未命名图文' }}</text>
                <view class="article-op">
                  <text class="op-btn" @click.stop="moveArticle(i, -1)" :class="{ disabled: i === 0 }">↑</text>
                  <text class="op-btn" @click.stop="moveArticle(i, 1)" :class="{ disabled: i >= form.articles.length - 1 }">↓</text>
                  <text class="op-btn del" @click.stop="removeArticle(i)">✕</text>
                </view>
              </view>
              <view v-if="expandedArticle === i" class="article-body">
                <view class="form-item sub">
                  <text class="form-label">标题<text class="required-mark">*</text></text>
                  <input v-model="a.title" class="form-input" placeholder="图文标题" />
                </view>
                <view class="form-item sub">
                  <text class="form-label">描述</text>
                  <textarea v-model="a.description" class="form-textarea" placeholder="图文摘要（选填）" />
                </view>
                <view class="form-item sub">
                  <text class="form-label">封面图 URL</text>
                  <input v-model="a.pic_url" class="form-input" placeholder="https://... 封面图片地址" />
                </view>
                <view class="form-item sub">
                  <text class="form-label">跳转链接 URL</text>
                  <input v-model="a.url" class="form-input" placeholder="https://... 点击后跳转" />
                </view>
              </view>
            </view>
            <view class="article-add" @click="addArticle" v-if="form.articles.length < 8">＋ 添加图文（{{ form.articles.length }}/8）</view>
          </view>
        </view>
      </template>

      <!-- ===== 转客服 ===== -->
      <view v-if="form.reply_type === 'transfer'" class="transfer-tip">
        <text class="transfer-icon">🎧</text>
        <text>用户命中后消息将转给人工客服处理（需公众号已开通客服功能）</text>
      </view>

      <!-- ===== 回复预览（模拟微信聊天） ===== -->
      <view v-if="preview" class="preview-block">
        <text class="preview-title">回复预览（微信效果）</text>
        <view class="preview-chat">
          <view class="preview-user">用户消息</view>
          <view class="preview-reply">
            <template v-if="preview.type === 'text'">
              <view class="preview-text">{{ preview.text }}</view>
            </template>
            <template v-else-if="preview.type === 'image'">
              <view class="preview-media">
                <image v-if="preview.thumb" class="preview-img" :src="preview.thumb" mode="aspectFill" />
                <text v-else class="preview-media-icon">🖼️</text>
                <text class="preview-media-name">图片消息</text>
              </view>
            </template>
            <template v-else-if="preview.type === 'voice'">
              <view class="preview-voice">🎙️ 语音消息 {{ preview.voiceLen }}″</view>
            </template>
            <template v-else-if="preview.type === 'video'">
              <view class="preview-media">
                <text class="preview-media-icon">🎬</text>
                <text class="preview-media-name">{{ preview.title || '视频消息' }}</text>
              </view>
            </template>
            <template v-else-if="preview.type === 'music'">
              <view class="preview-music">
                <text class="preview-music-icon">🎵</text>
                <view class="preview-music-info">
                  <text class="preview-music-title">{{ preview.title || '音乐' }}</text>
                  <text class="preview-music-desc">{{ preview.desc || '音乐分享' }}</text>
                </view>
              </view>
            </template>
            <template v-else-if="preview.type === 'news'">
              <view class="preview-news" v-for="(n, i) in preview.articles" :key="i">
                <view class="preview-news-text">
                  <text class="preview-news-title">{{ n.title }}</text>
                  <text v-if="n.description" class="preview-news-desc">{{ n.description }}</text>
                </view>
                <image v-if="n.pic_url" class="preview-news-img" :src="toWxProxy(n.pic_url)" mode="aspectFill" />
              </view>
            </template>
            <template v-else-if="preview.type === 'transfer'">
              <view class="preview-transfer">正在为您转接人工客服...</view>
            </template>
          </view>
        </view>
      </view>

      <view class="form-actions">
        <button class="btn-secondary" @click="closeForm">取消</button>
        <button class="btn-primary" @click="handleSave" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
      </view>
    </view>

    <!-- ===== 图文封面图：素材库选图浮层 ===== -->
    <view v-if="articlePicOpen" class="material-mask" @click="articlePicOpen = false">
      <view class="material-sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">选择封面图（素材库图片）</text>
          <text class="sheet-close" @click="articlePicOpen = false">✕</text>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <view class="sheet-grid">
            <view v-for="m in articlePics" :key="m.documentId || m.id" class="sheet-item" @click="pickArticlePic(m)">
              <image v-if="m.type === 'image' && (m.wx_url || m.url)" class="sheet-img" :src="toWxProxy(m.wx_url || m.url)" mode="aspectFill" />
              <text v-else class="sheet-icon">🖼️</text>
            </view>
          </view>
          <view v-if="!articlePics.length" class="sheet-empty">素材库暂无图片，请先到「素材库」上传或「从微信获取」</view>
        </scroll-view>
      </view>
    </view>

    <!-- ============ 规则列表 ============ -->
    <view class="data-list">
      <view v-for="item in dataList" :key="item.documentId || item.id" class="data-card">
        <view class="data-info">
          <view class="data-title">
            <text class="rule-tag" :style="{ background: triggerMeta(item.trigger).bg, color: triggerMeta(item.trigger).color }">{{ triggerMeta(item.trigger).label }}</text>
            <text class="rule-name">{{ item.trigger === 'keyword' ? (item.match || '未设置关键字') : (item.name || triggerMeta(item.trigger).label) }}</text>
            <view class="data-status" :class="(item.enabled === false) ? 'inactive' : 'active'">{{ (item.enabled === false) ? '停用' : '启用' }}</view>
          </view>
          <view class="data-meta">
            <text class="meta-item">{{ replyTypeIcon(item.reply_type) }} {{ replyTypeLabel(item.reply_type) }}</text>
            <text class="meta-item" v-if="item.reply_type === 'text'">{{ item.text }}</text>
            <text class="meta-item" v-else-if="['news', 'article'].includes(item.reply_type)">
              {{ Array.isArray(item.articles) && item.articles.length ? `共 ${item.articles.length} 条 · ` : '' }}{{ (Array.isArray(item.articles) ? item.articles[0]?.title : '') || item.title || '图文' }}
            </text>
            <text class="meta-item" v-else-if="item.reply_type === 'music'">{{ item.title || '音乐' }}</text>
            <text class="meta-item" v-else-if="item.reply_type === 'transfer'">转人工客服</text>
            <text class="meta-item" v-else-if="item.media_id">media_id: {{ String(item.media_id).slice(0, 16) }}...</text>
          </view>
          <view class="data-footer">
            <text class="data-date">{{ fmtDateTime(item.updatedAt || item.updated_at) }}</text>
          </view>
        </view>
        <view class="data-actions">
          <view v-if="hasPermission('menu.sso-wx')" class="action-btn edit" @click="openEdit(item)">编辑</view>
          <view v-if="hasPermission('menu.sso-wx')" class="action-btn delete" @click="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && dataList.length === 0" class="empty-state">
      <text class="empty-icon">💬</text>
      <text class="empty-text">暂无回复规则，点击「+ 新建规则」创建</text>
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
import { ssoWxReplyApi, ssoWxMaterialApi } from '../../api/wechat.js'
import { toWxProxy } from '../../utils/format.js'
import { useUserStore } from '../../store/user.js'
import PageHeader from '../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const triggerOptions = [
  { value: 'welcome', label: '欢迎语（关注时回复）' },
  { value: 'fallback', label: '兜底（未匹配时回复）' },
  { value: 'keyword', label: '关键字匹配' },
]

// 微信被动回复全部能力
const replyTypes = [
  { value: 'text', label: '文本', icon: '💬' },
  { value: 'image', label: '图片', icon: '🖼️' },
  { value: 'voice', label: '语音', icon: '🎙️' },
  { value: 'video', label: '视频', icon: '🎬' },
  { value: 'music', label: '音乐', icon: '🎵' },
  { value: 'news', label: '图文', icon: '📰' },
  { value: 'transfer', label: '转客服', icon: '🎧' },
]
const typeIconMap = Object.fromEntries(replyTypes.map(t => [t.value, t.icon]))

const dataList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const showForm = ref(false)
const saving = ref(false)
const form = ref(resetForm())
const materials = ref([])
const loadingMaterials = ref(false)
const expandedArticle = ref(-1)

function emptyArticle() {
  return { title: '', description: '', pic_url: '', url: '' }
}
function resetForm() {
  return {
    id: '',
    trigger: 'keyword',
    match: '',
    reply_type: 'text',
    text: '',
    title: '',
    desc: '',
    link_url: '',
    media_id: '',
    music_url: '',
    hq_music_url: '',
    thumb_media_id: '',
    articles: [emptyArticle()],
    enabled: true,
  }
}

const triggerIndex = computed(() => Math.max(0, triggerOptions.findIndex(t => t.value === form.value.trigger)))
const materialTypeLabel = computed(() => ({ image: '图片', voice: '语音', video: '视频' }[form.value.reply_type] || form.value.reply_type))
const selectedMaterial = computed(() => materials.value.find(m => m.media_id === form.value.media_id) || null)
const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

// 回复预览（形象化）
const preview = computed(() => {
  const f = form.value
  const base = { type: f.reply_type }
  if (f.reply_type === 'text') return { ...base, text: f.text || '（空）' }
  if (f.reply_type === 'image') return { ...base, thumb: selectedMaterial.value?.wx_url || '' }
  if (f.reply_type === 'voice') return { ...base, voiceLen: 8 }
  if (f.reply_type === 'video') return { ...base, title: f.title }
  if (f.reply_type === 'music') return { ...base, title: f.title, desc: f.desc }
  if (f.reply_type === 'news') return { ...base, articles: f.articles.filter(a => a.title) }
  if (f.reply_type === 'transfer') return base
  return null
})

function replyTypeLabel(v) {
  return replyTypes.find(t => t.value === (v === 'article' ? 'news' : v))?.label || v || '未知'
}
function replyTypeIcon(v) {
  return typeIconMap[v === 'article' ? 'news' : v] || '💬'
}
function triggerMeta(value) {
  const map = {
    welcome: { label: '欢迎语', bg: '#e6f4ff', color: '#1677ff' },
    fallback: { label: '兜底', bg: '#fff7e6', color: '#fa8c16' },
    keyword: { label: '关键字', bg: '#f6ffed', color: '#07c160' },
  }
  return map[value] || { label: value || '-', bg: '#f5f5f5', color: '#666' }
}
function fmtDateTime(dt) {
  if (!dt) return '-'
  return String(dt).replace('T', ' ').substring(0, 19)
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const { list, pagination: pg } = await ssoWxReplyApi.list({
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
  // 旧 article 兼容：映射为 news + 单条 articles
  let articles = item.articles
  if (item.reply_type === 'article') {
    articles = [{ title: item.title || '', description: item.desc || '', pic_url: item.pic_url || '', url: item.link_url || '' }]
  }
  if (!Array.isArray(articles) || !articles.length) articles = [emptyArticle()]
  form.value = {
    // 后端 sso-wx-reply 接口只认数字 id（where: { id }），documentId 会导致 Number()=NaN
    id: item.id || item.documentId,
    trigger: item.trigger || 'keyword',
    match: item.match || '',
    reply_type: item.reply_type === 'article' ? 'news' : (item.reply_type || 'text'),
    text: item.text || '',
    title: item.title || '',
    desc: item.desc || item.description || '',
    link_url: item.link_url || '',
    media_id: item.media_id || '',
    music_url: item.music_url || '',
    hq_music_url: item.hq_music_url || '',
    thumb_media_id: item.thumb_media_id || '',
    articles,
    enabled: item.enabled !== false,
  }
  materials.value = []
  expandedArticle.value = -1
  showForm.value = true
}

function closeForm() { showForm.value = false }

function onTriggerChange(e) { form.value.trigger = triggerOptions[e.detail.value].value }
function onReplyTypeChange(value) {
  form.value.reply_type = value
  materials.value = []
  expandedArticle.value = -1
  if (['image', 'voice', 'video', 'music'].includes(value)) loadMaterials(value === 'music' ? 'thumb' : value)
}

// ===== 素材联动 =====
async function loadMaterials(type) {
  loadingMaterials.value = true
  try {
    const { list } = await ssoWxMaterialApi.list({ type, 'pagination[pageSize]': 30 })
    materials.value = list || []
    if (!materials.value.length && type !== 'thumb') {
      uni.showToast({ title: '素材库暂无该类素材', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '加载素材失败', icon: 'none' })
  } finally {
    loadingMaterials.value = false
  }
}
function pickMaterial(m) {
  form.value.media_id = m.media_id
  uni.showToast({ title: '已选择素材', icon: 'success' })
}
function pickThumb(m) {
  form.value.thumb_media_id = m.media_id
  uni.showToast({ title: '已选择缩略图', icon: 'success' })
}

// ===== 图文编辑 =====
function toggleArticle(i) { expandedArticle.value = expandedArticle.value === i ? -1 : i }
function addArticle() {
  if (form.value.articles.length >= 8) return
  form.value.articles.push(emptyArticle())
  expandedArticle.value = form.value.articles.length - 1
}
function removeArticle(i) {
  form.value.articles.splice(i, 1)
  expandedArticle.value = -1
  if (!form.value.articles.length) form.value.articles.push(emptyArticle())
}
function moveArticle(i, dir) {
  const target = i + dir
  if (target < 0 || target >= form.value.articles.length) return
  const arr = form.value.articles
  ;[arr[i], arr[target]] = [arr[target], arr[i]]
  expandedArticle.value = target
}

// ===== 图文封面图：从素材库选择 =====
async function openArticlePic(i) {
  articlePicIndex.value = i
  articlePicOpen.value = true
  if (!articlePics.value.length) {
    try {
      const { list } = await ssoWxMaterialApi.list({ type: 'image', 'pagination[pageSize]': 30 })
      articlePics.value = list || []
    } catch (e) {
      uni.showToast({ title: '加载素材失败', icon: 'none' })
    }
  }
}
function pickArticlePic(m) {
  // 提交给微信用原始 wx_url；展示层预览经 toWxProxy 代理
  const target = form.value.articles[articlePicIndex.value]
  if (target) target.pic_url = m.wx_url || m.url || ''
  articlePicOpen.value = false
  uni.showToast({ title: '已设置封面图', icon: 'success' })
}

// ===== 保存 =====
function validate() {
  const f = form.value
  if (f.trigger === 'keyword' && !f.match) return '请填写关键字'
  const t = f.reply_type
  if (t === 'text' && !f.text) return '请填写回复文本'
  if (['image', 'voice', 'video'].includes(t) && !f.media_id) return '请选择素材'
  if (t === 'music') {
    if (!f.title) return '请填写音乐标题'
    if (!f.music_url) return '请填写音乐链接 URL'
  }
  if (t === 'news') {
    const valid = f.articles.filter(a => a.title)
    if (!valid.length) return '请至少填写一条图文标题'
  }
  return ''
}

async function handleSave() {
  const err = validate()
  if (err) {
    uni.showToast({ title: err, icon: 'none' })
    return
  }
  saving.value = true
  const payload = {
    trigger: form.value.trigger,
    match: form.value.match,
    reply_type: form.value.reply_type,
    text: form.value.text,
    title: form.value.title,
    desc: form.value.desc,
    link_url: form.value.link_url,
    media_id: form.value.media_id,
    music_url: form.value.music_url,
    hq_music_url: form.value.hq_music_url,
    thumb_media_id: form.value.thumb_media_id,
    articles: form.value.reply_type === 'news' ? form.value.articles.filter(a => a.title) : null,
    enabled: form.value.enabled,
  }
  try {
    if (form.value.id) {
      await ssoWxReplyApi.update(form.value.id, payload)
    } else {
      await ssoWxReplyApi.create(payload)
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

function handleDelete(item) {
  const id = item.id || item.documentId
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条回复规则吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await ssoWxReplyApi.delete(id)
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

onShow(() => loadData(1))
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
.form-picker { width: 100%; height: 72rpx; line-height: 72rpx; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box; color: #333; }
.form-hint { display: block; font-size: 24rpx; color: #999; margin-top: 6rpx; }
.warn-hint { color: #fa8c16; }
.form-actions { display: flex; justify-content: flex-end; gap: 20rpx; }

/* 类型图标卡片 */
.type-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.type-card { width: calc((100% - 64rpx) / 5); background: #f5f5f5; border: 2rpx solid transparent; border-radius: 12rpx; padding: 20rpx 0; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.type-card.active { background: #e6f4ff; border-color: #1677ff; }
.type-icon { font-size: 44rpx; }
.type-label { font-size: 24rpx; color: #333; }

/* 素材选择 */
.material-picker-btn { background: #e6f4ff; color: #1677ff; border: 2rpx dashed #91caff; border-radius: 12rpx; padding: 20rpx; text-align: center; font-size: 28rpx; }
.material-selected { display: flex; align-items: center; gap: 16rpx; background: #f6ffed; border: 2rpx solid #b7eb8f; border-radius: 12rpx; padding: 16rpx 20rpx; }
.material-thumb-img { width: 80rpx; height: 80rpx; border-radius: 8rpx; }
.material-thumb-icon { font-size: 48rpx; }
.material-selected-info { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.material-name { font-size: 28rpx; color: #333; }
.material-media { font-size: 22rpx; color: #999; }
.material-change { color: #1677ff; font-size: 26rpx; }
.material-list { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 16rpx; }
.material-item { width: calc((100% - 32rpx) / 3); border: 2rpx solid #eee; border-radius: 12rpx; padding: 16rpx; display: flex; flex-direction: column; align-items: center; gap: 8rpx; background: #fafafa; }
.material-item.picked { border-color: #1677ff; background: #e6f4ff; }
.material-img { width: 100%; height: 120rpx; border-radius: 8rpx; }
.material-icon { font-size: 56rpx; }
.material-item-name { font-size: 22rpx; color: #333; text-align: center; }
/* 图文封面图：素材库选图 */
.pic-row { display: flex; align-items: center; gap: 12rpx; }
.pic-thumb { width: 80rpx; height: 80rpx; border-radius: 8rpx; flex-shrink: 0; background: #f5f5f5; }
.pic-input { flex: 1; }
.pic-btn { padding: 12rpx 20rpx; background: #e6f4ff; color: #1677ff; border-radius: 8rpx; font-size: 24rpx; flex-shrink: 0; }
.material-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: flex-end; }
.material-sheet { width: 100%; max-height: 70vh; background: #fff; border-radius: 24rpx 24rpx 0 0; display: flex; flex-direction: column; }
.sheet-head { display: flex; justify-content: space-between; align-items: center; padding: 30rpx; border-bottom: 2rpx solid #f0f0f0; }
.sheet-title { font-size: 30rpx; font-weight: bold; color: #333; }
.sheet-close { font-size: 36rpx; color: #999; padding: 0 12rpx; }
.sheet-body { max-height: 60vh; padding: 20rpx; box-sizing: border-box; }
.sheet-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.sheet-item { width: calc((100% - 32rpx) / 3); height: 200rpx; background: #f5f5f5; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.sheet-img { width: 100%; height: 100%; }
.sheet-icon { font-size: 60rpx; }
.sheet-empty { text-align: center; color: #999; font-size: 26rpx; padding: 80rpx 0; }

/* 图文编辑器 */
.article-editor { display: flex; flex-direction: column; gap: 16rpx; }
.article-card { border: 2rpx solid #eee; border-radius: 12rpx; overflow: hidden; }
.article-head { display: flex; align-items: center; gap: 12rpx; padding: 20rpx; background: #fafafa; }
.article-index { width: 40rpx; height: 40rpx; border-radius: 50%; background: #1677ff; color: #fff; font-size: 24rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.article-title { flex: 1; font-size: 26rpx; color: #333; }
.article-op { display: flex; gap: 16rpx; }
.op-btn { font-size: 28rpx; color: #1677ff; padding: 4rpx 10rpx; }
.op-btn.disabled { color: #ccc; }
.op-btn.del { color: #ff4d4f; }
.article-body { padding: 20rpx; border-top: 2rpx solid #f0f0f0; }
.form-item.sub { margin-bottom: 16rpx; }
.article-add { border: 2rpx dashed #91caff; color: #1677ff; border-radius: 12rpx; padding: 20rpx; text-align: center; font-size: 28rpx; }

.transfer-tip { display: flex; align-items: flex-start; gap: 12rpx; background: #fff7e6; border: 2rpx solid #ffd591; border-radius: 12rpx; padding: 20rpx; font-size: 26rpx; color: #d46b08; }
.transfer-icon { font-size: 36rpx; }

/* 回复预览 */
.preview-block { margin-top: 8rpx; margin-bottom: 24rpx; }
.preview-title { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; }
.preview-chat { background: #ededed; border-radius: 12rpx; padding: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.preview-user { align-self: flex-end; background: #95ec69; color: #333; border-radius: 8rpx; padding: 12rpx 20rpx; font-size: 26rpx; max-width: 70%; }
.preview-reply { align-self: flex-start; max-width: 80%; }
.preview-text { background: #fff; border-radius: 8rpx; padding: 12rpx 20rpx; font-size: 26rpx; color: #333; }
.preview-media { background: #fff; border-radius: 8rpx; padding: 16rpx; display: flex; align-items: center; gap: 12rpx; }
.preview-img { width: 200rpx; height: 200rpx; border-radius: 8rpx; }
.preview-media-icon { font-size: 64rpx; }
.preview-media-name { font-size: 26rpx; color: #333; }
.preview-voice { background: #fff; border-radius: 8rpx; padding: 14rpx 20rpx; font-size: 26rpx; color: #333; }
.preview-music { background: #fff; border-radius: 8rpx; padding: 16rpx; display: flex; align-items: center; gap: 16rpx; }
.preview-music-icon { font-size: 48rpx; }
.preview-music-info { display: flex; flex-direction: column; gap: 4rpx; }
.preview-music-title { font-size: 26rpx; color: #333; }
.preview-music-desc { font-size: 22rpx; color: #999; }
.preview-news { background: #fff; border-radius: 8rpx; padding: 16rpx; margin-top: 12rpx; display: flex; gap: 12rpx; }
.preview-news:first-child { margin-top: 0; }
.preview-news-text { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.preview-news-title { font-size: 26rpx; color: #333; font-weight: bold; }
.preview-news-desc { font-size: 22rpx; color: #999; }
.preview-news-img { width: 120rpx; height: 120rpx; border-radius: 8rpx; flex-shrink: 0; }
.preview-transfer { background: #fff; border-radius: 8rpx; padding: 14rpx 20rpx; font-size: 26rpx; color: #999; }

.data-list { display: flex; flex-direction: column; gap: 20rpx; }
.data-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: flex-start; }
.data-info { flex: 1; display: flex; flex-direction: column; }
.data-title { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.rule-tag { padding: 4rpx 16rpx; border-radius: 6rpx; font-size: 24rpx; flex-shrink: 0; }
.rule-name { font-size: 30rpx; font-weight: bold; color: #333; }
.data-status { padding: 4rpx 16rpx; border-radius: 4rpx; font-size: 22rpx; color: #fff; }
.data-status.active { background: #07c160; }
.data-status.inactive { background: #999; }
.data-meta { display: flex; flex-wrap: wrap; gap: 16rpx; }
.meta-item { font-size: 24rpx; color: #999; }
.data-footer { display: flex; justify-content: space-between; margin-top: 12rpx; }
.data-date { font-size: 22rpx; color: #999; }
.data-actions { display: flex; flex-direction: column; gap: 12rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>
