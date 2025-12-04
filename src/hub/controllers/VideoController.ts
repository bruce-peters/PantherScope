// Copyright (c) 2021-2025 Littleton Robotics
// http://github.com/Mechanical-Advantage
//
// Use of this source code is governed by a BSD
// license that can be found in the LICENSE file
// at the root directory of this project.

import { MatchType } from "../../shared/MatchInfo";
import { StreamSourceConfig, isValidStreamUrl } from "../../shared/StreamConfig";
import VideoSource from "../../shared/VideoSource";
import { getEnabledData, getMatchInfo, getOrDefault } from "../../shared/log/LogUtil";
import LoggableType from "../../shared/log/LoggableType";
import { createUUID } from "../../shared/util";
import MJPEGStreamCapture from "../services/MJPEGStreamCapture";
import TabController from "./TabController";

export default class VideoController implements TabController {
  UUID = createUUID();

  private BUTTON_BORDER_RADIUS = 6;
  private LOCAL_SOURCE: HTMLButtonElement;
  private YOUTUBE_SOURCE: HTMLButtonElement;
  private TBA_SOURCE: HTMLButtonElement;
  private STREAM_SOURCE: HTMLButtonElement;

  private STREAM_INFO: HTMLElement;
  private STREAM_URL_DISPLAY: HTMLElement;
  private STREAM_STATUS_INDICATOR: HTMLElement;
  private STREAM_FRAME_COUNT: HTMLElement;
  private STREAM_CLEAR_BUTTON: HTMLButtonElement;
  private STREAM_DROP_TARGET: HTMLElement;

  private LOCK_BUTTON: HTMLButtonElement;
  private UNLOCK_BUTTON: HTMLButtonElement;
  private PLAY_BUTTON: HTMLButtonElement;
  private PAUSE_BUTTON: HTMLButtonElement;
  private FRAME_BACK_BUTTON: HTMLButtonElement;
  private FRAME_FORWARD_BUTTON: HTMLButtonElement;
  private SKIP_BACK_BUTTON: HTMLButtonElement;
  private SKIP_FORWARD_BUTTON: HTMLButtonElement;
  private VIDEO_TIMELINE_INPUT: HTMLInputElement;
  private VIDEO_TIMELINE_PROGRESS: HTMLElement;

  private root: HTMLElement;

  // File/YouTube/TBA video state
  private imgFolder: string | null = null;
  private lastImgFolder: string | null = null;
  private fps: number | null = null;
  private totalFrames: number | null = null;
  private completedFrames: number | null = null;
  private matchStartFrame = -1;

  // Stream capture state
  private streamCapture: MJPEGStreamCapture | null = null;
  private streamFieldKey: string | null = null;
  private streamUrl: string | null = null;
  private isStreamMode: boolean = false;
  private lastFieldValue: string | null = null;

  private locked: boolean = false;
  private lockedStartLog: number = 0;
  private playing: boolean = false;
  private playStartFrame: number = 0;
  private playStartReal: number = 0;

