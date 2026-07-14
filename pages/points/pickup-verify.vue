<template>
  <view class="page-container">
    <PageHeader title="扫码核销" />

    <!-- 扫码区域 -->
    <view class="scan-section">
      <view class="scan-box" @click="startScan">
        <view class="scan-icon">📷</view>
        <text class="scan-text">点击扫码</text>
        <text class="scan-hint">扫描用户兑换码二维码</text>
      </view>
    </view>

    <!-- 手动输入兑换码 -->
    <view class="manual-section">
      <view class="section-title">手动输入兑换码</view>
      <view class="input-row">
        <input
          class="code-input"
          v-model="pickupCode"
          placeholder="请输入8位兑换码"
          maxlength="8"
          @confirm="handleVerify"
        />
        <view class="verify-btn" @click="handleVerify">
          <text>核销</text>
        </view>
      </view>
    </view>

    <!-- 待核销列表 -->
    <view class="pending-section">
      <view class="section-title">待核销订单</view>
      <view v-for="item in pendingList" :key="item.id || item.documentId" class="pending-card">
        <view class="pending-main">
          <view class="pending-header">
            <text class="pending-product">{{ item.itemName || '-' }}</text>
            <view class="status-badge approved">待兑付</view>
          </view>
          <view class="pending-meta">
            <text class="meta-item">{{ item.deliveryType === 'self_pickup' ? '📍自提' : '📦快递' }}</text>
            <text class="meta-item">-{{ item.totalCost || 0 }}积分</text>
          </view>
          <view class="pending-user" v-if="item.user">
            <text>用户: {{ item.user.name || item.user.username || item.user.id }}</text>
          </view>
          <view class="pending-receiver" v-if="item.receiverPhone">
            <text>手机: {{ item.receiverPhone }}</text>
          </view>
          <view class="pending-code">
            <text class="code-label">兑换码:</text>
            <text class="code-value">{{ item.pickupCode }}</text>
          </view>
          <view class="pending-location" v-if="item.pickupLocation">
            <text class="location-label">自提点:</text>
            <text class="location-value">{{ item.pickupLocation.name || item.pickupLocation }}</text>
          </view>
          <view class="pending-price" v-if="item.priceAmount > 0">
            <text class="price-label">到店收取:</text>
            <text class="price-value">¥{{ item.priceAmount }}</text>
          </view>
          <view class="pending-time">
            <text>{{ formatTime(item.createdAt) }}</text>
          </view>
        </view>
        <view class="pending-actions">
          <view class="action-btn complete" @click="handlePickupVerify(item)">核销</view>
        </view>
      </view>

      <view v-if="loadingPending" class="loading"><text>加载中...</text></view>
      <view v-if="!loadingPending && pendingList.length === 0" class="empty-state">
        <text class="empty-text">暂无待核销订单</text>
      </view>
    </view>

    <!-- 核销确认弹窗 -->
    <view class="modal-mask" v-if="showConfirmModal" @click="closeConfirmModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">确认核销</text>
          <text class="modal-close" @click="closeConfirmModal">✕</text>
        </view>
        <view class="modal-body">
          <view class="confirm-info">
            <view class="confirm-row">
              <text class="confirm-label">商品</text>
              <text class="confirm-value">{{ confirmItem?.itemName }}</text>
            </view>
            <view class="confirm-row">
              <text class="confirm-label">兑换码</text>
              <text class="confirm-value code-highlight">{{ confirmItem?.pickupCode }}</text>
            </view>
            <view class="confirm-row" v-if="confirmItem?.user">
              <text class="confirm-label">用户</text>
              <text class="confirm-value">{{ confirmItem.user.name || confirmItem.user.username || confirmItem.user.id }}</text>
            </view>
            <view class="confirm-row">
              <text class="confirm-label">积分</text>
              <text class="confirm-value">{{ confirmItem?.totalCost || 0 }}</text>
            </view>
            <view class="confirm-row">
              <text class="confirm-label">配送方式</text>
              <text class="confirm-value">{{ confirmItem?.deliveryType === 'self_pickup' ? '到店自提' : '快递配送' }}</text>
            </view>
            <view class="confirm-row" v-if="confirmItem?.pickupLocation">
              <text class="confirm-label">自提点</text>
              <text class="confirm-value">{{ confirmItem.pickupLocation.name || confirmItem.pickupLocation }}</text>
            </view>
            <view class="confirm-row" v-if="confirmItem?.priceAmount > 0">
              <text class="confirm-label">到店收取</text>
              <text class="confirm-value price-highlight">¥{{ confirmItem.priceAmount }}</text>
            </view>
          </view>
          <text class="confirm-tip">确认核销后，订单将标记为已完成</text>
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeConfirmModal">取消</button>
          <button class="btn-submit" @click="confirmVerify">确认核销</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getRedemptionList, verifyPickupCode } from '../../src/api/points.js'
