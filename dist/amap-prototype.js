const prototype = document.querySelector('[data-map-prototype]')

if (prototype) {
  const views = [...prototype.querySelectorAll('[data-map-view]')]
  const screenButtons = [...prototype.querySelectorAll('[data-map-screen]')]
  const modeButtons = [...prototype.querySelectorAll('[data-map-mode]')]
  const storeButtons = [...prototype.querySelectorAll('[data-map-store]')]
  const detailButtons = [...prototype.querySelectorAll('[data-map-detail]')]
  const detailViews = [...prototype.querySelectorAll('[data-map-detail-view]')]
  const controller = prototype.querySelector('[data-map-handle]')
  const nearby = prototype.querySelector('#amap-screen-nearby')
  const sheet = controller.parentElement
  const status = prototype.querySelector('[data-map-status]')
  const title = prototype.querySelector('[data-map-mode-title]')
  const copy = prototype.querySelector('[data-map-mode-copy]')
  const focusCard = prototype.querySelector('.amap-focus-card')
  const focusName = focusCard.querySelector('h5')
  const focusMeta = focusCard.querySelector('p')
  const details = focusCard.querySelector('[data-map-action="details"]')
  const clear = focusCard.querySelector('[data-map-action="clear"]')
  const stores = new Map([...prototype.querySelectorAll('.amap-store-row')].map(row => [
    row.dataset.mapStore, { name: row.querySelector('strong').textContent, meta: row.querySelector('small').textContent },
  ]))
  const modes = {
    list: ['全屏 · 连续浏览', '扩大商家列表的可见范围，快速比较候选。向下拖动可返回地图。'],
    linked: ['半屏 · 对照位置', '列表和地图同时可见。点击图钉或商家卡片，可以聚焦对应地点。'],
    map: ['全图 · 探索范围', '把列表折叠到底部，专注浏览点位。向上拖动可展开列表。'],
    focused: ['单点 · 聚焦商家', '当前商家的图钉和卡片使用同一个选中状态。'],
  }
  const levels = ['map', 'linked', 'list']
  let screen = 'nearby'
  let mode = 'linked'
  let selected = null
  let drag
  let dragged = false

  function render() {
    for (const view of views) view.hidden = view.dataset.mapView !== screen
    for (const button of screenButtons) button.setAttribute('aria-pressed', String(button.dataset.mapScreen === screen))
    for (const button of modeButtons) button.setAttribute('aria-pressed', String(screen === 'nearby' && button.dataset.mapMode === mode))
    for (const button of storeButtons) button.setAttribute('aria-pressed', String(button.dataset.mapStore === selected))
    nearby.dataset.mode = mode
    nearby.querySelector('.amap-map-canvas').inert = mode === 'list'
    focusCard.hidden = mode !== 'focused' || !selected
    if (selected) {
      focusName.textContent = stores.get(selected).name
      focusMeta.textContent = stores.get(selected).meta + (selected === 'dumplings' ? ' · 本例展示点位联动' : '')
      details.hidden = selected !== 'bbq'
    }

    const message = screen === 'recommend'
      ? ['推荐 · 从情境开始', '通过场景卡浏览内容，再进入附近地图。']
      : screen === 'detail'
        ? ['商家详情 · 按需查看', '切换头部、套餐、菜品、笔记和评价，查看原稿的独立设计区。']
        : modes[mode]
    title.textContent = message[0]
    copy.textContent = message[1]
    status.textContent = screen === 'nearby' && mode === 'focused' ? `${message[0]}，${stores.get(selected).name}` : message[0]
  }

  function setMode(next) {
    screen = 'nearby'
    if (next === 'focused' && !selected) selected = 'bbq'
    mode = next
    render()
  }

  function shiftMode(direction) {
    const current = mode === 'focused' ? 1 : levels.indexOf(mode)
    setMode(levels[Math.max(0, Math.min(levels.length - 1, current + direction))])
  }

  for (const button of screenButtons) {
    button.addEventListener('click', () => {
      screen = button.dataset.mapScreen
      render()
    })
  }
  for (const button of modeButtons) button.addEventListener('click', () => setMode(button.dataset.mapMode))

  for (const button of storeButtons) {
    button.addEventListener('click', () => {
      selected = button.dataset.mapStore
      setMode('focused')
      if (button.classList.contains('amap-store-row')) {
        const nextControl = details.hidden ? clear : details
        nextControl.focus({ preventScroll: true })
      }
    })
  }

  for (const button of prototype.querySelectorAll('[data-map-action]')) {
    button.addEventListener('click', () => {
      switch (button.dataset.mapAction) {
        case 'nearby':
          setMode('linked')
          controller.focus({ preventScroll: true })
          break
        case 'details':
          if (selected === 'bbq') {
            screen = 'detail'
            render()
            prototype.querySelector('[data-map-action="back"]').focus({ preventScroll: true })
          }
          break
        case 'back':
          setMode('focused')
          details.focus({ preventScroll: true })
          break
        case 'clear':
          selected = null
          setMode('map')
          controller.focus({ preventScroll: true })
          break
      }
    })
  }

  for (const button of detailButtons) {
    button.addEventListener('click', () => {
      for (const tab of detailButtons) tab.setAttribute('aria-pressed', String(tab === button))
      for (const view of detailViews) view.hidden = view.dataset.mapDetailView !== button.dataset.mapDetail
    })
  }

  controller.addEventListener('keydown', event => {
    const direction = { ArrowUp: 1, ArrowDown: -1 }[event.key]
    if (!direction) return
    event.preventDefault()
    shiftMode(direction)
  })
  controller.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return
    controller.setPointerCapture(event.pointerId)
    drag = { id: event.pointerId, y: event.clientY, top: sheet.offsetTop }
    dragged = false
    sheet.classList.add('is-dragging')
  })
  controller.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return
    const delta = event.clientY - drag.y
    const max = nearby.clientHeight - controller.offsetHeight - drag.top
    const offset = Math.max(-drag.top, Math.min(max, delta))
    sheet.style.setProperty('--amap-drag', `${offset}px`)
  })
  function release(event) {
    if (drag?.id !== event.pointerId) return
    const delta = event.clientY - drag.y
    drag = undefined
    dragged = event.type !== 'pointerup' || Math.abs(delta) >= 24
    sheet.classList.remove('is-dragging')
    sheet.style.removeProperty('--amap-drag')
    if (dragged && event.type === 'pointerup') shiftMode(delta < 0 ? 1 : -1)
  }
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) controller.addEventListener(event, release)
  controller.addEventListener('click', event => {
    if (!dragged || event.detail === 0) shiftMode(mode === 'list' ? -1 : 1)
    dragged = false
  })

  render()
}

