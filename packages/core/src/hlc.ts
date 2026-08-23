// Copyright (c) 2026 Emirhan CAMCI. All rights reserved.
export class HLC {
  constructor(
    public timestamp: number,
    public counter: number,
    public nodeId: string
  ) {}

  /**
   * Generates a lexicographically sortable string representation of the HLC.
   */
  toString(): string {
    const tsStr = new Date(this.timestamp).toISOString();
    const counterStr = this.counter.toString(16).padStart(4, '0');
    return `${tsStr}_${counterStr}_${this.nodeId}`;
  }

  /**
   * Parses an HLC from its string representation.
   */
  static parse(hlcStr: string): HLC {
    const parts = hlcStr.split('_');
    if (parts.length !== 3) {
      throw new Error(`Invalid HLC string: ${hlcStr}`);
    }
    const [tsStr, counterStr, nodeId] = parts;
    return new HLC(new Date(tsStr).getTime(), parseInt(counterStr, 16), nodeId);
  }

  /**
   * Generates the initial HLC for a node.
   */
  static initial(nodeId: string): HLC {
    return new HLC(Date.now(), 0, nodeId);
  }

  /**
   * Sends (creates a new HLC event) based on the current HLC and wall clock.
   */
  static send(current: HLC, wallTime: number = Date.now()): HLC {
    let newTimestamp = current.timestamp;
    let newCounter = current.counter;

    if (wallTime > current.timestamp) {
      newTimestamp = wallTime;
      newCounter = 0;
    } else {
      newCounter++;
    }

    return new HLC(newTimestamp, newCounter, current.nodeId);
  }

  /**
   * Receives an HLC event from another node and updates the local HLC.
   */
  static recv(local: HLC, remote: HLC, wallTime: number = Date.now()): HLC {
    let newTimestamp = Math.max(local.timestamp, remote.timestamp, wallTime);
    let newCounter = 0;

    if (newTimestamp === local.timestamp && newTimestamp === remote.timestamp) {
      newCounter = Math.max(local.counter, remote.counter) + 1;
    } else if (newTimestamp === local.timestamp) {
      newCounter = local.counter + 1;
    } else if (newTimestamp === remote.timestamp) {
      newCounter = remote.counter + 1;
    } else {
      newCounter = 0;
    }

    return new HLC(newTimestamp, newCounter, local.nodeId);
  }

  /**
   * Compares two HLCs. Returns 1 if hlc1 > hlc2, -1 if hlc1 < hlc2, 0 if equal.
   */
  static compare(hlc1: HLC, hlc2: HLC): number {
    if (hlc1.timestamp !== hlc2.timestamp) {
      return hlc1.timestamp - hlc2.timestamp;
    }
    if (hlc1.counter !== hlc2.counter) {
      return hlc1.counter - hlc2.counter;
    }
    if (hlc1.nodeId !== hlc2.nodeId) {
      return hlc1.nodeId > hlc2.nodeId ? 1 : -1;
    }
    return 0;
  }
}
