<template>
  <view class="page-container">
    <PageHeader title="积分商品">
      <view class="header-right">
        <button class="btn-primary" @click="openAdd" v-if="hasPermission('menu.product')">+ 新增</button>
      </view>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input v-model="searchName" class="search-input" placeholder="搜索商品名称" @confirm="handleSearch" />
        <text class="search-icon">🔍</text>
      </view>
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

    <view class="product-list">
      <view v-for="item in list" :key="item.id || item.documentId" class="product-card">
        <view class="product-cover" v-if="item.coverImage">
          <image :src="getMediaUrl(item.coverImage)" mode="aspectFill" />
        </view>
        <view class="product-cover placeholder" v-else>
          <text>🎁</text>
        </view>
        <view class="product-info">
          <view class="product-header">
            <text class="product-name">{{ item.name }}</text>
            <view class="status-badge" :class="getStatusClass(item.status)">{{ getStatusText(item.status) }}</view>
          </view>
          <text class="product-subtitle" v-if="item.subtitle">{{ item.subtitle }}</text>
          <view class="product-price-row">
            <text class="product-points">{{ item.pointsCost || 0 }} 积分</text>
            <text class="product-original" v-if="item.originalPrice">¥{{ item.originalPrice }}</text>
            <text class="tag sales" v-if="item.salesMode === 'hybrid'">积分+售价</text>
            <text class="tag sales" v-if="item.salesMode === 'purchase_only'">仅售价</text>
          </view>
          <view class="product-meta">
            <text class="meta-item" v-if="item.category">{{ item.category }}</text>
            <text class="meta-item" v-if="item.channel?.name">渠道: {{ item.channel.name }}</text>
            <text class="meta-item" v-if="item.allowCrossChannel">跨渠道</text>
            <text class="meta-item" v-if="item.allowGlobalPoints === false">仅渠道积分</text>
            <text class="meta-item">库存: {{ item.stock ?? '-' }}</text>
            <text class="meta-item">{{ getDeliveryLabel(item.deliveryType) }}</text>
            <text class="meta-item" v-if="item.maxPerUser > 0">限兑{{ item.maxPerUser }}次</text>
          </view>
          <view class="product-media-tags" v-if="item.images?.length || item.video">
            <text class="media-tag" v-if="item.images?.length">{{ item.images.length }}图</text>
            <text class="media-tag video" v-if="item.video">视频</text>
          </view>
        </view>
        <view class="product-actions">
          <view class="action-btn edit" @click="openEdit(item)">编辑</view>
          <view class="action-btn stock" @click="openStock(item)">库存</view>
          <view class="action-btn delete" @click="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>

    <view v-if="!loading && list.length === 0" class="empty-state">
      <text class="empty-icon">🎁</text>
      <text class="empty-text">暂无积分商品</text>
      <button class="btn-primary" @click="openAdd" v-if="hasPermission('menu.product')">立即添加</button>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <!-- 新增/编辑弹窗 -->
    <view class="modal-mask" v-if="showModal" @click="closeModal">
      <view class="modal-content large" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isEdit ? '编辑商品' : '新增商品' }}</text>
          <text class="modal-close" @click="closeModal">✕</text>
        </view>
        <scroll-view scroll-y class="modal-body" :style="{ maxHeight: '70vh' }">
          <!-- 基本信息 -->
          <view class="form-section-title">基本信息</view>
          <view class="form-item">
            <text class="form-label">商品名称 <text class="required">*</text></text>
            <input type="text" v-model="form.name" placeholder="请输入商品名称" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">副标题</text>
            <input type="text" v-model="form.subtitle" placeholder="如：限时特惠 / 限量100份" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">分类</text>
            <view class="form-picker" @click="showCategoryModal = true">
              <text :class="{ placeholder: !form.category }">{{ form.category || '请选择分类' }}</text>
              <text class="arrow">▼</text>
            </view>
          </view>
          <view class="form-item">
            <text class="form-label">简短描述</text>
            <textarea v-model="form.description" placeholder="一句话描述商品" class="form-textarea short" />
          </view>

          <!-- 价格库存 -->
          <view class="form-section-title">价格与库存</view>
          <view class="form-row">
            <view class="form-item half">
              <text class="form-label">所需积分 <text class="required">*</text></text>
              <input type="number" v-model="form.pointsCost" placeholder="积分" class="form-input" />
            </view>
            <view class="form-item half">
              <text class="form-label">原价（元）</text>
              <input type="digit" v-model="form.originalPrice" placeholder="0.00" class="form-input" />
            </view>
          </view>
          <view class="form-row">
            <view class="form-item half">
              <text class="form-label">库存数量</text>
              <input type="number" v-model="form.stock" placeholder="0" class="form-input" />
            </view>
            <view class="form-item half">
              <text class="form-label">每人限兑（0=不限）</text>
              <input type="number" v-model="form.maxPerUser" placeholder="0" class="form-input" />
            </view>
          </view>

          <!-- 配送 -->
          <view class="form-section-title">配送信息</view>
          <view class="form-item">
            <text class="form-label">配送类型 <text class="required">*</text></text>
            <view class="radio-group">
              <view
                v-for="dt in deliveryTypeList"
                :key="dt.value"
                :class="['radio-item', { active: form.deliveryType === dt.value }]"
                @click="form.deliveryType = dt.value"
              >
                <text>{{ dt.label }}</text>
              </view>
            </view>
          </view>

          <view class="form-item">
            <text class="form-label">销售模式</text>
            <view class="radio-group">
              <view :class="['radio-item', { active: form.salesMode === 'points_only' }]" @click="form.salesMode = 'points_only'">
                <text>纯积分</text>
              </view>
              <view :class="['radio-item', { active: form.salesMode === 'purchase_only' }]" @click="form.salesMode = 'purchase_only'">
                <text>纯售价</text>
              </view>
              <view :class="['radio-item', { active: form.salesMode === 'hybrid' }]" @click="form.salesMode = 'hybrid'">
                <text>积分+售价</text>
              </view>
            </view>
          </view>
          <view class="form-item" v-if="form.salesMode === 'purchase_only' || form.salesMode === 'hybrid'">
            <text class="form-label">售价 (元) <text class="required" v-if="form.salesMode === 'purchase_only'">*</text></text>
            <input class="form-input" v-model="form.price" type="digit" placeholder="请输入售价" />
          </view>
          <view class="form-item">
            <text class="form-label">所属渠道</text>
            <view class="form-input picker-value" @click="tempChannelId = form.channelId; showChannelModal = true">
              <text v-if="form.channelId">{{ channelOptions.find(c => c.documentId === form.channelId)?.name || form.channelId }}</text>
              <text v-else class="placeholder">请选择渠道</text>
            </view>
          </view>

          <!-- 媒体 -->
          <view class="form-section-title">商品图片与视频</view>
          <view class="form-item">
            <text class="form-label">封面图</text>
            <view class="media-select" @click="openMediaPicker('coverImage')">
              <image v-if="form.coverImageUrl" :src="form.coverImageUrl" mode="aspectFill" class="media-preview" />
              <view v-else class="media-placeholder"><text>+ 选择封面</text></view>
              <text v-if="form.coverImageUrl" class="media-remove" @click.stop="removeMedia('coverImage')">✕</text>
            </view>
          </view>
          <view class="form-item">
            <text class="form-label">商品图片（最多9张）</text>
            <view class="media-grid">
              <view v-for="(img, idx) in form.imagesList" :key="idx" class="media-grid-item">
                <image :src="img.url" mode="aspectFill" class="media-preview" />
                <text class="media-remove" @click="removeImage(idx)">✕</text>
              </view>
              <view v-if="form.imagesList.length < 9" class="media-grid-item add" @click="openMediaPicker('images')">
                <text>+ 添加</text>
              </view>
            </view>
          </view>
          <view class="form-item">
            <text class="form-label">商品视频</text>
            <view class="media-select" @click="openMediaPicker('video')">
              <view v-if="form.videoUrl" class="video-preview">
                <text>🎬 已选视频</text>
              </view>
              <view v-else class="media-placeholder"><text>+ 选择视频</text></view>
              <text v-if="form.videoUrl" class="media-remove" @click.stop="removeMedia('video')">✕</text>
            </view>
          </view>

          <!-- 详情 -->
          <view class="form-section-title">商品详情</view>
          <view class="form-item">
            <text class="form-label">详情</text>
            <RichEditor v-model="form.detail" height="500rpx" />
          </view>

          <!-- 其他 -->
          <view class="form-section-title">其他设置</view>
          <view class="form-item">
            <text class="form-label">排序（越小越靠前）</text>
            <input type="number" v-model="form.sortOrder" placeholder="0" class="form-input" />
          </view>
          <view class="form-item switch-row">
            <text class="form-label">状态</text>
            <switch :checked="form.status === 'on_shelf'" @change="form.status = $event.detail.value ? 'on_shelf' : 'off_shelf'" color="#07c160" />
          </view>
          <view class="form-item switch-row">
            <text class="form-label">允许跨渠道兑付</text>
            <switch :checked="form.allowCrossChannel" @change="form.allowCrossChannel = $event.detail.value" color="#07c160" />
          </view>
          <view class="form-item switch-row">
            <text class="form-label">允许全局积分</text>
            <switch :checked="form.allowGlobalPoints" @change="form.allowGlobalPoints = $event.detail.value" color="#07c160" />
          </view>
        </scroll-view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeModal">取消</button>
          <button class="btn-submit" @click="handleSubmit" :loading="submitting" :disabled="submitting">{{ isEdit ? '保存' : '创建' }}</button>
        </view>
      </view>
    </view>

    <!-- 库存调整弹窗 -->
    <view class="modal-mask" v-if="showStockModal" @click="closeStockModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">调整库存</text>
          <text class="modal-close" @click="closeStockModal">✕</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">当前库存: {{ stockCurrentStock }}</text>
          </view>
          <view class="form-item">
            <text class="form-label">调整数量（正数增加，负数减少）</text>
            <input type="number" v-model="stockDelta" placeholder="请输入调整数量" class="form-input" />
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeStockModal">取消</button>
          <button class="btn-submit" @click="handleStockAdjust">确认</button>
        </view>
      </view>
    </view>

    <!-- 分类选择弹窗 -->
    <view class="select-modal-mask" v-if="showCategoryModal" @click="showCategoryModal = false">
      <view class="select-modal" @click.stop>
        <view class="select-modal-header">
          <text class="select-modal-title">选择分类</text>
          <text class="select-modal-close" @click="showCategoryModal = false">✕</text>
        </view>
        <scroll-view scroll-y style="max-height: 50vh;" class="select-modal-body">
          <view
            v-for="cat in categoryList"
            :key="cat"
            class="select-item"
            :class="{ active: form.category === cat }"
            @click="form.category = cat; showCategoryModal = false"
          >
            <text>{{ cat }}</text>
            <text v-if="form.category === cat" class="select-check">✓</text>
          </view>
          <view class="select-item" @click="form.category = ''; showCategoryModal = false">
            <text class="placeholder">不选择分类</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 渠道选择弹窗 -->
    <view class="select-modal-mask" v-if="showChannelModal" @click="showChannelModal = false">
      <view class="select-modal" @click.stop>
        <view class="select-modal-header">
          <text class="select-modal-title">选择渠道</text>
          <text class="select-modal-confirm" @click="confirmChannelSelect">确定</text>
        </view>
        <scroll-view scroll-y style="max-height: 60vh;" class="select-modal-body">
          <view class="tree-node" @click="tempChannelId = ''"
            :class="{ active: tempChannelId === '' }">
            <view class="tree-toggle-placeholder"></view>
            <text class="tree-label placeholder">不选择渠道</text>
            <text v-if="tempChannelId === ''" class="select-check">✓</text>
          </view>
          <template v-for="node in channelTree" :key="node.id">
            <view class="tree-node" @click="onTreeNodeClick(node)"
              :class="{ active: tempChannelId === node.documentId }">
              <view class="tree-toggle" v-if="node.children && node.children.length">
                <text>{{ expandedNodes[node.id] ? '▼' : '▶' }}</text>
              </view>
              <view v-else class="tree-toggle-placeholder"></view>
              <text class="tree-label">{{ node.name }}</text>
              <text v-if="tempChannelId === node.documentId" class="select-check">✓</text>
            </view>
            <view v-if="expandedNodes[node.id] && node.children && node.children.length" class="tree-children">
              <template v-for="sub in node.children" :key="sub.id">
                <view class="tree-node tree-level-1" @click="onTreeNodeClick(sub)"
                  :class="{ active: tempChannelId === sub.documentId }">
                  <view class="tree-toggle" v-if="sub.children && sub.children.length">
                    <text>{{ expandedNodes[sub.id] ? '▼' : '▶' }}</text>
                  </view>
                  <view v-else class="tree-toggle-placeholder"></view>
                  <text class="tree-label">{{ sub.name }}</text>
                  <text v-if="tempChannelId === sub.documentId" class="select-check">✓</text>
                </view>
                <view v-if="expandedNodes[sub.id] && sub.children && sub.children.length" class="tree-children">
                  <template v-for="leaf in sub.children" :key="leaf.id">
                    <view class="tree-node tree-level-2" @click="onTreeNodeClick(leaf)"
                      :class="{ active: tempChannelId === leaf.documentId }">
                      <view class="tree-toggle" v-if="leaf.children && leaf.children.length">
                        <text>{{ expandedNodes[leaf.id] ? '▼' : '▶' }}</text>
                      </view>
                      <view v-else class="tree-toggle-placeholder"></view>
                      <text class="tree-label">{{ leaf.name }}</text>
                      <text v-if="tempChannelId === leaf.documentId" class="select-check">✓</text>
                    </view>
                    <view v-if="expandedNodes[leaf.id] && leaf.children && leaf.children.length" class="tree-children">
                      <view v-for="deep in leaf.children" :key="deep.id"
                        class="tree-node tree-level-3" @click="onTreeNodeClick(deep)"
                        :class="{ active: tempChannelId === deep.documentId }">
                        <view class="tree-toggle-placeholder"></view>
                        <text class="tree-label">{{ deep.name }}</text>
                        <text v-if="tempChannelId === deep.documentId" class="select-check">✓</text>
                      </view>
                    </view>
                  </template>
                </view>
              </template>
            </view>
          </template>
        </scroll-view>
      </view>
    </view>

    <!-- 媒体选择器 -->
    <MediaPicker
      :visible="showMediaPicker"
      :folder="mediaPickerFolder"
      :accept="mediaPickerTarget === 'video' ? 'video/*' : 'image/*'"
      :multiple="mediaPickerTarget === 'images'"
      @select="onMediaSelected"
      @update:visible="showMediaPicker = $event"
    />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getProductList, createProduct, updateProduct, deleteProduct, adjustProductStock } from '../../src/api/points.js'
