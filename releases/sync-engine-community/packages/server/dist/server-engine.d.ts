import { SyncOperation, SyncPushRequest, SyncPullResponse } from '@sync-engine/core';
export interface DatabaseAdapter {
    getLatestHlc(): Promise<string | null>;
    saveLatestHlc(hlc: string): Promise<void>;
    getOperationsSince(hlc: string | null): Promise<SyncOperation[]>;
    saveOperation(op: SyncOperation): Promise<void>;
    applyInsertOrUpdate(tableName: string, id: string, data: any): Promise<void>;
    applyDelete(tableName: string, id: string): Promise<void>;
    getRecordHlc(tableName: string, id: string): Promise<string | null>;
    saveRecordHlc(tableName: string, id: string, hlc: string): Promise<void>;
}
export declare class ServerSyncEngine {
    private adapter;
    private nodeId;
    private localHlc;
    constructor(adapter: DatabaseAdapter, nodeId?: string);
    init(): Promise<void>;
    private tickHlc;
    handlePush(req: SyncPushRequest): Promise<void>;
    handlePull(clientId: string, lastHlc: string | null): Promise<SyncPullResponse>;
}
