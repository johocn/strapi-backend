<template>
  <view class="page-container">
    <PageHeader title="菜单管理">
      <button class="btn-primary" @click="openCreate" v-if="hasPermission('menu.sso-wx')">+ 新建</button>
    </PageHeader>

    <view class="help-banner">
      <text class="help-icon">ℹ️</text>
      <text class="help-text">自定义菜单以 JSON 形式编辑（menu_json），保存后点击「发布下发」同步到公众号，最多 3 个一级菜单、每个最多 5 个子菜单。</text>
    </view>

    <view class="action-bar">
      <button class="btn-publish" @click="handlePublish" :disabled="publishing">{{ publishing ? '发布中...' : '发布下发' }}</button>
      <button class="btn-danger" @click="handleDeleteRemote" v-if="hasPermission('menu.sso-wx')">删除远程菜单</button>
    </view>

    <!-- 新建/编辑表单 -->
    <view v-if="showForm" class="form-card">
      <view class="section-title">{{ form.id ? '编辑菜单' : '新建菜单' }}</view>
      <view class="form-item">
        <text class="form-label">菜单名称<text class="required-mark">*</text></text>
        <input v-model="form.name" class="form-input" placeholder="如：主菜单" />
      </view>
      <view class="form-item">
        <text class="form-label">menu_json<text class="required-mark">*</text></text>
        <textarea v-model="form.menu_json" class="form-textarea" placeholder='[{"name":"菜单","sub_button":[{"name":"子菜单","type":"view","url":"https://..."}]}]' />
        <text class="form-hint">微信菜单 JSON 结构，一级 button + 可选 sub_button</text>
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
            <text class="menu-name">{{ item.name || '未命名菜单' }}</text>
            <view class="data-status" :class="menuState(item).cls">{{ menuState(item).label }}</view>
          </view>
          <view class="data-meta">
            <text class="meta-item">菜单 JSON：</text>
          </view>
          <view class="json-preview"><text class="json-text">{{ item.menu_json || JSON.stringify(item.buttons || []) }}</text></view>
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
      <text class="empty-icon">📱</text>
      <text class="empty-text">暂无菜单，点击「+ 新建」创建</text>
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
import { ssoWxMenuApi } from '../../../api/wechat.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const dataList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const showForm = ref(false)
const saving = ref(false)
const publishing = ref(false)
const form = ref({ id: '', name: '', menu_json: '' })

const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

function fmtDateTime(dt) {
  if (!dt) return '-'
  return String(dt).replace('T', ' ').substring(0, 19)
}

function menuState(item) {
  if (item.is_published || item.published) return { cls: 'active', label: '已发布' }
  return { cls: 'inactive', label: '未发布' }
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const { list, pagination: pg } = await ssoWxMenuApi.list({
      'pagination[page]': page,
      'pagination[pageSize]': 10,
    })
    dataList.value = (list || []).map(m => ({
      ...m,
      menu_json: m.menu_json && typeof m.menu_json === 'object'
        ? JSON.stringify(m.menu_json, null, 2)
        : (m.menu_json || ''),
    }))
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = { id: '', name: '', menu_json: '' }
  showForm.value = true
}

function openEdit(item) {
  form.value = {
    id: item.documentId || item.id,
    name: item.name || '',
    menu_json: item.menu_json || '',
  }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
}

function parseMenuJson(str) {
  if (!str || !str.trim()) return null
  const parsed = JSON.parse(str)
  return typeof parsed === 'object' ? parsed : null
}

