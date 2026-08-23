<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑消息模板' : '新增消息模板'" />

    <view class="form-card">
      <view class="form-item">
        <text class="form-label">模板编码 code <text class="required">*</text></text>
        <input class="form-input" v-model="form.code" placeholder="如 act_confirm（SOP 规则按此引用，保存后不可随意更改）" :disabled="isEdit" />
      </view>

      <view class="form-item">
        <text class="form-label">模板名称 <text class="required">*</text></text>
        <input class="form-input" v-model="form.name" placeholder="如：活动报名成功确认" />
      </view>

      <view class="form-item">
        <text class="form-label">通道 provider</text>
        <view class="segment-row">
          <view v-for="p in PROVIDERS" :key="p.value" class="segment-item" :class="{ active: form.provider === p.value }" @click="form.provider = p.value">
            {{ p.label }}
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">公众号模板ID wxTemplateId</text>
        <input class="form-input" v-model="form.wxTemplateId" placeholder="在公众号后台「模板消息」申请后填入，如 xxx_AbCd1234" />
      </view>

      <view class="form-item">
        <text class="form-label">模板内容</text>
        <textarea class="form-textarea" v-model="form.content" placeholder="消息正文，可用 {key} 引用下方参数字段" :maxlength="500" />
      </view>

      <view class="form-item">
        <text class="form-label">参数字段 wxTemplateFields</text>
        <view class="field-list">
          <view v-for="(f, i) in form.wxTemplateFields" :key="i" class="field-row">
            <input class="field-input" v-model="f.key" placeholder="参数key（埋点传值用）" />
            <text class="field-sep">→</text>
            <input class="field-input" v-model="f.name" placeholder="微信字段名(如 thing1/date2)" />
            <view class="field-del" @click="removeField(i)">✕</view>
          </view>
        </view>
        <view class="btn-add" @click="addField">+ 添加字段</view>
      </view>

      <view class="form-item">
        <text class="form-label">启用</text>
        <view class="switch-row">
          <switch :checked="form.isEnabled" @change="(e) => (form.isEnabled = e.detail.value)" color="#07c160" />
          <text class="switch-tip">{{ form.isEnabled ? '已启用：SOP 下发可用' : '已禁用：下发会失败' }}</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">说明</text>
        <textarea class="form-textarea" v-model="form.description" placeholder="模板用途说明（可选）" :maxlength="300" />
      </view>
    </view>

    <!-- 版本管理 / AB 测试：仅编辑已有模板时展示 -->
    <view class="version-section" v-if="documentId">
      <view class="version-header">
        <text class="version-title">版本管理 / AB 测试</text>
        <view class="version-header-ops">
          <view class="btn-add" @click="openAbStats">AB 对比</view>
          <view class="btn-add primary" @click="openVersionCreate">+ 新增版本</view>
        </view>
      </view>

      <view v-if="versionsLoading" class="version-empty">版本加载中...</view>
      <view v-else-if="versions.length === 0" class="version-empty">暂无版本，可新增版本做 AB 测试（未建版本时下发默认使用模板本体内容）</view>

      <view v-for="v in versions" :key="v.id" class="version-row">
        <view class="version-info">
          <view class="version-title-row">
            <text class="version-code">{{ v.code }}</text>
            <text class="version-name">{{ v.name || '-' }}</text>
            <text class="version-status" :class="v.status === 'active' ? 'active' : 'draft'">{{ v.status === 'active' ? '生效中' : '草稿' }}</text>
          </view>
          <view class="version-meta">权重 weight: {{ v.weight ?? 0 }}</view>
          <view class="version-meta">发送 {{ v.sentCount ?? 0 }} / 成功 {{ v.successCount ?? 0 }} / 点击 {{ v.clickCountLive ?? 0 }}</view>
        </view>
        <view class="version-ops">
          <view v-if="v.status !== 'active'" class="op-btn ok" @click="activateVersion(v)">启用</view>
          <view v-else class="op-btn" @click="deactivateVersion(v)">停用</view>
          <view class="op-btn" @click="openVersionEdit(v)">编辑</view>
          <view class="op-btn danger" @click="deleteVersion(v)">删除</view>
        </view>
      </view>

      <!-- 行内新增/编辑表单 -->
      <view class="version-form" v-if="versionFormVisible">
        <view class="form-item">
          <text class="form-label">版本编码 code <text class="required">*</text></text>
          <input class="form-input" v-model="versionForm.code" placeholder="如 v1_act_confirm，AB 归因按此统计" />
        </view>
        <view class="form-item">
          <text class="form-label">版本名称</text>
          <input class="form-input" v-model="versionForm.name" placeholder="版本说明（可选）" />
        </view>
        <view class="form-item">
          <text class="form-label">公众号模板ID wxTemplateId</text>
          <input class="form-input" v-model="versionForm.wxTemplateId" placeholder="留空则使用模板本体的模板ID" />
        </view>
        <view class="form-item">
          <text class="form-label">模板内容</text>
          <textarea class="form-textarea" v-model="versionForm.content" placeholder="消息正文，留空则使用模板本体内容" :maxlength="500" />
        </view>
        <view class="form-item">
          <text class="form-label">跳转链接 link</text>
          <input class="form-input" v-model="versionForm.link" placeholder="留空则使用模板本体的链接" />
        </view>
        <view class="form-item">
          <text class="form-label">权重 weight</text>
          <input class="form-input" type="number" v-model="versionForm.weight" placeholder="按权重比例随机分配，如 9 表示约占 90%" />
        </view>
        <view class="version-form-ops">
          <view class="btn-add" @click="cancelVersionForm">取消</view>
          <button class="btn-save small" @click="saveVersion" :disabled="versionSaving">{{ versionSaving ? '保存中...' : '保存版本' }}</button>
        </view>
      </view>
    </view>

    <view class="footer-bar">
      <button class="btn-save test" @click="openSendTest" v-if="isEdit && hasPermission('sso.msg.write')" :disabled="sending">{{ sending ? '发送中...' : '发送测试' }}</button>
      <button class="btn-save" @click="handleSave" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
    </view>

    <!-- AB 对比弹层 -->
    <view class="ab-mask" v-if="abStatsVisible" @click="closeAbStats">
      <view class="ab-modal" @click.stop>
        <view class="ab-modal-header">
          <text class="ab-modal-title">AB 对比</text>
          <text class="ab-modal-close" @click="closeAbStats">✕</text>
        </view>
        <view v-if="abStatsLoading" class="version-empty">加载中...</view>
        <view v-else-if="abStatsList.length === 0" class="version-empty">暂无版本数据</view>
        <view v-for="s in abStatsList" :key="s.id" class="ab-row">
          <view class="ab-row-head">
            <text class="version-code">{{ s.code }}</text>
            <text class="version-name">{{ s.name || '-' }}</text>
            <text class="version-status" :class="s.status === 'active' ? 'active' : 'draft'">{{ s.status === 'active' ? '生效中' : '草稿' }}</text>
          </view>
          <view class="ab-metrics">
            <text class="ab-metric-label">发送 {{ s.sentCount ?? 0 }}</text>
            <text class="ab-metric-label">成功率 {{ s.successRate ?? 0 }}%</text>
            <text class="ab-metric-label">点击 {{ s.clickCountLive ?? 0 }}</text>
            <text class="ab-metric-label">点击率 {{ s.clickRate ?? 0 }}%</text>
          </view>
          <view class="ab-bar-wrap">
            <view class="ab-bar success" :style="{ width: abBarWidth(s.successRate) }"></view>
          </view>
          <view class="ab-bar-caption">成功率</view>
          <view class="ab-bar-wrap">
            <view class="ab-bar click" :style="{ width: abBarWidth(s.clickRate) }"></view>
          </view>
          <view class="ab-bar-caption">点击率</view>
        </view>
      </view>
    </view>

    <!-- 发送测试弹层 -->
    <view class="send-mask" v-if="sendVisible" @click="sendVisible = false">
      <view class="send-modal" @click.stop>
        <view class="send-modal-header">
          <text class="send-modal-title">发送测试</text>
          <text class="ab-modal-close" @click="sendVisible = false">✕</text>
        </view>

        <view class="form-item">
          <text class="form-label">测试用户 <text class="required">*</text></text>
          <input class="form-input" v-model="sendSearch" placeholder="搜索微信手机号/昵称/邮箱" @confirm="searchUsers" />
          <view class="user-list" v-if="sendUserLists.length">
            <view v-for="u in sendUserLists" :key="u.id" class="user-row" :class="{ active: sendUser && sendUser.id === u.id }" @click="pickUser(u)">
              <text class="user-name">{{ u.username || u.nickname || u.mobile || u.email || '#' + u.id }}</text>
              <text class="user-id">id={{ u.id }}</text>
            </view>
          </view>
          <view v-if="sendUser" class="user-picked">已选: {{ sendUser.username || sendUser.mobile || sendUser.email || ('#' + sendUser.id) }}</view>
        </view>

        <view class="form-item">
          <text class="form-label">参数字段测试值</text>
          <view v-if="sendFields.length === 0" class="send-empty">该模板无参数字段，可直接发送</view>
          <view v-for="(f, i) in sendFields" :key="i" class="form-item">
            <text class="form-label">{{ f.key }} → {{ f.name }}</text>
            <input class="form-input" v-model="sendParams[f.key]" :placeholder="`填 ${f.name} 的测试值`" />
          </view>
        </view>

        <view v-if="sendResult" class="send-result" :class="sendResult.ok ? 'ok' : 'fail'">
          <text>{{ sendResult.ok ? '发送成功 msqId=' + sendResult.msgId : '发送失败: ' + sendResult.reason }}</text>
        </view>

        <view class="send-footer">
          <view class="btn-add" @click="sendVisible = false">取消</view>
          <button class="btn-save small" @click="doSendTest" :disabled="sending">{{ sending ? '发送中...' : '发送' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ssoMsgTemplateApi, ssoMsgTemplateVersionApi, ssoMsgJobApi, getSsoUserOptions } from '../../../api/sso.js'
import { useUserStore } from '../../../store/user.js'
import PageHeader from '../../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const PROVIDERS = [
  { value: 'wechat', label: '微信模板消息' },
  { value: 'mock', label: 'Mock(本地调试)' },
]

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)
const saving = ref(false)
const form = ref({
  code: '', name: '', provider: 'wechat',
  wxTemplateId: '', content: '',
  wxTemplateFields: [{ key: '', name: '' }],
  isEnabled: true, description: '',
})

