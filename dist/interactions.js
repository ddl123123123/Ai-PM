for (const demo of document.querySelectorAll('[data-demo]')) {
  const controls = [...demo.querySelectorAll('[data-demo-step]')]
  const panels = controls.map(control => document.getElementById(control.getAttribute('aria-controls')))
  const status = demo.querySelector('[data-demo-status]')

  controls.forEach((control, index) => {
    control.disabled = false
    control.addEventListener('click', () => {
      if (control.getAttribute('aria-pressed') === 'true') return

      controls.forEach((button, position) => {
        const selected = index === position
        button.setAttribute('aria-pressed', String(selected))
        panels[position].hidden = !selected
      })
      status.textContent = control.textContent
    })
  })

  demo.dataset.ready = ''
}

const hero = document.querySelector('.hero')
if (hero) {
  const motion = window.matchMedia('screen and (prefers-reduced-motion: no-preference)')
  let frame = 0
  let lastOffset = 0

  function paintParallax() {
    frame = 0
    const { top, height } = hero.getBoundingClientRect()
    const offset = Math.max(0, Math.min(-top, height, 420))
    if (offset === lastOffset) return
    lastOffset = offset
    hero.style.setProperty('--hero-scroll', `${offset}px`)
  }

  function scheduleParallax() {
    if (!frame) frame = window.requestAnimationFrame(paintParallax)
  }

  function syncParallax() {
    if (motion.matches) {
      window.addEventListener('scroll', scheduleParallax, { passive: true })
      window.addEventListener('resize', scheduleParallax)
      scheduleParallax()
      return
    }

    window.removeEventListener('scroll', scheduleParallax)
    window.removeEventListener('resize', scheduleParallax)
    if (frame) window.cancelAnimationFrame(frame)
    frame = 0
    lastOffset = 0
    hero.style.removeProperty('--hero-scroll')
  }

  motion.addEventListener('change', syncParallax)
  syncParallax()
}

const projects = document.querySelector('[data-project-grid]')
if (projects) {
  const covers = Array.from(projects.querySelectorAll('[data-project-select]'))

  projects.addEventListener('click', event => {
    if (event.target.closest('a')) return
    const selected = event.target.closest('.project-card')?.querySelector('[data-project-select]')
    if (!selected || selected.getAttribute('aria-pressed') === 'true') return

    for (const cover of covers) {
      const active = cover === selected
      cover.setAttribute('aria-pressed', String(active))
      cover.closest('.project-card').classList.toggle('is-selected', active)
    }
  })
}

const tarot = document.querySelector('[data-tarot-play]')
if (tarot) {
  const choices = Array.from(tarot.querySelectorAll('[data-tarot-card]'))
  const status = tarot.querySelector('[data-tarot-status]')
  const actions = tarot.querySelector('[data-tarot-actions]')
  const read = tarot.querySelector('[data-tarot-read]')
  const reading = tarot.querySelector('[data-tarot-reading]')
  const cards = [
    { title: '愚者', image: 'orae-demo-fool.webp', meaning: '愚者象征起点与尝试。可以先做一次小实验，为下一步收集信息。', question: '有什么低成本的第一步可以先试？' },
    { title: '星星', image: 'orae-demo-star.webp', meaning: '星星关联希望与恢复。把注意力放回手边能够积累的资源。', question: '眼下有哪些已经可以依靠的支持？' },
    { title: '世界', image: 'world.jpg', meaning: '世界关联阶段完成与整合。回看已经走过的过程，再决定如何开启下一个阶段。', question: '有哪些经验值得整理下来，带进下一阶段？' },
  ]
  let hand = []
  let selection = null

  function deal() {
    hand = cards.slice()
    for (let index = hand.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1))
      const card = hand[index]
      hand[index] = hand[other]
      hand[other] = card
    }
    selection = null
    choices.forEach((choice, index) => {
      choice.disabled = false
      choice.setAttribute('aria-pressed', 'false')
      choice.querySelector('.tarot-face').src = `assets/${hand[index].image}`
    })
    reading.hidden = true
    actions.hidden = true
    read.setAttribute('aria-expanded', 'false')
    status.textContent = '选择一张牌开始。'
  }

  choices.forEach((choice, index) => {
    choice.addEventListener('click', () => {
      if (selection) return
      selection = hand[index]
      choice.setAttribute('aria-pressed', 'true')
      choices.forEach(button => { button.disabled = true })
      status.textContent = `你翻开了「${selection.title}」。`
      actions.hidden = false
      read.focus({ preventScroll: true })
    })
  })

  read.addEventListener('click', () => {
    if (!selection) return
    tarot.querySelector('[data-tarot-title]').textContent = selection.title
    tarot.querySelector('[data-tarot-meaning]').textContent = selection.meaning
    tarot.querySelector('[data-tarot-question]').textContent = selection.question
    read.setAttribute('aria-expanded', 'true')
    reading.hidden = false
    reading.focus()
  })

  tarot.querySelector('[data-tarot-reset]').addEventListener('click', () => {
    deal()
    choices[0].focus({ preventScroll: true })
  })

  deal()
}

for (const sample of document.querySelectorAll('[data-motion-sample]')) {
  const toggle = sample.querySelector('[data-motion-toggle]')
  toggle.addEventListener('click', () => {
    const active = toggle.getAttribute('aria-pressed') !== 'true'
    toggle.setAttribute('aria-pressed', String(active))
    sample.classList.toggle('is-active', active)
  })
}

const viewer = document.querySelector('.image-viewer')
if (viewer?.showModal) {
  const image = viewer.querySelector('img')
  const title = viewer.querySelector('h2')
  const viewport = viewer.querySelector('.image-viewer-body')
  const zoom = viewer.querySelector('[data-viewer-zoom]')

  function setZoom(active) {
    viewer.classList.toggle('is-zoomed', active)
    zoom.setAttribute('aria-pressed', String(active))
    zoom.textContent = active ? '适应窗口' : '放大'
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('[data-image-preview]')
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()

    const caption = link.querySelector('img')?.alt || link.textContent.trim() || '图片预览'
    title.textContent = caption
    image.alt = caption
    image.src = link.href
    setZoom(false)
    viewer.showModal()
    viewport.scrollTo(0, 0)
  })

  zoom.addEventListener('click', () => {
    setZoom(!viewer.classList.contains('is-zoomed'))
    viewport.scrollTo(0, 0)
  })
  viewer.addEventListener('click', event => {
    if (event.target === viewer) viewer.close()
  })
}
