const prototype = document.querySelector('[data-map-prototype]')

if (prototype) {
  const views = [...prototype.querySelectorAll('[data-map-view]')]
  const screenButtons = [...prototype.querySelectorAll('[data-map-screen]')]
  const modeButtons = [...prototype.querySelectorAll('[data-map-mode]')]
  const storeButtons = [...prototype.querySelectorAll('[data-map-store]')]
  const detailButtons = [...prototype.querySelectorAll('[data-map-detail]')]
  const detailViews = [...prototype.querySelectorAll('[data-map-detail-view]')]
  const detailScreen = prototype.querySelector('[data-map-view="detail"]')
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
        ? ['商家详情 · 按需查看', '在优惠、推荐菜和评价三页之间切换。']
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

  function selectDetail(page) {
    for (const tab of detailButtons) tab.setAttribute('aria-pressed', String(tab.dataset.mapDetail === page))
    for (const view of detailViews) view.hidden = view.dataset.mapDetailView !== page
    detailScreen.scrollTop = 0
  }

  function openDetails() {
    selected = 'bbq'
    mode = 'focused'
    screen = 'detail'
    selectDetail('offers')
    render()
  }

  window.addEventListener('hashchange', () => {
    if (location.hash === '#amap-merchant-demo' && screen !== 'detail') openDetails()
  })
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
            openDetails()
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
    button.addEventListener('click', () => selectDetail(button.dataset.mapDetail))
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

  if (location.hash === '#amap-merchant-demo') openDetails()
  else render()
}

