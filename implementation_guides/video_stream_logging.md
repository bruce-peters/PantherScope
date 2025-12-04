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

## Phase 1: Core Data Structures and Types

### Description

Set up the foundational types and interfaces needed for stream capture functionality.

### Tasks

- [ ] **1.1** Create new file `src/shared/StreamFrame.ts` with frame data structure:

  ```typescript
  export interface StreamFrame {
    timestamp: number; // Log timestamp when frame was captured
    imageData: Blob; // JPEG image data
    imageUrl: string; // Object URL for rendering (created from Blob)
  }

  export interface StreamCaptureState {
    url: string;
    isCapturing: boolean;
    frames: StreamFrame[];
    error: string | null;
  }
  ```

- [ ] **1.2** Add `Stream` option to `src/shared/VideoSource.ts` enum:

  ```typescript
  enum VideoSource {
    Local,
    YouTube,
    TheBlueAlliance,
    Stream // New option
  }
  ```

- [ ] **1.3** Create new file `src/shared/StreamConfig.ts` for stream-related configuration:
  ```typescript
  export interface StreamSourceConfig {
    type: "manual" | "field"; // Manual URL entry or from log field
    url?: string; // For manual entry
    fieldKey?: string; // For log field reference
  }
  ```

### Quality Assurance Checks

- [ ] TypeScript compiles without errors
- [ ] All new types are properly exported
- [ ] No circular dependencies introduced

---

## Phase 2: MJPEG Stream Capture Service

### Description

Create a service class to handle MJPEG stream connection, frame extraction, and storage.

### Tasks

- [ ] **2.1** Create new file `src/hub/services/MJPEGStreamCapture.ts`:

  ```typescript
  // Core class that handles:
  // - Connecting to MJPEG stream via fetch/ReadableStream
  // - Parsing multipart MJPEG boundaries
  // - Extracting individual JPEG frames
  // - Storing frames with timestamps
  // - Cleanup of object URLs on dispose
  ```

- [ ] **2.2** Implement MJPEG boundary parsing:

  - Parse `Content-Type: multipart/x-mixed-replace; boundary=...` header
  - Split stream on boundary markers
  - Extract JPEG data between boundaries
  - Handle common boundary formats (`--boundary`, `--myboundary`, etc.)

- [ ] **2.3** Implement frame capture with timestamp synchronization:

  - Get current log timestamp from `window.selection.getRenderTime()` or live time supplier
  - Only capture frames when live connection is active
  - Store frame with associated timestamp
  - Implement maximum frame buffer size (configurable, default ~1000 frames)
  - Remove oldest frames when buffer is full

- [ ] **2.4** Implement frame retrieval by timestamp:

  ```typescript
  getFrameAtTime(timestamp: number): StreamFrame | null
  // Returns frame with closest timestamp <= requested timestamp
  // Uses binary search for efficient lookup
  ```

- [ ] **2.5** Implement cleanup and resource management:
  - Revoke object URLs when frames are removed
  - Stop capture gracefully on disconnect
  - Clear all frames and URLs on dispose

### Quality Assurance Checks

- [ ] Stream connects successfully to test MJPEG source
- [ ] Frames are correctly parsed from MJPEG boundary format
- [ ] Memory is properly managed (object URLs revoked)
- [ ] Frame lookup returns correct frame for given timestamp
- [ ] No memory leaks after extended capture sessions

---

## Phase 3: Video Controller Updates

### Description

Modify `VideoController.ts` to support stream source selection and capture management.

### Tasks

- [ ] **3.1** Add new UI button for Stream source in `www/hub.html`:

  - Add fourth button after TBA button in `.video-source` div
  - Use appropriate icon (e.g., `symbols/video.fill.svg` or `symbols/antenna.radiowaves.left.and.right.svg`)
  - Add SVG path element for loading animation (same pattern as YouTube/TBA buttons)

