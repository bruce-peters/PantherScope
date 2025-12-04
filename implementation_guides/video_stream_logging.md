# Video Stream Logging Implementation Guide

## Overview

This guide outlines the implementation of MJPEG video stream logging functionality for the PantherScope Video tab. Users will be able to capture live video streams from FRC cameras (like Limelight or PhotonVision) during a match, with frames synchronized to log timestamps for later playback analysis.

### Key Features

- MJPEG stream capture from HTTP URLs
- Frame capture synchronized with log timestamps
- In-memory frame storage (live connection only)
- Drag-and-drop URL field from sidebar OR manual URL entry
- Playback synchronized with global app timeline
- One stream per Video tab (multiple tabs for multiple streams)

---

## Phase 1: Core Data Structures and Types ✅ COMPLETED

### Description

Set up the foundational types and interfaces needed for stream capture functionality.

### Tasks

- [x] **1.1** Create new file `src/shared/StreamFrame.ts` with frame data structure:

  ```typescript
  export interface StreamFrame {
    timestamp: number; // Log timestamp when frame was captured
    imageData: Blob; // JPEG image data
    imageUrl: string; // Object URL for rendering (created from Blob)
  }
  ```

- [x] **1.2** Add `Stream` option to `src/shared/VideoSource.ts` enum:

  ```typescript
  enum VideoSource {
    Local,
    YouTube,
    TheBlueAlliance,
    Stream // New option
  }
  ```

- [x] **1.3** Create new file `src/shared/StreamConfig.ts` for stream-related configuration:

  ```typescript
  export type StreamCaptureStateType = "idle" | "connecting" | "capturing" | "error";

  export interface StreamCaptureState {
    status: StreamCaptureStateType;
    url: string | null;
    fieldKey: string | null;
    frameCount: number;
    errorMessage: string | null;
  }

  export interface StreamConfig {
    url: string;
    logField?: string;
    maxFrames?: number;
  }
  ```

### Quality Assurance Checks

- [x] TypeScript compiles without errors
- [x] All new types are properly exported
- [x] No circular dependencies introduced

---

## Phase 2: MJPEG Stream Capture Service ✅ COMPLETED

### Description

Create a service class to handle MJPEG stream connection, frame extraction, and storage.

### Tasks

- [x] **2.1** Create new file `src/hub/services/MJPEGStreamCapture.ts`:

  Implemented core class that handles:

  - Connecting to MJPEG stream via fetch/ReadableStream
  - Parsing multipart MJPEG boundaries
  - Extracting individual JPEG frames
  - Storing frames with timestamps
  - Cleanup of object URLs on dispose

- [x] **2.2** Implement MJPEG boundary parsing:

  - Parse `Content-Type: multipart/x-mixed-replace; boundary=...` header
  - Split stream on boundary markers
  - Extract JPEG data between boundaries
  - Handle common boundary formats (`--boundary`, `--myboundary`, etc.)

- [x] **2.3** Implement frame capture with timestamp synchronization:

  - Get current log timestamp via timestamp callback function
  - Only capture frames when connected
  - Store frame with associated timestamp
  - Implement maximum frame buffer size (configurable, default 1000 frames)
  - Remove oldest frames when buffer is full (with URL cleanup)

- [x] **2.4** Implement frame retrieval by timestamp:

  ```typescript
  getFrameAtTime(timestamp: number): StreamFrame | null
  // Returns frame with closest timestamp <= requested timestamp
  // Uses binary search for efficient lookup
  ```

- [x] **2.5** Implement cleanup and resource management:
  - Revoke object URLs when frames are removed
  - Stop capture gracefully on disconnect via AbortController
  - Clear all frames and URLs on cleanup()

### Quality Assurance Checks

- [x] TypeScript compiles without errors
- [x] Frame lookup uses binary search for efficiency
- [x] Memory management implemented (object URL revocation)
- [ ] Stream connects successfully to test MJPEG source (needs testing)
- [ ] No memory leaks after extended capture sessions (needs testing)

---

## Phase 3: Video Controller Updates ✅ COMPLETED

### Description

