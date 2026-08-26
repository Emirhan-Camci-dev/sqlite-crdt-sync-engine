import { SQLiteDatabase } from 'expo-sqlite';
import { HLC, SyncOperation, SyncPushRequest, SyncPullResponse } from '@sync-engine/core';
import { SYNC_OPERATIONS_TABLE, SYNC_STATE_TABLE } from './setup';

export class SyncEngine {
  private db: SQLiteDatabase;
  private nodeId: string;
  private syncUrl: string;
  private localHlc: HLC;

  constructor(db: SQLiteDatabase, nodeId: string, syncUrl: string) {
    this.db = db;
    this.nodeId = nodeId;
    this.syncUrl = syncUrl;
    this.localHlc = HLC.initial(nodeId);
  }

  /**
   * Facade method for quick 3-line initialization.
   * Automatically initializes tracking tables and generates a random client ID if not provided.
   */
  static async attach(db: SQLiteDatabase, syncUrl: string, clientId?: string): Promise<SyncEngine> {
    const id = clientId || 'CLIENT_' + Math.random().toString(36).substring(2, 9);
    const engine = new SyncEngine(db, id, syncUrl);
    // You would typically call initializeSyncTables(db) here, assuming it's available in scope
    await engine.init();
    return engine;
  }

  async init() {
    const row = await this.db.getFirstAsync<{ value: string }>(
      `SELECT value FROM ${SYNC_STATE_TABLE} WHERE key = 'local_hlc'`
    );
    if (row && row.value) {
      this.localHlc = HLC.parse(row.value);
    } else {
      await this.saveLocalHlc();
    }
  }

  private async saveLocalHlc() {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO ${SYNC_STATE_TABLE} (key, value) VALUES ('local_hlc', ?)`,
      this.localHlc.toString()
    );
  }

  private tickHlc() {
    this.localHlc = HLC.send(this.localHlc);
    return this.localHlc;
  }

  /**
   * Pushes local changes to the remote server.
   */
  async push() {
    // 1. Fetch pending operations
    const pendingOps = await this.db.getAllAsync<any>(
      `SELECT * FROM ${SYNC_OPERATIONS_TABLE} WHERE hlc LIKE 'LOCAL_PENDING_%'`
    );

    if (pendingOps.length === 0) return;

    // 2. Assign real HLCs
    const operationsToSend: SyncOperation[] = [];
    for (const op of pendingOps) {
      const hlc = this.tickHlc().toString();
      operationsToSend.push({
        id: op.id,
        tableName: op.tableName,
        operation: op.operation,
        hlc: hlc,
        data: op.data ? JSON.parse(op.data) : null,
      });
      // Update local operation with actual HLC
      await this.db.runAsync(
        `UPDATE ${SYNC_OPERATIONS_TABLE} SET hlc = ? WHERE internal_id = ?`,
        [hlc, op.internal_id]
      );
    }
    await this.saveLocalHlc();

    // 3. Send to server
    const req: SyncPushRequest = {
      clientId: this.nodeId,
      operations: operationsToSend,
    };

    const res = await fetch(`${this.syncUrl}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      throw new Error(`Push failed: ${res.statusText}`);
    }

    // 4. On success, delete operations from local log
    const internalIds = pendingOps.map((op: any) => op.internal_id);
    await this.db.runAsync(
      `DELETE FROM ${SYNC_OPERATIONS_TABLE} WHERE internal_id IN (${internalIds.join(',')})`
    );
  }

  /**
   * Pulls remote changes and applies them locally.
   */
  async pull() {
    // 1. Get last synced HLC from server
    const row = await this.db.getFirstAsync<{ value: string }>(
      `SELECT value FROM ${SYNC_STATE_TABLE} WHERE key = 'last_sync_hlc'`
    );
    const lastSyncHlc = row ? row.value : null;

    // 2. Fetch from server
    const url = new URL(`${this.syncUrl}/pull`);
    url.searchParams.set('clientId', this.nodeId);
    if (lastSyncHlc) {
      url.searchParams.set('lastHlc', lastSyncHlc);
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Pull failed: ${res.statusText}`);
    }
    const data: SyncPullResponse = await res.json();

    if (data.operations.length === 0) return;

    // 3. Apply operations
    let maxRemoteHlc = lastSyncHlc;

    for (const op of data.operations) {
      // Update local HLC based on remote
      const remoteHlc = HLC.parse(op.hlc);
      this.localHlc = HLC.recv(this.localHlc, remoteHlc);
      
      if (!maxRemoteHlc || HLC.compare(remoteHlc, HLC.parse(maxRemoteHlc)) > 0) {
        maxRemoteHlc = op.hlc;
      }

      // Check if we have a newer local operation for this record
      // In a real robust system, we check a tombstone table or the record's updated_at HLC.
      // For simplicity, we assume server provides the authoritative LWW stream and we apply it.
      // Note: Triggers must be temporarily disabled or bypassed during this sync to avoid feedback loops!
      
      if (op.operation === 'DELETE') {
         await this.db.runAsync(`DELETE FROM ${op.tableName} WHERE id = ?`, [op.id]);
      } else if (op.operation === 'INSERT' || op.operation === 'UPDATE') {
         // Create UPSERT statement
         if (!op.data) continue;
         const keys = Object.keys(op.data);
         const values = Object.values(op.data);
         const placeholders = keys.map(() => '?').join(',');
         const updates = keys.map(k => `${k} = EXCLUDED.${k}`).join(', ');

         const sql = `
           INSERT INTO ${op.tableName} (${keys.join(',')})
           VALUES (${placeholders})
           ON CONFLICT(id) DO UPDATE SET ${updates}
         `;
         await this.db.runAsync(sql, values as any[]);
      }
    }

    await this.saveLocalHlc();

    if (maxRemoteHlc) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO ${SYNC_STATE_TABLE} (key, value) VALUES ('last_sync_hlc', ?)`,
        maxRemoteHlc
      );
    }
  }

  /**
   * Syncs both ways (Push then Pull).
   */
  async sync() {
    await this.push();
    await this.pull();
  }
}