- [ ] **3.2** Add Stream button reference and event handler in `VideoController.ts`:

  ```typescript
  private STREAM_SOURCE: HTMLButtonElement;
  // In constructor:
  this.STREAM_SOURCE = sourceSection.children[3] as HTMLButtonElement;
  this.STREAM_SOURCE.addEventListener("click", () => {
    // Show URL input dialog or use clipboard URL
  });
  ```

- [ ] **3.3** Add drag-and-drop support for String fields containing URLs:

  - Listen for `drag-update` events
  - Check if dropped field is a String type
  - Validate string value looks like HTTP URL
  - Start stream capture with the URL

- [ ] **3.4** Add stream capture instance management:

  ```typescript
  private streamCapture: MJPEGStreamCapture | null = null;
  private streamFieldKey: string | null = null;  // If connected to log field
  ```

- [ ] **3.5** Implement `processStreamData()` method to handle stream state changes:

  - Update UI based on capture state
  - Handle errors gracefully with user feedback

- [ ] **3.6** Modify `getCommand()` to return stream frame when in stream mode:

  ```typescript
  // If stream mode and has frames:
  // Get current render time
  // Find closest frame
  // Return frame's imageUrl
  ```

- [ ] **3.7** Add stream-specific controls:
  - URL display/edit field (shows current stream URL)
  - Connection status indicator
  - Frame count display
  - Clear frames button

### Quality Assurance Checks

- [ ] Stream button appears and is clickable
- [ ] Drag-and-drop from sidebar works with String fields
- [ ] URL validation rejects invalid URLs
- [ ] Stream starts capturing when connected to live source
- [ ] Correct frame displays at each timestamp during playback
- [ ] UI reflects connection status accurately

---

## Phase 4: Video Renderer Updates

### Description

Update `VideoRenderer.ts` to handle both file paths and blob URLs.

### Tasks

- [ ] **4.1** Modify `render()` method to handle object URLs:

  - Current implementation expects file paths
  - Object URLs (blob:...) should work the same way
  - Ensure proper aspect ratio handling for stream frames

- [ ] **4.2** Add loading state indicator:
  - Show placeholder when waiting for first frame
  - Handle case where no frame exists for current timestamp

### Quality Assurance Checks

- [ ] Stream frames render correctly
- [ ] Aspect ratio is preserved
- [ ] No flickering during playback
- [ ] Loading state displays appropriately

---

## Phase 5: Main Process Integration

### Description

Add necessary IPC handlers in main process for stream-related operations.

### Tasks

- [ ] **5.1** Add stream URL input dialog in `src/main/electron/main.ts`:

  - Handle `select-video` with `VideoSource.Stream`
  - Show input dialog for manual URL entry (or use clipboard)
  - Validate URL format
  - Send URL back to renderer

- [ ] **5.2** Add stream error handling:
  - Display error dialogs for connection failures
  - Handle CORS issues with helpful messages

### Quality Assurance Checks

- [ ] URL input dialog appears and accepts input
- [ ] Invalid URLs show appropriate error message
- [ ] CORS errors provide helpful guidance

---

## Phase 6: Field Integration and Auto-Detection

### Description

Enable automatic stream URL detection from NetworkTables fields.

### Tasks

- [ ] **6.1** Add field monitoring in `VideoController.ts`:

  - When a String field is dropped, store the field key
  - Periodically check field value for URL changes
  - Automatically reconnect if URL changes

- [ ] **6.2** Implement URL validation helper:

  ```typescript
  function isValidStreamUrl(value: string): boolean {
    // Check for http:// or https:// prefix
    // Check for common stream paths (/mjpg/video.mjpg, /stream, etc.)
    // Return true if looks like valid stream URL
  }
  ```

- [ ] **6.3** Add visual indicator when connected to a field:
  - Show field key in UI
  - Different styling for field-connected vs manual URL

### Quality Assurance Checks

- [ ] Field value changes are detected
- [ ] Stream reconnects when URL changes
- [ ] UI clearly indicates field connection status

---

## Phase 7: State Management and Persistence

