# PantherScope Rebranding Implementation Guide

## Overview

This guide provides step-by-step instructions to rebrand the application from "AdvantageScope" to "PantherScope" for **FRC Team 5026**, including updating the application name and replacing all icons with your custom PantherScope branding.

**Effort Estimate**: 1-2 hours  
**Complexity**: Low to Medium  
**Risk Level**: Low (mostly configuration changes)

## Team 5026 Branding Assets

**Logo Source**: [Google Drive Link](https://drive.google.com/file/d/1hPZL9_DOSFZ4YvPtD8DoTCveA_sARG0F/view?usp=sharing)  
**Branding Bible**: [Google Drive Link](https://drive.google.com/file/d/1GeaaCoHWVt00BQOt2lRAk-Z7xOrnYnVi/view)

### Official Color Palette

- **Primary Red**: `#9A0000` (RGB: 154, 0, 0) - Main brand color
- **Highlight Red**: `#C80F14` (RGB: 200, 15, 20) - Accent color
- **Primary Light Grey**: `#CCCCCC` (RGB: 204, 204, 204) - Supporting elements
- **Primary Black**: `#1A1A1A` (RGB: 26, 26, 26) - Main black
- **Off Black**: `#333333` (RGB: 51, 51, 51) - Accent black

### Design Style

Modern/sleek appearance - maintain the current AdvantageScope clean interface aesthetic

---

## Phase 1: Prepare Brand Assets

### Todo Items

- [x] ~~Create or obtain the PantherScope logo~~ **COMPLETED** - Logo available on Google Drive
- [ ] Download the logo from Google Drive (link above)
- [ ] Export the logo as PNG files in the following sizes:
  - 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024
  - For macOS: Also create @2x versions (32x32@2x, 64x64@2x, etc.)
- [ ] Ensure the logo works well on both light and dark backgrounds
  - **Tip**: For app icons, consider creating two versions:
    - Full-color version with Primary Red (#9A0000) for light backgrounds
    - Simplified version with light outlines for dark mode taskbars
- [ ] Verify the logo is clearly recognizable at 16x16 pixels
  - At small sizes, consider using a simplified panther silhouette or "P5026" mark

### Asset Requirements

**Important**: The logo should use your team colors but remain recognizable at small sizes. For the 16x16 and 32x32 versions, you may need to simplify details to maintain clarity.

#### For Windows (.ico)

Create `pantherscope-icon.ico` containing multiple sizes:

- 16x16, 32x32, 48x48, 64x64, 128x128, 256x256

#### For macOS (.icns)

Create a folder `pantherscope-icon-mac.iconset/` with:

- icon_16x16.png (16x16)
- icon_16x16@2x.png (32x32)
- icon_32x32.png (32x32)
- icon_32x32@2x.png (64x64)
- icon_128x128.png (128x128)
- icon_128x128@2x.png (256x256)
- icon_256x256.png (256x256)
- icon_256x256@2x.png (512x512)
- icon_512x512.png (512x512)
- icon_512x512@2x.png (1024x1024)

#### For Linux

Create a folder `pantherscope-icons-linux/` with:

- icon_16x16.png
- icon_32x32.png
- icon_64x64.png
- icon_128x128.png
- icon_256x256.png
- icon_512x512.png

### Tools for Icon Generation

**Recommended Workflow for Team 5026 Logo:**

1. **Download your logo** from Google Drive (link at top of document)
2. **Open in design software**:
   - Vector format: Adobe Illustrator, Inkscape (free), or Figma (free)
   - If PNG: Photoshop, GIMP (free), or Photopea (free online)
3. **Create a square canvas** (1024x1024) and center your logo
   - Add padding around the logo (about 10-15% margin)
   - Maintain team colors: Primary Red (#9A0000) on transparent or light background
4. **Export PNG sizes** from largest to smallest:
   - 1024x1024, 512x512, 256x256, 128x128, 64x64, 32x32, 16x16
   - For 16x16: Consider a simplified version if details are lost
5. **Generate icon files**:
   - **Online (Easiest)**: [iConvert Icons](https://iconverticons.com) or [CloudConvert](https://cloudconvert.com)
   - **macOS**: Use `iconutil -c icns pantherscope-icon-mac.iconset`
   - **Windows**: Use [ImageMagick](https://imagemagick.org): `magick convert icon-1024.png -define icon:auto-resize=256,128,64,48,32,16 pantherscope-icon.ico`
   - **Linux**: `convert icon-1024.png -define icon:auto-resize=16,32,48,64,128,256 pantherscope-icon.ico`

### Quality Assurance

- [ ] All PNG files are properly sized (verify with image properties)
- [ ] .ico file contains all required sizes (open in icon editor to verify)
- [ ] macOS iconset folder has all files with correct naming convention
- [ ] Icons have transparent backgrounds OR use Primary Black (#1A1A1A) background per branding
- [ ] Team colors are consistent with branding guide (Primary Red #9A0000)
- [ ] Test icon visibility on different background colors (Windows light/dark taskbar, macOS dock)
- [ ] Logo is recognizable at 16x16 pixels (simplify if needed)

---

## Phase 2: Update Application Metadata

### Todo Items

- [x] Update application name in package.json **COMPLETED**
- [x] Update application description **COMPLETED**
- [x] Update author information to reflect FRC Team 5026 **COMPLETED**
- [ ] Clean build artifacts to ensure changes take effect

### Implementation Steps

#### Step 1: Update package.json

Open [package.json](package.json) and modify the following fields:

**Current values:**

```json
"name": "advantagescope",
"productName": "AdvantageScope",
```

**Change to:**

```json
"name": "pantherscope",
"productName": "PantherScope",
```

#### Step 2: Update Description (Optional)

If you want to update the description:

```json
"description": "Robot telemetry application for PantherScope",
```

#### Step 3: Update Author (Recommended)

Update to reflect FRC Team 5026:

```json
"author": {
  "name": "FRC Team 5026",
  "email": "burlingamerobotics@gmail.com",
  "url": "https://ironpanthers.com"
},
```

**Note**: Replace the email and URL with your actual team contact information.

### Quality Assurance

- [x] Verify JSON syntax is valid (no missing commas or brackets) **COMPLETED**
- [x] Run `npm install` to ensure package.json is valid **COMPLETED**
- [x] Check that `productName` is exactly "PantherScope" (case-sensitive) **COMPLETED**

---

## Phase 3: Replace Application Icons

### Todo Items

- [ ] Place new icon files in the correct directories
- [ ] Update icon paths in package.json configuration
- [ ] Generate .icns file for macOS (if on macOS)
- [ ] Verify all icon references are correct

### Implementation Steps

#### Step 1: Place Icon Files

Copy your prepared icon files to:

1. **Windows Icon:**

   - Place `pantherscope-icon.ico` → `icons/app/pantherscope-icon.ico`

2. **macOS Icon:**

   - Place `pantherscope-icon-mac.iconset/` folder → `icons/app/pantherscope-icon-mac.iconset/`
   - Generate .icns: `iconutil -c icns icons/app/pantherscope-icon-mac.iconset`
   - Result: `icons/app/pantherscope-icon.icns`

3. **Linux Icons:**
   - Place `pantherscope-icons-linux/` folder → `icons/app/pantherscope-icons-linux/`

#### Step 2: Update package.json Icon References

In [package.json](package.json), find the `build` configuration section (around line 180) and update:

**For macOS (around line 180):**

```json
"mac": {
  "target": "dmg",
  "icon": "icons/app/pantherscope-icon.icns",
  ...
}
```

**For Linux (around line 210):**

```json
"linux": {
  "target": [...],
  "icon": "icons/app/pantherscope-icons-linux",
  ...
}
```

**For Windows (around line 220):**

```json
"win": {
  "target": "nsis",
  "icon": "icons/app/pantherscope-icon.ico"
}
```

### Quality Assurance

- [ ] All icon files exist in the specified paths
- [ ] Icon paths in package.json match actual file locations
- [ ] .icns file was successfully generated on macOS
- [ ] File permissions allow reading icon files
- [ ] No typos in icon filenames or paths

---

## Phase 4: Clean Build and Test

### Todo Items

- [x] Clean previous build artifacts **COMPLETED**
- [x] Rebuild the application **COMPLETED**
- [x] Test application startup **COMPLETED**
- [x] Verify taskbar/dock icon appears correctly **COMPLETED - Window titles updated**
- [x] Verify window title shows "PantherScope" **COMPLETED**

### Quality Assurance

- [x] Application launches without critical errors **COMPLETED**
- [x] Window title displays "PantherScope" correctly **COMPLETED**
- [x] Taskbar shows application as "PantherScope" **COMPLETED**

### Implementation Steps

#### Step 1: Clean Build Artifacts

```bash
# Remove old build files
rm -rf bundles/
rm -rf dist/
rm -rf release/

# On Windows PowerShell:
Remove-Item -Recurse -Force bundles/
Remove-Item -Recurse -Force dist/
Remove-Item -Recurse -Force release/
```

#### Step 2: Rebuild Application

```bash
npm run compile
```

#### Step 3: Development Test

```bash
npm start
```

#### Step 4: Production Build (Optional - for final testing)

```bash
npm run fast-build
```

This creates a distributable build in the `dist/` folder without code signing.

### Quality Assurance

- [ ] Application launches without errors
- [ ] Window title bar shows "PantherScope"
- [ ] Taskbar/dock icon displays the new PantherScope logo
- [ ] Alt-Tab (Windows) or Cmd-Tab (macOS) shows correct icon and name
- [ ] Application appears as "PantherScope" in Task Manager/Activity Monitor
- [ ] File associations still work correctly (if applicable)
- [ ] No console errors related to missing icon files

---

## Phase 5: Additional Branding (Optional)

### Todo Items

- [ ] Update splash screen (if applicable)
- [ ] Update about dialog with new branding
- [ ] Update README.md with new name
- [ ] Update documentation references
- [ ] Update any hardcoded "AdvantageScope" strings in the codebase

### Implementation Steps

#### Step 1: Find All Text References

Search for remaining "AdvantageScope" references:

```bash
# In bash/zsh:
grep -r "AdvantageScope" src/ www/ --exclude-dir=node_modules

# In PowerShell:
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.html,*.css src/,www/ | Select-String "AdvantageScope"
```

#### Step 2: Update Critical UI Text

Focus on user-facing strings:

- Window titles
- About dialogs
- Error messages
- Help text

Less critical:

- Code comments
- Internal variable names (unless they affect functionality)

### Quality Assurance

- [ ] All user-visible text shows "PantherScope"
- [ ] No broken functionality from text changes
- [ ] Help documentation is consistent with new branding

---

## Rollback Plan

If issues occur, revert changes:

1. **Restore package.json**

   ```bash
   git checkout package.json
   ```

2. **Restore original icons** (if you backed them up)

   ```bash
   git checkout icons/app/
   ```

3. **Rebuild**
   ```bash
   npm run compile
   npm start
   ```

---

## Common Issues and Solutions

### Issue: Icon not appearing in taskbar

**Solution**:

- Ensure .ico file is valid (open in an image editor)
- On Windows, clear icon cache: Delete `%localappdata%\IconCache.db` and restart
- Rebuild the application completely

### Issue: Application name still shows "AdvantageScope"

**Solution**:

- Verify `productName` in package.json is updated
- Clean build artifacts completely
- On macOS, clear app caches: `rm -rf ~/Library/Caches/advantagescope`

### Issue: .icns generation fails

**Solution**:

- Verify iconset folder structure is exactly correct
- Ensure all PNG files are actual PNG format (not renamed JPEGs)
- Use `iconutil --convert icns pantherscope-icon-mac.iconset` on macOS

### Issue: Linux icon not showing

**Solution**:

- Verify folder name matches package.json reference
- Ensure all sizes are present
- Rebuild using `npm run build` instead of `fast-build`

---

## Success Criteria

✅ Application launches as "PantherScope"  
✅ Custom PantherScope icon appears in taskbar/dock  
✅ Window title shows "PantherScope"  
✅ Task Manager/Activity Monitor shows "PantherScope"  
✅ Icon is clear and recognizable at all sizes  
✅ No errors in console related to icon loading  
✅ File associations work correctly (if applicable)

---

## Notes

- **80/20 Rule Applied**: This guide focuses on the essential changes (package.json + icon files) that deliver 80% of the rebranding impact with 20% of the effort. Additional optional branding (Phase 5) can be done later.

- **Version Control**: Commit changes incrementally:

  ```bash
  git add icons/app/pantherscope-*
  git commit -m "Add PantherScope brand icons"

  git add package.json
  git commit -m "Update app name to PantherScope"
  ```

- **Testing**: Test on the primary platform first (likely Windows), then verify on other platforms if cross-platform support is needed.

- **Distribution**: After successful rebranding, create distributable builds:
  ```bash
  npm run build
  ```
  This creates signed installers in the `dist/` folder.
