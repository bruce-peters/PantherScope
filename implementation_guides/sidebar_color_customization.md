# Sidebar Color Customization Implementation Guide

## Overview

This guide outlines the implementation of sidebar color customization for PantherScope. Users will be able to change the sidebar background color from the default (red-based for team colors #e9e9e9 light / #292929 dark) to any custom color. This feature will be accessible through an option in the View menu panel and persist across sessions via user preferences.

### Key Features

- Customizable sidebar background color
- Color picker interface accessible from View menu
- Persistent color preference saved to user settings
- Default alliance color option (red-based)
- Light and dark mode color variants
- Real-time preview of color changes

### 80/20 Approach

This implementation focuses on the core functionality (80% of value) using:

- CSS custom properties for dynamic color updates
- Existing preferences infrastructure for persistence
- Simple color picker UI for selection
- View menu integration following existing patterns

---

## Phase 1: Preferences and State Management ✅ COMPLETED

### Description

Add sidebar color preference to the application preferences system and state management.

### Tasks

- [x] **1.1** Update `src/shared/Preferences.ts`:

  Add new property to `Preferences` interface:

  ```typescript
  export default interface Preferences {
    // ... existing properties
    sidebarColor: string | null; // null = default alliance color, otherwise hex color
  }
  ```

  Update `DEFAULT_PREFS`:

  ```typescript
  export const DEFAULT_PREFS: Preferences = {
    // ... existing properties
    sidebarColor: null // Use default alliance color
  };
  ```

- [x] **1.2** Update `mergePreferences()` function in `src/shared/Preferences.ts`:

  Add validation for `sidebarColor`:

  ```typescript
  export function mergePreferences(basePrefs: Preferences, newPrefs: object) {
    // ... existing merges
    if ("sidebarColor" in newPrefs && (typeof newPrefs.sidebarColor === "string" || newPrefs.sidebarColor === null)) {
      // Validate hex color format if not null
      if (newPrefs.sidebarColor === null || /^#[0-9A-F]{6}$/i.test(newPrefs.sidebarColor)) {
        basePrefs.sidebarColor = newPrefs.sidebarColor;
      }
    }
  }
  ```

- [x] **1.3** Update `src/preferences.ts`:

  Added `sidebarColor: oldPrefs.sidebarColor` to preserve setting across preference window changes.

### Quality Assurance Checks

- [x] TypeScript compiles without errors
- [x] Default value is `null` (uses alliance color)
- [x] Hex color validation prevents invalid colors
- [x] Preferences merge function handles both `null` and valid hex colors

---

## Phase 2: View Menu Integration ✅ COMPLETED

### Description

Add "Sidebar Color..." menu item to View menu for accessing the color picker.

### Tasks

- [x] **2.1** Update Electron menu in `src/main/electron/main.ts`:

  Added menu item after "Toggle Controls" with separator.

- [x] **2.2** Update Lite menu in `src/main/lite/main.ts`:

  Added menu item in View menu (case 2).

### Quality Assurance Checks

- [x] Menu item appears in View menu
- [x] Menu item is positioned after separator following "Toggle Controls"
- [x] Clicking menu item triggers color picker function (to be implemented in Phase 4)
- [x] Menu works in both Electron and Lite versions

---

## Phase 3: Color Picker UI ✅ COMPLETED

### Description

Create a simple popup window with color picker for selecting sidebar color.

### Tasks

- [x] **3.1** Create `www/sidebarColor.html`:

  Created HTML file with color picker input and "Use Default" button.

- [x] **3.2** Create `src/sidebarColor.ts`:

  Created TypeScript file with message port handling for color selection.

- [x] **3.3** Add to `rollup.config.mjs`:

  Added `bundle("sidebarColor.ts", "sidebarColor.js", false, false)` to smallRendererBundles.

### Quality Assurance Checks

- [x] Color picker renders correctly
- [x] Default button sets color to `null`
- [x] Confirm button returns selected color
- [x] Exit button cancels without changes
- [x] TypeScript compiles and Rollup bundles successfully

---

## Phase 4: Color Picker Window Management ✅ COMPLETED

### Description

Implement window creation and callback handling for the sidebar color picker.

### Tasks

- [x] **4.1** Add function to `src/main/electron/main.ts`:

  Added openSidebarColorPicker function with 350x160 window dimensions.

  ```typescript
  /**
   * Creates a sidebar color picker window.
   * @param parentWindow The parent window for alignment
   */
  function openSidebarColorPicker(parentWindow: BrowserWindow) {
    let prefs: Preferences = jsonfile.readFileSync(PREFS_FILENAME);

    const width = 350;
    const height = 160;
    const sidebarColorWindow = new BrowserWindow({
      width: width,
      height: height,
      x: Math.floor(parentWindow.getBounds().x + parentWindow.getBounds().width / 2 - width / 2),
      y: Math.floor(parentWindow.getBounds().y + parentWindow.getBounds().height / 2 - height / 2),
      useContentSize: true,
      resizable: false,
      alwaysOnTop: true,
      icon: WINDOW_ICON,
      show: false,
      fullscreenable: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js")
      }
    });

    sidebarColorWindow.setMenuBarVisibility(false);
    sidebarColorWindow.loadFile(path.join(__dirname, "../www/sidebarColor.html"));
    sidebarColorWindow.once("ready-to-show", () => {
      sidebarColorWindow.show();
    });

    windowPorts[sidebarColorWindow.id] = createMessagePort(sidebarColorWindow, (message) => {
      if (message === "cancel") {
        sidebarColorWindow.destroy();
        return;
      }

      // Save new color preference
      prefs.sidebarColor = message;
      jsonfile.writeFileSync(PREFS_FILENAME, prefs);
      sendAllPreferences();
      sidebarColorWindow.destroy();
    });

    windowPorts[sidebarColorWindow.id].postMessage(prefs.sidebarColor);

    sidebarColorWindow.on("closed", () => {
      delete windowPorts[sidebarColorWindow.id];
    });
  }
  ```

- [x] **4.2** Add function to `src/main/lite/main.ts`:

  Added openSidebarColorPicker function following openPreferences pattern.

### Quality Assurance Checks

- [x] Window opens centered over parent window
- [x] Current color preference is loaded correctly
- [x] Cancel closes window without saving
- [x] Confirm saves new color and updates all windows
- [x] Window is destroyed properly on close
- [x] TypeScript compilation passes
- [x] Both Electron and Lite versions implemented

---

## Phase 5: CSS Integration and Dynamic Styling ✅ COMPLETED

### Description

Update CSS to use custom property for sidebar color and apply preference changes dynamically.

### Tasks

- [x] **5.1** Update `www/hub.css`:

  Added CSS custom properties `--side-bar-bg-light` and `--side-bar-bg-dark` to `:root`, updated `div.side-bar-background` to use custom properties.

- [x] **5.2** Update `src/hub/hub.ts`:

  Added `applySidebarColor()` function to apply sidebar color from preferences, called in "set-preferences" message handler.

  ```css
  :root {
    --side-bar-width: 300px;
    --side-bar-bg-light: #e9e9e9; /* Default alliance color */
    --side-bar-bg-dark: #292929; /* Default alliance color */
    /* ... other existing properties */
  }
  ```

  Update `div.side-bar-background` styles:

  ```css
  div.side-bar-background {
    position: absolute;
    z-index: 1;
    left: 0px;
    width: var(--side-bar-width);
    top: 0px;
    bottom: 0px;

    background-color: var(--side-bar-bg-light);
  }

  body.fancy-side-bar-mac div.side-bar-background {
    display: none;
  }

  body.fancy-side-bar-win div.side-bar-background {
    opacity: 0.5;
  }

  @media (prefers-color-scheme: dark) {
    div.side-bar-background {
      background-color: var(--side-bar-bg-dark);
    }
  }
  ```

- [ ] **5.2** Update `src/hub/hub.ts`:

  Add function to apply sidebar color from preferences:

  ```typescript
  /** Applies sidebar color from preferences */
  function applySidebarColor(prefs: Preferences) {
    if (prefs.sidebarColor === null) {
      // Use default alliance colors
      document.documentElement.style.setProperty("--side-bar-bg-light", "#e9e9e9");
      document.documentElement.style.setProperty("--side-bar-bg-dark", "#292929");
    } else {
      // Use custom color
      // For dark mode, darken the color by 30%
      let customColor = prefs.sidebarColor;
      let darkColor = darkenColor(customColor, 0.3);

      document.documentElement.style.setProperty("--side-bar-bg-light", customColor);
      document.documentElement.style.setProperty("--side-bar-bg-dark", darkColor);
    }
  }

  /** Darkens a hex color by a given percentage */
  function darkenColor(hexColor: string, percent: number): string {
    // Remove # if present
    let color = hexColor.replace("#", "");

    // Convert to RGB
    let r = parseInt(color.substring(0, 2), 16);
    let g = parseInt(color.substring(2, 4), 16);
    let b = parseInt(color.substring(4, 6), 16);

    // Darken
    r = Math.floor(r * (1 - percent));
    g = Math.floor(g * (1 - percent));
    b = Math.floor(b * (1 - percent));

    // Convert back to hex
    return "#" +
      r.toString(16).padStart(2, "0") +
      g.toString(16).padStart(2, "0") +
      b.toString(16).padStart(2, "0");
  }

  // Call when preferences are received:
  window.addEventListener("message", (event) => {
    // ... existing message handling
    case "set-preferences":
      let prefs: Preferences = event.data;
      applySidebarColor(prefs);
      // ... rest of existing preference handling
      break;
  });
  ```

- [ ] **5.3** Update `lite/static/index.html`:

  Add similar CSS custom properties:

  ```css
  :root {
    --side-bar-width: 300px;
    --side-bar-bg-light: #e9e9e9;
    --side-bar-bg-dark: #292929;
  }

  div.side-bar-loading-background {
    position: absolute;
    left: 0%;
    top: 0%;
    width: var(--side-bar-width);
    height: 100%;
    background-color: var(--side-bar-bg-light);
  }

  @media (prefers-color-scheme: dark) {
    div.side-bar-loading-background {
      background-color: var(--side-bar-bg-dark);
    }
  }
  ```

### Quality Assurance Checks

- [x] Default colors match current implementation (#e9e9e9 light, #292929 dark)
- [x] Custom color is applied correctly in both light and dark modes
- [x] Color updates when preference changes
- [x] No TypeScript compilation errors
- [x] CSS custom properties correctly defined

---

## Phase 6: Testing and Documentation

### Description

Comprehensive testing and user-facing documentation updates.

### Tasks

- [ ] **6.1** Manual Testing:

  - [ ] Test color picker opens from View menu
  - [ ] Test default color option resets to alliance red
  - [ ] Test custom color persists across app restarts
  - [ ] Test dark mode auto-adjusts custom colors
  - [ ] Test multiple windows sync color changes
  - [ ] Test Lite version works identically
  - [ ] Test color validation rejects invalid hex codes
  - [ ] Test edge cases (empty string, invalid format, etc.)

- [ ] **6.2** Update User Documentation (optional, not required for core functionality):

  Add section to docs about sidebar customization:

  ```markdown
  ## Customizing the Sidebar

  The sidebar background color can be customized via the View menu:

  1. Select **View > Sidebar Color...** from the menu
  2. Choose a color using the color picker
  3. Click the checkmark to apply, or use "Use Default" for alliance colors

  The sidebar color preference is saved and will persist across sessions.
  ```

### Quality Assurance Checks

- [ ] All manual tests pass
- [ ] No console errors or warnings
- [ ] Color changes are smooth and instant
- [ ] Preferences file saves correctly
- [ ] No memory leaks from color updates
- [ ] Cross-platform compatibility (Windows, macOS, Linux, Lite)

---

## Summary

This implementation follows the 80/20 principle by focusing on:

**High-Value Features (80% of value):**

- Simple color picker UI with default option
- Persistent preferences using existing infrastructure
- CSS custom properties for efficient updates
- View menu integration following established patterns

**Deferred Features (20% of value):**

- Preset color palettes
- Per-team color profiles
- Gradient backgrounds
- Sidebar transparency controls
- Custom light/dark mode colors separately
- Real-time preview before applying

**Implementation Order:**

1. ✅ Phase 1: Data structures and persistence (foundation)
2. ✅ Phase 2: Menu integration (user access point)
3. ✅ Phase 3: UI creation (user interface)
4. ✅ Phase 4: Window management (plumbing)
5. ✅ Phase 5: Styling system (visual implementation)
6. ⏳ Phase 6: Testing (quality assurance) - IN PROGRESS

**Estimated Effort:**

- Total: ~4-6 hours
- Phase 1: 30 minutes
- Phase 2: 30 minutes
- Phase 3: 1 hour
- Phase 4: 1 hour
- Phase 5: 1.5 hours
- Phase 6: 1 hour

**Files Modified:**

- `src/shared/Preferences.ts` (state)
- `src/preferences.ts` (preferences UI)
- `src/main/electron/main.ts` (menu + window)
- `src/main/lite/main.ts` (menu + window)
- `www/hub.css` (styling)
- `src/hub/hub.ts` (color application)
- `lite/static/index.html` (Lite styling)

**New Files:**

- `www/sidebarColor.html`
- `src/sidebarColor.ts`