import { getAdminChannelList } from '../../src/api/channel.js'
import { useUserStore } from '../../src/store/user.js'
import { getMediaUrl } from '../../src/utils/format.js'
import MediaPicker from '../../src/components/MediaPicker.vue'
import RichEditor from '../../src/components/RichEditor.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchName = ref('')
const statusIndex = ref(0)
const deliveryIndex = ref(0)

const statusValues = ['', 'on_shelf', 'off_shelf']
const statusLabels = ['全部状态', '上架', '下架']
const deliveryValues = ['', 'self_pickup', 'express', 'both']
const deliveryLabels = ['全部类型', '自提', '快递', '自提/快递']
const deliveryTypeList = [
  { value: 'self_pickup', label: '自提' },
  { value: 'express', label: '快递' },
  { value: 'both', label: '自提/快递' },
]
const categoryList = ['实物商品', '虚拟商品', '优惠券', '会员权益', '课程兑换', '其他']

function getDeliveryLabel(type) {
  return deliveryTypeList.find(d => d.value === type)?.label ?? type ?? ''
}

const list = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

const showModal = ref(false)
const isEdit = ref(false)
const editId = ref('')
const submitting = ref(false)
const channelOptions = ref([])
const channelTree = ref([])
const showCategoryModal = ref(false)
const showChannelModal = ref(false)
const tempChannelId = ref(null)
const expandedNodes = ref({})