  constructor(root: HTMLElement) {
    this.root = root;

    // Get elements
    let sourceSection = root.getElementsByClassName("video-source")[0] as HTMLElement;
    let timelineSection = root.getElementsByClassName("video-timeline-section")[0] as HTMLElement;
    let timelineControlsSection = root.getElementsByClassName("video-timeline-controls")[0] as HTMLElement;

    this.LOCAL_SOURCE = sourceSection.children[0] as HTMLButtonElement;
    this.YOUTUBE_SOURCE = sourceSection.children[1] as HTMLButtonElement;
    this.TBA_SOURCE = sourceSection.children[2] as HTMLButtonElement;
    this.STREAM_SOURCE = sourceSection.children[3] as HTMLButtonElement;

    this.STREAM_INFO = root.getElementsByClassName("video-stream-info")[0] as HTMLElement;
    this.STREAM_URL_DISPLAY = root.getElementsByClassName("video-stream-url")[0] as HTMLElement;
    this.STREAM_STATUS_INDICATOR = root.getElementsByClassName("video-stream-status-indicator")[0] as HTMLElement;
    this.STREAM_FRAME_COUNT = root.getElementsByClassName("video-stream-frame-count")[0] as HTMLElement;
    this.STREAM_CLEAR_BUTTON = root.getElementsByClassName("video-stream-clear")[0] as HTMLButtonElement;
    this.STREAM_DROP_TARGET = root.getElementsByClassName("video-stream-drop-target")[0] as HTMLElement;

    this.LOCK_BUTTON = timelineSection.children[0] as HTMLButtonElement;
    this.UNLOCK_BUTTON = timelineSection.children[1] as HTMLButtonElement;

    this.PLAY_BUTTON = timelineControlsSection.children[2] as HTMLButtonElement;
    this.PAUSE_BUTTON = timelineControlsSection.children[3] as HTMLButtonElement;
    this.FRAME_BACK_BUTTON = timelineControlsSection.children[1] as HTMLButtonElement;
    this.FRAME_FORWARD_BUTTON = timelineControlsSection.children[4] as HTMLButtonElement;
    this.SKIP_BACK_BUTTON = timelineControlsSection.children[0] as HTMLButtonElement;
    this.SKIP_FORWARD_BUTTON = timelineControlsSection.children[5] as HTMLButtonElement;

    this.VIDEO_TIMELINE_INPUT = timelineSection.lastElementChild?.children[0] as HTMLInputElement;
    this.VIDEO_TIMELINE_PROGRESS = timelineSection.lastElementChild?.children[1].firstElementChild as HTMLElement;

    // Source selection
    this.LOCAL_SOURCE.addEventListener("click", () => {
      this.exitStreamMode();
      this.YOUTUBE_SOURCE.classList.remove("animating");
      this.TBA_SOURCE.classList.remove("animating");
      this.STREAM_SOURCE.classList.remove("animating");
      window.sendMainMessage("select-video", {
        uuid: this.UUID,
        source: VideoSource.Local,
        matchInfo: null,
        menuCoordinates: null
      });
    });
    this.createButtonAnimation(this.YOUTUBE_SOURCE);
    this.YOUTUBE_SOURCE.addEventListener("click", () => {
      this.exitStreamMode();
      this.YOUTUBE_SOURCE.classList.add("animating");
      this.TBA_SOURCE.classList.remove("animating");
      this.STREAM_SOURCE.classList.remove("animating");
      window.sendMainMessage("select-video", {
        uuid: this.UUID,
        source: VideoSource.YouTube,
        matchInfo: null,
        menuCoordinates: null
      });
    });
    this.createButtonAnimation(this.TBA_SOURCE);
    this.TBA_SOURCE.addEventListener("click", () => {
      if (!window.preferences?.tbaApiKey) {
        window.sendMainMessage("error", {
          title: "No API key",
          content:
            "Please enter an API key for The Blue Alliance in the AdvantageScope preferences. An API key can be obtained from the Account page on The Blue Alliance website."
        });
        return;
      }
      let matchInfo = getMatchInfo(window.log);
      if (matchInfo === null) {
        window.sendMainMessage("error", {
          title: "No match info",
          content:
            "Failed to read event and match info from the log. Please load the video using a YouTube URL or local file instead."
        });
        return;
      }
      if (matchInfo.matchType === MatchType.Practice) {
        window.sendMainMessage("error", {
          title: "No videos for practice match",
          content:
            "This is a practice match. No data is available on The Blue Alliance for practice matches, please load the video using a YouTube URL or local file instead."
        });
        return;
      }
      this.exitStreamMode();
      this.YOUTUBE_SOURCE.classList.remove("animating");
      this.TBA_SOURCE.classList.add("animating");
      this.STREAM_SOURCE.classList.remove("animating");
      let rect = this.TBA_SOURCE.getBoundingClientRect();
      window.sendMainMessage("select-video", {
        uuid: this.UUID,
        source: VideoSource.TheBlueAlliance,
        matchInfo: matchInfo,
        menuCoordinates: [rect.right, rect.top]
      });
    });

    // Stream source button
    this.createButtonAnimation(this.STREAM_SOURCE);
    this.STREAM_SOURCE.addEventListener("click", () => {
      this.YOUTUBE_SOURCE.classList.remove("animating");
      this.TBA_SOURCE.classList.remove("animating");
      this.STREAM_SOURCE.classList.add("animating");

      // Try to get URL from clipboard
      window.sendMainMessage("select-video", {
        uuid: this.UUID,
        source: VideoSource.Stream,
        matchInfo: null,
        menuCoordinates: null
      });
    });

    // Stream clear button
    this.STREAM_CLEAR_BUTTON.addEventListener("click", () => {
      this.clearStreamFrames();
    });

    // Drag and drop support for stream URLs
    this.setupDragAndDrop();

    // Lock buttons
    let toggleLock = () => {
      if (!this.hasData()) return;
      this.locked = !this.locked;
      if (this.locked) {
        this.playing = false;
        let selectedTime = window.selection.getSelectedTime();
        if (selectedTime === null) selectedTime = 0;
        if (!this.isStreamMode) {
          this.lockedStartLog = selectedTime - (Number(this.VIDEO_TIMELINE_INPUT.value) - 1) / this.fps!;
        }
      }
      this.updateButtons();
    };
    this.LOCK_BUTTON.addEventListener("click", () => toggleLock());
    this.UNLOCK_BUTTON.addEventListener("click", () => toggleLock());

    // Playback buttons
    let togglePlayPause = () => {
      if (this.locked || !this.hasData() || this.isStreamMode) return;
      this.playing = !this.playing;
      if (this.playing) {
        this.playStartFrame = Number(this.VIDEO_TIMELINE_INPUT.value);
        this.playStartReal = new Date().getTime() / 1000;
      }
      this.updateButtons();
    };
    let changeFrame = (delta: number) => {
      if (this.locked || !this.hasData() || this.playing || this.isStreamMode) return;
      this.VIDEO_TIMELINE_INPUT.value = (Number(this.VIDEO_TIMELINE_INPUT.value) + delta).toString();
    };
    let skipTime = (delta: number) => {
      if (this.locked || !this.hasData() || this.isStreamMode) return;
      if (this.fps) {
        this.VIDEO_TIMELINE_INPUT.value = (Number(this.VIDEO_TIMELINE_INPUT.value) + delta * this.fps).toString();
        if (this.playing) {
          this.playStartFrame = Number(this.VIDEO_TIMELINE_INPUT.value);
          this.playStartReal = new Date().getTime() / 1000;
        }
      }
    };
    this.PLAY_BUTTON.addEventListener("click", () => togglePlayPause());
    this.PAUSE_BUTTON.addEventListener("click", () => togglePlayPause());
    this.VIDEO_TIMELINE_INPUT.addEventListener("input", () => {
      if (this.playing) {
        this.playStartFrame = Number(this.VIDEO_TIMELINE_INPUT.value);
        this.playStartReal = new Date().getTime() / 1000;
      }
    });
    this.FRAME_BACK_BUTTON.addEventListener("click", () => changeFrame(-1));
    this.FRAME_FORWARD_BUTTON.addEventListener("click", () => changeFrame(1));
    this.SKIP_BACK_BUTTON.addEventListener("click", () => skipTime(-5));
    this.SKIP_FORWARD_BUTTON.addEventListener("click", () => skipTime(5));
    window.addEventListener("keydown", (event) => {
      if (
        root === null ||
        root.hidden ||
        event.target !== document.body ||
        (window.platform === "darwin" ? event.metaKey : event.ctrlKey)
      )
        return;
      switch (event.code) {
        case "ArrowUp":
        case "ArrowDown":
          toggleLock();
          break;
        case "Slash":
          togglePlayPause();
          break;
        case "Comma":
          skipTime(-5);
          break;
        case "Period":
          skipTime(5);
          break;
        case "ArrowLeft":
          changeFrame(-1);
          break;
        case "ArrowRight":
          changeFrame(1);
          break;
      }
    });
    this.updateButtons();
  }

