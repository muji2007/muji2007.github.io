(() => {
  const MODE_STORAGE_KEY = 'sidebar-music-mode';
  const desktop = window.matchMedia('(min-width: 769px)');

  const getPlayerCard = () => document.querySelector('.music-floating-player');
  const getPlayer = () => document.querySelector('.music-floating-player .aplayer');
  const getList = () => document.querySelector('.music-floating-player .aplayer-list');

  const getNativeButton = selector => document.querySelector(`.music-floating-player ${selector}`);

  const moveSidebarPlayer = () => {
    const playerCard = getPlayerCard();
    const stickyLayout = document.querySelector('.home-sidebar-container .sticky-container, #aside-content .sticky_layout');

    if (!playerCard) return;

    const inSidebar = Boolean(stickyLayout && desktop.matches);
    const launcher = getLauncher();
    launcher.hidden = inSidebar;
    playerCard.classList.toggle('is-floating', !inSidebar);

    if (inSidebar) {
      if (!stickyLayout.contains(playerCard)) {
        const profile = stickyLayout.querySelector('.sidebar-content');
        if (profile) profile.insertAdjacentElement('afterend', playerCard);
        else stickyLayout.prepend(playerCard);
      }
      playerCard.classList.remove('is-open');
      launcher.setAttribute('aria-expanded', 'false');
    } else if (playerCard.parentElement !== document.body) {
      document.body.appendChild(playerCard);
    }

    playerCard.classList.add('is-mounted');
  };

  const getLauncher = () => {
    let launcher = document.querySelector('.music-player-launcher');
    if (launcher) return launcher;

    const card = getPlayerCard();
    card.id = 'blog-music-player';
    launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'music-player-launcher';
    launcher.innerHTML = '<i class="fas fa-compact-disc" aria-hidden="true"></i><span>Music</span>';
    launcher.setAttribute('aria-controls', card.id);
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-label', '展开或收起音乐播放器');
    launcher.addEventListener('click', () => {
      const open = card.classList.toggle('is-open');
      launcher.setAttribute('aria-expanded', String(open));
    });
    document.body.appendChild(launcher);
    return launcher;
  };

  const readPlayerSettings = () => {
    const storageKeys = ['metingjs', 'aplayer-setting'];

    for (const key of storageKeys) {
      let raw;
      try { raw = window.localStorage.getItem(key); } catch (_) { continue; }
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          const entry = parsed.find(item => item && typeof item === 'object' && ('order' in item || 'loop' in item));
          if (entry) return entry;
        }

        if (parsed && typeof parsed === 'object') {
          if ('order' in parsed || 'loop' in parsed) return parsed;
          if (parsed.currentSettings && typeof parsed.currentSettings === 'object') return parsed.currentSettings;
        }
      } catch (error) {
        // Ignore malformed values and continue probing.
      }
    }

    return null;
  };

  const readMode = () => {
    let savedMode;
    try { savedMode = window.localStorage.getItem(MODE_STORAGE_KEY); } catch (_) { /* Storage may be disabled. */ }
    if (['list', 'random', 'single'].includes(savedMode)) return savedMode;

    const settings = readPlayerSettings();
    if (settings?.order === 'random') return 'random';
    if (settings?.loop === 'one') return 'single';

    return 'list';
  };

  const saveMode = mode => {
    try { window.localStorage.setItem(MODE_STORAGE_KEY, mode); } catch (_) { /* Storage may be disabled. */ }
  };

  const hidePlaylist = () => {
    const player = getPlayer();
    const list = getList();

    if (!player || !list) return;

    player.classList.add('aplayer-withlist');
    list.classList.add('aplayer-list-hide');
  };

  const showPlaylist = () => {
    const player = getPlayer();
    const list = getList();

    if (!player || !list) return;

    player.classList.add('aplayer-withlist');
    list.classList.remove('aplayer-list-hide');
  };

  const togglePlaylist = () => {
    const list = getList();
    if (!list) return;

    if (list.classList.contains('aplayer-list-hide')) {
      showPlaylist();
    } else {
      hidePlaylist();
    }

    syncCustomButtons();
  };

  const syncPlayButton = () => {
    const player = getPlayer();
    const playButton = document.querySelector('.music-player-action--play');
    if (!player || !playButton) return;

    const icon = playButton.querySelector('i');
    const isPlaying = window.blogMusicPlayer ? !window.blogMusicPlayer.audio.paused : false;

    icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
    playButton.setAttribute('title', isPlaying ? '暂停播放' : '继续播放');
    playButton.setAttribute('aria-label', isPlaying ? '暂停播放' : '继续播放');
  };

  const syncModeButton = () => {
    const modeButton = document.querySelector('.music-player-action--mode');
    if (!modeButton) return;

    const icon = modeButton.querySelector('i');
    const badge = modeButton.querySelector('.music-player-mode-badge');
    const mode = readMode();

    modeButton.dataset.mode = mode;
    badge.textContent = mode === 'single' ? '1' : '';

    if (mode === 'random') {
      icon.className = 'fas fa-shuffle';
      modeButton.setAttribute('title', '随机播放');
      modeButton.setAttribute('aria-label', '随机播放');
    } else {
      icon.className = 'fas fa-repeat';
      modeButton.setAttribute('title', mode === 'single' ? '单曲循环' : '列表循环');
      modeButton.setAttribute('aria-label', mode === 'single' ? '单曲循环' : '列表循环');
    }
  };

  const syncListButton = () => {
    const listButton = document.querySelector('.music-player-action--list');
    const list = getList();
    if (!listButton || !list) return;

    const expanded = !list.classList.contains('aplayer-list-hide');
    listButton.classList.toggle('is-active', expanded);
    listButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };

  const syncCustomButtons = () => {
    syncPlayButton();
    syncModeButton();
    syncListButton();
  };

  const cycleMode = () => {
    const instance = window.blogMusicPlayer;
    const orderButton = getNativeButton('.aplayer-icon-order');
    const loopButton = getNativeButton('.aplayer-icon-loop');

    if (!instance || !orderButton || !loopButton) return;

    const currentMode = readMode();
    const nextMode = currentMode === 'list' ? 'random' : currentMode === 'random' ? 'single' : 'list';

    const desiredOrder = nextMode === 'random' ? 'random' : 'list';
    const desiredLoop = nextMode === 'single' ? 'one' : 'all';
    if (instance.options.order !== desiredOrder) orderButton.click();
    for (let attempt = 0; instance.options.loop !== desiredLoop && attempt < 3; attempt++) loopButton.click();

    saveMode(nextMode);
    syncModeButton();
  };

  const buildCustomControls = () => {
    const info = document.querySelector('.music-floating-player .aplayer-info');
    const controller = document.querySelector('.music-floating-player .aplayer-controller');
    const music = document.querySelector('.music-floating-player .aplayer-music');

    if (!info || !controller || !music || info.querySelector('.music-player-actions')) return;

    const actions = document.createElement('div');
    actions.className = 'music-player-actions';
    actions.innerHTML = [
      '<button class="music-player-action music-player-action--prev" type="button" title="上一首" aria-label="上一首"><i class="fas fa-backward-step"></i></button>',
      '<button class="music-player-action music-player-action--play" type="button" title="播放" aria-label="播放"><i class="fas fa-play"></i></button>',
      '<button class="music-player-action music-player-action--next" type="button" title="下一首" aria-label="下一首"><i class="fas fa-forward-step"></i></button>',
      '<button class="music-player-action music-player-action--mode" type="button" title="列表循环" aria-label="列表循环"><i class="fas fa-repeat"></i><span class="music-player-mode-badge"></span></button>',
      '<button class="music-player-action music-player-action--list" type="button" title="歌单列表" aria-label="歌单列表" aria-expanded="false"><i class="fas fa-list"></i></button>'
    ].join('');

    music.insertAdjacentElement('afterend', actions);

    const progress = controller.querySelector('.aplayer-bar-wrap');
    if (progress && !info.querySelector('.music-player-progress')) {
      const progressSlot = document.createElement('div');
      progressSlot.className = 'music-player-progress';
      progressSlot.appendChild(progress);
      info.appendChild(progressSlot);
    }

    actions.querySelector('.music-player-action--prev')?.addEventListener('click', () => {
      getNativeButton('.aplayer-icon-back')?.click();
    });

    actions.querySelector('.music-player-action--play')?.addEventListener('click', () => {
      // Trigger APlayer's main control directly. The smaller controller icon is
      // not consistently interactive across browsers and touch devices.
      const nativePlayButton = getNativeButton('.aplayer-pic .aplayer-button')
        || getNativeButton('.aplayer-icon-play');
      nativePlayButton?.click();
      window.setTimeout(syncPlayButton, 80);
    });

    actions.querySelector('.music-player-action--next')?.addEventListener('click', () => {
      getNativeButton('.aplayer-icon-forward')?.click();
    });

    actions.querySelector('.music-player-action--mode')?.addEventListener('click', cycleMode);

    actions.querySelector('.music-player-action--list')?.addEventListener('click', () => {
      togglePlaylist();
    });
  };

  const observePlayerState = () => {
    const player = getPlayer();
    if (!player || player.dataset.sidebarObserved === 'true') return;

    const observer = new MutationObserver(() => {
      syncCustomButtons();
    });

    observer.observe(player, {
      attributes: true,
      attributeFilter: ['class']
    });

    const nativePlayButton = getNativeButton('.aplayer-pic .aplayer-button');
    if (nativePlayButton) {
      observer.observe(nativePlayButton, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    player.dataset.sidebarObserved = 'true';
  };

  const hydratePlayerUi = () => {
    moveSidebarPlayer();
    buildCustomControls();
    hidePlaylist();
    saveMode(readMode());
    syncCustomButtons();
    observePlayerState();
  };

  const loadPlaylist = async () => {
    const player = getPlayer();
    const status = getPlayerCard()?.querySelector('.music-player-status');
    if (!player || window.blogMusicPlayer || player.dataset.loading === 'true') return;
    player.dataset.loading = 'true';
    status.hidden = false;
    status.textContent = '正在加载歌单…';

    try {
      const url = player.dataset.api
        .replace(':server', player.dataset.server)
        .replace(':type', player.dataset.type)
        .replace(':id', player.dataset.id)
        .replace(':r', Math.random());
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Playlist returned ${response.status}`);
      const audio = await response.json();
      if (!Array.isArray(audio) || !audio.length) throw new Error('Playlist is empty');

      const mode = readMode();
      window.blogMusicPlayer = new APlayer({
        container: player,
        audio: audio.map(track => ({ ...track, type: 'wallpaper-audio' })),
        customAudioType: {
          'wallpaper-audio': (element, track) => {
            // Set before the URL so Web Audio can inspect CORS-authorized music.
            element.crossOrigin = 'anonymous';
            element.src = track.url;
          }
        },
        autoplay: false,
        theme: player.dataset.theme,
        order: mode === 'random' ? 'random' : 'list',
        loop: mode === 'single' ? 'one' : 'all',
        preload: 'metadata',
        volume: Number(player.dataset.volume),
        mutex: true,
        listFolded: true,
        listMaxHeight: player.dataset.listMaxHeight,
        lrcType: 0,
        storageName: 'metingjs'
      });
      window.blogMusicPlayer.on('play', () => {
        player.classList.add('aplayer-playing');
        syncPlayButton();
      });
      window.blogMusicPlayer.on('pause', () => {
        player.classList.remove('aplayer-playing');
        syncPlayButton();
      });
      status.hidden = true;
      hydratePlayerUi();
      document.dispatchEvent(new CustomEvent('blog:music-ready'));
    } catch (error) {
      console.warn('音乐歌单加载失败：', error);
      status.textContent = '歌单暂时无法加载。';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = '重试';
      retry.className = 'music-player-retry';
      retry.addEventListener('click', loadPlaylist);
      status.appendChild(retry);
    } finally {
      delete player.dataset.loading;
    }
  };

  const mountPlayer = () => {
    moveSidebarPlayer();
    loadPlaylist();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountPlayer, { once: true });
  } else {
    mountPlayer();
  }

  document.addEventListener('pjax:complete', mountPlayer);
  desktop.addEventListener('change', moveSidebarPlayer);
  document.addEventListener('keydown', event => {
    const card = getPlayerCard();
    if (event.key === 'Escape' && card?.classList.contains('is-open')) {
      card.classList.remove('is-open');
      const launcher = getLauncher();
      launcher.setAttribute('aria-expanded', 'false');
      launcher.focus();
    }
  });
})();