async function loadChannels() {
  try {
    const res = await getAdminChannelList({ pageSize: 500 })
    const list = res?.list ?? res?.records ?? []
    channelOptions.value = list
    // 使用 path 字段构建树（path 格式: /59/77/）
    const idMap = {}
    list.forEach(ch => { idMap[ch.id] = { ...ch, children: [] } })
    const tree = []
    list.forEach(ch => {
      const node = idMap[ch.id]
      const pid = ch.parentChannelId?.id
      if (pid && idMap[pid]) {
        idMap[pid].children.push(node)
      } else {
        tree.push(node)
      }
    })
    channelTree.value = tree
  } catch (e) {
    channelOptions.value = []
    channelTree.value = []
  }
}

function toggleTreeNode(nodeId) {
  expandedNodes.value[nodeId] = !expandedNodes.value[nodeId]
  expandedNodes.value = { ...expandedNodes.value }
}

function onTreeNodeClick(node) {
  // 选中该节点
  tempChannelId.value = node.documentId
  // 有子节点时切换展开/折叠
  if (node.children && node.children.length) {
    toggleTreeNode(node.id)
  }
}

function confirmChannelSelect() {
  form.value.channelId = tempChannelId.value
  showChannelModal.value = false
}

function emptyForm() {
  return {
    name: '', subtitle: '', category: '', description: '',
    pointsCost: '', originalPrice: '', stock: '',
    maxPerUser: '0', deliveryType: 'self_pickup', sortOrder: '0',
    salesMode: 'points_only', price: '',
    channelId: '',
    detail: '', status: 'on_shelf',
    // 媒体字段（前端用，提交时转为 Strapi media relation）
    coverImageId: null, coverImageUrl: '',
    imagesList: [],   // [{id, url}]
    videoId: null, videoUrl: '',
    allowCrossChannel: false,
    allowGlobalPoints: true,
  }
}
const form = ref(emptyForm())