async function handleSave() {
  if (!form.value.name) {
    uni.showToast({ title: '请填写菜单名称', icon: 'none' })
    return
  }
  if (!form.value.menu_json || !form.value.menu_json.trim()) {
    uni.showToast({ title: '请填写 menu_json', icon: 'none' })
    return
  }
  let menuJson
  try {
    menuJson = parseMenuJson(form.value.menu_json)
  } catch (e) {
    uni.showToast({ title: 'menu_json 格式错误', icon: 'none' })
    return
  }
  saving.value = true
  try {
    const payload = { name: form.value.name, menu_json: menuJson }
    if (form.value.id) {
      await ssoWxMenuApi.update(form.value.id, payload)
    } else {
      await ssoWxMenuApi.create(payload)
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
  const id = item.documentId || item.id
  uni.showModal({
    title: '确认删除',
    content: `确定要删除「${item.name || '该菜单'}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await ssoWxMenuApi.delete(id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

function publishOneMenu(item) {
  const id = item.documentId || item.id
  return ssoWxMenuApi.publish(id, { name: item.name }).then(() => ({ id, name: item.name }))
}

async function handlePublish() {
  if (dataList.value.length === 0) {
    uni.showToast({ title: '请先创建菜单', icon: 'none' })
    return
  }
  // 单个直接发布；多个用 actionSheet 选择
  const targets = dataList.value.filter(m => m.documentId || m.id).slice()
  if (targets.length === 1) {
    uni.showModal({
      title: '发布下发',
      content: `确定将菜单「${targets[0].name || '未命名'}」发布到公众号吗？`,
      success: (res) => {
        if (res.confirm) doPublish([targets[0]])
      },
    })
    return
  }
  uni.showActionSheet({
    itemList: targets.map(m => `${m.name || '未命名'}${m.is_published || m.published ? '（已发布）' : ''}`),
    success: (res) => {
      doPublish([targets[res.tapIndex]])
    },
  })
}

async function doPublish(list) {
  publishing.value = true
  try {
    for (const item of list) {
      await publishOneMenu(item)
    }
    uni.showToast({ title: '发布成功', icon: 'success' })
    loadData(currentPage.value)
  } catch (e) {
    uni.showToast({ title: '发布失败', icon: 'none' })
  } finally {
    publishing.value = false
  }
}

function handleDeleteRemote() {
  uni.showModal({
    title: '删除远程菜单',
    content: '将删除公众号上已下发的菜单，确定继续吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await ssoWxMenuApi.deleteRemote()
          uni.showToast({ title: '已删除', icon: 'success' })
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
.action-bar { display: flex; gap: 20rpx; margin-bottom: 20rpx; }
.btn-publish { flex: 1; background: #07c160; color: #fff; border: none; border-radius: 8rpx; font-size: 28rpx; padding: 20rpx 0; }
.btn-danger { flex: 1; background: #ff4d4f; color: #fff; border: none; border-radius: 8rpx; font-size: 28rpx; padding: 20rpx 0; }
.form-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; padding-left: 8rpx; border-left: 6rpx solid #ff0000; }
.form-item { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; }
.required-mark { color: #ff4d4f; margin-left: 4rpx; }
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.form-textarea { width: 100%; min-height: 240rpx; padding: 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx; box-sizing: border-box; font-family: monospace; }
.form-hint { display: block; font-size: 24rpx; color: #999; margin-top: 6rpx; }
.form-actions { display: flex; justify-content: flex-end; gap: 20rpx; }
.data-list { display: flex; flex-direction: column; gap: 20rpx; }
.data-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: flex-start; }
.data-info { flex: 1; display: flex; flex-direction: column; }
.data-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; display: flex; align-items: center; gap: 16rpx; }
.menu-name { font-size: 30rpx; font-weight: bold; color: #333; }
.data-status { padding: 4rpx 16rpx; border-radius: 4rpx; font-size: 22rpx; color: #fff; }
.data-status.active { background: #07c160; }
.data-status.inactive { background: #999; }
.meta-item { font-size: 24rpx; color: #999; }
.json-preview { background: #f5f5f5; border-radius: 8rpx; padding: 16rpx; margin: 12rpx 0; max-height: 200rpx; overflow-y: auto; }
.json-text { font-size: 24rpx; color: #555; font-family: monospace; word-break: break-all; white-space: pre-wrap; }
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