<template>
  <view class="page-container">
    <PageHeader title="理财产品">
      <view class="header-right">
        <button class="btn-primary" @click="openAdd">+ 新增</button>
      </view>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input v-model="searchName" class="search-input" placeholder="搜索产品名称" @confirm="handleSearch" />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="typeLabels" @change="handleTypeChange">
          <view class="filter-item">
            <text>{{ typeLabels[typeIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <picker mode="selector" :range="riskLabels" @change="handleRiskChange">
          <view class="filter-item">
            <text>{{ riskLabels[riskIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="product-list">
      <view v-for="item in list" :key="item.id" class="product-card" @click="openEdit(item)">
        <view class="card-header">
          <text class="product-name">{{ item.productName }}</text>
          <view class="status-badge" :class="item.status ? 'active' : 'inactive'">
            {{ item.status ? '上架' : '下架' }}
          </view>
        </view>
        <view class="card-tags">
          <text class="tag risk" :class="'risk-' + (item.riskLevel || 'R2').toLowerCase()">{{ item.riskLevel || 'R2' }}</text>
          <text class="tag type">{{ getTypeLabel(item.productType) }}</text>
          <text class="tag company" v-if="item.company?.name">{{ item.company.name }}</text>
        </view>
        <view class="card-annual">
          <view class="annual-main">
            <text class="annual-label">近1月年化</text>
            <text class="annual-value" :class="getAnnualClass(item.latestAnnual1m)">
              {{ formatPercent(item.latestAnnual1m) }}
            </text>
          </view>
          <view class="annual-sub" v-if="item.latestNav?.unitNav">
            <text class="nav-label">单位净值</text>
            <text class="nav-value">{{ item.latestNav.unitNav }}</text>
            <text class="nav-date" v-if="item.latestNav.navDate">{{ item.latestNav.navDate }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && list.length === 0" class="empty-state">
      <text class="empty-icon">💰</text>
      <text class="empty-text">暂无理财产品</text>
      <button class="btn-primary" @click="openAdd">立即添加</button>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <view class="footer-disclaimer">理财非存款，产品有风险，投资需谨慎</view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAdminProductList } from '../../../api/wealth.js'

const searchName = ref('')
const typeIndex = ref(0)
const riskIndex = ref(0)

const typeValues = ['', 'bank-wealth', 'stock-fund', 'bond-fund', 'mixed-fund', 'money-fund']
const typeLabels = ['全部类型', '银行理财', '股票基金', '债券基金', '混合基金', '货币基金']
const riskValues = ['', 'R1', 'R2', 'R3', 'R4', 'R5']
const riskLabels = ['全部风险', 'R1 低', 'R2 中低', 'R3 中', 'R4 中高', 'R5 高']

const list = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

function getTypeLabel(type) {
  const idx = typeValues.indexOf(type)
  return idx > 0 ? typeLabels[idx] : type
}

function formatPercent(val) {
  if (val === null || val === undefined) return '--'
  return (val * 100).toFixed(2) + '%'
}

function getAnnualClass(val) {
  if (val === null || val === undefined) return 'flat'
  if (val > 0) return 'up'
  if (val < 0) return 'down'
  return 'flat'
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { page, pageSize: pagination.value.pageSize }
    if (searchName.value) params.productName = searchName.value
    if (typeIndex.value > 0) params.productType = typeValues[typeIndex.value]
    if (riskIndex.value > 0) params.riskLevel = riskValues[riskIndex.value]
    const res = await getAdminProductList(params)
    list.value = res.list || []
    pagination.value = res.pagination || { page: 1, pageSize: 20, total: 0 }
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleSearch() { loadData(1) }
function handleTypeChange(e) { typeIndex.value = e.detail.value; loadData(1) }
function handleRiskChange(e) { riskIndex.value = e.detail.value; loadData(1) }
function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }

function openAdd() {
  uni.navigateTo({ url: '/pages/wealth/product/form' })
}

function openEdit(item) {
  uni.navigateTo({ url: `/pages/wealth/product/form?id=${item.id}` })
}

onMounted(() => { loadData(1) })
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.btn-primary {
  background: #667eea; color: #fff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}

.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.search-box {
  display: flex; align-items: center; background: #f5f5f5;
  border-radius: 8rpx; padding: 0 20rpx; margin-bottom: 20rpx;
}
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }
.filter-row { display: flex; gap: 20rpx; }
.filter-item {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx;
}
.arrow { font-size: 20rpx; color: #999; }

.product-list { display: flex; flex-direction: column; gap: 16rpx; }
.product-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx;
}
.card-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx;
}
.product-name { font-size: 30rpx; font-weight: bold; color: #333; flex: 1; margin-right: 12rpx; }
.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-badge.active { background: #e8f5e9; color: #07c160; }
.status-badge.inactive { background: #ffebee; color: #ff4d4f; }

.card-tags { display: flex; gap: 8rpx; margin-bottom: 16rpx; flex-wrap: wrap; }
.tag { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 6rpx; }
.tag.risk { background: #fff7e6; color: #fa8c16; }
.tag.risk.r1 { background: #f6ffed; color: #52c41a; }
.tag.risk.r2 { background: #e6f7ff; color: #1890ff; }
.tag.risk.r3 { background: #fff7e6; color: #fa8c16; }
.tag.risk.r4 { background: #fff2e8; color: #fa541c; }
.tag.risk.r5 { background: #ffebee; color: #f5222d; }
.tag.type { background: #f0f4ff; color: #667eea; }
.tag.company { background: #f5f5f5; color: #999; }

.card-annual {
  display: flex; justify-content: space-between; align-items: flex-end;
  padding-top: 12rpx; border-top: 1rpx dashed #f0f0f0;
}
.annual-label { font-size: 22rpx; color: #999; display: block; }
.annual-value { font-size: 44rpx; font-weight: bold; }
.annual-value.up { color: #f5222d; }
.annual-value.down { color: #07c160; }
.annual-value.flat { color: #999; }
.annual-sub { text-align: right; }
.nav-label { font-size: 22rpx; color: #999; margin-right: 8rpx; }
.nav-value { font-size: 26rpx; color: #333; }
.nav-date { font-size: 20rpx; color: #999; display: block; }

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

.footer-disclaimer {
  text-align: center; padding: 30rpx 0; color: #999;
  font-size: 22rpx; background: #fff; border-radius: 8rpx;
}
</style>