const showStockModal = ref(false)
const stockProductId = ref('')
const stockCurrentStock = ref(0)
const stockDelta = ref('')

// 媒体选择器
const showMediaPicker = ref(false)
const mediaPickerTarget = ref('coverImage')

const mediaPickerFolder = computed(() => {
  const t = mediaPickerTarget.value
  if (t === 'video') return '/product/videos'
  if (t === 'coverImage') return '/product/covers'
  if (t === 'images') return '/product/images'
  return '/product/images'
})

function openMediaPicker(target) {
  mediaPickerTarget.value = target
  showMediaPicker.value = true
}

function onMediaSelected(file) {
  if (mediaPickerTarget.value === 'coverImage') {
    form.value.coverImageId = file.id
    form.value.coverImageUrl = file.url
  } else if (mediaPickerTarget.value === 'video') {
    form.value.videoId = file.id
    form.value.videoUrl = file.url
  } else if (mediaPickerTarget.value === 'images') {
    if (form.value.imagesList.length < 9) {
      form.value.imagesList.push({ id: file.id, url: file.url })
    }
  }
  showMediaPicker.value = false
}

function removeMedia(target) {
  if (target === 'coverImage') {
    form.value.coverImageId = null
    form.value.coverImageUrl = ''
  } else if (target === 'video') {
    form.value.videoId = null
    form.value.videoUrl = ''
  }
}

