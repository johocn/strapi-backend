import request, { get, del, post, put } from '../utils/request.js'
import { extractList, extractItem, getMediaUrl } from '../utils/format.js'

const ADMIN_PREFIX = '/zhao-course/v1/admin'
const PUBLIC_PREFIX = '/zhao-course/v1'
const USER_PREFIX = '/zhao-course/v1/my'

// ==================== 管理类接口 ====================

export function getCourseList(params = {}) {
  return get(`${ADMIN_PREFIX}/courses`, params).then(res => {
    const result = extractList(res)
    result.list = result.list.map(course => {
      if (course.cover) course.coverUrl = getMediaUrl(course.cover)
      if (course.thumbnail) course.thumbnailUrl = getMediaUrl(course.thumbnail)
      if (course.category) course.category = extractItem(course.category)
      return course
    })
    return result
  })
}

export function getCourseDetail(documentId) {
  return get(`${ADMIN_PREFIX}/courses/${documentId}`).then(res => {
    const item = extractItem(res)
    if (item) {
      if (item.cover) item.coverUrl = getMediaUrl(item.cover)
      if (item.thumbnail) item.thumbnailUrl = getMediaUrl(item.thumbnail)
      if (item.category) item.category = extractItem(item.category)
      if (item.tags) item.tags = extractList({ data: item.tags }).list
      if (item.lessons) {
        item.lessons = item.lessons.map(lesson => {
          const l = extractItem(lesson)
          if (l.thumbnail) l.thumbnailUrl = getMediaUrl(l.thumbnail)
          if (l.video_url) l.videoUrl = getMediaUrl(l.video_url)
          if (l.audio_url) l.audioUrl = getMediaUrl(l.audio_url)
          return l
        })
      }
      // 确保渠道字段存在
      if (item.channelScope === undefined) item.channelScope = 'all'
      if (!Array.isArray(item.channelIds)) item.channelIds = []
      if (item.allowCrossChannel === undefined) item.allowCrossChannel = true
      if (item.pointChannel && typeof item.pointChannel === 'object') {
        item.pointChannel = item.pointChannel.id ?? item.pointChannel.documentId
      }
    }
    return item
  })
}

export function createCourse(data) {
  return post(`${ADMIN_PREFIX}/courses`, { data }).then(extractItem)
}

export function updateCourse(documentId, data) {
  return put(`${ADMIN_PREFIX}/courses/${documentId}`, { data }).then(extractItem)
}

export function deleteCourse(documentId) {
  return del(`${ADMIN_PREFIX}/courses/${documentId}`).then(extractItem)
}

export function publishCourse(documentId) {
  return post(`${ADMIN_PREFIX}/courses/${documentId}/publish`).then(extractItem)
}

export function unpublishCourse(documentId) {
  return post(`${ADMIN_PREFIX}/courses/${documentId}/unpublish`).then(extractItem)
}

// 课时管理
export function getLessonList(params = {}) {
  return get(`${ADMIN_PREFIX}/lessons`, params).then(res => {
    const result = extractList(res)
    result.list = result.list.map(lesson => {
      if (lesson.thumbnail) lesson.thumbnailUrl = getMediaUrl(lesson.thumbnail)
      if (lesson.video_url) lesson.videoUrl = getMediaUrl(lesson.video_url)
      if (lesson.audio_url) lesson.audioUrl = getMediaUrl(lesson.audio_url)
      if (lesson.images) lesson.imageUrls = lesson.images.map(img => getMediaUrl(img))
      if (lesson.attachments) lesson.attachmentUrls = lesson.attachments.map(a => ({ url: getMediaUrl(a), name: a.name, mime: a.mime }))
      if (lesson.course) lesson.course = extractItem(lesson.course)
      return lesson
    })
    return result
  })
}

