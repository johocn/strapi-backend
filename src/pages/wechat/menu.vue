<template>
  <view class="page-container">
    <PageHeader title="菜单管理">
      <view class="header-actions">
        <button class="btn-ghost" @click="loadRemote">从微信加载</button>
        <button class="btn-primary" @click="resetEditor" v-if="hasPermission('menu.sso-wx')">+ 新建</button>
      </view>
    </PageHeader>

    <view class="help-banner">
      <text class="help-icon">ℹ️</text>
      <text class="help-text">可视化设计公众号自定义菜单：左侧模拟微信手机端预览，右侧编辑菜单项。支持链接 / 点击事件 / 小程序 / 扫码 / 发图 / 位置 / 素材等全部微信菜单能力。保存后一键下发到公众号。</text>
    </view>

    <view class="action-bar">
      <button class="btn-publish" @click="saveToWechat" :disabled="saving || !hasPermission('menu.sso-wx')">{{ saving ? '保存下发中...' : '保存到微信' }}</button>
      <button class="btn-danger" @click="handleDeleteRemote" v-if="hasPermission('menu.sso-wx')">删除线上菜单</button>
    </view>

    <!-- ============ 主编辑区：手机预览 + 编辑面板 ============ -->
    <view class="designer-wrap">
      <!-- 左：模拟微信手机 -->
      <view class="phone-shell">
        <view class="phone-screen">
          <!-- 微信内置浏览器标题栏 -->
          <view class="wx-browser-bar">
            <text class="wx-nav-btn">‹</text>
            <text class="wx-nav-title">joho 服务</text>
            <text class="wx-nav-btn">⋮</text>
          </view>
          <!-- 公众号会话区 -->
          <view class="chat-area">
            <view class="mp-card">
              <view class="mp-avatar">J</view>
              <view class="mp-title">joho 服务</view>
            </view>
            <view class="mp-bubble">你好，我是 joho 服务助手。点击下方菜单体验服务～</view>
            <view class="mp-bubble">菜单编辑后点击「保存到微信」即可下发。</view>
            <!-- 二级菜单浮层 -->
            <view v-if="selected.level === 1 && selTop && selTop.children && selTop.children.length" class="sub-menu-pop">
              <view
                v-for="(sub, c) in selTop.children"
                :key="c"
                class="sub-menu-item"
                :class="{ active: selected.level === 2 && selected.c === c }"
                @click="clickSub(selected.p, c)"
              >
                <text class="sub-menu-name">{{ sub.name || '子菜单' }}</text>
              </view>
            </view>
          </view>
          <!-- 模拟输入条 -->
          <view class="wx-input-bar">
            <view class="wx-input-placeholder">输入...</view>
            <view class="wx-send-btn">发送</view>
          </view>
          <!-- 底部一级菜单栏 -->
          <view class="wx-menu-bar">
            <view
              v-for="(b, i) in buttons"
              :key="i"
              class="wx-menu-item"
              :class="{ active: selected.level === 1 && selected.p === i }"
              @click="clickTop(i)"
            >
              <text class="wx-menu-name">{{ b.name || '未命名' }}</text>
              <view v-if="b.children && b.children.length" class="wx-menu-dot">⌄</view>
            </view>
            <view v-if="!buttons.length" class="wx-menu-empty">点击「+ 新建」或「从微信加载」</view>
          </view>
        </view>
      </view>

      <!-- 右：编辑面板 -->
      <view class="editor-panel">
        <!-- 未选中 -->
        <view v-if="!selNode" class="editor-empty">
          <text class="empty-icon">📱</text>
          <text class="empty-text">点击左侧预览中的菜单项进行编辑，或点「+ 新建」开始设计</text>
        </view>

        <!-- 已选中 -->
        <view v-else class="editor-body">
          <view class="section-title">
            {{ selected.level === 2 ? `子菜单 ${selected.p + 1}-${selected.c + 1}` : `一级菜单 ${selected.p + 1}` }}
          </view>

          <view class="form-item">
            <text class="form-label">菜单名称<text class="required-mark">*</text></text>
            <input v-model="selNode.name" class="form-input" placeholder="最多 8 个汉字" maxlength="8" />
          </view>

          <!-- 类型：含子菜单的一级不可设 -->
          <view class="form-item" v-if="selected.level === 1 && selTop.children && selTop.children.length">
            <text class="form-label">菜单类型</text>
            <view class="type-disabled">含子菜单的一级菜单不可设置点击动作（微信规则）</view>
          </view>
          <view class="form-item" v-else>
            <text class="form-label">菜单类型<text class="required-mark">*</text></text>
            <picker mode="selector" :range="typeOptions" range-key="label" :value="selTypeIndex" @change="onTypeChange">
              <view class="picker-box">{{ selNode.type ? MENU_TYPES[selNode.type].label : '请选择类型' }}<text class="picker-arrow">▾</text></view>
            </picker>
            <text class="form-hint">{{ selNode.type ? MENU_TYPES[selNode.type].hint : '' }}</text>
          </view>

          <!-- 动态参数 -->
          <template v-if="selNode.type">
            <!-- key 类 -->
            <view class="form-item" v-if="MENU_TYPES[selNode.type] && MENU_TYPES[selNode.type].fields.includes('key')">
              <text class="form-label">事件 Key<text class="required-mark">*</text></text>
              <input v-model="selNode.key" class="form-input" placeholder="如 menu_home，点击时推送给服务器" />
            </view>
            <!-- url -->
            <view class="form-item" v-if="MENU_TYPES[selNode.type] && MENU_TYPES[selNode.type].fields.includes('url')">
              <text class="form-label">跳转链接 URL<text class="required-mark">*</text></text>
              <input v-model="selNode.url" class="form-input" placeholder="https://..." />
            </view>
            <!-- 小程序 -->
            <template v-if="selNode.type === 'miniprogram'">
              <view class="form-item">
                <text class="form-label">小程序 AppID<text class="required-mark">*</text></text>
                <input v-model="selNode.appid" class="form-input" placeholder="wx 开头的 AppID" />
              </view>
              <view class="form-item">
                <text class="form-label">小程序页面路径<text class="required-mark">*</text></text>
                <input v-model="selNode.pagepath" class="form-input" placeholder="pages/index/index" />
              </view>
              <view class="form-item">
                <text class="form-label">备用网页 URL（可选）</text>
                <input v-model="selNode.url" class="form-input" placeholder="低版本微信打开此链接" />
              </view>
            </template>
            <!-- media_id -->
            <view class="form-item" v-if="MENU_TYPES[selNode.type] && MENU_TYPES[selNode.type].fields.includes('media_id')">
              <text class="form-label">素材 media_id<text class="required-mark">*</text></text>
              <input v-model="selNode.mediaId" class="form-input" placeholder="素材库中的 media_id" />
            </view>
          </template>

          <!-- 操作 -->
          <view class="editor-actions">
            <view v-if="selected.level === 1" class="action-btn add" @click="addSub(selected.p)">+ 子菜单（{{ selTop.children.length }}/5）</view>
            <view class="action-btn move" @click="moveItem(-1)">↑ 上移</view>
            <view class="action-btn move" @click="moveItem(1)">↓ 下移</view>
            <view class="action-btn del" @click="removeItem">删除</view>
          </view>

          <view class="form-item" v-if="selected.level === 1">
            <text class="form-label">添加一级菜单</text>
            <view class="action-btn add" @click="addTop" :class="{ disabled: buttons.length >= 3 }">+ 一级菜单（{{ buttons.length }}/3）</view>
          </view>
        </view>
      </view>
    </view>

    <!-- ============ 本地菜单版本 ============ -->
    <view class="local-section">
      <view class="local-header" @click="showLocalList = !showLocalList">
        <text class="local-title">本地菜单版本（{{ localList.length }}）</text>
        <text class="local-toggle">{{ showLocalList ? '收起 ▴' : '展开 ▾' }}</text>
      </view>
      <view v-if="showLocalList" class="local-body">
        <view v-for="item in localList" :key="item.documentId || item.id" class="local-card">
          <view class="local-info">
            <view class="local-name-row">
              <text class="local-name">{{ item.name || '未命名菜单' }}</text>
              <view class="data-status" :class="menuState(item).cls">{{ menuState(item).label }}</view>
            </view>
            <text class="local-date">更新：{{ fmtDateTime(item.updatedAt || item.updated_at) }}</text>
          </view>
          <view class="local-actions">
            <view class="local-btn load" @click="loadLocal(item)">载入编辑</view>
            <view class="local-btn pub" @click="publishLocal(item)" v-if="hasPermission('menu.sso-wx')">发布</view>
            <view class="local-btn del" @click="handleDelete(item)" v-if="hasPermission('menu.sso-wx')">删除</view>
          </view>
        </view>
        <view v-if="!loading && localList.length === 0" class="local-empty">暂无本地菜单版本</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ssoWxMenuApi } from '../../api/wechat.js'
