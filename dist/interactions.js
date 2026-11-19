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
