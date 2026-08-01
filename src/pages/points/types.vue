<template>
  <view class="page-container">
    <PageHeader title="积分类型">
      <view class="header-right">
        <button class="btn-primary" @click="openAdd" v-if="hasPermission('menu.point-type')">+ 新增</button>
      </view>
    </PageHeader>

    <view class="type-list">
      <view
        v-for="item in list"
        :key="item.documentId"
        class="type-card"
      >
        <view class="type-info">
          <view class="type-name-row">
            <text class="type-name">{{ item.name }}</text>
            <view class="status-badge" :class="item.enabled ? 'active' : 'inactive'">
              {{ item.enabled ? '启用' : '禁用' }}
            </view>
          </view>
          <view class="type-meta">
            <text class="meta-item">代码: {{ item.code }}</text>
            <text class="meta-item">{{ item.canExpire ? `${item.expireDays}天过期` : '不过期' }}</text>
          </view>
          <view class="type-desc" v-if="item.description">{{ item.description }}</view>
        </view>
        <view class="type-actions" v-if="hasPermission('menu.point-type')">
          <view class="action-btn edit" @click="openEdit(item)">编辑</view>
          <view class="action-btn delete" @click="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && list.length === 0" class="empty-state">
      <text class="empty-icon">🏷️</text>
      <text class="empty-text">暂无积分类型</text>
      <button class="btn-primary" @click="openAdd" v-if="hasPermission('menu.point-type')">立即添加</button>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <!-- 新增/编辑弹窗 -->
    <view class="modal-mask" v-if="showModal" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isEdit ? '编辑积分类型' : '新增积分类型' }}</text>
          <text class="modal-close" @click="closeModal">✕</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">类型名称 <text class="required">*</text></text>
            <input type="text" v-model="form.name" placeholder="请输入类型名称" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">类型代码 <text class="required">*</text></text>
            <input type="text" v-model="form.code" placeholder="请输入类型代码" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">描述</text>
            <textarea v-model="form.description" placeholder="请输入描述" class="form-textarea" />
          </view>
          <view class="form-item switch-row">
            <text class="form-label">启用状态</text>
            <switch :checked="form.enabled" @change="form.enabled = $event.detail.value" color="#07c160" />
          </view>
          <view class="form-item switch-row">
            <text class="form-label">是否可过期</text>
            <switch :checked="form.canExpire" @change="form.canExpire = $event.detail.value" color="#07c160" />
          </view>
          <view class="form-item" v-if="form.canExpire">
            <text class="form-label">过期天数</text>
            <input type="number" v-model="form.expireDays" placeholder="请输入过期天数" class="form-input" />
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeModal">取消</button>
          <button class="btn-submit" @click="handleSubmit" :loading="submitting">
            {{ isEdit ? '保存' : '创建' }}
          </button>
        </view>
      </view>
    </view>

    <view class="fab-btn" @click="openAdd" v-if="hasPermission('menu.point-type')">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getPointTypeList, getPointTypeDetail, createPointType, updatePointType, deletePointType } from '../../api/points.js'
