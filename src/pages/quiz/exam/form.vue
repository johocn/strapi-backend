<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑考试' : '新增考试'" />

    <view class="form-section">
      <view class="form-item">
        <text class="form-label">考试标题 <text class="required">*</text></text>
        <input
          type="text"
          v-model="form.title"
          placeholder="请输入考试标题"
          class="form-input"
        />
      </view>

      <view class="form-item">
        <text class="form-label">考试描述</text>
        <textarea
          v-model="form.description"
          placeholder="请输入考试描述（可选）"
          class="form-textarea"
        />
      </view>

      <view class="form-item">
        <text class="form-label">时间限制（分钟）</text>
        <input
          type="number"
          v-model="form.timeLimit"
          placeholder="请输入时间限制"
          class="form-input"
        />
      </view>

      <view class="form-item">
        <text class="form-label">及格分数</text>
        <input
          type="number"
          v-model="form.passingScore"
          placeholder="请输入及格分数"
          class="form-input"
        />
      </view>

      <view class="form-item">
        <text class="form-label">状态</text>
        <picker mode="selector" :range="statusOptions" :range-key="'label'" @change="handleStatusChange">
          <view class="picker-value">
            <text>{{ statusOptions[statusIndex].label }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="form-section" v-if="roleGate" style="margin-top: 20rpx;">
      <view class="form-item">
        <text class="form-label">可见角色</text>
        <view class="visible-roles-group">
          <view
            v-for="r in roleOptions"
            :key="r.name"
            class="visible-role-opt"
            :class="{ 'visible-role-opt-selected': form.visibleToRoles.includes(r.name) }"
            @click="toggleVisibleRole(r.name)"
          >
            <text>{{ r.displayName || r.name }}</text>
            <text v-if="form.visibleToRoles.includes(r.name)" class="visible-role-check">✓</text>
          </view>
          <view v-if="roleOptions.length === 0" class="form-hint">未获取到角色</view>
        </view>
        <text class="form-hint">不勾选（留空）表示对所有角色可见</text>
      </view>
    </view>

    <view class="form-actions">
      <button class="btn-delete" v-if="isEdit" @click="handleDelete">删除</button>
      <button class="btn-submit" @click="handleSubmit" :loading="submitting">
        {{ isEdit ? '保存' : '创建' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import PageHeader from '../../../components/PageHeader.vue'
import { getExamDetail, createExam, updateExam, deleteExam } from '../../../api/quiz.js'
import { getAllRoles } from '../../../api/auth.js'
import { loadSiteConfig, isFeatureEnabled } from '../../../utils/config-helper.js'

const isEdit = ref(false)
const documentId = ref('')
const submitting = ref(false)
const roleGate = ref(false)
const roleOptions = ref([])

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
]
const statusIndex = ref(0)

const form = ref({
  title: '',
  description: '',
  timeLimit: '',
  passingScore: '',
  status: 'draft',
  visibleToRoles: [],
})

onMounted(async () => {
  await loadSiteConfig()
  roleGate.value = isFeatureEnabled('roleGate')
  if (roleGate.value) loadRoleOptions()
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const id = page.options?.id
  if (id) {
    isEdit.value = true
    documentId.value = id
    loadDetail(id)
  }
})

async function loadRoleOptions() {
  try {
    const list = await getAllRoles()
    roleOptions.value = Array.isArray(list) ? list : []
  } catch (e) {
    console.warn('获取角色列表失败，使用空列表', e)
    roleOptions.value = []
  }
}

function toggleVisibleRole(roleName) {
  const idx = form.value.visibleToRoles.indexOf(roleName)
  if (idx > -1) form.value.visibleToRoles.splice(idx, 1)
  else form.value.visibleToRoles.push(roleName)
}

async function loadDetail(id) {
  try {
    const data = await getExamDetail(id)
    if (data) {
      form.value.title = data.title || ''
      form.value.description = data.description || ''
      form.value.timeLimit = data.timeLimit ?? ''
      form.value.passingScore = data.passingScore ?? ''
      form.value.status = data.status || 'draft'
      form.value.visibleToRoles = Array.isArray(data.visibleToRoles) ? data.visibleToRoles : []
      const idx = statusOptions.findIndex(s => s.value === form.value.status)
      if (idx > -1) statusIndex.value = idx
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function handleStatusChange(e) {
  statusIndex.value = e.detail.value
  form.value.status = statusOptions[statusIndex.value].value
}

async function handleSubmit() {
  if (!form.value.title.trim()) {
    uni.showToast({ title: '请输入考试标题', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const payload = {
      title: form.value.title.trim(),
      description: form.value.description || undefined,
      timeLimit: form.value.timeLimit ? Number(form.value.timeLimit) : undefined,
      passingScore: form.value.passingScore ? Number(form.value.passingScore) : undefined,
      status: form.value.status,
      // 可见角色（仅租户开启 roleGate 时下发）
      visibleToRoles: roleGate.value ? (Array.isArray(form.value.visibleToRoles) ? form.value.visibleToRoles : []) : undefined,
    }
    if (isEdit.value) {
      await updateExam(documentId.value, payload)
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      await createExam(payload)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    setTimeout(() => uni.navigateBack(), 500)
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function handleDelete() {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除考试「${form.value.title}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteExam(documentId.value)
          uni.showToast({ title: '删除成功', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 500)
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.form-section { background: #fff; border-radius: 12rpx; padding: 20rpx; }

.form-item { margin-bottom: 32rpx; }
.form-item:last-child { margin-bottom: 0; }

.form-label { font-size: 28rpx; color: #333; margin-bottom: 12rpx; display: block; }
.required { color: #ff4d4f; }

.form-input {
  width: 100%; height: 80rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box;
}

.form-textarea {
  width: 100%; min-height: 160rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 20rpx; font-size: 28rpx; box-sizing: border-box;
}

.picker-value {
  display: flex; justify-content: space-between; align-items: center;
  height: 80rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 0 20rpx; font-size: 28rpx;
}
.picker-arrow { font-size: 20rpx; color: #999; }

.form-actions {
  display: flex; gap: 20rpx; margin-top: 40rpx; padding: 0 20rpx;
}

.btn-delete {
  flex: 1; height: 88rpx; line-height: 88rpx; text-align: center;
  background: #fff0f0; color: #ff4d4f; font-size: 30rpx; border-radius: 8rpx; border: none;
}

.btn-submit {
  flex: 1; height: 88rpx; line-height: 88rpx; text-align: center;
  background: #07c160; color: #fff; font-size: 30rpx; border-radius: 8rpx; border: none;
}

.form-hint { font-size: 24rpx; color: #999; margin-top: 8rpx; line-height: 1.4; }
.visible-roles-group { display: flex; flex-wrap: wrap; gap: 16rpx; }
.visible-role-opt { display: flex; align-items: center; gap: 6rpx; padding: 12rpx 20rpx; border: 1rpx solid #ddd; border-radius: 20rpx; font-size: 26rpx; color: #333; background: #fff; }
.visible-role-opt-selected { border-color: #07c160; color: #fff; background: #07c160; }
.visible-role-check { font-size: 24rpx; }
</style>
