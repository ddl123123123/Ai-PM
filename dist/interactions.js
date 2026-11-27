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

const avalonDemo = document.querySelector('[data-avalon-demo]')
if (avalonDemo) {
  const steps = ['identity', 'night', 'vote', 'mission', 'assassin']
  const tabs = [...avalonDemo.querySelectorAll('[data-avalon-tab]')]
  const panels = [...avalonDemo.querySelectorAll('[data-avalon-panel]')]
  const seats = [...avalonDemo.querySelectorAll('[data-player]')]
  const status = avalonDemo.querySelector('[data-avalon-status]')
  const table = avalonDemo.querySelector('[data-avalon-table]')
  const tableState = avalonDemo.querySelector('[data-avalon-table-state]')
  const roleButton = avalonDemo.querySelector('[data-avalon-role]')
  const roleNote = avalonDemo.querySelector('[data-avalon-role-note]')
  const nightTitle = avalonDemo.querySelector('[data-avalon-night-title]')
  const nightCopy = avalonDemo.querySelector('[data-avalon-night-copy]')
  const nightCount = avalonDemo.querySelector('[data-avalon-night-count]')
  const nightProgress = avalonDemo.querySelector('[data-avalon-night-progress]')
  const nightPrev = avalonDemo.querySelector('[data-avalon-night-prev]')
  const nightNext = avalonDemo.querySelector('[data-avalon-night-next]')
  const selectionCount = avalonDemo.querySelector('[data-avalon-selection-count]')
  const submitTeam = avalonDemo.querySelector('[data-avalon-submit-team]')
  const ballot = avalonDemo.querySelector('[data-avalon-ballot]')
  const voteButtons = [...avalonDemo.querySelectorAll('[data-avalon-vote]')]
  const confirmVote = avalonDemo.querySelector('[data-avalon-confirm-vote]')
  const voteResultText = avalonDemo.querySelector('[data-avalon-vote-result]')
  const reProposal = avalonDemo.querySelector('[data-avalon-reproposal]')
  const toMission = avalonDemo.querySelector('[data-avalon-to-mission]')
  const missionTitle = avalonDemo.querySelector('[data-avalon-mission-title]')
  const missionCopy = avalonDemo.querySelector('[data-avalon-mission-copy]')
  const missionRule = avalonDemo.querySelector('[data-avalon-mission-rule]')
  const missionCards = [...avalonDemo.querySelectorAll('[data-mission-card]')]
  const missionButtons = [...avalonDemo.querySelectorAll('[data-avalon-mission]')]
  const assassinResult = avalonDemo.querySelector('[data-avalon-assassin-result]')
  const resetButton = avalonDemo.querySelector('[data-avalon-reset]')
  const nightScenes = [
    { title: '邪恶阵营互认', copy: '邪恶玩家睁眼确认队友，莫德雷德也会出现在这一幕。', cues: { B: 'evil', F: 'evil', G: 'evil' }, state: '邪恶阵营行动中' },
    { title: '梅林观察阵营', copy: '梅林能看见部分邪恶玩家；莫德雷德对梅林隐藏身份。', cues: { B: 'seen', F: 'seen' }, state: '梅林观察中' },
    { title: '派西维尔辨认术士', copy: '派西维尔看见梅林与莫甘娜两位候选人，但无法分辨身份。', cues: { A: 'possible', F: 'possible' }, state: '出现两位候选人' },
    { title: '天亮，全员睁眼', copy: '夜晚信息只在对应角色视角中短暂出现，白天回到队伍讨论。', cues: {}, state: '白天讨论开始' },
  ]
  const evilPlayers = new Set(['B', 'F', 'G'])
  let activeStep = 'identity'
  let nightIndex = 0
  let selectedPlayers = new Set()
  let proposalSubmitted = false
  let voteChoice = null
  let votePassed = false
  let missionOutcome = null
  let assassinChoice = null

  function announce(message) {
    status.textContent = message
  }

  function clearSeatStates() {
    for (const seat of seats) {
      seat.removeAttribute('data-cue')
      seat.querySelector('[data-seat-state]').textContent = ''
      seat.setAttribute('aria-pressed', 'false')
    }
  }

  function updateNight() {
    const scene = nightScenes[nightIndex]
    nightTitle.textContent = scene.title
    nightCopy.textContent = scene.copy
    nightCount.textContent = `02 / 夜晚行动 · ${nightIndex + 1} / ${nightScenes.length}`
    nightProgress.style.width = `${((nightIndex + 1) / nightScenes.length) * 100}%`
    nightPrev.disabled = nightIndex === 0
    nightNext.disabled = nightIndex === nightScenes.length - 1
    nightNext.textContent = nightIndex === nightScenes.length - 1 ? '夜晚已结束' : '下一幕'
    clearSeatStates()
    for (const [player, cue] of Object.entries(scene.cues)) {
      const seat = seats.find(item => item.dataset.player === player)
      if (!seat) continue
      seat.dataset.cue = cue
      seat.querySelector('[data-seat-state]').textContent = cue === 'evil' ? '邪恶队友' : cue === 'seen' ? '梅林可见' : '候选身份'
    }
    tableState.textContent = scene.state
    announce(`${scene.title}。${scene.copy}`)
  }

  function updateVote() {
    const validTeam = selectedPlayers.size === 2
    selectionCount.textContent = `已选 ${selectedPlayers.size} / 2 人${proposalSubmitted ? ' · 队伍已提交' : ''}`
    submitTeam.disabled = !validTeam || proposalSubmitted
    ballot.hidden = !proposalSubmitted
    for (const seat of seats) {
      const selected = selectedPlayers.has(seat.dataset.player)
      seat.setAttribute('aria-pressed', String(selected))
      seat.disabled = proposalSubmitted
      seat.querySelector('[data-seat-state]').textContent = selected ? (proposalSubmitted ? '任务队伍' : '已选入队') : '点击选择'
    }
    for (const button of voteButtons) button.setAttribute('aria-pressed', String(button.dataset.avalonVote === voteChoice))
    confirmVote.disabled = !voteChoice || votePassed !== null && voteResultText.dataset.confirmed === 'true'
    reProposal.hidden = !proposalSubmitted || voteResultText.dataset.confirmed !== 'true' || votePassed
    toMission.hidden = !proposalSubmitted || voteResultText.dataset.confirmed !== 'true' || !votePassed
  }

  function updateMission() {
    const ready = votePassed && proposalSubmitted
    const canFail = [...selectedPlayers].some(player => evilPlayers.has(player))
    for (const button of missionButtons) button.disabled = !ready || (button.dataset.avalonMission === 'fail' && !canFail)
    if (!ready) {
      missionTitle.textContent = '任务牌仍在暗置'
      missionCopy.textContent = '先完成队伍投票。队伍通过后，任务成员各自提交成功或失败牌。'
      missionRule.textContent = '先通过队伍投票，再进行任务结算。'
      for (const card of missionCards) {
        card.textContent = '?'
        card.removeAttribute('data-result')
        card.setAttribute('aria-label', '未翻开的任务牌')
      }
      return
    }
    missionRule.textContent = canFail
      ? '虚拟队伍允许出现失败牌；实际身份不会向旁观玩家公开。'
      : '当前虚拟队伍没有邪恶角色，只能提交成功牌。'
    if (!missionOutcome) {
      missionTitle.textContent = '任务牌仍在暗置'
      missionCopy.textContent = `队伍已通过：玩家 ${[...selectedPlayers].join('、')}。选择一种示意结果观看翻牌动画。`
      for (const card of missionCards) {
        card.textContent = '?'
        card.removeAttribute('data-result')
        card.setAttribute('aria-label', '未翻开的任务牌')
      }
      return
    }
    const failed = missionOutcome === 'fail'
    missionTitle.textContent = failed ? '任务失败' : '任务成功'
    missionCopy.textContent = failed ? '翻出一张失败牌，本轮任务失败。' : '所有任务牌均为成功，本轮任务成功。'
    missionCards.forEach((card, index) => {
      const result = failed && index === missionCards.length - 1 ? 'fail' : 'success'
      card.dataset.result = result
      card.textContent = result === 'fail' ? '✕' : '✓'
      card.setAttribute('aria-label', result === 'fail' ? '失败任务牌' : '成功任务牌')
      card.classList.remove('is-flipping')
      requestAnimationFrame(() => card.classList.add('is-flipping'))
    })
    announce(failed ? '示意结算：任务失败。' : '示意结算：任务成功。')
  }

  function selectStep(step) {
    if (!steps.includes(step)) return
    activeStep = step
    for (const tab of tabs) {
      const selected = tab.dataset.avalonTab === step
      tab.setAttribute('aria-pressed', String(selected))
    }
    for (const panel of panels) panel.hidden = panel.dataset.avalonPanel !== step
    table.dataset.mode = step
    clearSeatStates()
    for (const seat of seats) {
      seat.disabled = step !== 'vote' && step !== 'assassin'
    }
    if (step === 'night') updateNight()
    if (step === 'vote') {
      updateVote()
      announce(proposalSubmitted ? '当前队伍已提交，可查看投票结果或重新提案。' : '组队阶段：选择两名玩家提交任务队伍。')
    }
    if (step === 'mission') {
      for (const seat of seats) {
        const selected = selectedPlayers.has(seat.dataset.player)
        seat.setAttribute('aria-pressed', String(selected))
        seat.querySelector('[data-seat-state]').textContent = selected ? '本轮成员' : ''
      }
      updateMission()
      if (!missionOutcome) announce(votePassed ? '队伍已通过。选择示意任务结果，观看任务牌翻开。' : '任务尚未开始。先完成一轮通过的队伍投票。')
    }
    if (step === 'assassin') {
      for (const seat of seats) seat.querySelector('[data-seat-state]').textContent = '点击猜测'
      tableState.textContent = '刺客选择目标'
      assassinResult.textContent = assassinChoice ? (assassinChoice === 'A' ? '刺中梅林，邪恶阵营获胜。' : '没有找到梅林，正义阵营获胜。') : '选择玩家座位查看结果。'
      announce(assassinResult.textContent)
    }
    if (step === 'identity') {
      tableState.textContent = '身份暗置'
      seats[0].querySelector('[data-seat-state]').textContent = '你的座位'
      announce('身份阶段：点击身份牌翻开或收起。')
    } else if (step !== 'night' && step !== 'vote' && step !== 'mission' && step !== 'assassin') {
      announce('演示已准备。')
    }
  }

  roleButton.disabled = false
  roleButton.addEventListener('click', () => {
    const revealed = roleButton.getAttribute('aria-expanded') !== 'true'
    roleButton.setAttribute('aria-expanded', String(revealed))
    roleButton.classList.toggle('is-revealed', revealed)
    roleNote.hidden = !revealed
    announce(revealed ? '身份已翻开：梅林。只有当前玩家能看到这张身份牌。' : '身份牌已收起。')
  })

  for (const tab of tabs) {
    tab.disabled = false
    tab.addEventListener('click', () => selectStep(tab.dataset.avalonTab))
  }

  for (const seat of seats) {
    seat.addEventListener('click', () => {
      const player = seat.dataset.player
      if (activeStep === 'vote') {
        if (proposalSubmitted) return
        if (selectedPlayers.has(player)) selectedPlayers.delete(player)
        else if (selectedPlayers.size < 2) selectedPlayers.add(player)
        else {
          announce('首个任务需要 2 人。先取消一个座位，再选择另一位玩家。')
          return
        }
        missionOutcome = null
        updateVote()
        announce(`当前队伍已选 ${selectedPlayers.size} / 2 人。`)
      } else if (activeStep === 'assassin') {
        assassinChoice = player
        for (const item of seats) {
          const selected = item === seat
          item.setAttribute('aria-pressed', String(selected))
          item.querySelector('[data-seat-state]').textContent = selected ? '刺客选择' : '点击猜测'
        }
        const hit = player === 'A'
        seat.dataset.cue = hit ? 'evil' : 'merlin'
        tableState.textContent = hit ? '刺杀命中' : '刺杀落空'
        assassinResult.textContent = hit ? '刺中梅林，邪恶阵营获胜。' : '没有找到梅林，正义阵营获胜。'
        announce(assassinResult.textContent)
      }
    })
  }

  nightPrev.addEventListener('click', () => {
    if (nightIndex === 0) return
    nightIndex -= 1
    updateNight()
  })
  nightNext.addEventListener('click', () => {
    if (nightIndex >= nightScenes.length - 1) return
    nightIndex += 1
    updateNight()
  })

  submitTeam.addEventListener('click', () => {
    if (selectedPlayers.size !== 2) return
    proposalSubmitted = true
    voteChoice = null
    votePassed = false
    voteResultText.textContent = ''
    delete voteResultText.dataset.confirmed
    updateVote()
    announce(`队伍已提交：玩家 ${[...selectedPlayers].join('、')}。请投赞成或反对。`)
  })

  for (const button of voteButtons) {
    button.addEventListener('click', () => {
      voteChoice = button.dataset.avalonVote
      confirmVote.disabled = false
      for (const item of voteButtons) item.setAttribute('aria-pressed', String(item === button))
      announce(`已选择${voteChoice === 'approve' ? '赞成' : '反对'}，确认后查看虚拟投票结果。`)
    })
  }

  confirmVote.addEventListener('click', () => {
    if (!voteChoice) return
    votePassed = voteChoice === 'approve'
    voteResultText.dataset.confirmed = 'true'
    voteResultText.textContent = votePassed
      ? '虚拟投票：5 赞成 · 2 反对，队伍通过。'
      : '虚拟投票：2 赞成 · 5 反对，队伍未通过。'
    updateVote()
    tableState.textContent = votePassed ? '队伍通过' : '需要重新提案'
    announce(voteResultText.textContent)
  })

  reProposal.addEventListener('click', () => {
    selectedPlayers = new Set()
    proposalSubmitted = false
    voteChoice = null
    votePassed = false
    missionOutcome = null
    voteResultText.textContent = ''
    delete voteResultText.dataset.confirmed
    updateVote()
    updateMission()
    tableState.textContent = '选择任务队伍'
    announce('上一轮提案未通过。重新选择两名玩家。')
  })

  toMission.addEventListener('click', () => selectStep('mission'))
  avalonDemo.querySelector('[data-avalon-back-vote]').addEventListener('click', () => selectStep('vote'))

  for (const button of missionButtons) {
    button.addEventListener('click', () => {
      if (!votePassed) return
      missionOutcome = button.dataset.avalonMission
      updateMission()
    })
  }

  resetButton.disabled = false
  resetButton.addEventListener('click', () => {
    activeStep = 'identity'
    nightIndex = 0
    selectedPlayers = new Set()
    proposalSubmitted = false
    voteChoice = null
    votePassed = false
    missionOutcome = null
    assassinChoice = null
    roleButton.setAttribute('aria-expanded', 'false')
    roleButton.classList.remove('is-revealed')
    roleNote.hidden = true
    voteResultText.textContent = ''
    delete voteResultText.dataset.confirmed
    assassinResult.textContent = '选择玩家座位查看结果。'
    tableState.textContent = '身份暗置'
    for (const card of missionCards) {
      card.textContent = '?'
      card.removeAttribute('data-result')
      card.setAttribute('aria-label', '未翻开的任务牌')
    }
    selectStep('identity')
    announce('演示已重置。点击身份牌开始。')
  })

  avalonDemo.querySelector('.avalon-tabs').hidden = false
  avalonDemo.dataset.avalonReady = ''
  selectStep('identity')
  seats[0].querySelector('[data-seat-state]').textContent = '你的座位'
}