Modify `VideoController.ts` to support stream source selection and capture management.

### Tasks

- [x] **3.1** Add new UI button for Stream source in `www/hub.html`:

  - Added fourth button after TBA button in `.video-source` div
  - Uses custom wifi.svg icon at `www/symbols/wifi.svg`
  - Added SVG path element for loading animation

- [x] **3.2** Add Stream button reference and event handler in `VideoController.ts`:

  ```typescript
  private STREAM_SOURCE: HTMLButtonElement;
  // In constructor - sets up click handler to prompt for URL
  ```

- [x] **3.3** Add drag-and-drop support for String fields containing URLs:

  - Listens for `drag-update` events on VIDEO_CONTAINER
  - Checks if dropped field is a String type via `getLogFieldDisplay()`
  - Validates string value looks like HTTP URL via `isValidStreamUrl()`
  - Starts stream capture with the URL and stores field key

- [x] **3.4** Add stream capture instance management:

  ```typescript
  private streamCapture: MJPEGStreamCapture | null = null;
  private streamFieldKey: string | null = null;
  private streamUrl: string | null = null;
  private isStreamMode: boolean = false;
  ```

- [x] **3.5** Implement stream state tracking methods:

  - `startStreamFromUrl(url: string)` - manual URL connection
  - `startStreamFromField(fieldKey: string)` - field-based connection
  - `stopStream()` - cleanup and reset
  - State callback updates UI button animations

- [x] **3.6** Modify `getCommand()` to return stream frame when in stream mode:

  ```typescript
  if (this.isStreamMode && this.streamCapture) {
    const renderTime = window.selection.getRenderTime();
    const frame = this.streamCapture.getFrameAtTime(renderTime ?? 0);
    if (frame) {
      return [[], frame.imageUrl];
    }
  }
  ```

- [x] **3.7** Add stream-specific button behaviors:
  - Click shows URL input prompt (via main process)
  - Button animates while connecting/capturing
  - Selected state indicates stream mode active

### Quality Assurance Checks

- [x] Stream button appears in UI
- [x] TypeScript compiles without errors
- [x] Drag-and-drop handler implemented for String fields
- [x] URL validation implemented
- [x] Stream capture integrates with MJPEGStreamCapture service
- [ ] Full integration testing (needs testing with live stream)

---

## Phase 4: Video Renderer Updates ✅ COMPLETED

### Description

Update `VideoRenderer.ts` to handle both file paths and blob URLs.

### Tasks

- [x] **4.1** Modify `render()` method to handle object URLs:

  - Added `load` event listener for proper aspect ratio detection with blob URLs
  - Added `lastSrc` tracking to avoid redundant image reloads
  - Extracted `updateAspectRatio()` helper method
  - Object URLs (blob:...) now work the same as file paths

- [x] **4.2** Optimize image loading:
  - Only update `src` when URL changes (prevents flickering)
  - Aspect ratio updates both immediately and on load event
  - Works for both cached local images and async blob URLs

### Quality Assurance Checks

- [x] TypeScript compiles without errors
- [x] Aspect ratio detection works for blob URLs
- [x] No unnecessary image reloads
- [ ] Stream frames render correctly (needs testing)
- [ ] No flickering during playback (needs testing)

---

## Phase 5: Main Process Integration ✅ COMPLETED

### Description

Add necessary IPC handlers in main process for stream-related operations.

### Tasks

- [x] **5.1** Add stream URL input dialog in `src/main/electron/VideoProcessor.ts`:

  - Added `VideoSource.Stream` case in `prepare()` method
  - Implemented `getStreamUrl()` to check clipboard first
  - Shows confirmation dialog if valid URL found in clipboard
  - Falls back to info dialog explaining drag-and-drop
  - Implemented `isValidStreamUrl()` for URL validation
  - Returns stream URL via callback to renderer process

- [x] **5.2** Stream URL handling:
  - Validates URLs have http:// or https:// protocol
  - Shows helpful information about common FRC camera URLs
  - Clipboard integration for quick URL entry
  - Suggests drag-and-drop as alternative method

### Quality Assurance Checks

