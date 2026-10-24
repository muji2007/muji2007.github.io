import type { MascotConfig } from "./types.js";
export declare class XMLParser {
    /**
     * @param packBaseUrl Already-resolved base URL of the pack directory, without a
     *   trailing slash (e.g. `https://cdn.example.com/mascots/Neuron`). The caller
     *   owns URL resolution, so an embedded or hosted build never depends on the
     *   page's root path.
     */
    static loadConfig(mascotName: string, packBaseUrl: string): Promise<MascotConfig>;
    private static getTag;
    private static parseActions;
    private static parseActionNode;
    private static readAttributes;
    private static parsePoses;
    /** `<Hotspot Shape Origin Size Behavior>` children of an animation. libshijima's
     *  parser warns and drops a hotspot with an unknown shape or no behaviour, so the
     *  same entries are skipped here rather than guessed at. */
    private static parseHotspots;
    private static parseBehaviors;
}
//# sourceMappingURL=XMLParser.d.ts.map