  /**
   * Sets up drag and drop handling for URL fields.
   */
  private setupDragAndDrop(): void {
    window.addEventListener("drag-update", (event) => {
      const dragData = (event as CustomEvent).detail;

      // Only handle field drags
      if (!("fields" in dragData.data)) return;

      const rootRect = this.root.getBoundingClientRect();
      const x = dragData.x;
      const y = dragData.y;

      // Check if within our bounds
      const isInBounds =
        x >= rootRect.left && x <= rootRect.right && y >= rootRect.top && y <= rootRect.bottom && !this.root.hidden;

      if (!isInBounds) {
        this.STREAM_DROP_TARGET.hidden = true;
        return;
      }

      // Check if any dropped field is a String type
      const fields: string[] = dragData.data.fields;
      const stringField = fields.find((field) => {
        const logType = window.log.getType(field);
        return logType === LoggableType.String;
      });

      if (!stringField) {
        this.STREAM_DROP_TARGET.hidden = true;
        return;
      }

      if (dragData.end) {
        // Drop occurred
        this.STREAM_DROP_TARGET.hidden = true;
        this.handleFieldDrop(stringField);
      } else {
        // Show drop target
        this.STREAM_DROP_TARGET.hidden = false;
      }
    });
  }

  /**
   * Handles a field drop, starting stream capture if the field contains a valid URL.
   */
  private handleFieldDrop(fieldKey: string): void {
    // Get the current value of the field
    const renderTime = window.selection.getRenderTime();
    if (renderTime === null) return;

    const value = getOrDefault(window.log, fieldKey, LoggableType.String, renderTime, "");
    if (!value || !isValidStreamUrl(value)) {
      window.sendMainMessage("error", {
        title: "Invalid stream URL",
        content: `The field "${fieldKey}" does not contain a valid HTTP URL. Expected format: http://... or https://...`
      });
      return;
    }

    // Start stream mode with this field
    this.streamFieldKey = fieldKey;
    this.startStreamCapture(value);
  }

