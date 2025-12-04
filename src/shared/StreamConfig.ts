// Copyright (c) 2021-2025 Littleton Robotics
// http://github.com/Mechanical-Advantage
//
// Use of this source code is governed by a BSD
// license that can be found in the LICENSE file
// at the root directory of this project.

/**
 * Configuration for a video stream source.
 */
export interface StreamSourceConfig {
  /** Whether the URL is manually entered or read from a log field */
  type: "manual" | "field";
  /** The stream URL (for manual entry) */
  url?: string;
  /** The log field key containing the URL (for field reference) */
  fieldKey?: string;
}

/**
 * Validates if a string looks like a valid MJPEG stream URL.
 * @param value The string to validate
 * @returns True if the string appears to be a valid stream URL
 */
export function isValidStreamUrl(value: string): boolean {
  if (!value || typeof value !== "string") {
    return false;
  }

  // Check for http:// or https:// prefix
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return false;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a URL looks like a common FRC camera stream URL.
 * @param url The URL to check
 * @returns True if the URL matches common FRC stream patterns
 */
export function isFRCStreamUrl(url: string): boolean {
  if (!isValidStreamUrl(url)) {
    return false;
  }

  const lowerUrl = url.toLowerCase();

  // Common FRC stream path patterns
  const streamPatterns = [
    "/stream.mjpg",
    "/mjpg/video.mjpg",
    "/video.mjpg",
    "/stream",
    "/mjpeg",
    "/video",
    ":1181",
    ":1182",
    ":5800",
    ":5801"
  ];

  return streamPatterns.some((pattern) => lowerUrl.includes(pattern));
}