// ===== 版本管理 / AB 测试 =====
const versions = ref([])
const versionsLoading = ref(false)
const versionFormVisible = ref(false)
const versionSaving = ref(false)
const versionForm = ref(emptyVersionForm())
const abStatsVisible = ref(false)
const abStatsLoading = ref(false)
const abStatsList = ref([])

function emptyVersionForm() {
  return { id: '', code: '', name: '', wxTemplateId: '', content: '', link: '', weight: 1 }
}

async function loadVersions() {
  if (!documentId.value) return
  versionsLoading.value = true
  try {
    const res = await ssoMsgTemplateVersionApi.list(documentId.value)
    versions.value = (res && Array.isArray(res.list)) ? res.list : []
  } catch (e) {
    versions.value = []
  } finally {
    versionsLoading.value = false
  }
}

function openVersionCreate() {
  versionForm.value = emptyVersionForm()
  versionFormVisible.value = true
}

function openVersionEdit(v) {
  versionForm.value = {
    id: v.id, code: v.code || '', name: v.name || '',
    wxTemplateId: v.wxTemplateId || '', content: v.content || '',
    link: v.link || '', weight: v.weight ?? 1,
  }
  versionFormVisible.value = true
}

function cancelVersionForm() {
  versionFormVisible.value = false
  versionForm.value = emptyVersionForm()
}

