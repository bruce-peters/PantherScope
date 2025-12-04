// Copyright (c) 2021-2025 Littleton Robotics
// http://github.com/Mechanical-Advantage
//
// Use of this source code is governed by a BSD
// license that can be found in the LICENSE file
// at the root directory of this project.

/**
 * Represents a single captured frame from an MJPEG stream.
 */
export interface StreamFrame {
  /** Log timestamp when frame was captured */
  timestamp: number;
  /** JPEG image data */
  imageData: Blob;
  /** Object URL for rendering (created from Blob via URL.createObjectURL) */
  imageUrl: string;
}

/**
 * Represents the current state of stream capture.
 */
export interface StreamCaptureState {
  /** The URL of the MJPEG stream */
  url: string;
  /** Whether capture is currently active */
  isCapturing: boolean;
  /** Array of captured frames, sorted by timestamp */
  frames: StreamFrame[];
  /** Error message if capture failed, null otherwise */
  error: string | null;
}