import { useUserStore } from '../../store/user.js'
import PageHeader from '../../components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

// ============ 微信菜单类型字典（覆盖公众号全部菜单能力） ============
const MENU_TYPES = {
  click:          { label: '点击推事件',   fields: ['key'], hint: '用户点击后推事件给服务器（自定义 key）' },
  view:           { label: '跳转链接',     fields: ['url'], hint: '用户点击后跳转到指定网页' },
  miniprogram:    { label: '跳转小程序',   fields: ['appid', 'pagepath'], hint: '点击跳转到关联的小程序页面' },
  scancode_push:  { label: '扫码推事件',   fields: ['key'], hint: '点击弹出扫码，结果推给服务器' },
  scancode_waitmsg: { label: '扫码带提示', fields: ['key'], hint: '点击弹出扫码，结果推给服务器并提示' },
  pic_sysphoto:   { label: '系统拍照发图', fields: ['key'], hint: '点击直接调用系统相机拍照' },
  pic_photo_or_album: { label: '拍照或相册', fields: ['key'], hint: '点击弹出拍照/相册选择' },
  pic_weixin:     { label: '微信相册发图', fields: ['key'], hint: '点击从微信相册选择图片' },
  location_select: { label: '发送位置',    fields: ['key'], hint: '点击弹出地理位置选择' },
  media_id:       { label: '素材消息',     fields: ['media_id'], hint: '发送永久素材（图片/音频/视频）' },
  view_limited:   { label: '图文素材',     fields: ['media_id'], hint: '跳转图文消息（素材 media_id）' },
}
const typeOptions = Object.keys(MENU_TYPES).map(v => ({ value: v, label: MENU_TYPES[v].label }))