async function saveVersion() {
  if (!versionForm.value.code || !versionForm.value.code.trim()) { uni.showToast({ title: '请填写版本编码', icon: 'none' }); return }
  versionSaving.value = true
  const payload = {
    code: versionForm.value.code.trim(),
    name: versionForm.value.name.trim(),
    wxTemplateId: versionForm.value.wxTemplateId.trim(),
    content: versionForm.value.content,
    link: versionForm.value.link.trim(),
    weight: Number(versionForm.value.weight) || 0,
  }
  try {
    if (versionForm.value.id) {
      await ssoMsgTemplateVersionApi.update(documentId.value, versionForm.value.id, payload)
    } else {
      await ssoMsgTemplateVersionApi.create(documentId.value, payload)
    }
    uni.showToast({ title: '版本已保存', icon: 'success' })
    versionFormVisible.value = false
    versionForm.value = emptyVersionForm()
    loadVersions()
  } catch (e) {
    // 错误 toast 已由 request 统一弹出
  } finally {
    versionSaving.value = false
  }
}

async function activateVersion(v) {
  try {
    await ssoMsgTemplateVersionApi.activate(documentId.value, v.id)
    uni.showToast({ title: '已启用', icon: 'success' })
    loadVersions()
  } catch (e) { /* request 已弹出 */ }
}

