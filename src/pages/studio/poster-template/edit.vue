<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑海报模板' : '新增海报模板'">
      <button class="btn-secondary" @click="goBack">取消</button>
      <button class="btn-primary" @click="handleSubmit">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <!-- 基本信息 -->
      <view class="form-section">
        <view class="section-title">基本信息</view>

        <view class="form-item">
          <text class="form-label">名称 *</text>
          <input type="text" v-model="form.name" placeholder="请输入海报模板名称" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">编码 *</text>
          <input type="text" v-model="form.code" placeholder="请输入唯一编码" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">描述</text>
          <textarea v-model="form.description" placeholder="请输入描述" class="form-textarea" />
        </view>

        <view class="form-item">
          <text class="form-label">是否启用</text>
          <view class="form-switch-row">
            <switch :checked="form.isActive" @change="form.isActive = $event.detail.value" />
            <text class="switch-text">{{ form.isActive ? '启用' : '停用' }}</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">是否默认</text>
          <view class="form-switch-row">
            <switch :checked="form.isDefault" @change="form.isDefault = $event.detail.value" />
            <text class="switch-text">{{ form.isDefault ? '默认' : '非默认' }}</text>
          </view>
        </view>
      </view>

      <!-- 画布设置 -->
      <view class="form-section">
        <view class="section-title">画布设置</view>

        <view class="form-row">
          <view class="form-item form-item-half">
            <text class="form-label">画布宽度</text>
            <input type="number" v-model="form.canvasWidth" placeholder="600" class="form-input" />
          </view>
          <view class="form-item form-item-half">
            <text class="form-label">画布高度</text>
            <input type="number" v-model="form.canvasHeight" placeholder="1000" class="form-input" />
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">背景颜色</text>
          <input type="text" v-model="form.backgroundColor" placeholder="#FFFFFF" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">背景图片</text>
          <view class="media-select" @click="showBgImagePicker = true">
            <image v-if="form.backgroundImage" :src="form.backgroundImage" mode="aspectFit" class="media-preview" />
            <view v-else class="media-placeholder"><text>+ 选择图片</text></view>
            <text v-if="form.backgroundImage" class="media-remove" @click.stop="clearBgImage">✕</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">背景模式</text>
          <picker mode="selector" :range="bgModeLabels" :value="bgModeIndex" @change="handleBgModeChange">
            <view class="form-picker">
              <text>{{ bgModeLabels[bgModeIndex] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 变量定义 -->
      <view class="form-section">
        <view class="section-title">变量定义</view>

        <view class="form-item">
          <text class="form-label">必填变量（每行一个）</text>
          <textarea v-model="form.requiredVariables" placeholder="title&#10;description&#10;image_url&#10;qr_code" class="form-textarea form-textarea-tall" />
        </view>

        <view class="form-item">
          <text class="form-label">可选变量（每行一个）</text>
          <textarea v-model="form.optionalVariables" placeholder="market_price&#10;sale_price&#10;invite_code" class="form-textarea form-textarea-tall" />
        </view>
      </view>

      <!-- 元素管理 -->
      <view class="form-section" v-if="isEdit">
        <view class="section-title">元素管理</view>

        <!-- 变量来源提示表 -->
        <view class="variable-source-table" v-if="currentVariableTable.length > 0">
          <text class="table-title">变量来源参考表（{{ form.code }}）</text>
          <view class="table-header">
            <text class="th">变量名</text>
            <text class="th">类型</text>
            <text class="th">前端来源</text>
            <text class="th">必填</text>
          </view>
          <view class="table-row" v-for="item in currentVariableTable" :key="item.varName">
            <text class="td">{{ item.varName }}</text>
            <text class="td">{{ item.type }}</text>
            <text class="td">{{ item.source }}</text>
            <text class="td">{{ item.required ? '是' : '否' }}</text>
          </view>
        </view>

        <!-- 元素列表 -->
        <view class="element-list" v-if="elements.length > 0">
          <view class="element-row" v-for="(el, idx) in elements" :key="idx">
            <view class="element-info">
              <text class="element-type">{{ getElementTypeLabel(el.elementType) }}</text>
              <text class="element-key">{{ el.elementKey }}</text>
              <text class="element-name">{{ el.elementName || '-' }}</text>
              <text class="element-pos">{{ el.x }},{{ el.y }}</text>
              <!-- 类型徽章 -->
              <text :class="['element-badge', getElementTypeBadge(el).class]">{{ getElementTypeBadge(el).text }}</text>
            </view>
            <view class="element-actions">
              <view class="action-btn edit" @click="startEditElement(idx)">编辑</view>
              <view class="action-btn delete" @click="removeElement(idx)">删除</view>
            </view>
          </view>
        </view>
        <view v-else class="empty-elements">
          <text class="empty-text">暂无元素</text>
        </view>

        <!-- 操作按钮 -->
        <view class="element-toolbar" v-if="!editingElement">
          <button class="btn-secondary" @click="startAddElement">新增元素</button>
          <button class="btn-primary" @click="handleBatchSaveElements">批量保存元素</button>
        </view>

        <!-- 元素内联编辑表单 -->
        <view class="element-form" v-if="editingElement">
          <view class="element-form-title">{{ editingElementIndex === -1 ? '新增元素' : '编辑元素' }}</view>

          <view class="form-item">
            <text class="form-label">元素类型</text>
            <picker mode="selector" :range="elementPickerConfigs.elementType.labels" :value="elPickerIndex('elementType')" @change="handleElPickerChange('elementType', $event)">
              <view class="form-picker">
                <text>{{ elementPickerConfigs.elementType.labels[elPickerIndex('elementType')] }}</text>
                <text class="arrow">▼</text>
              </view>
            </picker>
          </view>

          <view class="form-item">
            <text class="form-label">元素 Key *</text>
            <input type="text" v-model="editingElement.elementKey" placeholder="请输入元素 Key" class="form-input" />
          </view>

          <view class="form-item">
            <text class="form-label">元素名称</text>
            <input type="text" v-model="editingElement.elementName" placeholder="请输入元素名称" class="form-input" />
          </view>

          <view class="form-item">
            <text class="form-label">是否变量</text>
            <view class="form-switch-row">
              <switch :checked="editingElement.isVariable" @change="editingElement.isVariable = $event.detail.value" />
              <text class="switch-text">{{ editingElement.isVariable ? '是' : '否' }}</text>
            </view>
          </view>
          <view class="form-hint-block" v-if="editingElement.isVariable">
            <text class="form-hint-title">☑ 变量元素</text>
            <text class="form-hint-text">此元素的值由前端页面动态传入。在编辑器中设置的值作为优先值（非空时优先生效），前端页面传入的值作为兜底。适用于需要动态内容的元素（如用户名、课程封面）。</text>
          </view>
          <view class="form-hint-block" v-else>
            <text class="form-hint-title">☐ 固定元素</text>
            <text class="form-hint-text">此元素始终使用在此设置的值，不受前端页面影响。适用于静态内容（如底部提示文字、装饰性色块）。</text>
          </view>

          <!-- 变量名下拉选择（替换原有 input） -->
          <view class="form-item" v-if="editingElement.isVariable">
            <text class="form-label">变量名</text>
            <picker mode="selector" :range="variableOptions" :value="variableOptions.indexOf(editingElement.variableName)" @change="editingElement.variableName = variableOptions[$event.detail.value]">
              <view class="form-picker">
                <text>{{ editingElement.variableName || '请选择变量' }}</text>
                <text class="arrow">▼</text>
              </view>
            </picker>
          </view>

          <view class="form-item">
            <text class="form-label">默认值</text>
            <textarea v-model="editingElement.defaultValue" placeholder="请输入默认值" class="form-textarea" />
          </view>

          <view class="form-item" v-if="!editingElement.isVariable">
            <text class="form-label">内容</text>
            <textarea v-model="editingElement.content" placeholder="请输入内容" class="form-textarea" />
          </view>

          <view class="form-row">
            <view class="form-item form-item-half">
              <text class="form-label">X</text>
              <input type="number" v-model="editingElement.x" placeholder="0" class="form-input" />
            </view>
            <view class="form-item form-item-half">
              <text class="form-label">Y</text>
              <input type="number" v-model="editingElement.y" placeholder="0" class="form-input" />
            </view>
          </view>

          <view class="form-row">
            <view class="form-item form-item-half">
              <text class="form-label">宽度</text>
              <input type="number" v-model="editingElement.width" placeholder="0" class="form-input" />
            </view>
            <view class="form-item form-item-half">
              <text class="form-label">高度</text>
              <input type="number" v-model="editingElement.height" placeholder="0" class="form-input" />
            </view>
          </view>

          <view class="form-row">
            <view class="form-item form-item-third">
              <text class="form-label">层级</text>
              <input type="number" v-model="editingElement.zIndex" placeholder="0" class="form-input" />
            </view>
            <view class="form-item form-item-third">
              <text class="form-label">旋转</text>
              <input type="number" v-model="editingElement.rotation" placeholder="0" class="form-input" />
            </view>
            <view class="form-item form-item-third">
              <text class="form-label">透明度</text>
              <input type="digit" v-model="editingElement.opacity" placeholder="1" class="form-input" />
            </view>
          </view>

          <view class="form-row">
            <view class="form-item form-item-half">
              <text class="form-label">字号</text>
              <input type="number" v-model="editingElement.fontSize" placeholder="14" class="form-input" />
            </view>
            <view class="form-item form-item-half">
              <text class="form-label">字体颜色</text>
              <input type="text" v-model="editingElement.fontColor" placeholder="#333333" class="form-input" />
            </view>
          </view>

          <view class="form-row">
            <view class="form-item form-item-half">
              <text class="form-label">字体粗细</text>
              <picker mode="selector" :range="elementPickerConfigs.fontWeight.labels" :value="elPickerIndex('fontWeight')" @change="handleElPickerChange('fontWeight', $event)">
                <view class="form-picker">
                  <text>{{ elementPickerConfigs.fontWeight.labels[elPickerIndex('fontWeight')] }}</text>
                  <text class="arrow">▼</text>
                </view>
              </picker>
            </view>
            <view class="form-item form-item-half">
              <text class="form-label">文字对齐</text>
              <picker mode="selector" :range="elementPickerConfigs.textAlign.labels" :value="elPickerIndex('textAlign')" @change="handleElPickerChange('textAlign', $event)">
                <view class="form-picker">
                  <text>{{ elementPickerConfigs.textAlign.labels[elPickerIndex('textAlign')] }}</text>
                  <text class="arrow">▼</text>
                </view>
              </picker>
            </view>
          </view>

          <view class="form-item">
            <text class="form-label">字体</text>
            <input type="text" v-model="editingElement.fontFamily" placeholder="sans-serif" class="form-input" />
          </view>

          <view class="form-row">
            <view class="form-item form-item-half">
              <text class="form-label">行高</text>
              <input type="digit" v-model="editingElement.lineHeight" placeholder="1.5" class="form-input" />
            </view>
            <view class="form-item form-item-half">
              <text class="form-label">字间距</text>
              <input type="number" v-model="editingElement.letterSpacing" placeholder="0" class="form-input" />
            </view>
          </view>

          <view class="form-row">
            <view class="form-item form-item-third">
              <text class="form-label">圆角</text>
              <input type="number" v-model="editingElement.borderRadius" placeholder="0" class="form-input" />
            </view>
            <view class="form-item form-item-third">
              <text class="form-label">边框宽度</text>
              <input type="number" v-model="editingElement.borderWidth" placeholder="0" class="form-input" />
            </view>
            <view class="form-item form-item-third">
              <text class="form-label">边框颜色</text>
              <input type="text" v-model="editingElement.borderColor" placeholder="#000000" class="form-input" />
            </view>
          </view>

          <view class="form-item">
            <text class="form-label">元素背景色</text>
            <input type="text" v-model="editingElement.elementBgColor" placeholder="请输入背景色" class="form-input" />
          </view>

          <!-- 图片元素专属 -->
          <view class="form-item" v-if="editingElement.elementType === 'image'">
            <text class="form-label">图片适应</text>
            <picker mode="selector" :range="elementPickerConfigs.imageFit.labels" :value="elPickerIndex('imageFit')" @change="handleElPickerChange('imageFit', $event)">
              <view class="form-picker">
                <text>{{ elementPickerConfigs.imageFit.labels[elPickerIndex('imageFit')] }}</text>
                <text class="arrow">▼</text>
              </view>
            </picker>
          </view>

          <!-- 图片上传 -->
          <view class="form-item" v-if="editingElement.elementType === 'image'">
            <text class="form-label">
              {{ editingElement.isVariable ? '默认图片（优先值）' : '图片 URL' }}
            </text>
            <view class="media-select" @click="openElementImagePicker(editingElement.isVariable ? 'defaultValue' : 'content')">
              <image v-if="editingElement.isVariable ? editingElement.defaultValue : editingElement.content" :src="editingElement.isVariable ? editingElement.defaultValue : editingElement.content" mode="aspectFit" class="media-preview" />
              <view v-else class="media-placeholder"><text>+ 选择图片</text></view>
              <text v-if="editingElement.isVariable ? editingElement.defaultValue : editingElement.content" class="media-remove" @click.stop="clearElementImage">✕</text>
            </view>
            <text class="form-hint" v-if="editingElement.isVariable">
              此值非空时优先生效，前端页面传入的值作为兜底
            </text>
          </view>

          <!-- 二维码元素专属 -->
          <template v-if="editingElement.elementType === 'qrcode'">
            <view class="form-item">
              <text class="form-label">二维码内容模式</text>
              <picker mode="selector" :range="elementPickerConfigs.qrContentMode.labels" :value="elPickerIndex('qrContentMode')" @change="handleElPickerChange('qrContentMode', $event)">
                <view class="form-picker">
                  <text>{{ elementPickerConfigs.qrContentMode.labels[elPickerIndex('qrContentMode')] }}</text>
                  <text class="arrow">▼</text>
                </view>
              </picker>
            </view>

            <view class="form-item">
              <text class="form-label">基础 URL</text>
              <input type="text" v-model="editingElement.qrBaseUrl" placeholder="请输入基础 URL" class="form-input" />
            </view>

            <view class="form-row">
              <view class="form-item form-item-half">
                <text class="form-label">邀请参数名</text>
                <input type="text" v-model="editingElement.qrInviteParam" placeholder="inviteCode" class="form-input" />
              </view>
              <view class="form-item form-item-half">
                <text class="form-label">邀请分隔符</text>
                <input type="text" v-model="editingElement.qrInviteSeparator" placeholder="?" class="form-input" />
              </view>
            </view>

            <view class="form-item">
              <text class="form-label">降级模式</text>
              <picker mode="selector" :range="elementPickerConfigs.qrFallbackMode.labels" :value="elPickerIndex('qrFallbackMode')" @change="handleElPickerChange('qrFallbackMode', $event)">
                <view class="form-picker">
                  <text>{{ elementPickerConfigs.qrFallbackMode.labels[elPickerIndex('qrFallbackMode')] }}</text>
                  <text class="arrow">▼</text>
                </view>
              </picker>
            </view>

            <view class="form-row">
              <view class="form-item form-item-half">
                <text class="form-label">容错等级</text>
                <picker mode="selector" :range="elementPickerConfigs.qrErrorLevel.labels" :value="elPickerIndex('qrErrorLevel')" @change="handleElPickerChange('qrErrorLevel', $event)">
                  <view class="form-picker">
                    <text>{{ elementPickerConfigs.qrErrorLevel.labels[elPickerIndex('qrErrorLevel')] }}</text>
                    <text class="arrow">▼</text>
                  </view>
                </picker>
              </view>
              <view class="form-item form-item-half">
                <text class="form-label">二维码尺寸</text>
                <input type="number" v-model="editingElement.qrSize" placeholder="120" class="form-input" />
              </view>
            </view>

            <view class="form-row">
              <view class="form-item form-item-half">
                <text class="form-label">二维码颜色</text>
                <input type="text" v-model="editingElement.qrColor" placeholder="#000000" class="form-input" />
              </view>
              <view class="form-item form-item-half">
                <text class="form-label">二维码背景色</text>
                <input type="text" v-model="editingElement.qrBgColor" placeholder="#FFFFFF" class="form-input" />
              </view>
            </view>
          </template>

          <!-- 形状元素专属 -->
          <view class="form-item" v-if="editingElement.elementType === 'shape'">
            <text class="form-label">形状类型</text>
            <picker mode="selector" :range="elementPickerConfigs.shapeType.labels" :value="elPickerIndex('shapeType')" @change="handleElPickerChange('shapeType', $event)">
              <view class="form-picker">
                <text>{{ elementPickerConfigs.shapeType.labels[elPickerIndex('shapeType')] }}</text>
                <text class="arrow">▼</text>
              </view>
            </picker>
          </view>

          <view class="form-item">
            <text class="form-label">排序</text>
            <input type="number" v-model="editingElement.sortOrder" placeholder="0" class="form-input" />
          </view>

          <view class="element-form-actions">
            <button class="btn-secondary" @click="cancelEditElement">取消</button>
            <button class="btn-primary" @click="saveElement">保存元素</button>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 背景图片选择器 -->
    <MediaPicker
      :visible="showBgImagePicker"
      :folder="'/studio/poster-bg'"
      accept="image/*"
      @select="onBgImageSelected"
      @update:visible="showBgImagePicker = $event"
    />

    <!-- 元素图片选择器 -->
    <MediaPicker
      :visible="showElementImagePicker"
      :folder="'/studio/poster-elements'"
      accept="image/*"
      @select="onElementImageSelected"
      @update:visible="showElementImagePicker = $event"
    />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { posterTemplateApi, posterElementApi } from '../../../api/studio.js'
import PageHeader from '../../../components/PageHeader.vue'
import MediaPicker from '../../../components/MediaPicker.vue'

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)

const bgModeEnums = ['cover', 'contain', 'stretch', 'tile']
const bgModeLabels = ['cover', 'contain', 'stretch', 'tile']

const form = ref({
  name: '',
  code: '',
  description: '',
  isActive: true,
  isDefault: false,
  canvasWidth: 600,
  canvasHeight: 1000,
  backgroundColor: '#FFFFFF',
  backgroundImage: '',
  backgroundMode: 'cover',
  requiredVariables: 'title\ndescription\nimage_url\nqr_code',
  optionalVariables: 'market_price\nsale_price\ninvite_code'
})

// MediaPicker 状态
const showBgImagePicker = ref(false)
const showElementImagePicker = ref(false)
const elementImageTarget = ref('') // 'content' 或 'defaultValue'

// 元素类型徽章颜色映射
function getElementTypeBadge(el) {
  if (el.isVariable) {
    return { text: `变量: ${el.variableName || '未设置'}`, class: 'badge-variable' }
  }
  return { text: '固定', class: 'badge-fixed' }
}

// 变量名下拉选项
const variableOptions = computed(() => {
  const required = form.value.requiredVariables.split('\n').map(v => v.trim()).filter(Boolean)
  const optional = form.value.optionalVariables.split('\n').map(v => v.trim()).filter(Boolean)
  return [...required, ...optional]
})

// 变量来源提示表数据
const VARIABLE_SOURCE_TABLE = [
  { template: 'brand_share', varName: 'title', type: 'text', source: '站点名称 (siteConfig.siteName)', required: true },
  { template: 'brand_share', varName: 'values', type: 'text', source: '站点描述 (siteConfig.siteDescription)', required: true },
  { template: 'brand_share', varName: 'main_image', type: 'image', source: '站点分享图 (siteConfig.shareImage)', required: true },
  { template: 'brand_share', varName: 'logo', type: 'image', source: '站点 Logo (siteConfig.logo)', required: false },
  { template: 'course_share', varName: 'user_name', type: 'text', source: '用户昵称 → 海报默认用户名', required: true },
  { template: 'course_share', varName: 'user_avatar', type: 'image', source: '用户头像 → 海报默认用户头像', required: false },
  { template: 'course_share', varName: 'course_image', type: 'image', source: '课程封面 (course.coverUrl)', required: true },
  { template: 'course_share', varName: 'recommend_reason', type: 'text', source: '课程描述 → 海报默认推荐理由', required: false },
  { template: 'product_share', varName: 'user_name', type: 'text', source: '同 course_share', required: true },
  { template: 'product_share', varName: 'user_avatar', type: 'image', source: '同 course_share', required: false },
  { template: 'product_share', varName: 'product_image', type: 'image', source: '商品图片', required: true },
  { template: 'product_share', varName: 'product_name', type: 'text', source: '商品名称', required: true },
  { template: 'product_share', varName: 'product_price', type: 'text', source: '商品价格', required: true },
  { template: 'product_share', varName: 'recommend_reason', type: 'text', source: '商品描述 → 海报默认推荐理由', required: false },
]

const currentVariableTable = computed(() => {
  return VARIABLE_SOURCE_TABLE.filter(item => item.template === form.value.code)
})

// MediaPicker 回调
function onBgImageSelected(file) {
  form.value.backgroundImage = file.url
  showBgImagePicker.value = false
}

function clearBgImage() {
  form.value.backgroundImage = ''
}

function openElementImagePicker(target) {
  elementImageTarget.value = target
  showElementImagePicker.value = true
}

function onElementImageSelected(file) {
  if (elementImageTarget.value === 'content') {
    editingElement.value.content = file.url
  } else if (elementImageTarget.value === 'defaultValue') {
    editingElement.value.defaultValue = file.url
  }
  showElementImagePicker.value = false
}

function clearElementImage() {
  if (editingElement.value.isVariable) {
    editingElement.value.defaultValue = ''
  } else {
    editingElement.value.content = ''
  }
}

const bgModeIndex = computed(() => {
  const idx = bgModeEnums.indexOf(form.value.backgroundMode)
  return idx >= 0 ? idx : 0
})

function handleBgModeChange(e) {
  form.value.backgroundMode = bgModeEnums[e.detail.value]
}

// 元素管理
const elements = ref([])
const editingElement = ref(null)
const editingElementIndex = ref(-1)

const elementTypeLabels = {
  text: '文本',
  image: '图片',
  qrcode: '二维码',
  shape: '形状',
  background: '背景'
}

function getElementTypeLabel(type) {
  return elementTypeLabels[type] || type
}

const elementPickerConfigs = {
  elementType: { enums: ['text', 'image', 'qrcode', 'shape', 'background'], labels: ['文本', '图片', '二维码', '形状', '背景'] },
  fontWeight: { enums: ['normal', 'bold'], labels: ['normal', 'bold'] },
  textAlign: { enums: ['left', 'center', 'right'], labels: ['left', 'center', 'right'] },
  imageFit: { enums: ['cover', 'contain', 'stretch', 'tile'], labels: ['cover', 'contain', 'stretch', 'tile'] },
  qrContentMode: { enums: ['direct', 'url_with_invite'], labels: ['direct', 'url_with_invite'] },
  qrFallbackMode: { enums: ['base_url_only', 'default_value', 'hide_element'], labels: ['base_url_only', 'default_value', 'hide_element'] },
  qrErrorLevel: { enums: ['L', 'M', 'Q', 'H'], labels: ['L', 'M', 'Q', 'H'] },
  shapeType: { enums: ['rect', 'circle', 'line'], labels: ['rect', 'circle', 'line'] }
}

function elPickerIndex(field) {
  const config = elementPickerConfigs[field]
  if (!config || !editingElement.value) return 0
  const idx = config.enums.indexOf(editingElement.value[field])
  return idx >= 0 ? idx : 0
}

function handleElPickerChange(field, e) {
  const config = elementPickerConfigs[field]
  if (config && editingElement.value) {
    editingElement.value[field] = config.enums[e.detail.value]
  }
}

function createBlankElement() {
  return {
    elementType: 'text',
    elementKey: '',
    elementName: '',
    isVariable: false,
    variableName: '',
    defaultValue: '',
    content: '',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    zIndex: 0,
    rotation: 0,
    opacity: 1,
    fontSize: 14,
    fontColor: '#333333',
    fontWeight: 'normal',
    fontFamily: 'sans-serif',
    textAlign: 'left',
    lineHeight: 1.5,
    letterSpacing: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#000000',
    elementBgColor: '',
    imageFit: 'cover',
    qrContentMode: 'direct',
    qrBaseUrl: '',
    qrInviteParam: 'inviteCode',
    qrInviteSeparator: '?',
    qrFallbackMode: 'base_url_only',
    qrErrorLevel: 'M',
    qrSize: 120,
    qrColor: '#000000',
    qrBgColor: '#FFFFFF',
    shapeType: 'rect',
    sortOrder: 0
  }
}

function startAddElement() {
  editingElement.value = createBlankElement()
  editingElementIndex.value = -1
}

function startEditElement(idx) {
  editingElement.value = { ...elements.value[idx] }
  editingElementIndex.value = idx
}

function cancelEditElement() {
  editingElement.value = null
  editingElementIndex.value = -1
}

function saveElement() {
  if (!editingElement.value.elementKey) {
    uni.showToast({ title: '请填写元素 Key', icon: 'none' })
    return
  }
  if (editingElementIndex.value === -1) {
    elements.value.push({ ...editingElement.value })
  } else {
    elements.value[editingElementIndex.value] = { ...editingElement.value }
  }
  editingElement.value = null
  editingElementIndex.value = -1
  uni.showToast({ title: '元素已暂存', icon: 'none' })
}

function removeElement(idx) {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除该元素吗？',
    success: (res) => {
      if (res.confirm) {
        elements.value.splice(idx, 1)
        if (editingElementIndex.value === idx) {
          editingElement.value = null
          editingElementIndex.value = -1
        }
      }
    }
  })
}

