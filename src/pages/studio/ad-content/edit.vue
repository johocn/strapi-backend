<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑广告内容' : '新增广告内容'">
      <button class="btn-secondary" @click="goBack">取消</button>
      <button class="btn-primary" @click="handleSubmit">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <!-- 基本信息 -->
      <view class="form-section">
        <view class="section-title">基本信息</view>

        <view class="form-item">
          <text class="form-label">名称 *</text>
          <input type="text" v-model="form.name" placeholder="请输入广告内容名称" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">内容类型</text>
          <picker mode="selector" :range="pickerConfigs.contentType.labelOptions" :value="pickerIndex('contentType')" @change="handlePickerChange('contentType', $event)">
            <view class="form-picker">
              <text>{{ pickerConfigs.contentType.labelOptions[pickerIndex('contentType')] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">是否启用</text>
          <view class="form-switch-row">
            <switch :checked="form.isActive" @change="form.isActive = $event.detail.value" />
            <text class="switch-text">{{ form.isActive ? '启用' : '停用' }}</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">排序</text>
          <input type="number" v-model="form.sortOrder" placeholder="0" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">优先级</text>
          <input type="number" v-model="form.priority" placeholder="0" class="form-input" />
        </view>
      </view>

      <!-- 定时投放 -->
      <view class="form-section">
        <view class="section-title">定时投放</view>

        <view class="form-item">
          <text class="form-label">开始时间</text>
          <input type="text" v-model="form.startAt" placeholder="YYYY-MM-DD HH:mm:ss" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">结束时间</text>
          <input type="text" v-model="form.endAt" placeholder="YYYY-MM-DD HH:mm:ss" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">频次限制</text>
          <input type="number" v-model="form.frequencyLimit" placeholder="0" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">频次周期</text>
          <picker mode="selector" :range="pickerConfigs.frequencyPeriod.labelOptions" :value="pickerIndex('frequencyPeriod')" @change="handlePickerChange('frequencyPeriod', $event)">
            <view class="form-picker">
              <text>{{ pickerConfigs.frequencyPeriod.labelOptions[pickerIndex('frequencyPeriod')] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 标题样式 -->
      <view class="form-section">
        <view class="section-title">标题样式</view>

        <view class="form-item">
          <text class="form-label">标题</text>
          <input type="text" v-model="form.title" placeholder="请输入标题" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">标题颜色</text>
          <input type="text" v-model="form.titleColor" placeholder="#333333" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">标题字号</text>
          <input type="number" v-model="form.titleFontSize" placeholder="16" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">标题粗细</text>
          <picker mode="selector" :range="pickerConfigs.titleFontWeight.labelOptions" :value="pickerIndex('titleFontWeight')" @change="handlePickerChange('titleFontWeight', $event)">
            <view class="form-picker">
              <text>{{ pickerConfigs.titleFontWeight.labelOptions[pickerIndex('titleFontWeight')] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">标题对齐</text>
          <picker mode="selector" :range="pickerConfigs.titleAlign.labelOptions" :value="pickerIndex('titleAlign')" @change="handlePickerChange('titleAlign', $event)">
            <view class="form-picker">
              <text>{{ pickerConfigs.titleAlign.labelOptions[pickerIndex('titleAlign')] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">标题溢出处理</text>
          <picker mode="selector" :range="pickerConfigs.titleOverflow.labelOptions" :value="pickerIndex('titleOverflow')" @change="handlePickerChange('titleOverflow', $event)">
            <view class="form-picker">
              <text>{{ pickerConfigs.titleOverflow.labelOptions[pickerIndex('titleOverflow')] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">标题最大行数</text>
          <input type="number" v-model="form.titleMaxLines" placeholder="2" class="form-input" />
        </view>
      </view>

      <!-- 副标题 -->
      <view class="form-section">
        <view class="section-title">副标题</view>

        <view class="form-item">
          <text class="form-label">副标题</text>
          <input type="text" v-model="form.subtitle" placeholder="请输入副标题" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">副标题颜色</text>
          <input type="text" v-model="form.subtitleColor" placeholder="#666666" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">副标题字号</text>
          <input type="number" v-model="form.subtitleFontSize" placeholder="14" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">副标题溢出处理</text>
          <picker mode="selector" :range="pickerConfigs.subtitleOverflow.labelOptions" :value="pickerIndex('subtitleOverflow')" @change="handlePickerChange('subtitleOverflow', $event)">
            <view class="form-picker">
              <text>{{ pickerConfigs.subtitleOverflow.labelOptions[pickerIndex('subtitleOverflow')] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">副标题最大行数</text>
          <input type="number" v-model="form.subtitleMaxLines" placeholder="1" class="form-input" />
        </view>
      </view>

      <!-- CTA按钮 -->
      <view class="form-section">
        <view class="section-title">CTA按钮</view>

        <view class="form-item">
          <text class="form-label">按钮文字</text>
          <input type="text" v-model="form.ctaText" placeholder="请输入按钮文字" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">文字颜色</text>
          <input type="text" v-model="form.ctaTextColor" placeholder="#FFFFFF" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">背景颜色</text>
          <input type="text" v-model="form.ctaBgColor" placeholder="#FF4444" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">字号</text>
          <input type="number" v-model="form.ctaFontSize" placeholder="14" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">圆角</text>
          <input type="number" v-model="form.ctaBorderRadius" placeholder="4" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">位置</text>
          <picker mode="selector" :range="pickerConfigs.ctaPosition.labelOptions" :value="pickerIndex('ctaPosition')" @change="handlePickerChange('ctaPosition', $event)">
            <view class="form-picker">
              <text>{{ pickerConfigs.ctaPosition.labelOptions[pickerIndex('ctaPosition')] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 角标 -->
      <view class="form-section">
        <view class="section-title">角标</view>

        <view class="form-item">
          <text class="form-label">角标文字</text>
          <input type="text" v-model="form.badgeText" placeholder="请输入角标文字" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">角标背景色</text>
          <input type="text" v-model="form.badgeBgColor" placeholder="#FF4444" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">角标文字色</text>
          <input type="text" v-model="form.badgeTextColor" placeholder="#FFFFFF" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">角标位置</text>
          <picker mode="selector" :range="pickerConfigs.badgePosition.labelOptions" :value="pickerIndex('badgePosition')" @change="handlePickerChange('badgePosition', $event)">
            <view class="form-picker">
              <text>{{ pickerConfigs.badgePosition.labelOptions[pickerIndex('badgePosition')] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 素材内容 -->
      <view class="form-section">
        <view class="section-title">素材内容</view>

        <view class="form-item">
          <text class="form-label">图片列表（每行一个 URL）</text>
          <textarea v-model="imagesText" placeholder="https://example.com/image1.png&#10;https://example.com/image2.png" class="form-textarea" />
        </view>

        <view class="form-item">
          <text class="form-label">视频 URL</text>
          <input type="text" v-model="form.videoUrl" placeholder="请输入视频 URL" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">视频封面</text>
          <input type="text" v-model="form.videoPoster" placeholder="请输入视频封面 URL" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">自动播放</text>
          <view class="form-switch-row">
            <switch :checked="form.videoAutoplay" @change="form.videoAutoplay = $event.detail.value" />
            <text class="switch-text">{{ form.videoAutoplay ? '是' : '否' }}</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">静音</text>
          <view class="form-switch-row">
            <switch :checked="form.videoMuted" @change="form.videoMuted = $event.detail.value" />
            <text class="switch-text">{{ form.videoMuted ? '是' : '否' }}</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">循环播放</text>
          <view class="form-switch-row">
            <switch :checked="form.videoLoop" @change="form.videoLoop = $event.detail.value" />
            <text class="switch-text">{{ form.videoLoop ? '是' : '否' }}</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">显示控制条</text>
          <view class="form-switch-row">
            <switch :checked="form.videoControls" @change="form.videoControls = $event.detail.value" />
            <text class="switch-text">{{ form.videoControls ? '是' : '否' }}</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">HTML 内容</text>
          <textarea v-model="form.htmlContent" placeholder="请输入自定义 HTML 内容" class="form-textarea" />
        </view>
      </view>

      <!-- 链接配置 -->
      <view class="form-section">
        <view class="section-title">链接配置</view>

        <view class="form-item">
          <text class="form-label">链接类型</text>
          <picker mode="selector" :range="pickerConfigs.linkType.labelOptions" :value="pickerIndex('linkType')" @change="handlePickerChange('linkType', $event)">
            <view class="form-picker">
              <text>{{ pickerConfigs.linkType.labelOptions[pickerIndex('linkType')] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">链接 URL</text>
          <input type="text" v-model="form.linkUrl" placeholder="请输入链接 URL" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">打开方式</text>
          <picker mode="selector" :range="pickerConfigs.linkTarget.labelOptions" :value="pickerIndex('linkTarget')" @change="handlePickerChange('linkTarget', $event)">
            <view class="form-picker">
              <text>{{ pickerConfigs.linkTarget.labelOptions[pickerIndex('linkTarget')] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 展示样式 -->
      <view class="form-section">
        <view class="section-title">展示样式</view>

        <view class="form-item">
          <text class="form-label">展示样式</text>
          <picker mode="selector" :range="pickerConfigs.displayStyle.labelOptions" :value="pickerIndex('displayStyle')" @change="handlePickerChange('displayStyle', $event)">
            <view class="form-picker">
              <text>{{ pickerConfigs.displayStyle.labelOptions[pickerIndex('displayStyle')] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">宽度</text>
          <input type="number" v-model="form.width" placeholder="0" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">高度</text>
          <input type="number" v-model="form.height" placeholder="0" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">圆角</text>
          <input type="number" v-model="form.borderRadius" placeholder="0" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">背景颜色</text>
          <input type="text" v-model="form.backgroundColor" placeholder="#FFFFFF" class="form-input" />
        </view>
      </view>

      <!-- 轮播设置 -->
      <view class="form-section" v-if="form.contentType === 'slideshow'">
        <view class="section-title">轮播设置</view>

        <view class="form-item">
          <text class="form-label">自动播放</text>
          <view class="form-switch-row">
            <switch :checked="form.slideshowAutoplay" @change="form.slideshowAutoplay = $event.detail.value" />
            <text class="switch-text">{{ form.slideshowAutoplay ? '是' : '否' }}</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">轮播间隔(ms)</text>
          <input type="number" v-model="form.slideshowInterval" placeholder="3000" class="form-input" />
        </view>

        <view class="form-item">
          <text class="form-label">切换效果</text>
          <picker mode="selector" :range="pickerConfigs.slideshowEffect.labelOptions" :value="pickerIndex('slideshowEffect')" @change="handlePickerChange('slideshowEffect', $event)">
            <view class="form-picker">
              <text>{{ pickerConfigs.slideshowEffect.labelOptions[pickerIndex('slideshowEffect')] }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">循环播放</text>
          <view class="form-switch-row">
            <switch :checked="form.slideshowLoop" @change="form.slideshowLoop = $event.detail.value" />
            <text class="switch-text">{{ form.slideshowLoop ? '是' : '否' }}</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">显示指示点</text>
          <view class="form-switch-row">
            <switch :checked="form.slideshowShowDots" @change="form.slideshowShowDots = $event.detail.value" />
            <text class="switch-text">{{ form.slideshowShowDots ? '是' : '否' }}</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">显示箭头</text>
          <view class="form-switch-row">
            <switch :checked="form.slideshowShowArrows" @change="form.slideshowShowArrows = $event.detail.value" />
            <text class="switch-text">{{ form.slideshowShowArrows ? '是' : '否' }}</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">悬停暂停</text>
          <view class="form-switch-row">
            <switch :checked="form.slideshowPauseOnHover" @change="form.slideshowPauseOnHover = $event.detail.value" />
            <text class="switch-text">{{ form.slideshowPauseOnHover ? '是' : '否' }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { adContentApi } from '../../../api/studio.js'
import PageHeader from '../../../components/PageHeader.vue'

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)

const pickerConfigs = {
  contentType: {
    enumList: ['single-image', 'multi-image', 'slideshow', 'video', 'html'],
    labelOptions: ['单图', '多图', '幻灯片', '视频', 'HTML']
  },
  frequencyPeriod: {
    enumList: ['session', 'daily', 'weekly'],
    labelOptions: ['会话', '每日', '每周']
  },
  titleFontWeight: {
    enumList: ['normal', 'bold'],
    labelOptions: ['正常', '粗体']
  },
  titleAlign: {
    enumList: ['left', 'center', 'right'],
    labelOptions: ['左对齐', '居中', '右对齐']
  },
  titleOverflow: {
    enumList: ['clip', 'ellipsis', 'wrap', 'scale'],
    labelOptions: ['裁剪', '省略', '换行', '缩放']
  },
  subtitleOverflow: {
    enumList: ['clip', 'ellipsis', 'wrap', 'scale'],
    labelOptions: ['裁剪', '省略', '换行', '缩放']
  },
  ctaPosition: {
    enumList: ['top', 'bottom', 'overlay', 'inline'],
    labelOptions: ['顶部', '底部', '覆盖', '内嵌']
  },
  badgePosition: {
    enumList: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    labelOptions: ['左上', '右上', '左下', '右下']
  },
  linkType: {
    enumList: ['none', 'internal', 'external'],
    labelOptions: ['无', '内部', '外部']
  },
  linkTarget: {
    enumList: ['_self', '_blank'],
    labelOptions: ['当前窗口', '新窗口']
  },
  displayStyle: {
    enumList: ['banner', 'card', 'modal', 'inline', 'float', 'fullscreen'],
    labelOptions: ['横幅', '卡片', '弹窗', '内嵌', '悬浮', '全屏']
  },
  slideshowEffect: {
    enumList: ['fade', 'slide', 'none'],
    labelOptions: ['淡入淡出', '滑动', '无']
  }
}

function pickerIndex(field) {
  const config = pickerConfigs[field]
  if (!config) return 0
  const idx = config.enumList.indexOf(form.value[field])
  return idx >= 0 ? idx : 0
}

function handlePickerChange(field, e) {
  const config = pickerConfigs[field]
  if (config) {
    form.value[field] = config.enumList[e.detail.value]
  }
}

const form = ref({
  name: '',
  contentType: 'single-image',
  isActive: true,
  sortOrder: 0,
  priority: 0,
  startAt: '',
  endAt: '',
  frequencyLimit: 0,
  frequencyPeriod: 'session',
  title: '',
  titleColor: '#333333',
  titleFontSize: 16,
  titleFontWeight: 'normal',
  titleAlign: 'left',
  titleOverflow: 'ellipsis',
  titleMaxLines: 2,
  subtitle: '',
  subtitleColor: '#666666',
  subtitleFontSize: 14,
  subtitleOverflow: 'ellipsis',
  subtitleMaxLines: 1,
  ctaText: '',
  ctaTextColor: '#FFFFFF',
  ctaBgColor: '#FF4444',
  ctaFontSize: 14,
  ctaBorderRadius: 4,
  ctaPosition: 'bottom',
  badgeText: '',
  badgeBgColor: '#FF4444',
  badgeTextColor: '#FFFFFF',
  badgePosition: 'top-right',
  images: [],
  videoUrl: '',
  videoPoster: '',
  videoAutoplay: false,
  videoMuted: true,
  videoLoop: false,
  videoControls: true,
  htmlContent: '',
  linkType: 'none',
  linkUrl: '',
  linkTarget: '_self',
  displayStyle: 'banner',
  width: 0,
  height: 0,
  borderRadius: 0,
  backgroundColor: '#FFFFFF',
  slideshowAutoplay: true,
  slideshowInterval: 3000,
  slideshowEffect: 'fade',
  slideshowLoop: true,
  slideshowShowDots: true,
  slideshowShowArrows: false,
  slideshowPauseOnHover: true
})

const imagesText = ref('')

function goBack() {
  uni.navigateBack()
}

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await adContentApi.detail(documentId.value)
    if (item) {
      form.value = {
        name: item.name || '',
        contentType: item.contentType || 'single-image',
        isActive: item.isActive !== false,
        sortOrder: item.sortOrder != null ? item.sortOrder : 0,
        priority: item.priority != null ? item.priority : 0,
        startAt: item.startAt || '',
        endAt: item.endAt || '',
        frequencyLimit: item.frequencyLimit != null ? item.frequencyLimit : 0,
        frequencyPeriod: item.frequencyPeriod || 'session',
        title: item.title || '',
        titleColor: item.titleColor || '#333333',
        titleFontSize: item.titleFontSize != null ? item.titleFontSize : 16,
        titleFontWeight: item.titleFontWeight || 'normal',
        titleAlign: item.titleAlign || 'left',
        titleOverflow: item.titleOverflow || 'ellipsis',
        titleMaxLines: item.titleMaxLines != null ? item.titleMaxLines : 2,
        subtitle: item.subtitle || '',
        subtitleColor: item.subtitleColor || '#666666',
        subtitleFontSize: item.subtitleFontSize != null ? item.subtitleFontSize : 14,
        subtitleOverflow: item.subtitleOverflow || 'ellipsis',
        subtitleMaxLines: item.subtitleMaxLines != null ? item.subtitleMaxLines : 1,
        ctaText: item.ctaText || '',
        ctaTextColor: item.ctaTextColor || '#FFFFFF',
        ctaBgColor: item.ctaBgColor || '#FF4444',
        ctaFontSize: item.ctaFontSize != null ? item.ctaFontSize : 14,
        ctaBorderRadius: item.ctaBorderRadius != null ? item.ctaBorderRadius : 4,
        ctaPosition: item.ctaPosition || 'bottom',
        badgeText: item.badgeText || '',
        badgeBgColor: item.badgeBgColor || '#FF4444',
        badgeTextColor: item.badgeTextColor || '#FFFFFF',
        badgePosition: item.badgePosition || 'top-right',
        images: Array.isArray(item.images) ? item.images : [],
        videoUrl: item.videoUrl || '',
        videoPoster: item.videoPoster || '',
        videoAutoplay: item.videoAutoplay || false,
        videoMuted: item.videoMuted !== false,
        videoLoop: item.videoLoop || false,
        videoControls: item.videoControls !== false,
        htmlContent: item.htmlContent || '',
        linkType: item.linkType || 'none',
        linkUrl: item.linkUrl || '',
        linkTarget: item.linkTarget || '_self',
        displayStyle: item.displayStyle || 'banner',
        width: item.width != null ? item.width : 0,
        height: item.height != null ? item.height : 0,
        borderRadius: item.borderRadius != null ? item.borderRadius : 0,
        backgroundColor: item.backgroundColor || '#FFFFFF',
        slideshowAutoplay: item.slideshowAutoplay !== false,
        slideshowInterval: item.slideshowInterval != null ? item.slideshowInterval : 3000,
        slideshowEffect: item.slideshowEffect || 'fade',
        slideshowLoop: item.slideshowLoop !== false,
        slideshowShowDots: item.slideshowShowDots !== false,
        slideshowShowArrows: item.slideshowShowArrows || false,
        slideshowPauseOnHover: item.slideshowPauseOnHover !== false
      }
      imagesText.value = form.value.images.join('\n')
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function handleSubmit() {
  if (!form.value.name) {
    uni.showToast({ title: '请填写名称', icon: 'none' })
    return
  }
  const payload = { ...form.value }
  // Convert images from textarea lines to JSON array
  payload.images = imagesText.value.split('\n').map(s => s.trim()).filter(s => s)
  // Convert number fields
  const numFields = [
    'sortOrder', 'priority', 'frequencyLimit',
    'titleFontSize', 'titleMaxLines',
    'subtitleFontSize', 'subtitleMaxLines',
    'ctaFontSize', 'ctaBorderRadius',
    'width', 'height', 'borderRadius',
    'slideshowInterval'
  ]
  numFields.forEach(f => {
    payload[f] = Number(payload[f]) || 0
  })
  try {
    if (isEdit.value) {
      await adContentApi.update(documentId.value, payload)
    } else {
      await adContentApi.create(payload)
    }
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
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
  height: 200rpx;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
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
</style>
