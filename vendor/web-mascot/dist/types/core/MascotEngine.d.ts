import { AnimationConfig } from "./AnimationConfig.js";
import { BroadcastManager } from "./Broadcast.js";
/**
 * Runtime tuning. Every field here is a *number the simulation reads*, exposed so a
 * host can match the engine to its page without patching the source. The defaults
 * are what the engine shipped with, and they are calibrated against the packs'
 * own physics — changing `gravity` or the resistances without re-checking the packs
 * will make mascots behave unlike libshijima, which is why they are documented as
 * "match the pack" rather than "tune freely".
 *
 * Deliberately *not* here: internal safety valves (`MAX_FRAME_DELTA_MS`,
 * `MAX_BEHAVIOR_INITS_PER_TICK`, `STALL_LIMIT_TICKS`). They exist to stop a bug
 * from locking the page, and a host that lowers them turns a cosmetic problem into
 * a broken mascot.
 */
export interface RuntimeOptions {
    /** Simulation step, in ms. 40 ms is libshijima's rate; raising it slows every
     *  animation down proportionally and is the closest thing to a speed control. */
    tickMs?: number;
    /** Downward acceleration per tick. */
    gravity?: number;
    /** Horizontal / vertical air drag, as a per-tick multiplier below 1. */
    resistanceX?: number;
    resistanceY?: number;
    /** A `Stay` action with no `Duration` of its own holds this many ticks. */
    stayDurationTicks?: number;
    /** Motionless ticks of a held mascot before it starts to struggle. */
    dragResistTicks?: number;
    /** Cursor movement that aborts the struggle, in px. */
    dragResistAbortPx?: number;
    /** How far the held anchor hangs from the cursor. The pack's own
     *  `OffsetX`/`OffsetY` override these when it defines them. */
    dragOffsetX?: number;
    dragOffsetY?: number;
    /** How long an advertiser holds its pose for a claimed-but-absent partner. */
    broadcastServeTimeoutTicks?: number;
    /** Anchor movement in one tick above which a jump is reported as a suspect. */
    suspectStepPx?: number;
}
export type RuntimeSnapshot = Readonly<Required<RuntimeOptions>>;
/** Observation events. Deliberately small and flat so a long recording stays
 *  cheap; the recorder turns them into one JSON line each. */
