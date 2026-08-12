<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑产品' : '新增产品'">
      <button class="btn-primary" @click="handleSubmit">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">基本信息</view>

        <view class="form-item">
          <text class="form-label">产品名称 *</text>
          <input v-model="form.productName" placeholder="请输入产品全称" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">产品代码</text>
          <input v-model="form.productCode" placeholder="如：CB0001" class="form-input" />
        </view>

        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">产品类型 *</text>
            <picker mode="selector" :range="typeLabels" @change="handleTypeChange">
              <view class="picker-value">
                <text>{{ typeLabels[typeIndex] }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item half">
            <text class="form-label">风险等级 *</text>
            <picker mode="selector" :range="riskLabels" @change="handleRiskChange">
              <view class="picker-value">
                <text>{{ riskLabels[riskIndex] }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">理财公司</text>
          <picker mode="selector" :range="companyNames" @change="handleCompanyChange">
            <view class="picker-value">
              <text>{{ selectedCompanyName || '请选择理财公司' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">期限与起购</view>

        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">产品期限(天)</text>
            <input type="number" v-model="form.termDays" placeholder="0" class="form-input" />
          </view>
          <view class="form-item half">
            <text class="form-label">起购金额(元)</text>
            <input type="digit" v-model="form.minAmount" placeholder="0" class="form-input" />
          </view>
        </view>

        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">业绩比较基准</text>
            <input v-model="form.benchmark" placeholder="如 3.5%" class="form-input" />
          </view>
          <view class="form-item half">
            <text class="form-label">管理费率(%)</text>
            <input type="digit" v-model="form.manageFee" placeholder="0" class="form-input" />
          </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">状态设置</view>

        <view class="form-item">
          <view class="switch-row">
            <text class="form-label">上架状态</text>
            <switch :checked="form.status" @change="form.status = !form.status" />
          </view>
        </view>

        <view class="form-item">
          <view class="switch-row">
            <text class="form-label">是否推荐</text>
            <switch :checked="form.recommended" @change="form.recommended = !form.recommended" />
          </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">产品说明</view>
        <view class="form-item">
          <textarea v-model="form.description" placeholder="产品介绍、投资范围、风险提示等" class="form-textarea" />
        </view>
      </view>

      <view v-if="isEdit" class="form-section danger-section">
        <view class="section-title danger">危险操作</view>
        <button class="btn-danger" @click="handleDelete">删除该产品</button>
      </view>

      <view class="footer-disclaimer">理财非存款，产品有风险，投资需谨慎</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAdminProductDetail, createProduct, updateProduct, deleteProduct } from '../../../api/wealth.js'

const productId = ref(null)
const isEdit = computed(() => !!productId.value)

const typeValues = ['bank-wealth', 'stock-fund', 'bond-fund', 'mixed-fund', 'money-fund']
const typeLabels = ['银行理财', '股票基金', '债券基金', '混合基金', '货币基金']
const riskValues = ['R1', 'R2', 'R3', 'R4', 'R5']
const riskLabels = ['R1 低风险', 'R2 中低风险', 'R3 中风险', 'R4 中高风险', 'R5 高风险']

const companyList = ref([])
const companyNames = computed(() => companyList.value.map(c => c.name))
const selectedCompanyName = computed(() => {
  if (!form.value.company) return ''
  const c = companyList.value.find(c => c.id === form.value.company)
  return c?.name || ''
})

const typeIndex = ref(0)
const riskIndex = ref(1)

const form = ref({
  productName: '',
  productCode: '',
  productType: 'bank-wealth',
  riskLevel: 'R2',
  company: null,
  termDays: 0,
  minAmount: 0,
  benchmark: '',
  manageFee: 0,
  status: true,
  recommended: false,
  description: ''
})

function handleTypeChange(e) {
  typeIndex.value = e.detail.value
  form.value.productType = typeValues[e.detail.value]
}
function handleRiskChange(e) {
  riskIndex.value = e.detail.value
  form.value.riskLevel = riskValues[e.detail.value]
}
function handleCompanyChange(e) {
  form.value.company = companyList.value[e.detail.value]?.id || null
}

async function loadProduct(id) {
  try {
    const data = await getAdminProductDetail(id)
    if (data) {
      Object.keys(form.value).forEach(k => {
        if (data[k] !== undefined) form.value[k] = data[k]
      })
      typeIndex.value = Math.max(0, typeValues.indexOf(data.productType))
      riskIndex.value = Math.max(0, riskValues.indexOf(data.riskLevel))
      if (data.company?.id) {
        companyList.value = [data.company]
        form.value.company = data.company.id
      }
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function handleSubmit() {
  if (!form.value.productName) {
    uni.showToast({ title: '请填写产品名称', icon: 'none' })
    return
  }
  try {
    if (isEdit.value) {
      await updateProduct(productId.value, form.value)
    } else {
      await createProduct(form.value)
    }
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

function handleDelete() {
  uni.showModal({
    title: '确认删除',
    content: '删除后不可恢复，确定要删除该产品吗？',
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteProduct(productId.value)
          uni.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 800)
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const id = page.$page?.options?.id || page.options?.id
  if (id) {
    productId.value = id
    loadProduct(id)
  }
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; display: flex; flex-direction: column; }
.form-scroll { flex: 1; padding: 20rpx; box-sizing: border-box; }

.btn-primary {
  background: #667eea; color: #fff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}
.btn-danger {
  background: #fff; color: #ff4d4f; padding: 20rpx; font-size: 28rpx;
  border-radius: 8rpx; border: 2rpx solid #ff4d4f; width: 100%;
}

.form-section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; }
.section-title.danger { color: #ff4d4f; }
.danger-section { border: 2rpx solid #ffebee; }

.form-item { margin-bottom: 24rpx; }
.form-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 10rpx; }
.form-input {
  width: 100%; height: 72rpx; padding: 0 20rpx; box-sizing: border-box;
  background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx;
}
.form-textarea {
  width: 100%; min-height: 200rpx; padding: 20rpx; box-sizing: border-box;
  background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx;
}
.form-row { display: flex; gap: 20rpx; }
.form-item.half { flex: 1; }

.picker-value {
  display: flex; justify-content: space-between; align-items: center;
  height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx;
}
.picker-arrow { font-size: 20rpx; color: #999; }

.switch-row { display: flex; justify-content: space-between; align-items: center; }

.footer-disclaimer {
  text-align: center; padding: 30rpx 0; color: #999;
  font-size: 22rpx;
}
</style>