- [x] TypeScript compiles without errors
- [x] URL validation implemented
- [x] Clipboard URL detection works
- [ ] Full dialog flow testing (needs testing)

---

## Phase 6: Field Integration and Auto-Detection ⏳ PARTIALLY COMPLETE

### Description

Enable automatic stream URL detection from NetworkTables fields.

### Tasks

- [x] **6.1** Add field monitoring in `VideoController.ts`:

  - When a String field is dropped, store the field key
  - Check field value in `refresh()` method
  - Automatically reconnect if URL changes

- [x] **6.2** URL validation helper in `StreamConfig.ts`:

  ```typescript
  function isValidStreamUrl(value: string): boolean {
    // Check for http:// or https:// prefix
    // Check for common stream paths (/mjpg/video.mjpg, /stream, etc.)
    // Return true if looks like valid stream URL
  }
  ```

- [x] **6.3** Add visual indicator when connected to a field:
  - Show field key in UI (displays "Field: fieldKey" format)
  - Different styling for field-connected vs manual URL (tooltip shows actual URL)

### Quality Assurance Checks

- [x] Field value changes are detected
- [x] Stream reconnects when URL changes
- [x] UI clearly indicates field connection status

---

## Phase 7: State Management and Persistence ✅ COMPLETED

### Description

Handle tab state saving/restoration and cleanup.

### Tasks

- [x] **7.1** Implement `saveState()` to preserve stream configuration:

  ```typescript
  saveState(): unknown {
    return {
      sourceType: 'stream',
      streamConfig: {
        type: this.streamFieldKey ? 'field' : 'manual',
        url: this.streamUrl,
        fieldKey: this.streamFieldKey
      }
    };
  }
  ```

- [x] **7.2** Implement `restoreState()` to restore stream configuration:

  - Restore URL and field key
  - Do NOT restore captured frames (memory only)
  - Re-establish field monitoring if applicable

- [x] **7.3** Implement cleanup on tab close:

  - Stop stream capture via `controller.close()` in `Tabs.ts`
  - Clear all frames and object URLs via `exitStreamMode()` -> `dispose()`
  - Remove field monitoring via `exitStreamMode()`
  - Added optional `close()` method to `TabController` interface

- [x] **7.4** Handle live connection state changes:
  - Timestamp supplier falls back gracefully when not live
  - Stream capture is independent of NetworkTables connection
  - Frames preserved across connection state changes

### Quality Assurance Checks

- [x] State saves and restores correctly
- [x] Frames are cleared on tab close (no memory leak)
- [x] Field monitoring is properly cleaned up
- [x] Capture starts/stops appropriately with live connection

---

## Phase 8: UI Polish and User Experience ✅ COMPLETED

### Description

Final UI improvements and user experience enhancements.

### Tasks

