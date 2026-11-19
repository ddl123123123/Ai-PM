const versionPattern = /^v[1-9]\d*(?:\.\d+)*$/i
const timePattern = /^(\d{2,}):([0-5]\d)$/
const reviewStatuses = new Set(['待确认', '待修改', '已处理'])

export function parseReview(input) {
  const issues = []
  const rows = []
  const seen = new Map()
  const duplicateLines = new Set()

  input.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return
    const fields = line.split('|').map(value => value.trim())
    const [version, time, status, ...parts] = fields
    const comment = parts.join(' | ')
    const row = { line: index + 1, version, time, status, comment }

    if (!versionPattern.test(version) || !timePattern.test(time) || !reviewStatuses.has(status) || !comment) {
      issues.push({ line: row.line, reason: '缺少有效版本、时间点、状态或意见' })
      return
    }

    row.version = version.toLowerCase()
    const key = JSON.stringify([row.version, time, comment])
    const first = seen.get(key)
    if (first) duplicateLines.add(first.line).add(row.line)
    else seen.set(key, row)
    rows.push(row)
  })

  for (const line of duplicateLines) issues.push({ line, reason: '同版本、时间点与意见重复，请核对来源状态' })
  return { rows: rows.filter(row => !duplicateLines.has(row.line)), issues }
}

function csvField(value) {
  const clean = /^[\s\uFEFF]*[=+\-@]/.test(value) ? "'" + value : value
  return '"' + clean.replaceAll('"', '""') + '"'
}

export function exportReview(rows, confirmed) {
  const lines = rows
    .filter(row => row.status !== '已处理' && confirmed.has(row.line))
    .map(row => [String(row.line), row.version, row.time, row.comment].map(csvField).join(','))
  return ['原文行号,版本,时间点,原文意见', ...lines].join('\r\n')
}

const knowledge = [
  { title: '公开演示说明', content: '审片演示使用浏览器本地数据。意见绑定版本和时间点。', roles: ['访客', '项目成员'], citation: '#arivo-pde' },
  { title: '项目版本与验收（虚构）', content: '审片确认 v4 版本，核对时间点与修改意见后才能导出。', roles: ['项目成员'], citation: '#prd-acceptance' },
]

export function searchKnowledge(query, role) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  return knowledge.filter(document => document.roles.includes(role) &&
    terms.every(term => (document.title + document.content).toLowerCase().includes(term)))
}