// ============ 编辑模型 ============
const buttons = ref([]) // [{ name, type, key, url, appid, pagepath, mediaId, children: [] }]
const selected = ref({ level: 0, p: -1, c: -1 }) // level 1=一级 2=二级
const currentLocalId = ref('')
const currentLocalName = ref('')

const localList = ref([])
const showLocalList = ref(false)
const loading = ref(false)
const saving = ref(false)

const selTop = computed(() => (selected.value.p >= 0 ? buttons.value[selected.value.p] : null))
const selNode = computed(() => {
  const { level, p, c } = selected.value
  if (level === 1) return buttons.value[p] || null
  if (level === 2) return buttons.value[p]?.children?.[c] || null
  return null
})
const selTypeIndex = computed(() => {
  const t = selNode.value?.type
  const i = typeOptions.findIndex(o => o.value === t)
  return i < 0 ? 0 : i
})

function emptyItem() {
  return { name: '', type: '', key: '', url: '', appid: '', pagepath: '', mediaId: '', children: [] }
}

// ============ 预览交互 ============
function clickTop(i) {
  const { level, p } = selected.value
  if (level === 1 && p === i) {
    selected.value = { level: 0, p: -1, c: -1 }
    return
  }
  selected.value = { level: 1, p: i, c: -1 }
}
function clickSub(p, c) {
  selected.value = { level: 2, p, c }
}

