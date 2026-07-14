<template>
  <view class="page-container">
    <PageHeader title="模板管理">
      <template #actions>
        <view class="header-btn" @click="openCreateDialog">
          <text>+ 新建模板</text>
        </view>
      </template>
    </PageHeader>

    <scroll-view scroll-y class="template-body">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>
      <!-- 模板列表 -->
      <view v-else-if="templates.length > 0" class="template-list">
        <view v-for="item in templates" :key="item.documentId" class="template-card">
          <view class="template-header">
            <view class="template-info">
              <text class="template-name">{{ item.name }}</text>
              <view v-if="item.isDefault" class="template-badge default-badge">
                <text>默认</text>
              </view>
              <view v-if="!item.enabled" class="template-badge disabled-badge">
                <text>已禁用</text>
              </view>
            </view>
            <view class="template-actions">
              <text class="action-btn" @click="openEditDialog(item)">编辑</text>
              <text class="action-btn apply" v-if="item.enabled" @click="handleApply(item)">应用</text>
              <text class="action-btn" @click="handleDuplicate(item)">复制</text>
              <text class="action-btn danger" v-if="!item.isDefault" @click="handleDelete(item)">删除</text>
            </view>
          </view>
          <view v-if="item.description" class="template-desc">
            <text>{{ item.description }}</text>
          </view>
          <view class="template-meta">
            <text class="meta-text">关联站点: {{ item.sites?.length ?? 0 }} 个</text>
            <text class="meta-text">约束字段: {{ Object.keys(item.fieldConstraints ?? {}).length }} 个</text>
          </view>
        </view>
      </view>

      <view v-else class="empty-state">
        <text>暂无模板，点击右上角新建</text>
      </view>

      <!-- 新建/编辑弹窗 -->
      <view v-if="showDialog" class="dialog-overlay" @click.self="closeDialog">
        <view class="dialog-content">
          <view class="dialog-header">
            <text class="dialog-title">{{ isEdit ? '编辑模板' : '新建模板' }}</text>
            <text class="dialog-close" @click="closeDialog">✕</text>
          </view>

          <scroll-view scroll-y class="dialog-body">
            <view class="form-item">
              <text class="form-label">模板名称 *</text>
              <input v-model="dialogForm.name" class="form-input" placeholder="如：教育标准版" />
            </view>
            <view class="form-item">
              <text class="form-label">模板描述</text>
              <textarea v-model="dialogForm.description" class="form-textarea" placeholder="描述模板的适用场景" />
            </view>
            <view class="form-item">
              <view class="form-label-row">
                <text class="form-label">启用</text>
                <switch :checked="dialogForm.enabled" @change="dialogForm.enabled = $event.detail.value" />
              </view>
            </view>
            <view class="form-item">
              <view class="form-label-row">
                <text class="form-label">设为默认</text>
                <switch :checked="dialogForm.isDefault" @change="dialogForm.isDefault = $event.detail.value" />
              </view>
            </view>

            <!-- 预设配置 -->
            <view class="form-section-title">预设配置</view>
            <view class="form-hint">
              <text>JSON 格式，结构与站点 extraConfig 一致</text>
            </view>
            <textarea v-model="presetConfigText" class="form-textarea code-textarea" placeholder='{"authMode":"local","pointsEnabled":true}' />

            <!-- 字段约束 -->
            <view class="form-section-title">字段约束</view>
            <view class="form-hint">
              <text>定义配置项的可见性和可编辑性，未定义的字段默认可见且可编辑</text>
            </view>
            <textarea v-model="fieldConstraintsText" class="form-textarea code-textarea" placeholder='{"authMode":{"visible":true,"editable":false}}' />
          </scroll-view>

          <view class="dialog-footer">
            <view class="dialog-btn cancel" @click="closeDialog">
              <text>取消</text>
            </view>
            <view class="dialog-btn confirm" :class="{ disabled: saving }" @click="handleSave">
              <text>保存</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, applyTemplateToSite } from '../../src/api/site-template.js'

const templates = ref([])
const showDialog = ref(false)
const isEdit = ref(false)
const editDocumentId = ref(null)
const applying = ref(false)
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)

const dialogForm = ref({
  name: '',
  description: '',
  enabled: true,
  isDefault: false,
})

const presetConfigText = ref('{}')
const fieldConstraintsText = ref('{}')

