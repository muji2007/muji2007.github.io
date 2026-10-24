/**
 * The engine's built-in animation preset — the defaults every host gets when it
 * configures nothing.
 *
 * This module is deliberately the *only* copy of these values:
 *
 *   - `AnimationConfig` imports `ANIMATION_PRESET_DEFAULTS` and applies it as the
 *     bottom layer of `optionsFor()`;
 *   - `vite.config.ts` emits `ANIMATION_PRESET_FILE` as `dist/animation.config.json`,
 *     the copy a host may take as a starting point (also exported as
 *     `web-mascot/animation.config.json`).
 *
 * so the shipped template and the default behaviour can never drift apart.
 *
 * The values are tuned for a *web page* rather than a desktop: a mascot that
 * stands still for more than a few seconds reads as broken, while the packs' own
 * long animations still have to be allowed to finish. Field-by-field rationale,
 * measurements and the "how lively vs. how Qt" trade-off live in
 * ANIMATION_CONFIG.md.
 */
import type { MascotAnimationOptions } from "./AnimationConfig.js";
/** The `defaults` block of the built-in preset. */
export declare const ANIMATION_PRESET_DEFAULTS: MascotAnimationOptions;
/**
 * The same preset in file shape, emitted as `dist/animation.config.json` by the
 * build. `_readme` is ignored by the parser (see `normalizeOptions`), exactly
 * like the labels inside the packs' own XML.
 */
export declare const ANIMATION_PRESET_FILE: {
    _readme: string[];
    version: number;
    respectReducedMotion: boolean;
    defaults: MascotAnimationOptions;
    mascots: {};
};
//# sourceMappingURL=animationPreset.d.ts.map