async function deactivateVersion(v) {
  try {
    await ssoMsgTemplateVersionApi.update(documentId.value, v.id, { status: 'draft' })
    uni.showToast({ title: '已停用', icon: 'success' })
    loadVersions()
  } catch (e) { /* request 已弹出 */ }
}

function deleteVersion(v) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除版本「${v.code}」吗？若已被消息任务引用将无法删除。`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await ssoMsgTemplateVersionApi.delete(documentId.value, v.id)
        uni.showToast({ title: '删除成功', icon: 'success' })
        loadVersions()
      } catch (e) {
        // 被引用时后端返回 400，错误消息已由 request 统一弹出
      }
    }
  })
}

async function openAbStats() {
  if (!documentId.value) return
  abStatsVisible.value = true
  abStatsLoading.value = true
  abStatsList.value = []
  try {
    const res = await ssoMsgTemplateVersionApi.abStats(documentId.value)
    abStatsList.value = (res && Array.isArray(res.list)) ? res.list : []
  } catch (e) {
    abStatsList.value = []
  } finally {
    abStatsLoading.value = false
  }
}

function closeAbStats() {
  abStatsVisible.value = false
}

function abBarWidth(rate) {
  const v = Number(rate) || 0
  return `${Math.min(Math.max(v, 0), 100)}%`
}

function addField() { form.value.wxTemplateFields.push({ key: '', name: '' }) }
function removeField(i) { form.value.wxTemplateFields.splice(i, 1) }

function normalizeFields() {
  return form.value.wxTemplateFields.filter((f) => (f.key && f.key.trim()) || (f.name && f.name.trim())).map((f) => ({ key: f.key.trim(), name: f.name.trim() }))
}

async function loadDetail(id) {
  try {
    const item = await ssoMsgTemplateApi.detail(id)
    if (!item) return
    let fields = item.wxTemplateFields
    if (typeof fields === 'string') { try { fields = JSON.parse(fields) } catch { fields = [] } }
    form.value = {
      code: item.code || '',
      name: item.name || '',
      provider: item.provider || 'wechat',
      wxTemplateId: item.wxTemplateId || '',
      content: item.content || '',
      wxTemplateFields: Array.isArray(fields) && fields.length ? fields : [{ key: '', name: '' }],
      isEnabled: item.isEnabled !== false,
      description: item.description || '',
    }
  } catch (e) {
    uni.showToast({ title: '加载模板失败', icon: 'none' })
  }
}

async function handleSave() {
  if (!form.value.code || !form.value.code.trim()) { uni.showToast({ title: '请填写模板编码', icon: 'none' }); return }
  if (!form.value.name || !form.value.name.trim()) { uni.showToast({ title: '请填写模板名称', icon: 'none' }); return }
  if (form.value.provider === 'wechat' && !form.value.wxTemplateId) { uni.showToast({ title: '请填写公众号模板ID', icon: 'none' }); return }
  saving.value = true
  const payload = { ...form.value, wxTemplateFields: normalizeFields() }
  try {
    if (isEdit.value) {
      await ssoMsgTemplateApi.update(documentId.value, payload)
    } else {
      await ssoMsgTemplateApi.create(payload)
    }
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) {
    // 错误 toast 已由 request 统一弹出
  } finally {
    saving.value = false
  }
}

// ===== 发送测试 =====
const sendVisible = ref(false)
const sendSearch = ref('')
const sendUserLists = ref([])
const sendUser = ref(null)
const sendFields = ref([])
const sendParams = ref({})
const sendResult = ref(null)
const sending = ref(false)

function openSendTest() {
  if (!documentId.value) return
  sendVisible.value = true
  sendResult.value = null
  sendUser.value = null
  sendUserLists.value = []
  sendFields.value = form.value.wxTemplateFields.filter((f) => f && f.key && f.name).map((f) => ({ key: f.key, name: f.name }))
  sendParams.value = {}
  sendFields.value.forEach((f) => { sendParams.value[f.key] = '' })
}

async function searchUsers() {
  if (!sendSearch.value) return
  try {
    const { list } = await getSsoUserOptions({ search: sendSearch.value, pageSize: 20 })
    sendUserLists.value = list || []
  } catch (e) {
    uni.showToast({ title: '用户查询失败', icon: 'none' })
  }
}

function pickUser(u) {
  sendUser.value = u
  sendUserLists.value = []
}

async function doSendTest() {
  if (!sendUser.value) { uni.showToast({ title: '请选择测试用户', icon: 'none' }); return }
  if (!form.value.code) { uni.showToast({ title: '模板未保存，请先保存再测试', icon: 'none' }); return }
  sending.value = true
  sendResult.value = null
  const params = {}
  sendFields.value.forEach((f) => { if (sendParams.value[f.key] !== '' && sendParams.value[f.key] !== undefined) params[f.key] = sendParams.value[f.key] })
  try {
    const job = await ssoMsgJobApi.sendNow({ user: sendUser.value.id, scene: 'manual', templateCode: form.value.code, params })
    const st = job && job.status
    if (st === 'sent') {
      sendResult.value = { ok: true, msgId: (job && job.wxMsgId) || '' }
    } else {
      const reason = (job && job.result && (job.result.message || job.result.reason || job.result.error)) || JSON.stringify(job && job.result) || st
      sendResult.value = { ok: false, reason: (st === 'quota_limited' ? '频控拦截: ' : '') + reason }
    }
  } catch (e) {
    sendResult.value = { ok: false, reason: (e && (e.message || e.data && e.data.error)) || '发送异常' }
  } finally {
    sending.value = false
  }
}

onLoad((query) => {
  if (query.documentId) {
    documentId.value = query.documentId
    loadDetail(query.documentId)
    loadVersions()
    if (query.ab === '1') openAbStats()
  }
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; padding-bottom: 160rpx; box-sizing: border-box; }
.form-card { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.form-item { margin-bottom: 28rpx; }
.form-label { display: block; font-size: 26rpx; color: #333; margin-bottom: 12rpx; }
.required { color: #ff4d4f; }
.form-input { height: 76rpx; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; font-size: 28rpx; }
.form-textarea { width: 100%; min-height: 120rpx; background: #f5f5f5; border-radius: 8rpx; padding: 16rpx 20rpx; font-size: 28rpx; box-sizing: border-box; }
.segment-row { display: flex; gap: 16rpx; }
.segment-item { flex: 1; text-align: center; padding: 18rpx 0; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; color: #666; }
.segment-item.active { background: #1677ff; color: #fff; }
.field-list { display: flex; flex-direction: column; gap: 12rpx; }
.field-row { display: flex; align-items: center; gap: 12rpx; }
.field-input { flex: 1; height: 68rpx; background: #f5f5f5; border-radius: 8rpx; padding: 0 16rpx; font-size: 26rpx; }
.field-sep { color: #999; }
.field-del { width: 48rpx; height: 48rpx; line-height: 48rpx; text-align: center; color: #ff4d4f; font-size: 28rpx; background: #fff0f0; border-radius: 8rpx; }
.btn-add { display: inline-block; padding: 12rpx 28rpx; background: #e6f4ff; color: #1677ff; border-radius: 8rpx; font-size: 26rpx; margin-top: 12rpx; }
.switch-row { display: flex; align-items: center; gap: 16rpx; }
.switch-tip { font-size: 24rpx; color: #999; }
.footer-bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 20rpx; background: #fff; box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.05); }
.btn-save { width: 100%; background: #ff0000; color: #fff; border-radius: 8rpx; font-size: 32rpx; }
.btn-save.small { width: auto; padding: 0 32rpx; font-size: 28rpx; line-height: 2.4; }

/* ===== 版本管理 ===== */
.version-section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-top: 20rpx; }
.version-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.version-title { font-size: 30rpx; font-weight: bold; color: #333; }
.version-header-ops { display: flex; gap: 16rpx; }
.btn-add { display: inline-block; padding: 12rpx 28rpx; background: #e6f4ff; color: #1677ff; border-radius: 8rpx; font-size: 26rpx; }
.btn-add.primary { background: #1677ff; color: #fff; }
.version-empty { padding: 40rpx 0; text-align: center; font-size: 26rpx; color: #999; }
.version-row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; border-top: 1rpx solid #f0f0f0; padding: 20rpx 0; }
.version-info { flex: 1; min-width: 0; }
.version-title-row { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; margin-bottom: 8rpx; }
.version-code { font-size: 26rpx; font-weight: bold; color: #1677ff; }
.version-name { font-size: 26rpx; color: #333; }
.version-status { padding: 2rpx 14rpx; border-radius: 4rpx; font-size: 20rpx; color: #fff; }
.version-status.active { background: #07c160; }
.version-status.draft { background: #999; }
.version-meta { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.version-ops { display: flex; flex-direction: column; gap: 10rpx; flex-shrink: 0; }
.op-btn { padding: 8rpx 20rpx; border-radius: 6rpx; font-size: 22rpx; text-align: center; background: #f5f5f5; color: #1989fa; }
.op-btn.ok { background: #e8f8ef; color: #07c160; }
.op-btn.danger { background: #fff0f0; color: #ff4d4f; }
.version-form { border-top: 1rpx solid #f0f0f0; padding-top: 20rpx; margin-top: 8rpx; }
.version-form-ops { display: flex; align-items: center; gap: 20rpx; }

/* ===== AB 对比弹层 ===== */
.ab-mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; display: flex; align-items: center; justify-content: center; }
.ab-modal { width: 85%; max-height: 80vh; background: #fff; border-radius: 16rpx; padding: 28rpx; box-sizing: border-box; overflow-y: auto; }
.ab-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.ab-modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.ab-modal-close { font-size: 32rpx; color: #999; padding: 0 8rpx; }
.ab-row { border-top: 1rpx solid #f0f0f0; padding: 20rpx 0; }
.ab-row-head { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; margin-bottom: 12rpx; }
.ab-metrics { display: flex; flex-wrap: wrap; gap: 8rpx 24rpx; margin-bottom: 12rpx; }
.ab-metric-label { font-size: 24rpx; color: #666; }
.ab-bar-wrap { width: 100%; height: 20rpx; background: #f0f0f0; border-radius: 10rpx; overflow: hidden; }
.ab-bar { height: 100%; border-radius: 10rpx; }
.ab-bar.success { background: #07c160; }
.ab-bar.click { background: #1677ff; }
.ab-bar-caption { font-size: 20rpx; color: #999; margin: 6rpx 0 14rpx; }

.btn-save.test { background: #1677ff; margin-bottom: 16rpx; }
.send-mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; display: flex; align-items: center; justify-content: center; }
.send-modal { width: 88%; max-height: 80vh; background: #fff; border-radius: 16rpx; padding: 28rpx; box-sizing: border-box; overflow-y: auto; }
.send-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.send-modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.user-list { margin-top: 12rpx; border-top: 1rpx solid #f0f0f0; }
.user-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.user-row.active { background: #e6f4ff; }
.user-name { font-size: 26rpx; color: #333; }
.user-id { font-size: 24rpx; color: #999; }
.user-picked { margin-top: 12rpx; font-size: 26rpx; color: #1677ff; }
.send-empty { font-size: 26rpx; color: #999; padding: 20rpx 0; }
.send-result { margin-top: 16rpx; padding: 20rpx; border-radius: 8rpx; font-size: 26rpx; }
.send-result.ok { background: #f0fff4; color: #07c160; }
.send-result.fail { background: #fff0f0; color: #ff4d4f; word-break: break-all; }
.send-footer { display: flex; align-items: center; justify-content: flex-end; gap: 20rpx; margin-top: 24rpx; }
</style>
