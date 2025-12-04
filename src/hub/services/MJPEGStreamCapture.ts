// Copyright (c) 2021-2025 Littleton Robotics
// http://github.com/Mechanical-Advantage
//
// Use of this source code is governed by a BSD
// license that can be found in the LICENSE file
// at the root directory of this project.

import { StreamFrame, StreamCaptureState } from "../../shared/StreamFrame";

/**
 * Service class for capturing frames from an MJPEG video stream.
 * Handles connection, frame parsing, storage, and cleanup.
 */
export default class MJPEGStreamCapture {
  private static DEFAULT_MAX_FRAMES = 1000;

  private url: string = "";
  private isCapturing: boolean = false;
  private frames: StreamFrame[] = [];
  private error: string | null = null;
  private maxFrames: number;

  private abortController: AbortController | null = null;
  private timeSupplier: (() => number) | null = null;
  private onStateChange: ((state: StreamCaptureState) => void) | null = null;

  /**
   * Creates a new MJPEGStreamCapture instance.
   * @param maxFrames Maximum number of frames to store (oldest are removed when exceeded)
   */
  constructor(maxFrames: number = MJPEGStreamCapture.DEFAULT_MAX_FRAMES) {
    this.maxFrames = maxFrames;
  }

  /**
   * Sets a callback to be notified when capture state changes.
   * @param callback Function to call with the new state
   */
  setOnStateChange(callback: (state: StreamCaptureState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * Sets the time supplier function for getting current log timestamps.
   * @param supplier Function that returns the current log timestamp
   */
  setTimeSupplier(supplier: (() => number) | null): void {
    this.timeSupplier = supplier;
  }

  /**
   * Gets the current capture state.
   */
  getState(): StreamCaptureState {
    return {
      url: this.url,
      isCapturing: this.isCapturing,
      frames: this.frames,
      error: this.error
    };
  }

  /**
   * Gets the number of captured frames.
   */
  getFrameCount(): number {
    return this.frames.length;
  }

  /**
   * Gets the current stream URL.
   */
  getUrl(): string {
    return this.url;
  }

  /**
   * Checks if capture is currently active.
   */
  getIsCapturing(): boolean {
    return this.isCapturing;
  }

  /**
   * Starts capturing frames from the specified MJPEG stream URL.
   * @param url The MJPEG stream URL
   */
  async startCapture(url: string): Promise<void> {
    // Stop any existing capture
    this.stopCapture();

    this.url = url;
    this.error = null;
    this.isCapturing = true;
    this.notifyStateChange();

    this.abortController = new AbortController();

    try {
      const response = await fetch(url, {
        signal: this.abortController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      // Get the boundary from Content-Type header
      const contentType = response.headers.get("Content-Type") || "";
      const boundary = this.extractBoundary(contentType);

      if (!boundary) {
        throw new Error("Could not find MJPEG boundary in Content-Type header");
      }

      // Start reading the stream
      await this.readStream(response.body, boundary);
    } catch (err: any) {
      if (err.name === "AbortError") {
        // Normal cancellation, not an error
        return;
      }

      this.error = err.message || "Unknown error";
      this.isCapturing = false;
      this.notifyStateChange();
    }
  }

  /**
   * Stops the current capture session.
   */
  stopCapture(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isCapturing = false;
    this.notifyStateChange();
  }

  /**
   * Clears all captured frames and releases resources.
   */
  clearFrames(): void {
    // Revoke all object URLs to free memory
    for (const frame of this.frames) {
      URL.revokeObjectURL(frame.imageUrl);
    }
    this.frames = [];
    this.notifyStateChange();
  }

  /**
   * Disposes of the capture instance and releases all resources.
   */
  dispose(): void {
    this.stopCapture();
    this.clearFrames();
    this.onStateChange = null;
    this.timeSupplier = null;
  }

  /**
   * Gets the frame closest to the specified timestamp.
   * Uses binary search for efficient lookup.
   * @param timestamp The target timestamp
   * @returns The frame with timestamp <= target, or null if no frames exist
   */
  getFrameAtTime(timestamp: number): StreamFrame | null {
    if (this.frames.length === 0) {
      return null;
    }

    // Binary search for the frame with timestamp <= target
    let left = 0;
    let right = this.frames.length - 1;
    let result: StreamFrame | null = null;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const frame = this.frames[mid];

      if (frame.timestamp <= timestamp) {
        result = frame;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return result;
  }

  /**
   * Gets the frame at the specified index.
   * @param index The frame index
   * @returns The frame at the index, or null if out of bounds
   */
  getFrameAtIndex(index: number): StreamFrame | null {
    if (index < 0 || index >= this.frames.length) {
      return null;
    }
    return this.frames[index];
  }

  /**
   * Extracts the boundary string from a Content-Type header.
   * @param contentType The Content-Type header value
   * @returns The boundary string, or null if not found
   */
  private extractBoundary(contentType: string): string | null {
    // Common patterns:
    // multipart/x-mixed-replace; boundary=--myboundary
    // multipart/x-mixed-replace;boundary=myboundary
    // multipart/x-mixed-replace; boundary="myboundary"

    const match = contentType.match(/boundary=(?:"([^"]+)"|([^\s;]+))/i);
    if (match) {
      return match[1] || match[2];
    }
    return null;
  }

  /**
   * Reads and parses the MJPEG stream.
   * @param body The ReadableStream from the fetch response
   * @param boundary The MJPEG boundary string
   */
  private async readStream(body: ReadableStream<Uint8Array>, boundary: string): Promise<void> {
    const reader = body.getReader();
    let bufferChunks: Uint8Array[] = [];
    let bufferLength = 0;

    // Boundary markers (with and without leading dashes, as implementations vary)
    const boundaryBytes = new TextEncoder().encode("--" + boundary);
    const jpegStartMarker = new Uint8Array([0xff, 0xd8]); // JPEG SOI marker
    const jpegEndMarker = new Uint8Array([0xff, 0xd9]); // JPEG EOI marker

    const getBuffer = (): Uint8Array => {
      if (bufferChunks.length === 0) return new Uint8Array(0);
      if (bufferChunks.length === 1) return bufferChunks[0];
      const result = new Uint8Array(bufferLength);
      let offset = 0;
      for (const chunk of bufferChunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      bufferChunks = [result];
      return result;
    };

    const setBuffer = (data: Uint8Array): void => {
      bufferChunks = [data];
      bufferLength = data.length;
    };

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Append new data to buffer
        if (value) {
          bufferChunks.push(new Uint8Array(value));
          bufferLength += value.length;
        }

        // Process all complete frames in the buffer
        let buffer = getBuffer();
        while (true) {
          const frameData = this.extractFrame(buffer, boundaryBytes, jpegStartMarker, jpegEndMarker);

          if (!frameData) {
            break;
          }

          // Create frame with current timestamp
          const timestamp = this.timeSupplier ? this.timeSupplier() : Date.now() / 1000;
          await this.addFrame(frameData.jpegData, timestamp);

          // Update buffer to remaining data
          buffer = new Uint8Array(frameData.remainingBuffer);
          setBuffer(buffer);
        }

        // Prevent buffer from growing too large (keep last 1MB max)
        if (bufferLength > 1024 * 1024) {
          const currentBuffer = getBuffer();
          const trimmed = currentBuffer.slice(-512 * 1024);
          setBuffer(new Uint8Array(trimmed));
        }
      }
    } finally {
      reader.releaseLock();
      this.isCapturing = false;
      this.notifyStateChange();
    }
  }

  /**
   * Extracts a single JPEG frame from the buffer.
   * @param buffer The current buffer
   * @param boundaryBytes The boundary marker bytes
   * @param jpegStart JPEG start marker
   * @param jpegEnd JPEG end marker
   * @returns Frame data and remaining buffer, or null if no complete frame found
   */
  private extractFrame(
    buffer: Uint8Array,
    boundaryBytes: Uint8Array,
    jpegStart: Uint8Array,
    jpegEnd: Uint8Array
  ): { jpegData: Uint8Array; remainingBuffer: Uint8Array } | null {
    // Find JPEG start marker
    const startIndex = this.findMarker(buffer, jpegStart);
    if (startIndex === -1) {
      return null;
    }

    // Find JPEG end marker after start
    const endIndex = this.findMarker(buffer, jpegEnd, startIndex);
    if (endIndex === -1) {
      return null;
    }

    // Extract the complete JPEG (including markers)
    const jpegData = buffer.slice(startIndex, endIndex + jpegEnd.length);
    const remainingBuffer = buffer.slice(endIndex + jpegEnd.length);

    return { jpegData, remainingBuffer };
  }

  /**
   * Finds a marker pattern in a buffer.
   * @param buffer The buffer to search
   * @param marker The marker to find
   * @param startFrom Starting index for search
   * @returns Index of marker, or -1 if not found
   */
  private findMarker(buffer: Uint8Array, marker: Uint8Array, startFrom: number = 0): number {
    for (let i = startFrom; i <= buffer.length - marker.length; i++) {
      let found = true;
      for (let j = 0; j < marker.length; j++) {
        if (buffer[i + j] !== marker[j]) {
          found = false;
          break;
        }
      }
      if (found) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Concatenates two Uint8Arrays.
   * @param a First array
   * @param b Second array
   * @returns Combined array
   */
  private concatArrays(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length + b.length);
    result.set(a);
    result.set(b, a.length);
    return result;
  }

  /**
   * Copies a Uint8Array to a new buffer (fixes TypeScript ArrayBufferLike issues).
   * @param source The source array
   * @returns A new Uint8Array with the same contents
   */
  private copyToNewBuffer(source: Uint8Array): Uint8Array {
    const result = new Uint8Array(source.length);
    result.set(source);
    return result;
  }

  /**
   * Adds a new frame to the storage.
   * @param jpegData The JPEG image data
   * @param timestamp The capture timestamp
   */
  private async addFrame(jpegData: Uint8Array, timestamp: number): Promise<void> {
    // Create Blob from JPEG data - copy to new ArrayBuffer to satisfy TypeScript
    const newBuffer = new ArrayBuffer(jpegData.length);
    new Uint8Array(newBuffer).set(jpegData);
    const blob = new Blob([newBuffer], { type: "image/jpeg" });
    const imageUrl = URL.createObjectURL(blob);

    const frame: StreamFrame = {
      timestamp,
      imageData: blob,
      imageUrl
    };

    // Add frame maintaining sorted order by timestamp
    // (frames should generally arrive in order, so just append)
    this.frames.push(frame);

    // Remove oldest frames if we exceed the limit
    while (this.frames.length > this.maxFrames) {
      const oldFrame = this.frames.shift();
      if (oldFrame) {
        URL.revokeObjectURL(oldFrame.imageUrl);
      }
    }

    this.notifyStateChange();
  }

  /**
   * Notifies the state change callback if set.
   */
  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }
}