export function getLessonDetail(documentId) {
  return get(`${ADMIN_PREFIX}/lessons/${documentId}`).then(res => {
    const item = extractItem(res)
    if (item) {
      if (item.thumbnail) item.thumbnailUrl = getMediaUrl(item.thumbnail)
      if (item.video_url) item.videoUrl = getMediaUrl(item.video_url)
      if (item.audio_url) item.audioUrl = getMediaUrl(item.audio_url)
      if (item.images) item.imageUrls = item.images.map(img => getMediaUrl(img))
      if (item.attachments) item.attachmentUrls = item.attachments.map(a => ({ url: getMediaUrl(a), name: a.name, mime: a.mime }))
      if (item.course) item.course = extractItem(item.course)
      if (item.tags) item.tags = extractList({ data: item.tags }).list
    }
    return item
  })
}

export function createLesson(data) {
  return post(`${ADMIN_PREFIX}/lessons`, { data }).then(extractItem)
}

export function updateLesson(documentId, data) {
  return put(`${ADMIN_PREFIX}/lessons/${documentId}`, { data }).then(extractItem)
}

export function deleteLesson(documentId) {
  return del(`${ADMIN_PREFIX}/lessons/${documentId}`).then(extractItem)
}

// 课程分类管理
export function getCourseCategoryList(params = {}) {
  return get(`${ADMIN_PREFIX}/course-categories`, params).then(extractList)
}

export function getCourseCategoryDetail(documentId) {
  return get(`${ADMIN_PREFIX}/course-categories/${documentId}`).then(extractItem)
}

export function createCourseCategory(data) {
  return post(`${ADMIN_PREFIX}/course-categories`, { data }).then(extractItem)
}

export function updateCourseCategory(documentId, data) {
  return put(`${ADMIN_PREFIX}/course-categories/${documentId}`, { data }).then(extractItem)
}

export function deleteCourseCategory(documentId) {
  return del(`${ADMIN_PREFIX}/course-categories/${documentId}`).then(extractItem)
}

// 课程标签管理（已迁移到 zhao-tag，请使用 tag.js 中的接口）
// 以下函数保留兼容，实际调用 zhao-tag
const TAG_ADMIN = '/zhao-tag/v1/admin'

export function getCourseTagList(params = {}) {
  return get(`${TAG_ADMIN}/tags`, params).then(extractList)
}

export function getCourseTagDetail(documentId) {
  return get(`${TAG_ADMIN}/tags/${documentId}`).then(extractItem)
}

export function createCourseTag(data) {
  return post(`${TAG_ADMIN}/tags`, { data }).then(extractItem)
}

export function updateCourseTag(documentId, data) {
  return put(`${TAG_ADMIN}/tags/${documentId}`, { data }).then(extractItem)
}

export function deleteCourseTag(documentId) {
  return del(`${TAG_ADMIN}/tags/${documentId}`).then(extractItem)
}

// 用户课程授权管理
export function getUserCourseList(params = {}) {
  return get(`${ADMIN_PREFIX}/user-courses`, params).then(extractList)
}

export function getUserCourseDetail(documentId) {
  return get(`${ADMIN_PREFIX}/user-courses/${documentId}`).then(extractItem)
}

export function grantUserCourse(data) {
  return post(`${ADMIN_PREFIX}/user-courses`, data).then(extractItem)
}

export function revokeUserCourse(documentId) {
  return del(`${ADMIN_PREFIX}/user-courses/${documentId}`).then(extractItem)
}

// 课程进度管理
export function getCourseProgressList(params = {}) {
  return get(`${ADMIN_PREFIX}/course-progresses`, params).then(extractList)
}

export function getCourseProgressDetail(documentId) {
  return get(`${ADMIN_PREFIX}/course-progresses/${documentId}`).then(extractItem)
}

export function updateCourseProgress(documentId, data) {
  return put(`${ADMIN_PREFIX}/course-progresses/${documentId}`, { data }).then(extractItem)
}

// 渠道配置巡检：列出 pointChannel/channelIds 异常的课程
export function getChannelConfigInvalid() {
  return get(`${ADMIN_PREFIX}/courses/channel-config-invalid`).then(res => res?.data || [])
}

