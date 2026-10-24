/**
 * Animation customisation — one config file for everything a host may want to
 * change about how the mascots behave.
 *
 *   allowBehaviors / denyBehaviors  which behaviours may appear at all
 *   behaviorWeights                 selection weight (probability) of each
 *   actionDurations                 how long an action holds, in 40 ms ticks
 *   durationScale                   global multiplier on the pack's own holds
 *   forcedSwitchTicks               never stand still longer than this
 *   maxBehaviorTicks                hard cap on one behaviour (never cuts a fall)
 *   maxTravelPx                     how far a wander target may be (border
 *                                   targets, i.e. "walk to the wall", are kept)
 *   zone                            the rectangle the mascot lives in; it becomes
 *                                   the work area, so floor/walls/ceiling follow
 *   spawn                           where a new mascot appears, and how several
 *                                   mascots are spread apart
 *   reducedMotion / respectReducedMotion
 *                                   what to change when the OS asks for reduced
 *                                   motion (the host decides; the engine ships no
 *                                   reduced-motion preset)
 *   ignoreBuiltin                   true drops the engine's built-in preset
 *
 * The engine ships a built-in preset (see `animationPreset.ts`) — the layer every
 * host starts from. Each field above overrides it, and `ignoreBuiltin` removes it.
 * The same data is emitted as `dist/animation.config.json`, so the template a host
 * copies and the behaviour it gets by default cannot drift apart.
 *
 * Everything is optional and validated: a malformed value is ignored rather than
 * breaking the mascot, and unknown names are kept (they simply never match) so a
 * config can be written ahead of the pack. `MascotEngine.setAnimationConfig()`
 * accepts the same shape as an object, and `toJSON()` / `optionsFor()` hand the
 * effective settings back for a settings UI.
 */
/** A position or size: pixels as a number, a percentage like "40%", or a keyword
 *  ("left" | "right" | "top" | "bottom" | "center"). */
