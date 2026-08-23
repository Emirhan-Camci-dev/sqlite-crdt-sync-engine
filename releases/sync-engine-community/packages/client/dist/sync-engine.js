"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncEngine = void 0;
const core_1 = require("@sync-engine/core");
const setup_1 = require("./setup");
class SyncEngine {
    db;
    nodeId;
    syncUrl;
    localHlc;
    constructor(db, nodeId, syncUrl) {
        this.db = db;
        this.nodeId = nodeId;
        this.syncUrl = syncUrl;
        this.localHlc = core_1.HLC.initial(nodeId);
    }
    async init() {
        const row = await this.db.getFirstAsync(`SELECT value FROM ${setup_1.SYNC_STATE_TABLE} WHERE key = 'local_hlc'`);
        if (row && row.value) {
            this.localHlc = core_1.HLC.parse(row.value);
        }
        else {
            await this.saveLocalHlc();
        }
    }
    async saveLocalHlc() {
        await this.db.runAsync(`INSERT OR REPLACE INTO ${setup_1.SYNC_STATE_TABLE} (key, value) VALUES ('local_hlc', ?)`, this.localHlc.toString());
    }
    tickHlc() {
        this.localHlc = core_1.HLC.send(this.localHlc);
        return this.localHlc;
    }
    /**
     * Pushes local changes to the remote server.
     */
    async push() {
        // 1. Fetch pending operations
        const pendingOps = await this.db.getAllAsync(`SELECT * FROM ${setup_1.SYNC_OPERATIONS_TABLE} WHERE hlc LIKE 'LOCAL_PENDING_%'`);
        if (pendingOps.length === 0)
            return;
        // 2. Assign real HLCs
        const operationsToSend = [];
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
            await this.db.runAsync(`UPDATE ${setup_1.SYNC_OPERATIONS_TABLE} SET hlc = ? WHERE internal_id = ?`, [hlc, op.internal_id]);
        }
        await this.saveLocalHlc();
        // 3. Send to server
        const req = {
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
        const internalIds = pendingOps.map((op) => op.internal_id);
        await this.db.runAsync(`DELETE FROM ${setup_1.SYNC_OPERATIONS_TABLE} WHERE internal_id IN (${internalIds.join(',')})`);
    }
    /**
     * Pulls remote changes and applies them locally.
     */
    async pull() {
        // 1. Get last synced HLC from server
        const row = await this.db.getFirstAsync(`SELECT value FROM ${setup_1.SYNC_STATE_TABLE} WHERE key = 'last_sync_hlc'`);
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
        const data = await res.json();
        if (data.operations.length === 0)
            return;
        // 3. Apply operations
        let maxRemoteHlc = lastSyncHlc;
        for (const op of data.operations) {
            // Update local HLC based on remote
            const remoteHlc = core_1.HLC.parse(op.hlc);
            this.localHlc = core_1.HLC.recv(this.localHlc, remoteHlc);
            if (!maxRemoteHlc || core_1.HLC.compare(remoteHlc, core_1.HLC.parse(maxRemoteHlc)) > 0) {
                maxRemoteHlc = op.hlc;
            }
            // Check if we have a newer local operation for this record
            // In a real robust system, we check a tombstone table or the record's updated_at HLC.
            // For simplicity, we assume server provides the authoritative LWW stream and we apply it.
            // Note: Triggers must be temporarily disabled or bypassed during this sync to avoid feedback loops!
            if (op.operation === 'DELETE') {
                await this.db.runAsync(`DELETE FROM ${op.tableName} WHERE id = ?`, [op.id]);
            }
            else if (op.operation === 'INSERT' || op.operation === 'UPDATE') {
                // Create UPSERT statement
                if (!op.data)
                    continue;
                const keys = Object.keys(op.data);
                const values = Object.values(op.data);
                const placeholders = keys.map(() => '?').join(',');
                const updates = keys.map(k => `${k} = EXCLUDED.${k}`).join(', ');
                const sql = `
           INSERT INTO ${op.tableName} (${keys.join(',')})
           VALUES (${placeholders})
           ON CONFLICT(id) DO UPDATE SET ${updates}
         `;
                await this.db.runAsync(sql, values);
            }
        }
        await this.saveLocalHlc();
        if (maxRemoteHlc) {
            await this.db.runAsync(`INSERT OR REPLACE INTO ${setup_1.SYNC_STATE_TABLE} (key, value) VALUES ('last_sync_hlc', ?)`, maxRemoteHlc);
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
exports.SyncEngine = SyncEngine;