for (const guide of document.querySelectorAll('[data-amap-merchant-guide]')) {
  const entry = guide.querySelector('[data-guide-open]')
  const stage = guide.querySelector('[data-guide-stage]')
  const preview = guide.querySelector('[data-guide-preview]')
  const detail = guide.querySelector('[data-guide-detail]')
  const enter = guide.querySelector('[data-guide-enter]')
  const returnButton = guide.querySelector('[data-guide-return]')
  const headerBack = guide.querySelector('[data-guide-header-back]')
  const headerTabs = guide.querySelector('[data-guide-header-tabs]')
  const tabs = [...headerTabs.querySelectorAll('[data-guide-tab]')]
  const bottomBar = guide.querySelector('[data-guide-bottom-bar]')
  const scroll = guide.querySelector('[data-guide-scroll]')
  const status = guide.querySelector('[data-guide-status]')
  const parts = [...guide.querySelectorAll('[data-guide-part]')]
  const tiles = [...guide.querySelectorAll('[data-guide-card]')]
  const jumps = [...guide.querySelectorAll('[data-guide-jump]')]
  const thumbnails = guide.querySelector('[data-guide-thumbnails]')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let frame = 0
  let active = ''
  let pointer
  let touch
  let skipTap = false
  let opened = false
  let pullOffset
  let settling = false

  function highlight(key) {
    if (active === key) return
    active = key
    for (const tile of tiles) tile.hidden = tile.dataset.guideCard !== key
    const selectedTab = { identity: 'offers', notes: 'menu' }[key] ?? key
    for (const tab of tabs) tab.setAttribute('aria-pressed', String(tab.dataset.guideTab === selectedTab))
    for (const button of jumps) {
      const selected = button.dataset.guideJump === key
      button.setAttribute('aria-pressed', String(selected))
      if (selected) {
        status.textContent = button.textContent
        const viewport = thumbnails.getBoundingClientRect()
        const thumb = button.getBoundingClientRect()
        if (thumb.left < viewport.left) thumbnails.scrollLeft += thumb.left - viewport.left
        else if (thumb.right > viewport.right) thumbnails.scrollLeft += thumb.right - viewport.right
      }
    }
  }

  function revealSheet() {
    if (detail.hidden) {
      detail.hidden = false
      scroll.scrollTop = 0
      updateHeader()
    }
  }

  function updateHeader() {
    const distance = Math.max(1, scroll.clientWidth * .2)
    const progress = Math.min(1, Math.max(0, scroll.scrollTop) / distance)
    const tabProgress = Math.min(1, Math.max(0, (scroll.scrollTop - scroll.clientWidth * .64) / (distance * .28)))
    detail.style.setProperty('--guide-header-progress', progress)
    detail.style.setProperty('--guide-header-travel', reducedMotion.matches ? '0px' : `${-distance * .32 * (1 - progress)}px`)
    detail.style.setProperty('--guide-tabs-progress', tabProgress)
    headerTabs.inert = tabProgress < .55
    headerBack.disabled = progress < .55
  }

  function barPosition(offset, height) {
    const visibility = height ? offset / height : 1
    return {
      opacity: visibility,
      translate: `0 ${(1 - visibility) * 145}%`
    }
  }

  function placeBar(offset, height) {
    Object.assign(bottomBar.style, barPosition(offset, height))
  }

  function settleSheet(nextOpen, focus = false) {
    if (settling) return
    const height = stage.clientHeight
    const start = pullOffset ?? (opened ? 0 : height)
    const end = nextOpen ? 0 : height
    const changing = opened !== nextOpen
    pullOffset = undefined
    if (detail.hidden && !nextOpen) return

    revealSheet()
    settling = true
    preview.inert = opened || nextOpen
    detail.inert = !opened || !nextOpen
    detail.style.setProperty('--guide-pull', `${end}px`)
    placeBar(end, height)
    if (changing && nextOpen) highlight(parts[0].dataset.guidePart)

    function finish() {
      opened = nextOpen
      detail.hidden = !opened
      detail.style.removeProperty('--guide-pull')
      detail.inert = !opened
      preview.inert = opened
      enter.disabled = opened
      returnButton.disabled = !opened
      settling = false
      if (opened) synchronize()
      else {
        highlight('')
        status.textContent = ''
      }
      if (focus) (opened ? scroll : entry).focus({ preventScroll: true })
    }

    if (reducedMotion.matches || Math.abs(start - end) < 1) {
      finish()
      return
    }
    const timing = { duration: changing ? 560 : 340, easing: 'cubic-bezier(.22,.72,.26,1)' }
    const animation = detail.animate(
      [{ translate: `0 ${start}px` }, { translate: `0 ${end}px` }],
      timing
    )
    bottomBar.animate([barPosition(start, height), barPosition(end, height)], timing)
    animation.onfinish = finish
    animation.oncancel = finish
  }

  function closeGuide() {
    if (opened && pullOffset === undefined) settleSheet(false, true)
  }

  function synchronize() {
    frame = 0
    if (!detail.hidden) updateHeader()
    if (!opened || settling) return
    const { scrollTop, scrollHeight, clientHeight } = scroll
    const readingLine = scrollTop + clientHeight * .32
    const atEnd = scrollTop > 1 && scrollTop + clientHeight >= scrollHeight - 2
    const current = atEnd
      ? parts.at(-1)
      : parts.reduce((visible, part) => scrollTop > 1 && positionInGuide(part) <= readingLine ? part : visible, parts[0])
    highlight(current.dataset.guidePart)
  }

  function positionInGuide(part) {
    return part.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop
  }

  function enterDetail() {
    if (!opened && pullOffset === undefined) settleSheet(true, true)
  }

  entry.addEventListener('click', event => {
    if (!skipTap || event.detail === 0) enterDetail()
    skipTap = false
  })
  enter.addEventListener('click', enterDetail)
  returnButton.addEventListener('click', closeGuide)
  headerBack.addEventListener('click', closeGuide)
  scroll.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    closeGuide()
  })

  function drawPull(distance, opening) {
    const height = stage.clientHeight
    const travel = Math.min(height, distance)
    pullOffset = opening ? height - travel : travel
    revealSheet()
    detail.style.setProperty('--guide-pull', `${pullOffset}px`)
    placeBar(pullOffset, height)
  }

  function releasePull(distance, opening, completed) {
    if (pullOffset === undefined) return
    const threshold = Math.min(100, Math.max(52, stage.clientHeight * .15))
    const shouldSwitch = completed && distance >= threshold
    settleSheet(shouldSwitch ? opening : opened, shouldSwitch)
  }

  stage.addEventListener('pointerdown', event => {
    if (settling || !event.isPrimary || event.button !== 0) return
    const opening = !opened && entry.contains(event.target)
    const browsing = opened && event.pointerType !== 'touch' && scroll.contains(event.target)
    if (!opening && !browsing) return
    skipTap = false
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, top: scroll.scrollTop, delta: 0, opening }
  })
  stage.addEventListener('pointermove', event => {
    if (pointer?.id !== event.pointerId) return
    const y = event.clientY - pointer.y
    if (!pointer.action) {
      if (Math.abs(y) < 7) return
      if (Math.abs(event.clientX - pointer.x) > Math.abs(y) || (pointer.opening && y > 0)) {
        pointer = undefined
        return
      }
      stage.setPointerCapture(event.pointerId)
      pointer.action = pointer.opening ? 'open' : pointer.top <= 1 && y > 0 ? 'close' : 'scroll'
      stage.dataset.dragging = ''
    }
    if (pointer.action === 'scroll') {
      scroll.scrollTop = pointer.top - y
    } else {
      pointer.delta = pointer.opening ? Math.min(0, y) : Math.max(0, y)
      drawPull(Math.abs(pointer.delta), pointer.opening)
    }
  })
  function releasePointer(event) {
    if (pointer?.id !== event.pointerId) return
    const { opening, delta, action } = pointer
    pointer = undefined
    delete stage.dataset.dragging
    if (opening) skipTap = action === 'open'
    releasePull(Math.abs(delta), opening, event.type === 'pointerup')
  }
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) stage.addEventListener(event, releasePointer)
  stage.addEventListener('pointerleave', () => {
    if (pointer && !pointer.action) pointer = undefined
  })
  stage.addEventListener('dragstart', event => event.preventDefault())

  scroll.addEventListener('touchstart', event => {
    touch = !settling && opened && scroll.scrollTop <= 1 && event.touches.length === 1
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY, delta: 0 }
      : undefined
  }, { passive: true })
  scroll.addEventListener('touchmove', event => {
    if (!touch) return
    const point = event.touches[0]
    if (event.touches.length !== 1 || !event.cancelable || scroll.scrollTop > 1) {
      touch = undefined
      releasePull(0, false, false)
      return
    }
    const delta = point.clientY - touch.y
    if (!touch.delta && (delta < 0 || Math.abs(point.clientX - touch.x) > delta)) {
      touch = undefined
      return
    }
    event.preventDefault()
    touch.delta = Math.max(delta, 0)
    drawPull(touch.delta, false)
  }, { passive: false })
  for (const type of ['touchend', 'touchcancel']) {
    scroll.addEventListener(type, event => {
      const pull = touch?.delta ?? 0
      touch = undefined
      releasePull(pull, false, event.type === 'touchend')
    }, { passive: true })
  }
  scroll.addEventListener('scroll', () => {
    if (!frame) frame = window.requestAnimationFrame(synchronize)
  }, { passive: true })
  function jumpTo(key) {
    if (settling || pullOffset !== undefined) return
    if (!opened) settleSheet(true)
    const part = parts.find(item => item.dataset.guidePart === key)
    const top = part === parts[0] ? 0 : Math.max(0, positionInGuide(part) - scroll.clientHeight * .32 + 2)
    highlight(key)
    scroll.scrollTo({ top, behavior: reducedMotion.matches ? 'instant' : 'smooth' })
  }
  for (const button of jumps) button.addEventListener('click', () => jumpTo(button.dataset.guideJump))
  for (const tab of tabs) tab.addEventListener('click', () => jumpTo(tab.dataset.guideTab))
}

for (const carousel of document.querySelectorAll('[data-amap-carousel]')) {
  const track = carousel.querySelector('[data-amap-track]')
  const slides = [...track.querySelectorAll('[data-amap-slide]')]
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
      slide.setAttribute('aria-pressed', String(i === index))
    })
    for (const button of steps) {
      const next = index + Number(button.dataset.amapStep)
      button.setAttribute('aria-disabled', String(next < 0 || next >= slides.length))
    }
    const label = slides[index].getAttribute('aria-label')
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
  slides.forEach((slide, index) => {
    slide.addEventListener('click', () => go(index))
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
