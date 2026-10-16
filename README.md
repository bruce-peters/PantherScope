# PantherScope

PantherScope is a fork of [AdvantageScope](https://github.com/Mechanical-Advantage/AdvantageScope), Team 6328's robot telemetry and log-viewing app, customized by Bruce Peters for FRC Team 5026 (Iron Panthers). It keeps all of AdvantageScope and adds live camera-stream logging, field-of-view cones in the 3D field, a configurable sidebar color, and Iron Panthers branding.

## What PantherScope adds

| Feature                  | Where                                            | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MJPEG stream logging** | Video tab, new stream (Wi-Fi icon) source button | Connects to an MJPEG camera stream over HTTP (e.g. a Limelight or PhotonVision camera), stamps every frame with the current live-log time (the timeline time when not connected), and plays the frames back in sync with the timeline. Enter the URL in a dialog (pre-filled from the clipboard when it holds an `http(s)` URL), or drag a String field that contains the URL from the sidebar onto the video area. Frames are kept in memory only (up to 100,000 per tab), and each Video tab holds one stream. Code: `src/hub/services/MJPEGStreamCapture.ts`, `src/hub/controllers/VideoController.ts`, `www/streamUrl.html`. |
| **FOV cones**            | 3D Field tab, new "FOV Cone" object type         | Draws a camera's field of view as a square pyramid from any Pose2d/Pose3d/Transform2d/Transform3d field (single or array). Options: color, wireframe or filled style, and depth of 1, 2, 3 or 5 m. The FOV angle defaults to 60° and is read from a `<field>/fov` number child when one exists (clamped to 10–170°). Code: `src/shared/renderers/field3d/objectManagers/FovConeManager.ts`.                                                                                                                                                                                                                                      |
| **Sidebar color**        | _View → Sidebar Color..._                        | Color picker for the sidebar background, saved in preferences. The default is the Iron Panthers red `#af2437`. Code: `src/sidebarColor.ts`, `www/sidebarColor.html`.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Branding**             | app-wide                                         | App name and window titles read "PantherScope", there is a Windows app icon (`icons/app/pantherscope-icon.ico`), and the default robot address is `10.50.26.2` (team 5026).                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

Design notes for each feature are in [`implementation_guides/`](implementation_guides/).

## Run it

Tested on Linux with Node.js 22.22 / npm 10.9. Upstream's general developer guide is in [CONTRIBUTING.md](CONTRIBUTING.md).

### Prerequisites

- **Node.js** (LTS) and npm
- **git**
- **Emscripten 4.0.12**, only needed to open WPILOG/RLOG _files_ (their parsers are compiled to WebAssembly). Live connections and the UI work without it. Install it with [emsdk](https://emscripten.org/docs/getting_started/downloads.html): `./emsdk install 4.0.12 && ./emsdk activate 4.0.12 && source ./emsdk_env.sh`.

### Install, compile, start

```bash
git clone https://github.com/bruce-peters/PantherScope.git
cd PantherScope
npm ci              # installs deps; postinstall also downloads Owlet, Tesseract data, bundled assets
npm run compile     # bundles the TypeScript with Rolldown into bundles/
npm run wasm:compile   # optional: WPILOG/RLOG file support, needs emcc 4.0.12 on PATH
npm start           # launches the Electron app
```

Notes:

- `npm ci` runs a postinstall step that fetches the `yt-dlp` binary through the GitHub API. If that fails with `API rate limit exceeded` or `Bad credentials`, rerun with `YOUTUBE_DL_SKIP_DOWNLOAD=true npm ci` (only YouTube match-video download needs it), or set a valid `GITHUB_TOKEN`.
- On Linux as root or inside a container, Electron needs `npm start -- --no-sandbox`.
- An unpackaged `npm start` opens Chrome DevTools next to the main window. This is upstream behavior.
- For development, `npm run watch` rebuilds bundles on change; restart `npm start` (or reload the window) to pick them up. _(Not run here.)_
- Installers: `npm run build` (or `npm run fast-build` for an unpacked app) also builds the docs and runs electron-builder. See [CONTRIBUTING.md](CONTRIBUTING.md#building-for-multiple-platforms). _(Not run here.)_

### Try the PantherScope features

- **Stream logging:** connect to a robot or simulator (_File → Connect to Robot / Simulator_), open a Video tab, click the Wi-Fi source button, and enter the camera's MJPEG URL (e.g. `http://10.50.26.11:5800/stream.mjpg`).
- **FOV cone:** in a 3D Field tab, drag a Pose3d field (e.g. a camera pose) into the object list and change its type to _FOV Cone_. To set the angle, log a number at `<that field>/fov`.
- **Sidebar color:** _View → Sidebar Color..._, pick a color, click ✓.

## Project structure (PantherScope changes)

```
src/hub/services/MJPEGStreamCapture.ts      MJPEG multipart parser + in-memory frame store
src/hub/controllers/VideoController.ts      stream source, drag-and-drop, timeline sync
src/main/electron/VideoProcessor.ts         "Stream" video source -> URL dialog
src/streamUrl.ts, www/streamUrl.html        stream URL dialog
src/shared/StreamConfig.ts, StreamFrame.ts  stream types
src/shared/renderers/field3d/objectManagers/FovConeManager.ts   FOV cone geometry
src/hub/controllers/Field3dController*.ts   FOV cone source-list type and options
src/sidebarColor.ts, www/sidebarColor.html  sidebar color dialog (pref: sidebarColor)
implementation_guides/                      design notes for each feature
```

Everything else is upstream AdvantageScope. Its own layout is described in [`.github/copilot-instructions.md`](.github/copilot-instructions.md).

## License and credit

PantherScope is built on AdvantageScope by Littleton Robotics (FRC 6328) and is distributed under the same BSD license ([LICENSE](LICENSE)). Report PantherScope issues on this fork, not upstream.

---

## About AdvantageScope (upstream)

![AdvantageScope](/docs/docs/img/banner.png)

[![Build](https://github.com/Mechanical-Advantage/AdvantageScope/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/Mechanical-Advantage/AdvantageScope/actions/workflows/build.yml)

AdvantageScope is a robot diagnostics, log review/analysis, and data visualization application for FIRST teams developed by Team 6328. It reads logs in WPILOG, DS log, Hoot (CTRE), REVLOG (REV Robotics), Road Runner, CSV, and RLOG file formats, plus live robot data viewing using NT4, Phoenix, RLOG, or FTC Dashboard streaming. AdvantageScope can be used with any WPILib project, but is also optimized for use with our [AdvantageKit](https://docs.advantagekit.org) log replay framework. Note that **AdvantageKit is not required to use AdvantageScope**.

AdvantageScope includes the following tools:

- A wide selection of flexible graphs and charts
- 2D and 3D field visualizations of pose data, with customizable CAD-based robots
- Synchronized video playback from a separately loaded match video
- Joystick visualization, showing driver actions on customizable controller representations
- Swerve drive module vector displays
- Console message review
- Log statistics analysis
- Flexible export options, with support for CSV and WPILOG

**View the [online documentation](https://docs.advantagescope.org) or find it offline by clicking the 📖 icon in the tab bar.**

Feedback, feature requests, and bug reports are welcome on the [issues page](https://github.com/Mechanical-Advantage/AdvantageScope/issues). See the [contribution page](CONTRIBUTING.md) for more information on contributing to AdvantageScope. For non-public inquiries, please send a message to software@team6328.org.

![Example screenshot](/docs/docs/img/screenshot-light.png)
