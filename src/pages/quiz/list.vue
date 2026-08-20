<template>
  <view class="page-container">
    <PageHeader title="题库管理">
      <button class="btn-secondary" @click="goBatchUpload">批量导入</button>
        <button class="btn-secondary" @click="enterSelectMode">批量关联</button>
        <button class="btn-primary" @click="goAdd" v-if="hasPermission('quiz.create')">+ 新增题目</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input 
          type="text" 
          v-model="searchKeyword" 
          placeholder="搜索题目内容"
          @confirm="loadData"
          class="search-input"
        />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="typeOptions" @change="handleTypeChange">
          <view class="filter-item">
            <text>{{ typeOptions[typeIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <picker mode="selector" :range="difficultyOptions" @change="handleDifficultyChange">
          <view class="filter-item">
            <text>{{ difficultyOptions[difficultyIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
      <!-- 课程/课时筛选（作为批量关联的范围限定，同时保留列表查询） -->
      <view class="filter-row filter-row-2">
        <picker mode="selector" :range="filterCourseNames" @change="handleFilterCourseChange">
          <view class="filter-item">
            <text>{{ filterCourseNames[filterCourseIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <picker mode="selector" :range="filterLessonNames" @change="handleFilterLessonChange">
          <view class="filter-item">
            <text>{{ filterLessonNames[filterLessonIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
      <!-- 知识点筛选 -->
      <view class="filter-row filter-row-2">
        <view class="filter-item" @click="showKpFilterPicker = true">
          <text :class="{ 'placeholder': !filterKp }">{{ filterKp ? filterKp.name : '全部知识点' }}</text>
          <text class="arrow">▼</text>
        </view>
        <view class="filter-item filter-clear" @click="handleKpClear" v-if="filterKp">清除</view>
      </view>
    </view>

    <!-- 选择模式工具栏 -->
    <view class="select-toolbar" v-if="selectMode">
      <text class="select-count">已选 {{ selectedDocs.length }} 题</text>
      <view class="select-actions">
        <button class="btn-secondary" @click="openAssociatePanel">批量关联</button>
        <button class="btn-secondary" @click="cancelSelectMode">取消选择</button>
      </view>
    </view>

    <view class="question-list">
      <view 
        v-for="item in questionList" 
        :key="item.documentId" 
        class="question-card"
        :class="{ selecting: selectMode, selected: isSelected(item) }"
        @click="selectMode && toggleSelect(item)"
      >
        <view v-if="selectMode" class="select-checkbox" :class="{ checked: isSelected(item) }">
          <text v-if="isSelected(item)" class="check-mark">✓</text>
        </view>
        <view class="question-info">
          <view class="question-title">
            <view class="question-type" :style="{ background: getTypeColor(item.type) }">
              {{ getTypeText(item.type) }}
            </view>
            <text class="title-text">{{ item.title }}</text>
          </view>
          <view class="question-meta">
            <text class="meta-item">难度: {{ getDifficultyText(item.difficulty) }}</text>
            <text class="meta-item">分值: {{ item.points || 0 }}分</text>
            <text class="meta-item" :class="item.isPublished ? 'status-active' : 'status-draft'">
              {{ item.isPublished ? '已发布' : '草稿' }}
            </text>
          </view>
        </view>
        <view class="question-actions">
          <view class="action-btn edit" @click="goEdit(item.documentId)">编辑</view>
          <view class="action-btn delete" @click="handleDelete(item)" v-if="hasPermission('quiz.delete')">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-if="!loading && questionList.length === 0" class="empty-state">
      <text class="empty-icon">📝</text>
      <text class="empty-text">暂无题目</text>
      <button class="btn-primary" @click="goAdd" v-if="hasPermission('quiz.create')">立即添加</button>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>

    <view class="fab-btn" @click="goAdd" v-if="hasPermission('quiz.create')">
      <text class="fab-icon">+</text>
    </view>

    <!-- 批量关联面板 -->
    <view class="picker-modal" v-if="showAssociatePanel" @click="showAssociatePanel = false">
      <view class="picker-content" @click.stop>
        <view class="picker-header">
          <text class="picker-title">批量关联题目</text>
          <text class="picker-close" @click="showAssociatePanel = false">×</text>
        </view>

        <!-- Tab 切换 -->
        <view class="assoc-tabs">
          <view class="assoc-tab" :class="{ active: associateTab === 'set' }" @click="associateTab = 'set'">设置关联</view>
          <view class="assoc-tab" :class="{ active: associateTab === 'clear' }" @click="associateTab = 'clear'">清除关联</view>
        </view>

        <!-- 设置关联 -->
        <scroll-view v-if="associateTab === 'set'" scroll-y class="picker-scroll assoc-scroll">
          <view class="assoc-item">
            <text class="assoc-label">关联课程（留空不改）</text>
            <view class="picker-value" @click="panelShowCoursePicker = true">
              <text class="assoc-value" :class="{ empty: !panelCourse }">{{ panelCourse?.title || '请选择课程' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </view>
          <view class="assoc-item">
            <text class="assoc-label">关联课时（留空不改）</text>
            <view class="picker-value" @click="panelShowLessonPicker = true">
              <text class="assoc-value" :class="{ empty: !panelLesson }">{{ panelLesson?.title || '请选择课时' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </view>
          <view class="assoc-item">
            <text class="assoc-label">关联知识点（留空不改）</text>
            <view class="multi-select-container">
              <view v-if="selectedKp.length === 0" class="picker-value empty" @click="showTagPicker = true">
                <text>请选择知识点</text>
                <text class="picker-arrow">▼</text>
              </view>
              <view v-else class="selected-tags">
                <view v-for="kp in selectedKp" :key="kp.documentId" class="tag-item">
                  <text>{{ kp.name }}</text>
                  <text class="tag-close" @click="removeSelectedKp(kp)">×</text>
                </view>
                <view class="add-tag" @click="showTagPicker = true">+ 添加</view>
              </view>
            </view>
          </view>
          <view class="range-tip">未勾选题目时，将按当前筛选条件（搜索词/题型/难度/课程/课时/知识点）应用到全部符合条件的结果</view>
        </scroll-view>

        <!-- 清除关联 -->
        <scroll-view v-else scroll-y class="picker-scroll assoc-scroll">
          <view class="clear-item" @click="clearCourse = !clearCourse">
            <text>清除课程关联</text>
            <view class="switch-box" :class="{ checked: clearCourse }">
              <text v-if="clearCourse">✓</text>
            </view>
          </view>
          <view class="clear-item" @click="clearLesson = !clearLesson">
            <text>清除课时关联</text>
            <view class="switch-box" :class="{ checked: clearLesson }">
              <text v-if="clearLesson">✓</text>
            </view>
          </view>
          <view class="clear-item" @click="clearKp = !clearKp">
            <text>清除知识点关联</text>
            <view class="switch-box" :class="{ checked: clearKp }">
              <text v-if="clearKp">✓</text>
            </view>
          </view>
        </scroll-view>

        <view class="picker-footer">
          <button class="btn-primary assoc-confirm" @click="handleAssociate" :disabled="associating">
            {{ associating ? '处理中...' : '确认' }}
          </button>
        </view>
      </view>
    </view>

    <!-- 面板内课程选择 -->
    <view class="picker-modal" v-if="panelShowCoursePicker" @click="panelShowCoursePicker = false">
      <view class="picker-content" @click.stop>
        <view class="picker-header">
          <text class="picker-title">选择课程</text>
          <text class="picker-close" @click="panelShowCoursePicker = false">×</text>
        </view>
        <scroll-view scroll-y class="picker-scroll">
          <view v-for="c in assocCourseList" :key="c.documentId" class="picker-item"
            :class="{ selected: panelCourse?.documentId === c.documentId }" @click="selectPanelCourse(c)">
            <text>{{ c.title }}</text>
            <text v-if="panelCourse?.documentId === c.documentId" class="check-icon">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 面板内课时选择 -->
    <view class="picker-modal" v-if="panelShowLessonPicker" @click="panelShowLessonPicker = false">
      <view class="picker-content" @click.stop>
        <view class="picker-header">
          <text class="picker-title">选择课时</text>
          <text class="picker-close" @click="panelShowLessonPicker = false">×</text>
        </view>
        <scroll-view scroll-y class="picker-scroll">
          <view v-for="l in panelLessonList" :key="l.documentId" class="picker-item"
            :class="{ selected: panelLesson?.documentId === l.documentId }" @click="selectPanelLesson(l)">
            <text>{{ l.title }}</text>
            <text v-if="panelLesson?.documentId === l.documentId" class="check-icon">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 知识点选择器 -->
    <TagPicker v-model:visible="showTagPicker" mode="knowledge-point" :selected="selectedKp" @select="kps => selectedKp = kps" />
    <TagPicker v-model:visible="showKpFilterPicker" mode="knowledge-point" single-select :selected="filterKp ? [filterKp] : []" @select="handleKpFilter" />
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import TagPicker from '../../components/TagPicker.vue'
import { getQuestionList, deleteQuestion, batchAssociateQuestions } from '../../api/quiz.js'
import { getCourseList, getLessonList } from '../../api/course.js'
import { useUserStore } from '../../store/user.js'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const typeIndex = ref(0)
const difficultyIndex = ref(0)
const typeOptions = ['全部类型', '单选题', '多选题', '判断题', '填空题', '简答题', '配对题', '排序题']
const typeValues = ['', 'single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'matching', 'ordering']
const difficultyOptions = ['全部难度', '简单', '中等', '困难']
const difficultyValues = ['', 'easy', 'medium', 'hard']

const questionList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)

// 课程/课时列表筛选（同时作为批量关联范围限定）
const filterCourseList = ref([])
const filterLessonList = ref([])
const filterCourseIndex = ref(0)
const filterLessonIndex = ref(0)
const filterCourseNames = computed(() => ['全部课程', ...filterCourseList.value.map(c => c.title)])
const filterLessonNames = computed(() => ['全部课时', ...filterLessonList.value.map(l => l.title)])

// 知识点筛选
const filterKp = ref(null)
const showKpFilterPicker = ref(false)

// 批量关联选择模式
const selectMode = ref(false)
const selectedDocs = ref([])

// 批量关联面板
const showAssociatePanel = ref(false)
const associateTab = ref('set') // 'set' 设置关联 | 'clear' 清除关联
const assocCourseList = ref([])
const panelLessonList = ref([])
const panelCourse = ref(null)
const panelLesson = ref(null)
const selectedKp = ref([])
const panelShowCoursePicker = ref(false)
const panelShowLessonPicker = ref(false)
const showTagPicker = ref(false)
const clearCourse = ref(false)
const clearLesson = ref(false)
const clearKp = ref(false)
const associating = ref(false)

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

function getTypeText(type) {
  const map = {
    'single_choice': '单选',
    'multiple_choice': '多选',
    'true_false': '判断',
    'fill_blank': '填空',
    'short_answer': '简答',
    'matching': '配对',
    'ordering': '排序'
  }
  return map[type] || type
}

function getTypeColor(type) {
  const map = {
    'single_choice': '#667eea',
    'multiple_choice': '#764ba2',
    'true_false': '#07c160',
    'fill_blank': '#ff9500',
    'short_answer': '#ff4d4f',
    'matching': '#13c2c2',
    'ordering': '#eb2f96'
  }
  return map[type] || '#667eea'
}

function getDifficultyText(difficulty) {
  const map = {
    'easy': '简单',
    'medium': '中等',
    'hard': '困难'
  }
  return map[difficulty] || difficulty
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = {
      'pagination[page]': page,
      'pagination[pageSize]': 10
    }
    if (searchKeyword.value) {
      params['filters[title][$contains]'] = searchKeyword.value
    }
    if (typeValues[typeIndex.value]) {
      params['filters[type][$eq]'] = typeValues[typeIndex.value]
    }
    if (difficultyValues[difficultyIndex.value]) {
      params['filters[difficulty][$eq]'] = difficultyValues[difficultyIndex.value]
    }
    if (filterCourseIndex.value > 0) {
      params['filters[course][documentId][$eq]'] = filterCourseList.value[filterCourseIndex.value - 1].documentId
    }
    if (filterLessonIndex.value > 0) {
      params['filters[lesson][documentId][$eq]'] = filterLessonList.value[filterLessonIndex.value - 1].documentId
    }
    if (filterKp.value) {
      params['filters[tags][documentId][$eq]'] = filterKp.value.documentId
    }
    const { list, pagination: pg } = await getQuestionList(params)
    questionList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleTypeChange(e) {
  typeIndex.value = e.detail.value
  loadData(1)
}

function handleDifficultyChange(e) {
  difficultyIndex.value = e.detail.value
  loadData(1)
}

// 课程筛选联动课时
async function handleFilterCourseChange(e) {
  const idx = Number(e.detail.value)
  filterCourseIndex.value = idx
  filterLessonIndex.value = 0
  filterLessonList.value = []
  if (idx > 0) {
    try {
      const { list } = await getLessonList({ 'filters[course][documentId][$eq]': filterCourseList.value[idx - 1].documentId })
      filterLessonList.value = list
    } catch (e) {
      uni.showToast({ title: '加载失败', icon: 'none' })
    }
  }
  loadData(1)
}

function handleFilterLessonChange(e) {
  filterLessonIndex.value = Number(e.detail.value)
  loadData(1)
}

function handleKpFilter(kps) {
  if (kps && kps.length > 0) {
    filterKp.value = kps[0]
  }
  loadData(1)
}

function handleKpClear() {
  filterKp.value = null
  loadData(1)
}

// ---- 批量关联选择模式 ----
function isSelected(item) {
  return selectedDocs.value.includes(item.documentId)
}

function toggleSelect(item) {
  const idx = selectedDocs.value.indexOf(item.documentId)
  if (idx > -1) {
    selectedDocs.value.splice(idx, 1)
  } else {
    selectedDocs.value.push(item.documentId)
  }
}

function enterSelectMode() {
  selectedDocs.value = []
  selectMode.value = true
}

function cancelSelectMode() {
  selectMode.value = false
  selectedDocs.value = []
}

// ---- 批量关联面板 ----
function openAssociatePanel() {
  panelCourse.value = null
  panelLesson.value = null
  panelLessonList.value = []
  selectedKp.value = []
  clearCourse.value = false
  clearLesson.value = false
  clearKp.value = false
  associateTab.value = 'set'
  showAssociatePanel.value = true
}

function selectPanelCourse(c) {
  panelCourse.value = c
  panelShowCoursePicker.value = false
  panelLesson.value = null
  panelLessonList.value = []
  if (c) loadPanelLessons(c.documentId)
}

async function loadPanelLessons(courseId) {
  try {
    const { list } = await getLessonList({ 'filters[course][documentId][$eq]': courseId })
    panelLessonList.value = list
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function selectPanelLesson(l) {
  panelLesson.value = l
  panelShowLessonPicker.value = false
}

function removeSelectedKp(kp) {
  const i = selectedKp.value.findIndex(x => x.documentId === kp.documentId)
  if (i > -1) selectedKp.value.splice(i, 1)
}

// 组装批量关联的范围筛选（仅用页面顶部筛选限定范围，目标字段独立）
function buildRangeFilters() {
  const filters = {}
  if (searchKeyword.value) filters.keyword = searchKeyword.value
  if (typeValues[typeIndex.value]) filters.type = typeValues[typeIndex.value]
  if (difficultyValues[difficultyIndex.value]) filters.difficulty = difficultyValues[difficultyIndex.value]
  if (filterCourseIndex.value > 0) filters.course = filterCourseList.value[filterCourseIndex.value - 1].documentId
  if (filterLessonIndex.value > 0) filters.lesson = filterLessonList.value[filterLessonIndex.value - 1].documentId
  if (filterKp.value) filters.knowledgePoints = [filterKp.value.documentId]
  return filters
}

async function handleAssociate() {
  const filters = buildRangeFilters()
  const target = {}
  if (associateTab.value === 'set') {
    if (panelCourse.value) target.course = { action: 'set', value: panelCourse.value.documentId }
    if (panelLesson.value) target.lesson = { action: 'set', value: panelLesson.value.documentId }
    if (selectedKp.value.length > 0) target.knowledgePoints = { action: 'set', value: selectedKp.value.map(k => k.documentId) }
    if (Object.keys(target).length === 0) {
      uni.showToast({ title: '请至少选择一项要设置的内容', icon: 'none' })
      return
    }
  } else {
    if (clearCourse.value) target.course = { action: 'clear' }
    if (clearLesson.value) target.lesson = { action: 'clear' }
    if (clearKp.value) target.knowledgePoints = { action: 'clear' }
    if (Object.keys(target).length === 0) {
      uni.showToast({ title: '请至少勾选一项要清除的内容', icon: 'none' })
      return
    }
  }
  associating.value = true
  try {
    const res = await batchAssociateQuestions({
      documentIds: selectedDocs.value.length ? [...selectedDocs.value] : [],
      filters,
      target
    })
    const failed = Array.isArray(res?.errors) ? res.errors.length : (res?.errors ?? 0)
    uni.showToast({ title: `成功 ${res?.success ?? 0}，失败 ${failed}`, icon: 'none' })
    showAssociatePanel.value = false
    cancelSelectMode()
    loadData(1)
  } catch (e) {
    uni.showToast({ title: '批量关联失败', icon: 'none' })
  } finally {
    associating.value = false
  }
}

function goAdd() {
  uni.navigateTo({ url: '/pages/quiz/form' })
}

function goEdit(id) {
  uni.navigateTo({ url: `/pages/quiz/form?id=${id}` })
}

function goBatchUpload() {
  uni.navigateTo({ url: '/pages/quiz/batch-upload' })
}

async function handleDelete(item) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除该题目吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteQuestion(item.documentId)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadData(currentPage.value)
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

function prevPage() {
  if (currentPage.value > 1) {
    loadData(currentPage.value - 1)
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    loadData(currentPage.value + 1)
  }
}

onMounted(() => {
  loadData(1)
  // 加载课程列表，用于列表筛选与批量关联面板
  getCourseList({}).then(res => {
    filterCourseList.value = res.list || []
    assocCourseList.value = res.list || []
  }).catch(() => {})
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20rpx;
  box-sizing: border-box;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 15rpx 30rpx;
  border: none;
  border-radius: 40rpx;
  font-size: 28rpx;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
  padding: 15rpx 30rpx;
  border: none;
  border-radius: 40rpx;
  font-size: 28rpx;
}

.search-section {
  background: #fff;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.search-box {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 0 20rpx;
  margin-bottom: 20rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
}

.search-icon {
  font-size: 32rpx;
}

.filter-row {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.filter-item {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.filter-item .placeholder {
  color: #bbb;
}

.filter-item.filter-clear {
  flex: none;
  color: #e64340;
  margin-left: 16rpx;
}

.arrow {
  font-size: 20rpx;
  color: #999;
}

.filter-row-2 {
  margin-top: 20rpx;
}

/* 选择模式工具栏 */
.select-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.select-count {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.select-actions {
  display: flex;
  gap: 15rpx;
}

.select-actions .btn-secondary {
  padding: 12rpx 24rpx;
}

/* 卡片选择模式 */
.question-card.selecting {
  cursor: pointer;
}

.question-card.selected {
  border: 3rpx solid #667eea;
}

.select-checkbox {
  width: 44rpx;
  height: 44rpx;
  border: 3rpx solid #d9d9d9;
  border-radius: 8rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.select-checkbox.checked {
  background: #667eea;
  border-color: #667eea;
}

.check-mark {
  color: #fff;
  font-size: 28rpx;
  font-weight: bold;
}

/* 批量关联面板 */
.assoc-tabs {
  display: flex;
  border-bottom: 1rpx solid #eee;
}

.assoc-tab {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 30rpx;
  color: #666;
  position: relative;
}

.assoc-tab.active {
  color: #667eea;
  font-weight: bold;
}

.assoc-tab.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 60rpx;
  height: 6rpx;
  background: #667eea;
  border-radius: 3rpx;
}

.assoc-scroll {
  padding: 30rpx;
  box-sizing: border-box;
}

.assoc-item {
  margin-bottom: 30rpx;
}

.assoc-label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 15rpx;
}

.assoc-value {
  font-size: 28rpx;
}

.assoc-value.empty {
  color: #999;
}

.range-tip {
  font-size: 22rpx;
  color: #999;
  line-height: 1.5;
  background: #f5f7fa;
  border-radius: 8rpx;
  padding: 15rpx 20rpx;
}

.clear-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25rpx 10rpx;
  border-bottom: 1rpx solid #f0f0f0;
  font-size: 30rpx;
}

.switch-box {
  width: 44rpx;
  height: 44rpx;
  border: 3rpx solid #d9d9d9;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  color: #fff;
  font-size: 26rpx;
}

.switch-box.checked {
  background: #667eea;
  border-color: #667eea;
}

.assoc-confirm {
  width: 100%;
  height: 80rpx;
  border-radius: 40rpx;
}

.assoc-confirm[disabled] {
  opacity: 0.6;
}

/* 弹窗与选择器样式 */
.picker-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.picker-content {
  width: 100%;
  height: 65vh;
  max-height: 65vh;
  background: #fff;
  border-radius: 20rpx 20rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #eee;
}

.picker-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.picker-close {
  font-size: 48rpx;
  color: #999;
  padding: 0 20rpx;
}

.picker-scroll {
  flex: 1 1 auto;
  min-height: 0;
  max-height: 50vh;
}

.picker-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  font-size: 30rpx;
}

.picker-item.selected {
  background: #f5f7fa;
}

.check-icon {
  color: #667eea;
  font-weight: bold;
}

.picker-footer {
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #eee;
}

.picker-footer .btn-primary {
  width: 100%;
  border-radius: 40rpx;
}

.picker-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 80rpx;
  border: 1rpx solid #ddd;
  border-radius: 10rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.picker-value.empty {
  color: #999;
}

.picker-arrow {
  font-size: 20rpx;
  color: #999;
}

.multi-select-container {
  min-height: 80rpx;
  border: 1rpx solid #ddd;
  border-radius: 10rpx;
  padding: 10rpx;
  box-sizing: border-box;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 15rpx;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 20rpx;
  background: #e8f5e9;
  border-radius: 20rpx;
  font-size: 26rpx;
  color: #07c160;
}

.tag-close {
  font-size: 32rpx;
  color: #999;
}

.add-tag {
  padding: 10rpx 20rpx;
  border: 1rpx dashed #ddd;
  border-radius: 20rpx;
  font-size: 26rpx;
  color: #999;
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.question-card {
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  display: flex;
  padding: 20rpx;
  align-items: center;
}

.question-info {
  flex: 1;
  padding-right: 20rpx;
}

.question-title {
  display: flex;
  align-items: flex-start;
  gap: 15rpx;
  margin-bottom: 12rpx;
}

.question-type {
  color: #fff;
  padding: 6rpx 12rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
  flex-shrink: 0;
}

.title-text {
  flex: 1;
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
  line-height: 1.4;
}

.question-meta {
  display: flex;
  gap: 15rpx;
}

.meta-item {
  font-size: 24rpx;
  color: #999;
}

.status-active {
  color: #07c160;
}

.status-draft {
  color: #ff9500;
}

.question-actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.action-btn {
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  text-align: center;
}

.action-btn.edit {
  background: #f0f0f0;
  color: #1989fa;
}

.action-btn.delete {
  background: #fff0f0;
  color: #ff4d4f;
}

.loading, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 20rpx;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40rpx;
  padding: 40rpx 0;
}

.pagination-btn {
  padding: 16rpx 32rpx;
  background: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.pagination-btn.disabled {
  color: #999;
  background: #f5f5f5;
}

.pagination-info {
  font-size: 28rpx;
  color: #666;
}

.fab-btn {
  position: fixed;
  right: 40rpx;
  bottom: 120rpx;
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 999;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.2);
}

.fab-icon {
  font-size: 48rpx;
  line-height: 1;
}
</style>
