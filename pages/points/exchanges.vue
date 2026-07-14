<template>
  <view class="page-container">
    <PageHeader title="兑换审核" />

    <view class="search-section">
      <view class="filter-row">
        <picker mode="selector" :range="statusLabels" @change="handleStatusChange">
          <view class="filter-item">
            <text>{{ statusLabels[statusIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <picker mode="selector" :range="deliveryLabels" @change="handleDeliveryChange">
          <view class="filter-item">
            <text>{{ deliveryLabels[deliveryIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="exchange-list">
      <view v-for="item in list" :key="item.id || item.documentId" class="exchange-card">
        <view class="exchange-main">
          <view class="exchange-header">
            <text class="exchange-product">{{ item.itemName || '-' }}</text>
            <view class="status-badge" :class="getStatusClass(item.status)">{{ getStatusText(item.status) }}</view>
          </view>
          <view class="exchange-meta">
            <text class="meta-item">{{ item.deliveryType === 'self_pickup' ? '📍自提' : '🚚快递' }}</text>
            <text class="meta-item" v-if="item.salesMode !== 'purchase_only'">-{{ item.totalCost || item.pointsCost || 0 }}积分</text>
            <text class="meta-item" v-if="item.priceAmount > 0">¥{{ item.priceAmount }}</text>
            <text class="meta-item">x{{ item.quantity || 1 }}</text>
          </view>
          <view class="exchange-user" v-if="item.user">
            <text>用户: {{ item.user.name || item.user.username || item.user.id }}</text>
          </view>
          <view class="exchange-receiver" v-if="item.receiverName || item.receiverPhone">
            <text v-if="item.receiverName">{{ item.receiverName }}</text>
            <text v-if="item.receiverPhone">{{ item.receiverPhone }}</text>
          </view>
          <view class="exchange-address" v-if="item.receiverAddress">
            <text>{{ item.receiverAddress }}</text>
          </view>
          <view class="exchange-express" v-if="item.trackingNumber">
            <text>{{ item.expressCompany || '快递' }}: {{ item.trackingNumber }}</text>
          </view>
          <view class="exchange-pickup" v-if="item.pickupCode">
            <text>提货码: </text>
            <text class="pickup-code-text">{{ item.pickupCode }}</text>
          </view>
          <view class="exchange-pickup-location" v-if="item.pickupLocation">
            <text>自提点: {{ item.pickupLocation.name || item.pickupLocation }}</text>
          </view>
          <view class="exchange-price" v-if="item.priceAmount > 0">
            <text>到店付: ¥{{ item.priceAmount }}</text>
          </view>
          <view class="exchange-time">
            <text>{{ formatTime(item.createdAt) }}</text>
          </view>
        </view>

        <view class="exchange-actions">
          <!-- pending: 审批 -->
          <template v-if="item.status === 'pending'">
            <view class="action-btn approve" @click="handleReview(item, 'approved')">通过</view>
            <view class="action-btn reject" @click="handleReview(item, 'rejected')">拒绝</view>
          </template>
          <!-- approved: 发货 -->
          <template v-if="item.status === 'approved' && item.deliveryType === 'express'">
            <view class="action-btn ship" @click="openShipModal(item)">发货</view>
          </template>
          <!-- approved: 自提完成 -->
          <template v-if="item.status === 'approved' && item.deliveryType === 'self_pickup'">
            <view class="action-btn complete" @click="goPickupVerify(item)">扫码兑付</view>
          </template>
          <!-- shipped: 确认完成 -->
          <template v-if="item.status === 'shipped'">
            <view class="action-btn complete" @click="handleReview(item, 'completed')">确认完成</view>
          </template>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && list.length === 0" class="empty-state">
      <text class="empty-icon">🎁</text>
      <text class="empty-text">暂无兑换记录</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <!-- 发货弹窗 -->
    <view class="modal-mask" v-if="showShipModal" @click="closeShipModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">填写发货信息</text>
          <text class="modal-close" @click="closeShipModal">✕</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">快递公司</text>
            <picker mode="selector" :range="expressCompanies" @change="onExpressCompanyChange">
              <view class="form-picker">
                <text>{{ shipForm.expressCompany || '请选择' }}</text>
                <text class="arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">运单号 <text class="required">*</text></text>
            <input class="form-input" v-model="shipForm.trackingNumber" placeholder="请输入运单号" />
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeShipModal">取消</button>
          <button class="btn-submit" @click="handleShip" :disabled="submitting">确认发货</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getRedemptionList, updateRedemption } from '../../src/api/points.js'

const statusIndex = ref(0)
const deliveryIndex = ref(0)
const statusValues = ['', 'pending', 'approved', 'shipped', 'completed', 'rejected', 'cancelled']
const statusLabels = ['全部状态', '待审核', '已通过', '已发货', '已完成', '已拒绝', '已取消']
const deliveryValues = ['', 'self_pickup', 'express']
const deliveryLabels = ['全部类型', '到店自提', '快递配送']

const list = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const submitting = ref(false)

const statusMap = {
  pending: { text: '待审核', cls: 'pending' },
  approved: { text: '已通过', cls: 'approved' },
  shipped: { text: '已发货', cls: 'shipped' },
  completed: { text: '已完成', cls: 'active' },
  rejected: { text: '已拒绝', cls: 'inactive' },
  cancelled: { text: '已取消', cls: 'inactive' },
}

function getStatusText(status) { return statusMap[status]?.text ?? status ?? '-' }
function getStatusClass(status) { return statusMap[status]?.cls || 'inactive' }

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 发货弹窗
const showShipModal = ref(false)
const shipItem = ref(null)
const expressCompanies = ['顺丰速运', '中通快递', '圆通速递', '韵达快递', '申通快递', '极兔速递', '京东快递', '邮政EMS', '其他']
const shipForm = ref({ expressCompany: '', trackingNumber: '' })

function openShipModal(item) {
  shipItem.value = item
  shipForm.value = { expressCompany: '', trackingNumber: '' }
  showShipModal.value = true
}
function closeShipModal() { showShipModal.value = false }
function onExpressCompanyChange(e) { shipForm.value.expressCompany = expressCompanies[e.detail.value] }

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { page, pageSize: pagination.value.pageSize }
    if (statusIndex.value > 0) params.status = statusValues[statusIndex.value]
    if (deliveryIndex.value > 0) params.deliveryType = deliveryValues[deliveryIndex.value]
    const res = await getRedemptionList(params)
    list.value = res.list ?? res.records ?? []
    pagination.value = res.pagination || { page: 1, pageSize: 20, total: 0 }
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleStatusChange(e) { statusIndex.value = e.detail.value; loadData(1) }
function handleDeliveryChange(e) { deliveryIndex.value = e.detail.value; loadData(1) }
function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }
const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

async function handleReview(item, status) {
  if (submitting.value) return
  const actionMap = { approved: '通过', rejected: '拒绝', completed: '确认完成' }
  const action = actionMap[status] || status
  uni.showModal({
    title: `确认${action}`,
    content: `确定要${action}「${item.itemName}」的兑换申请吗？`,
    success: async (res) => {
      if (res.confirm) {
        submitting.value = true
        try {
          await updateRedemption(item.documentId ?? item.id, { status })
          uni.showToast({ title: `${action}成功`, icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: `${action}失败`, icon: 'none' })
        } finally {
          submitting.value = false
        }
      }
    }
  })
}

async function handleShip() {
  if (submitting.value) return
  if (!shipForm.value.trackingNumber) {
    return uni.showToast({ title: '请输入运单号', icon: 'none' })
  }
  submitting.value = true
  try {
    await updateRedemption(shipItem.value.documentId ?? shipItem.value.id, {
      status: 'shipped',
      expressCompany: shipForm.value.expressCompany || undefined,
      trackingNumber: shipForm.value.trackingNumber,
    })
    uni.showToast({ title: '发货成功', icon: 'success' })
    closeShipModal()
    loadData(currentPage.value)
  } catch (e) {
    uni.showToast({ title: '发货失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onShow(() => loadData(1))

function goPickupVerify(item) {
  uni.navigateTo({ url: '/pages/points/pickup-verify' })
}
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.filter-row { display: flex; gap: 20rpx; }
.filter-item {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx;
}
.arrow { font-size: 20rpx; color: #999; }

.exchange-list { display: flex; flex-direction: column; gap: 16rpx; }

.exchange-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx;
  display: flex; justify-content: space-between; align-items: flex-start;
}

.exchange-main { flex: 1; min-width: 0; }
.exchange-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.exchange-product { font-size: 30rpx; font-weight: bold; color: #333; flex: 1; margin-right: 12rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-badge.active { background: #e8f5e9; color: #07c160; }
.status-badge.approved { background: #e6f7ff; color: #1890ff; }
.status-badge.shipped { background: #f0f4ff; color: #667eea; }
.status-badge.inactive { background: #ffebee; color: #ff4d4f; }
.status-badge.pending { background: #fff8e1; color: #faad14; }

.exchange-meta { display: flex; gap: 16rpx; margin-bottom: 6rpx; }
.meta-item { font-size: 24rpx; color: #999; }
.exchange-user { font-size: 24rpx; color: #666; margin-bottom: 4rpx; }
.exchange-receiver { font-size: 24rpx; color: #333; margin-bottom: 4rpx; }
.exchange-address { font-size: 22rpx; color: #999; margin-bottom: 4rpx; }
.exchange-express { font-size: 22rpx; color: #667eea; margin-bottom: 4rpx; }
.exchange-pickup { font-size: 22rpx; color: #333; margin-bottom: 4rpx; }
.pickup-code-text { font-weight: bold; color: #667eea; letter-spacing: 4rpx; }
.exchange-pickup-location { font-size: 22rpx; color: #667eea; margin-bottom: 4rpx; }
.exchange-price { font-size: 22rpx; color: #fa8c16; margin-bottom: 4rpx; font-weight: bold; }
.exchange-time { font-size: 22rpx; color: #bbb; }

.exchange-actions { display: flex; gap: 10rpx; flex-shrink: 0; flex-wrap: wrap; }
.action-btn { padding: 10rpx 20rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.approve { background: #e8f5e9; color: #07c160; }
.action-btn.reject { background: #fff0f0; color: #ff4d4f; }
.action-btn.ship { background: #e6f7ff; color: #1890ff; }
.action-btn.complete { background: #f0f4ff; color: #667eea; }

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0;
}
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }

.pagination {
  display: flex; justify-content: center; align-items: center;
  gap: 40rpx; padding: 40rpx 0;
}
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }

/* 弹窗 */
.modal-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.modal-content {
  width: 90%; background: #fff; border-radius: 16rpx; overflow: hidden;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 30rpx; border-bottom: 1rpx solid #f0f0f0;
}
.modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.modal-close { font-size: 36rpx; color: #999; padding: 10rpx; }
.modal-body { padding: 30rpx; }
.form-item { margin-bottom: 24rpx; }
.form-label { font-size: 28rpx; color: #333; margin-bottom: 10rpx; display: block; }
.required { color: #ff4d4f; }
.form-input {
  width: 100%; height: 76rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box;
}
.form-picker {
  display: flex; justify-content: space-between; align-items: center;
  height: 76rpx; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; font-size: 28rpx;
}
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
</style>
