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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', moveSidebarPlayer, { once: true })
  } else {
    moveSidebarPlayer()
  }

  document.addEventListener('pjax:complete', moveSidebarPlayer)
})()