import jzH5ScanCode from 'jz-h5-scancode'

const pickupCode = ref('')
const pendingList = ref([])
const loadingPending = ref(false)
const showConfirmModal = ref(false)
const confirmItem = ref(null)
const verifying = ref(false)

async function loadPendingList() {
  loadingPending.value = true
  try {
    const res = await getRedemptionList({ status: 'approved', pageSize: 50 })
    pendingList.value = res.list ?? res.records ?? []
  } catch (e) {
    console.error('加载待兑付列表失败', e)
  } finally {
    loadingPending.value = false
  }
}

function startScan() {
  // 使用 jz-h5-scancode 插件扫码
  jzH5ScanCode.scanCode({
    scanType: ['qrCode'],
    onlyFromCamera: false,
    scanFrameColor: '#07c160',
    success: (res) => {
      console.log('扫码成功:', res.result)
      pickupCode.value = res.result
      handleVerify()
    },
    fail: (res) => {
      console.log('扫码失败:', res.errMsg)
      uni.showToast({ title: res.errMsg || '扫码失败', icon: 'none' })
    }
  })
}

async function handleVerify() {
  if (!pickupCode.value.trim()) {
    return uni.showToast({ title: '请输入兑换码', icon: 'none' })
  }

  // 从待兑付列表中查找
  const found = pendingList.value.find(item => item.pickupCode === pickupCode.value.trim().toUpperCase())
  if (found) {
    confirmItem.value = found
    showConfirmModal.value = true
  } else {
    // 提货码不在待兑付列表中
    uni.showModal({
      title: '提示',
      content: `未找到兑换码 ${pickupCode.value} 对应的待核销订单，请确认兑换码是否正确`,
      showCancel: false
    })
  }
}

function handlePickupVerify(item) {
  confirmItem.value = item
  pickupCode.value = item.pickupCode
  showConfirmModal.value = true
}

function closeConfirmModal() {
  showConfirmModal.value = false
  confirmItem.value = null
}

