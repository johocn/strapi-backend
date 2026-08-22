<template>
  <view class="page-container">
    <PageHeader title="场地管理">
      <view class="btn-group">
        <button class="btn-primary" @click="openEdit()">+ 新建场地</button>
      </view>
    </PageHeader>

    <view class="filter-row">
      <view class="filter-item" @click="toggleDisabled">
        <text>{{ includeDisabled ? '含停用' : '仅启用' }}</text>
        <text class="arrow">▼</text>
      </view>
    </view>

    <view class="res-list" v-if="!loading && list.length > 0">
      <view v-for="item in list" :key="item.documentId || item.id" class="res-card" :class="{ disabled: item.disabled }">
        <view class="card-header">
          <text class="card-title">{{ item.name || '-' }}</text>
          <text class="status-badge" :class="item.disabled ? 'off' : 'on'">{{ item.disabled ? '已停用' : '启用' }}</text>
        </view>
        <view class="card-meta">
          <text class="meta-item">缓冲: {{ item.defaultBufferMin ?? 15 }} 分钟</text>
          <text v-if="hasGeo(item)" class="meta-item">📍 {{ item.lat }}, {{ item.lng }}</text>
        </view>
        <view v-if="item.desc" class="card-desc">{{ item.desc }}</view>
        <view class="card-actions">
          <view class="action-btn" @click="openEdit(item)">编辑</view>
          <view class="action-btn" @click="goSchedule(item)">档期</view>
          <view class="action-btn danger" @click="toggleItem(item)">{{ item.disabled ? '启用' : '停用' }}</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && list.length === 0" class="empty-state">
      <text class="empty-icon">🏢</text>
      <text class="empty-text">暂无场地</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <!-- 新建/编辑弹窗 -->
    <view class="modal-mask" v-if="showEditModal" @click="closeEdit">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editing ? '编辑场地' : '新建场地' }}</text>
          <text class="modal-close" @click="closeEdit">✕</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">场地名称 <text class="required">*</text></text>
            <input type="text" v-model="form.name" placeholder="场地名称" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">描述</text>
            <textarea v-model="form.desc" placeholder="场地说明" class="form-textarea" />
          </view>
          <view class="form-item">
            <text class="form-label">默认缓冲(分钟)</text>
            <input type="number" v-model="form.defaultBufferMin" placeholder="默认15" class="form-input" />
          </view>
          <view class="form-row">
            <view class="form-item half">
              <text class="form-label">纬度 lat</text>
              <input type="digit" v-model="form.lat" placeholder="纬度" class="form-input" />
            </view>
            <view class="form-item half">
              <text class="form-label">经度 lng</text>
              <input type="digit" v-model="form.lng" placeholder="经度" class="form-input" />
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeEdit">取消</button>
          <button class="btn-submit" @click="saveItem" :loading="saving">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { listVenues, createVenue, updateVenue, deleteVenue } from '../../api/resource.js'
import PageHeader from '../../components/PageHeader.vue'

const list = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const includeDisabled = ref(false)

const showEditModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const form = ref({ name: '', desc: '', defaultBufferMin: 15, lat: '', lng: '' })

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

function hasGeo(item) { return item.lat != null && item.lng != null }

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { page, pageSize: pagination.value.pageSize }
    if (includeDisabled.value) params.includeDisabled = 'true'
    const res = await listVenues(params)
    list.value = res.list || []
    pagination.value = res.pagination || { page: 1, pageSize: 20, total: 0 }
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function toggleDisabled() {
  includeDisabled.value = !includeDisabled.value
  loadData(1)
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }

