// Browser adaptation of the locally supplied No.454 Workshop scene 3776778760.
// Original images, placements and motion masks are converted by prepare-lime-wallpaper.py.
const root = document.querySelector('.home-banner-background');
const assets = '/images/wallpapers/lime/';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const compact = matchMedia('(max-width: 768px)');

const vertex = `#version 300 es
in vec2 a_position;
uniform vec2 u_viewport, u_origin, u_size;
uniform float u_angle;
out vec2 v_uv;
void main() {
  vec2 p = (a_position - .5) * u_size;
  float c = cos(u_angle), s = sin(u_angle);
  p = mat2(c, s, -s, c) * p + u_origin;
  gl_Position = vec4(p.x / u_viewport.x * 2. - 1., 1. - p.y / u_viewport.y * 2., 0., 1.);
  v_uv = a_position;
}`;

const imageFragment = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 color;
uniform sampler2D u_image, u_flow, u_phase, u_opacity, u_waveMask, u_wavePhase;
uniform vec4 u_shake, u_wave, u_flags;
uniform float u_time;
vec4 shake(vec2 uv) {
  if (u_shake.w < .5) return texture(u_image, uv);
  float phase = u_flags.x > .5 ? texture(u_phase, uv).r * 6.2831853 : 0.;
  float value = sin(u_time * u_shake.x + phase) * .498 + .5;
  if (u_shake.z < .5) value = value * 2. - 1.;
  else if (u_shake.z > 1.5) value -= 1.;
  vec2 flow = (texture(u_flow, uv).rg - vec2(.498)) * 2.;
  vec2 offset = value * u_shake.y * u_shake.y * flow;
  vec4 moved = texture(u_image, uv + offset);
  if (u_flags.y > .5) moved = mix(texture(u_image, uv), moved, texture(u_opacity, uv + offset).r);
  return moved;
}
void main() {
  vec2 uv = v_uv;
  if (u_wave.z > 0.) {
    vec2 direction = vec2(-sin(u_wave.w), cos(u_wave.w));
    float distance = u_time * u_wave.x + dot(uv, direction) * u_wave.y;
    if (u_flags.w > .5) distance += texture(u_wavePhase, uv).r * 6.2831853;
    float mask = u_flags.z > .5 ? texture(u_waveMask, uv).r : 1.;
    uv += sin(distance) * vec2(direction.y, -direction.x) * u_wave.z * u_wave.z * mask;
  }
  color = shake(uv);
}`;

const spectrumFragment = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 color;
uniform sampler2D u_mask;
uniform float u_time, u_spectrum[64];
void main() {
  vec2 uv = vec2(v_uv.x, 1. - v_uv.y);
  vec2 p = uv - .5;
  float a = u_time * .2, c = cos(a), s = sin(a);
  if (length(p) < .499) p = mat2(c, s, -s, c) * p;
  float distance = 1.;
  // Radial bars are narrower than one angular sector, even at maximum height.
  // Only the nearest sector and its neighbours can cover this pixel.
  int nearest = int(floor(atan(p.x, p.y + .0000001) * 64. / 6.2831853 + .5));
  for (int neighbour = -1; neighbour <= 1; neighbour++) {
    int i = (nearest + neighbour + 64) % 64;
    float theta = 6.2831853 * float(i) / 64.;
    float h = clamp(u_spectrum[i], 0., 1.) * .1;
    vec2 axis = vec2(sin(theta), cos(theta));
    vec2 delta = p - .3 * axis;
    float ct = cos(theta), st = sin(theta);
    vec2 q = vec2(ct * delta.x - st * delta.y, st * delta.x + ct * delta.y);
    float rectangle = max(abs(q.x) - .004, abs(q.y) - h);
    float cap1 = length(p - (.3 - h) * axis) - .004;
    float cap2 = length(p - (.3 + h) * axis) - .004;
    distance = min(distance, min(rectangle, min(cap1, cap2)));
  }
  float coverage = 1. - smoothstep(-fwidth(distance), fwidth(distance), distance);
  color = vec4(vec3(1.), coverage * texture(u_mask, uv).r);
}`;