// ============ 编辑操作 ============
function addTop() {
  if (buttons.value.length >= 3) {
    uni.showToast({ title: '一级菜单最多 3 个', icon: 'none' })
    return
  }
  buttons.value.push(emptyItem())
  selected.value = { level: 1, p: buttons.value.length - 1, c: -1 }
}
function addSub(p) {
  const top = buttons.value[p]
  if (!top) return
  if (top.children.length >= 5) {
    uni.showToast({ title: '子菜单最多 5 个', icon: 'none' })
    return
  }
  top.children.push(emptyItem())
  selected.value = { level: 2, p, c: top.children.length - 1 }
}
function moveItem(dir) {
  const { level, p, c } = selected.value
  if (level === 1) {
    const target = p + dir
    if (target < 0 || target >= buttons.value.length) return
    swap(buttons.value, p, target)
    selected.value = { level: 1, p: target, c: -1 }
  } else if (level === 2) {
    const subs = buttons.value[p]?.children || []
    const target = c + dir
    if (target < 0 || target >= subs.length) return
    swap(subs, c, target)
    selected.value = { level: 2, p, c: target }
  }
}
function swap(arr, a, b) {
  const t = arr[a]
  arr[a] = arr[b]
  arr[b] = t
}
function removeItem() {
  const { level, p, c } = selected.value
  const label = level === 2 ? `「${buttons.value[p]?.children?.[c]?.name || '该子菜单'}」` : `「${buttons.value[p]?.name || '该菜单'}」`
  uni.showModal({
    title: '删除确认',
    content: `确定删除${label}吗？`,
    success: (res) => {
      if (!res.confirm) return
      if (level === 1) {
        buttons.value.splice(p, 1)
      } else {
        buttons.value[p]?.children?.splice(c, 1)
      }
      selected.value = { level: 0, p: -1, c: -1 }
    },
  })
}
function onTypeChange(e) {
  const t = typeOptions[Number(e.detail.value)]?.value
  if (t && selNode.value) selNode.value.type = t
}
function resetEditor() {
  buttons.value = [emptyItem()]
  currentLocalId.value = ''
  currentLocalName.value = ''
  selected.value = { level: 1, p: 0, c: -1 }
}

// ============ 数据转换：编辑模型 ↔ 微信结构 ============
function buildTypeNode(n) {
  const node = { name: (n.name || '').trim(), type: n.type }
  switch (n.type) {
    case 'view': node.url = (n.url || '').trim(); break
    case 'miniprogram':
      node.appid = (n.appid || '').trim()
      node.pagepath = (n.pagepath || '').trim()
      if ((n.url || '').trim()) node.url = (n.url || '').trim() // 备用网页可选
      break
    case 'media_id':
    case 'view_limited': node.media_id = (n.mediaId || '').trim(); break
    default: node.key = (n.key || '').trim()
  }
  return node
}
// 编辑模型 → menu/create 结构（sub_button 为数组，含子菜单的一级不输出 type）
function toWechat() {
  return {
    button: buttons.value.map(b => {
      const hasSub = b.children && b.children.length > 0
      const node = { name: (b.name || '').trim() }
      if (hasSub) {
        node.sub_button = b.children.map(c => buildTypeNode(c))
      } else {
        Object.assign(node, buildTypeNode(b))
      }
      return node
    }),
  }
}
function fromRemoteItem(n) {
  return {
    name: n.name || '',
    type: n.type || '',
    key: n.key || n.value || '',
    url: n.url || '',
    appid: n.appid || '',
    pagepath: n.pagepath || '',
    mediaId: n.media_id || '',
    children: [],
  }
}
// get_current_selfmenu_info 结构 → 编辑模型（sub_button 可能是 {list:[...]} 或数组）
function fromRemote(btnList) {
  return (btnList || []).map(b => {
    const list = b.sub_button
    const children = Array.isArray(list) ? list : (list && Array.isArray(list.list) ? list.list : [])
    if (children.length) {
      return { ...fromRemoteItem(b), children: children.map(c => fromRemoteItem(c)) }
    }
    return fromRemoteItem(b)
  })
}

