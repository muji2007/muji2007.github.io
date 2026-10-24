import { M as L, l as Y } from "./chunks/MascotEngine-BegMTn5U.js";
import { c as Ae, a as $e, d as Ie, b as Te } from "./chunks/MascotEngine-BegMTn5U.js";
const $ = "/__mascot-log", q = 256, K = 4096, Z = 1e3, ee = 32, te = 3e3, ne = 500, B = 2, R = 1500, oe = 8, se = 12e4, ae = 6, ie = 500, M = "_index", P = Y("observe"), I = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), re = performance.now(), u = /* @__PURE__ */ new Map(), S = /* @__PURE__ */ new Map(), p = /* @__PURE__ */ new Map(), h = /* @__PURE__ */ new Map();
let k = null;
const x = [];
let g = !1, d = !1, v = 0, j = !1, w = null, m = null;
const c = (e) => Math.round(e * 100) / 100, b = () => (performance.now() - re) / 1e3;
function y(e, t, s) {
  let n = p.get(e);
  return n || (n = {
    x: t,
    y: s,
    at: 0,
    seenX: t,
    seenY: s,
    movingSince: 0,
    travelled: 0,
    stopped: !0,
    moving: !1,
    lastLogAt: 0,
    lastBehaviorAt: 0,
    lastEvent: "",
    pose: ""
  }, p.set(e, n)), n;
}
function l(e, t) {
  if (d || !g) return;
  const s = p.get(e);
  s && (s.lastLogAt = performance.now());
  const n = JSON.stringify(t);
  let o = u.get(e);
  o || (o = [], u.set(e, o)), o.push(n), o.length >= q && N(e, !1);
}
function z() {
  return k ? [k, ...x] : x;
}
async function ce(e, t) {
  if (d) return;
  const s = u.get(e);
  if (!s || s.length === 0) return;
  const n = s.splice(0, s.length), o = JSON.stringify({ session: I, pet: e, lines: n });
  for (const a of z()) {
    if (d) return;
    try {
      a({ session: I, pet: e, lines: n });
    } catch {
    }
  }
  if (k) {
    v = 0;
    return;
  }
  if (!d) {
    if (!X) {
      v = 0;
      return;
    }
    if (t && typeof navigator < "u" && typeof navigator.sendBeacon == "function")
      try {
        if (navigator.sendBeacon($, new Blob([o], { type: "application/json" }))) return;
      } catch {
      }
    try {
      const a = await fetch($, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: o,
        keepalive: !0
      });
      if (!a.ok) throw new Error(`HTTP ${a.status}`);
      v = 0;
    } catch {
      v++;
      const a = u.get(e) ?? [];
      a.length + n.length <= K && u.set(e, n.concat(a)), v >= 3 && O("log endpoint keeps failing");
    }
  }
}
function N(e, t) {
  const n = (S.get(e) ?? Promise.resolve()).catch(() => {
  }).then(() => ce(e, t));
  return S.set(e, n.finally(() => {
    S.get(e) === n && S.delete(e);
  })), n;
}
function _(e) {
  for (const t of Array.from(u.keys())) N(t, e);
}
function O(e) {
  d || (d = !0, g = !1, u.clear(), ue(), P.warn(`recorder disabled: ${e}`));
}
function U(e, t) {
  if (d) return;
  if (!g) {
    if (t.kind === "spawn") {
      const i = e.snapshot(), r = e.position();
      h.set(e.label, {
        x: r.x,
        y: r.y,
        behavior: i.behavior,
        mascot: i.mascot
      });
    } else t.kind === "despawn" && h.delete(e.label);
    return;
  }
  const s = e.label, n = c(b()), o = e.position(), a = c(o.x), f = c(o.y);
  switch (t.kind) {
    case "spawn": {
      const i = e.snapshot(), r = performance.now();
      p.set(s, {
        x: o.x,
        y: o.y,
        at: r,
        seenX: o.x,
        seenY: o.y,
        movingSince: r,
        travelled: 0,
        stopped: !0,
        moving: !1,
        lastLogAt: r,
        lastBehaviorAt: r,
        lastEvent: "",
        pose: `${i.behavior}|${i.image}`
      }), h.set(s, {
        x: o.x,
        y: o.y,
        behavior: i.behavior,
        mascot: i.mascot
      }), l(s, {
        t: n,
        k: "spawn",
        mascot: i.mascot,
        x: a,
        y: f
      });
      break;
    }
    case "despawn":
      h.delete(s), p.delete(s), l(s, { t: n, k: "despawn", x: a, y: f });
      break;
    case "behavior": {
      const i = performance.now(), r = y(s, o.x, o.y);
      r.x = o.x, r.y = o.y, r.at = i, r.seenX = o.x, r.seenY = o.y, r.travelled = 0, r.stopped = !1, r.moving = !1, r.movingSince = i, r.lastBehaviorAt = i, r.pose = `${t.to}|${e.snapshot().image}`, l(s, {
        t: n,
        k: "behavior",
        from: t.from || "",
        to: t.to,
        reason: t.reason,
        x: a,
        y: f
      });
      break;
    }
    case "image": {
      const i = y(s, o.x, o.y);
      if (i.moving) break;
      const r = `${e.snapshot().behavior}|${t.image}`;
      if (r === i.pose) break;
      i.pose = r, l(s, {
        t: n,
        k: "pose",
        img: t.image,
        x: a,
        y: f
      });
      break;
    }
    case "milestone": {
      const i = y(s, o.x, o.y);
      if (t.name === "paused" || t.name === "resumed") {
        const E = t.name === "paused", Q = t.detail === "viewport" ? "viewport" : t.detail === "background-page" ? "background-page" : "hidden";
        l(s, {
          t: n,
          k: "lifecycle",
          event: E ? "freeze" : "resume",
          reason: Q,
          x: a,
          y: f
        }), i.lastEvent = "";
        break;
      }
      if (t.name === "broadcast-connect" || t.name === "interaction-arrived") {
        l(s, {
          t: n,
          k: "peer",
          event: t.name === "broadcast-connect" ? "connect" : "arrive",
          affordance: t.affordance || void 0,
          behavior: t.behavior || void 0,
          distance: typeof t.distance == "number" && Number.isFinite(t.distance) ? c(t.distance) : void 0,
          target: t.target ? [c(t.target[0]), c(t.target[1])] : void 0,
          x: a,
          y: f
        }), i.lastEvent = "";
        break;
      }
      if (t.name === "broadcast-abort" || t.name === "broadcast-serve-timeout") {
        l(s, {
          t: n,
          k: "peer",
          event: t.name === "broadcast-abort" ? "abort" : "serve-timeout",
          side: t.name === "broadcast-abort" ? "client" : "server",
          affordance: t.affordance || void 0,
          behavior: t.behavior || void 0,
          x: a,
          y: f
        }), i.lastEvent = "";
        break;
      }
      if (t.name === "broadcast-start") {
        l(s, {
          t: n,
          k: "peer",
          event: "offer",
          side: "server",
          affordance: t.affordance || void 0,
          behavior: t.behavior || void 0,
          x: a,
          y: f
        }), i.lastEvent = "";
        break;
      }
      if (t.name === "broadcast-scan") {
        const E = `scan:${t.affordance ?? ""}`;
        if (i.lastEvent === E) break;
        i.lastEvent = E, l(s, {
          t: n,
          k: "peer",
          event: "scan-miss",
          affordance: t.affordance || void 0,
          behavior: t.behavior || void 0,
          x: a,
          y: f
        });
        break;
      }
      if (t.name !== "forced-switch" && t.name !== "behavior-cap") break;
      const r = `switch:${t.name}`;
      if (i.lastEvent === r) break;
      i.lastEvent = r, l(s, {
        t: n,
        k: "switch",
        reason: t.name,
        from: e.snapshot().behavior,
        x: a,
        y: f
      });
      break;
    }
    case "suspect": {
      l(s, {
        t: n,
        k: "suspect",
        step: c(t.step),
        from: [c(t.px), c(t.py)],
        to: [c(t.x), c(t.y)],
        x: a,
        y: f
      });
      break;
    }
  }
}
function le() {
  if (!g || d) return;
  const e = performance.now();
  for (const t of L.getInstances()) {
    const s = t.label, n = t.snapshot(), o = y(s, n.x, n.y), a = Math.hypot(n.x - o.seenX, n.y - o.seenY);
    a > B ? (o.seenX = n.x, o.seenY = n.y, o.movingSince = e, o.stopped = !1, o.moving = !0) : o.moving = !1, o.travelled += a;
    const f = e - o.movingSince, i = c(b());
    if (f <= R) {
      const r = e - o.at;
      if (o.travelled >= ee || r >= te && o.travelled >= B) {
        if (r < ne) continue;
        l(s, {
          t: i,
          k: "move",
          x: c(n.x),
          y: c(n.y)
        }), o.x = n.x, o.y = n.y, o.at = e, o.travelled = 0;
      }
      continue;
    }
    if (!o.stopped) {
      if (o.stopped = !0, o.moving = !1, e - o.lastBehaviorAt < R || Math.hypot(n.x - o.x, n.y - o.y) < oe) continue;
      l(s, {
        t: i,
        k: "stop",
        x: c(n.x),
        y: c(n.y),
        behavior: n.behavior
      }), o.x = n.x, o.y = n.y, o.at = e, o.travelled = 0;
      continue;
    }
    e - o.lastLogAt >= se && l(s, {
      t: i,
      k: "heartbeat",
      x: c(n.x),
      y: c(n.y),
      behavior: n.behavior
    });
  }
  _(!1);
}
function A(e) {
  if (!(g || d)) {
    g = !0, l(M, {
      t: 0,
      k: "session",
      session: I,
      dir: e,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      dpr: window.devicePixelRatio,
      ua: navigator.userAgent,
      href: location.href,
      started: (/* @__PURE__ */ new Date()).toISOString()
    });
    for (const t of L.getInstances()) {
      const s = t.label, n = t.snapshot(), o = performance.now(), a = y(s, n.x, n.y);
      a.x = n.x, a.y = n.y, a.at = o, a.seenX = n.x, a.seenY = n.y, a.movingSince = o, a.lastLogAt = o, a.lastBehaviorAt = o, a.pose = `${n.behavior}|${n.image}`;
      const f = h.get(s);
      f ? l(s, { t: c(b()), k: "spawn", mascot: f.mascot, x: c(f.x), y: c(f.y) }) : l(s, {
        t: c(b()),
        k: "mark",
        reason: "recording-started",
        behavior: n.behavior,
        x: c(n.x),
        y: c(n.y)
      });
    }
    for (const t of u.keys()) N(t, !1);
    document.visibilityState === "hidden" && (m = performance.now());
  }
}
function fe(e) {
  (p.size > 0 || h.size > 0) && P.debug(`dropping observation state: ${e}`, {
    pets: p.size,
    spawned: h.size
  }), p.clear(), h.clear(), u.clear();
}
async function T(e = 1) {
  if (C) {
    A("(host sink only)");
    return;
  }
  try {
    const t = await fetch(`${$}/ping`, { cache: "no-store" }), s = t.headers.get("content-type") ?? "";
    if (t.ok && s.includes("json")) {
      const n = await t.json();
      if (n && n.ok) {
        A(String(n.dir ?? "unknown"));
        return;
      }
    }
  } catch {
  }
  if (z().length > 0) {
    A("(host sink only)");
    return;
  }
  if (e < ae) {
    window.setTimeout(() => void T(e + 1), ie);
    return;
  }
  O("log endpoint unavailable (recording is dev/preview only)");
}
function de() {
  w === null && (L.addObserver(U), pe(), w = window.setInterval(le, Z));
}
function ue() {
  w !== null && (window.clearInterval(w), w = null), L.removeObserver(U), ge();
}
function he() {
  if (document.visibilityState === "visible") {
    T();
    return;
  }
  P.info("page is in the background; recording starts once it is visible again");
  const e = () => {
    document.visibilityState === "visible" && (document.removeEventListener("visibilitychange", e), T());
  };
  document.addEventListener("visibilitychange", e);
}
const F = () => _(!0), H = () => _(!0), G = () => {
  const e = document.visibilityState;
  e === "hidden" && (m = performance.now(), _(!0)), l(M, {
    t: c(b()),
    k: "visibility",
    state: e,
    ...e === "visible" && m !== null ? { gapMs: Math.round(performance.now() - m) } : {}
  }), e === "visible" && (m = null);
}, J = (e) => {
  l(M, {
    t: c(b()),
    k: "error",
    detail: e.message,
    src: `${e.filename}:${e.lineno}`
  });
}, W = (e) => {
  l(M, {
    t: c(b()),
    k: "rejection",
    detail: String(e.reason)
  });
};
function pe() {
  window.addEventListener("pagehide", F), window.addEventListener("beforeunload", H), document.addEventListener("visibilitychange", G), window.addEventListener("error", J), window.addEventListener("unhandledrejection", W);
}
function ge() {
  window.removeEventListener("pagehide", F), window.removeEventListener("beforeunload", H), document.removeEventListener("visibilitychange", G), window.removeEventListener("error", J), window.removeEventListener("unhandledrejection", W);
}
function Ee(e) {
  k = e;
}
function D(e) {
  x.push(e);
}
let X = !0, C = !1;
function be(e) {
  X = e;
}
function ve(e) {
  C = e;
}
function me() {
  return j ? g : (j = !0, !(k !== null || x.length > 0) && !X ? (d = !0, !1) : (de(), he(), !0));
}
function we() {
  O("stopped by the host");
}
function Se() {
  return g && !d;
}
function xe() {
  fe("reset by the host");
}
const V = Y("logger");
function ye(e) {
  const t = e && e.length > 0 ? new Set(e) : null;
  return ({ pet: s, lines: n }) => {
    for (const o of n) {
      if (t)
        try {
          const a = JSON.parse(o).k;
          if (a && !t.has(a)) continue;
        } catch {
        }
      console.info(`[mascot-log] ${s} ${o}`);
    }
  };
}
function Le(e = {}) {
  if (e.enabled === !1)
    return we(), !1;
  be(e.file ?? !0), e.silent && ve(!0), e.console && (D(ye(e.kinds)), V.info("observation console mirror enabled"));
  for (const s of e.sinks ?? []) D(s);
  const t = me();
  return V.info(t ? "recording started" : "recording not started (no destination)"), t;
}
export {
  L as MascotEngine,
  D as addLogSink,
  Le as attach,
  Ae as configureLogging,
  $e as consoleSink,
  Ie as disableLogging,
  Se as isRecording,
  Y as loggerFor,
  Te as loggingState,
  xe as resetMascotLogRecorder,
  Ee as setLogSink,
  me as startMascotLogRecorder,
  we as stopMascotLogRecorder
};
//# sourceMappingURL=devtools.js.map