  /**
   * Starts capturing from an MJPEG stream URL.
   */
  private startStreamCapture(url: string): void {
    // Clear file-based video state
    this.imgFolder = null;
    this.fps = null;
    this.totalFrames = null;
    this.completedFrames = null;

    // Enter stream mode
    this.isStreamMode = true;
    this.streamUrl = url;
    this.locked = false;
    this.playing = false;

    // Stop existing capture if any
    if (this.streamCapture) {
      this.streamCapture.dispose();
    }

    // Create new capture instance
    this.streamCapture = new MJPEGStreamCapture();
    this.streamCapture.setTimeSupplier(() => {
      const liveTime = window.selection.getCurrentLiveTime();
      if (liveTime !== null) return liveTime;
      const renderTime = window.selection.getRenderTime();
      return renderTime !== null ? renderTime : Date.now() / 1000;
    });
    this.streamCapture.setOnStateChange(() => {
      this.updateStreamUI();
    });

    // Start capture
    this.streamCapture.startCapture(url);

    // Update UI
    this.updateStreamUI();
    this.updateButtons();

    // Clear button animations
    this.YOUTUBE_SOURCE.classList.remove("animating");
    this.TBA_SOURCE.classList.remove("animating");
    this.STREAM_SOURCE.classList.remove("animating");
  }

  /**
   * Exits stream mode and cleans up resources.
   */
  private exitStreamMode(): void {
    if (this.streamCapture) {
      this.streamCapture.dispose();
      this.streamCapture = null;
    }
    this.isStreamMode = false;
    this.streamFieldKey = null;
    this.streamUrl = null;
    this.lastFieldValue = null;
    this.STREAM_INFO.hidden = true;
    this.STREAM_DROP_TARGET.hidden = true;
  }

  /**
   * Clears captured stream frames.
   */
  private clearStreamFrames(): void {
    if (this.streamCapture) {
      this.streamCapture.clearFrames();
    }
    this.updateStreamUI();
  }

  /**
   * Updates the stream UI elements.
   */
  private updateStreamUI(): void {
    if (!this.isStreamMode) {
      this.STREAM_INFO.hidden = true;
      return;
    }

    this.STREAM_INFO.hidden = false;

    // Update URL display
    const displayUrl = this.streamFieldKey ? `Field: ${this.streamFieldKey}` : this.streamUrl || "No URL";
    this.STREAM_URL_DISPLAY.textContent = displayUrl;
    this.STREAM_URL_DISPLAY.title = this.streamUrl || "";

    // Update status indicator
    if (this.streamCapture) {
      const state = this.streamCapture.getState();
      if (state.error) {
        this.STREAM_STATUS_INDICATOR.className = "video-stream-status-indicator error";
        this.STREAM_STATUS_INDICATOR.title = state.error;
      } else if (state.isCapturing) {
        this.STREAM_STATUS_INDICATOR.className = "video-stream-status-indicator capturing";
        this.STREAM_STATUS_INDICATOR.title = "Capturing";
      } else {
        this.STREAM_STATUS_INDICATOR.className = "video-stream-status-indicator idle";
        this.STREAM_STATUS_INDICATOR.title = "Idle";
      }

      // Update frame count
      this.STREAM_FRAME_COUNT.textContent = `${state.frames.length} frames`;
    }
  }

  isLocked(): boolean {
    return this.locked;
  }

  private hasData(): boolean {
    if (this.isStreamMode) {
      return this.streamCapture !== null && this.streamCapture.getFrameCount() > 0;
    }
    return this.imgFolder !== null && this.fps !== null && this.totalFrames !== null && this.completedFrames !== null;
  }

