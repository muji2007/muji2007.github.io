/**
 * Where batches go, when the host supplies a destination. A sink is the supported
 * way to collect records outside a Vite dev/preview server, where
 * `/__mascot-log` does not exist.
 */
export interface MascotLogBatch {
    session: string;
    pet: string;
    lines: string[];
}
export interface MascotLogSink {
    (batch: MascotLogBatch): void;
}
/**
 * Route every batch to a host-provided destination instead of the dev endpoint.
 * Takes precedence over both the endpoint and any `addLogSink` mirror. Call it
 * before `startMascotLogRecorder()`.
 */
export declare function setLogSink(sink: MascotLogSink): void;
/**
 * Mirror every batch to an additional destination without replacing the dev
 * endpoint. Used for console fallbacks in hosts that have no dev server.
 */
export declare function addLogSink(sink: MascotLogSink): void;
/**
 * Tell the recorder whether the dev-server file endpoint may be used. A published
 * package has no such route, so `configure({ log: { file: false } })` turns the
 * probe into a no-op and leaves the page completely untouched.
 */
export declare function allowDevEndpoint(allowed: boolean): void;
/**
 * Declare that there is no endpoint to probe, so the recorder does not issue even
 * one request. Use it when the host knows its page is not served by the Vite
 * dev/preview middleware (a packaged build, a static host, a CDN): `file: false`
 * already skips the network, and this keeps the *first* probe from being made in
 * the case where the endpoint would otherwise be assumed to exist.
 */
export declare function silenceDevEndpoint(silent: boolean): void;
/**
 * Start recording: subscribe, sample, and resolve a destination. A host-provided
 * sink wins over the dev endpoint, so an embedded build never probes it.
 *
 * Returns `false` when the caller explicitly asked for every destination to be
 * off, in which case nothing at all was installed.
 */
export declare function startMascotLogRecorder(): boolean;
/** Stop recording and release everything. Safe to call more than once. */
export declare function stopMascotLogRecorder(): void;
/** Whether a destination has been resolved and records are being produced. */
export declare function isRecording(): boolean;
/** Drop the accumulated per-pet tracking state without touching destinations. */
export declare function resetMascotLogRecorder(): void;
//# sourceMappingURL=MascotLogRecorder.d.ts.map