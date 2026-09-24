import './style.css'

const display = document.getElementById('display')
const toggleBtn = document.getElementById('toggle')
const clearBtn = document.getElementById('clear')
const stopAlarmBtn = document.getElementById('stop-alarm')
const modeLabel = document.getElementById('mode-label')
const menuToggle = document.getElementById('menu-toggle')
const menuOptions = document.getElementById('clock-options')
const modeButtons = document.querySelectorAll('[data-mode]')
const durationConfig = document.getElementById('duration-config')
const durationInputs = [...durationConfig.querySelectorAll('input[type="number"]')]
const hoursInput = document.getElementById('hours')
const minutesInput = document.getElementById('minutes')
const secondsInput = document.getElementById('seconds')
const infiniteAlarmInput = document.getElementById('infinite-alarm')
const controls = document.querySelector('.controls')

const clockModeKey = 'chronos-clock-mode'
const countdownDurationKey = 'chronos-countdown-duration'
let countdownDuration = 5 * 60 * 1000
let mode = 'stopwatch'
let running = false
let startTime = 0
let elapsed = 0
let rafId = null
let finishTimeout = null
let audioContext = null
let alarmInterval = null
const activeOscillators = new Set()

function formatTime(ms) {
  const totalMs = ms % 1000
  const totalSec = Math.floor(ms / 1000)
  const sec = totalSec % 60
  const min = Math.floor(totalSec / 60) % 60
  const hr = Math.floor(totalSec / 3600)
  return `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(totalMs).padStart(3, '0')}`
}

function stopClock() {
  cancelAnimationFrame(rafId)
  clearTimeout(finishTimeout)
  running = false
  toggleBtn.textContent = 'Start'
  durationInputs.forEach((input) => { input.disabled = false })
  infiniteAlarmInput.disabled = false
}

function playAlarmSequence() {
  if (!audioContext) return

  const start = audioContext.currentTime
  ;[0, 0.28, 0.56].forEach((delay, index) => {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const toneStart = start + delay

    oscillator.type = 'sine'
    oscillator.frequency.value = index === 2 ? 1046 : 880
    gain.gain.setValueAtTime(0.0001, toneStart)
    gain.gain.exponentialRampToValueAtTime(0.35, toneStart + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + 0.2)
    oscillator.connect(gain).connect(audioContext.destination)
    activeOscillators.add(oscillator)
    oscillator.addEventListener('ended', () => activeOscillators.delete(oscillator))
    oscillator.start(toneStart)
    oscillator.stop(toneStart + 0.21)
  })
}

function stopAlarm() {
  clearInterval(alarmInterval)
  alarmInterval = null
  activeOscillators.forEach((oscillator) => oscillator.stop())
  activeOscillators.clear()
  stopAlarmBtn.hidden = true
  controls.classList.remove('alarm-active')
  display.classList.remove('finished', 'ringing')
}

function playAlarm() {
  playAlarmSequence()

  if (infiniteAlarmInput.checked) {
    alarmInterval = setInterval(playAlarmSequence, 900)
    stopAlarmBtn.hidden = false
    controls.classList.add('alarm-active')
    display.classList.add('ringing')
  } else {
    display.classList.add('finished')
    setTimeout(() => display.classList.remove('finished'), 1200)
  }
}

function completeCountdown() {
  if (!running || mode !== 'countdown') return

  elapsed = countdownDuration
  stopClock()
  display.textContent = formatTime(0)
  playAlarm()
}

function tick() {
  elapsed = Date.now() - startTime

  if (mode === 'countdown') {
    const remaining = Math.max(0, countdownDuration - elapsed)
    display.textContent = formatTime(remaining)
    if (remaining === 0) {
      completeCountdown()
      return
    }
  } else {
    display.textContent = formatTime(elapsed)
  }

  rafId = requestAnimationFrame(tick)
}

async function toggleClock() {
  if (running) {
    stopClock()
  } else {
    stopAlarm()
    if (mode === 'countdown') {
      audioContext ??= new AudioContext()
      await audioContext.resume()
      if (elapsed >= countdownDuration) elapsed = 0
      finishTimeout = setTimeout(completeCountdown, countdownDuration - elapsed)
    }

    display.classList.remove('finished')
    startTime = Date.now() - elapsed
    running = true
    toggleBtn.textContent = 'Pause'
    durationInputs.forEach((input) => { input.disabled = true })
    infiniteAlarmInput.disabled = true
    tick()
  }
}

function resetClock() {
  stopAlarm()
  stopClock()
  elapsed = 0
  display.classList.remove('finished')
  display.textContent = formatTime(mode === 'countdown' ? countdownDuration : 0)
}

function closeMenu() {
  menuOptions.hidden = true
  menuToggle.setAttribute('aria-expanded', 'false')
}

function selectMode(nextMode) {
  mode = nextMode
  localStorage.setItem(clockModeKey, mode)
  modeLabel.textContent = mode === 'countdown' ? 'Countdown timer' : 'Stopwatch'
  clearBtn.textContent = mode === 'countdown' ? 'Reset' : 'Clear'
  toggleBtn.disabled = mode === 'countdown' && countdownDuration === 0
  durationConfig.hidden = mode !== 'countdown'
  modeButtons.forEach((button) => button.classList.toggle('active', button.dataset.mode === mode))
  resetClock()
  closeMenu()
}

function updateCountdownDuration() {
  const clampInput = (input) => {
    const value = Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value) || 0))
    input.value = value
    return value
  }

  const hours = clampInput(hoursInput)
  const minutes = clampInput(minutesInput)
  const seconds = clampInput(secondsInput)
  countdownDuration = ((hours * 60 + minutes) * 60 + seconds) * 1000
  localStorage.setItem(countdownDurationKey, String(countdownDuration))
  toggleBtn.disabled = countdownDuration === 0
  resetClock()
}

toggleBtn.addEventListener('click', toggleClock)

clearBtn.addEventListener('click', resetClock)
stopAlarmBtn.addEventListener('click', stopAlarm)

menuToggle.addEventListener('click', () => {
  const opening = menuOptions.hidden
  menuOptions.hidden = !opening
  menuToggle.setAttribute('aria-expanded', String(opening))
})

modeButtons.forEach((button) => button.addEventListener('click', () => selectMode(button.dataset.mode)))
durationInputs.forEach((input) => input.addEventListener('change', updateCountdownDuration))

document.addEventListener('click', (event) => {
  if (!event.target.closest('.clock-menu')) closeMenu()
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeMenu()
    menuToggle.focus()
  }
})

const savedDuration = localStorage.getItem(countdownDurationKey)
const parsedDuration = Number(savedDuration)
const maximumDuration = ((99 * 60 + 59) * 60 + 59) * 1000

if (savedDuration !== null && Number.isFinite(parsedDuration) && parsedDuration >= 0 && parsedDuration <= maximumDuration) {
  countdownDuration = parsedDuration
  const totalSeconds = Math.floor(countdownDuration / 1000)
  hoursInput.value = Math.floor(totalSeconds / 3600)
  minutesInput.value = Math.floor(totalSeconds / 60) % 60
  secondsInput.value = totalSeconds % 60
}

const savedMode = localStorage.getItem(clockModeKey)
selectMode(savedMode === 'countdown' ? 'countdown' : 'stopwatch')

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