  private updateButtons() {
    const hasData = this.hasData();

    this.LOCK_BUTTON.disabled = !hasData;
    this.UNLOCK_BUTTON.disabled = !hasData;
    this.LOCK_BUTTON.hidden = this.locked;
    this.UNLOCK_BUTTON.hidden = !this.locked;
    this.PLAY_BUTTON.hidden = this.playing;
    this.PAUSE_BUTTON.hidden = !this.playing;

    // In stream mode, disable manual playback controls (always synced to timeline)
    let disableControls = this.locked || !hasData || this.isStreamMode;
    this.PLAY_BUTTON.disabled = disableControls;
    this.PAUSE_BUTTON.disabled = disableControls;
    this.FRAME_BACK_BUTTON.disabled = disableControls;
    this.FRAME_FORWARD_BUTTON.disabled = disableControls;
    this.SKIP_BACK_BUTTON.disabled = disableControls;
    this.SKIP_FORWARD_BUTTON.disabled = disableControls;
    this.VIDEO_TIMELINE_INPUT.disabled = disableControls;

    // Hide timeline controls in stream mode
    if (this.isStreamMode) {
      this.VIDEO_TIMELINE_INPUT.parentElement!.parentElement!.style.display = "none";
    } else {
      this.VIDEO_TIMELINE_INPUT.parentElement!.parentElement!.style.display = "";
    }
  }

  private createButtonAnimation(button: HTMLElement) {
    let animation: Animation | null = null;
    new ResizeObserver(() => {
      let svg = button.lastElementChild as SVGAElement;
      let path = svg.firstElementChild as SVGPathElement;
      let width = button.getBoundingClientRect().width;
      let height = button.getBoundingClientRect().height;
      svg.setAttribute("width", width.toString());
      svg.setAttribute("height", height.toString());
      path.setAttribute(
        "d",
        "M " +
          (width - this.BUTTON_BORDER_RADIUS).toString() +
          " 0 A " +
          this.BUTTON_BORDER_RADIUS.toString() +
          " " +
          this.BUTTON_BORDER_RADIUS.toString() +
          " 0 0 1 " +
          width.toString() +
          " " +
          this.BUTTON_BORDER_RADIUS.toString() +
          " L " +
          width.toString() +
          " " +
          (height - this.BUTTON_BORDER_RADIUS).toString() +
          " A " +
          this.BUTTON_BORDER_RADIUS.toString() +
          " " +
          this.BUTTON_BORDER_RADIUS.toString() +
          " 0 0 1 " +
          (width - this.BUTTON_BORDER_RADIUS).toString() +
          " " +
          height.toString() +
          " L " +
          this.BUTTON_BORDER_RADIUS.toString() +
          " " +
          height.toString() +
          " A " +
          this.BUTTON_BORDER_RADIUS.toString() +
          " " +
          this.BUTTON_BORDER_RADIUS.toString() +
          " 0 0 1 0 " +
          (height - this.BUTTON_BORDER_RADIUS).toString() +
          " L 0 " +
          this.BUTTON_BORDER_RADIUS.toString() +
          " A " +
          this.BUTTON_BORDER_RADIUS.toString() +
          " " +
          this.BUTTON_BORDER_RADIUS.toString() +
          " 0 0 1 " +
          this.BUTTON_BORDER_RADIUS.toString() +
          " 0 Z"
      );
      path.style.strokeDasharray = (path.getTotalLength() / 4).toString();
      let lastAnimationTime = animation?.currentTime;
      animation?.cancel();
      animation = path.animate([{ strokeDashoffset: path.getTotalLength() }], {
        duration: 1000,
        iterations: Infinity,
        direction: "reverse"
      });
      if (lastAnimationTime) {
        animation.currentTime = lastAnimationTime;
      }
    }).observe(button);
  }

