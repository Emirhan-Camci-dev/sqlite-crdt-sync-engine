// Copyright (c) 2026 Emirhan CAMCI. All rights reserved.
export type OperationType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface SyncOperation {
  id: string;              // Primary key of the row being mutated
  tableName: string;       // The table being mutated
  operation: OperationType;
  hlc: string;             // The stringified HLC of this operation
  data?: any;              // JSON payload of the row data (null/undefined if DELETE)
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
