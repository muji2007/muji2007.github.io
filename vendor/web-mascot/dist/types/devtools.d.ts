import { MascotEngine } from "./core/MascotEngine.js";
import type { MascotLogSink } from "./dev/MascotLogRecorder.js";
export { setLogSink, addLogSink } from "./dev/MascotLogRecorder.js";
export type { MascotLogSink, MascotLogBatch } from "./dev/MascotLogRecorder.js";
export { isRecording, resetMascotLogRecorder, startMascotLogRecorder, stopMascotLogRecorder, } from "./dev/MascotLogRecorder.js";
export { configureLogging, disableLogging, loggingState, consoleSink, loggerFor } from "./core/Logger.js";
export type { LogLevel, LogSink, LogRecord, LogChannel, LogOptions } from "./core/Logger.js";
/**
 * Development entry point of the web-mascot library.
 *
 * This entry owns the observation log, kept out of the main entry by design: the
 * recorder is a development tool, and a published build should not make every
 * host page post to the dev endpoint unless the host asked for it.
 *
 *     import { attach } from "web-mascot/devtools";
 *
 *     attach();                          // dev-server file endpoint (default)
 *     attach({ console: true });         // mirror to the browser console too
 *     attach({ sinks: [(batch) => send(batch)] });  // any other destination
 *
 * Destinations **compose**: the console, the dev-server file endpoint and any
 * number of host sinks can all be active at once. The previous API made `sink`
 * and `consoleSink` mutually exclusive replacements, which meant a host that
 * wanted both had to write its own fan-out.
 */
/**
 * Switches for the **observation log** only.
 *
 * This entry deliberately does not touch the library's own diagnostics
 * (`[web-mascot] ...`): "record where the mascots go" and "tell me what the
 * library is doing" are different concerns with different lifetimes, and having
 * one option drive both meant enabling the observation log silently changed the
 * console verbosity of the engine. Diagnostics are configured on their own, via
 * `configureLogging()`/`loggingState()` from this same entry.
 */
export interface DevtoolsOptions {
    /** Master switch for the observation log. `false` installs nothing at all.
     *  Default `true`. */
    enabled?: boolean;
    /** Mirror every batch to the browser console. Default `false`. */
    console?: boolean;
    /** Extra destinations. They receive the full batch, not the log lines. */
    sinks?: MascotLogSink[];
    /** Only forward records of these kinds to the console mirror (and any sink that
     *  asks for it). Omit to forward everything. The verbose kinds are `move`,
     *  `pose` and `lifecycle`; the interesting ones are `spawn`, `behavior`, `peer`,
     *  `stop`, `switch` and `suspect`. */
    kinds?: string[];
    /** Allow the Vite dev/preview file endpoint. Default: `true` here, and it is
     *  what makes `attach()` alone write files. */
    file?: boolean;
    /**
     * Record without ever probing the dev endpoint — not even once. Set it when the
     * host knows no such route exists (a packaged build, a static host, a CDN), so
     * the library does not put a request in the network panel to discover it.
     */
    silent?: boolean;
}
/**
 * Start recording the observation log. Destinations are additive; supplying one
 * never disables another unless the host says so.
 *
 * Touches **only** the observation log — the library's own diagnostics are
 * configured separately through `configureLogging()`. Returns `false` when
 * `enabled: false` or when no destination is viable, in which case nothing was
 * installed and the page costs nothing.
 */
export declare function attach(options?: DevtoolsOptions): boolean;
/** Re-exported so a host that only uses this entry can still see the engine. */
export { MascotEngine };
//# sourceMappingURL=devtools.d.ts.map