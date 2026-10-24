// Browser adaptation of the locally supplied No.454 Workshop scene 3776778760.
// Original images, placements and motion masks are converted by prepare-lime-wallpaper.py.
const root = document.querySelector('.home-banner-background');
const assets = '/images/wallpapers/lime/';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

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
  for (int i = 0; i < 64; i++) {
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
  const state = { ready: false, frames: 0, audioConnected: false, peak: 0, reducedMotion: reduced.matches };
  window.blogWallpaper = { snapshot: () => ({ ...state, glError: gl.getError() }) };

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
    return { value: result, location(name) {
      if (!locations.has(name)) locations.set(name, gl.getUniformLocation(result, name));
      return locations.get(name);
    } };
  }
  const programs = { image: program(imageFragment), spectrum: program(spectrumFragment) };
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
  const textures = new Map();
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
  const names = new Set();
  for (const layer of scene.layers) {
    if (layer.image) names.add(layer.image);
    if (layer.mask) names.add(layer.mask);
    for (const effect of layer.effects || []) for (const mask of effect.masks) if (mask) names.add(mask);
  }
  await Promise.all([...names].map(async name => {
    const img = new Image();
    img.src = assets + name;
    await img.decode();
    textures.set(name, createTexture(img));
  }));

  let width = 0, height = 0, scale = 1, offsetX = 0, offsetY = 0, frame = 0, lastFrame = -Infinity;
  root.appendChild(canvas);
  function resize() {
    const bounds = root.getBoundingClientRect();
    width = bounds.width; height = bounds.height;
    const resolution = Math.min(devicePixelRatio || 1, 1.5, 1600 / width, 1200 / height);
    canvas.width = Math.round(width * resolution);
    canvas.height = Math.round(height * resolution);
    scale = Math.max(width / scene.width, height / scene.height);
    offsetX = Math.min(0, Math.max(width - scene.width * scale, width / 2 - scene.focusX * scale));
    offsetY = (height - scene.height * scale) / 2;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  const resizeObserver = new ResizeObserver(() => { resize(); if (reduced.matches) draw(0); });
  resizeObserver.observe(root);

  const spectrum = new Float32Array(64);
  let context, analyser, source, audio, samples;
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

  function readSpectrum() {
    const active = analyser && !audio.paused && !reduced.matches;
    if (active) analyser.getByteFrequencyData(samples);
    let peak = 0;
    for (let i = 0; i < 64; i++) {
      let amplitude = 0;
      if (active) {
        const lower = 30 * Math.pow(16000 / 30, i / 64);
        const upper = 30 * Math.pow(16000 / 30, (i + 1) / 64);
        const first = Math.max(1, Math.floor(lower * analyser.fftSize / context.sampleRate));
        const last = Math.min(samples.length - 1, Math.max(first, Math.floor(upper * analyser.fftSize / context.sampleRate)));
        for (let bin = first; bin <= last; bin++) amplitude += samples[bin] / 255;
        amplitude /= last - first + 1;
      }
      spectrum[i] += (amplitude - spectrum[i]) * (active ? .45 : .22);
      peak = Math.max(peak, spectrum[i]);
    }
    state.peak = peak;
  }
  function bind(p, name, file, unit) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, textures.get(file) || blank);
    gl.uniform1i(p.location(name), unit);
  }
  function draw(now) {
    state.reducedMotion = reduced.matches;
    readSpectrum();
    gl.clearColor(.4, .68, .8, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    for (const layer of scene.layers) {
      const p = programs[layer.kind];
      gl.useProgram(p.value);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      const position = gl.getAttribLocation(p.value, 'a_position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(p.location('u_viewport'), width, height);
      gl.uniform2f(p.location('u_origin'), offsetX + layer.origin[0] * scale, offsetY + (scene.height - layer.origin[1]) * scale);
      gl.uniform2f(p.location('u_size'), layer.size[0] * scale, layer.size[1] * scale);
      gl.uniform1f(p.location('u_angle'), (layer.kind === 'spectrum' ? 1 : -1) * (layer.angle || 0) * Math.PI / 180);
      gl.uniform1f(p.location('u_time'), reduced.matches ? 0 : now / 1000);
      if (layer.kind === 'image') {
        const shake = layer.effects.find(e => e.type === 'shake');
        const wave = layer.effects.find(e => e.type === 'wave');
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
    if (document.hidden || reduced.matches) return;
    if (now - lastFrame >= 1000 / 30) { draw(now); lastFrame = now; }
    frame = requestAnimationFrame(tick);
  }
  function resume() {
    state.reducedMotion = reduced.matches;
    cancelAnimationFrame(frame);
    if (reduced.matches) draw(0);
    else if (!document.hidden) frame = requestAnimationFrame(tick);
  }
  state.ready = true;
  draw(0);
  root.classList.add('wallpaper-ready');
  resume();
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
