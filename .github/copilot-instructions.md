# PantherScope/AdvantageScope Codebase Guide

## Architecture Overview

PantherScope is an Electron-based robot telemetry application with a **multi-process architecture**:

- **Main process** ([src/main/electron/main.ts](../src/main/electron/main.ts)): Handles file I/O, window management, and native integrations
- **Hub renderer** ([src/hub/hub.ts](../src/hub/hub.ts)): Primary UI with timeline, tabs, sidebar, and data visualization
- **Satellite renderers** ([src/satellite.ts](../src/satellite.ts)): Detached windows for specific visualizations
- **Web Workers**: Heavy processing (log parsing, 3D model loading) via [WorkerManager](../src/hub/WorkerManager.ts)

Communication flows: **Main ←MessagePort→ Hub ←MessagePort→ Satellites**

## Key Concepts

### Data Sources: Historical vs Live

- **HistoricalDataSource** ([src/hub/dataSources/HistoricalDataSource.ts](../src/hub/dataSources/HistoricalDataSource.ts)): Parses log files (.wpilog, .rlog, .hoot, .dslog, .csv) using web workers, loads data progressively
- **LiveDataSource** ([src/hub/dataSources/LiveDataSource.ts](../src/hub/dataSources/LiveDataSource.ts)): Streams real-time data via NT4, Phoenix, RLOG, or FTC Dashboard. Abstract base with protocol-specific implementations

### Log System

- **Log** ([src/shared/log/Log.ts](../src/shared/log/Log.ts)): Central data store managing fields as time-series data
- **LogField**: Individual data series (numbers, booleans, strings, etc.)
- Supports struct/proto decoding for complex types (poses, trajectories)
- Fields organized hierarchically and prefixed when merging multiple sources

### Tab Architecture

- Each visualization type = **TabController** (hub-side logic) + **TabRenderer** (rendering/state)
- Controllers: [src/hub/controllers/](../src/hub/controllers/) - Handle user input, data processing, state updates
- Renderers: [src/shared/renderers/](../src/shared/renderers/) - Implement TabRenderer interface (render, saveState, restoreState, getAspectRatio)
- Examples: LineGraphController/Renderer, Field3dController/Renderer, VideoController/Renderer

### Preferences System

- Defined in [src/shared/Preferences.ts](../src/shared/Preferences.ts) with DEFAULT_PREFS
- `mergePreferences()` handles validation and migrations
- Persisted to disk by main process, loaded on startup
- Always validate new fields in `mergePreferences()` when adding preferences

## Development Workflows

### Building

```bash
npm install                    # Install dependencies + download Owlet/tesseract data
npm run build                  # Full production build (requires Emscripten 4.0.12)
npm run fast-build            # Skip packaging for faster iteration
npm run watch                  # Watch mode for TypeScript compilation
npm start                      # Run electron (run watch in parallel)
```

### Build System (Rollup)

[rollup.config.mjs](../rollup.config.mjs) creates bundles:

- **Main bundle**: Electron main process (CommonJS)
- **Renderer bundles**: Hub, satellite, workers (ESM)
- Supports distribution variants: Standard, WPILIB, Lite (set `ASCOPE_DISTRIBUTION` env var)
- License header auto-added, protobuf eval removed, version/date injected

### WASM Compilation

Run `npm run wasm:compile` (via [wasmCompile.mjs](../wasmCompile.mjs)) to compile C++ parsers for WPILOG/RLOG formats. Requires Emscripten.

## Project-Specific Conventions

### File Headers

**All** TypeScript files require BSD license header:

```typescript
// Copyright (c) 2021-2025 Littleton Robotics
// http://github.com/Mechanical-Advantage
//
// Use of this source code is governed by a BSD
// license that can be found in the LICENSE file
// at the root directory of this project.
```

Run `npm run format` to add headers automatically (uses license-check-and-add).

### Messaging Patterns

- **Main → Renderer**: `window.sendMainMessage(name, data)` in renderer, handled by `port.onmessage` in main
- **Renderer → Main**: `ipcRenderer.send()` patterns in preload, handled by `ipcMain.on()` in main
- Use [NamedMessage](../src/shared/NamedMessage.ts) interface for typed messages

### Adding a New Tab Type

1. Create controller in [src/hub/controllers/](../src/hub/controllers/) extending TabController
2. Create renderer in [src/shared/renderers/](../src/shared/renderers/) implementing TabRenderer
3. Add to TabType enum in [src/shared/TabType.ts](../src/shared/TabType.ts)
4. Wire up in [src/hub/Tabs.ts](../src/hub/Tabs.ts) constructor switch statements
5. Add icon/title mappings in TabType.ts

### Adding a Preference

1. Add field to `Preferences` interface in [src/shared/Preferences.ts](../src/shared/Preferences.ts)
2. Add to `DEFAULT_PREFS`
3. Implement validation in `mergePreferences()` - handle type checking and legacy migrations
4. Add UI control in [www/preferences.html](../www/preferences.html) and logic in [src/preferences.ts](../src/preferences.ts)

### Working with Workers

- Web workers for CPU-intensive tasks (log parsing, 3D loading)
- Use [WorkerManager.request()](../src/hub/WorkerManager.ts) for promise-based worker calls
- Worker scripts in [src/hub/](../src/hub/) with `Worker` suffix, bundled separately
- Return `{ id, payload }` from worker, or `{ id, progress }` for progress updates

## Critical Files

- [src/hub/hub.ts](../src/hub/hub.ts): Hub initialization, data source orchestration, state persistence
- [src/main/electron/main.ts](../src/main/electron/main.ts): Electron app lifecycle, menu setup, window management, native APIs
- [src/shared/Preferences.ts](../src/shared/Preferences.ts): Application preferences schema and validation
- [rollup.config.mjs](../rollup.config.mjs): Build configuration and bundling
- [package.json](../package.json): Dependencies, scripts, electron-builder config

## Testing & Quality

- Run `npm run check-format` before committing (prettier + license check)
- Run `npm run format` to auto-fix formatting issues
- No automated test suite currently - manual testing required
- Test multi-platform builds: `npm run build -- --win --x64` (or --mac/--linux)

## External Dependencies

- **electron**: Desktop framework
- **three.js**: 3D field visualization
- **chart.js**: 2D graphs and charts
- **protobufjs/msgpack**: Data serialization
- **tesseract.js**: OCR for video timestamp extraction
- **@mcap/core**: MCAP log format support (FTC Dashboard)
- **ws**: WebSocket for NT4/Phoenix/RLOG streaming

## Common Pitfalls

- **Worker bundling**: Workers are bundled separately. Don't import hub-specific code directly
- **Preferences validation**: Always validate in `mergePreferences()`, not just UI - users can hand-edit JSON
- **Message passing**: Window messages are async. Don't assume immediate state updates
- **Log field keys**: Use `applyKeyPrefix()` when merging logs to avoid key collisions
- **Asset loading**: Large assets (3D models, fields) downloaded from AdvantageScopeAssets repo, not bundled
- **Distribution variants**: Check `DISTRIBUTION` constant for conditional features (Lite/WPILib)
