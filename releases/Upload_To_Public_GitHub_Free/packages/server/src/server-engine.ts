import { HLC, SyncOperation, SyncPushRequest, SyncPullResponse } from '@sync-engine/core';

export interface DatabaseAdapter {
  getLatestHlc(): Promise<string | null>;
  saveLatestHlc(hlc: string): Promise<void>;
  
  getOperationsSince(hlc: string | null): Promise<SyncOperation[]>;
  saveOperation(op: SyncOperation): Promise<void>;
  
  applyInsertOrUpdate(tableName: string, id: string, data: any): Promise<void>;
  applyDelete(tableName: string, id: string): Promise<void>;
  
  // A helper to get the current record's HLC to check LWW
  getRecordHlc(tableName: string, id: string): Promise<string | null>;
  saveRecordHlc(tableName: string, id: string, hlc: string): Promise<void>;
}

export class ServerSyncEngine {
  private adapter: DatabaseAdapter;
  private nodeId: string;
  private localHlc: HLC;

  constructor(adapter: DatabaseAdapter, nodeId: string = 'server') {
    this.adapter = adapter;
    this.nodeId = nodeId;
    this.localHlc = HLC.initial(nodeId);
  }

  async init() {
    const latest = await this.adapter.getLatestHlc();
    if (latest) {
      this.localHlc = HLC.parse(latest);
    }
  }

  private tickHlc() {
    this.localHlc = HLC.send(this.localHlc);
    return this.localHlc;
  }

  async handlePush(req: SyncPushRequest): Promise<void> {
    for (const op of req.operations) {
      const opHlc = HLC.parse(op.hlc);
      this.localHlc = HLC.recv(this.localHlc, opHlc);

      // Conflict resolution: Last Write Wins
      const currentHlcStr = await this.adapter.getRecordHlc(op.tableName, op.id);
      
      let shouldApply = true;
      if (currentHlcStr) {
        const currentHlc = HLC.parse(currentHlcStr);
        if (HLC.compare(currentHlc, opHlc) >= 0) {
          shouldApply = false; // Server has a newer or equal version
        }
      }

      if (shouldApply) {
        // Apply operation to server DB
        if (op.operation === 'DELETE') {
          await this.adapter.applyDelete(op.tableName, op.id);
        } else {
          await this.adapter.applyInsertOrUpdate(op.tableName, op.id, op.data);
        }
        await this.adapter.saveRecordHlc(op.tableName, op.id, op.hlc);
        
        // Save to operations log for other clients to pull
        await this.adapter.saveOperation(op);
      }
    }

    await this.adapter.saveLatestHlc(this.localHlc.toString());
  }

  async handlePull(clientId: string, lastHlc: string | null): Promise<SyncPullResponse> {
    const operations = await this.adapter.getOperationsSince(lastHlc);
    return {
      operations,
    };
  }
}