async function handleBatchSaveElements() {
  if (!documentId.value) return
  try {
    await posterTemplateApi.batchSaveElements(documentId.value, elements.value)
    uni.showToast({ title: '元素保存成功', icon: 'success' })
    await loadElements()
  } catch (e) {
    uni.showToast({ title: '元素保存失败', icon: 'none' })
  }
}

async function loadElements() {
  if (!documentId.value) return
  try {
    const { list } = await posterElementApi.list({
      'filters[posterTemplate][documentId][$eq]': documentId.value,
      'pagination[pageSize]': 200
    })
    elements.value = list || []
  } catch {
    elements.value = []
  }
}

function goBack() {
  uni.navigateBack()
}

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await posterTemplateApi.detail(documentId.value)
    if (item) {
      form.value = {
        name: item.name || '',
        code: item.code || '',
        description: item.description || '',
        isActive: item.isActive !== false,
        isDefault: item.isDefault === true,
        canvasWidth: item.canvasWidth != null ? item.canvasWidth : 600,
        canvasHeight: item.canvasHeight != null ? item.canvasHeight : 1000,
        backgroundColor: item.backgroundColor || '#FFFFFF',
        backgroundImage: item.backgroundImage || '',
        backgroundMode: item.backgroundMode || 'cover',
        requiredVariables: Array.isArray(item.requiredVariables)
          ? item.requiredVariables.join('\n')
          : (item.requiredVariables || 'title\ndescription\nimage_url\nqr_code'),
        optionalVariables: Array.isArray(item.optionalVariables)
          ? item.optionalVariables.join('\n')
          : (item.optionalVariables || 'market_price\nsale_price\ninvite_code')
      }
    }
    // 加载元素：优先使用 detail 返回的 elements，否则单独查询
    if (item?.elements && Array.isArray(item.elements) && item.elements.length > 0) {
      elements.value = item.elements
    } else {
      await loadElements()
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function handleSubmit() {
  if (!form.value.name || !form.value.code) {
    uni.showToast({ title: '请填写名称和编码', icon: 'none' })
    return
  }
  const payload = {
    ...form.value,
    requiredVariables: form.value.requiredVariables
      .split('\n')
      .map(v => v.trim())
      .filter(Boolean),
    optionalVariables: form.value.optionalVariables
      .split('\n')
      .map(v => v.trim())
      .filter(Boolean)
  }
  try {
    if (isEdit.value) {
      await posterTemplateApi.update(documentId.value, payload)
      uni.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 600)
    } else {
      const created = await posterTemplateApi.create(payload)
      uni.showToast({ title: '创建成功', icon: 'success' })
      const newId = created?.documentId
      setTimeout(() => {
        if (newId) {
          uni.redirectTo({ url: `/pages/studio/poster-template/edit?documentId=${newId}` })
        } else {
          uni.navigateBack()
        }
      }, 600)
    }
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

onLoad((options) => {
  if (options?.documentId) {
    documentId.value = options.documentId
    loadDetail()
  }
})
</script>

<style scoped>
page {
  background: #f5f5f5;
}
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.form-scroll {
  flex: 1;
  padding: 20rpx;
  box-sizing: border-box;
}

.btn-primary {
  background: #ff0000;
  color: #ffffff;
  padding: 16rpx 32rpx;
  font-size: 30rpx;
  border-radius: 8rpx;
  border: none;
  line-height: 1.2;
  margin-left: 12rpx;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
  padding: 16rpx 32rpx;
  font-size: 30rpx;
  border-radius: 8rpx;
  border: none;
  line-height: 1.2;
}

.form-section {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
  padding-left: 8rpx;
  border-left: 6rpx solid #ff0000;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 16rpx 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-textarea-tall {
  min-height: 160rpx;
}

.form-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.form-switch-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.switch-text {
  font-size: 28rpx;
  color: #666;
}

.arrow {
  font-size: 20rpx;
  color: #999;
}

.form-row {
  display: flex;
  gap: 20rpx;
}

.form-item-half {
  flex: 1;
}

.form-item-third {
  flex: 1;
}

/* 元素管理 */
.element-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.element-row {
  display: flex;
  align-items: center;
  background: #f9f9f9;
  border-radius: 8rpx;
  padding: 16rpx 20rpx;
}

.element-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.element-type {
  font-size: 24rpx;
  color: #fff;
  background: #1989fa;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
}

.element-key {
  font-size: 26rpx;
  color: #333;
  font-weight: bold;
}

.element-name {
  font-size: 24rpx;
  color: #666;
}

.element-pos {
  font-size: 22rpx;
  color: #999;
}

.element-actions {
  display: flex;
  gap: 12rpx;
}

.action-btn {
  padding: 8rpx 20rpx;
  border-radius: 6rpx;
  font-size: 24rpx;
  text-align: center;
}

.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }

.empty-elements {
  display: flex;
  justify-content: center;
  padding: 40rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.element-toolbar {
  display: flex;
  gap: 20rpx;
  justify-content: center;
  padding: 12rpx 0;
}

.element-form {
  background: #f9f9f9;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-top: 20rpx;
  border: 1rpx solid #eee;
}

.element-form-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  padding-left: 8rpx;
  border-left: 6rpx solid #1989fa;
}

.element-form-actions {
  display: flex;
  gap: 20rpx;
  justify-content: flex-end;
  margin-top: 12rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #eee;
}

/* 元素类型徽章 */
.element-badge {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  margin-left: 8rpx;
}
.badge-variable {
  background: #e8f0fe;
  color: #1967d2;
}
.badge-fixed {
  background: #f0f0f0;
  color: #666;
}

/* 媒体选择器（与 tenant/detail.vue 一致） */
.media-select {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  border: 2rpx dashed #ccc;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.media-preview {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
}
.media-placeholder {
  font-size: 22rpx;
  color: #999;
}
.media-remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 36rpx;
  height: 36rpx;
  background: rgba(0,0,0,0.5);
  color: #fff;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 0 0 8rpx;
  z-index: 1;
}

/* 提示文字 */
.form-hint {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}
.form-hint-block {
  padding: 12rpx 16rpx;
  background: #f8f9fa;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
}
.form-hint-title {
  display: block;
  font-size: 24rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 6rpx;
}
.form-hint-text {
  display: block;
  font-size: 22rpx;
  color: #666;
  line-height: 1.5;
}

/* 变量来源提示表 */
.variable-source-table {
  margin: 20rpx 0;
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
  overflow: hidden;
}
.table-title {
  display: block;
  padding: 16rpx;
  background: #f5f5f5;
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
}
.table-header {
  display: flex;
  background: #fafafa;
  border-bottom: 1rpx solid #e0e0e0;
}
.table-row {
  display: flex;
  border-bottom: 1rpx solid #f0f0f0;
}
.table-header .th,
.table-row .td {
  flex: 1;
  padding: 12rpx 16rpx;
  font-size: 22rpx;
  color: #555;
}
.table-header .th {
  font-weight: bold;
  color: #333;
}
</style>
