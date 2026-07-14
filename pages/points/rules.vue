<template>
  <view class="page-container">
    <PageHeader title="积分规则">
      <view class="header-right">
        <button class="btn-primary" @click="openAdd" v-if="hasPermission('menu.point-rule')">+ 新增</button>
      </view>
    </PageHeader>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-tabs">
        <view
          v-for="tab in taskGroups"
          :key="tab.value"
          class="filter-tab"
          :class="{ active: activeGroup === tab.value }"
          @click="activeGroup = tab.value"
        >{{ tab.label }}</view>
      </view>
      <view class="filter-switch">
        <text class="filter-label">仅启用</text>
        <switch :checked="onlyEnabled" @change="onlyEnabled = $event.detail.value" color="#07c160" />
      </view>
    </view>

    <!-- 规则列表 -->
    <view class="rule-list">
      <view v-for="item in filteredList" :key="item.action" class="rule-card">
        <view class="rule-info">
          <view class="rule-name-row">
            <text class="rule-action">{{ item.action }}</text>
            <view class="status-badge" :class="item.enabled ? 'active' : 'inactive'">
              {{ item.enabled ? '启用' : '禁用' }}
            </view>
            <view class="category-badge" :class="item.category">{{ item.category === 'increase' ? '增加' : '扣除' }}</view>
          </view>
          <view class="rule-desc" v-if="item.description">{{ item.description }}</view>
          <view class="rule-points-row">
            <text class="rule-points">{{ item.points }} 积分</text>
            <text class="rule-meta" v-if="item.limitPerDay > 0">每日上限 {{ item.limitPerDay }}次</text>
            <text class="rule-meta" v-if="item.isOneTime">一次性</text>
          </view>
        </view>
        <view class="rule-actions" v-if="hasPermission('menu.point-rule')">
          <view class="action-btn toggle" @click="handleToggle(item)">
            {{ item.enabled ? '禁用' : '启用' }}
          </view>
          <view class="action-btn edit" @click="openEdit(item)">编辑</view>
          <view class="action-btn delete" @click="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && filteredList.length === 0" class="empty-state">
      <text class="empty-text">暂无积分规则</text>
    </view>

    <!-- 新增/编辑弹窗 -->
    <view class="modal-mask" v-if="showModal" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isEdit ? '编辑积分规则' : '新增积分规则' }}</text>
          <text class="modal-close" @click="closeModal">✕</text>
        </view>
        <scroll-view scroll-y class="modal-body">
          <view class="form-item">
            <text class="form-label">动作标识 (action) <text class="required">*</text></text>
            <input type="text" v-model="form.action" placeholder="如 daily_sign_in" class="form-input" :disabled="isEdit" />
          </view>
          <view class="form-item">
            <text class="form-label">分类 <text class="required">*</text></text>
            <picker :range="categories" range-key="label" @change="onCategoryChange">
              <view class="picker-value">{{ getCategoryLabel(form.category) || '请选择' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">任务分组</text>
            <picker :range="taskGroupOptions" range-key="label" @change="onTaskGroupChange">
              <view class="picker-value">{{ getTaskGroupLabel(form.taskGroup) || '请选择' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">描述</text>
            <input type="text" v-model="form.description" placeholder="规则描述" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">积分数 <text class="required">*</text></text>
            <input type="number" v-model="form.points" placeholder="0" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">每日上限 (0=不限)</text>
            <input type="number" v-model="form.limitPerDay" placeholder="0" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">用户总上限 (0=不限)</text>
            <input type="number" v-model="form.limitPerUser" placeholder="0" class="form-input" />
          </view>
          <view class="form-item switch-row">
            <text class="form-label">一次性领取</text>
            <switch :checked="form.isOneTime" @change="form.isOneTime = $event.detail.value" color="#07c160" />
          </view>
          <view class="form-item switch-row">
            <text class="form-label">启用</text>
            <switch :checked="form.enabled" @change="form.enabled = $event.detail.value" color="#07c160" />
          </view>
          <view class="form-item">
            <text class="form-label">额外配置 (JSON)</text>
            <textarea v-model="form.extraConfig" placeholder='{"streakMilestones":[7,14,30]}' class="form-textarea" />
          </view>
        </scroll-view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeModal">取消</button>
          <button class="btn-submit" @click="handleSubmit" :loading="submitting" :disabled="submitting">{{ isEdit ? '保存' : '创建' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAdminRuleList, createRule, updateRule, deleteRule } from '../../src/api/points.js'
import { useUserStore } from '../../src/store/user.js'
import PageHeader from '../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const list = ref([])
const loading = ref(false)
const showModal = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const activeGroup = ref('all')
const onlyEnabled = ref(false)

const taskGroups = [
  { value: 'all', label: '全部' },
  { value: 'daily', label: '每日签到' },
  { value: 'interact', label: '互动' },
  { value: 'learn', label: '学习' },
  { value: 'social', label: '社交' },
  { value: 'onetime', label: '一次性' },
  { value: 'other', label: '其他' },
  { value: 'redeem', label: '兑换' },
  { value: 'penalty', label: '扣罚' },
]

const taskGroupOptions = taskGroups.filter(t => t.value !== 'all')

const categories = [
  { value: 'increase', label: '增加' },
  { value: 'decrease', label: '扣除' },
]

const filteredList = computed(() => {
  let result = list.value
  if (activeGroup.value !== 'all') {
    result = result.filter(r => r.taskGroup === activeGroup.value)
  }
  if (onlyEnabled.value) {
    result = result.filter(r => r.enabled)
  }
  return result
})

const defaultForm = () => ({
  action: '',
  category: 'increase',
  taskGroup: 'other',
  description: '',
  points: 0,
  limitPerDay: 0,
  limitPerUser: 0,
  limitPerDayPerUser: 0,
  isOneTime: false,
  enabled: true,
  extraConfig: '{}',
})
const form = ref(defaultForm())

function getCategoryLabel(val) {
  return categories.find(c => c.value === val)?.label || val
}
function getTaskGroupLabel(val) {
  return taskGroupOptions.find(t => t.value === val)?.label || val
}
function onCategoryChange(e) {
  form.value.category = categories[e.detail.value].value
}
function onTaskGroupChange(e) {
  form.value.taskGroup = taskGroupOptions[e.detail.value].value
}

async function loadData() {
  loading.value = true
  try {
    const res = await getAdminRuleList()
    list.value = Array.isArray(res) ? res : (res.list || [])
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function openAdd() {
  isEdit.value = false
  form.value = defaultForm()
  showModal.value = true
}

function openEdit(item) {
  isEdit.value = true
  let extraConfig = '{}'
  try {
    extraConfig = typeof item.extraConfig === 'string' ? item.extraConfig : JSON.stringify(item.extraConfig || {})
  } catch {}
  form.value = {
    documentId: item.documentId,
    action: item.action,
    category: item.category || 'increase',
    taskGroup: item.taskGroup || 'other',
    description: item.description || '',
    points: item.points || 0,
    limitPerDay: item.limitPerDay ?? 0,
    limitPerUser: item.limitPerUser ?? 0,
    limitPerDayPerUser: item.limitPerDayPerUser ?? 0,
    isOneTime: item.isOneTime ?? false,
    enabled: item.enabled !== false,
    extraConfig,
  }
  showModal.value = true
}

function closeModal() { showModal.value = false }

async function handleToggle(item) {
  if (submitting.value) return
  submitting.value = true
  try {
    await updateRule(item.documentId, { ...item, enabled: !item.enabled })
    uni.showToast({ title: item.enabled ? '已禁用' : '已启用', icon: 'success' })
    loadData()
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function handleSubmit() {
  if (!form.value.action.trim()) {
    uni.showToast({ title: '请输入动作标识', icon: 'none' }); return
  }
  submitting.value = true
  try {
    const payload = {
      action: form.value.action.trim(),
      category: form.value.category,
      taskGroup: form.value.taskGroup,
      description: form.value.description,
      points: Number(form.value.points) || 0,
      limitPerDay: Number(form.value.limitPerDay) || 0,
      limitPerUser: Number(form.value.limitPerUser) || 0,
      limitPerDayPerUser: Number(form.value.limitPerDayPerUser) || 0,
      isOneTime: form.value.isOneTime,
      enabled: form.value.enabled,
      extraConfig: form.value.extraConfig,
    }
    if (isEdit.value) {
      await updateRule(form.value.documentId, payload)
    } else {
      await createRule(payload)
    }
    uni.showToast({ title: isEdit.value ? '保存成功' : '创建成功', icon: 'success' })
    closeModal()
    loadData()
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function handleDelete(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除规则「${item.action}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteRule(item.documentId)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData()
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

onMounted(() => loadData())
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.btn-primary {
  background: #ff0000; color: #fff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}

/* 筛选栏 */
.filter-bar {
  background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx;
  display: flex; justify-content: space-between; align-items: center;
}
.filter-tabs { display: flex; flex-wrap: wrap; gap: 12rpx; flex: 1; }
.filter-tab {
  padding: 8rpx 20rpx; border-radius: 20rpx; font-size: 24rpx;
  background: #f5f5f5; color: #666;
}
.filter-tab.active { background: #667eea; color: #fff; }
.filter-switch { display: flex; align-items: center; gap: 8rpx; flex-shrink: 0; }
.filter-label { font-size: 24rpx; color: #666; }

/* 规则列表 */
.rule-list { display: flex; flex-direction: column; gap: 16rpx; }

.rule-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx;
  display: flex; justify-content: space-between; align-items: center;
}
.rule-info { flex: 1; }
.rule-name-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.rule-action { font-size: 30rpx; font-weight: bold; color: #333; }

.status-badge, .category-badge {
  padding: 4rpx 14rpx; border-radius: 20rpx; font-size: 22rpx;
}
.status-badge.active { background: #e8f5e9; color: #07c160; }
.status-badge.inactive { background: #ffebee; color: #ff4d4f; }
.category-badge.increase { background: #e3f2fd; color: #1976d2; }
.category-badge.decrease { background: #fce4ec; color: #c62828; }

.rule-desc { font-size: 26rpx; color: #666; margin-bottom: 8rpx; }
.rule-points-row { display: flex; align-items: center; gap: 16rpx; }
.rule-points { font-size: 34rpx; font-weight: bold; color: #667eea; }
.rule-meta { font-size: 24rpx; color: #999; }

.rule-actions { display: flex; gap: 12rpx; flex-shrink: 0; }
.action-btn { padding: 10rpx 20rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.toggle { background: #f5f5f5; color: #ff9800; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0;
}
.empty-text { font-size: 28rpx; color: #999; }

/* 弹窗 */
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

.modal-body { padding: 30rpx; max-height: 60vh; }

.form-item { margin-bottom: 28rpx; }
.form-item:last-child { margin-bottom: 0; }
.form-label { font-size: 28rpx; color: #333; margin-bottom: 12rpx; display: block; }
.required { color: #ff4d4f; }

.form-input {
  width: 100%; height: 80rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box;
}
.form-input[disabled] { color: #999; background: #eee; }

.form-textarea {
  width: 100%; height: 160rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 16rpx 20rpx; font-size: 26rpx; box-sizing: border-box;
}

.picker-value {
  height: 80rpx; line-height: 80rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 0 20rpx; font-size: 28rpx; color: #333;
}

.switch-row { display: flex; justify-content: space-between; align-items: center; }
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
</style>
