export declare class HLC {
    timestamp: number;
    counter: number;
    nodeId: string;
    constructor(timestamp: number, counter: number, nodeId: string);
    /**
     * Generates a lexicographically sortable string representation of the HLC.
     */
    toString(): string;
    /**
     * Parses an HLC from its string representation.
     */
    static parse(hlcStr: string): HLC;
    /**
     * Generates the initial HLC for a node.
     */
    static initial(nodeId: string): HLC;
    /**
     * Sends (creates a new HLC event) based on the current HLC and wall clock.
     */
    static send(current: HLC, wallTime?: number): HLC;
    /**
     * Receives an HLC event from another node and updates the local HLC.
     */
    static recv(local: HLC, remote: HLC, wallTime?: number): HLC;
    /**
     * Compares two HLCs. Returns 1 if hlc1 > hlc2, -1 if hlc1 < hlc2, 0 if equal.
     */
    static compare(hlc1: HLC, hlc2: HLC): number;
}