export type EngineEvent = {
    kind: "spawn";
    detail: string;
} | {
    kind: "despawn";
    detail: string;
} | {
    kind: "behavior";
    from: string;
    to: string;
    reason: string;
    x: number;
    y: number;
    leaf: string;
} | {
    kind: "stack";
    path: string;
    leaf: string;
    nodeType: string;
    className: string;
    border: string;
    targetX: number | null;
    targetY: number | null;
    image: string;
    lookRight: boolean;
    x: number;
    y: number;
} | {
    kind: "image";
    image: string;
    leaf: string;
    x: number;
    y: number;
} | {
    kind: "milestone";
    name: string;
    detail: string;
    x: number;
    y: number;
    leaf: string;
    /** Interaction milestones: who advertised / scanned / arrived. */
    affordance?: string;
    side?: "server" | "client";
    /** The behaviour the interaction will hand over to, when known. */
    behavior?: string;
    /** The peer's anchor, in viewport pixels, for `interaction-arrived`. */
    target?: [number, number];
    /** Scan distance to the nearest live broadcast. */
    distance?: number;
} | {
    kind: "suspect";
    name: string;
    detail: string;
    step: number;
    dx: number;
    dy: number;
    px: number;
    py: number;
    x: number;
    y: number;
    leaf: string;
};
export type EngineObserver = (engine: MascotEngine, event: EngineEvent) => void;
export declare class MascotEngine {
    /** Every live mascot, so `mascot.totalCount` means something to the packs. */
    private static liveEngines;
    /** Sprite URLs already fetched, shared by every mascot of the same pack. */
    private static preloaded; /** Observation points; the log recorder subscribes instead of polling. */
    private static observers;
    private static nextId;
    /** Animation customisation, shared by every mascot (see AnimationConfig). */
    private static animationConfig;
    private static animationConfigLoad;
    private static animationConfigSetExplicitly;
    /**
     * Host-level answer to "should the built-in preset apply?", set through
     * `configure({ ignoreBuiltin })`. `null` means "whatever the file says", which
     * `AnimationConfig` tracks on its own.
     */
    private static builtinPreference;
    /** Affordance registry, shared by every mascot in the page (broadcast/manager). */
    private static broadcasts;
    private static globalEventsInstalled;
    /** Removes the reduced-motion listener again; null while none is installed. */
    private static reducedMotionWatcher;
    /** Default location of the editable configuration file. */
    static readonly ANIMATION_CONFIG_URL = "/animation.config.json";
    /** Default base URL of the mascot packs. A hosted or embedded build overrides
     *  this so sprites never resolve against the host page's root path. */
    static readonly PACK_BASE_URL = "/mascot_pack";
    /** Stable per-session identity, used to name this mascot's log file. */
    readonly id: number;
    readonly label: string;
    private container;
    private mascotName;
    /** This pack's resolved base URL, captured at construction so `configure()`
     *  after the fact cannot leave one mascot reading from another pack. */
    private packBaseUrl;
    private config;
    private elRoot;
    private elImg;
    /** An Interact action with image-less hold frames must hide its old standalone frame. */
    private interactionVisualActive;
    private actionStack;
    private currentBehavior;
    private behaviorUsability;
    /** Whether a behaviour's action needs a partner, cached per behaviour name. */
    private partnerCache;
    /** Whether a behaviour's action can move the mascot, cached per behaviour name. */
    private travelCache;
    /** The border a behaviour starts on, cached per behaviour name. */
    private borderStartCache;
    private tickCount;
    /** Anchor at the previous logic tick, used to interpolate the sub-steps. */
    private prevX;
    private prevY;
    private isDragging;
    /** Ticks the cursor has been motionless while the mascot is held
     *  (libshijima dragged::init's `time_to_resist` timer). */
    private dragStillTicks;
    /** Timestamp of the last swallowed tick error, so it is reported at most once a
     *  second instead of flooding the observation log. */
    private lastTickErrorAt;
    private lastTime;
    private accumulator;
    private loopId;
    private pauseReasons;
    private unregisterPage;
    /** Scroll is an external intent; mascot coordinates remain viewport coordinates. */
    private lastScrollY;
    private scrollDirection;
    private scrollGestureDirection;
    /** Pending page movement, in virtual viewport units, waiting for the next tick. */
    private pendingScrollShift;
    private scrollStopPending;
    private scrollHold;
    private lastSurface;
    private cursorX;
    private cursorY;
    /** Cursor movement during the last logic tick, i.e. `environment.cursor.dx/dy`.
     *  libshijima rolls the raw per-subtick deltas over one tick; the packs use this
     *  as the throw velocity (`Thrown`: InitialVX/InitialVY), so it must be a per-tick
     *  delta — a per-mousemove delta makes a synthetic pointer jump launch the mascot
     *  across the screen (caught by the position-jump suspect). */
    private cursorTickDX;
    private cursorTickDY;
    private lastTickCursorX;
    private lastTickCursorY;
    /** Velocity at the start of the tick, so the jump detector can tell physics from
     *  a bug even when the phase ended and zeroed the velocity during the tick. */
    private tickStartVX;
    private tickStartVY;
    /** libshijima dragged::init/subtick(): the smoothed x the held mascot dangles
     *  from. The pack's own Pinched action reads it to choose its pose. */
    private footX;
    private footDX;
    /**
     * Qt `state::local_cursor` (see `state::get_raw_cursor()`): while the mascot is
     * held, the cursor the simulation reads is the pointer *plus this drag's grab
     * offset*, seeded when the drag starts so that `anchor = cursor + OffsetX/OffsetY`
     * reproduces the anchor the mascot had when it was picked up. Without it the first
     * held tick snaps the mascot to the pack's fixed hold point — measured 108 px for a
     * grab 12 px above the feet — because the old code kept only the *fixed* offsets.
     * `null` means "no drag in progress, the pointer is the cursor".
     */
    private dragGrab;
    /** Anchor and pointer at mousedown, in virtual units, so the grab offset can be
     *  derived on the first held tick — which is when the action's own OffsetX/OffsetY
     *  (the values Qt seeds the local cursor from) are known. */
    private dragPressAnchorX;
    private dragPressAnchorY;
    private dragPressCursorX;
    private dragPressCursorY;
    /**
     * Press bookkeeping for the hotspot gesture (HOLD_TRIGGER_MS …). A press is
     * tracked until the button is released, because which gesture it is (hold, click or
     * pickup) is only decided by how long and how far the pointer moved.
     */
    private pressActive;
    private pressStartAt;
    private pressClientX;
    private pressClientY;
    /** Largest Manhattan distance the pointer travelled during this press. */
    private pressMaxMovement;
    /** The hotspot the press landed on, while it can still become a hold or a click. */
    private hotspotHold;
    private hotspotHoldTriggered;
    /** Buttons currently held, as reported by the last pointer event. Qt queries
     *  `QGuiApplication::mouseButtons()` per tick so a release that never arrives
     *  cannot leave a press or a drag stuck; this is the DOM's equivalent. */
    private cursorButtons;
    /** Offscreen copy of the frame the mascot is showing, for the opaque-pixel hit
     *  test (`ShijimaWidget::pointInside`). Re-read whenever the image changes. */
    private alphaCanvas;
    private alphaData;
    private alphaSrc;
    /** Cached host-CSS offset between this engine's coordinates and the drawn anchor
     *  (see `hostShift()`); refreshed at most once per logic tick. */
    private hostShiftCache;
    /** Change detection for the observation stream. */
    private observedPath;
    private observedImage;
    private clampReported;
    private eventsAbortController;
    private resizeTimer;
    private isScrolling;
    private scrollDebounceTimer;
    /**
     * One-shot timers that are not already covered by `resizeTimer` /
     * `scrollDebounceTimer`. `init()` and `setVisible()` schedule work that can fire
     * after `destroy()`, which used to let a torn-down mascot poke at a detached DOM
     * node (and at `this.visible`, which no longer means anything).
     */
    private pendingTimers;
    private destroyed;
    /** Set for the tick on which an Offset action moved the anchor on purpose. */
    private offsetJumped;
    /** How long the current behaviour has been running, for the hard cap. */
    private behaviorTicks;
    /** Consecutive ticks the anchor has not moved, for the "standing still" pacer. */
    private stillTicks;
    /** Same, but only reset by real movement: it is what guarantees a lively page. */
    private anchorStillTicks;
    /** Set once the mascot has been in the same spot too long: the next pick must travel. */
    private wantMovement;
    /** Tick until which partner behaviours stay out of the pool (see the config's
     *  `interactionCooldownTicks`); refreshed while an interaction is running. */
    private interactionCooldownUntil;
    /** Behaviours initialised in the current tick, for the runaway guard. */
    private behaviorInitsThisTick;
    private actionExpansionsThisTick;
    /** Affordance state (see Broadcast.ts). Advertisements and scan links belong to
     *  the action instance and live on its frame; the handshake belongs to the
     *  mascot, because its behaviour is what the partner is waiting on. */
    private interaction;
    /** Tick at which this mascot first noticed that its advertisement had been
     *  claimed, or 0 when it is not holding a pose for anybody (see
     *  runtime.broadcastServeTimeoutTicks). */
    private servingClaimSince;
    /** Paused while the mascot's container is scrolled out of view. */
    private visible;
    private intersectionObserver;
    x: number;
    y: number;
    vx: number;
    vy: number;
    lookRight: boolean;
    static addObserver(observer: EngineObserver): void;
    /** One page-level dispatcher handles events for all mascots. */
    private static installGlobalEvents;
    static removeObserver(observer: EngineObserver): void;
    static getInstances(): MascotEngine[];
    /** The active animation configuration. */
    static getAnimationConfig(): AnimationConfig;
    /** The shared affordance registry (two mascots use it to find each other). */
    static getBroadcasts(): BroadcastManager;
    /** Decided on the first load; `reloadAnimationConfig(url)` re-decides it. */
    private static animationConfigUrl;
    /** Overridden by the host so a pack can live anywhere; see `configure()`. */
    private static packBaseUrl;
    /**
     * Point the engine at its assets. Every URL is resolved by the caller, because
     * an embedded or published build cannot assume it is served from the page root.
     *
     * Call this before the first mascot is created: the animation configuration is
     * fetched once and then cached for the page, so a later change is only picked up
     * by `reloadAnimationConfig()`.
     */
    static configure(options: {
        packBaseUrl?: string;
        animationConfigUrl?: string;
        /** True drops the built-in animation preset for this page; false is the default. */
        ignoreBuiltin?: boolean;
    }): void;
    /**
     * Change how the simulation is tuned. Each field is validated as a finite number
     * and anything else is ignored, so a partially-written settings object is safe.
     *
     * It applies to every mascot, including the ones already on the page: the values
     * are read per tick rather than captured at construction, which is what makes a
     * live settings panel possible. The exceptions are positions already computed
     * from the old values (a mascot mid-fall keeps its velocity), so a change is
     * smooth rather than instantaneous.
     */
    static setRuntimeOptions(options: RuntimeOptions): RuntimeSnapshot;
    /** The tuning currently in effect. */
    static getRuntimeOptions(): RuntimeSnapshot;
    /** The asset base URL in effect, for diagnostics and for hosts that build their
     *  own sprite URLs (`spriteUrl()` returns the same shape). */
    static getPackBaseUrl(): string;
    /**
     * Install a configuration from an object in the same shape as the JSON file.
     * This is the entry point a settings UI would use; it wins over the file until
     * `loadAnimationConfig()` is called again with `force`.
     */
    static setAnimationConfig(file: unknown, source?: string): AnimationConfig;
    /**
     * Re-apply the page-level `ignoreBuiltin` preference to the configuration in
     * effect.
     *
     * `toJSON()` hands back the host's own layer only, so re-seeding it never bakes
     * the built-in preset into anything; a page that never passes the flag keeps
     * whatever the file said.
     */
    private static applyBuiltinPreference;
    /**
     * Read the configuration file once and keep it. A missing or invalid file leaves
     * the built-in preset in place (or the packs' own settings, when the page asked
     * for `ignoreBuiltin`), so this never breaks the app.
     *
     * Probing the classic path is the price of the "just drop a file at
     * `/animation.config.json`" workflow: a host that has no file sees one expected
     * 404 per page load, and nothing else.
     */
    static loadAnimationConfig(url?: string): Promise<void>;
    /**
     * Follow the OS reduced-motion preference, now and on later changes.
     *
     * The disposer is kept instead of the listener because a bare listener can never
     * be unregistered: `matchMedia` needs the very `MediaQueryList` it came from, so
     * the old code left a page-lifetime listener behind with no way to remove it.
     */
    private static watchReducedMotion;
    /** Re-read the file, discarding both the cache and any programmatic override. */
    static reloadAnimationConfig(url?: string): Promise<AnimationConfig>;
    constructor(container: HTMLElement, mascotName: string);
    init(): Promise<void>;
    /** URL of a pack sprite. */
    private spriteUrl;
    /**
     * Fetch every sprite the pack can show, once per pack. The browser then serves the
     * pose changes from its decoded cache, so swapping poses no longer flashes an empty
     * image. Cheap: these packs are ~100 images of 128 px.
     */
    private preloadSprites;
    /** Decode the poses the spawn paints, so even the landing sequence has no gap.
     *  Bounded by a timeout: a slow network must never delay the mascot. */
    private warmFirstPose;
    /** The first pose of the action a fresh mascot starts with (Fall/Bouncing). */
    private firstPose;
    /**
     * Size the sprite box from the decoded bitmap. Packs may declare anything, and
     * a zero-area box would defeat both painting and hit testing, so the previous
     * value is kept until a real one is known (see the constructor for why the size
     * must be definite at all).
     */
    private applySpriteIntrinsicSize;
    /** Pause while the mascot's container is scrolled out of view, so an embedded
     *  mascot costs nothing when the visitor is reading another part of the page. */
    private watchVisibility;
    private resetScrollTracking;
    private setVisible;
    /** `setTimeout` that `destroy()` will cancel. */
    private later;
    private setPauseReason;
    private isOnScreen;
    private resumeLoop;
    destroy(): void;
    /** Current observable state, for timers and for poking at the mascot in the
     *  browser console: `__mascotEngines[0].snapshot()`. */
    /** Where the mascot is drawn, in viewport pixels. The engine's own coordinates are
     *  virtual units (1 unit = 1 sprite pixel at `scale`), so anything outside the
     *  engine — logs, host code — should read this instead of `x`/`y`. */
    position(): {
        x: number;
        y: number;
    };
    snapshot(): {
        pet: string;
        mascot: string;
        x: number;
        y: number;
        behavior: string;
        leaf: string;
        path: string;
        nodeType: import("./types.js").ActionType;
        border: string;
        image: string;
        lookRight: boolean;
        stackDepth: number;
        dragging: boolean;
        tick: number;
    };
    /** Convert a virtual length or coordinate to viewport pixels (the log's unit). */
    private toPage;
    private emit;
    private currentImage;
    private leafLabel;
    /**
     * A client point in sprite (bitmap) coordinates, matching how the image is drawn
     * and how libshijima computes it:
     *
     *   looking left   left edge = anchor.x - ImageAnchor.x
     *   looking right  left edge = anchor.x - (width - ImageAnchor.x)   (mirrored)
     *
     * Qt hardcodes 128 here ("FIXME: assumes width of 128"); the real bitmap width is
     * used instead, which is the same number for these packs and stays correct for
     * others.
     */
    /**
     * A client point in sprite (bitmap) coordinates — boundary two, screen → virtual.
     *
     * Because the engine works in virtual units and one virtual unit is one sprite
     * pixel, the bitmap's own geometry (ImageAnchor, the 128 px width) *is* the virtual
     * geometry, so the local point is simply the virtual cursor minus the sprite's
     * virtual top-left. The hotspot origins then compare directly, at any drawn size.
     */
    private spritePoint;
    /**
     * How far the host's CSS moves the anchor away from the coordinates this engine
     * computes, in virtual units.
     *
     * The engine's own model is `x`/`y`, but nothing stops the host from moving the
     * anchor with CSS — firefly lifts it above its music player
     * (`body.has-global-player #mascot-pet-anchor { transform: translateY(-4.5rem) }`).
     * Pointer mapping has to follow the pixels the visitor sees, or a press lands on
     * whatever the engine *would* have drawn at that spot: measured 56–72 px off in
     * firefly, which made the drawn head unpressable and put the hotspots on the body.
     *
     * The shift is measured from the DOM at most once per logic tick (and forced before
     * a press), because the anchor's border box already carries both this engine's
     * transform and the host's.
     */
    private hostShift;
    /** The hotspot under a client point, if that behaviour is allowed to run. */
    private hotspotUnderCursor;
    private stackPath;
    private bindEvents;
    /**
     * Linear size multiplier of the drawn mascot. The engine keeps every coordinate
     * in *virtual* units where one unit is one sprite pixel, exactly like libshijima's
     * `environment::set_scale`, and converts only at the two boundaries: rendering
     * (virtual → screen) and pointer input (screen → virtual). That is what lets the
     * packs' own pixel constants — `workArea.top+64`, `width-128`, pose velocities,
     * `Offset Y=1`, hotspot origins — stay correct at any drawn size, and it keeps the
     * relative motion feel identical (a bigger mascot covers more pixels per tick).
     */
    private get spriteScale();
    /** Viewport extent in virtual units. */
    private get virtualWidth();
    private get virtualHeight();
    /** A client (screen) point in virtual units. */
    private toVirtual;
    /**
     * The cursor the *simulation* reads, in virtual units: the pointer, plus this
     * drag's grab offset while the mascot is held. Qt reads the same value here and in
     * the pack's `mascot.environment.cursor` (`state::get_raw_cursor()` →
     * `roll_dcursor()` → `get_cursor()`), so the held pose's `FootX` comparison and the
     * anchor stay in one reference frame.
     */
    private simulationCursorVirtual;
    /** `environment.cursor` for the pack expressions: position and per-tick delta,
     *  both in virtual units. */
    private cursorInVirtualUnits;
    /** Release a held mascot: the grab offset goes away, so the pointer is the cursor
     *  again. The behaviour change (Thrown, resist-escape) is the caller's job. */
    private endDrag;
    /** Pick the mascot up: Qt does this from `beginLeftPress()` when the press is not on
     *  a hotspot, and from `mouseMoveEvent()` when a hotspot candidate leaves the hold
     *  tolerance. */
    private beginDrag;
    /**
     * `dragged::subtick()`: pin the anchor to `cursor + OffsetX/OffsetY`.
     *
     * Qt runs this once per *subtick* — every 10 ms, i.e. four times per logic frame —
     * and assigns the anchor directly, with no clamp and no interpolation, so a held
     * mascot can never drift away from the cursor however fast the pointer moves. The
     * web engine ticks every 40 ms, so this is called from the tick *and* from every
     * pointer event, and `render()` skips interpolation while a drag is active.
     */
    private applyDragAnchor;
    /** Qt `ShijimaWidget::mouseMoveEvent()`: remember how far the pointer has travelled
     *  since the press, and let a hotspot candidate become a pickup once it leaves the
     *  hold tolerance. */
    private updatePressMovement;
    /** Qt `ShijimaWidget::maintainHotspotHold()`: a press that has been held inside the
     *  tolerances long enough runs the hotspot's behaviour, and keeps it running. Qt
     *  pins the behaviour's next selection to itself (`prefer_next_behavior`) so the
     *  patpat repeats; re-issuing it whenever the mascot has moved on is the equivalent
     *  here, without touching the behaviour-selection machinery. */
    private maintainHotspotHold;
    /** Qt `ShijimaWidget::mouseReleaseEvent()`: a short, still release counts as a click
     *  and triggers the hotspot under the *release* point (`manager::trigger_hotspot`);
     *  a release after a pickup throws the mascot (`dragged::handle_dragging`). */
    private finishPress;
    /** Drop a press without deciding a gesture (the tab went hidden mid-press). */
    private cancelPress;
    private emitHotspot;
    /** `ShijimaWidget::pointInside()`: a press only belongs to the mascot when it lands
     *  on an opaque pixel of the frame it is showing. The bitmap is cached until the
     *  image changes; a canvas that cannot be read (sprites served from another origin)
     *  degrades to the whole box. */
    private isOpaqueAt;
    /** The pixels of the frame the mascot is currently showing, cached per image URL. */
    private frameAlpha;
    /** Resolve a configuration Metric against one viewport axis. A bare number is a
     *  page pixel value, so it is divided by the sprite scale to reach virtual units;
     *  percentages and `left`/`right`/`top`/`bottom`/`center` follow the viewport. */
    private metric;
    /** The mascot's activity rectangle in viewport coordinates. */
    private area;
    /** Start position from the configuration: top or floor, any x, and several
     *  mascots are spread apart instead of stacking on one spot. */
    private applySpawnPosition;
    /** Is `point` on one of the work-area borders? */
    private borderIsOn;
    private environment;
    private mascotScope;
    private run;
    /**
     * libshijima splits the attributes of an <ActionReference> in two
     * (scripting::variables::add_attr):
     *   ${expr} is "dynamic (once)"       — evaluated when the action starts;
     *   #{expr} is "dynamic (every frame)" — re-evaluated on each tick.
     * Freezing ${...} is what keeps TargetX/TargetY stable for the whole action: a
     * target that is re-rolled every tick makes the mascot jitter around it
     * ("stuck halfway up the wall") instead of travelling to it.
     */
    private resolveVars;
    /** Every attribute of the frame as a value: frozen for ${...} (evaluated once,
     *  the first time it is needed) and re-evaluated per tick for #{...}. */
    private frameVars;
    private varValue;
    private varString;
    private varNumber;
    private context;
    private cleanExpression;
    private evaluate;
    private evaluateCondition;
    private evaluateNumber;
    private newFrame;
    /** libshijima `base::init()`: an action that advertises an `Affordance` starts a
     *  broadcast as it is created and clears the attribute, so it advertises once.
     *  A ScanMove action is the scanning side: it looks for somebody else's
     *  advertisement instead (`scanmove::init`). */
    private initBroadcast;
    /** libshijima `base::finalize()`: an action instance that ends stops advertising
     *  and hands its scan target back to the pool. */
    private releaseFrame;
    private releaseStack;
    private setBehavior;
    private loop;
    private tick;
    /**
     * libshijima `base::tick()` for every advertisement this mascot currently owns:
     * keep the advertised position current, and when somebody walked up to it, start
     * the behaviour the handshake asked for.
     */
    private maintainBroadcasts;
    /**
     * Is this frame the advertisement of a claim that has not arrived yet, and is the
     * wait still within its bound? While it is true the frame must not end and the
     * pacer must not pull the mascot away, otherwise the scanner loses its partner
     * mid-approach. Everything else (a drag, a scroll, a forced `Fall`) still releases
     * the advertisement the normal way — only the advertisement's *own* animation
     * ending is deferred.
     */
    private holdingClaim;
    /**
     * Animation configuration, two different limits with two different jobs:
     *
     *   forcedSwitchTicks  how long the mascot may stand still before it is nudged
     *                      into something else, so a page never looks frozen. Travel
     *                      is never cut: it is moving, so the counter is zero.
     *   maxBehaviorTicks   a hard cap on any one behaviour, so a long wall climb or
     *                      a crawl cannot monopolise the mascot. A fall (and a drag)
     *                      is still left alone, since those are engine-driven states.
     */
    private enforceBehaviorSwitch;
    private switchBehavior;
    /** Is the mascot currently going somewhere? Used so the pacer only interrupts
     *  standing still, never a walk, run, climb or jump in progress. */
    private isTravelling;
    /** Feed the observation stream: stack/frame changes and impossible steps.
     *  Runs once per logic tick and does nothing when nobody is listening. */
    private observeTick;
    private activeAnimation;
    private advanceActionTree;
    private popActionStack;
    private currentPose;
    private currentLeaf;
    private borderTypeSatisfied;
    /** Actions that end when they touch the floor. `Thrown`/`Fall` are Sequence
     *  behaviours whose Falling child does the physics, so only the fall action
     *  itself (and the embedded Fall class) counts here. */
    private isFallLike;
    /** Actions that end when they reach their target. */
    private isJumpLike;
    /** An action with a usable TargetX/TargetY runs until it arrives there, so its
     *  animation must be allowed to loop instead of ending the action.
     *
     *  The value is what counts, not the presence of the attribute: the packs
     *  contain a broken target expression (`Math.random*100` in ClimbAlongWall)
     *  that evaluates to NaN. Treating "attribute present" as "seeking a target"
     *  while the movement code sees no target made the action impossible to
     *  finish, which left the mascot pressed against a border for ever. */
    private hasTarget;
    /** libshijima's action classes for the drag: `Pinched` is `...Dragged` (follows
     *  the cursor and times the struggle) and `Resisting` is `...Regist` (breaks free). */
    private isDraggedAction;
    private isResistAction;
    /** `com.group_finity.mascot.action.Offset` — an instant anchor translation. */
    private isOffsetAction;
    /** Affordance actions. The scan side (`ScanMove`) walks to somebody else's
     *  advertisement; the interaction side (`Interact`) runs alongside the partner. */
    private isScanMove;
    private isInteract;
    /** Actions whose mascot-level feature this port does not implement. */
    private isUnsupportedAction;
    private actionTreeMatches;
    /**
     * Which border a behaviour *starts* on: the first `BorderType` its action tree
     * requires, in the order libshijima evaluates them. Returns `FLEXIBLE_BORDER` when
     * an `Offset` comes first (the behaviour can begin anywhere), or `null` when the
     * behaviour needs no border at all.
     */
    private firstBorderOf;
    private firstBorderInTree;
    /** A border the mascot is standing on right now, other than the one it just lost. */
    private currentBorderAt;
    /** The surface currently supporting the anchor, preserving the active side at corners. */
    private surfaceAt;
    /** Detach from the current surface before starting Fall; Fall tests contact first. */
    private detachAndFall;
    /** Consume one scroll gesture or direction change after applying its page shift. */
    private applyScrollIntent;
    /** Can this behaviour actually move the mascot? Used to guarantee that the
     *  mascot goes somewhere after standing still for a while. */
    private canTravel;
    /** Structural part of `canTravel`: does the tree contain a Move / a ScanMove? */
    private travelStructure;
    /** Does this behaviour only make sense with a second mascot around? */
    private needsPartnerToAct;
    /**
     * Selection weight after the configuration:
     *   1. an explicit `behaviorWeights` entry for this behaviour wins;
     *   2. a partner behaviour uses `partnerWeights` (alone / with partner), so the
     *      pack's 1000–3000 weights do not turn a lone page mascot into a statue;
     *   3. otherwise the pack's own Frequency.
     */
    private effectiveWeight;
    /**
     * Is another mascot somewhere a scan could succeed right now? Mirrors the two
     * positional gates in `BroadcastManager.tryConnect`: the same surface (|Δy| ≤ 1)
     * and within the scan distance. Two mascots both walking the floor are "reachable",
     * one on the floor and one on the ceiling are not — which is what makes
     * `partnerWeights.reachable` boost exactly the hugs that can actually happen.
     */
    private partnerReachable;
    /** A behavior can only be offered when its action is present and this engine
     *  can actually carry it out. */
    private behaviorUsable;
    /** Stop an action that keeps trying to move but never gets anywhere: a target
     *  it can never reach, or a border it is pressed against. */
    private guardStall;
    /** Apply the configuration's duration multiplier to a pack hold time. */
    private scaledTicks;
    /**
     * `maxTravelPx`: pull a wander target in so the mascot stays near where it is.
     *
     * Targets that point exactly at a border are left alone — the packs use those to
     * send a mascot to a wall ("walk to the right edge, then climb"), and clamping
     * them would break the sequence that follows. Interior targets are the "wander
     * somewhere" kind, and those are what would otherwise cross the whole page.
     */
    private clampTravelTarget;
    private updatePhysics;
    /** Clamp the viewport-space anchor into its work area. */
    private clampToWorkArea;
    private onBehaviorEnd;
    private render;
}
//# sourceMappingURL=MascotEngine.d.ts.map