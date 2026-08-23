# SyncEngine 🚀

The ultimate Offline-First Sync Engine for SQLite. SyncEngine brings seamless, backend-agnostic CRDT (Conflict-free Replicated Data Type) synchronization to your mobile and web applications. Build robust offline experiences without vendor lock-in.

## Installation

```bash
npm install @sync-engine/core @sync-engine/client
```

## Quick Start (Sub-5ms Performance)

Just wrap your SQLite connection, and let SyncEngine handle the rest with sub-5ms sync times:

```typescript
import { SyncEngine } from '@sync-engine/client';
const db = await SQLite.openDatabaseAsync('my_app.db');
// ⚡ Sync in < 5ms!
await SyncEngine.attach(db, 'https://api.mybackend.com/sync').then(engine => engine.sync());
```

## 💎 Community vs. Enterprise

SyncEngine is built with an Open-Core model. The Core is fully open-source (AGPLv3), while SyncEngine Pro offers mission-critical features for enterprise teams.

| Feature | Community (Free) | Enterprise (Pro) |
| :--- | :---: | :---: |
| **Backend-Agnostic REST Sync** | ✅ | ✅ |
| **LWW Conflict Resolution (HLC)** | ✅ | ✅ |
| **Plug-and-Play SQLite Triggers** | ✅ | ✅ |
| **Real-time WebSocket Sync** | ❌ | ✅ |
| **End-to-End Encryption (E2EE)** | ❌ | ✅ |
| **Advanced CRDTs (Text-Diff, Yjs)** | ❌ | ✅ |
| **Background Sync (iOS/Android)** | ❌ | ✅ |
| **Air-gapped Offline License Key** | ❌ | ✅ |

[👉 **Get SyncEngine Pro on Polar.sh**](https://polar.sh/syncengine)

*SyncEngine Pro seamlessly hooks into the Core engine via our Plugin Architecture—no code forks, no messy `if (isPro)` checks.*

## License & Copyright

- **SyncEngine Core** is licensed under the [GNU Affero General Public License (AGPLv3)](LICENSE).
- **SyncEngine Pro** requires a Commercial/Proprietary License (Seat-based Subscription).

Copyright (c) 2026 Emirhan CAMCI <byemir@live.com>. All rights reserved.
