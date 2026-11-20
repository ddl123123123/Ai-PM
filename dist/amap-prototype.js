const prototype = document.querySelector('[data-map-prototype]')

if (prototype) {
  const phone = prototype.querySelector('.amap-phone')
  const sheet = prototype.querySelector('.amap-sheet')
  const handle = prototype.querySelector('[data-map-handle]')
  const status = prototype.querySelector('[data-map-status]')
  const tabs = [...prototype.querySelectorAll('[data-map-screen]')]
  const panels = [...prototype.querySelectorAll('[data-map-view]')]
  const backdrops = [...prototype.querySelectorAll('[data-map-backdrop]')]
  const targets = [...prototype.querySelectorAll('[data-map-target]')]
  let tab = phone.dataset.mapTab
  let height = phone.dataset.mapHeight
  let drag
  let suppressClick = false

  function show(nextTab, nextHeight) {
    const resize = nextHeight !== height
    tab = nextTab
    height = nextHeight
    phone.dataset.mapTab = tab
    phone.dataset.mapHeight = height
    for (const panel of panels) {
      panel.hidden = panel.dataset.mapView !== tab
      if (resize) panel.scrollTop = 0
    }
    for (const backdrop of backdrops) backdrop.hidden = backdrop.dataset.mapBackdrop !== tab
    for (const button of tabs) {
      const selected = button.dataset.mapScreen === tab
      button.setAttribute('aria-selected', String(selected))
      button.tabIndex = selected ? 0 : -1
    }
    for (const button of targets) {
      button.setAttribute('aria-pressed', String(button.dataset.mapTarget === `${tab}-${height}`))
    }
    status.textContent = `${tab === 'recommend' ? '推荐' : '附近'}${height === 'full' ? '全屏' : '半屏'}`
  }

  for (const [index, button] of tabs.entries()) {
    button.addEventListener('click', () => show(button.dataset.mapScreen, height))
    button.addEventListener('keydown', event => {
      const next = { ArrowLeft: 1 - index, ArrowRight: 1 - index, Home: 0, End: tabs.length - 1 }[event.key]
      if (next === undefined) return
      event.preventDefault()
      tabs[next].click()
      tabs[next].focus()
    })
  }

  for (const button of targets) {
    button.addEventListener('click', () => show(...button.dataset.mapTarget.split('-')))
  }

  handle.addEventListener('keydown', event => {
    const next = { ArrowUp: 'full', ArrowDown: 'half' }[event.key]
    if (!next) return
    event.preventDefault()
    show(tab, next)
  })

  handle.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return
    handle.setPointerCapture(event.pointerId)
    const top = sheet.offsetTop
    drag = { id: event.pointerId, y: event.clientY, top }
    suppressClick = false
    sheet.classList.add('is-dragging')
    sheet.style.setProperty('--amap-sheet-position', `${top}px`)
  })

  handle.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return
    const delta = event.clientY - drag.y
    const top = Math.max(phone.clientHeight * .115, Math.min(phone.clientHeight * .517, drag.top + delta))
    sheet.style.setProperty('--amap-sheet-position', `${top}px`)
  })

  function release(event) {
    if (drag?.id !== event.pointerId) return
    const delta = event.clientY - drag.y
    drag = undefined
    sheet.classList.remove('is-dragging')
    sheet.style.removeProperty('--amap-sheet-position')
    suppressClick = event.type !== 'pointerup' || Math.abs(delta) >= 14
    if (event.type === 'pointerup' && Math.abs(delta) >= 14) show(tab, delta < 0 ? 'full' : 'half')
  }

  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) handle.addEventListener(event, release)
  handle.addEventListener('click', event => {
    if (!suppressClick || event.detail === 0) show(tab, height === 'full' ? 'half' : 'full')
    suppressClick = false
  })

  show(tab, height)
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
  let pullProgress
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
    stage.style.setProperty('--guide-header-progress', progress)
    detail.style.setProperty('--guide-header-travel', reducedMotion.matches ? '0px' : `${-distance * .32 * (1 - progress)}px`)
    detail.style.setProperty('--guide-tabs-progress', tabProgress)
    headerTabs.inert = tabProgress < .55
    headerBack.disabled = progress < .55
  }

  function setSheetOrigin() {
    const travel = Math.max(1, entry.offsetTop - stage.clientWidth * 169 / 860)
    stage.style.setProperty('--guide-sheet-origin', `${travel}px`)
    return travel
  }

  function settleSheet(nextOpen, focus = false) {
    if (settling) return
    const start = pullProgress ?? Number(opened)
    const end = Number(nextOpen)
    const changing = opened !== nextOpen
    pullProgress = undefined
    if (detail.hidden && !nextOpen) return

    revealSheet()
    setSheetOrigin()
    settling = true
    preview.inert = opened || nextOpen
    detail.inert = !opened || !nextOpen
    stage.style.setProperty('--guide-sheet-progress', end)
    if (changing && nextOpen) highlight(parts[0].dataset.guidePart)

    function finish() {
      opened = nextOpen
      detail.hidden = !opened
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

    if (reducedMotion.matches || start === end) {
      finish()
      return
    }
    const animation = stage.animate(
      [{ '--guide-sheet-progress': start }, { '--guide-sheet-progress': end }],
      { duration: changing ? 560 : 340, easing: 'cubic-bezier(.22,.72,.26,1)' }
    )
    animation.onfinish = finish
    animation.oncancel = finish
  }

  function closeGuide() {
    if (opened && pullProgress === undefined) settleSheet(false, true)
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
    if (!opened && pullProgress === undefined) settleSheet(true, true)
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
    const fraction = Math.min(1, distance / setSheetOrigin())
    pullProgress = opening ? fraction : 1 - fraction
    revealSheet()
    stage.style.setProperty('--guide-sheet-progress', pullProgress)
  }

  function releasePull(opening, completed) {
    if (pullProgress === undefined) return
    const moved = opening ? pullProgress : 1 - pullProgress
    const shouldSwitch = completed && moved >= .25
    settleSheet(shouldSwitch ? opening : opened, shouldSwitch)
  }

  stage.addEventListener('pointerdown', event => {
    if (settling || !event.isPrimary || event.button !== 0) return
    const opening = !opened && entry.contains(event.target)
    const browsing = opened && event.pointerType !== 'touch' && scroll.contains(event.target)
    if (!opening && !browsing) return
    skipTap = false
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, top: scroll.scrollTop, opening }
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
      drawPull(Math.max(0, pointer.opening ? -y : y), pointer.opening)
    }
  })
  function releasePointer(event) {
    if (pointer?.id !== event.pointerId) return
    const { opening, action } = pointer
    pointer = undefined
    delete stage.dataset.dragging
    if (opening) skipTap = action === 'open'
    releasePull(opening, event.type === 'pointerup')
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
      releasePull(false, false)
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
      touch = undefined
      releasePull(false, event.type === 'touchend')
    }, { passive: true })
  }
  scroll.addEventListener('scroll', () => {
    if (!frame) frame = window.requestAnimationFrame(synchronize)
  }, { passive: true })
  function jumpTo(key) {
    if (settling || pullProgress !== undefined) return
    if (!opened) settleSheet(true)
    const part = parts.find(item => item.dataset.guidePart === key)
    const top = part === parts[0] ? 0 : Math.max(0, positionInGuide(part) - scroll.clientHeight * .32 + 2)
    highlight(key)
    scroll.scrollTo({ top, behavior: reducedMotion.matches ? 'instant' : 'smooth' })
  }
  for (const button of jumps) button.addEventListener('click', () => jumpTo(button.dataset.guideJump))
  for (const tab of tabs) tab.addEventListener('click', () => jumpTo(tab.dataset.guideTab))
  if (guide.id === 'amap-merchant-demo') {
    const openFromLink = () => {
      if (location.hash === '#amap-merchant-demo') settleSheet(true)
    }
    window.addEventListener('hashchange', openFromLink)
    openFromLink()
  }
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
