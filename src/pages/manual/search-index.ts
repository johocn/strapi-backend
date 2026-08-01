/**
 * 使用手册全文搜索索引
 * - 支持 .md 和 .html 文件
 * - 客户端子串匹配
 * - 按段落匹配搜索（同一文档多个匹配段落独立返回）
 * - 评分排序
 * - 关键词高亮（<mark>）
 */

export interface SearchEntry {
  doc: string           // 相对路径，如 admin/02-add-tenant.md
  title: string         // 文档标题
  content: string       // 纯文本内容（剥离标记语法/标签）
  headings: string[]    // 所有标题文本
}

export interface SearchResult {
  doc: string
  title: string
  snippet: string       // 摘要（匹配段落）
  score: number
}

let cachedIndex: SearchEntry[] | null = null

/**
 * 构建搜索索引（module 级缓存）
 * 同时支持 .md 和 .html 文件
 */
export function buildIndex(docs: Record<string, string>): SearchEntry[] {
  if (cachedIndex) return cachedIndex
  cachedIndex = Object.entries(docs).map(([path, raw]) => {
    const doc = path.replace(/^.*docs\/manual\//, '')
    const isHtml = path.endsWith('.html')

    if (isHtml) {
      // HTML 文件处理
      const title = (
        raw.match(/<title>([^<]*)<\/title>/) ||
        raw.match(/<h1[^>]*>([^<]*)<\/h1>/)
      )?.[1]?.trim() || ''

      const content = raw
        .replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z]+;/g, ' ')
        .replace(/&amp;/g, ' ')
        .replace(/\s+/g, '\n')
        .trim()

      const headings = [...raw.matchAll(/<h[1-6][^>]*>([^<]*)<\/h[1-6]>/g)]
        .map(m => m[1].trim())

      return { doc, title, content, headings }
    }

    // Markdown 文件处理（现有逻辑）
    const lines = raw.split('\n')
    const title = (lines.find(l => l.startsWith('#')) || '').replace(/^#+\s*/, '')
    const content = raw
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]+`/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
      .replace(/[#>*_\-|`]/g, ' ')
      .replace(/\s+/g, '\n')
      .trim()
    const headings = lines
      .filter(l => /^#{1,6}\s/.test(l))
      .map(l => l.replace(/^#+\s*/, ''))
    return { doc, title, content, headings }
  })
  return cachedIndex
}

/**
 * 搜索
 * 按段落匹配，同一文档中多个匹配段落独立返回
 */
export function search(query: string, index: SearchEntry[]): SearchResult[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  const results: SearchResult[] = []

  for (const entry of index) {
    const titleMatch = entry.title.toLowerCase().includes(q)
    const headingMatch = entry.headings.some(h => h.toLowerCase().includes(q))

    // 标题/章节名匹配：优先返回
    if (titleMatch) {
      results.push({
        doc: entry.doc,
        title: entry.title,
        snippet: entry.title,
        score: 100
      })
    } else if (headingMatch) {
      const matchedHeading = entry.headings.find(h => h.toLowerCase().includes(q)) || ''
      results.push({
        doc: entry.doc,
        title: entry.title,
        snippet: matchedHeading,
        score: 50
      })
    }

    // 正文按段落匹配：每个匹配段落独立返回
    const paragraphs = entry.content.split(/\n+/)
    for (const para of paragraphs) {
      const trimmed = para.trim()
      if (!trimmed || trimmed.length < 3) continue
      const lower = trimmed.toLowerCase()
      const idx = lower.indexOf(q)
      if (idx >= 0) {
        // 段落截取作为 snippet
        const snippet = trimmed.slice(
          Math.max(0, idx - 40),
          idx + q.length + 60
        )
        results.push({
          doc: entry.doc,
          title: entry.title,
          snippet,
          score: 10
        })
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 100)
}

/**
 * 关键词高亮（返回 HTML 字符串，需用 v-html 渲染）
 */
export function highlight(text: string, query: string): string {
  if (!query) return escapeHtml(text)
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(escaped, 'gi')
  return escapeHtml(text).replace(re, '<mark>$&</mark>')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}