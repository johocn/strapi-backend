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

    <!-- 规则列表搜索 -->
    <view class="rule-search" v-if="showRuleSearch">
      <input v-model="searchKeyword" type="text" placeholder="搜索任务名/动作/描述" class="search-input" />
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
            <text class="form-label">任务标题</text>
            <input type="text" v-model="form.name" placeholder="任务展示名称" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">图标</text>
            <input type="text" v-model="form.icon" placeholder="可填 emoji 或图片URL" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">任务链接类型</text>
            <picker :range="linkTypeOptions" range-key="label" @change="onLinkTypeChange">
              <view class="picker-value">{{ getLinkTypeLabel(form.linkType) }}</view>
            </picker>
          </view>
          <view class="form-item" v-if="form.linkType !== 'none'">
            <text class="form-label">已选内容</text>
            <view v-if="form.linkTitle" class="link-picked">
              <text class="link-picked-name">{{ form.linkTitle }}</text>
              <text class="link-picked-del" @click="clearLink">✕</text>
            </view>
            <view v-else class="link-add" @click="openContentPicker">+ 选择内容</view>
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

    <!-- 内容选择弹窗 -->
    <view class="modal-mask content-mask" v-if="contentModal" @click="contentModal = false">
      <view class="modal-content content-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择{{ linkTypeCn(pickLinkType) }}</text>
          <text class="modal-close" @click="contentModal = false">✕</text>
        </view>
        <view class="modal-body">
          <input
            v-if="contentList.length > 5"
            v-model="contentSearch"
            type="text"
            placeholder="搜索标题"
            class="content-search"
          />
          <view v-if="contentLoading" class="loading"><text>加载中...</text></view>
          <scroll-view v-else scroll-y class="content-scroll">
            <view
              v-for="c in filteredContent"
              :key="c.documentId"
              class="content-pick-item"
              @click="selectContent(c)"
            >
              <image v-if="c.cover" :src="c.cover" class="content-pick-thumb" mode="aspectFill" />
              <view class="content-pick-info">
                <text class="content-pick-title">{{ c.title || '未命名' }}</text>
                <text v-if="c.desc" class="content-pick-desc">{{ c.desc }}</text>
              </view>
            </view>
            <view v-if="filteredContent.length === 0" class="empty-state">
              <text class="empty-text">暂无内容</text>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAdminRuleList, createRule, updateRule, deleteRule } from '../../api/points.js'
import { articleApi } from '../../api/website.js'
import { getCourseList } from '../../api/course.js'
import { listActivities } from '../../api/activity.js'
import { useUserStore } from '../../store/user.js'
import PageHeader from '../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const list = ref([])
const loading = ref(false)
const showModal = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const activeGroup = ref('all')
const onlyEnabled = ref(false)
const searchKeyword = ref('')
// 内容选择器
const contentModal = ref(false)
const contentList = ref([])
const contentSearch = ref('')
const contentLoading = ref(false)
const pickLinkType = ref('')

const linkTypeOptions = [
  { value: 'none', label: '不设链接' },
  { value: 'article', label: '文章' },
  { value: 'course', label: '课程' },
  { value: 'activity', label: '活动' },
]

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

const showRuleSearch = computed(() => list.value.length > 5)

const filteredList = computed(() => {
  let result = list.value
  if (activeGroup.value !== 'all') {
    result = result.filter(r => r.taskGroup === activeGroup.value)
  }
  if (onlyEnabled.value) {
    result = result.filter(r => r.enabled)
  }
  const kw = searchKeyword.value.trim().toLowerCase()
  if (kw) {
    result = result.filter(r =>
      (r.name || '').toLowerCase().includes(kw) ||
      (r.action || '').toLowerCase().includes(kw) ||
      (r.description || '').toLowerCase().includes(kw)
    )
  }
  return result
})

const filteredContent = computed(() => {
  const kw = contentSearch.value.trim().toLowerCase()
  if (!kw) return contentList.value
  return contentList.value.filter(c => (c.title || '').toLowerCase().includes(kw))
})

