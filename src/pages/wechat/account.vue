<template>
  <view class="page-container">
    <PageHeader title="公众号发布账号">
      <button class="btn-primary" @click="openCreate" v-if="hasPermission('menu.sso-wx')">+ 新建账号</button>
    </PageHeader>

    <view class="help-banner">
      <text class="help-icon">ℹ️</text>
      <text class="help-text">配置公众号图文草稿与发布所用账号（关联多媒体发布中心账号体系）。发布时会优先使用此处激活账号的 appId / appSecret 换取 access_token；未配置任何账号时回退到公众号接入配置（server-config）的凭据，但发布台账不关联账号。</text>
    </view>

    <!-- 新建/编辑表单 -->
    <view v-if="showForm" class="form-card">
      <view class="section-title">{{ form.id ? '编辑账号' : '新建账号' }}</view>

      <view class="form-item">
        <text class="form-label">账号名称<text class="required-mark">*</text></text>
        <input v-model="form.name" class="form-input" placeholder="如：主号 / 集团号" />
      </view>

      <view class="form-item">
        <text class="form-label">appId（AppID）<text class="required-mark">*</text></text>
        <input v-model="form.config_appId" class="form-input" placeholder="wx9a0..." />
      </view>

      <view class="form-item">
        <text class="form-label">appSecret（AppSecret）<text class="required-mark">*</text></text>
        <input v-model="form.config_appSecret" class="form-input" placeholder="公众号后台 App 密钥" :password="true" />
      </view>

      <view class="form-item">
        <text class="form-label">启用</text>
        <switch :checked="form.is_active" color="#07c160" @change="onActiveChange" />
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
            <text class="rule-tag trigger">公众号账号</text>
            <text class="rule-name">{{ item.name || '-' }}</text>
            <view class="data-status" :class="item.is_active === false ? 'inactive' : 'active'">{{ item.is_active === false ? '停用' : '启用' }}</view>
          </view>
          <view class="data-meta">
            <text class="meta-item">appId: {{ (item.config && (item.config.appId || item.config.appid)) || '-' }}</text>
          </view>
          <view class="data-meta">
            <text class="meta-item">发布类型: 图文草稿 + 发布</text>
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
      <text class="empty-icon">🔑</text>
      <text class="empty-text">暂无发布账号，点击「+ 新建账号」配置公众号 appId/appSecret</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ssoWxPublishAccountApi } from '../../../api/wechat.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const dataList = ref([])
const loading = ref(false)
const showForm = ref(false)
const saving = ref(false)
const form = ref(resetForm())

let wxPlatformId = ''

function resetForm() {
  return { id: '', name: '', config_appId: '', config_appSecret: '', is_active: true }
}

function fmtDateTime(dt) {
  if (!dt) return '-'
  return String(dt).replace('T', ' ').substring(0, 19)
}

async function loadData() {
  loading.value = true
  try {
    wxPlatformId = await ssoWxPublishAccountApi.ensureWechatPlatform()
    const { list } = await ssoWxPublishAccountApi.list(wxPlatformId)
    dataList.value = list
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
  const cfg = item.config || {}
  form.value = {
    id: item.documentId || item.id,
    name: item.name || '',
    config_appId: cfg.appId || cfg.appid || '',
    // 编辑时不清空原 appSecret，留空表示不修改
    config_appSecret: '',
    is_active: item.is_active !== false,
  }
  showForm.value = true
}

function closeForm() { showForm.value = false }
function onActiveChange(e) { form.value.is_active = e.detail.value }

async function handleSave() {
  if (!form.value.name) { uni.showToast({ title: '请填写账号名称', icon: 'none' }); return }
  if (!form.value.config_appId) { uni.showToast({ title: '请填写 appId', icon: 'none' }); return }
  if (!form.value.id && !form.value.config_appSecret) { uni.showToast({ title: '请填写 appSecret', icon: 'none' }); return }

  saving.value = true
  const cfg = Object.assign({}, existingConfig())
  cfg.appId = form.value.config_appId
  if (form.value.config_appSecret) cfg.appSecret = form.value.config_appSecret

  const payload = {
    name: form.value.name,
    platform: wxPlatformId,
    is_active: form.value.is_active,
    config: cfg,
  }
  try {
    if (form.value.id) {
      await ssoWxPublishAccountApi.update(form.value.id, payload)
    } else {
      await ssoWxPublishAccountApi.create(payload)
    }
    uni.showToast({ title: '保存成功', icon: 'success' })
    closeForm()
    await loadData()
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

// 编辑时保留未被表单覆盖的 config 字段（name 等），避免 JSON 整体被覆盖
function existingConfig() {
  const item = dataList.value.find((x) => (x.documentId || x.id) === form.value.id)
  const cfg = (item && item.config) || {}
  const out = {}
  for (const k of Object.keys(cfg)) {
    if (k !== 'appId' && k !== 'appid' && k !== 'appSecret' && k !== 'appsecret') out[k] = cfg[k]
  }
  return out
}

function handleDelete(item) {
  const id = item.documentId || item.id
  uni.showModal({
    title: '确认删除',
    content: '确定要删除该发布账号吗？删除后公众号图文发布将回退到公众号接入配置凭据。',
    success: async (res) => {
      if (res.confirm) {
        try {
          await ssoWxPublishAccountApi.remove(id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          await loadData()
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

onShow(loadData)
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
.form-actions { display: flex; justify-content: flex-end; gap: 20rpx; }
.data-list { display: flex; flex-direction: column; gap: 20rpx; }
.data-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: flex-start; }
.data-info { flex: 1; display: flex; flex-direction: column; }
.data-title { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.rule-tag { padding: 4rpx 16rpx; border-radius: 6rpx; font-size: 24rpx; flex-shrink: 0; }
.rule-tag.trigger { background: #e6f4ff; color: #1677ff; }
.rule-name { font-size: 30rpx; font-weight: bold; color: #333; }
.data-status { padding: 4rpx 16rpx; border-radius: 4rpx; font-size: 22rpx; color: #fff; }
.data-status.active { background: #07c160; }
.data-status.inactive { background: #999; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.data-footer { display: flex; justify-content: space-between; margin-top: 12rpx; }
.data-date { font-size: 22rpx; color: #999; }
.data-actions { display: flex; flex-direction: column; gap: 12rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }
</style>