function downloadCsv(csv) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], {type:'text/csv;charset=utf-8'}))
  const link = document.createElement('a')
  link.href = url
  link.download = 'review-checklist.csv'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function mountReview(form) {
  const input = form.querySelector('textarea')
  const output = form.querySelector('[data-review-output]')
  const status = form.querySelector('[data-review-status]')
  const timing = form.querySelector('[data-review-timing]')
  const manual = form.querySelector('[data-manual-start]')
  const save = form.querySelector('[data-review-download]')
  const history = form.querySelector('[data-review-runs]')
  const confirmed = new Set()
  let rows = []
  let manualStart = null
  let manualMs = null
  let autoStart = null
  let autoMs = null
  let autoCount = 0
  let digest = ''
  let trials = 0

  function resetRun() {
    confirmed.clear()
    rows = []
    output.replaceChildren()
    status.textContent = ''
    save.disabled = true
    manualStart = manualMs = autoStart = autoMs = null
    manual.textContent = '开始手工计时'
    timing.textContent = '先固定同一份输入，再记录两种整理方式。'
  }

  function recordPair() {
    if (manualMs === null || autoMs === null) return
    const item = document.createElement('li')
    item.textContent = `第 ${++trials} 次 · ${digest} · 手工 ${(manualMs/1000).toFixed(2)} 秒 · 自动与复核 ${(autoMs/1000).toFixed(2)} 秒 · 导出 ${autoCount} 条`
    history.append(item)
    manualMs = autoMs = null
    timing.textContent = '已记录一轮配对耗时。可用同一份输入开始下一轮。'
  }

  form.querySelector('[data-load-example]').addEventListener('click', () => {
    input.value = document.getElementById('review-fixture').content.textContent.trim()
    resetRun()
    input.focus()
  })
  input.addEventListener('input', resetRun)

  manual.addEventListener('click', () => {
    if (manualStart === null) {
      if (!input.value.trim()) return input.focus()
      if (autoStart !== null) {
        timing.textContent = '请先完成当前自动整理的复核与导出。'
        return
      }
      manualStart = performance.now()
      manual.textContent = '结束手工计时'
      timing.textContent = '手工计时中。整理成同样的清单并复核后结束。'
      return
    }
    manualMs = performance.now() - manualStart
    manualStart = null
    manual.textContent = '重新记录手工耗时'
    timing.textContent = `手工用时 ${(manualMs / 1000).toFixed(2)} 秒。可运行自动整理并逐条确认。`
    recordPair()
  })

  form.addEventListener('submit', event => {
    event.preventDefault()
    if (manualStart !== null) {
      status.textContent = '请先结束手工计时。'
      return
    }
    confirmed.clear()
    save.disabled = true
    autoStart = performance.now()
    const parsed = parseReview(input.value)
    const parsingMs = performance.now() - autoStart
    rows = parsed.rows
    digest = `${rows.length} 条有效，${parsed.issues.length} 条异常`
    const list = document.createElement('ul')
    list.className = 'review-output-list'

    for (const row of rows) {
      const item = document.createElement('li')
      const label = document.createElement('label')
      const tick = document.createElement('input')
      tick.type = 'checkbox'
      tick.disabled = row.status === '已处理'
      tick.addEventListener('change', () => {
        if (tick.checked) confirmed.add(row.line)
        else confirmed.delete(row.line)
        save.disabled = autoStart === null || confirmed.size === 0
      })
      label.append(tick, `第 ${row.line} 行 · ${row.version} · ${row.time} · ${row.status} · ${row.comment}`)
      item.append(label)
      list.append(item)
    }
    for (const issue of parsed.issues) {
      const item = document.createElement('li')
      item.className = 'review-issue'
      item.textContent = `第 ${issue.line} 行待人工核对 · ${issue.reason}`
      list.append(item)
    }

    output.replaceChildren(list)
    status.textContent = `${digest}。解析用时 ${parsingMs.toFixed(2)} ms。请逐条勾选确认。`
  })

  save.addEventListener('click', () => {
    if (!confirmed.size || autoStart === null) return
    autoMs = performance.now() - autoStart
    autoCount = confirmed.size
    downloadCsv(exportReview(rows, confirmed))
    autoStart = null
    save.disabled = true
    timing.textContent = `自动整理加复核用时 ${(autoMs/1000).toFixed(2)} 秒。可再记录手工耗时。`
    recordPair()
  })
}

function mountKnowledge(form) {
  const output = form.querySelector('[data-knowledge-output]')
  form.addEventListener('submit', event => {
    event.preventDefault()
    const data = new FormData(form)
    const matches = searchKnowledge(data.get('query'), data.get('role'))
    output.replaceChildren()
    if (!matches.length) {
      output.textContent = '当前身份可访问的资料中未找到匹配。'
      return
    }
    for (const match of matches) {
      const row = document.createElement('p')
      const citation = document.createElement('a')
      citation.href = match.citation
      citation.textContent = match.title
      row.append(citation, ' · ', match.content)
      output.append(row)
    }
  })
}

if (typeof document !== 'undefined') {
  const reviewForm = document.querySelector('[data-review-form]')
  const knowledgeForm = document.querySelector('[data-knowledge-form]')
  if (reviewForm) mountReview(reviewForm)
  if (knowledgeForm) mountKnowledge(knowledgeForm)
}