// 课时进度管理
export function getLessonProgressList(params = {}) {
  return get(`${ADMIN_PREFIX}/lesson-progresses`, params).then(extractList)
}

export function getLessonProgressDetail(documentId) {
  return get(`${ADMIN_PREFIX}/lesson-progresses/${documentId}`).then(extractItem)
}

export function updateLessonProgress(documentId, data) {
  return put(`${ADMIN_PREFIX}/lesson-progresses/${documentId}`, { data }).then(extractItem)
}

// ==================== 公开接口 (C端) ====================

export function getPublicCourseList(params = {}) {
  return get(`${PUBLIC_PREFIX}/courses`, params).then(res => {
    const result = extractList(res)
    result.list = result.list.map(course => {
      if (course.cover) course.coverUrl = getMediaUrl(course.cover)
      if (course.thumbnail) course.thumbnailUrl = getMediaUrl(course.thumbnail)
      if (course.category) course.category = extractItem(course.category)
      return course
    })
    return result
  })
}

export function getPublicCourseDetail(documentId) {
  return get(`${PUBLIC_PREFIX}/courses/${documentId}`).then(res => {
    const item = extractItem(res)
    if (item) {
      if (item.cover) item.coverUrl = getMediaUrl(item.cover)
      if (item.thumbnail) item.thumbnailUrl = getMediaUrl(item.thumbnail)
      if (item.category) item.category = extractItem(item.category)
      if (item.tags) item.tags = extractList({ data: item.tags }).list
      if (item.lessons) {
        item.lessons = item.lessons.map(lesson => {
          const l = extractItem(lesson)
          if (l.thumbnail) l.thumbnailUrl = getMediaUrl(l.thumbnail)
          if (l.video_url) l.videoUrl = getMediaUrl(l.video_url)
          if (l.audio_url) l.audioUrl = getMediaUrl(l.audio_url)
          return l
        })
      }
    }
    return item
  })
}

export function getPublicCategoryList(params = {}) {
  return get(`${PUBLIC_PREFIX}/course-categories`, params).then(extractList)
}

// ==================== 用户接口 ====================

export function getMyCourses(params = {}) {
  return get(`${USER_PREFIX}/courses`, params).then(res => {
    const result = extractList(res)
    result.list = result.list.map(course => {
      if (course.cover) course.coverUrl = getMediaUrl(course.cover)
      return course
    })
    return result
  })
}

export function getMyCourseProgresses(params = {}) {
  return get(`${USER_PREFIX}/course-progresses`, params).then(res => {
    const result = extractList(res)
    result.list = result.list.map(progress => {
      if (progress.course) {
        progress.course = extractItem(progress.course)
        if (progress.course.cover) progress.course.coverUrl = getMediaUrl(progress.course.cover)
      }
      return progress
    })
    return result
  })
}

export function reportLessonProgress(data) {
  return post(`${USER_PREFIX}/lesson-progress`, data).then(extractItem)
}

export function submitLessonAnswer(id, data) {
  return post(`${USER_PREFIX}/lesson-answer/${id}`, data).then(extractItem)
}

export function claimLessonPoints(id) {
  return post(`${USER_PREFIX}/claim-lesson-points/${id}`).then(extractItem)
}

export function claimCoursePoints(id) {
  return post(`${USER_PREFIX}/claim-course-points/${id}`).then(extractItem)
}

export function checkCourseAuth(courseDocumentId) {
  return get(`${USER_PREFIX}/course-auth/${courseDocumentId}`).then(extractItem)
}

// ==================== 报名管理（管理员） ====================

/**
 * 查询报名记录列表
 * @param {Object} params - 可选筛选：status, courseDocumentId, enrollType, pagination
 */
