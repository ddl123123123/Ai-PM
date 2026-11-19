for (const demo of document.querySelectorAll('[data-demo]')) {
  const controls = [...demo.querySelectorAll('[data-demo-step]')]
  const panels = controls.map(control => document.getElementById(control.getAttribute('aria-controls')))
  const status = demo.querySelector('[data-demo-status]')

  controls.forEach((control, index) => {
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
