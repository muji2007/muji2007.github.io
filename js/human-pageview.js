/*
 * Load the Busuanzi counter only for plausible human visits.
 *
 * This is a statistics guard, not an access-control boundary. GitHub Pages is
 * a static host, so determined crawlers must be blocked at a CDN/WAF instead.
 */
(function () {
  'use strict'

  var userAgent = navigator.userAgent || ''
  var botPattern = /bot\b|spider|crawler|slurp|headless|phantom|selenium|puppeteer|playwright|lighthouse|pagespeed|curl|wget|python-requests|httpclient|scrapy|facebookexternalhit|twitterbot|linkedinbot/i
  var isAutomated = Boolean(navigator.webdriver) || botPattern.test(userAgent)

  function replaceSpinners(value) {
    var ids = [
      'busuanzi_value_site_uv',
      'busuanzi_value_site_pv',
      'busuanzi_value_page_pv'
    ]

    ids.forEach(function (id) {
      var element = document.getElementById(id)
      if (element) element.textContent = value
    })
  }

  if (isAutomated || document.visibilityState === 'prerender') {
    replaceSpinners('\u2014')
    return
  }

  var loaded = false
  var timer
  var interactionEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll']

  function cleanup() {
    window.clearTimeout(timer)
    interactionEvents.forEach(function (eventName) {
      window.removeEventListener(eventName, loadCounter, true)
    })
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }

  function loadCounter() {
    if (loaded || document.visibilityState !== 'visible' || !document.hasFocus()) return

    loaded = true
    cleanup()

    var script = document.createElement('script')
    script.async = true
    script.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js'
    script.onerror = function () {
      replaceSpinners('\u2014')
    }
    document.head.appendChild(script)
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      timer = window.setTimeout(loadCounter, 8000)
    } else {
      window.clearTimeout(timer)
    }
  }

  interactionEvents.forEach(function (eventName) {
    window.addEventListener(eventName, loadCounter, { capture: true, once: true, passive: true })
  })
  document.addEventListener('visibilitychange', onVisibilityChange)
  timer = window.setTimeout(loadCounter, 8000)
})()