function openEdit(item) {
  editing.value = item || null
  form.value = item
    ? { name: item.name, desc: item.desc, defaultBufferMin: item.defaultBufferMin ?? 15, lat: item.lat ?? '', lng: item.lng ?? '' }
    : { name: '', desc: '', defaultBufferMin: 15, lat: '', lng: '' }
  showEditModal.value = true
}
function closeEdit() {
  showEditModal.value = false
  editing.value = null
}
async function saveItem() {
  if (!form.value.name.trim()) return uni.showToast({ title: '请输入场地名称', icon: 'none' })
  saving.value = true
  try {
    const data = {
      name: form.value.name.trim(),
      desc: form.value.desc || undefined,
      defaultBufferMin: Number(form.value.defaultBufferMin) || 15,
      lat: form.value.lat === '' ? undefined : Number(form.value.lat),
      lng: form.value.lng === '' ? undefined : Number(form.value.lng)
    }
    if (editing.value) await updateVenue(editing.value.documentId, data)
    else await createVenue(data)
    uni.showToast({ title: '保存成功', icon: 'success' })
    closeEdit()
    loadData(currentPage.value)
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

async function toggleItem(item) {
  try {
    await deleteVenue(item.documentId) // 软删：置 disabled=true
    uni.showToast({ title: '操作成功', icon: 'success' })
    loadData(currentPage.value)
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function goSchedule(item) {
  uni.navigateTo({ url: `/pages/activity/resource-schedule?type=venue&id=${item.id}&name=${encodeURIComponent(item.name || '')}` })
}

onMounted(() => loadData(1))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 40rpx; border: none; line-height: 1.2; }
.btn-group { display: flex; gap: 16rpx; align-items: center; }
.filter-row { margin-bottom: 20rpx; }
.filter-item { display: inline-flex; align-items: center; gap: 8rpx; padding: 12rpx 24rpx; background: #fff; border-radius: 8rpx; font-size: 26rpx; }
.arrow { font-size: 20rpx; color: #999; }

.res-list { display: flex; flex-direction: column; gap: 16rpx; }
.res-card { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.res-card.disabled { opacity: .6; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-title { font-size: 30rpx; font-weight: bold; color: #333; flex: 1; margin-right: 12rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-badge.on { background: #f6ffed; color: #52c41a; }
.status-badge.off { background: #f5f5f5; color: #999; }
.card-meta { display: flex; gap: 16rpx; margin-bottom: 8rpx; flex-wrap: wrap; }
.meta-item { font-size: 24rpx; color: #999; }
.card-desc { font-size: 24rpx; color: #666; margin-bottom: 8rpx; }
.card-actions { display: flex; gap: 10rpx; border-top: 1rpx solid #f0f0f0; padding-top: 16rpx; }
.action-btn { flex: 1; padding: 12rpx 0; border-radius: 8rpx; font-size: 26rpx; text-align: center; background: #f5f5f5; color: #333; font-weight: bold; }
.action-btn.danger { background: #fff1f0; color: #ff4d4f; }

.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }

.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal-content { width: 90%; background: #fff; border-radius: 16rpx; overflow: hidden; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 30rpx; border-bottom: 1rpx solid #f0f0f0; }
.modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.modal-close { font-size: 36rpx; color: #999; padding: 10rpx; }
.modal-body { padding: 30rpx; }
.modal-footer { display: flex; gap: 20rpx; padding: 20rpx 30rpx; border-top: 1rpx solid #f0f0f0; }
.form-item { margin-bottom: 24rpx; }
.form-row { display: flex; gap: 20rpx; }
.form-item.half { flex: 1; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 10rpx; }
.required { color: #ff4d4f; }
.form-input { width: 100%; height: 76rpx; border: 1rpx solid #ddd; border-radius: 10rpx; padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box; }
.form-textarea { width: 100%; height: 120rpx; border: 1rpx solid #ddd; border-radius: 10rpx; padding: 16rpx 20rpx; font-size: 28rpx; box-sizing: border-box; }
.btn-cancel { flex: 1; height: 84rpx; line-height: 84rpx; text-align: center; background: #f5f5f5; color: #666; font-size: 30rpx; border-radius: 8rpx; border: none; }
.btn-submit { flex: 1; height: 84rpx; line-height: 84rpx; text-align: center; background: #667eea; color: #fff; font-size: 30rpx; border-radius: 8rpx; border: none; }
</style>