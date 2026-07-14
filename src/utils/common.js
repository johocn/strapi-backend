export function debounce(fn, delay = 300) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

export function throttle(fn, interval = 300) {
  let last = 0
  return function (...args) {
    const now = Date.now()
    if (now - last >= interval) {
      last = now
      fn.apply(this, args)
    }
  }
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export function pick(obj, keys) {
  const result = {}
  keys.forEach(key => {
    if (obj.hasOwnProperty(key)) result[key] = obj[key]
  })
  return result
}

export function omit(obj, keys) {
  const result = { ...obj }
  keys.forEach(key => delete result[key])
  return result
}

export function buildQueryString(params) {
  const parts = []
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    }
  }
  return parts.length ? '?' + parts.join('&') : ''
}