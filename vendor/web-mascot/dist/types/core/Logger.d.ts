/**
 * The one logging front door for the whole library.
 *
 * Design goals, in priority order:
 *
 *  1. **Off costs nothing.** With no destination configured, `log()` returns on a
 *     single modulo check and every `logger` is the same inert object. Nothing
 *     allocates, nothing formats, nothing subscribes. Call sites can therefore be
 *     left in place permanently without paying for them — which is the whole
 *     reason this is a module of its own instead of `if (enabled) console.log()`.
 *  2. **On costs little.** A record is only formatted once a sink actually wants
 *     it, and only for sinks whose level admits it. Sinks are called directly, so
 *     the browser's own console (the expensive part, because devtools keeps the
 *     formatted text alive) is skipped entirely unless the console sink is on.
 *  3. **Destinations compose.** Console, a host-provided sink and the dev-server
 *     file endpoint are independent switches. The old API made `sink` and
 *     `consoleSink` mutually exclusive, which meant a host that wanted both had to
 *     write its own fan-out.
 *
 * Deliberately *not* here: buffering, batching, HTTP, file writing. A browser
 * cannot write files, so persistence is always a sink (see `vite-plugin-mascot-log`
 * for the dev-server one). Keeping this module DOM- and timer-free is what makes
 * the "off" path provably free.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
/** Which subsystem a record came from, so a sink can route by area. */
export type LogChannel = "engine" | "observe" | "logger";
export interface LogRecord {
    /** Monotonic milliseconds since the page's time origin. */
    t: number;
    level: LogLevel;
    channel: LogChannel;
    /** `[web-mascot]`-prefixed message, already interpolated. */
    message: string;
    /** Structured fields; omitted when the call site passed none. */
    data?: Record<string, unknown>;
}
export type LogSink = (record: LogRecord) => void;
/** A named destination plus its own level threshold. */
export interface LogSinkEntry {
    name: string;
    level: LogLevel;
    sink: LogSink;
}
export interface LogOptions {
    /**
     * Level for the console sink. `false` disables it, `true` means `"info"`.
     * The console is the only *display* destination; sinks are for transport.
     */
    console?: boolean | LogLevel;
    /** Extra destinations. They compose with the console and with each other. */
    sinks?: LogSinkEntry[];
    /** Level a record must reach before any sink is consulted. */
    level?: LogLevel;
    /**
     * Prefix for every message. `null` drops the prefix; a function can tag each
     * channel differently.
     */
    prefix?: string | null | ((channel: LogChannel) => string);
}
/**
 * A logger handle. One exists per channel; all of them share the module state
 * below, so a level change applies everywhere at once.
 */
export declare class Logger {
    private readonly channel;
    /** @internal — hosts get handles from `loggerFor()`. */
    constructor(channel: LogChannel);
    /** True when nothing would be emitted, including the console. Call sites may
     *  use it to skip building an expensive `data` object. */
    get active(): boolean;
    get level(): LogLevel;
    debug(message: string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, data?: Record<string, unknown>): void;
}
export declare function loggerFor(channel: LogChannel): Logger;
/**
 * Install the destinations. Called by `configure()`/`attach()`; also usable on
 * its own by a host that only wants library diagnostics.
 */
export declare function configureLogging(options: LogOptions): void;
/** Stop emitting entirely. Everything keeps working; nothing is formatted. */
export declare function disableLogging(): void;
/** Current destinations, for diagnostics (`__mascotConfig.log()`). */
export declare function loggingState(): {
    active: boolean;
    console: boolean;
    prefix: string;
    sinks: string[];
};
/** Convenience for a host that only wants the console. */
export declare function consoleSink(level?: LogLevel): LogSinkEntry;
//# sourceMappingURL=Logger.d.ts.map