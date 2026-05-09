(() => {
  const moveSidebarPlayer = () => {
    const playerCard = document.querySelector('.music-floating-player')
    const stickyLayout = document.querySelector('#aside-content .sticky_layout')

    if (!playerCard || !stickyLayout) return

    if (!stickyLayout.contains(playerCard)) {
      stickyLayout.prepend(playerCard)
    }

    playerCard.classList.add('is-mounted')
  }

  const ensureFoldedList = () => {
    const player = document.querySelector('.music-floating-player .aplayer')
    const list = document.querySelector('.music-floating-player .aplayer-list')

    if (!player || !list) return

    player.classList.add('aplayer-withlist')
    list.classList.add('aplayer-list-hide')
  }

  const mountPlayer = () => {
    moveSidebarPlayer()
    window.setTimeout(ensureFoldedList, 800)
    window.setTimeout(ensureFoldedList, 1800)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountPlayer, { once: true })
  } else {
    mountPlayer()
  }

  document.addEventListener('pjax:complete', mountPlayer)
})()