// ============ 校验 ============
function byteLen(str) {
  let n = 0
  for (const ch of String(str)) n += ch.codePointAt(0) > 255 ? 2 : 1
  return n
}
function checkTypeFields(node, label) {
  if (!node.type) return `${label}未设置类型`
  const cfg = MENU_TYPES[node.type]
  if (!cfg) return `${label}类型无效`
  for (const f of cfg.fields) {
    const val = node[f]
    if (!val || !String(val).trim()) {
      const names = { key: '事件 Key', url: '跳转链接', appid: '小程序 AppID', pagepath: '小程序页面路径', media_id: '素材 media_id' }
      return `${label}缺少${names[f] || f}`
    }
  }
  return ''
}
function validate() {
  const bs = buttons.value
  if (!bs.length) return '请至少创建一个一级菜单'
  if (bs.length > 3) return '一级菜单最多 3 个'
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i]
    if (!b.name || !String(b.name).trim()) return `第 ${i + 1} 个一级菜单缺少名称`
    if (byteLen(b.name) > 16) return `「${b.name}」名称过长（最多 8 个汉字）`
    const subs = b.children || []
    if (subs.length > 5) return `「${b.name}」的子菜单最多 5 个`
    if (subs.length) {
      for (let j = 0; j < subs.length; j++) {
        const s = subs[j]
        if (!s.name || !String(s.name).trim()) return `「${b.name}」第 ${j + 1} 个子菜单缺少名称`
        if (byteLen(s.name) > 16) return `子菜单「${s.name}」名称过长（最多 8 个汉字）`
        const err = checkTypeFields(s, `子菜单「${s.name}」`)
        if (err) return err
      }
    } else {
      const err = checkTypeFields(b, `「${b.name}」`)
      if (err) return err
    }
  }
  return ''
}

// ============ 对接微信 API ============
// 从微信拉取线上当前菜单
async function loadRemote() {
  try {
    uni.showLoading({ title: '拉取线上菜单...' })
    const raw = await ssoWxMenuApi.getRemote()
    const info = raw?.selfmenu_info || raw || {}
    const btnList = Array.isArray(info.button) ? info.button : []
    buttons.value = fromRemote(btnList)
    currentLocalId.value = ''
    currentLocalName.value = ''
    selected.value = { level: 0, p: -1, c: -1 }
    uni.hideLoading()
    if (!btnList.length) uni.showToast({ title: '公众号当前无菜单', icon: 'none' })
    else uni.showToast({ title: '已加载线上菜单', icon: 'success' })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: `拉取失败：${e.message || '公众号未接入或 token 异常'}`, icon: 'none' })
  }
}

// 保存本地版本并下发到微信
async function saveToWechat() {
  const err = validate()
  if (err) {
    uni.showToast({ title: err, icon: 'none' })
    return
  }
  const menuJson = toWechat()
  saving.value = true
  try {
    let id = currentLocalId.value
    if (id) {
      await ssoWxMenuApi.update(id, { name: currentLocalName.value || '自定义菜单', menu_json: menuJson })
    } else {
      const created = await ssoWxMenuApi.create({ name: currentLocalName.value || '自定义菜单', menu_json: menuJson })
      // 后端 sso-wx-menu 接口只认数字 id（where: { id }），documentId 会导致 Number()=NaN
      id = created.id || created.documentId
      currentLocalId.value = id
    }
    await ssoWxMenuApi.publish(id)
    uni.showToast({ title: '已保存并下发到微信', icon: 'success' })
    loadLocalList()
  } catch (e) {
    uni.showToast({ title: `保存失败：${e.message || '请检查公众号接入配置'}`, icon: 'none' })
  } finally {
    saving.value = false
  }
}

function handleDeleteRemote() {
  uni.showModal({
    title: '删除线上菜单',
    content: '将删除公众号上已下发的全部菜单，确定继续吗？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await ssoWxMenuApi.deleteRemote()
        uni.showToast({ title: '已删除线上菜单', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: `删除失败：${e.message || ''}`, icon: 'none' })
      }
    },
  })
}