- [x] **8.1** Add CSS styles in `www/hub.css` for stream-specific UI:

  - Stream URL display styling (ellipsis overflow, tooltip)
  - Connection status indicator colors (green=capturing, red=error, gray=idle)
  - Frame counter styling
  - Drop target styling with hover effects
  - Clear button styling with hover opacity
  - Updated video-source button layout to accommodate 4 buttons (was 3)
  - Green color theme for stream button (#32a852)

- [x] **8.2** Add helpful tooltips and labels:

  - Status indicator has tooltip (Capturing/Error message/Idle)
  - URL display has tooltip with full URL
  - Drop target has descriptive text

- [ ] **8.3** Add keyboard shortcuts:

  - Quick clear frames (optional, can be added later)
  - Toggle capture (not applicable - capture is automatic)

- [ ] **8.4** Update source list help dialog (`sourceListHelp`) if applicable:
  - Document stream URL field type (optional, can be added later)
  - Explain how to publish camera URLs from robot code (optional)

### Quality Assurance Checks

- [x] UI is intuitive and consistent with existing design
- [x] All interactive elements have appropriate feedback
- [ ] Help text is clear and accurate (optional enhancement)

---

## Phase 9: Testing and Edge Cases 📝 TESTING GUIDELINES

### Description

Comprehensive testing of all functionality. These are manual testing guidelines.

### Tasks

- [ ] **9.1** Test with common FRC camera streams:

  - Limelight MJPEG stream: `http://10.TE.AM.11:5800/stream.mjpg`
  - PhotonVision MJPEG stream: `http://10.TE.AM.11:1182/stream.mjpg`
  - USB camera via CameraServer: `http://10.TE.AM.2:1181/stream.mjpg`

- [ ] **9.2** Test error conditions:

  - Invalid URL format (should show error state)
  - Unreachable host (should show error after timeout)
  - Stream disconnection mid-capture (should handle gracefully)
  - CORS blocked requests (common issue - may need robot-side CORS headers)

- [ ] **9.3** Test memory management:

  - Extended capture session (10+ minutes)
  - Verify frame buffer limits work (default 1000 frames)
  - Check for memory leaks with DevTools (Application > Memory)
  - Verify blob URLs are revoked when frames cleared

- [ ] **9.4** Test playback synchronization:

  - Frames align correctly with log timestamps
  - Scrubbing timeline shows correct frames
  - Playback at various speeds

- [ ] **9.5** Test multi-tab scenarios:
  - Multiple stream tabs simultaneously
  - Different streams in each tab
  - Switching between tabs
  - Closing tabs cleans up resources

### Quality Assurance Checks

- [ ] All common FRC cameras work correctly
- [ ] Error handling is graceful and informative
- [ ] No memory leaks after extended use
- [ ] Playback is smooth and synchronized
- [ ] Multiple tabs work independently

---

## Implementation Notes

### MJPEG Parsing Reference

MJPEG streams use multipart HTTP responses:

```
--boundary
Content-Type: image/jpeg
Content-Length: 12345

<JPEG binary data>
--boundary
Content-Type: image/jpeg
...
```

### Common FRC Camera URLs

- Limelight: `http://10.TE.AM.11:5800/stream.mjpg`
- PhotonVision: `http://10.TE.AM.11:1182/stream.mjpg`
- CameraServer: `http://10.TE.AM.2:1181/stream.mjpg`

### Memory Considerations

- Each JPEG frame is roughly 50-200KB depending on resolution
- 1000 frames ≈ 50-200MB memory usage
- Object URLs must be revoked to free memory
- Consider configurable buffer size in preferences

### Browser Limitations

- CORS may block streams from different origins
- Electron's webSecurity can be configured if needed
- Consider using main process as proxy if CORS is an issue

---

## File Changes Summary

### New Files (Created)

- `src/shared/StreamFrame.ts` ✅
- `src/shared/StreamConfig.ts` ✅
- `src/hub/services/MJPEGStreamCapture.ts` ✅
- `www/symbols/wifi.svg` ✅

### Modified Files (Updated)

- `src/shared/VideoSource.ts` - Added Stream enum value ✅
- `src/hub/controllers/VideoController.ts` - Major changes for stream support ✅
- `www/hub.html` - Added stream button ✅
- `src/shared/renderers/VideoRenderer.ts` - Added blob URL support, load event handling ✅
- `src/main/electron/VideoProcessor.ts` - Added Stream source handling and URL input ✅

### Files Still Needing Changes

- `www/hub.css` - Add stream UI styles (Phase 8)

---

## Estimated Effort

| Phase                       | Estimated Time  | Status      |
| --------------------------- | --------------- | ----------- |
| Phase 1: Core Types         | 1-2 hours       | ✅ Complete |
| Phase 2: MJPEG Service      | 4-6 hours       | ✅ Complete |
| Phase 3: Controller Updates | 4-6 hours       | ✅ Complete |
| Phase 4: Renderer Updates   | 1-2 hours       | ✅ Complete |
| Phase 5: Main Process       | 2-3 hours       | ✅ Complete |
| Phase 6: Field Integration  | 2-3 hours       | ⏳ Partial  |
| Phase 7: State Management   | 2-3 hours       | ⏳ Partial  |
| Phase 8: UI Polish          | 2-3 hours       | Not Started |
| Phase 9: Testing            | 3-4 hours       | Not Started |
| **Total**                   | **21-32 hours** |             |
