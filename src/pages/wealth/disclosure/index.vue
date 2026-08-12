<template>
  <view class="page-container">
    <PageHeader title="披露管理">
      <button class="btn-primary" @click="openAdd">+ 新增</button>
    </PageHeader>

    <view class="filter-section">
      <picker mode="selector" :range="typeLabels" @change="handleTypeChange">
        <view class="filter-item">
          <text>{{ typeLabels[typeIndex] }}</text>
          <text class="arrow">▼</text>
        </view>
      </picker>
    </view>

    <view class="disclosure-list">
      <view v-for="item in list" :key="item.id" class="disclosure-card" @click="openEdit(item)">
        <view class="card-header">
          <text class="disclosure-title">{{ item.title }}</text>
          <view class="status-badge" :class="item.status ? 'active' : 'inactive'">
            {{ item.status ? '生效' : '停用' }}
          </view>
        </view>
        <view class="card-tags">
          <text class="tag type">{{ getTypeLabel(item.productType) }}</text>
          <text class="tag date">{{ item.effectiveDate }}</text>
        </view>
        <view class="card-content">
          <text class="content-text">{{ item.content }}</text>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && list.length === 0" class="empty-state">
      <text class="empty-icon">📄</text>
      <text class="empty-text">暂无披露文案</text>
      <button class="btn-primary" @click="openAdd">立即添加</button>
    </view>

    <view class="footer-disclaimer">理财非存款，产品有风险，投资需谨慎</view>

    <view v-if="showForm" class="modal" @click="showForm = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingId ? '编辑披露' : '新增披露' }}</text>
          <text class="modal-close" @click="showForm = false">×</text>
        </view>
        <scroll-view scroll-y class="modal-body">
          <view class="form-item">
            <text class="form-label">产品类型 *</text>
            <picker mode="selector" :range="typeLabels" :value="formTypeIndex" @change="handleFormTypeChange">
              <view class="picker-value">
                <text>{{ typeLabels[formTypeIndex] }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">标题 *</text>
            <input v-model="form.title" placeholder="如：银行理财风险提示" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">生效日期 *</text>
            <picker mode="date" :value="form.effectiveDate" @change="e => form.effectiveDate = e.detail.value">
              <view class="picker-value">
                <text>{{ form.effectiveDate || '请选择日期' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">披露内容 *</text>
            <textarea v-model="form.content" placeholder="免责声明文案" class="form-textarea" />
          </view>
          <view class="form-item">
            <view class="switch-row">
              <text class="form-label">生效状态</text>
              <switch :checked="form.status" @change="form.status = !form.status" />
            </view>
          </view>
        </scroll-view>
        <view class="modal-footer">
          <button v-if="editingId" class="btn-danger" @click="handleDelete">删除</button>
          <button class="btn-cancel" @click="showForm = false">取消</button>
          <button class="btn-primary" @click="handleSubmit" :disabled="submitting">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getDisclosureList, createDisclosure, updateDisclosure, deleteDisclosure } from '../../../api/wealth.js'

const typeValues = ['', 'bank-wealth', 'stock-fund', 'bond-fund', 'mixed-fund', 'money-fund', 'all']
const typeLabels = ['全部类型', '银行理财', '股票基金', '债券基金', '混合基金', '货币基金', '通用文案']

const typeIndex = ref(0)
const formTypeIndex = ref(1)
const list = ref([])
const loading = ref(false)
const showForm = ref(false)
const submitting = ref(false)
const editingId = ref(null)

const form = ref({
  productType: 'bank-wealth',
  title: '',
  content: '',
  effectiveDate: '',
  status: true
})

function getTypeLabel(type) {
  const idx = typeValues.indexOf(type)
  return idx > 0 ? typeLabels[idx] : type
}

function handleTypeChange(e) {
  typeIndex.value = e.detail.value
  loadData()
}

function handleFormTypeChange(e) {
  formTypeIndex.value = e.detail.value
  form.value.productType = typeValues[e.detail.value]
}

async function loadData() {
  loading.value = true
  try {
    const params = { page: 1, pageSize: 100 }
    if (typeIndex.value > 0) params.productType = typeValues[typeIndex.value]
    const res = await getDisclosureList(params)
    list.value = res.list || []
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function openAdd() {
  editingId.value = null
  form.value = { productType: 'bank-wealth', title: '', content: '', effectiveDate: '', status: true }
  formTypeIndex.value = 1
  showForm.value = true
}

function openEdit(item) {
  editingId.value = item.id
  form.value = {
    productType: item.productType,
    title: item.title,
    content: item.content,
    effectiveDate: item.effectiveDate,
    status: item.status
  }
  formTypeIndex.value = Math.max(0, typeValues.indexOf(item.productType))
  showForm.value = true
}

async function handleSubmit() {
  if (!form.value.title) {
    uni.showToast({ title: '请填写标题', icon: 'none' })
    return
  }
  if (!form.value.content) {
    uni.showToast({ title: '请填写披露内容', icon: 'none' })
    return
  }
  if (!form.value.effectiveDate) {
    uni.showToast({ title: '请选择生效日期', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    if (editingId.value) {
      await updateDisclosure(editingId.value, form.value)
    } else {
      await createDisclosure(form.value)
    }
    uni.showToast({ title: '保存成功', icon: 'success' })
    showForm.value = false
    loadData()
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function handleDelete() {
  uni.showModal({
    title: '确认删除',
    content: '删除后不可恢复，确定要删除该披露文案吗？',
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteDisclosure(editingId.value)
          uni.showToast({ title: '已删除', icon: 'success' })
          showForm.value = false
          loadData()
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.btn-primary {
  background: #667eea; color: #fff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}
.btn-cancel {
  background: #f5f5f5; color: #666; padding: 20rpx; font-size: 30rpx;
  border-radius: 8rpx; border: none; flex: 1;
}
.btn-danger {
  background: #fff; color: #ff4d4f; padding: 20rpx; font-size: 28rpx;
  border-radius: 8rpx; border: 2rpx solid #ff4d4f; flex: 1;
}

.filter-section { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.filter-item {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx;
  display: inline-flex;
}
.arrow { font-size: 20rpx; color: #999; }

.disclosure-list { display: flex; flex-direction: column; gap: 16rpx; }
.disclosure-card { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.disclosure-title { font-size: 30rpx; font-weight: bold; color: #333; flex: 1; }
.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-badge.active { background: #e8f5e9; color: #07c160; }
.status-badge.inactive { background: #f5f5f5; color: #999; }

.card-tags { display: flex; gap: 8rpx; margin-bottom: 12rpx; }
.tag { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 6rpx; }
.tag.type { background: #f0f4ff; color: #667eea; }
.tag.date { background: #f5f5f5; color: #999; }

.card-content { padding-top: 12rpx; border-top: 1rpx dashed #f0f0f0; }
.content-text { font-size: 26rpx; color: #666; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }

.footer-disclaimer { text-align: center; padding: 30rpx 0; color: #999; font-size: 22rpx; }

.modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; display: flex; align-items: flex-end; }
.modal-content { background: #fff; border-radius: 16rpx 16rpx 0 0; width: 100%; max-height: 85vh; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; border-bottom: 1rpx solid #eee; }
.modal-title { font-size: 32rpx; font-weight: bold; }
.modal-close { font-size: 40rpx; color: #999; }
.modal-body { padding: 24rpx; max-height: 55vh; }
.modal-footer { display: flex; gap: 16rpx; padding: 24rpx; border-top: 1rpx solid #eee; }
.modal-footer .btn-primary { flex: 1; padding: 20rpx; }

.form-item { margin-bottom: 24rpx; }
.form-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 10rpx; }
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; box-sizing: border-box; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; }
.form-textarea { width: 100%; min-height: 200rpx; padding: 20rpx; box-sizing: border-box; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; }
.picker-value { display: flex; justify-content: space-between; align-items: center; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; }
.picker-arrow { font-size: 20rpx; color: #999; }
.switch-row { display: flex; justify-content: space-between; align-items: center; }
</style>