async function confirmVerify() {
  if (verifying.value) return
  verifying.value = true
  try {
    await verifyPickupCode(confirmItem.value.pickupCode)
    uni.showToast({ title: '核销成功', icon: 'success' })
    closeConfirmModal()
    pickupCode.value = ''
    loadPendingList()
  } catch (e) {
    uni.showToast({ title: e?.error || '核销失败', icon: 'none' })
  } finally {
    verifying.value = false
  }
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(() => loadPendingList())
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

/* 扫码区域 */
.scan-section { margin-bottom: 30rpx; }
.scan-box {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx; padding: 60rpx;
  display: flex; flex-direction: column; align-items: center;
  cursor: pointer;
}
.scan-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.scan-text { font-size: 36rpx; font-weight: bold; color: #fff; }
.scan-hint { font-size: 24rpx; color: rgba(255,255,255,0.8); margin-top: 10rpx; }

/* 手动输入 */
.manual-section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 30rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; }
.input-row { display: flex; gap: 16rpx; align-items: center; }
.code-input {
  flex: 1; height: 76rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 0 20rpx; font-size: 32rpx; letter-spacing: 4rpx;
  font-weight: bold; text-transform: uppercase; box-sizing: border-box;
}
.verify-btn {
  padding: 0 40rpx; height: 76rpx; line-height: 76rpx;
  background: #07c160; color: #fff; border-radius: 8rpx;
  font-size: 30rpx; font-weight: bold; white-space: nowrap;
}

/* 待兑付列表 */
.pending-section { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.pending-card {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0;
}
.pending-card:last-child { border-bottom: none; }
.pending-main { flex: 1; min-width: 0; }
.pending-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.pending-product { font-size: 30rpx; font-weight: bold; color: #333; flex: 1; margin-right: 12rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-badge.approved { background: #e6f7ff; color: #1890ff; }
.pending-meta { display: flex; gap: 16rpx; margin-bottom: 6rpx; }
.meta-item { font-size: 24rpx; color: #999; }
.pending-user { font-size: 24rpx; color: #666; margin-bottom: 4rpx; }
.pending-receiver { font-size: 24rpx; color: #333; margin-bottom: 4rpx; }
.pending-code { margin-bottom: 4rpx; display: flex; align-items: center; gap: 8rpx; }
.code-label { font-size: 24rpx; color: #999; }
.code-value { font-size: 28rpx; font-weight: bold; color: #667eea; letter-spacing: 4rpx; }
.pending-location { margin-bottom: 4rpx; display: flex; align-items: center; gap: 8rpx; }
.location-label { font-size: 24rpx; color: #999; }
.location-value { font-size: 24rpx; color: #667eea; }
.pending-price { margin-bottom: 4rpx; display: flex; align-items: center; gap: 8rpx; }
.price-label { font-size: 24rpx; color: #999; }
.price-value { font-size: 26rpx; font-weight: bold; color: #f5576c; }
.pending-time { font-size: 22rpx; color: #bbb; }
.pending-actions { display: flex; gap: 10rpx; flex-shrink: 0; align-self: center; }
.action-btn { padding: 14rpx 28rpx; border-radius: 8rpx; font-size: 26rpx; text-align: center; font-weight: bold; }
.action-btn.complete { background: #07c160; color: #fff; }

.loading, .empty-state { text-align: center; padding: 40rpx 0; }
.empty-text { font-size: 28rpx; color: #999; }

/* 确认弹窗 */
.modal-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.modal-content { width: 90%; background: #fff; border-radius: 16rpx; overflow: hidden; }
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 30rpx; border-bottom: 1rpx solid #f0f0f0;
}
.modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.modal-close { font-size: 36rpx; color: #999; padding: 10rpx; }
.modal-body { padding: 30rpx; }

.confirm-info { margin-bottom: 20rpx; }
.confirm-row { display: flex; justify-content: space-between; padding: 12rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.confirm-label { font-size: 28rpx; color: #999; }
.confirm-value { font-size: 28rpx; color: #333; font-weight: 500; }
.code-highlight { color: #667eea; font-weight: bold; letter-spacing: 4rpx; font-size: 32rpx; }
.price-highlight { color: #f5576c; font-weight: bold; }
.confirm-tip { font-size: 24rpx; color: #fa8c16; text-align: center; margin-top: 16rpx; }

.modal-footer { display: flex; gap: 20rpx; padding: 20rpx 30rpx; border-top: 1rpx solid #f0f0f0; }
.btn-cancel {
  flex: 1; height: 88rpx; line-height: 88rpx; text-align: center;
  background: #f5f5f5; color: #666; font-size: 30rpx; border-radius: 8rpx; border: none;
}
.btn-submit {
  flex: 1; height: 88rpx; line-height: 88rpx; text-align: center;
  background: #07c160; color: #fff; font-size: 30rpx; border-radius: 8rpx; border: none;
}
</style>
