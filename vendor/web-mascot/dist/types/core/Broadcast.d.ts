/**
 * Affordance broadcasts — the port of libshijima's `broadcast/` subsystem.
 *
 * Two mascots can act on each other:
 *
 *   broadcast side  an action with an `Affordance` attribute advertises it
 *                   (`SitAffordance` broadcasts "CuddleNeuro");
 *   scan side       a `ScanMove` action asks the manager for a nearby broadcast
 *                   of the name it wants, walks to it, and on arrival both sides
 *                   switch to the behaviours named by their attributes
 *                   (`RunAffordance`: Behavior="IHugYou" TargetBehavior="IAmHugged");
 *   interaction     the two behaviours then run side by side while the shared
 *                   `ongoing` flag is set; whoever finishes first clears it and
 *                   ends the other side too.
 *
 * The constants and the merge rules are taken from the Qt sources:
 * `broadcast/manager.cc` (256 px scan distance, |Δy| ≤ 1), `server_state.hpp`
 * (availability / meet-up / ongoing flag), `client.cc`, `interaction.cc`.
 */
export interface Anchor {
    x: number;
    y: number;
}
/** libshijima `broadcast::server_state`. */
export declare class ServerState {
    anchor: Anchor;
    clientBehavior: string;
    serverBehavior: string;
    private finalized;
    private available;
    private metUp;
    private shared;
    constructor(anchor: Anchor);
    get active(): boolean;
    get isAvailable(): boolean;
    /**
     * A scanner has claimed this advertisement and is on its way. libshijima has no
     * such state: the advertising animation ends when it wants to, the claim is
     * finalized with it, and the approaching scanner is dropped on its next tick.
     * The owner of the advertisement needs to be able to see the claim so it can
     * hold its pose until the partner arrives (see BroadcastManager).
     */
    get isClaimed(): boolean;
    get didMeetUp(): boolean;
    /** Keep the advertised position in sync with the broadcasting mascot. */
    updateAnchor(anchor: Anchor): void;
    notifyArrival(): void;
    /** The action that advertised this affordance ended. */
    finalize(): void;
    setAvailable(available: boolean): void;
    interaction(): Interaction;
    ongoingPoint(): {
        value: boolean;
    };
}
/** libshijima `broadcast::interaction`: the handshake both behaviours watch. */
export declare class Interaction {
    started: boolean;
    private shared;
    private name;
    constructor(shared?: {
        value: boolean;
    } | null, behavior?: string);
    get available(): boolean;
    get ongoing(): boolean;
    get behavior(): string;
    /** Ends the interaction for both sides. */
    finalize(): void;
}
/** libshijima `broadcast::client`: one ScanMove action's link to a broadcast. */
export declare class ClientHandle {
    private server;
    constructor(server?: ServerState | null);
    get connected(): boolean;
    get target(): Anchor | null;
    notifyArrival(): void;
    interaction(): Interaction;
    /** Dropping the link frees the broadcast for another scanner. */
    finalize(): void;
}
/** libshijima `broadcast::manager`: shared by every mascot in the page. */
export declare class BroadcastManager {
    /** `broadcast/manager.cc`: ScanMove only claims a mascot that is already near. */
    static readonly MAX_SCAN_DISTANCE = 256;
    private servers;
    /** Remove finalized advertisements that can no longer be reached. */
    prune(): void;
    startBroadcast(affordance: string, anchor: Anchor): ServerState;
    tryConnect(affordance: string, anchor: Anchor, clientBehavior: string, serverBehavior: string, maxDistance?: number): ClientHandle | null;
    /** Diagnostics for the observation log: what a scan would have seen. */
    probe(affordance: string, anchor: Anchor): {
        live: number;
        nearest: number | null;
    };
    /** Live broadcasts per affordance name, for the observation log. */
    snapshot(): Record<string, number>;
}
//# sourceMappingURL=Broadcast.d.ts.map