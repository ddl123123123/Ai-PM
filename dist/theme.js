(() => {
  const root = document.documentElement
  const storageKey = 'portfolio-color-theme'

  try {
    if (localStorage.getItem(storageKey) === 'green') root.dataset.theme = 'green'
  } catch {
    // The default theme is available without storage.
  }

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.theme-toggle')
    if (!toggle) return
    const label = toggle.querySelector('strong')
    const themeColor = document.querySelector('meta[name="theme-color"]')

    function sync() {
      const green = root.dataset.theme === 'green'
      toggle.setAttribute('aria-checked', String(green))
      label.textContent = green ? '绿色' : '紫色'
      themeColor?.setAttribute('content', green ? '#070e0c' : '#08070b')
    }

    toggle.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'green' ? 'purple' : 'green'
      sync()
      try {
        localStorage.setItem(storageKey, root.dataset.theme)
      } catch {
        // The switch still applies to the current page.
      }
    })

    sync()
    toggle.dataset.ready = ''
  })
})()