  processVideoData(data: any) {
    if (data.uuid !== this.UUID) return;

    // Handle stream URL from main process
    if ("streamUrl" in data) {
      if (data.streamUrl) {
        this.streamFieldKey = null;
        this.startStreamCapture(data.streamUrl);
      } else {
        this.STREAM_SOURCE.classList.remove("animating");
      }
      return;
    }

    if ("error" in data) {
      this.YOUTUBE_SOURCE.classList.remove("animating");
      this.TBA_SOURCE.classList.remove("animating");
      this.STREAM_SOURCE.classList.remove("animating");
    } else if ("fps" in data) {
      // Exit stream mode when loading file-based video
      this.exitStreamMode();

      // Set progress
      this.imgFolder = data.imgFolder;
      this.fps = data.fps;
      this.totalFrames = data.totalFrames;
      this.completedFrames = data.completedFrames;

      if (this.totalFrames === null || this.completedFrames === null) return;
      this.VIDEO_TIMELINE_PROGRESS.style.width = ((this.completedFrames / this.totalFrames) * 100).toString() + "%";
      this.VIDEO_TIMELINE_INPUT.max = this.totalFrames.toString();

      // Stop animation if loading new file
      if (this.imgFolder !== this.lastImgFolder) {
        this.lastImgFolder = this.imgFolder;
        this.YOUTUBE_SOURCE.classList.remove("animating");
        this.TBA_SOURCE.classList.remove("animating");
        this.STREAM_SOURCE.classList.remove("animating");
      }

      // Lock time when match start frame received
      if (this.matchStartFrame <= 0 && data.matchStartFrame > 0 && !this.locked) {
        let enabledTime: number | null = null;
        let enabledData = getEnabledData(window.log);
        if (enabledData) {
          for (let i = 0; i < enabledData.timestamps.length; i++) {
            if (enabledData.values[i]) {
              enabledTime = enabledData.timestamps[i];
              break;
            }
          }
        }
        if (enabledTime !== null) {
          this.playing = false;
          this.locked = true;
          this.lockedStartLog = enabledTime - (data.matchStartFrame - 1) / this.fps!;
        }
      }
      this.matchStartFrame = data.matchStartFrame;
    } else {
      // Start to load new source, reset controls
      this.locked = false;
      this.playing = false;
    }
    this.updateButtons();
  }

  getCommand(): unknown {
    // Stream mode - return frame URL based on current render time
    if (this.isStreamMode && this.streamCapture) {
      const renderTime = window.selection.getRenderTime();
      if (renderTime !== null) {
        const frame = this.streamCapture.getFrameAtTime(renderTime);
        if (frame) {
          return frame.imageUrl;
        }
      }
      return "";
    }

    // File-based video mode
    if (this.hasData()) {
      // Set time if locked
      let renderTime = window.selection.getRenderTime();
      if (this.locked && renderTime !== null) {
        this.VIDEO_TIMELINE_INPUT.value = (Math.floor((renderTime - this.lockedStartLog) * this.fps!) + 1).toString();
      }

      // Set time if playing
      if (this.playing) {
        this.VIDEO_TIMELINE_INPUT.value = (
          (new Date().getTime() / 1000 - this.playStartReal) * this.fps! +
          this.playStartFrame
        ).toString();
      }

      // Find filename
      let frame = Number(this.VIDEO_TIMELINE_INPUT.value);
      if (frame >= 1 && frame <= this.completedFrames!) {
        let filename = frame.toString();
        while (filename.length < 8) filename = "0" + filename;
        return this.imgFolder + filename + ".jpg";
      }
    }
    return "";
  }

  saveState(): unknown {
    if (this.isStreamMode) {
      const config: StreamSourceConfig = {
        type: this.streamFieldKey ? "field" : "manual",
        url: this.streamUrl || undefined,
        fieldKey: this.streamFieldKey || undefined
      };
      return {
        mode: "stream",
        streamConfig: config
      };
    }
    return null;
  }

  restoreState(state: unknown): void {
    if (state && typeof state === "object" && "mode" in state) {
      const s = state as { mode: string; streamConfig?: StreamSourceConfig };
      if (s.mode === "stream" && s.streamConfig) {
        if (s.streamConfig.type === "field" && s.streamConfig.fieldKey) {
          this.streamFieldKey = s.streamConfig.fieldKey;
          // Will attempt to get URL from field on next refresh
        } else if (s.streamConfig.url) {
          this.streamFieldKey = null;
          this.startStreamCapture(s.streamConfig.url);
        }
      }
    }
  }

  refresh(): void {
    // Check if field value changed (for field-connected streams)
    if (this.isStreamMode && this.streamFieldKey) {
      const renderTime = window.selection.getRenderTime();
      if (renderTime !== null) {
        const value = getOrDefault(window.log, this.streamFieldKey, LoggableType.String, renderTime, "");
        if (value && value !== this.lastFieldValue && isValidStreamUrl(value)) {
          this.lastFieldValue = value;
          if (value !== this.streamUrl) {
            this.startStreamCapture(value);
          }
        }
      }
    }
  }

  newAssets(): void {}

  getActiveFields(): string[] {
    if (this.streamFieldKey) {
      return [this.streamFieldKey];
    }
    return [];
  }

  showTimeline(): boolean {
    return true;
  }
}