### Description

Handle tab state saving/restoration and cleanup.

### Tasks

- [ ] **7.1** Implement `saveState()` to preserve stream configuration:

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

- [ ] **7.2** Implement `restoreState()` to restore stream configuration:

  - Restore URL and field key
  - Do NOT restore captured frames (memory only)
  - Re-establish field monitoring if applicable

- [ ] **7.3** Implement cleanup on tab close:

  - Stop stream capture
  - Clear all frames and object URLs
  - Remove field monitoring

- [ ] **7.4** Handle live connection state changes:
  - Start capture when live connects
  - Stop capture (but keep frames) when live disconnects
  - Clear frames only on explicit user action or new stream

### Quality Assurance Checks

- [ ] State saves and restores correctly
- [ ] Frames are cleared on tab close (no memory leak)
- [ ] Field monitoring is properly cleaned up
- [ ] Capture starts/stops appropriately with live connection

---

## Phase 8: UI Polish and User Experience

### Description

Final UI improvements and user experience enhancements.

### Tasks

- [ ] **8.1** Add CSS styles in `www/hub.css` for stream-specific UI:

  - Stream URL display styling
  - Connection status indicator colors
  - Frame counter styling

- [ ] **8.2** Add helpful tooltips and labels:

  - Explain drag-and-drop functionality
  - Show expected URL format
  - Indicate when capturing vs playback

- [ ] **8.3** Add keyboard shortcuts:

  - Quick clear frames
  - Toggle capture (if applicable)

- [ ] **8.4** Update source list help dialog (`sourceListHelp`) if applicable:
  - Document stream URL field type
  - Explain how to publish camera URLs from robot code

### Quality Assurance Checks

- [ ] UI is intuitive and consistent with existing design
- [ ] All interactive elements have appropriate feedback
- [ ] Help text is clear and accurate

---

## Phase 9: Testing and Edge Cases

### Description

Comprehensive testing of all functionality.

### Tasks

- [ ] **9.1** Test with common FRC camera streams:

  - Limelight MJPEG stream
  - PhotonVision MJPEG stream
  - USB camera via CameraServer

- [ ] **9.2** Test error conditions:

  - Invalid URL format
  - Unreachable host
  - Stream disconnection mid-capture
  - CORS blocked requests

- [ ] **9.3** Test memory management:

  - Extended capture session (10+ minutes)
  - Verify frame buffer limits work
  - Check for memory leaks with DevTools

- [ ] **9.4** Test playback synchronization:

  - Frames align correctly with log timestamps
  - Scrubbing timeline shows correct frames
  - Playback at various speeds

- [ ] **9.5** Test multi-tab scenarios:
  - Multiple stream tabs simultaneously
  - Different streams in each tab
  - Switching between tabs

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

### New Files

- `src/shared/StreamFrame.ts`
- `src/shared/StreamConfig.ts`
- `src/hub/services/MJPEGStreamCapture.ts`

### Modified Files

- `src/shared/VideoSource.ts` - Add Stream enum
- `src/hub/controllers/VideoController.ts` - Major changes
- `src/shared/renderers/VideoRenderer.ts` - Minor changes
- `src/main/electron/main.ts` - Add stream handlers
- `www/hub.html` - Add stream button
- `www/hub.css` - Add stream styles

---

## Estimated Effort

| Phase                       | Estimated Time  |
| --------------------------- | --------------- |
| Phase 1: Core Types         | 1-2 hours       |
| Phase 2: MJPEG Service      | 4-6 hours       |
| Phase 3: Controller Updates | 4-6 hours       |
| Phase 4: Renderer Updates   | 1-2 hours       |
| Phase 5: Main Process       | 2-3 hours       |
| Phase 6: Field Integration  | 2-3 hours       |
| Phase 7: State Management   | 2-3 hours       |
| Phase 8: UI Polish          | 2-3 hours       |
| Phase 9: Testing            | 3-4 hours       |
| **Total**                   | **21-32 hours** |