export function getEnrollmentList(params = {}) {
  return get(`${ADMIN_PREFIX}/enrollments`, params).then(res => {
    const result = extractList(res)
    // 拆分嵌套对象
    result.list = result.list.map(item => {
      if (item.user && typeof item.user === 'object') item.user = extractItem(item.user)
      if (item.course && typeof item.course === 'object') {
        item.course = extractItem(item.course)
        if (item.course?.cover) item.course.coverUrl = getMediaUrl(item.course.cover)
      }
      if (item.reviewer && typeof item.reviewer === 'object') item.reviewer = extractItem(item.reviewer)
      if (item.voucherUrl && !item.voucherUrl.startsWith('http')) {
        item.voucherUrl = getMediaUrl({ url: item.voucherUrl })
      }
      return item
    })
    return result
  })
}

export function getEnrollmentDetail(documentId) {
  return get(`${ADMIN_PREFIX}/enrollments/${documentId}`).then(res => {
    const item = extractItem(res)
    if (item) {
      if (item.user && typeof item.user === 'object') item.user = extractItem(item.user)
      if (item.course && typeof item.course === 'object') {
        item.course = extractItem(item.course)
        if (item.course?.cover) item.course.coverUrl = getMediaUrl(item.course.cover)
      }
      if (item.reviewer && typeof item.reviewer === 'object') item.reviewer = extractItem(item.reviewer)
      if (item.voucherUrl && !item.voucherUrl.startsWith('http')) {
        item.voucherUrl = getMediaUrl({ url: item.voucherUrl })
      }
    }
    return item
  })
}

/** 审核通过 */
export function approveEnrollment(documentId) {
  return put(`${ADMIN_PREFIX}/enrollments/${documentId}/approve`).then(extractItem)
}

/** 审核驳回，需传 reviewNote */
export function rejectEnrollment(documentId, reviewNote = '') {
  return put(`${ADMIN_PREFIX}/enrollments/${documentId}/reject`, { data: { reviewNote } }).then(extractItem)
}

/** 撤销已开通权限 */
export function revokeEnrollment(documentId, reviewNote = '') {
  return put(`${ADMIN_PREFIX}/enrollments/${documentId}/revoke`, { data: { reviewNote } }).then(extractItem)
}

// ==================== 开通码管理（管理员） ====================

/**
 * 查询开通码列表
 * @param {Object} params - 可选筛选：code, status, course, pagination
 */
export function getAccessCodeList(params = {}) {
  return get(`${ADMIN_PREFIX}/access-codes`, params).then(res => {
    const result = extractList(res)
    result.list = result.list.map(item => {
      if (item.course && typeof item.course === 'object') item.course = extractItem(item.course)
      if (item.createdBy && typeof item.createdBy === 'object') item.createdBy = extractItem(item.createdBy)
      if (item.usedBy && typeof item.usedBy === 'object') item.usedBy = extractItem(item.usedBy)
      return item
    })
    return result
  })
}

export function getAccessCodeDetail(documentId) {
  return get(`${ADMIN_PREFIX}/access-codes/${documentId}`).then(res => {
    const item = extractItem(res)
    if (item) {
      if (item.course && typeof item.course === 'object') item.course = extractItem(item.course)
      if (item.createdBy && typeof item.createdBy === 'object') item.createdBy = extractItem(item.createdBy)
      if (item.usedBy && typeof item.usedBy === 'object') item.usedBy = extractItem(item.usedBy)
    }
    return item
  })
}

/**
 * 批量生成开通码
 * @param {Object} data - { courseDocumentId, count, totalQuota?, expireAt?, batchNote? }
 */
export function batchGenerateAccessCodes(data) {
  return post(`${ADMIN_PREFIX}/access-codes/batch`, { data }).then(extractItem)
}

/** 禁用开通码 */
export function disableAccessCode(documentId) {
  return put(`${ADMIN_PREFIX}/access-codes/${documentId}/disable`).then(extractItem)
}

/** 删除开通码 */
export function deleteAccessCode(documentId) {
  return del(`${ADMIN_PREFIX}/access-codes/${documentId}`).then(extractItem)
}