async function loadTemplates() {
  loading.value = true
  try {
    const res = await getTemplates()
    templates.value = res.list ?? []
  } catch (e) {
    // request.js 已处理错误展示
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  isEdit.value = false
  editDocumentId.value = null
  dialogForm.value = { name: '', description: '', enabled: true, isDefault: false }
  presetConfigText.value = '{}'
  fieldConstraintsText.value = '{}'
  showDialog.value = true
}

function openEditDialog(item) {
  isEdit.value = true
  editDocumentId.value = item.documentId
  dialogForm.value = {
    name: item.name,
    description: item.description ?? '',
    enabled: item.enabled,
    isDefault: item.isDefault,
  }
  presetConfigText.value = JSON.stringify(item.presetConfig ?? {}, null, 2)
  fieldConstraintsText.value = JSON.stringify(item.fieldConstraints ?? {}, null, 2)
  showDialog.value = true
}

function closeDialog() {
  if (saving.value) return
  showDialog.value = false
}

async function handleSave() {
  if (saving.value) return
  saving.value = true
  if (!dialogForm.value.name?.trim()) {
    uni.showToast({ title: '请输入模板名称', icon: 'none' })
    saving.value = false
    return
  }

  let presetConfig, fieldConstraints
  try {
    presetConfig = JSON.parse(presetConfigText.value)
    if (typeof presetConfig !== 'object' || presetConfig === null || Array.isArray(presetConfig)) {
      uni.showToast({ title: '预设配置必须是 JSON 对象', icon: 'none' })
      saving.value = false
      return
    }
  } catch {
    uni.showToast({ title: '预设配置 JSON 格式错误', icon: 'none' })
    saving.value = false
    return
  }
  try {
    fieldConstraints = JSON.parse(fieldConstraintsText.value)
    if (typeof fieldConstraints !== 'object' || fieldConstraints === null || Array.isArray(fieldConstraints)) {
      uni.showToast({ title: '字段约束必须是 JSON 对象', icon: 'none' })
      saving.value = false
      return
    }
    // 校验 fieldConstraints 格式：值应为 { visible?: boolean, editable?: boolean }
    for (const [key, val] of Object.entries(fieldConstraints)) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        const hasValidKey = Object.keys(val).every(k => k === 'visible' || k === 'editable')
        const hasValidVal = Object.values(val).every(v => typeof v === 'boolean')
        if (!hasValidKey || !hasValidVal) {
          uni.showToast({ title: `字段"${key}"约束格式错误，仅支持 visible/editable 布尔值`, icon: 'none' })
          saving.value = false
          return
        }
      }
    }
  } catch {
    uni.showToast({ title: '字段约束 JSON 格式错误', icon: 'none' })
    saving.value = false
    return
  }

  const data = {
    ...dialogForm.value,
    presetConfig,
    fieldConstraints,
  }

  try {
    if (isEdit.value) {
      await updateTemplate(editDocumentId.value, data)
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await createTemplate(data)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    closeDialog()
    await loadTemplates()
  } catch (e) {
    // request.js 已处理错误展示
  } finally {
    saving.value = false
  }
}