async function start() {
  if (!root) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'lime-wallpaper-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) return; // The poster remains visible; the music player is independent.
  const scene = await fetch(assets + 'scene.json').then(r => {
    if (!r.ok) throw new Error('Wallpaper scene could not be loaded');
    return r.json();
  });
  const state = {
    ready: false, frames: 0, audioConnected: false, peak: 0, reducedMotion: reduced.matches,
    renderWidth: 0, renderHeight: 0, targetFps: compact.matches ? 30 : 60,
    fps: 0, quality: 1, cpuMs: 0, gpuMs: null, mipmappedTextures: 0, spectrumCandidates: 3
  };
  window.blogWallpaper = { snapshot: () => ({ ...state, glError: gl.getError() }) };

  // Start the same asset requests before compiling shaders, overlapping network
  // and decode work with GPU setup instead of making downloads wait for it.
  const names = new Set();
  for (const layer of scene.layers) {
    if (layer.image) names.add(layer.image);
    if (layer.mask) names.add(layer.mask);
    for (const effect of layer.effects || []) for (const mask of effect.masks) if (mask) names.add(mask);
  }
  const imageLoads = [...names].map(name => {
    const img = new Image();
    img.src = assets + name;
    return img.decode().then(() => ({ name, img }), error => ({ error }));
  });

  function program(fragment) {
    const result = gl.createProgram();
    for (const [type, text] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, text);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(result, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(result);
    if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result));
    const locations = new Map();
    return { value: result, position: gl.getAttribLocation(result, 'a_position'), location(name) {
      if (!locations.has(name)) locations.set(name, gl.getUniformLocation(result, name));
      return locations.get(name);
    } };
  }
  const programs = { image: program(imageFragment), spectrum: program(spectrumFragment) };
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
  const textures = new Map();
  const imageNames = new Set(scene.layers.filter(layer => layer.kind === 'image').map(layer => layer.image));
  const colorTextures = [];
  function createTexture(source) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (source) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    return t;
  }
  const blank = createTexture();
  await Promise.all(imageLoads.map(async load => {
    const { name, img, error } = await load;
    if (error) throw error;
    const texture = createTexture(img);
    textures.set(name, texture);
    if (imageNames.has(name)) colorTextures.push(texture);
  }));

  // Mipmaps are generated on-device after the first visible frame, one texture
  // per idle task. Flow/phase masks retain their original bilinear sampling.
  function scheduleMipmaps() {
    const queue = colorTextures.slice();
    function next() {
      if (!state.ready || !queue.length) return;
      gl.bindTexture(gl.TEXTURE_2D, queue.shift());
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      state.mipmappedTextures++;
      if (queue.length) schedule();
      else if (reduced.matches) draw(0);
    }
    function schedule() {
      if ('requestIdleCallback' in window) window.requestIdleCallback(next, { timeout: 1000 });
      else window.setTimeout(next, 32);
    }
    // Give the first canvas frame a paint opportunity before preparing mipmaps.
    window.setTimeout(schedule, 100);
  }

  const qualitySteps = [1, .82, .66];
  const maxDimension = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
  let qualityIndex = 0, smallScreen = compact.matches;
  let width = 0, height = 0, scale = 1, offsetX = 0, offsetY = 0, frame = 0, nextFrameAt = 0;
  root.appendChild(canvas);
  function resize(entry) {
    const bounds = root.getBoundingClientRect();
    width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
    if (smallScreen !== compact.matches) {
      smallScreen = compact.matches; qualityIndex = 0;
      state.targetFps = smallScreen ? 30 : 60;
    }
    const box = entry?.devicePixelContentBoxSize?.[0];
    const expectedWidth = Math.round(width * (devicePixelRatio || 1));
    const expectedHeight = Math.round(height * (devicePixelRatio || 1));
    // Some browsers/emulated displays report CSS pixels in the device-pixel box.
    // Accept the exact observed box only when its units agree with the display.
    const exactBox = box && Math.abs(box.inlineSize - expectedWidth) <= 2 && Math.abs(box.blockSize - expectedHeight) <= 2;
    const desiredWidth = exactBox ? box.inlineSize : expectedWidth;
    const desiredHeight = exactBox ? box.blockSize : expectedHeight;
    const pixelBudget = smallScreen ? 1500000 : 2560 * 1440;
    const resolution = Math.min(1, Math.sqrt(pixelBudget / (desiredWidth * desiredHeight)),
      maxDimension / desiredWidth, maxDimension / desiredHeight) * qualitySteps[qualityIndex];
    const drawWidth = Math.max(1, Math.floor(desiredWidth * resolution));
    const drawHeight = Math.max(1, Math.floor(desiredHeight * resolution));
    if (canvas.width !== drawWidth) canvas.width = drawWidth;
    if (canvas.height !== drawHeight) canvas.height = drawHeight;
    state.renderWidth = canvas.width; state.renderHeight = canvas.height;
    state.quality = qualitySteps[qualityIndex];
    scale = Math.max(width / scene.width, height / scene.height);
    offsetX = Math.min(0, Math.max(width - scene.width * scale, width / 2 - scene.focusX * scale));
    offsetY = (height - scene.height * scale) / 2;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  const resizeObserver = new ResizeObserver(entries => {
    resize(entries[0]); if (state.ready && reduced.matches) draw(0);
  });
  try { resizeObserver.observe(root, { box: 'device-pixel-content-box' }); }
  catch { resizeObserver.observe(root); }
  window.addEventListener('resize', () => { resize(); if (state.ready && reduced.matches) draw(0); });
  compact.addEventListener('change', () => { resize(); if (state.ready && reduced.matches) draw(0); });

  // Optional GPU timers are read only after completion; never wait for the GPU.
  const gpuTimer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const gpuQueries = [];
  let windowStart = 0, windowFrames = 0, windowCpu = 0, windowGpu = 0, gpuSamples = 0;
  let minRafGap = Infinity, lastRafAt = 0, graceUntil = 0, slowWindows = 0, fastWindows = 0;
  let resizePending = false;
  function resetMeasurements(now) {
    windowStart = now; windowFrames = 0; windowCpu = 0; windowGpu = 0; gpuSamples = 0;
    minRafGap = Infinity;
  }
  function pollGpu() {
    if (!gpuTimer || !gpuQueries.length) return;
    const disjoint = gl.getParameter(gpuTimer.GPU_DISJOINT_EXT);
    while (gpuQueries.length) {
      const query = gpuQueries[0];
      if (!disjoint && !gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) break;
      gpuQueries.shift();
      if (!disjoint) { windowGpu += gl.getQueryParameter(query, gl.QUERY_RESULT) / 1000000; gpuSamples++; }
      gl.deleteQuery(query);
    }
  }
  function assessPerformance(now) {
    const elapsed = now - windowStart;
    if (elapsed < 2000 || !windowFrames) return;
    state.fps = Math.round(windowFrames * 10000 / elapsed) / 10;
    state.cpuMs = Math.round(windowCpu * 100 / windowFrames) / 100;
    state.gpuMs = gpuSamples ? Math.round(windowGpu * 100 / gpuSamples) / 100 : null;
    const budget = 1000 / state.targetFps;
    const work = Math.max(state.cpuMs, state.gpuMs || 0);
    const displayFps = Number.isFinite(minRafGap) ? Math.min(240, 1000 / minRafGap) : state.targetFps;
    const missed = state.fps < Math.min(state.targetFps, displayFps) * .82;
    if (now >= graceUntil) {
      slowWindows = work > budget * .7 || missed ? slowWindows + 1 : 0;
      fastWindows = !missed && work < budget * .4 ? fastWindows + 1 : 0;
      if (slowWindows >= 2) {
        if (qualityIndex < qualitySteps.length - 1) { qualityIndex++; resizePending = true; }
        else state.targetFps = 30;
        slowWindows = 0; fastWindows = 0;
      } else if (fastWindows >= 4) {
        if (qualityIndex > 0) { qualityIndex--; resizePending = true; }
        else if (!smallScreen) state.targetFps = 60;
        slowWindows = 0; fastWindows = 0;
      }
    }
    resetMeasurements(now);
  }

  const spectrum = new Float32Array(64);
  let context, analyser, source, audio, samples, frequencyBins;
  function connectAudio() {
    if (!state.ready || reduced.matches || !window.blogMusicPlayer) return;
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audio = window.blogMusicPlayer.audio;
      if (audio.crossOrigin !== 'anonymous') return;
      context = new AudioContext();
      source = context.createMediaElementSource(audio);
      analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyser.smoothingTimeConstant = .65;
      samples = new Uint8Array(analyser.frequencyBinCount);
      frequencyBins = Array.from({ length: 64 }, (_, i) => {
        const first = Math.max(1, Math.floor(30 * Math.pow(16000 / 30, i / 64) * analyser.fftSize / context.sampleRate));
        const last = Math.min(samples.length - 1, Math.max(first,
          Math.floor(30 * Math.pow(16000 / 30, (i + 1) / 64) * analyser.fftSize / context.sampleRate)));
        return [first, last];
      });
      source.connect(analyser);
      analyser.connect(context.destination);
      state.audioConnected = true;
    }
    context.resume().catch(() => {});
  }
  document.addEventListener('click', event => {
    if (event.target.closest('.music-floating-player')) connectAudio();
  }, true);
  document.addEventListener('blog:music-ready', () => {
    window.blogMusicPlayer.on('play', connectAudio);
  });
  if (window.blogMusicPlayer) window.blogMusicPlayer.on('play', connectAudio);

  function readSpectrum(elapsed) {
    const active = analyser && !audio.paused && !reduced.matches;
    if (active) analyser.getByteFrequencyData(samples);
    // Preserve the original attack/decay time when changing between 30 and 60 fps.
    const smoothing = 1 - Math.pow(1 - (active ? .45 : .22), elapsed / (1000 / 30));
    let peak = 0;
    for (let i = 0; i < 64; i++) {
      let amplitude = 0;
      if (active) {
        const [first, last] = frequencyBins[i];
        for (let bin = first; bin <= last; bin++) amplitude += samples[bin] / 255;
        amplitude /= last - first + 1;
      }
      spectrum[i] += (amplitude - spectrum[i]) * smoothing;
      peak = Math.max(peak, spectrum[i]);
    }
    state.peak = peak;
  }
  function bind(p, name, file, unit) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, textures.get(file) || blank);
    gl.uniform1i(p.location(name), unit);
  }
  let lastDrawAt = null;
  const layers = scene.layers.map(layer => ({ ...layer,
    shake: layer.effects?.find(e => e.type === 'shake'), wave: layer.effects?.find(e => e.type === 'wave')
  }));
  function draw(now) {
    state.reducedMotion = reduced.matches;
    readSpectrum(lastDrawAt === null ? 1000 / 30 : Math.max(1, Math.min(100, now - lastDrawAt)));
    lastDrawAt = now;
    gl.clearColor(.4, .68, .8, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    for (const layer of layers) {
      const p = programs[layer.kind];
      gl.useProgram(p.value);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      const position = p.position;
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(p.location('u_viewport'), width, height);
      gl.uniform2f(p.location('u_origin'), offsetX + layer.origin[0] * scale, offsetY + (scene.height - layer.origin[1]) * scale);
      gl.uniform2f(p.location('u_size'), layer.size[0] * scale, layer.size[1] * scale);
      gl.uniform1f(p.location('u_angle'), (layer.kind === 'spectrum' ? 1 : -1) * (layer.angle || 0) * Math.PI / 180);
      gl.uniform1f(p.location('u_time'), reduced.matches ? 0 : now / 1000);
      if (layer.kind === 'image') {
        const { shake, wave } = layer;
        const s = shake?.parameters || {}, w = wave?.parameters || {};
        gl.uniform4f(p.location('u_shake'), s.speed || 0, s.strength || 0, shake?.directionMode || 0, shake ? 1 : 0);
        gl.uniform4f(p.location('u_wave'), w.speed || 0, w.scale || 0, w.strength || 0, w.direction || 0);
        gl.uniform4f(p.location('u_flags'), shake?.masks[1] ? 1 : 0, shake?.masks[2] ? 1 : 0, wave?.masks[0] ? 1 : 0, wave?.masks[1] ? 1 : 0);
        bind(p, 'u_image', layer.image, 0);
        bind(p, 'u_flow', shake?.masks[0], 1);
        bind(p, 'u_phase', shake?.masks[1], 2);
        bind(p, 'u_opacity', shake?.masks[2], 3);
        bind(p, 'u_waveMask', wave?.masks[0], 4);
        bind(p, 'u_wavePhase', wave?.masks[1], 5);
      } else {
        gl.uniform1fv(p.location('u_spectrum[0]'), spectrum);
        bind(p, 'u_mask', layer.mask, 0);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    state.frames++;
  }
  function tick(now) {
    frame = 0;
    if (!state.ready || document.hidden || reduced.matches) return;
    const rafGap = now - lastRafAt;
    if (lastRafAt && rafGap > 3 && rafGap < 100) minRafGap = Math.min(minRafGap, rafGap);
    lastRafAt = now;
    if (now + .1 >= nextFrameAt) {
      if (resizePending) { resize(); resizePending = false; }
      if (state.frames % 15 === 0) pollGpu();
      let query = null;
      if (gpuTimer && gpuQueries.length < 2 && state.frames % 30 === 0) {
        query = gl.createQuery();
        if (query) gl.beginQuery(gpuTimer.TIME_ELAPSED_EXT, query);
      }
      const started = performance.now();
      draw(now);
      windowCpu += performance.now() - started; windowFrames++;
      if (query) { gl.endQuery(gpuTimer.TIME_ELAPSED_EXT); gpuQueries.push(query); }
      assessPerformance(now);
      const interval = 1000 / state.targetFps;
      // Keep the original deadline's phase instead of resetting it to each RAF.
      // This avoids drifting below 30/60 fps on 60/120/144/165 Hz displays.
      nextFrameAt = now + interval - Math.max(0, now - nextFrameAt) % interval;
    }
    frame = requestAnimationFrame(tick);
  }
  function resume() {
    state.reducedMotion = reduced.matches;
    cancelAnimationFrame(frame);
    if (!state.ready) return;
    const now = performance.now();
    resetMeasurements(now); nextFrameAt = now; lastRafAt = 0; lastDrawAt = null;
    graceUntil = now + 2500; slowWindows = 0; fastWindows = 0;
    if (reduced.matches) draw(0);
    else if (!document.hidden) frame = requestAnimationFrame(tick);
  }
  state.ready = true;
  draw(0);
  root.classList.add('wallpaper-ready');
  resume();
  scheduleMipmaps();
  reduced.addEventListener('change', () => { state.reducedMotion = reduced.matches; resume(); });
  document.addEventListener('visibilitychange', resume);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); cancelAnimationFrame(frame);
    root.classList.remove('wallpaper-ready'); state.ready = false;
  });
}

start().catch(error => {
  console.warn('动态壁纸加载失败，使用静态背景：', error);
  root?.classList.remove('wallpaper-ready');
});