function removeImage(idx) {
  form.value.imagesList.splice(idx, 1)
}

function onCategoryChange(e) {
  form.value.category = categoryList[e.detail.value]
}

const statusMap = {
  on_shelf: { text: '上架', cls: 'active' },
  off_shelf: { text: '下架', cls: 'inactive' },
}
function getStatusText(status) { return statusMap[status]?.text ?? status ?? '-' }
function getStatusClass(status) { return statusMap[status]?.cls ?? 'inactive' }

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { page, pageSize: pagination.value.pageSize }
    if (searchName.value) params.name = searchName.value
    if (statusIndex.value > 0) params.status = statusValues[statusIndex.value]
    if (deliveryIndex.value > 0) params.deliveryType = deliveryValues[deliveryIndex.value]
    const res = await getProductList(params)
    list.value = res.list || []
    pagination.value = res.pagination || { page: 1, pageSize: 20, total: 0 }
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleSearch() { loadData(1) }
function handleStatusChange(e) { statusIndex.value = e.detail.value; loadData(1) }
function handleDeliveryChange(e) { deliveryIndex.value = e.detail.value; loadData(1) }
function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }
const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

function openAdd() {
  isEdit.value = false; editId.value = ''
  form.value = emptyForm()
  showModal.value = true
}

async function openEdit(item) {
  isEdit.value = true; editId.value = item.documentId || item.id
  form.value = {
    name: item.name || '',
    subtitle: item.subtitle || '',
    category: item.category || '',
    description: item.description || '',
    pointsCost: String(item.pointsCost ?? ''),
    originalPrice: String(item.originalPrice ?? ''),
    stock: String(item.stock ?? ''),
    maxPerUser: String(item.maxPerUser ?? 0),
    deliveryType: item.deliveryType || 'self_pickup',
    salesMode: item.salesMode || 'points_only',
    price: String(item.price ?? ''),
    channelId: item.channel?.documentId || '',
    sortOrder: String(item.sortOrder ?? 0),
    detail: item.detail || '',
    status: item.status || 'on_shelf',
    coverImageId: item.coverImage?.id || null,
    coverImageUrl: item.coverImage ? getMediaUrl(item.coverImage) : '',
    imagesList: (item.images || []).map(img => ({ id: img.id, url: getMediaUrl(img) })),
    videoId: item.video?.id || null,
    videoUrl: item.video ? getMediaUrl(item.video) : '',
    allowCrossChannel: item.allowCrossChannel || false,
    allowGlobalPoints: item.allowGlobalPoints !== false,
  }
  showModal.value = true
}

