# SyncEngine Pro - Enterprise Setup Guide

Welcome to **SyncEngine Pro**! This guide will walk you through setting up your commercially licensed offline-first sync engine.

SyncEngine Pro extends the open-source `@sync-engine/core` via a strictly decoupled Plugin/Adapter architecture. 

## 1. Installation

SyncEngine Pro is distributed via our private registry. You must authenticate using the access token provided in your purchase email.

```bash
# Authenticate with the private registry
npm config set @sync-engine:registry https://registry.syncengine.dev/
npm config set //registry.syncengine.dev/:_authToken YOUR_ACCESS_TOKEN

# Install Pro packages alongside Core
npm install @sync-engine/core @sync-engine/pro
```

## 2. License Key Verification (Air-Gapped Ready)

SyncEngine Pro relies on a cryptographically secure, offline-first license verification mechanism using **Ed25519** asymmetric signatures. 
- You do **not** need an active internet connection for the engine to validate your license.
- Your application only needs the signed JWT-like license string.

### Applying your License

Store your `SYNC_ENGINE_PRO_LICENSE_KEY` securely (e.g., in `.env` for backend, or securely injected during mobile builds).

```typescript
import { SyncEngine } from '@sync-engine/core';
import { SyncEnginePro, WebSocketTransport, ColumnLevelResolver } from '@sync-engine/pro';

// 1. Validate License (Offline, CPU-bound Ed25519 signature check)
const proFeatures = SyncEnginePro.verifyLicense(process.env.SYNC_ENGINE_PRO_LICENSE_KEY);

if (!proFeatures.isValid) {
  throw new Error(`License Verification Failed: ${proFeatures.error}`);
}

// 2. Initialize Core Database
const db = getDatabaseConnection();

// 3. Inject Pro Features via Dependency Injection (No forks, No messy if-statements)
const engine = new SyncEngine(db, {
  // Overriding standard HTTP transport with Pro WebSocket Transport
  transport: new WebSocketTransport('wss://api.mybackend.com/sync'),
  
  // Overriding Row-level LWW with Pro Column-level CRDT Resolver
  conflictResolver: new ColumnLevelResolver(),
  
  // Enable E2E Encryption adapter
  encryption: proFeatures.hasE2EE ? new AesGcmEncryption('USER_SECRET') : undefined,
});

await engine.init();
```

## 3. Architecture & Decoupling

The Pro module is designed around the **Adapter Pattern**. The `@sync-engine/core` package exposes interfaces like `ITransport`, `IConflictResolver`, and `IEncryption`. 

The `@sync-engine/pro` module simply provides robust implementations of these interfaces. This ensures:
- Zero `if (isPro)` logic in the open-source core.
- The Core remains 100% independent and compliant with Open Source licenses.
- Maximum security and performance for Pro users.

If you encounter any issues, please contact our enterprise support: enterprise@syncengine.dev.
