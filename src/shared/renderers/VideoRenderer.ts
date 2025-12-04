// Copyright (c) 2021-2025 Littleton Robotics
// http://github.com/Mechanical-Advantage
//
// Use of this source code is governed by a BSD
// license that can be found in the LICENSE file
// at the root directory of this project.

import TabRenderer from "./TabRenderer";

export default class VideoRenderer implements TabRenderer {
  private IMAGE: HTMLImageElement;

  private aspectRatio: number | null = null;
  private lastSrc: string = "";

  constructor(root: HTMLElement) {
    this.IMAGE = root.getElementsByTagName("img")[0] as HTMLImageElement;

    // Update aspect ratio when image loads (needed for blob URLs)
    this.IMAGE.addEventListener("load", () => {
      this.updateAspectRatio();
    });
  }

  getAspectRatio(): number | null {
    return this.aspectRatio;
  }

  /** Updates aspect ratio from current image dimensions */
  private updateAspectRatio(): void {
    let width = this.IMAGE.naturalWidth;
    let height = this.IMAGE.naturalHeight;
    if (width > 0 && height > 0) {
      this.aspectRatio = width / height;
    }
  }

  render(command: unknown): void {
    if (typeof command !== "string") return;
    this.IMAGE.hidden = command === "";

    // Only update src if it changed (avoids reloading the same image)
    if (command !== this.lastSrc) {
      this.IMAGE.src = command;
      this.lastSrc = command;
    }

    // Try to update aspect ratio immediately (works for cached/local images)
    this.updateAspectRatio();
  }

  saveState(): unknown {
    return null;
  }

  restoreState(state: unknown): void {}
}
