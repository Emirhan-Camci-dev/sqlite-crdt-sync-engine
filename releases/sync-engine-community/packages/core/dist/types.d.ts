export type OperationType = 'INSERT' | 'UPDATE' | 'DELETE';
export interface SyncOperation {
    id: string;
    tableName: string;
    operation: OperationType;
    hlc: string;
    data?: any;
}
export interface SyncPushRequest {
    clientId: string;
    operations: SyncOperation[];
}
export interface SyncPullRequest {
    clientId: string;
    lastHlc: string | null;
}
export interface SyncPullResponse {
    operations: SyncOperation[];
}