export type Metric = number | string;
export interface SpawnOptions {
    /** `"top"` (default) drops the mascot in from above, `"floor"` starts it on
     *  the floor of its zone already standing. */
    vertical?: "top" | "floor";
    /** Horizontal start position (Metric), default the middle of the zone. */
    x?: Metric;
    /** Extra offset per already-live mascot so several mascots do not stack. */
    staggerPx?: number;
    /** How far below the zone's top a "top" spawn starts. Default 100. */
    topOffset?: number;
}
export interface ZoneOptions {
    left?: Metric;
    right?: Metric;
    top?: Metric;
    bottom?: Metric;
}
/** Weight for partner behaviours, in the situations that matter. */
export interface PartnerWeights {
    /** While this mascot is the only one on the page. */
    alone?: number;
    /** While other mascots are live, so an interaction can actually happen. */
    withPartner?: number;
    /**
     * While another mascot is on the *same* surface and within the scan distance —
     * i.e. a scan started right now could connect. Raising this is what makes two
     * mascots that are both on the floor seek each other out. It cannot make a hug
     * certain: a scan still only connects if the other one happens to be advertising
     * at that exact tick, so the interaction stays stochastic.
     */
    reachable?: number;
}
export interface MascotAnimationOptions {
    /** Only these behaviours may be chosen. Empty/absent means "all of them". */
    allowBehaviors?: string[];
    /** These behaviours are never chosen. */
    denyBehaviors?: string[];
    /** Selection weight per behaviour, overriding the pack's Frequency. 0 disables. */
    behaviorWeights?: Record<string, number>;
    /** Hold duration per action in ticks; 40 ms each. `[min,max]` or a single value. */
    actionDurations?: Record<string, DurationSetting>;
    /** Multiplier applied to the pack's own Duration values. 1 = unchanged. */
    durationScale?: number;
    /**
     * How much bigger the mascot is drawn, as a linear multiplier (1 = the pack's
     * native 128 px sprite). The engine keeps working in *virtual* units, where one
     * unit is one sprite pixel, and converts at the two boundaries (rendering and
     * pointer input) — the same thing libshijima does with `environment::set_scale`.
     * That is what keeps the packs' own pixel constants (`workArea.top+64`,
     * `width-128`, velocities, `Offset Y=1`, hotspot origins) meaningful at any size.
     */
    scale?: number;
    /** Nudge a standing mascot into a new behaviour after this many ticks. */
    forcedSwitchTicks?: number;
    /**
     * Behaviours the pacer above must not interrupt.
     *
     * `forcedSwitchTicks` keys off *movement*: any pose with zero velocity counts as
     * standing still, so a long stationary animation — a sit-and-dangle sequence is
     * ~400 ticks — gets cut off mid-way by a pacer shorter than it. Listing it here
     * lets the whole sequence play, while a plain idle `Stay` is still nudged on time.
     * Only the pacer is suspended; `maxBehaviorTicks` still applies, so a listed
     * behaviour cannot run for ever.
     */
    pacerExemptBehaviors?: string[];
    /**
     * Behaviours that return to the *global* pool when they end, instead of following
     * the pack's `<NextBehaviorList>`.
     *
     * The packs use that list to chain related behaviours, and some chains are closed
     * (`Add="false"` with their own name among the targets). `SitAndFaceMouse` in the
     * shipped packs is exactly that: it can only re-pick itself or
     * `SitWhileDanglingLegs`, forever. A mascot that sits down therefore never leaves
     * that pair on its own; combining a pacer exemption with this list is what lets it
     * finish the animation *and* move on afterwards.
     */
    exitToPoolBehaviors?: string[];
    /** After a completed interaction (hug/hurl), partner behaviours are suppressed for
     *  this many ticks. Without it two mascots that end a hug next to each other simply
     *  connect again on the next pick and chain hugs back to back. */
    interactionCooldownTicks?: number;
    /** Hard cap on one behaviour, in ticks. A fall or a drag is never cut. */
    maxBehaviorTicks?: number;
    /** Longest horizontal wander target, in pixels. 0/absent = unlimited. */
    maxTravelPx?: number;
    /**
     * Weight given to *partner* behaviours (hugging, hurling, waiting for a hug,
     * noticing a falling friend) regardless of the name the pack uses and regardless
     * of how large the pack's own Frequency is.
     *
     * The packs weight these at 1000–3000 because a busy desktop has several
     * mascots; on a page a lone mascot would just stand around. Naming the pack's
     * behaviours here would be brittle — Neuron calls it HugEvil and Eviling calls it
     * HugNeuro — so the engine decides by inspecting the action instead, and this
     * pair of numbers says how much that class of behaviour is worth.
     */
    partnerWeights?: PartnerWeights;
    /**
     * How far a scanning mascot looks for an advertisement, in pixels (libshijima
     * uses 256, which suits a desktop). A page is often much wider than a mascot
     * neighbourhood, so raising this is what lets two mascots find each other.
     */
    scanDistancePx?: number;
    /** The activity rectangle; it becomes the mascot's work area. */
    zone?: ZoneOptions;
    /** Where a new mascot appears. */
    spawn?: SpawnOptions;
}
/** A duration may be written as one fixed value or as a `[min,max]` range. */
export type DurationSetting = number | [number, number];
export interface AnimationConfigFile {
    version?: number;
    /** Set true to drop the engine's built-in preset and run the packs exactly as
     *  they ship: no pacer, no behaviour-weight overrides, no long-sequence
     *  exemption. Default false. Orthogonal to the fields below — this removes the
     *  layer *underneath*, it does not disable the file. */
    ignoreBuiltin?: boolean;
    /** Applied to every mascot. */
    defaults?: MascotAnimationOptions;
    /** Per-mascot overrides, keyed by mascot name (`Neuron`, `Eviling`, ...). */
    mascots?: Record<string, MascotAnimationOptions>;
    /** Merged on top of `defaults` while the OS asks for reduced motion. */
    reducedMotion?: MascotAnimationOptions;
    /** Set false to ignore the OS reduced-motion preference. Default true. */
    respectReducedMotion?: boolean;
}
export declare class AnimationConfig {
    private defaults;
    private perMascot;
    private reduced;
    private reducedActive;
    private respectReduced;
    private respectBuiltin;
    private resolved;
    /** Where the settings came from, for logs and diagnostics. */
    readonly source: string;
    constructor(file?: unknown, source?: string);
    /** Replace the settings. Invalid input leaves the config empty (= pack default). */
    apply(file: unknown): void;
    /** Called by the engine when the OS preference changes. */
    setReducedMotion(active: boolean): void;
    /** Re-read the OS preference (used at load time and on change). */
    refreshReducedMotion(): boolean;
    get reducedMotionActive(): boolean;
    /** True when this configuration cannot affect anything: the built-in preset is
     *  off and the host supplied nothing of its own. */
    get isEmpty(): boolean;
    /** Effective options: built-in (if not ignored), then file defaults, then reduced-motion block, then mascot overrides. */
    optionsFor(mascot: string): MascotAnimationOptions;
    /** Whether a behaviour may be selected for this mascot. */
    allows(mascot: string, behavior: string): boolean;
    /** Explicitly forbidden. Unlike `allows()`, this ignores `allowBehaviors`, which
     *  only restricts random selection — a visitor-triggered hotspot is deliberate. */
    denies(mascot: string, behavior: string): boolean;
    /** Weight override for a behaviour, or undefined to keep the pack's Frequency. */
    weightOverride(mascot: string, behavior: string): number | undefined;
    /** Effective selection weight, falling back to the pack's Frequency. */
    weight(mascot: string, behavior: string, fallback: number): number;
    scale(mascot: string): number;
    /** Linear size multiplier for the drawn mascot (virtual unit = one sprite px). */
    mascotScale(mascot: string): number;
    forcedSwitchTicks(mascot: string): number;
    /** May the pacer interrupt this behaviour? False only for the exempted ones, so a
     *  long stationary animation can finish while a plain idle `Stay` is still nudged. */
    pacerApplies(mascot: string, behavior: string | undefined): boolean;
    /** Does this behaviour re-enter the global pool when it ends, bypassing the pack's
     *  `<NextBehaviorList>`? Needed for the packs' closed chains (see the option docs). */
    exitsToPool(mascot: string, behavior: string | undefined): boolean;
    /** Ticks during which partner behaviours stay out of the pool after an interaction. */
    interactionCooldown(mascot: string): number;
    maxBehaviorTicks(mascot: string): number;
    maxTravelPx(mascot: string): number;
    /** Weight to use for a partner behaviour, or null to keep the pack's Frequency.
     *  `reachable` is the "another mascot is right here and level with me" case. */
    partnerWeight(mascot: string, withPartner: boolean, reachable?: boolean): number | null;
    /** How far this mascot scans for a partner advertisement. */
    scanDistancePx(mascot: string): number;
    zone(mascot: string): ZoneOptions;
    spawn(mascot: string): SpawnOptions;
    /**
     * A hold duration in ticks for an action, picked once from its `[min,max]`
     * range, or null when the action is not configured. The caller must call this
     * once per action instance: calling it per tick would re-roll the range.
     */
    durationTicks(mascot: string, action: string | undefined): number | null;
    /** True when this action has an explicit duration override. */
    hasDurationOverride(mascot: string, action: string | undefined): boolean;
    /** Round-trip view of the raw file shape, for a settings UI. */
    toJSON(): AnimationConfigFile;
    /** One-line summary written into the observation log with every spawn. */
    describe(mascot: string): string;
    /** Human-readable list of the effective settings, for logs. */
    details(mascot: string): string[];
}
//# sourceMappingURL=AnimationConfig.d.ts.map