function closeModal() { showModal.value = false }

async function handleSubmit() {
  if (submitting.value) return
  if (!form.value.name) return uni.showToast({ title: '请输入商品名称', icon: 'none' })
  if (!form.value.pointsCost) return uni.showToast({ title: '请输入所需积分', icon: 'none' })
  submitting.value = true
  try {
    const data = {
      name: form.value.name,
      subtitle: form.value.subtitle || undefined,
      category: form.value.category || undefined,
      description: form.value.description || undefined,
      detail: form.value.detail || undefined,
      pointsCost: Number(form.value.pointsCost) || 0,
      originalPrice: form.value.originalPrice ? Number(form.value.originalPrice) : undefined,
      stock: form.value.stock !== '' ? Number(form.value.stock) : 0,
      totalStock: form.value.stock !== '' ? Number(form.value.stock) : 0,
      maxPerUser: Number(form.value.maxPerUser) || 0,
      deliveryType: form.value.deliveryType,
      salesMode: form.value.salesMode,
      price: form.value.price ? Number(form.value.price) : undefined,
      channel: form.value.channelId || undefined,
      sortOrder: Number(form.value.sortOrder) || 0,
      status: form.value.status,
      // Strapi media relation: 传 id
      coverImage: form.value.coverImageId || undefined,
      images: form.value.imagesList.length > 0 ? form.value.imagesList.map(i => i.id) : undefined,
      video: form.value.videoId || undefined,
      allowCrossChannel: form.value.allowCrossChannel,
      allowGlobalPoints: form.value.allowGlobalPoints,
    }
    if (isEdit.value) {
      await updateProduct(editId.value, data)
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      await createProduct(data)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    closeModal(); loadData(currentPage.value)
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally { submitting.value = false }
}

async function handleDelete(item) {
  uni.showModal({
    title: '确认删除', content: `确定要删除商品「${item.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteProduct(item.documentId || item.id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
      }
    }
  })
}

function openStock(item) {
  stockProductId.value = item.documentId || item.id
  stockCurrentStock.value = item.stock || 0
  stockDelta.value = ''
  showStockModal.value = true
}
function closeStockModal() { showStockModal.value = false }

async function handleStockAdjust() {
  if (!stockDelta.value) return uni.showToast({ title: '请输入调整数量', icon: 'none' })
  try {
    await adjustProductStock(stockProductId.value, { delta: Number(stockDelta.value) })
    uni.showToast({ title: '调整成功', icon: 'success' })
    closeStockModal(); loadData(currentPage.value)
  } catch (e) { uni.showToast({ title: '调整失败', icon: 'none' }) }
}

onMounted(() => { loadData(1); loadChannels() })
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.btn-primary {
  background: #ff0000; color: #fff; padding: 16rpx 32rpx;
  font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2;
}

.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.search-box {
  display: flex; align-items: center; background: #f5f5f5;
  border-radius: 8rpx; padding: 0 20rpx; margin-bottom: 20rpx;
}
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }

.filter-row { display: flex; gap: 20rpx; }
.filter-item {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx;
}
.arrow { font-size: 20rpx; color: #999; }

.product-list { display: flex; flex-direction: column; gap: 16rpx; }

.product-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx;
  display: flex; align-items: center; gap: 20rpx;
}

.product-cover {
  width: 120rpx; height: 120rpx; border-radius: 8rpx; overflow: hidden; flex-shrink: 0;
  background: #f5f5f5;
}
.product-cover image { width: 100%; height: 100%; }
.product-cover.placeholder {
  display: flex; align-items: center; justify-content: center; font-size: 48rpx;
}

.product-info { flex: 1; min-width: 0; }
.product-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 4rpx;
}
.product-name { font-size: 30rpx; font-weight: bold; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; margin-right: 12rpx; }
.product-subtitle { font-size: 24rpx; color: #999; margin-bottom: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-badge.active { background: #e8f5e9; color: #07c160; }
.status-badge.inactive { background: #ffebee; color: #ff4d4f; }

.product-price-row { display: flex; align-items: baseline; gap: 12rpx; margin-bottom: 6rpx; }
.product-points { font-size: 34rpx; font-weight: bold; color: #667eea; }
.product-original { font-size: 24rpx; color: #999; text-decoration: line-through; }

.product-meta { display: flex; gap: 12rpx; flex-wrap: wrap; }
.meta-item { font-size: 22rpx; color: #999; background: #f5f5f5; padding: 2rpx 10rpx; border-radius: 6rpx; }

.product-media-tags { display: flex; gap: 8rpx; margin-top: 6rpx; }
.media-tag { font-size: 20rpx; color: #667eea; background: #f0f4ff; padding: 2rpx 10rpx; border-radius: 6rpx; }
.media-tag.video { color: #ff6b00; background: #fff7e6; }

.product-actions { display: flex; gap: 12rpx; flex-shrink: 0; }
.action-btn { padding: 12rpx 20rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.stock { background: #fff8e1; color: #faad14; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }

.loading, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100rpx 0;
}
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }

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
  width: 90%; max-height: 85vh; background: #fff;
  border-radius: 16rpx; display: flex; flex-direction: column;
}
.modal-content.large { width: 95%; max-height: 90vh; }
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 30rpx; border-bottom: 1rpx solid #f0f0f0;
}
.modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.modal-close { font-size: 36rpx; color: #999; padding: 10rpx; }

.modal-body { padding: 30rpx; flex: 1; overflow-y: auto; overflow-x: visible; }

.form-section-title {
  font-size: 28rpx; font-weight: bold; color: #333;
  margin: 24rpx 0 16rpx; padding-bottom: 8rpx;
  border-bottom: 2rpx solid #667eea;
}
.form-section-title:first-child { margin-top: 0; }

.form-item { margin-bottom: 24rpx; }
.form-label { font-size: 28rpx; color: #333; margin-bottom: 10rpx; display: block; }
.required { color: #ff4d4f; }

.form-input {
  width: 100%; height: 76rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 0 20rpx; font-size: 28rpx; box-sizing: border-box;
}
.form-textarea {
  width: 100%; min-height: 100rpx; background: #f5f5f5; border-radius: 8rpx;
  padding: 20rpx; font-size: 28rpx; box-sizing: border-box;
}
.form-textarea.short { min-height: 80rpx; }
.form-textarea.tall { min-height: 200rpx; }
.form-picker {
  display: flex; justify-content: space-between; align-items: center;
  height: 76rpx; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; font-size: 28rpx;
  color: #333;
}
.form-picker .placeholder { color: #999; }

.form-row { display: flex; gap: 20rpx; }
.form-item.half { flex: 1; }

/* 配送类型 radio */
.radio-group { display: flex; gap: 16rpx; }
.radio-item {
  padding: 14rpx 28rpx; background: #f5f5f5; border-radius: 8rpx;
  font-size: 26rpx; color: #666; border: 2rpx solid transparent;
}
.radio-item.active { background: #f0f4ff; color: #667eea; border-color: #667eea; }

.tag.sales { background: #fff7e6; color: #fa8c16; }

/* 媒体选择 */
.media-select {
  position: relative; width: 200rpx; height: 200rpx;
  border-radius: 8rpx; overflow: hidden; background: #f5f5f5;
}
.media-preview { width: 100%; height: 100%; }
.media-placeholder {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  font-size: 26rpx; color: #999; border: 2rpx dashed #ddd; border-radius: 8rpx; box-sizing: border-box;
}
.media-remove {
  position: absolute; top: 4rpx; right: 4rpx; width: 40rpx; height: 40rpx;
  background: rgba(0,0,0,0.5); color: #fff; border-radius: 50%;
  font-size: 24rpx; text-align: center; line-height: 40rpx;
}
.video-preview {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  background: #333; color: #fff; font-size: 26rpx;
}

.media-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.media-grid-item {
  position: relative; width: 160rpx; height: 160rpx;
  border-radius: 8rpx; overflow: hidden; background: #f5f5f5;
}
.media-grid-item image { width: 100%; height: 100%; }
.media-grid-item.add {
  display: flex; align-items: center; justify-content: center;
  font-size: 26rpx; color: #999; border: 2rpx dashed #ddd; box-sizing: border-box;
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

.picker-value {
  display: flex; align-items: center; cursor: pointer;
}
.picker-value .placeholder { color: #999; }

/* 选择弹窗 */
.select-modal-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4); z-index: 3000;
  display: flex; align-items: flex-end; justify-content: center;
}
.select-modal {
  width: 100%; max-height: 60vh; background: #fff;
  border-radius: 24rpx 24rpx 0 0; display: flex; flex-direction: column;
}
.select-modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 30rpx; border-bottom: 1rpx solid #f0f0f0;
}
.select-modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.select-modal-close { font-size: 36rpx; color: #999; padding: 10rpx; }
.select-modal-confirm { font-size: 30rpx; color: #667eea; font-weight: bold; padding: 10rpx 20rpx; }
.select-modal-body { flex: 1; padding: 0 30rpx; }
.select-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 28rpx 0; border-bottom: 1rpx solid #f5f5f5; font-size: 30rpx; color: #333;
}
.select-item.active { color: #667eea; font-weight: bold; }
.select-check { color: #667eea; font-size: 32rpx; }
.select-item .placeholder { color: #999; }

/* 渠道树形 */
.tree-node {
  display: flex; align-items: center; padding: 28rpx 16rpx;
  border-bottom: 1rpx solid #f5f5f5; font-size: 30rpx; color: #333;
  cursor: pointer;
}
.tree-node:active { background: #f5f5f5; }
.tree-node.active { color: #667eea; font-weight: bold; }
.tree-toggle {
  width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; color: #999; flex-shrink: 0;
}
.tree-toggle-placeholder { width: 60rpx; flex-shrink: 0; }
.tree-label { flex: 1; }
.tree-children { padding-left: 32rpx; }
.tree-node.tree-level-1 { font-size: 28rpx; color: #555; }
.tree-node.tree-level-2 { font-size: 26rpx; color: #777; }
.tree-node.tree-level-3 { font-size: 24rpx; color: #999; }
</style>
