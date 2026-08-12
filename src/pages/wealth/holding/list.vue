<template>
  <view class="page-container">
    <PageHeader title="持仓追踪">
      <button class="btn-primary" @click="showAddForm = true">+ 录入</button>
    </PageHeader>

    <view class="filter-section">
      <view class="filter-row">
        <picker mode="selector" :range="statusLabels" @change="handleStatusChange">
          <view class="filter-item">
            <text>{{ statusLabels[statusIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="holding-list">
      <view v-for="item in list" :key="item.id" class="holding-card" @click="openDetail(item)">
        <view class="card-header">
          <view class="customer-info">
            <text class="customer-name">{{ item.user?.name || item.user?.nickname || '客户' }}</text>
            <text class="product-name">{{ item.product?.productName || '--' }}</text>
          </view>
          <view class="status-badge" :class="item.status">
            {{ getStatusLabel(item.status) }}
          </view>
        </view>

        <view class="card-body">
          <view class="metric-col">
            <text class="metric-label">买入金额</text>
            <text class="metric-value">¥{{ formatAmount(item.buyAmount) }}</text>
            <text class="metric-sub">{{ item.buyDate }}</text>
          </view>
          <view class="metric-col">
            <text class="metric-label">当前市值</text>
            <text class="metric-value">¥{{ formatAmount(item.currentValue) }}</text>
            <text class="metric-sub">买入净值 {{ item.buyNav || '--' }}</text>
          </view>
          <view class="metric-col">
            <text class="metric-label">累计盈亏</text>
            <text class="metric-value" :class="getProfitClass(item.profit)">
              {{ formatProfit(item.profit) }}
            </text>
            <text class="metric-sub" :class="getProfitClass(item.profit)">
              {{ formatPercent(item.profitPercent) }}
            </text>
          </view>
        </view>

        <view class="card-footer">
          <text class="holding-days">持有 {{ item.holdingDays || 0 }} 天</text>
          <text class="annualized" :class="getProfitClass(item.annualizedProfit)">
            持有年化 {{ formatPercent(item.annualizedProfit) }}
          </text>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && list.length === 0" class="empty-state">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无持仓记录</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <view class="footer-disclaimer">理财非存款，产品有风险，投资需谨慎</view>

    <view v-if="showAddForm" class="modal" @click="showAddForm = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">代客录入持仓</text>
          <text class="modal-close" @click="showAddForm = false">×</text>
        </view>
        <scroll-view scroll-y class="modal-body">
          <view class="form-item">
            <text class="form-label">选择产品 *</text>
            <picker mode="selector" :range="productNames" @change="handleProductSelect">
              <view class="picker-value">
                <text>{{ addForm.productName || '请选择' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">买入日期 *</text>
            <picker mode="date" :value="addForm.buyDate" @change="e => addForm.buyDate = e.detail.value">
              <view class="picker-value">
                <text>{{ addForm.buyDate || '请选择日期' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">买入金额(元) *</text>
            <input type="digit" v-model="addForm.buyAmount" placeholder="如 10000" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">买入净值</text>
            <input type="digit" v-model="addForm.buyNav" placeholder="留空自动取当日净值" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">备注</text>
            <input v-model="addForm.remark" placeholder="可选" class="form-input" />
          </view>
        </scroll-view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="showAddForm = false">取消</button>
          <button class="btn-primary" @click="handleAdd" :disabled="submitting">{{ submitting ? '提交中...' : '确认录入' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAdminHoldingList, createAdminHolding, getAdminProductList } from '../../../api/wealth.js'

const statusValues = ['', 'holding', 'redeemed']
const statusLabels = ['全部状态', '持有中', '已赎回']
const statusIndex = ref(0)

const list = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

const showAddForm = ref(false)
const submitting = ref(false)
const products = ref([])
const productNames = computed(() => products.value.map(p => p.productName))
const addForm = ref({
  product: null,
  productName: '',
  buyDate: '',
  buyAmount: '',
  buyNav: '',
  remark: ''
})

function formatAmount(val) {
  if (val === null || val === undefined) return '--'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatPercent(val) {
  if (val === null || val === undefined) return '--'
  return (val * 100).toFixed(2) + '%'
}
function formatProfit(val) {
  if (val === null || val === undefined) return '--'
  return (val >= 0 ? '+' : '') + formatAmount(val)
}
function getProfitClass(val) {
  if (val > 0) return 'up'
  if (val < 0) return 'down'
  return 'flat'
}
function getStatusLabel(status) {
  if (status === 'holding') return '持有中'
  if (status === 'redeemed') return '已赎回'
  return status
}

function handleStatusChange(e) {
  statusIndex.value = e.detail.value
  loadData(1)
}

function handleProductSelect(e) {
  const p = products.value[e.detail.value]
  addForm.value.product = p?.id || null
  addForm.value.productName = p?.productName || ''
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { page, pageSize: pagination.value.pageSize }
    if (statusIndex.value > 0) params.status = statusValues[statusIndex.value]
    const res = await getAdminHoldingList(params)
    list.value = res.list || []
    pagination.value = res.pagination || { page: 1, pageSize: 20, total: 0 }
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadProducts() {
  try {
    const res = await getAdminProductList({ page: 1, pageSize: 200, status: true })
    products.value = res.list || []
  } catch (e) {
    console.error('loadProducts', e)
  }
}

async function handleAdd() {
  if (!addForm.value.product) {
    uni.showToast({ title: '请选择产品', icon: 'none' })
    return
  }
  if (!addForm.value.buyDate) {
    uni.showToast({ title: '请选择买入日期', icon: 'none' })
    return
  }
  if (!addForm.value.buyAmount) {
    uni.showToast({ title: '请填写买入金额', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const data = {
      product: addForm.value.product,
      buyDate: addForm.value.buyDate,
      buyAmount: Number(addForm.value.buyAmount),
      remark: addForm.value.remark
    }
    if (addForm.value.buyNav) data.buyNav = Number(addForm.value.buyNav)
    await createAdminHolding(data)
    uni.showToast({ title: '录入成功', icon: 'success' })
    showAddForm.value = false
    addForm.value = { product: null, productName: '', buyDate: '', buyAmount: '', buyNav: '', remark: '' }
    loadData(1)
  } catch (e) {
    uni.showToast({ title: '录入失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function openDetail(item) {
  uni.navigateTo({ url: `/pages/wealth/holding/detail?id=${item.id}` })
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }

onMounted(() => {
  loadData(1)
  loadProducts()
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

.filter-section { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.filter-row { display: flex; gap: 20rpx; }
.filter-item {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx;
}
.arrow { font-size: 20rpx; color: #999; }

.holding-list { display: flex; flex-direction: column; gap: 16rpx; }
.holding-card { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16rpx; }
.customer-info { flex: 1; }
.customer-name { font-size: 30rpx; font-weight: bold; color: #333; display: block; }
.product-name { font-size: 24rpx; color: #999; margin-top: 4rpx; display: block; }
.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-badge.holding { background: #e8f5e9; color: #07c160; }
.status-badge.redeemed { background: #f5f5f5; color: #999; }

.card-body { display: flex; justify-content: space-between; padding: 16rpx 0; border-top: 1rpx dashed #f0f0f0; }
.metric-col { flex: 1; text-align: center; }
.metric-label { font-size: 22rpx; color: #999; display: block; }
.metric-value { font-size: 28rpx; font-weight: bold; color: #333; display: block; margin: 6rpx 0; }
.metric-value.up { color: #f5222d; }
.metric-value.down { color: #07c160; }
.metric-sub { font-size: 20rpx; color: #999; display: block; }
.metric-sub.up { color: #f5222d; }
.metric-sub.down { color: #07c160; }

.card-footer { display: flex; justify-content: space-between; padding-top: 12rpx; border-top: 1rpx dashed #f0f0f0; }
.holding-days { font-size: 24rpx; color: #999; }
.annualized { font-size: 24rpx; color: #999; }
.annualized.up { color: #f5222d; }
.annualized.down { color: #07c160; }

.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }

.footer-disclaimer { text-align: center; padding: 30rpx 0; color: #999; font-size: 22rpx; }

.modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; display: flex; align-items: flex-end; }
.modal-content { background: #fff; border-radius: 16rpx 16rpx 0 0; width: 100%; max-height: 80vh; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; border-bottom: 1rpx solid #eee; }
.modal-title { font-size: 32rpx; font-weight: bold; }
.modal-close { font-size: 40rpx; color: #999; }
.modal-body { padding: 24rpx; max-height: 50vh; }
.modal-footer { display: flex; gap: 16rpx; padding: 24rpx; border-top: 1rpx solid #eee; }
.modal-footer .btn-primary { flex: 1; padding: 20rpx; }

.form-item { margin-bottom: 24rpx; }
.form-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 10rpx; }
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; box-sizing: border-box; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; }
.picker-value { display: flex; justify-content: space-between; align-items: center; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; }
.picker-arrow { font-size: 20rpx; color: #999; }
</style>