// ============ 本地版本 ============
async function loadLocalList() {
  loading.value = true
  try {
    const { list } = await ssoWxMenuApi.list({ 'pagination[page]': 1, 'pagination[pageSize]': 20 })
    localList.value = list || []
  } catch (e) {
    uni.showToast({ title: '加载本地版本失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
function loadLocal(item) {
  const json = item.menu_json
  const btnList = json && typeof json === 'object' ? json.button : []
  buttons.value = fromRemote(btnList || [])
  currentLocalId.value = item.documentId || item.id
  currentLocalName.value = item.name || ''
  selected.value = { level: 0, p: -1, c: -1 }
  showLocalList.value = false
  uni.showToast({ title: '已载入编辑器', icon: 'success' })
}
function publishLocal(item) {
  const id = item.id || item.documentId
  uni.showModal({
    title: '发布下发',
    content: `将「${item.name || '未命名'}」发布到公众号吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await ssoWxMenuApi.publish(id)
        uni.showToast({ title: '发布成功', icon: 'success' })
        loadLocalList()
      } catch (e) {
        uni.showToast({ title: `发布失败：${e.message || ''}`, icon: 'none' })
      }
    },
  })
}
function handleDelete(item) {
  const id = item.documentId || item.id
  uni.showModal({
    title: '确认删除',
    content: `确定删除本地菜单「${item.name || '未命名'}」吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await ssoWxMenuApi.delete(id)
        uni.showToast({ title: '已删除', icon: 'success' })
        loadLocalList()
      } catch (e) {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    },
  })
}

function menuState(item) {
  if (item.publish_state === 'published' || item.is_published || item.published) return { cls: 'active', label: '已发布' }
  if (item.publish_state === 'failed') return { cls: 'failed', label: '下发失败' }
  return { cls: 'inactive', label: '未发布' }
}
function fmtDateTime(dt) {
  if (!dt) return '-'
  return String(dt).replace('T', ' ').substring(0, 19)
}

onShow(() => {
  loadLocalList()
  if (!buttons.value.length) resetEditor()
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.header-actions { display: flex; gap: 16rpx; }
.btn-primary { background: #ff0000; color: #fff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.btn-ghost { background: #fff; color: #1677ff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: 1rpx solid #1677ff; line-height: 1.2; }

.help-banner { display: flex; align-items: flex-start; gap: 12rpx; background: #e6f4ff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; border-left: 6rpx solid #1677ff; }
.help-icon { font-size: 28rpx; flex-shrink: 0; }
.help-text { font-size: 26rpx; color: #333; line-height: 1.5; }

.action-bar { display: flex; gap: 20rpx; margin-bottom: 20rpx; }
.btn-publish { flex: 1; background: #07c160; color: #fff; border: none; border-radius: 8rpx; font-size: 28rpx; padding: 20rpx 0; }
.btn-danger { flex: 1; background: #ff4d4f; color: #fff; border: none; border-radius: 8rpx; font-size: 28rpx; padding: 20rpx 0; }
.btn-publish[disabled] { background: #a8d5b8; }

/* ============ 设计器 ============ */
.designer-wrap { display: flex; flex-wrap: wrap; gap: 20rpx; margin-bottom: 20rpx; }

/* 手机壳 */
.phone-shell { flex-shrink: 0; background: #1f1f1f; border-radius: 36rpx; padding: 20rpx; margin: 0 auto; }
.phone-screen { width: 340rpx; height: 620rpx; background: #ededed; border-radius: 24rpx; overflow: hidden; display: flex; flex-direction: column; position: relative; }

.wx-browser-bar { display: flex; align-items: center; justify-content: space-between; background: #f7f7f7; padding: 12rpx 16rpx; border-bottom: 1rpx solid #e0e0e0; }
.wx-nav-btn { font-size: 30rpx; color: #333; }
.wx-nav-title { font-size: 26rpx; color: #333; font-weight: 500; }

.chat-area { flex: 1; padding: 20rpx; position: relative; overflow: hidden; }
.mp-card { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.mp-avatar { width: 56rpx; height: 56rpx; border-radius: 10rpx; background: #07c160; color: #fff; font-size: 30rpx; font-weight: bold; display: flex; align-items: center; justify-content: center; }
.mp-title { font-size: 24rpx; color: #333; }
.mp-bubble { background: #fff; border-radius: 8rpx; padding: 14rpx 18rpx; font-size: 24rpx; color: #333; margin-bottom: 14rpx; max-width: 100%; line-height: 1.5; word-break: break-all; }

.sub-menu-pop { position: absolute; left: 20rpx; right: 20rpx; bottom: 16rpx; background: #fff; border-radius: 10rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.15); overflow: hidden; z-index: 10; }
.sub-menu-item { padding: 20rpx 24rpx; border-bottom: 1rpx solid #f0f0f0; text-align: center; }
.sub-menu-item:last-child { border-bottom: none; }
.sub-menu-item.active { background: #f2f2f2; }
.sub-menu-name { font-size: 26rpx; color: #333; }

.wx-input-bar { display: flex; align-items: center; gap: 12rpx; background: #f7f7f7; padding: 12rpx 16rpx; border-top: 1rpx solid #e0e0e0; }
.wx-input-placeholder { flex: 1; background: #fff; border-radius: 8rpx; padding: 10rpx 16rpx; font-size: 24rpx; color: #aaa; }
.wx-send-btn { font-size: 24rpx; color: #07c160; }

.wx-menu-bar { display: flex; background: #f7f7f7; border-top: 1rpx solid #e0e0e0; position: relative; }
.wx-menu-item { flex: 1; display: flex; align-items: center; justify-content: center; gap: 4rpx; padding: 20rpx 0; position: relative; }
.wx-menu-item.active { background: #e8e8e8; }
.wx-menu-name { font-size: 26rpx; color: #333; }
.wx-menu-dot { font-size: 22rpx; color: #666; }
.wx-menu-empty { flex: 1; text-align: center; font-size: 24rpx; color: #bbb; padding: 20rpx 0; }

/* 编辑面板 */
.editor-panel { flex: 1; min-width: 460rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; box-sizing: border-box; }
.editor-empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.editor-empty .empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.editor-empty .empty-text { font-size: 26rpx; color: #999; text-align: center; line-height: 1.6; padding: 0 40rpx; }

.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; padding-left: 8rpx; border-left: 6rpx solid #ff0000; }
.form-item { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; }
.required-mark { color: #ff4d4f; margin-left: 4rpx; }
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.form-hint { display: block; font-size: 24rpx; color: #999; margin-top: 6rpx; }
.type-disabled { background: #fff7e6; border: 1rpx solid #ffd591; color: #d46b08; border-radius: 8rpx; padding: 16rpx 20rpx; font-size: 26rpx; }
.picker-box { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; display: flex; align-items: center; justify-content: space-between; color: #333; box-sizing: border-box; }
.picker-arrow { color: #999; }

.editor-actions { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 24rpx; }
.action-btn { padding: 14rpx 28rpx; border-radius: 8rpx; font-size: 26rpx; text-align: center; }
.action-btn.add { background: #e6f4ff; color: #1677ff; }
.action-btn.move { background: #f5f5f5; color: #333; }
.action-btn.del { background: #fff0f0; color: #ff4d4f; }
.action-btn.disabled { opacity: 0.5; pointer-events: none; }

/* 本地版本 */
.local-section { background: #fff; border-radius: 16rpx; overflow: hidden; }
.local-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; background: #fff; }
.local-title { font-size: 30rpx; font-weight: bold; color: #333; }
.local-toggle { font-size: 26rpx; color: #1677ff; }
.local-body { padding: 0 24rpx 24rpx; }
.local-card { display: flex; align-items: center; justify-content: space-between; padding: 20rpx; background: #fafafa; border-radius: 12rpx; margin-bottom: 16rpx; }
.local-info { flex: 1; }
.local-name-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.local-name { font-size: 28rpx; font-weight: bold; color: #333; }
.data-status { padding: 4rpx 14rpx; border-radius: 4rpx; font-size: 20rpx; color: #fff; }
.data-status.active { background: #07c160; }
.data-status.failed { background: #ff4d4f; }
.data-status.inactive { background: #999; }
.local-date { font-size: 22rpx; color: #999; }
.local-actions { display: flex; gap: 12rpx; }
.local-btn { padding: 12rpx 22rpx; border-radius: 8rpx; font-size: 24rpx; }
.local-btn.load { background: #e6f4ff; color: #1677ff; }
.local-btn.pub { background: #e6ffed; color: #07c160; }
.local-btn.del { background: #fff0f0; color: #ff4d4f; }
.local-empty { text-align: center; color: #999; font-size: 26rpx; padding: 40rpx 0; }
</style>