import { DEFAULT_PAGE_SIZE } from '../../config/constant.js'
import { useUserStore } from '../../store/user.js'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const list = ref([])
const pagination = ref({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const showModal = ref(false)
const isEdit = ref(false)
const editDocumentId = ref('')
const submitting = ref(false)

const defaultForm = () => ({
  name: '',
  code: '',
  description: '',
  enabled: true,
  canExpire: false,
  expireDays: 365
})
const form = ref(defaultForm())

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = {
      'pagination[page]': page,
      'pagination[pageSize]': pagination.value.pageSize
    }
    const res = await getPointTypeList(params)
    list.value = res.list
    pagination.value = { ...pagination.value, ...res.pagination }
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function openAdd() {
  isEdit.value = false
  editDocumentId.value = ''
  form.value = defaultForm()
  showModal.value = true
}

async function openEdit(item) {
  isEdit.value = true
  editDocumentId.value = item.documentId
  try {
    const detail = await getPointTypeDetail(item.documentId)
    form.value = {
      name: detail.name || '',
      code: detail.code || '',
      description: detail.description || '',
      enabled: detail.enabled !== false,
      canExpire: !!detail.canExpire,
      expireDays: detail.expireDays ?? 365
    }
    showModal.value = true
  } catch (e) {
    uni.showToast({ title: '加载详情失败', icon: 'none' })
  }
}

function closeModal() {
  showModal.value = false
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    uni.showToast({ title: '请输入类型名称', icon: 'none' })
    return
  }
  if (!form.value.code.trim()) {
    uni.showToast({ title: '请输入类型代码', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      code: form.value.code.trim(),
      description: form.value.description || undefined,
      enabled: form.value.enabled,
      canExpire: form.value.canExpire,
      expireDays: form.value.canExpire ? Number(form.value.expireDays) : undefined
    }
    if (isEdit.value) {
      await updatePointType(editDocumentId.value, payload)
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      await createPointType(payload)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    closeModal()
    loadData(currentPage.value)
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function handleDelete(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除积分类型「${item.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deletePointType(item.documentId)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

function prevPage() {
  if (currentPage.value > 1) loadData(currentPage.value - 1)
}

function nextPage() {
  if (currentPage.value < totalPages.value) loadData(currentPage.value + 1)
}

onMounted(() => loadData(1))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.btn-primary {
  background: #ff0000; color: #fff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}

.type-list { display: flex; flex-direction: column; gap: 20rpx; }

.type-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx;
  display: flex; justify-content: space-between; align-items: center;
}
.type-info { flex: 1; }
.type-name-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 8rpx; }
.type-name { font-size: 32rpx; font-weight: bold; color: #333; }

.status-badge {
  padding: 4rpx 16rpx; border-radius: 20rpx; font-size: 22rpx;
}
.status-badge.active { background: #e8f5e9; color: #07c160; }
.status-badge.inactive { background: #ffebee; color: #ff4d4f; }

.type-meta { display: flex; gap: 24rpx; margin-bottom: 8rpx; }
.meta-item { font-size: 24rpx; color: #999; }
.type-desc { font-size: 24rpx; color: #999; margin-top: 4rpx; }

.type-actions { display: flex; gap: 16rpx; flex-shrink: 0; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0;
}
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }

.pagination {
  display: flex; justify-content: center; align-items: center;
  gap: 40rpx; padding: 40rpx 0;
}
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }

/* 弹窗样式 */
.modal-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.modal-content {
  width: 90%; max-height: 85vh; background: #fff;
  border-radius: 16rpx; overflow: hidden; display: flex; flex-direction: column;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 30rpx; border-bottom: 1rpx solid #f0f0f0;
}
.modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.modal-close { font-size: 36rpx; color: #999; padding: 10rpx; }

.modal-body { padding: 30rpx; overflow-y: auto; flex: 1; }

.form-item { margin-bottom: 32rpx; }
.form-item:last-child { margin-bottom: 0; }
.form-label { font-size: 28rpx; color: #333; margin-bottom: 12rpx; display: block; }
.required { color: #ff4d4f; }

.form-input {
  width: 100%; height: 80rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box;
}
.form-textarea {
  width: 100%; height: 160rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 20rpx; font-size: 28rpx; box-sizing: border-box;
}

.switch-row {
  display: flex; justify-content: space-between; align-items: center;
}
.switch-row .form-label { margin-bottom: 0; }

.modal-footer {
  display: flex; gap: 20rpx; padding: 20rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
}
.btn-cancel {
  flex: 1; height: 88rpx; line-height: 88rpx; text-align: center;
  background: #f5f5f5; color: #666; font-size: 30rpx; border-radius: 8rpx; border: none;
}
.btn-submit {
  flex: 1; height: 88rpx; line-height: 88rpx; text-align: center;
  background: #07c160; color: #fff; font-size: 30rpx; border-radius: 8rpx; border: none;
}

.fab-btn {
  position: fixed; right: 40rpx; bottom: 120rpx; width: 120rpx; height: 120rpx;
  background: #07c160; color: white; border-radius: 60rpx;
  display: flex; align-items: center; justify-content: center;
  z-index: 999; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.2);
}
.fab-icon { font-size: 40rpx; line-height: 1; }
</style>
