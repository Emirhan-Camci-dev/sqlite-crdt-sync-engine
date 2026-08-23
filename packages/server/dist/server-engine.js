"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerSyncEngine = void 0;
const core_1 = require("@sync-engine/core");
class ServerSyncEngine {
    adapter;
    nodeId;
    localHlc;
    constructor(adapter, nodeId = 'server') {
        this.adapter = adapter;
        this.nodeId = nodeId;
        this.localHlc = core_1.HLC.initial(nodeId);
    }
    async init() {
        const latest = await this.adapter.getLatestHlc();
        if (latest) {
            this.localHlc = core_1.HLC.parse(latest);
        }
    }
    tickHlc() {
        this.localHlc = core_1.HLC.send(this.localHlc);
        return this.localHlc;
    }
    async handlePush(req) {
        for (const op of req.operations) {
            const opHlc = core_1.HLC.parse(op.hlc);
            this.localHlc = core_1.HLC.recv(this.localHlc, opHlc);
            // Conflict resolution: Last Write Wins
            const currentHlcStr = await this.adapter.getRecordHlc(op.tableName, op.id);
            let shouldApply = true;
            if (currentHlcStr) {
                const currentHlc = core_1.HLC.parse(currentHlcStr);
                if (core_1.HLC.compare(currentHlc, opHlc) >= 0) {
                    shouldApply = false; // Server has a newer or equal version
                }
            }
            if (shouldApply) {
                // Apply operation to server DB
                if (op.operation === 'DELETE') {
                    await this.adapter.applyDelete(op.tableName, op.id);
                }
                else {
                    await this.adapter.applyInsertOrUpdate(op.tableName, op.id, op.data);
                }
                await this.adapter.saveRecordHlc(op.tableName, op.id, op.hlc);
                // Save to operations log for other clients to pull
                await this.adapter.saveOperation(op);
            }
        }
        await this.adapter.saveLatestHlc(this.localHlc.toString());
    }
    async handlePull(clientId, lastHlc) {
        const operations = await this.adapter.getOperationsSince(lastHlc);
        return {
            operations,
        };
    }
}
exports.ServerSyncEngine = ServerSyncEngine;
