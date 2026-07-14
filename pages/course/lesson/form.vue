<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑课时' : '新增课时'">
      <button class="btn-primary" @click="handleSubmit">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">基本信息</view>

        <view class="form-item">
          <text class="form-label">课时名称 *</text>
          <input
            type="text"
            v-model="form.title"
            placeholder="请输入课时名称"
            class="form-input"
          />
        </view>

        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">所属课程 *</text>
            <picker mode="selector" :range="courseOptions" @change="handleCourseChange">
              <view class="picker-value">
                <text>{{ courseOptions[courseIndex] || '请选择课程' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item half">
            <text class="form-label">课时类型 *</text>
            <picker mode="selector" :range="typeOptions" @change="handleTypeChange">
              <view class="picker-value">
                <text>{{ typeOptions[typeIndex] }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">课时概述</text>
          <textarea
            v-model="form.summary"
            placeholder="请输入课时概述"
            class="form-textarea"
          />
        </view>

        <view class="form-item">
          <text class="form-label">课时内容</text>
          <textarea
            v-model="form.content"
            placeholder="请输入课时内容"
            class="form-textarea"
          />
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">媒体资源</view>

        <view class="form-item">
          <text class="form-label">缩略图</text>
          <view class="upload-area" @click="showThumbnailPicker = true">
            <image
              v-if="form.thumbnailUrl"
              :src="form.thumbnailUrl"
              mode="aspectFill"
              class="upload-preview"
            />
            <view v-else class="upload-placeholder">
              <text class="upload-icon">📷</text>
              <text class="upload-text">点击选择缩略图</text>
            </view>
          </view>
        </view>

        <view v-if="form.type === 'video'" class="form-item">
          <text class="form-label">视频</text>
          <view class="media-url-row">
            <input
              type="text"
              v-model="form.video_url"
              placeholder="视频URL"
              class="form-input media-url-input"
            />
            <button class="btn-pick" @click="showVideoPicker = true">选择</button>
          </view>
          <video
            v-if="form.video_url"
            :src="form.video_url"
            class="media-preview-video"
            controls
          />
        </view>

        <view v-if="form.type === 'audio'" class="form-item">
          <text class="form-label">音频</text>
          <view class="media-url-row">
            <input
              type="text"
              v-model="form.audio_url"
              placeholder="音频URL"
              class="form-input media-url-input"
            />
            <button class="btn-pick" @click="showAudioPicker = true">选择</button>
          </view>
          <video
            v-if="form.audio_url"
            :src="form.audio_url"
            class="media-preview-audio"
            controls
            poster=""
            object-fit="contain"
          />
        </view>

        <view class="form-item">
          <text class="form-label">图片集</text>
          <view class="multi-media-grid">
            <view v-for="(img, idx) in imageList" :key="idx" class="multi-media-item">
              <image :src="img.url" mode="aspectFill" class="multi-media-thumb" />
              <text class="multi-media-remove" @click="removeImage(idx)">×</text>
            </view>
            <view class="multi-media-add" @click="showImagesPicker = true">
              <text class="add-icon">+</text>
              <text class="add-text">添加图片</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">附件</text>
          <view class="attachment-list">
            <view v-for="(att, idx) in attachmentList" :key="idx" class="attachment-item">
              <text class="attachment-icon">{{ getAttachmentIcon(att.mime) }}</text>
              <text class="attachment-name">{{ att.name }}</text>
              <text class="attachment-remove" @click="removeAttachment(idx)">×</text>
            </view>
            <view class="attachment-add" @click="showAttachmentsPicker = true">
              <text>+ 添加附件</text>
            </view>
          </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">学习设置</view>

        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">时长（秒）</text>
            <input
              type="number"
              v-model="form.duration"
              placeholder="0"
              class="form-input"
              :disabled="form.type === 'video' || form.type === 'audio'"
            />
          </view>
          <view class="form-item half">
            <text class="form-label">序号</text>
            <input
              type="number"
              v-model="form.sequenceNumber"
              placeholder="0"
              class="form-input"
            />
          </view>
        </view>

        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">免费预览</text>
            <switch :checked="form.isFreePreview" @change="form.isFreePreview = !form.isFreePreview" />
          </view>
          <view class="form-item half">
            <text class="form-label">必修课时</text>
            <switch :checked="form.isRequired" @change="form.isRequired = !form.isRequired" />
          </view>
        </view>

        <view v-if="form.isFreePreview" class="form-item">
          <text class="form-label">预览时长（秒）</text>
          <input
            type="number"
            v-model="form.previewDuration"
            placeholder="0"
            class="form-input"
          />
        </view>

        <view class="form-item">
          <text class="form-label">完成阈值（%）</text>
          <input
            type="number"
            v-model="form.completionThreshold"
            placeholder="100"
            class="form-input"
          />
        </view>

        <view class="form-item">
          <text class="form-label">学习目标</text>
          <textarea
            v-model="form.learningObjectives"
            placeholder="请输入学习目标"
            class="form-textarea"
          />
        </view>

        <view class="form-item">
          <text class="form-label">前置条件</text>
          <textarea
            v-model="form.prerequisites"
            placeholder="请输入前置条件"
            class="form-textarea"
          />
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">标签管理</view>

        <view class="form-item">
          <text class="form-label">课时标签</text>
          <view class="tag-list">
            <view
              v-for="tag in selectedTags"
              :key="tag.documentId"
              class="tag-item"
            >
              <text>{{ tag.name }}</text>
              <text class="tag-remove" @click="removeTag(tag)">×</text>
            </view>
            <view class="tag-add" @click="showTagPicker = true">
              <text>+ 添加标签</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="showPointsSection" class="form-section">
        <view class="section-title">积分设置</view>

        <view class="form-item">
          <text class="form-label">启用积分</text>
          <switch :checked="form.enablePoints" @change="form.enablePoints = !form.enablePoints" />
        </view>

        <view v-if="form.enablePoints" class="form-row">
          <view class="form-item half">
            <text class="form-label">积分值</text>
            <input
              type="number"
              v-model="form.points"
              placeholder="0"
              class="form-input"
            />
          </view>
          <view class="form-item half">
            <text class="form-label">积分类型</text>
            <picker mode="selector" :range="pointsTypeOptions" @change="handlePointsTypeChange">
              <view class="picker-value">
                <text>{{ pointsTypeOptions[pointsTypeIndex] }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
        </view>

        <view v-if="form.enablePoints" class="form-item">
          <text class="form-label">排序</text>
          <input
            type="number"
            v-model="form.sort"
            placeholder="0"
            class="form-input"
          />
        </view>
      </view>
    </scroll-view>

    <view class="bottom-bar">
      <button class="btn-save" @click="handleSubmit">保存</button>
    </view>

    <TagPicker
      v-model:visible="showTagPicker"
      :selected="selectedTags"
      @select="onTagSelect"
    />

    <MediaPicker
      v-model:visible="showThumbnailPicker"
      :folder="'/course/images'"
      :accept="'image/*'"
      @select="onThumbnailSelect"
    />
    <MediaPicker
      v-model:visible="showVideoPicker"
      :folder="'/course/videos'"
      :accept="'video/*'"
      @select="onVideoSelect"
    />
    <MediaPicker
      v-model:visible="showAudioPicker"
      :folder="'/course/audios'"
      :accept="'audio/*'"
      @select="onAudioSelect"
    />
    <MediaPicker
      v-model:visible="showImagesPicker"
      :folder="'/course/images'"
      :accept="'image/*'"
      :multiple="true"
      @select="onImageSelect"
    />
    <MediaPicker
      v-model:visible="showAttachmentsPicker"
      :folder="'/course/attachments'"
      :accept="'*'"
      :multiple="true"
      @select="onAttachmentSelect"
    />
  </view>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { getLessonDetail, createLesson, updateLesson, getCourseList, getCourseTagList, getLessonList } from '../../../src/api/course.js'
import MediaPicker from '../../../src/components/MediaPicker.vue'
import TagPicker from '../../../src/components/TagPicker.vue'
import PageHeader from '../../../src/components/PageHeader.vue'
import { isFeatureEnabled, loadSiteConfig, clearConfigCache } from '../../../src/utils/config-helper.js'
import { useUserStore } from '../../../src/store/user.js'

const showPointsSection = computed(() => isFeatureEnabled('pointsEnabled'))

const userStore = useUserStore()

watch(() => userStore.currentTenantId, async () => {
  clearConfigCache()
  await loadSiteConfig()
})

const isEdit = ref(false)
const lessonId = ref('')
const showTagPicker = ref(false)

const showThumbnailPicker = ref(false)
const showVideoPicker = ref(false)
const showAudioPicker = ref(false)
const showImagesPicker = ref(false)
const showAttachmentsPicker = ref(false)

const thumbnailId = ref(null)
const imageIdList = ref([])
const attachmentIdList = ref([])

const imageList = ref([])
const attachmentList = ref([])

const form = reactive({
  title: '',
  summary: '',
  content: '',
  type: 'video',
  thumbnailUrl: '',
  video_url: '',
  audio_url: '',
  duration: 0,
  sequenceNumber: 0,
  isFreePreview: false,
  previewDuration: 0,
  completionThreshold: 100,
  isRequired: true,
  learningObjectives: '',
  prerequisites: '',
  course: null,
  tags: [],
  sort: 0,
  enablePoints: false,
  points: 0,
  pointsType: 'lesson_points'
})

const courseOptions = ['请选择课程']
const courseMap = {}
const courseIndex = ref(0)

const typeOptions = ['video', 'audio', 'article', 'quiz']
const typeIndex = ref(0)

const tagList = ref([])
const selectedTags = ref([])

const pointsTypeOptions = ['lesson_points', 'quiz_points']
const pointsTypeIndex = ref(0)

async function loadCourses() {
  try {
    const { list } = await getCourseList()
    list.forEach(course => {
      courseOptions.push(course.title)
      courseMap[course.title] = course
    })
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function onTagSelect(tags) {
  selectedTags.value = tags
}

function removeTag(tag) {
  const index = selectedTags.value.findIndex(t => t.documentId === tag.documentId)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  }
}

function handleCourseChange(e) {
  const index = e.detail.value
  courseIndex.value = index
  if (index === 0) {
    form.course = null
  } else {
    form.course = courseMap[courseOptions[index]]
    loadLessonCount(form.course.documentId)
  }
}

async function loadLessonCount(courseDocumentId) {
  if (!courseDocumentId) return
  try {
    const result = await getLessonList({
      'filters[course][documentId][$eq]': courseDocumentId,
      'pagination[pageSize]': 1,
    })
	
	console.log("result: " + JSON.stringify(result));
	console.log(result.pagination?.total);
	form.sequenceNumber = result.pagination?.total || 0

  } catch (e) {
    // ignore
  }
}

function handleTypeChange(e) {
  typeIndex.value = e.detail.value
  form.type = typeOptions[e.detail.value]
}

function handlePointsTypeChange(e) {
  pointsTypeIndex.value = e.detail.value
  form.pointsType = pointsTypeOptions[e.detail.value]
}

function onThumbnailSelect(media) {
  thumbnailId.value = media.id
  form.thumbnailUrl = media.url
}

function onVideoSelect(media) {
  form.video_url = media.url
  fetchMediaDuration(media.url)
}

function onAudioSelect(media) {
  form.audio_url = media.url
  fetchMediaDuration(media.url)
}

function fetchMediaDuration(url) {
  if (!url) return
  const el = document.createElement(form.type === 'video' ? 'video' : 'audio')
  el.preload = 'metadata'
  el.onloadedmetadata = () => {
    if (el.duration && isFinite(el.duration)) {
      form.duration = Math.round(el.duration)
    }
    el.src = ''
  }
  el.onerror = () => {
    el.src = ''
  }
  el.src = url
}

function onImageSelect(media) {
  imageList.value.push({ id: media.id, url: media.url, name: media.name })
  imageIdList.value.push(media.id)
}

function removeImage(idx) {
  imageList.value.splice(idx, 1)
  imageIdList.value.splice(idx, 1)
}

function onAttachmentSelect(media) {
  attachmentList.value.push({ id: media.id, url: media.url, name: media.name, mime: media.mime })
  attachmentIdList.value.push(media.id)
}

function removeAttachment(idx) {
  attachmentList.value.splice(idx, 1)
  attachmentIdList.value.splice(idx, 1)
}

function getAttachmentIcon(mime) {
  if (mime?.startsWith('video/')) return '🎬'
  if (mime?.startsWith('audio/')) return '🎵'
  if (mime?.startsWith('image/')) return '🖼️'
  return '📄'
}

async function loadLessonDetail() {
  if (!lessonId.value) return
  try {
    const data = await getLessonDetail(lessonId.value)
    // 逐字段赋值，避免 Object.assign 覆盖 form 中不存在的字段
    const fields = ['title', 'summary', 'content', 'type', 'video_url', 'audio_url',
      'duration', 'sequenceNumber', 'isFreePreview', 'previewDuration', 'completionThreshold',
      'isRequired', 'learningObjectives', 'prerequisites', 'sort', 'enablePoints', 'points', 'pointsType']
    for (const key of fields) {
      if (data[key] !== undefined) form[key] = data[key]
    }
    if (data.thumbnailUrl) form.thumbnailUrl = data.thumbnailUrl
    if (data.course) {
      const idx = courseOptions.indexOf(data.course.title)
      if (idx > -1) {
        courseIndex.value = idx
        form.course = data.course
        // 编辑时：如果 sort 未设置，自动填入当前课程下课时数量
        if (!data.sequenceNumber) {
          loadLessonCount(data.course.documentId)
        }
      }
    }
    if (data.tags) {
      selectedTags.value = data.tags
    }
    typeIndex.value = typeOptions.indexOf(data.type) || 0
    pointsTypeIndex.value = pointsTypeOptions.indexOf(data.pointsType) || 0
    if (data.thumbnail) {
      thumbnailId.value = data.thumbnail.id
      if (!form.thumbnailUrl && data.thumbnail.url) form.thumbnailUrl = data.thumbnailUrl
    }
    if (data.images && data.images.length > 0) {
      imageList.value = data.images.map(img => ({
        id: img.id,
        url: img.thumbnailUrl || img.url || getMediaUrlFromItem(img),
        name: img.name
      }))
      imageIdList.value = data.images.map(img => img.id)
    }
    if (data.attachments && data.attachments.length > 0) {
      attachmentList.value = data.attachments.map(a => ({
        id: a.id,
        url: a.url || getMediaUrlFromItem(a),
        name: a.name,
        mime: a.mime
      }))
      attachmentIdList.value = data.attachments.map(a => a.id)
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function getMediaUrlFromItem(item) {
  if (!item) return ''
  const meta = item.provider_metadata
  if (meta?.ossUrl && meta.ossStatus === 'success') return meta.ossUrl
  if (item.url?.startsWith('http')) return item.url
  return ''
}

async function handleSubmit() {
  if (!form.title) {
    uni.showToast({ title: '请输入课时名称', icon: 'none' })
    return
  }
  if (!form.course) {
    uni.showToast({ title: '请选择所属课程', icon: 'none' })
    return
  }

  const submitData = {
    title: form.title,
    summary: form.summary,
    content: form.content,
    type: form.type,
    duration: parseInt(form.duration) || 0,
    sequenceNumber: parseInt(form.sequenceNumber) || 0,
    isFreePreview: form.isFreePreview,
    previewDuration: parseInt(form.previewDuration) || 0,
    completionThreshold: parseInt(form.completionThreshold) || 100,
    isRequired: form.isRequired,
    learningObjectives: form.learningObjectives,
    prerequisites: form.prerequisites,
    course: { documentId: form.course.documentId },
    sort: parseInt(form.sort) || 0,
    enablePoints: form.enablePoints,
    points: parseInt(form.points) || 0,
    pointsType: form.pointsType,
    thumbnail: thumbnailId.value || null,
    video_url: form.video_url || null,
    audio_url: form.audio_url || null,
    images: imageIdList.value.length > 0 ? imageIdList.value : null,
    attachments: attachmentIdList.value.length > 0 ? attachmentIdList.value : null,
  }

  submitData.tags = selectedTags.value.map(t => ({ documentId: t.documentId }))

  try {
    uni.showLoading({ title: '保存中...' })
    if (isEdit.value) {
      await updateLesson(lessonId.value, submitData)
      uni.hideLoading()
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await createLesson(submitData)
      uni.hideLoading()
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

onMounted(async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.$page?.options || currentPage.options || {}

  if (options.id) {
    isEdit.value = true
    lessonId.value = options.id
  }

  await loadSiteConfig()
  await loadCourses()
  await loadLessonDetail()
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.btn-primary {
  background: #1989fa;
  color: #fff;
  border: none;
  padding: 16rpx 32rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.form-scroll {
  height: calc(100vh - 88rpx - 120rpx);
  padding: 20rpx 20rpx 60rpx 20rpx; /* 底部多留 120rpx 不被遮挡 */
    box-sizing: border-box;
}

.form-section {
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.form-item {
  margin-bottom: 20rpx;
}

.form-item.half {
  flex: 1;
}

.form-row {
  display: flex;
  gap: 20rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  height: 150rpx;
  padding: 20rpx;
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.upload-area {
  width: 100%;
  height: 200rpx;
  border: 2rpx dashed #ddd;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.upload-preview {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.upload-icon {
  font-size: 48rpx;
}

.upload-text {
  font-size: 26rpx;
  color: #999;
}

.media-url-row {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.media-url-input {
  flex: 1;
}

.btn-pick {
  background: #667eea;
  color: #fff;
  border: none;
  padding: 0 24rpx;
  height: 80rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
  white-space: nowrap;
}

.media-preview-video {
  width: 100%;
  height: 400rpx;
  margin-top: 16rpx;
  border-radius: 8rpx;
}

.media-preview-audio {
  width: 100%;
  margin-top: 16rpx;
}

.multi-media-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.multi-media-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
}

.multi-media-thumb {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
}

.multi-media-remove {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 36rpx;
  height: 36rpx;
  background: #ff4d4f;
  color: #fff;
  border-radius: 50%;
  text-align: center;
  line-height: 36rpx;
  font-size: 24rpx;
}

.multi-media-add {
  width: 160rpx;
  height: 160rpx;
  border: 2rpx dashed #ddd;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.add-icon {
  font-size: 48rpx;
  color: #ccc;
}

.add-text {
  font-size: 22rpx;
  color: #999;
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
}

.attachment-icon {
  font-size: 32rpx;
}

.attachment-name {
  flex: 1;
  font-size: 26rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-remove {
  font-size: 32rpx;
  color: #ff4d4f;
  padding: 0 8rpx;
}

.attachment-add {
  padding: 16rpx 20rpx;
  border: 1rpx dashed #ddd;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #999;
  text-align: center;
}

.picker-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20rpx;
  height: 80rpx;
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.picker-arrow {
  font-size: 20rpx;
  color: #999;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background: #e3f2fd;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #1989fa;
}

.tag-remove {
  font-size: 28rpx;
  color: #999;
}

.tag-add {
  padding: 8rpx 16rpx;
  border: 1rpx dashed #ddd;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #999;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 32rpx;
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
  z-index: 10;
}

.btn-save {
  width: 100%;
  height: 88rpx;
  background: #1989fa;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: 500;
}
</style>
