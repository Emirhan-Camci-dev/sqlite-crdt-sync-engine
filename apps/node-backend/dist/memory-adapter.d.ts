import { DatabaseAdapter } from '@sync-engine/server';
import { SyncOperation } from '@sync-engine/core';
export declare class MemoryAdapter implements DatabaseAdapter {
    private latestHlc;
    private operations;
    private tables;
    private recordHlcs;
    getLatestHlc(): Promise<string | null>;
    saveLatestHlc(hlc: string): Promise<void>;
    getOperationsSince(hlc: string | null): Promise<SyncOperation[]>;
    saveOperation(op: SyncOperation): Promise<void>;
    applyInsertOrUpdate(tableName: string, id: string, data: any): Promise<void>;
    applyDelete(tableName: string, id: string): Promise<void>;
    getRecordHlc(tableName: string, id: string): Promise<string | null>;
    saveRecordHlc(tableName: string, id: string, hlc: string): Promise<void>;
}