for (const guide of document.querySelectorAll('[data-relation-guide]')) {
  const markers = guide.querySelector('[data-relation-markers]')
  const hint = guide.querySelector('[data-relation-hint]')
  const focusLayer = document.createElement('span')
  focusLayer.className = 'relation-focus-layer'
  focusLayer.setAttribute('aria-hidden', 'true')
  const points = [...guide.querySelectorAll('[data-relation-detail]')].map((figure, index) => {
    const [top, height] = figure.dataset.relationDetail.split(' ').map(Number)
    const label = figure.querySelector('figcaption strong')
    const image = figure.querySelector('[data-image-preview]')
    const number = index + 1
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'relation-detail-trigger'
    button.textContent = `${number} · ${label.textContent}`
    label.replaceWith(button)
    const zoom = document.createElement('a')
    zoom.className = 'relation-detail-zoom'
    zoom.href = image.getAttribute('href')
    zoom.dataset.imagePreview = ''
    zoom.setAttribute('aria-label', `放大${label.textContent}`)
    zoom.textContent = '放大'
    figure.querySelector('figcaption').append(zoom)
    image.setAttribute('role', 'button')
    const marker = document.createElement('button')
    marker.type = 'button'
    marker.className = 'relation-hotspot'
    marker.style.insetBlockStart = `${top}%`
    marker.style.blockSize = `${height}%`
    const badge = document.createElement('span')
    badge.className = 'relation-marker'
    badge.textContent = number
    badge.setAttribute('aria-hidden', 'true')
    marker.append(badge)
    marker.setAttribute('aria-label', button.textContent)
    marker.setAttribute('aria-controls', figure.id)
    const outline = document.createElement('span')
    outline.className = 'relation-highlight'
    outline.style.insetBlockStart = `${top}%`
    outline.style.blockSize = `${height}%`
    outline.setAttribute('aria-hidden', 'true')
    return { figure, button, marker, outline, image }
  })
  let active

  function select(point) {
    if (active === point) return
    active = point
    for (const item of points) {
      const selected = item === point
      item.figure.toggleAttribute('data-active', selected)
      item.outline.toggleAttribute('data-active', selected)
      item.button.setAttribute('aria-pressed', String(selected))
      item.marker.setAttribute('aria-pressed', String(selected))
      item.image.setAttribute('aria-pressed', String(selected))
    }
  }

  for (const point of points) {
    point.figure.addEventListener('click', event => {
      const link = event.target.closest('a')
      if ((link && link !== point.image) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      select(point)
      if (link) event.preventDefault()
      point.marker.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
    point.image.addEventListener('keydown', event => {
      if (event.key === ' ') {
        event.preventDefault()
        point.image.click()
      }
    })
    point.marker.addEventListener('click', () => {
      select(point)
      point.figure.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
  }
  focusLayer.append(...points.map(point => point.outline))
  markers.append(focusLayer, ...points.map(point => point.marker))
  hint.hidden = false
  guide.classList.add('is-linked')
  select(points[0])
}

const hero = document.querySelector('.hero')
const sections = [...document.querySelectorAll('.profile-intro > div, .profile-skills > article, #experience, .stage-copy, .case-lead-copy, .case-brief > section, .case-track, .chapter, .interaction-demo, .orae-module-copy, .resource-block, .resource-block > .case-page, .contact-section')]
  .map(section => ({
    title: section.querySelector(':scope > :is(h2, h3, h4, h5), :scope > .overview-heading > h2'),
    copy: section.querySelector(':scope > p:not(.eyebrow, .sr-only), :scope > :is(.practice-list, .resource-grid, .case-flow, .evidence-pair, .table-scroll, ul)'),
    offset: 0,
  }))
  .filter(({ title }) => title)

if (hero || sections.length) {
  const motion = window.matchMedia('screen and (prefers-reduced-motion: no-preference)')
  let frame = 0
  let lastOffset = 0
  const content = document.querySelector('.site-content')
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(scheduleParallax) : null
  const arrivals = document.querySelectorAll('.practice-list > li, .case-lead, .case-brief > section, .chapter, .resource-grid > article')
  const visited = new WeakSet()
  const reveal = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting || !motion.matches || visited.has(target)) continue
      visited.add(target)
      reveal.unobserve(target)
      target.dataset.sectionArrive = ''
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: .05 }) : null

  for (const { title, copy } of sections) {
    title.classList.add('parallax-heading')
    copy?.classList.add('parallax-copy')
  }

  function paintParallax() {
    frame = 0
    const viewport = window.innerHeight
    const heroRect = hero?.getBoundingClientRect()
    const heroOffset = heroRect ? Math.max(0, Math.min(-heroRect.top, heroRect.height, 420)) : 0
    // Read positions together, then update the layers without changing document flow.
    const offsets = sections.map(({ title, offset }) => {
      const rect = title.parentElement.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > viewport) return offset
      const progress = Math.max(0, Math.min(1, (rect.top - viewport * .24) / (viewport * .6)))
      return Math.round(progress * 120) / 10
    })

    if (heroOffset !== lastOffset) {
      lastOffset = heroOffset
      hero.style.setProperty('--hero-scroll', `${heroOffset}px`)
    }
    sections.forEach((section, index) => {
      const offset = offsets[index]
      if (section.offset === offset) return
      section.offset = offset
      for (const layer of [section.title, section.copy]) {
        if (offset) layer?.style.setProperty('--section-parallax', `${offset}px`)
        else layer?.style.removeProperty('--section-parallax')
      }
    })
  }

  function scheduleParallax() {
    if (!frame) frame = window.requestAnimationFrame(paintParallax)
  }

  function syncParallax() {
    if (motion.matches) {
      window.addEventListener('scroll', scheduleParallax, { passive: true })
      window.addEventListener('resize', scheduleParallax)
      if (content) resize?.observe(content)
      if (reveal) {
        for (const section of arrivals) {
          if (!visited.has(section)) reveal.observe(section)
        }
      }
      scheduleParallax()
      return
    }

    window.removeEventListener('scroll', scheduleParallax)
    window.removeEventListener('resize', scheduleParallax)
    resize?.disconnect()
    reveal?.disconnect()
    for (const section of arrivals) section.removeAttribute('data-section-arrive')
    if (frame) window.cancelAnimationFrame(frame)
    frame = 0
    lastOffset = 0
    hero?.style.removeProperty('--hero-scroll')
    for (const section of sections) {
      section.offset = 0
      section.title.style.removeProperty('--section-parallax')
      section.copy?.style.removeProperty('--section-parallax')
    }
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

const fan = document.querySelector('[data-fan]')
if (fan) {
  const position = document.querySelector('[data-fan-position]')
  const buttons = [...document.querySelectorAll('[data-fan-step]')]
  const track = fan.querySelector('.fan-cards')
  const count = Number(fan.getAttribute('aria-valuemax'))
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const step = 6.4
  const cards = Array.from({ length: count }, () => {
    const card = new Image(560, 960)
    card.alt = ''
    card.src = 'assets/card-back.jpg'
    track.append(card)
    return card
  })
  let phase = Number(fan.getAttribute('aria-valuenow')) - 1
  let selected = phase
  let radius = 360
  let spacing = 40
  let frame = 0
  let drag
  const limit = value => Math.max(0, Math.min(count - 1, value))

  function paint() {
    cards.forEach((card, index) => {
      const relative = index - phase
      const angle = relative * step * Math.PI / 180
      const lift = Math.max(0, 1 - Math.abs(relative))
      const distance = radius + lift * 19
      const x = Math.sin(angle) * distance
      const y = radius - Math.cos(angle) * distance
      card.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${relative * step}deg) scale(${1 + lift * .09})`
      card.style.zIndex = String(Math.round((count - Math.abs(relative)) * 100))
      card.style.visibility = Math.abs(relative) > 8 ? 'hidden' : ''
    })
  }

  function settle(next) {
    cancelAnimationFrame(frame)
    selected = limit(Math.round(next))
    const label = `第 ${selected + 1} 张`
    position.textContent = `${label} / 共 ${count} 张`
    fan.setAttribute('aria-valuenow', String(selected + 1))
    fan.setAttribute('aria-valuetext', `${label}，共 ${count} 张`)
    for (const button of buttons) {
      const available = selected + Number(button.dataset.fanStep)
      button.setAttribute('aria-disabled', String(available !== limit(available)))
    }

    const start = phase
    const duration = reducedMotion.matches ? 0 : Math.min(520, 220 + 45 * Math.abs(selected - start))
    if (!duration || start === selected) {
      phase = selected
      paint()
      return
    }
    const began = performance.now()
    function glide(now) {
      const progress = Math.min(1, (now - began) / duration)
      phase = start + (selected - start) * (1 - (1 - progress) ** 3)
      paint()
      if (progress < 1) frame = requestAnimationFrame(glide)
    }
    frame = requestAnimationFrame(glide)
  }

  fan.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return
    cancelAnimationFrame(frame)
    fan.setPointerCapture(event.pointerId)
    drag = { id: event.pointerId, startPhase: phase, startX: event.clientX, x: event.clientX, time: event.timeStamp, velocity: 0 }
    fan.classList.add('is-dragging')
  })
  fan.addEventListener('pointermove', event => {
    if (event.pointerId !== drag?.id) return
    const elapsed = Math.max(1, event.timeStamp - drag.time)
    drag.velocity = (event.clientX - drag.x) / elapsed
    drag.x = event.clientX
    drag.time = event.timeStamp
    phase = limit(drag.startPhase + (drag.startX - drag.x) / spacing)
    paint()
  })
  function endDrag(event) {
    if (event.pointerId !== drag?.id) return
    const fling = event.type === 'pointerup' && event.timeStamp - drag.time < 90 && !reducedMotion.matches
    const glide = fling ? Math.max(-3, Math.min(3, -drag.velocity * 135 / spacing)) : 0
    drag = undefined
    fan.classList.remove('is-dragging')
    settle(phase + glide)
  }
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    fan.addEventListener(event, endDrag)
  }

  fan.addEventListener('keydown', event => {
    const shift = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[event.key]
    if (!shift && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    settle(event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : selected + shift)
  })
  for (const button of buttons) {
    button.addEventListener('click', () => settle(selected + Number(button.dataset.fanStep)))
  }
  const resize = new ResizeObserver(([entry]) => {
    if (!entry.contentRect.width) return
    radius = Math.min(390, Math.max(210, entry.contentRect.width * .64))
    spacing = radius * step * Math.PI / 180
    paint()
  })
  resize.observe(fan)
  paint()
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
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()

    const caption = link.querySelector('img')?.alt || link.getAttribute('aria-label') || link.textContent.trim() || '图片预览'
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

const directory = document.querySelector('#site-directory')
if (directory) {
  const trigger = document.querySelector('[data-directory-trigger]')
  const query = directory.querySelector('input')
  const close = directory.querySelector('[data-directory-close]')
  const wideLayout = window.matchMedia('(min-width: 64rem)')
  const status = directory.querySelector('[data-directory-status]')
  const list = directory.querySelector('[data-directory-list]')
  const ids = new Set([...document.querySelectorAll('[id]')].map(element => element.id))
  const caseNames = new Map([...document.querySelectorAll('.project-content h3 a')].map(link => [
    link.hash.slice(1), link.textContent.trim(),
  ]))
  const groups = []
  let group
  let track = ''
  let readingPosition = 0

  for (const heading of document.querySelectorAll('main :is(h2, h3, h4, h5, h6)')) {
    const demo = heading.closest('[data-demo]')
    if (heading.closest('[hidden]') || (demo && demo.getAttribute('aria-labelledby') !== heading.id)) continue
    const label = heading.dataset.directoryLabel || heading.textContent.trim().replace(/^\d+\s*[.、·]\s*/u, '')
    if (!label) continue
    const labelledSection = heading.closest('[aria-labelledby][id]')
    const target = labelledSection?.getAttribute('aria-labelledby') === heading.id ? labelledSection : heading
    const level = Number(heading.tagName.slice(1))
    if (!target.id) {
      const ancestor = target.parentElement.closest('[id]')
      const slug = label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
      const key = `${ancestor?.id || 'page'}-${slug}`
      let id = key
      for (let suffix = 2; ids.has(id); suffix++) id = `${key}-${suffix}`
      target.id = id
      ids.add(id)
    }
    if (level === 2) {
      group = { name: caseNames.get(target.id) || label, entries: [] }
      groups.push(group)
      track = ''
    }
    if (!group) continue
    if (level === 3) track = heading.closest('.case-track')?.querySelector('.eyebrow')?.textContent.trim() || ''
    const keywords = `${group.name} ${track} ${label} ${heading.dataset.directoryKeywords || ''}`
    group.entries.push({ label, target, level, track, keywords: keywords.normalize('NFKC').toLowerCase() })
  }

  function resultLink(entry, searching) {
    const link = document.createElement('a')
    link.href = `#${encodeURIComponent(entry.target.id)}`
    link.textContent = entry.label
    if (searching && entry.track) {
      const context = document.createElement('small')
      context.textContent = entry.track
      link.append(context)
    } else if (entry.level >= 4) {
      link.classList.add('directory-subentry')
    }
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      if (!wideLayout.matches) setDirectoryOpen(false)
      list.querySelector('[aria-current]')?.removeAttribute('aria-current')
      link.setAttribute('aria-current', 'location')
      entry.target.setAttribute('tabindex', '-1')
      entry.target.focus({ preventScroll: true })
    })
    return link
  }

  function renderDirectory() {
    const terms = query.value.normalize('NFKC').trim().toLowerCase().split(/\s+/).filter(Boolean)
    const searching = terms.length > 0
    list.replaceChildren()
    let count = 0
    for (const item of groups) {
      const entries = item.entries.filter(entry => terms.every(term => entry.keywords.includes(term)))
      if (!entries.length) continue
      count += entries.length
      if (!searching && entries.length === 1) {
        list.append(resultLink(entries[0], false))
        continue
      }

      const section = document.createElement(searching ? 'section' : 'details')
      const label = document.createElement(searching ? 'h3' : 'summary')
      label.textContent = item.name
      section.append(label)
      const links = document.createElement('div')
      links.className = 'directory-links'
      links.append(...entries.map(entry => resultLink(entry, searching)))
      section.append(links)
      list.append(section)
    }
    status.textContent = searching ? `找到 ${count} 个位置` : ''
    if (!count) {
      const empty = document.createElement('p')
      empty.textContent = '没有匹配的项目或章节。'
      list.append(empty)
    }
    directory.querySelector('.directory-results').scrollTop = 0
  }

  function setDirectoryOpen(open) {
    directory.hidden = !open
    directory.inert = !open
    trigger.setAttribute('aria-expanded', String(open))
  }

  function toggleDirectory() {
    if (directory.hidden) {
      readingPosition = window.scrollY
      setDirectoryOpen(true)
      if (wideLayout.matches) {
        query.focus({ preventScroll: true })
      } else {
        directory.querySelector('h2').focus({ preventScroll: true })
        directory.scrollIntoView({ block: 'start' })
      }
      return
    }
    const restorePosition = !wideLayout.matches && directory.getBoundingClientRect().bottom > 0
    setDirectoryOpen(false)
    if (restorePosition) window.scrollTo(0, readingPosition)
    trigger.focus({ preventScroll: true })
  }

  renderDirectory()
  trigger.hidden = false
  trigger.addEventListener('click', toggleDirectory)
  close.addEventListener('click', toggleDirectory)
  document.addEventListener('click', event => {
    if (!directory.hidden && !directory.contains(event.target) && !trigger.contains(event.target)) {
      setDirectoryOpen(false)
    }
  })
  query.addEventListener('input', renderDirectory)
  query.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.isComposing || !query.value.trim()) return
    event.preventDefault()
    list.querySelector('a')?.click()
  })
  for (const element of [directory, trigger]) {
    element.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || directory.hidden || event.defaultPrevented) return
      event.preventDefault()
      toggleDirectory()
    })
  }
}
