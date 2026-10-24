import { MascotEngine } from "./core/MascotEngine.js";
import type { RuntimeOptions, RuntimeSnapshot } from "./core/MascotEngine.js";
/**
 * Public entry point of the web-mascot library.
 *
 * A host page imports this module and mounts one or more mascots into its own
 * DOM. The pack assets are addressed relative to this module by default, but that
 * derivation is only valid while this module file is served from its published
 * location. A bundler relocates it (`node_modules/.vite/deps/…`, `_astro/…`), and
 * then the derived URL points at a directory that does not exist, so every pack
 * request 404s. Bundled hosts must therefore copy `dist/mascot_pack/` into their
 * static root and say where it went:
 *
 *     import { configure, createMascot } from "web-mascot";
 *
 *     configure({ assets: "/mascot_pack" });   // before createMascot()
 *     const neuron = await createMascot({ container: document.body, pack: "Neuron" });
 *     // later
 *     neuron.destroy();
 *
 * So `configure()` is required for bundled hosts; it also overrides the animation
 * config file, runtime tuning and logging (packs served from a CDN, a rewritten
 * asset path, a data URL).
 *
 * Animation *behaviour* needs no configuration at all: the engine ships a built-in
 * preset (see `ANIMATION_CONFIG.md`). A config file overrides it field by field,
 * and `configure({ ignoreBuiltin: true })` drops it altogether so the packs behave
 * exactly as they ship.
 *
 * The observation log is deliberately *not* part of this entry point. It is a
 * development tool that writes through a Vite middleware endpoint, so it lives in
 * the `web-mascot/devtools` entry; see `src/devtools.ts`.
 */
/** The asset base URL derived from this module's own location. */
export declare const PACK_BASE_URL: string;
/** Where the engine reads the packs and the editable configuration file from. */
export interface MascotConfig {
    /** Base URL that contains one directory per pack, without a trailing slash.
     *  Each mascot reads `<assets>/<pack>/img...`.
     *
     *  **Bundled hosts must set this**, before `createMascot()`, to wherever the
     *  packs were copied (usually the site's static root, e.g. `"/mascot_pack"`).
     *  Omitting it falls back to `PACK_BASE_URL`, derived from this module's own
     *  location: correct only when that module is served from its published path
     *  (an unbundled bare-ESM host, or a CDN mirroring `dist/` verbatim). After
     *  bundling the derived URL points into the build output (`_astro/…`,
     *  `node_modules/.vite/deps/…`) and every pack request 404s. */
    assets?: string;
    /** URL of the animation configuration JSON. Omitting it probes the classic
     *  `/animation.config.json` once per page; if that file is absent nothing breaks
     *  and the built-in preset stays in effect. */
    animationConfigUrl?: string;
    /** Set true to drop the built-in animation preset and run the packs exactly as
     *  they ship: no pacer, no behaviour-weight overrides, no long-sequence
     *  exemption. Default false — the built-in preset is what a host gets when it
     *  configures nothing. Orthogonal to `animationConfigUrl`: this removes the
     *  layer underneath, it does not disable the file. */
    ignoreBuiltin?: boolean;
    /** Simulation tuning. See `RuntimeOptions`; omitted fields keep their defaults. */
    runtime?: RuntimeOptions;
}
export interface MascotOptions {
    /** Host element the mascot is anchored to. The mascot itself roams the whole
     *  viewport — this element decides *where in the document the mascot belongs*,
     *  and the engine pauses it while that element is scrolled out of view. */
    container: HTMLElement;
    /** Pack directory name, e.g. `"Neuron"`. `spriteUrl` reads `<assets>/<pack>/img/<pose>`. */
    pack: string;
}
/**
 * Override the derived defaults. Entirely optional: calling nothing still gives a
 * working mascot, with the engine's built-in animation preset.
 *
 * The assets URL is snapshotted when each mascot is constructed, so changing it
 * later never leaves one mascot reading from a different pack root. Runtime tuning
 * is *not* snapshotted — it is read per tick, so a later change affects mascots
 * that are already on the page. `ignoreBuiltin` lasts for the whole page.
 */
export declare function configure(options: MascotConfig): void;
/** True once the host has explicitly configured something. Diagnostic only: a
 *  `false` here does not mean the engine is unconfigured, only that the derived
 *  defaults are in use. */
export declare function isConfigured(): boolean;
/** The asset base URL actually in effect (derived, or overridden). */
export declare function assetBaseUrl(): string;
/** The runtime tuning actually in effect. */
export declare function runtimeOptions(): RuntimeSnapshot;
/** One mounted mascot. `destroy()` releases its DOM, timers and observers. */
export declare class Mascot {
    /** The engine instance, exposed for the browser console and for hosts that
     *  need the simulation state (`snapshot()`, `position()`). */
    readonly engine: MascotEngine;
    private destroyed;
    /** Use `createMascot()` instead of constructing this directly. */
    constructor(engine: MascotEngine);
    /** Stable identity, also used to name this mascot's log file in dev builds. */
    get label(): string;
    /** Remove the mascot from the page. Safe to call more than once. */
    destroy(): void;
}
/**
 * Create and mount a mascot, resolving once it has parsed its pack and drawn its
 * first frame. A pack that fails to load throws, and nothing is left behind on
 * the page.
 */
export declare function createMascot(options: MascotOptions): Promise<Mascot>;
export { MascotEngine } from "./core/MascotEngine.js";
export type { RuntimeOptions, RuntimeSnapshot } from "./core/MascotEngine.js";
export { AnimationConfig } from "./core/AnimationConfig.js";
export { BroadcastManager } from "./core/Broadcast.js";
export { DEFAULT_PACK_BASE_URL, resolveAssetBase } from "./core/Assets.js";
export type { EngineEvent, EngineObserver } from "./core/MascotEngine.js";
export type { Pose, ActionNode, Behavior } from "./core/types.js";
export type { Hotspot } from "./core/Hotspot.js";
//# sourceMappingURL=index.d.ts.map