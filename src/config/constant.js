export const STATUS_MAP = {
  active: { text: '启用', color: '#07c160' },
  inactive: { text: '禁用', color: '#ff4d4f' },
  draft: { text: '草稿', color: '#faad14' },
  published: { text: '已发布', color: '#07c160' },
  archived: { text: '已归档', color: '#999999' },
  pending: { text: '待处理', color: '#faad14' },
  completed: { text: '已完成', color: '#07c160' },
  available: { text: '可用', color: '#07c160' },
  used: { text: '已使用', color: '#999999' },
  expired: { text: '已过期', color: '#ff4d4f' }
}

export const QUESTION_TYPE_MAP = {
  'single-choice': '单选题',
  'multiple-choice': '多选题',
  'true-false': '判断题',
  'fill-blank': '填空题',
  'essay': '问答题'
}

export const DIFFICULTY_MAP = {
  easy: { text: '简单', color: '#07c160' },
  medium: { text: '中等', color: '#faad14' },
  hard: { text: '困难', color: '#ff4d4f' },
  beginner: { text: '初级', color: '#07c160' },
  intermediate: { text: '中级', color: '#faad14' },
  advanced: { text: '高级', color: '#ff4d4f' }
}

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
export const DEFAULT_PAGE_SIZE = 25