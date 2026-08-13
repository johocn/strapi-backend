<template>
  <view class="page-container">
    <PageHeader title="采集中心" />

    <view class="stats-grid">
      <view class="stat-card">
        <text class="stat-value">{{ overview.totalProducts || 0 }}</text>
        <text class="stat-label">总产品数</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ overview.todayCollected || 0 }}</text>
        <text class="stat-label">今日采集</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ overview.failedCount || 0 }}</text>
        <text class="stat-label">失败数</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ overview.lastRunTime || '--' }}</text>
        <text class="stat-label">最后运行</text>
      </view>
    </view>

    <!-- 产品采集功能区 -->
    <view class="collect-section">
      <view class="section-title">
        <text>产品采集</text>
        <text class="section-sub">输入产品代码，自动采集产品信息并与中国理财网核对</text>
      </view>

      <view class="collect-form">
        <view class="form-row">
          <text class="form-label">数据源</text>
          <picker mode="selector" :range="sourceOptions" :value="sourceIndex" @change="onSourceChange">
            <view class="picker-value">
              <text>{{ sourceOptions[sourceIndex] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-row">
          <text class="form-label">产品代码</text>
          <input
            v-model="productCodeInput"
            class="form-input"
            placeholder="如 LCYSRK006"
            maxlength="50"
          />
        </view>

        <button class="collect-btn" :disabled="collecting" @click="handleCollectProduct">
          {{ collecting ? '采集中...' : '采集产品信息' }}
        </button>
      </view>

      <!-- 采集结果展示 -->
      <view v-if="collectResult" class="collect-result">
        <view class="result-header">
          <text class="result-title">采集结果</text>
          <view class="verify-badge" :class="verifyBadgeClass">
            <text>{{ verifyBadgeText }}</text>
          </view>
        </view>

        <!-- 合并数据（入库数据，以中国理财网为准，可编辑） -->
        <view v-if="collectResult?.mergedData" class="data-block merged-block">
          <view class="block-title">
            <text class="block-tag merged">入库数据</text>
            <text class="block-name">以中国理财网为准（可编辑，登记编码除外）</text>
          </view>
          <view class="edit-form">
            <view class="edit-item">
              <text class="edit-label">产品名称(官网)</text>
              <input v-model="editForm.productName" class="edit-input" placeholder="产品名称" />
            </view>
            <view class="edit-item">
              <text class="edit-label">产品名称(理财网)</text>
              <input :value="editForm.productNameCw" class="edit-input readonly" disabled placeholder="中国理财网名称（不可修改）" />
            </view>
            <view class="edit-item">
              <text class="edit-label">产品编号</text>
              <input v-model="editForm.productCode" class="edit-input" placeholder="如 CSFB1Y26170A" />
            </view>
            <view class="edit-item">
              <text class="edit-label">登记编码</text>
              <input :value="editForm.registerCode" class="edit-input readonly" disabled placeholder="登记编码（不可修改）" />
            </view>
            <view class="edit-item">
              <text class="edit-label">风险等级</text>
              <picker mode="selector" :range="riskLabels" :value="riskPickerIndex" @change="onRiskChange">
                <view class="picker-value">
                  <text>{{ riskLabels[riskPickerIndex] }}</text>
                  <text class="picker-arrow">▼</text>
                </view>
              </picker>
            </view>
            <view class="edit-item">
              <text class="edit-label">投资性质</text>
              <picker mode="selector" :range="typeLabels" :value="typePickerIndex" @change="onTypeChange">
                <view class="picker-value">
                  <text>{{ typeLabels[typePickerIndex] }}</text>
                  <text class="picker-arrow">▼</text>
                </view>
              </picker>
            </view>
            <view class="edit-item">
              <text class="edit-label">运作模式</text>
              <input v-model="editForm.operationMode" class="edit-input" placeholder="运作模式" />
            </view>
            <view class="edit-item">
              <text class="edit-label">期限类型</text>
              <input v-model="editForm.termType" class="edit-input" placeholder="期限类型" />
            </view>
            <view class="edit-item">
              <text class="edit-label">发行机构</text>
              <picker mode="selector" :range="companyPickerOptions" :value="companyPickerIndex" @change="onCompanyChange">
                <view class="picker-value">
                  <text>{{ companyPickerOptions[companyPickerIndex] || '请选择' }}</text>
                  <text class="picker-arrow">▼</text>
                </view>
              </picker>
            </view>
            <view v-if="isManualCompany" class="edit-item">
              <text class="edit-label">公司名称</text>
              <input v-model="manualCompanyName" class="edit-input" placeholder="输入新公司名称" />
            </view>
            <view class="edit-item">
              <text class="edit-label">产品状态</text>
              <input v-model="editForm.productStatus" class="edit-input" placeholder="产品状态" />
            </view>
            <view class="edit-item">
              <text class="edit-label">业绩比较基准</text>
              <input v-model="editForm.benchmark" class="edit-input" placeholder="如 3.5%" />
            </view>
            <view class="edit-item">
              <text class="edit-label">发行日期</text>
              <input v-model="editForm.issueDate" class="edit-input" placeholder="YYYY-MM-DD" />
            </view>
            <view class="edit-item">
              <text class="edit-label">到期日期</text>
              <input v-model="editForm.maturityDate" class="edit-input" placeholder="YYYY-MM-DD" />
            </view>
            <view v-if="editForm.unitNav" class="edit-item">
              <text class="edit-label">单位净值</text>
              <text class="edit-value-readonly">{{ editForm.unitNav }}（{{ editForm.navDate || '' }}）</text>
            </view>
          </view>
        </view>

        <!-- 源数据（渤银理财） -->
        <view class="data-block">
          <view class="block-title">
            <text class="block-tag source">源数据</text>
            <text class="block-name">{{ collectResult.sourceData?.company || '渤银理财' }}</text>
          </view>
          <view class="data-list">
            <view class="data-item">
              <text class="data-label">产品名称</text>
              <text class="data-value">{{ collectResult.sourceData?.productName || '--' }}</text>
            </view>
            <view class="data-item">
              <text class="data-label">产品代码</text>
              <text class="data-value">{{ collectResult.sourceData?.productCode || '--' }}</text>
            </view>
            <view class="data-item">
              <text class="data-label">登记编码</text>
              <text class="data-value">{{ collectResult.sourceData?.registerCode || '--' }}</text>
            </view>
            <view class="data-item">
              <text class="data-label">风险等级</text>
              <text class="data-value">{{ collectResult.sourceData?.riskLevelRaw || collectResult.sourceData?.riskLevel || '--' }}</text>
            </view>
            <view class="data-item">
              <text class="data-label">业绩比较基准</text>
              <text class="data-value">{{ collectResult.sourceData?.benchmark || '--' }}</text>
            </view>
            <view class="data-item">
              <text class="data-label">发行日期</text>
              <text class="data-value">{{ collectResult.sourceData?.issueDate || '--' }}</text>
            </view>
            <view class="data-item">
              <text class="data-label">到期日期</text>
              <text class="data-value">{{ collectResult.sourceData?.maturityDate || '--' }}</text>
            </view>
          </view>
        </view>

        <!-- 中国理财网校验数据 -->
        <view v-if="collectResult.officialData" class="data-block">
          <view class="block-title">
            <text class="block-tag official">理财网</text>
            <text class="block-name">中国理财网校验</text>
          </view>
          <view class="data-list">
            <view class="data-item">
              <text class="data-label">产品名称</text>
              <text class="data-value">{{ collectResult.officialData?.productName || '--' }}</text>
            </view>
            <view class="data-item">
              <text class="data-label">登记编码</text>
              <text class="data-value highlight">{{ collectResult.officialData?.registerCode || '--' }}</text>
            </view>
            <view class="data-item">
              <text class="data-label">风险等级</text>
              <text class="data-value">{{ collectResult.officialData?.riskLevelRaw || collectResult.officialData?.riskLevel || '--' }}</text>
            </view>
            <view class="data-item">
              <text class="data-label">期限类型</text>
              <text class="data-value">{{ collectResult.officialData?.termTypeRaw || collectResult.officialData?.termType || '--' }}</text>
            </view>
            <view class="data-item">
              <text class="data-label">投资性质</text>
              <text class="data-value">{{ collectResult.officialData?.productTypeRaw || '--' }}</text>
            </view>
            <view class="data-item">
              <text class="data-label">运作模式</text>
              <text class="data-value">{{ collectResult.officialData?.operationMode || '--' }}</text>
            </view>
            <view class="data-item">
              <text class="data-label">发行机构</text>
              <text class="data-value">{{ collectResult.officialData?.companyName || '--' }}</text>
            </view>
            <view class="data-item">
              <text class="data-label">产品状态</text>
              <text class="data-value">{{ collectResult.officialData?.productStatus || '--' }}</text>
            </view>
          </view>
        </view>

        <!-- 校验差异列表 -->
        <view v-if="collectResult.verification" class="diff-block">
          <view class="block-title">
            <text class="block-tag diff">核对</text>
            <text class="block-name">数据核对结果</text>
          </view>
          <view v-if="collectResult.verification.differences.length === 0" class="diff-empty">
            <text>✓ 两源数据一致</text>
          </view>
          <view v-else class="diff-list">
            <view
              v-for="(diff, idx) in collectResult.verification.differences"
              :key="idx"
              class="diff-item"
              :class="diff.severity"
            >
              <view class="diff-header">
                <text class="diff-field">{{ diffFieldLabel(diff.field) }}</text>
                <text class="diff-severity" :class="diff.severity">{{ severityLabel(diff.severity) }}</text>
              </view>
              <view class="diff-values">
                <view class="diff-value-row">
                  <text class="diff-source-label">源:</text>
                  <text class="diff-source-val">{{ diff.sourceValue || '(空)' }}</text>
                </view>
                <view class="diff-value-row">
                  <text class="diff-official-label">网:</text>
                  <text class="diff-official-val">{{ diff.officialValue || '(空)' }}</text>
                </view>
              </view>
              <text class="diff-desc">{{ diff.description }}</text>
            </view>
          </view>
        </view>

        <!-- 校验失败提示 -->
        <view v-if="collectResult.verification?.status === 'no_register_code'" class="warn-tip">
          <text>⚠ 源数据未采集到登记编码，无法与中国理财网核对</text>
        </view>
        <view v-if="collectResult.verification?.status === 'not_found_on_official'" class="warn-tip">
          <text>⚠ 中国理财网未找到该登记编码对应的产品</text>
        </view>
        <view v-if="collectResult.verification?.status === 'verification_failed'" class="warn-tip">
          <text>⚠ 中国理财网校验异常：{{ collectResult.verification.error }}</text>
        </view>

        <!-- 入库成功后操作 -->
        <view v-if="confirmSuccess" class="success-block">
          <view class="success-tip">
            <text class="success-icon">✓</text>
            <text>{{ confirmSuccess.productName }} 入库成功</text>
          </view>
          <view class="success-actions">
            <button class="action-btn cancel" @click="resetCollect">继续采集</button>
            <button
              class="action-btn nav-collect"
              :disabled="collectingNav"
              @click="handleCollectNav"
            >
              {{ collectingNav ? '采集中...' : '采集净值' }}
            </button>
          </view>
        </view>

        <!-- 确认入库按钮（入库成功后隐藏） -->
        <view v-else class="confirm-actions">
          <button class="action-btn cancel" @click="resetCollect">取消</button>
          <button
            class="action-btn confirm"
            :disabled="confirming || !canConfirm"
            @click="handleConfirm"
          >
            {{ confirming ? '入库中...' : '确认入库' }}
          </button>
        </view>
      </view>
    </view>

    <view class="action-section">
      <view class="section-title">批量采集操作</view>
      <view class="action-row">
        <button class="action-btn" @click="handleTriggerCollect" :disabled="batchCollecting">
          {{ batchCollecting ? '采集中...' : '手动批量采集' }}
        </button>
        <button class="action-btn secondary" @click="handleRecalculate" :disabled="recalculating">
          {{ recalculating ? '计算中...' : '重算年化' }}
        </button>
        <button class="action-btn secondary" @click="handleRecalcRisk" :disabled="recalcRisk">
          {{ recalcRisk ? '计算中...' : '重算风险指标' }}
        </button>
      </view>
    </view>

    <view class="anomaly-section">
      <view class="section-title">
        <text>净值异动</text>
        <text class="section-sub">今日异常变动产品</text>
      </view>
      <view v-if="anomalies.length === 0" class="empty-row">
        <text>暂无异动</text>
      </view>
      <view v-for="item in anomalies" :key="item.id" class="anomaly-card">
        <view class="anomaly-header">
          <text class="anomaly-name">{{ item.product?.productName || '--' }}</text>
          <text class="anomaly-date">{{ item.navDate }}</text>
        </view>
        <view class="anomaly-body">
          <view class="anomaly-metric">
            <text class="metric-label">单位净值</text>
            <text class="metric-value">{{ item.unitNav }}</text>
          </view>
          <view class="anomaly-metric">
            <text class="metric-label">日变动</text>
            <text class="metric-value" :class="getChangeClass(item.changePercent)">
              {{ formatPercent(item.changePercent) }}
            </text>
          </view>
          <view class="anomaly-metric">
            <text class="metric-label">类型</text>
            <text class="metric-value warn">{{ item.anomalyType || '异常' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="footer-disclaimer">理财非存款，产品有风险，投资需谨慎</view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  getStatsOverview,
  getStatsAnomalies,
  triggerCollect,
  recalculate,
  recalculateRiskMetric,
  collectProduct,
  confirmCollect,
  getAdminCompanyList,
} from '../../../api/wealth.js'

// ===== 统计概览 =====
const overview = ref({})
const anomalies = ref([])

// ===== 产品采集 =====
const sourceOptions = ['渤银理财']
const sourceValues = ['cbhb']
const sourceIndex = ref(0)
const productCodeInput = ref('')
const collecting = ref(false)
const confirming = ref(false)
const collectResult = ref(null)
const confirmSuccess = ref(null) // 入库成功后保存产品信息
const collectingNav = ref(false)

// ===== 公司列表（Picker） =====
const companyList = ref([])
const companyPickerOptions = ref(['新增公司...'])
const companyPickerIndex = ref(0)
const isManualCompany = ref(false)
const manualCompanyName = ref('')

/** 重建公司 Picker 选项 */
function rebuildCompanyOptions() {
  const names = (companyList.value || []).map(c => c.name)
  companyPickerOptions.value = [...names, '新增公司...']
}

/** 模糊匹配公司名称：去除"有限公司/股份有限公司/有限责任公司"等后缀后比较 */
function fuzzyMatchCompany(name, list) {
  if (!name || !list || !list.length) return -1
  const normalize = (s) => (s || '')
    .replace(/(股份有限公司|有限责任公司|有限公司|股份公司|公司|集团)$/g, '')
    .trim()
  const target = normalize(name)
  if (!target) return -1

  // 1. 精确匹配
  let idx = list.findIndex(c => c.name === name)
  if (idx >= 0) return idx

  // 2. 归一化后精确匹配
  idx = list.findIndex(c => normalize(c.name) === target)
  if (idx >= 0) return idx

  // 3. 双向 includes（短名包含在长名中）
  idx = list.findIndex(c => {
    const cn = normalize(c.name)
    return cn.includes(target) || target.includes(cn)
  })
  if (idx >= 0) return idx

  return -1
}

// ===== 风险等级 / 投资性质 Picker =====
const riskValues = ['R1', 'R2', 'R3', 'R4', 'R5']
const riskLabels = ['R1 低风险', 'R2 中低风险', 'R3 中风险', 'R4 中高风险', 'R5 高风险']
const riskPickerIndex = ref(1)

const typeValues = ['bank-wealth', 'stock-fund', 'bond-fund', 'mixed-fund', 'money-fund']
const typeLabels = ['银行理财', '股票基金', '债券基金', '混合基金', '货币基金']
const typePickerIndex = ref(0)

// ===== 可编辑入库表单 =====
const editForm = ref({
  productName: '',
  productNameCw: '',
  registerCode: '',
  productCode: '',
  saleCode: '',
  riskLevel: 'R2',
  productType: 'bank-wealth',
  operationMode: '',
  termType: '',
  company: null,
  companyName: '',
  productStatus: '',
  benchmark: '',
  issueDate: '',
  maturityDate: '',
  unitNav: null,
  navDate: '',
})

const currentSource = computed(() => sourceValues[sourceIndex.value])

/** 是否可入库：以编辑表单为准，至少需要产品名称 */
const canConfirm = computed(() => {
  return !!(editForm.value.productName && editForm.value.productNameCw && editForm.value.registerCode)
})

const verifyBadgeClass = computed(() => {
  const status = collectResult.value?.verification?.status
  if (status === 'full_match') return 'green'
  if (status === 'partial_match') return 'yellow'
  if (status === 'mismatch') return 'red'
  return 'gray'
})

const verifyBadgeText = computed(() => {
  const status = collectResult.value?.verification?.status
  const map = {
    full_match: '完全匹配',
    partial_match: '部分匹配',
    mismatch: '不匹配',
    no_register_code: '未核对',
    not_found_on_official: '理财网未找到',
    verification_failed: '核对失败',
  }
  return map[status] || '未知'
})

function onSourceChange(e) {
  sourceIndex.value = e.detail.value
}

/** 采集完成后，用 mergedData 填充可编辑表单 */
function initEditForm(mergedData) {
  const d = mergedData || {}
  editForm.value = {
    productName: d.productName || '',
    productNameCw: d.productNameCw || '',
    registerCode: d.registerCode || '',
    productCode: d.productCode || '',
    saleCode: d.saleCode || '',
    riskLevel: d.riskLevel || 'R2',
    productType: d.productType || 'bank-wealth',
    operationMode: d.operationMode || '',
    termType: d.termType || '',
    company: null,
    companyName: d.companyName || d.company || '',
    productStatus: d.productStatus || '',
    benchmark: d.benchmark || '',
    issueDate: d.issueDate || '',
    maturityDate: d.maturityDate || '',
    unitNav: d.unitNav || null,
    navDate: d.navDate || '',
  }

  // 同步 Picker 索引
  riskPickerIndex.value = Math.max(0, riskValues.indexOf(editForm.value.riskLevel))
  typePickerIndex.value = Math.max(0, typeValues.indexOf(editForm.value.productType))

  // 尝试模糊匹配已有公司
  const companyName = editForm.value.companyName
  if (companyName) {
    const idx = fuzzyMatchCompany(companyName, companyList.value)
    if (idx >= 0) {
      companyPickerIndex.value = idx
      isManualCompany.value = false
      editForm.value.company = companyList.value[idx].id
      editForm.value.companyName = companyList.value[idx].name
    } else {
      companyPickerIndex.value = companyPickerOptions.value.length - 1
      isManualCompany.value = true
      manualCompanyName.value = companyName
    }
  } else {
    companyPickerIndex.value = 0
    isManualCompany.value = false
  }
}

function onRiskChange(e) {
  riskPickerIndex.value = e.detail.value
  editForm.value.riskLevel = riskValues[e.detail.value]
}

function onTypeChange(e) {
  typePickerIndex.value = e.detail.value
  editForm.value.productType = typeValues[e.detail.value]
}

function onCompanyChange(e) {
  companyPickerIndex.value = e.detail.value
  const lastIdx = companyPickerOptions.value.length - 1
  if (Number(e.detail.value) === lastIdx) {
    isManualCompany.value = true
    editForm.value.company = null
  } else {
    isManualCompany.value = false
    const company = companyList.value[e.detail.value]
    editForm.value.company = company?.id || null
    editForm.value.companyName = company?.name || ''
  }
}

async function loadCompanies() {
  try {
    const res = await getAdminCompanyList({ pageSize: 500 })
    companyList.value = res.list || []
    rebuildCompanyOptions()
  } catch (e) {
    console.error('loadCompanies', e)
  }
}

async function handleCollectProduct() {
  const code = productCodeInput.value.trim()
  if (!code) {
    uni.showToast({ title: '请输入产品代码', icon: 'none' })
    return
  }

  collecting.value = true
  collectResult.value = null
  try {
    const res = await collectProduct(currentSource.value, code)
    collectResult.value = res
    if (!res?.sourceData) {
      uni.showToast({ title: '未采集到产品信息', icon: 'none' })
    } else {
      // 用合并数据填充可编辑表单
      initEditForm(res.mergedData || res.sourceData)
      uni.showToast({ title: '采集完成', icon: 'success' })
    }
  } catch (e) {
    console.error('采集失败', e)
    uni.showToast({ title: e?.message || '采集失败', icon: 'none' })
  } finally {
    collecting.value = false
  }
}

async function handleConfirm() {
  if (!canConfirm.value) return

  confirming.value = true
  try {
    // 公司值：Picker 选了已有公司则用 ID，手动输入则用名称字符串（后端自动创建）
    let companyValue = editForm.value.company
    if (!companyValue && isManualCompany.value && manualCompanyName.value.trim()) {
      companyValue = manualCompanyName.value.trim()
    }

    const payload = {
      productCode: editForm.value.productCode || editForm.value.saleCode || '',
      productName: editForm.value.productName,
      productNameCw: editForm.value.productNameCw || null,
      saleCode: editForm.value.productCode || editForm.value.saleCode || null,
      productType: editForm.value.productType || 'bank-wealth',
      registerCode: editForm.value.registerCode || null,
      riskLevel: editForm.value.riskLevel || 'R2',
      termType: editForm.value.termType || null,
      operationMode: editForm.value.operationMode || null,
      productStatus: editForm.value.productStatus || null,
      issueDate: editForm.value.issueDate || null,
      maturityDate: editForm.value.maturityDate || null,
      benchmark: editForm.value.benchmark || null,
      remark: '',
      company: companyValue,
      status: true,
    }

    const result = await confirmCollect(payload)
    uni.showToast({ title: '入库成功', icon: 'success' })
    // 保存成功信息，显示采集净值按钮
    confirmSuccess.value = { productId: result.id, productName: result.productName }
    // 刷新统计
    loadOverview()
  } catch (e) {
    console.error('入库失败', e)
    uni.showToast({ title: e?.message || '入库失败', icon: 'none' })
  } finally {
    confirming.value = false
  }
}

/** 采集净值：针对刚入库的产品触发净值采集 */
async function handleCollectNav() {
  if (!confirmSuccess.value) return
  collectingNav.value = true
  try {
    await triggerCollect({ productId: confirmSuccess.value.productId })
    uni.showToast({ title: '净值采集已触发', icon: 'success' })
    resetCollect()
  } catch (e) {
    console.error('触发净值采集失败', e)
    uni.showToast({ title: e?.message || '触发失败', icon: 'none' })
  } finally {
    collectingNav.value = false
  }
}

function resetCollect() {
  collectResult.value = null
  confirmSuccess.value = null
  productCodeInput.value = ''
  isManualCompany.value = false
  manualCompanyName.value = ''
  companyPickerIndex.value = 0
}

function diffFieldLabel(field) {
  const map = {
    productName: '产品名称',
    registerCode: '登记编码',
    riskLevel: '风险等级',
    termType: '期限类型',
    productType: '投资性质',
  }
  return map[field] || field
}

function severityLabel(s) {
  const map = { info: '提示', warning: '警告', error: '错误' }
  return map[s] || s
}

// ===== 批量采集 =====
const batchCollecting = ref(false)
const recalculating = ref(false)
const recalcRisk = ref(false)

async function loadOverview() {
  try {
    overview.value = await getStatsOverview() || {}
  } catch (e) {
    console.error('loadOverview', e)
  }
}

async function loadAnomalies() {
  try {
    const res = await getStatsAnomalies({ page: 1, pageSize: 20 })
    anomalies.value = res.list || []
  } catch (e) {
    console.error('loadAnomalies', e)
  }
}

async function handleTriggerCollect() {
  batchCollecting.value = true
  try {
    await triggerCollect({})
    uni.showToast({ title: '批量采集已触发', icon: 'success' })
    setTimeout(() => { loadOverview(); loadAnomalies() }, 2000)
  } catch (e) {
    uni.showToast({ title: '触发失败', icon: 'none' })
  } finally {
    batchCollecting.value = false
  }
}

async function handleRecalculate() {
  recalculating.value = true
  try {
    await recalculate()
    uni.showToast({ title: '年化重算完成', icon: 'success' })
    loadOverview()
  } catch (e) {
    uni.showToast({ title: '重算失败', icon: 'none' })
  } finally {
    recalculating.value = false
  }
}

async function handleRecalcRisk() {
  recalcRisk.value = true
  try {
    await recalculateRiskMetric()
    uni.showToast({ title: '风险指标重算完成', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '重算失败', icon: 'none' })
  } finally {
    recalcRisk.value = false
  }
}

function formatPercent(val) {
  if (val === null || val === undefined) return '--'
  return (val * 100).toFixed(2) + '%'
}
function getChangeClass(val) {
  if (val > 0) return 'up'
  if (val < 0) return 'down'
  return 'flat'
}

onMounted(() => {
  loadOverview()
  loadAnomalies()
  loadCompanies()
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-bottom: 20rpx; }
.stat-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx; text-align: center;
}
.stat-value { font-size: 40rpx; font-weight: bold; color: #333; display: block; }
.stat-label { font-size: 24rpx; color: #999; margin-top: 8rpx; display: block; }

/* 产品采集区 */
.collect-section {
  background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx;
}
.section-title {
  font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx;
  display: flex; align-items: baseline; gap: 12rpx; flex-wrap: wrap;
}
.section-sub { font-size: 22rpx; color: #999; font-weight: normal; }

.collect-form { margin-bottom: 20rpx; }
.form-row {
  display: flex; align-items: center; margin-bottom: 16rpx; gap: 16rpx;
}
.form-label {
  font-size: 26rpx; color: #666; width: 120rpx; flex-shrink: 0;
}
.form-input {
  flex: 1; height: 70rpx; border: 1rpx solid #e0e0e0;
  border-radius: 8rpx; padding: 0 20rpx; font-size: 26rpx;
}
.picker-value {
  flex: 1; height: 70rpx; border: 1rpx solid #e0e0e0; border-radius: 8rpx;
  padding: 0 20rpx; font-size: 26rpx; display: flex; align-items: center;
  justify-content: space-between;
}
.picker-arrow { font-size: 20rpx; color: #999; }

.collect-btn {
  width: 100%; background: #667eea; color: #fff;
  padding: 20rpx; font-size: 28rpx; border-radius: 8rpx; border: none;
  margin-top: 10rpx;
}
.collect-btn[disabled] { opacity: 0.5; }

/* 采集结果 */
.collect-result {
  margin-top: 24rpx; border-top: 1rpx solid #eee; padding-top: 24rpx;
}
.result-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20rpx;
}
.result-title { font-size: 30rpx; font-weight: bold; color: #333; }
.verify-badge {
  padding: 6rpx 20rpx; border-radius: 20rpx; font-size: 22rpx;
}
.verify-badge.green { background: #e6f7ec; color: #52c41a; }
.verify-badge.yellow { background: #fff7e6; color: #fa8c16; }
.verify-badge.red { background: #fff1f0; color: #f5222d; }
.verify-badge.gray { background: #f5f5f5; color: #999; }

/* 数据块 */
.data-block {
  background: #fafafa; border-radius: 8rpx; padding: 20rpx;
  margin-bottom: 16rpx;
}
.data-block.merged-block {
  background: #f0f9ff; border: 2rpx solid #bae7ff;
}
.block-title {
  display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx;
}
.block-tag {
  font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 4rpx;
  color: #fff;
}
.block-tag.source { background: #667eea; }
.block-tag.official { background: #07c160; }
.block-tag.merged { background: #1890ff; }
.block-tag.diff { background: #fa8c16; }
.block-name { font-size: 26rpx; color: #666; font-weight: 500; }

.data-list { display: flex; flex-direction: column; gap: 10rpx; }
.data-item {
  display: flex; align-items: flex-start; gap: 16rpx;
  padding: 6rpx 0;
}
.data-label {
  font-size: 24rpx; color: #999; width: 180rpx; flex-shrink: 0;
}
.data-value {
  font-size: 24rpx; color: #333; flex: 1; word-break: break-all;
}
.data-value.highlight {
  color: #1890ff; font-weight: bold;
}

/* 可编辑表单 */
.edit-form { display: flex; flex-direction: column; gap: 12rpx; }
.edit-item {
  display: flex; align-items: center; gap: 16rpx;
}
.edit-label {
  font-size: 24rpx; color: #999; width: 180rpx; flex-shrink: 0;
}
.edit-input {
  flex: 1; height: 60rpx; border: 1rpx solid #d9d9d9;
  border-radius: 6rpx; padding: 0 16rpx; font-size: 24rpx; color: #333;
}
.edit-input.readonly {
  background: #f5f5f5; color: #1890ff; font-weight: bold;
}
.edit-value-readonly {
  flex: 1; font-size: 24rpx; color: #333;
}

/* 差异块 */
.diff-block {
  background: #fffbe6; border-radius: 8rpx; padding: 20rpx;
  margin-bottom: 16rpx; border: 1rpx solid #ffe58f;
}
.diff-empty {
  text-align: center; color: #52c41a; font-size: 26rpx; padding: 20rpx;
}
.diff-list { display: flex; flex-direction: column; gap: 16rpx; }
.diff-item {
  background: #fff; border-radius: 6rpx; padding: 16rpx;
  border-left: 4rpx solid #999;
}
.diff-item.info { border-left-color: #1890ff; }
.diff-item.warning { border-left-color: #fa8c16; }
.diff-item.error { border-left-color: #f5222d; }
.diff-header {
  display: flex; justify-content: space-between; margin-bottom: 10rpx;
}
.diff-field { font-size: 26rpx; font-weight: bold; color: #333; }
.diff-severity { font-size: 22rpx; padding: 2rpx 10rpx; border-radius: 4rpx; }
.diff-severity.info { background: #e6f7ff; color: #1890ff; }
.diff-severity.warning { background: #fff7e6; color: #fa8c16; }
.diff-severity.error { background: #fff1f0; color: #f5222d; }
.diff-values { margin-bottom: 8rpx; }
.diff-value-row {
  display: flex; gap: 8rpx; padding: 4rpx 0; font-size: 22rpx;
}
.diff-source-label { color: #667eea; flex-shrink: 0; }
.diff-source-val { color: #333; }
.diff-official-label { color: #07c160; flex-shrink: 0; }
.diff-official-val { color: #333; }
.diff-desc { font-size: 22rpx; color: #999; }

.warn-tip {
  background: #fff7e6; border-radius: 6rpx; padding: 16rpx;
  color: #fa8c16; font-size: 24rpx; margin-bottom: 16rpx;
}

/* 确认按钮 */
.confirm-actions {
  display: flex; gap: 16rpx; margin-top: 20rpx;
}
.confirm-actions .action-btn {
  flex: 1; padding: 20rpx; font-size: 28rpx; border-radius: 8rpx; border: none;
}
.action-btn.cancel {
  background: #f5f5f5; color: #666;
}
.action-btn.confirm {
  background: #52c41a; color: #fff;
}
.action-btn.confirm[disabled] { opacity: 0.5; }

/* 入库成功区块 */
.success-block {
  margin-top: 20rpx;
}
.success-tip {
  display: flex; align-items: center; gap: 12rpx;
  padding: 20rpx; background: #f6ffed; border-radius: 8rpx;
  border: 2rpx solid #b7eb8f; margin-bottom: 16rpx;
}
.success-icon {
  font-size: 32rpx; color: #52c41a; font-weight: bold;
}
.success-tip text:last-child {
  font-size: 26rpx; color: #389e0d; flex: 1;
}
.success-actions {
  display: flex; gap: 16rpx;
}
.success-actions .action-btn {
  flex: 1; padding: 20rpx; font-size: 28rpx; border-radius: 8rpx; border: none;
}
.action-btn.nav-collect {
  background: #1890ff; color: #fff;
}
.action-btn.nav-collect[disabled] { opacity: 0.5; }

/* 批量操作区 */
.action-section, .anomaly-section {
  background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx;
}
.action-row { display: flex; gap: 16rpx; flex-wrap: wrap; }
.action-btn {
  flex: 1; min-width: 180rpx; background: #667eea; color: #fff;
  padding: 20rpx; font-size: 28rpx; border-radius: 8rpx; border: none;
}
.action-btn.secondary { background: #f0f4ff; color: #667eea; }
.action-btn[disabled] { opacity: 0.5; }

.empty-row { text-align: center; padding: 40rpx; color: #999; font-size: 26rpx; }

.anomaly-card { background: #f9f9f9; border-radius: 8rpx; padding: 20rpx; margin-bottom: 16rpx; }
.anomaly-header { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
.anomaly-name { font-size: 28rpx; font-weight: bold; color: #333; }
.anomaly-date { font-size: 22rpx; color: #999; }
.anomaly-body { display: flex; justify-content: space-between; }
.anomaly-metric { text-align: center; flex: 1; }
.metric-label { font-size: 22rpx; color: #999; display: block; }
.metric-value { font-size: 28rpx; color: #333; font-weight: bold; }
.metric-value.up { color: #f5222d; }
.metric-value.down { color: #07c160; }
.metric-value.warn { color: #fa8c16; }

.footer-disclaimer {
  text-align: center; padding: 30rpx 0; color: #999;
  font-size: 22rpx;
}
</style>