async function handleDuplicate(item) {
  if (saving.value) return
  // 校验 presetConfig/fieldConstraints 类型
  const pc = item.presetConfig ?? {}
  const fc = item.fieldConstraints ?? {}
  if (typeof pc !== 'object' || pc === null || Array.isArray(pc)) {
    uni.showToast({ title: '源模板预设配置格式异常，无法复制', icon: 'none' })
    return
  }
  if (typeof fc !== 'object' || fc === null || Array.isArray(fc)) {
    uni.showToast({ title: '源模板字段约束格式异常，无法复制', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await createTemplate({
      name: `${item.name} (副本)`,
      description: item.description ?? '',
      presetConfig: pc,
      fieldConstraints: fc,
      enabled: item.enabled,
      isDefault: false,
    })
    uni.showToast({ title: '复制成功', icon: 'success' })
    await loadTemplates()
  } catch (e) {
    // request.js 已处理错误展示
  } finally {
    saving.value = false
  }
}

async function handleApply(item) {
  if (applying.value) return
  if (!item.enabled) {
    uni.showToast({ title: '该模板已禁用，无法应用', icon: 'none' })
    return
  }
  // 第一步：确认是否应用
  const res1 = await uni.showModal({
    title: '应用模板',
    content: `将模板"${item.name}"应用到当前站点？`,
  })
  if (!res1.confirm) return

  // 第二步：选择模式
  const res2 = await uni.showModal({
    title: '选择应用模式',
    content: '合并模式：保留租户自定义值\n覆盖模式：用模板预设值替换所有配置',
    confirmText: '合并',
    cancelText: '覆盖',
  })
  // 遮罩关闭视为取消操作
  if (!res2.confirm && !res2.cancel) return

  let mode = res2.confirm ? 'merge' : 'overwrite'
  // 覆盖模式需二次确认
  if (mode === 'overwrite') {
    const res3 = await uni.showModal({
      title: '风险确认',
      content: '覆盖模式将用模板预设值替换站点所有配置，租户自定义值将丢失！确定继续？',
    })
    if (!res3.confirm) return
  }

  applying.value = true
  try {
    await applyTemplateToSite(item.documentId, mode)
    uni.showToast({ title: `应用成功（${mode === 'merge' ? '合并' : '覆盖'}模式）`, icon: 'success' })
    await loadTemplates()
  } catch (e) {
    // request.js 已处理错误展示
  } finally {
    applying.value = false
  }
}

async function handleDelete(item) {
  if (deleting.value) return
  if (item.isDefault) {
    uni.showToast({ title: '默认模板不可删除，请先将其他模板设为默认', icon: 'none' })
    return
  }
  // 检查是否有关联站点
  const siteCount = item.sites?.length ?? 0
  const warning = siteCount > 0 ? `\n\n该模板关联了 ${siteCount} 个站点，删除后这些站点将失去模板约束。` : ''
  const res = await uni.showModal({
    title: '确认删除',
    content: `确定要删除模板"${item.name}"吗？${warning}`,
  })
  if (!res.confirm) return

  deleting.value = true
  try {
    await deleteTemplate(item.documentId)
    uni.showToast({ title: '删除成功', icon: 'success' })
    await loadTemplates()
  } catch (e) {
    // request.js 已处理错误展示
  } finally {
    deleting.value = false
  }
}

onShow(() => {
  loadTemplates()
})
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; height: 100vh; background: #f5f5f5; }
.template-body { flex: 1; padding: 20rpx; }
.template-list { display: flex; flex-direction: column; gap: 20rpx; }
.template-card { background: #fff; border-radius: 16rpx; padding: 30rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.template-header { display: flex; justify-content: space-between; align-items: center; }
.template-info { display: flex; align-items: center; gap: 16rpx; }
.template-name { font-size: 32rpx; font-weight: 600; color: #333; }
.template-badge { padding: 4rpx 16rpx; border-radius: 8rpx; font-size: 22rpx; }
.default-badge { background: #e6f7ff; color: #1890ff; }
.disabled-badge { background: #fff1f0; color: #ff4d4f; }
.template-actions { display: flex; gap: 20rpx; }
.action-btn { font-size: 28rpx; color: #1890ff; }
.action-btn.apply { color: #52c41a; }
.action-btn.danger { color: #ff4d4f; }
.template-desc { margin-top: 16rpx; font-size: 26rpx; color: #999; }
.template-meta { margin-top: 16rpx; display: flex; gap: 30rpx; }
.meta-text { font-size: 24rpx; color: #666; }
.empty-state { text-align: center; padding: 100rpx 0; color: #999; font-size: 28rpx; }
.header-btn { padding: 12rpx 24rpx; background: #1890ff; color: #fff; border-radius: 8rpx; font-size: 26rpx; }

/* 弹窗 */
.dialog-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.dialog-content { width: 90%; max-height: 85vh; background: #fff; border-radius: 20rpx; display: flex; flex-direction: column; }
.dialog-header { display: flex; justify-content: space-between; align-items: center; padding: 30rpx; border-bottom: 1rpx solid #eee; }
.dialog-title { font-size: 34rpx; font-weight: 600; }
.dialog-close { font-size: 36rpx; color: #999; padding: 10rpx; }
.dialog-body { flex: 1; padding: 30rpx; overflow-y: auto; }
.dialog-footer { display: flex; gap: 20rpx; padding: 30rpx; border-top: 1rpx solid #eee; }
.dialog-btn { flex: 1; text-align: center; padding: 20rpx; border-radius: 12rpx; font-size: 30rpx; }
.dialog-btn.cancel { background: #f5f5f5; color: #666; }
.dialog-btn.confirm { background: #1890ff; color: #fff; }

/* 表单 */
.form-item { margin-bottom: 24rpx; }
.form-label { font-size: 28rpx; color: #333; margin-bottom: 8rpx; display: block; }
.form-label-row { display: flex; justify-content: space-between; align-items: center; }
.form-input { width: 100%; padding: 16rpx; border: 1rpx solid #ddd; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.form-textarea { width: 100%; padding: 16rpx; border: 1rpx solid #ddd; border-radius: 8rpx; font-size: 28rpx; min-height: 120rpx; box-sizing: border-box; }
.code-textarea { font-family: monospace; min-height: 200rpx; }
.form-section-title { font-size: 30rpx; font-weight: 600; color: #333; margin: 30rpx 0 16rpx; padding-left: 16rpx; border-left: 6rpx solid #1890ff; }
.form-hint { font-size: 24rpx; color: #999; margin-bottom: 12rpx; }
</style>
