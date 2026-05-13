import './style.css'

const display = document.getElementById('display')
const toggleBtn = document.getElementById('toggle')
const clearBtn = document.getElementById('clear')

let running = false
let startTime = 0
let elapsed = 0
let rafId = null

function formatTime(ms) {
  const totalMs = ms % 1000
  const totalSec = Math.floor(ms / 1000)
  const sec = totalSec % 60
  const min = Math.floor(totalSec / 60) % 60
  const hr = Math.floor(totalSec / 3600)
  return `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(totalMs).padStart(3, '0')}`
}

function tick() {
  elapsed = Date.now() - startTime
  display.textContent = formatTime(elapsed)
  rafId = requestAnimationFrame(tick)
}

toggleBtn.addEventListener('click', () => {
  if (running) {
    cancelAnimationFrame(rafId)
    running = false
    toggleBtn.textContent = 'Start'
  } else {
    startTime = Date.now() - elapsed
    running = true
    toggleBtn.textContent = 'Pause'
    tick()
  }
})

clearBtn.addEventListener('click', () => {
  cancelAnimationFrame(rafId)
  running = false
  elapsed = 0
  display.textContent = '00:00:00.000'
  toggleBtn.textContent = 'Start'
})

const themeColorMeta = document.querySelector('meta[name="theme-color"]')
const darkColor = '#0a0a0a'
const lightColor = '#f5f5f5'

function updateThemeColor(e) {
  themeColorMeta.content = e.matches ? darkColor : lightColor
}

const mql = window.matchMedia('(prefers-color-scheme: dark)')
updateThemeColor(mql)
mql.addEventListener('change', updateThemeColor)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
