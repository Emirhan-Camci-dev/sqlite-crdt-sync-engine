"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryAdapter = void 0;
class MemoryAdapter {
    latestHlc = null;
    operations = [];
    // tableName -> recordId -> data (JSON)
    tables = {};
    // tableName -> recordId -> hlc string
    recordHlcs = {};
    async getLatestHlc() {
        return this.latestHlc;
    }
    async saveLatestHlc(hlc) {
        this.latestHlc = hlc;
    }
    async getOperationsSince(hlc) {
        if (!hlc)
            return this.operations;
        // Basic string comparison works for HLCs
        return this.operations.filter(op => op.hlc > hlc);
    }
    async saveOperation(op) {
        this.operations.push(op);
        this.operations.sort((a, b) => a.hlc > b.hlc ? 1 : -1);
    }
    async applyInsertOrUpdate(tableName, id, data) {
        if (!this.tables[tableName]) {
            this.tables[tableName] = {};
        }
        // UPSERT
        this.tables[tableName][id] = { ...(this.tables[tableName][id] || {}), ...data };
    }
    async applyDelete(tableName, id) {
        if (this.tables[tableName]) {
            delete this.tables[tableName][id];
        }
    }
    async getRecordHlc(tableName, id) {
        if (this.recordHlcs[tableName] && this.recordHlcs[tableName][id]) {
            return this.recordHlcs[tableName][id];
        }
        return null;
    }
    async saveRecordHlc(tableName, id, hlc) {
        if (!this.recordHlcs[tableName]) {
            this.recordHlcs[tableName] = {};
        }
        this.recordHlcs[tableName][id] = hlc;
    }
}
exports.MemoryAdapter = MemoryAdapter;