for (const carousel of document.querySelectorAll('[data-amap-carousel]')) {
  const track = carousel.querySelector('[data-amap-track]')
  const slides = [...track.querySelectorAll('[data-amap-slide]')]
  const jumps = [...carousel.querySelectorAll('[data-amap-jump]')]
  const steps = [...carousel.querySelectorAll('[data-amap-step]')]
  const status = carousel.querySelector('[data-amap-carousel-status]')
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let active = 0
  let frame = 0
  let drag

  function displacement(slide) {
    const rect = slide.getBoundingClientRect()
    const viewport = track.getBoundingClientRect()
    return rect.left + rect.width / 2 - (viewport.left + viewport.width / 2)
  }

  function nearest() {
    return slides.reduce((best, slide, index) => (
      Math.abs(displacement(slide)) < Math.abs(displacement(slides[best])) ? index : best
    ), 0)
  }

  function select(index) {
    active = index
    slides.forEach((slide, i) => {
      slide.toggleAttribute('data-active', i === index)
      if (slide.tagName === 'BUTTON') slide.setAttribute('aria-pressed', String(i === index))
    })
    jumps.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)))
    for (const button of steps) {
      const next = index + Number(button.dataset.amapStep)
      button.setAttribute('aria-disabled', String(next < 0 || next >= slides.length))
    }
    const label = slides[index].dataset.amapSlide || slides[index].getAttribute('aria-label')
    const message = `${label}，第 ${index + 1} 张，共 ${slides.length} 张`
    if (status.textContent !== message) status.textContent = message
  }

  function go(index, behavior = motion.matches ? 'instant' : 'smooth') {
    const next = Math.max(0, Math.min(slides.length - 1, index))
    track.scrollTo({ left: track.scrollLeft + displacement(slides[next]), behavior })
    select(next)
  }

  function refresh() {
    frame = 0
    select(nearest())
  }

  track.addEventListener('scroll', () => {
    if (!frame) frame = window.requestAnimationFrame(refresh)
  }, { passive: true })
  track.addEventListener('keydown', event => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
    if (!step && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    go(event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : active + step)
  })
  for (const button of steps) {
    button.addEventListener('click', () => go(active + Number(button.dataset.amapStep)))
  }
  jumps.forEach((button, index) => button.addEventListener('click', () => go(index)))
  slides.forEach((slide, index) => {
    if (slide.tagName === 'BUTTON') slide.addEventListener('click', () => go(index))
  })

  track.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    drag = { id: event.pointerId, x: event.clientX, left: track.scrollLeft, moved: false }
  })
  track.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return
    const delta = event.clientX - drag.x
    if (!drag.moved && Math.abs(delta) < 6) return
    if (!drag.moved) {
      drag.moved = true
      track.setPointerCapture(event.pointerId)
      track.dataset.dragging = ''
    }
    track.scrollLeft = drag.left - delta
  })
  function endDrag(event) {
    if (drag?.id !== event.pointerId) return
    const moved = drag.moved
    drag = undefined
    if (!moved) return
    const next = nearest()
    delete track.dataset.dragging
    go(next)
  }
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) track.addEventListener(event, endDrag)
  track.addEventListener('pointerleave', () => {
    if (drag && !drag.moved) drag = undefined
  })
  select(0)
}