const defaultForm = () => ({
  action: '',
  category: 'increase',
  taskGroup: 'other',
  description: '',
  name: '',
  icon: '',
  linkType: 'none',
  linkTargetId: '',
  linkTitle: '',
  linkThumb: '',
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
function getLinkTypeLabel(val) {
  return linkTypeOptions.find(o => o.value === val)?.label || '不设链接'
}
function linkTypeCn(val) {
  return linkTypeOptions.find(o => o.value === val)?.label || ''
}
function onLinkTypeChange(e) {
  form.value.linkType = linkTypeOptions[e.detail.value].value || 'none'
  if (form.value.linkType === 'none') {
    form.value.linkTargetId = ''
    form.value.linkTitle = ''
    form.value.linkThumb = ''
  }
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
    name: item.name || '',
    icon: item.icon || '',
    linkType: item.linkType || 'none',
    linkTargetId: item.linkTargetId || '',
    linkTitle: item.linkTitle || '',
    linkThumb: item.linkThumb || '',
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

/* ===== 任务链接内容选择 ===== */
async function openContentPicker() {
  const type = form.value.linkType
  if (!type || type === 'none') {
    uni.showToast({ title: '请先选择链接类型', icon: 'none' })
    return
  }
  pickLinkType.value = type
  contentSearch.value = ''
  contentModal.value = true
  contentLoading.value = true
  contentList.value = []
  try {
    contentList.value = await loadContentList(type)
  } catch (e) {
    uni.showToast({ title: '内容加载失败', icon: 'none' })
  } finally {
    contentLoading.value = false
  }
}

function linkId(item) {
  return item.documentId ?? item.id
}
function linkCover(item) {
  return item.coverImage || item.coverUrl || item.cover || ''
}
function linkDesc(item) {
  return item.excerpt || item.description || item.desc || ''
}

async function loadContentList(type) {
  if (type === 'article') {
    const res = await articleApi.list({ page: 1, pageSize: 500 })
    return (res.list || []).map(a => ({
      documentId: linkId(a),
      title: a.title || '',
      desc: linkDesc(a),
      cover: linkCover(a),
    })).filter(c => c.documentId)
  }
  if (type === 'course') {
    const res = await getCourseList({ page: 1, pageSize: 500 })
    return (res.list || []).map(c => ({
      documentId: linkId(c),
      title: c.title || '',
      desc: linkDesc(c),
      cover: c.coverUrl || c.coverImage || '',
    })).filter(c => c.documentId)
  }
  if (type === 'activity') {
    const res = await listActivities({ page: 1, pageSize: 500 })
    return (res.list || []).map(a => ({
      documentId: linkId(a),
      title: a.title || '',
      desc: linkDesc(a),
      cover: a.coverUrl || a.coverImage || '',
    })).filter(c => c.documentId)
  }
  return []
}

function selectContent(item) {
  form.value.name = item.title
  form.value.icon = item.cover || form.value.icon
  if (item.desc) form.value.description = item.desc
  form.value.linkTargetId = item.documentId
  form.value.linkTitle = item.title
  form.value.linkThumb = item.cover || ''
  contentModal.value = false
}

function clearLink() {
  form.value.linkTargetId = ''
  form.value.linkTitle = ''
  form.value.linkThumb = ''
}

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
      name: form.value.name,
      icon: form.value.icon,
      linkType: form.value.linkType || 'none',
      linkTargetId: form.value.linkType === 'none' ? undefined : (form.value.linkTargetId || undefined),
      linkTitle: form.value.linkType === 'none' ? undefined : (form.value.linkTitle || undefined),
      linkThumb: form.value.linkType === 'none' ? undefined : (form.value.linkThumb || undefined),
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

/* 规则列表搜索框 */
.rule-search { background: #fff; border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 16rpx; }
.rule-search .search-input, .content-search {
  width: 100%; height: 72rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box;
}

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

/* 任务链接 */
.link-add { color: #667eea; font-size: 28rpx; padding: 16rpx 0; }
.link-picked {
  display: flex; align-items: center; justify-content: space-between; gap: 12rpx;
  background: #f4f6ff; border-radius: 8rpx; padding: 16rpx 20rpx;
}
.link-picked-name { font-size: 28rpx; color: #667eea; flex: 1; }
.link-picked-del { color: #999; font-size: 28rpx; padding: 0 8rpx; }

/* 内容选择弹窗 */
.content-mask { z-index: 2000; }
.content-modal { width: 92%; max-height: 80vh; }
.content-search { margin-bottom: 16rpx; }
.content-scroll { max-height: 55vh; }
.content-pick-item {
  display: flex; align-items: center; gap: 16rpx;
  padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0;
}
.content-pick-item:last-child { border-bottom: none; }
.content-pick-thumb {
  width: 120rpx; height: 120rpx; border-radius: 8rpx;
  background: #f5f5f5; flex-shrink: 0;
}
.content-pick-info { flex: 1; min-width: 0; }
.content-pick-title { font-size: 30rpx; color: #333; display: block; }
.content-pick-desc {
  font-size: 24rpx; color: #999; margin-top: 6rpx; display: block;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.content-modal .loading, .content-modal .empty-state { padding: 60rpx 0; }
</style>
