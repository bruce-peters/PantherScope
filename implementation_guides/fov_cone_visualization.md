# FOV Cone Visualization for Pose3d in 3D Field Renderer - Implementation Guide

## Overview

This guide outlines the implementation of FOV (Field of View) cone visualization for Pose3d objects in the 3D field renderer. Users will be able to visualize any Pose3d as an FOV cone representing a camera's field of view, with customizable FOV angles and rendering styles.

### Key Features

- FOV cone visualization option for Pose3d log items
- Default 60-degree FOV with customizable angle via number field drag
- Two rendering styles: wireframe (4 corner lines) or filled transparent faces
- Configurable through existing source list option system
- Reuses existing object manager architecture

### 80/20 Approach

This implementation focuses on the core functionality using:
- Existing THREE.js geometry primitives (BufferGeometry/LineSegments or Mesh with transparency)
- Source list configuration system for type options
- Object manager pattern from existing 3D objects (ConeManager, AxesManager)
- Simple FOV calculation using pose rotation and angle
- Minimal UI changes leveraging existing drag-and-drop functionality

---

## Phase 1: Type System and Configuration ✅

### Description

Add new FOV cone type to the Field3d configuration and TypeScript type system. This phase establishes the data structures needed for FOV cone objects.

### Tasks

- [ ] **1.1** Add FOV cone object type to `src/shared/renderers/Field3dRenderer.ts`:
  
  Add to `Field3dRendererCommand_AnyObj` union type (around line 139):
  ```typescript
  export type Field3dRendererCommand_AnyObj =
    | Field3dRendererCommand_RobotObj
    | Field3dRendererCommand_GhostObj
    | Field3dRendererCommand_GamePieceObj
    | Field3dRendererCommand_TrajectoryObj
    | Field3dRendererCommand_HeatmapObj
    | Field3dRendererCommand_AprilTagObj
    | Field3dRendererCommand_AprilTagBuiltInObj
    | Field3dRendererCommand_AxesObj
    | Field3dRendererCommand_ConeObj
    | Field3dRendererCommand_FovConeObj;  // NEW
  ```
  
  Add new type definition (around line 210):
  ```typescript
  export type Field3dRendererCommand_FovConeObj = {
    type: "fovCone";
    color: string;
    style: "wireframe" | "filled";
    fov: number; // FOV angle in degrees
    depth: number; // Visualization depth/distance
    poses: AnnotatedPose3d[];
  };
  ```

- [ ] **1.2** Add FOV cone type configuration to `src/hub/controllers/Field3dController_Config.ts`:
  
  Add after the "cone" type (around line 700):
  ```typescript
  {
    key: "fovCone",
    display: "FOV Cone",
    symbol: "camera.viewfinder",
    showInTypeName: true,
    color: "color",
    sourceTypes: [
      "Pose2d",
      "Pose3d",
      "Pose2d[]",
      "Pose3d[]",
      "Transform2d",
      "Transform3d",
      "Transform2d[]",
      "Transform3d[]"
    ],
    showDocs: true,
    options: [
      {
        key: "color",
        display: "Color",
        showInTypeName: false,
        values: NeonColors
      },
      {
        key: "style",
        display: "Style",
        showInTypeName: true,
        values: [
          { key: "wireframe", display: "Wireframe" },
          { key: "filled", display: "Filled" }
        ]
      },
      {
        key: "depth",
        display: "Depth",
        showInTypeName: false,
        values: [
          { key: "1", display: "1m" },
          { key: "2", display: "2m" },
          { key: "3", display: "3m" },
          { key: "5", display: "5m" }
        ]
      }
    ],
    initialSelectionOption: "color",
    previewType: "Pose3d"
  },
  {
    key: "fovConeLegacy",
    display: "FOV Cone",
    symbol: "camera.viewfinder",
    showInTypeName: true,
    color: "color",
    sourceTypes: ["NumberArray"],
    showDocs: false,
    options: [
      {
        key: "color",
        display: "Color",
        showInTypeName: false,
        values: NeonColors
      },
      {
        key: "style",
        display: "Style",
        showInTypeName: true,
        values: [
          { key: "wireframe", display: "Wireframe" },
          { key: "filled", display: "Filled" }
        ]
      },
      {
        key: "depth",
        display: "Depth",
        showInTypeName: false,
        values: [
          { key: "1", display: "1m" },
          { key: "2", display: "2m" },
          { key: "3", display: "3m" },
          { key: "5", display: "5m" }
        ]
      },
      {
        key: "format",
        display: "Format",
        showInTypeName: false,
        values: [
          { key: "Pose2d", display: "2D Pose(s)" },
          { key: "Pose3d", display: "3D Pose(s)" },
          { key: "Translation2d", display: "2D Translation(s)" },
          { key: "Translation3d", display: "3D Translation(s)" }
        ]
      },
      {
        key: "units",
        display: "Rotation Units",
        showInTypeName: false,
        values: [
          { key: "radians", display: "Radians" },
          { key: "degrees", display: "Degrees" }
        ]
      }
    ],
    initialSelectionOption: "color",
    numberArrayDeprecated: true,
    previewType: "Pose3d"
  },
  ```

### Quality Assurance Checks

- [ ] TypeScript compiles without errors
- [ ] New type is properly part of union type
- [ ] Configuration includes both modern and legacy number array support
- [ ] All required fields (type, color, style, fov, depth, poses) are defined
- [ ] Preview type is set to "Pose3d" for proper field detection

---

## Phase 2: FOV Angle Detection and Data Flow

### Description

Implement FOV angle detection from child number fields and integrate FOV cone command generation into the controller.

### Tasks

- [ ] **2.1** Add FOV cone case to `src/hub/controllers/Field3dController.ts`:
  
  Add in the `getCommand()` method, around line 540 (after existing vision/cone cases):
  ```typescript
  case "fovCone":
  case "fovConeLegacy": {
    // Get FOV value from child number field if present
    let fov = 60; // Default FOV in degrees
    let fovChildKey = source.logKey + "/fov";
    if (window.log.getType(fovChildKey) === LoggableType.Number) {
      let fovValues = window.log.getNumber(fovChildKey, time, time, this.UUID);
      if (fovValues && fovValues.values.length > 0) {
        fov = fovValues.values[0];
      }
    }
    
    // Clamp FOV to reasonable range
    fov = clampValue(fov, 10, 170);
    
    objects.push({
      type: "fovCone",
      color: source.options.color,
      style: source.options.style as "wireframe" | "filled",
      fov: fov,
      depth: Number(source.options.depth),
      poses: poses
    });
    break;
  }
  ```

- [ ] **2.2** Update `getActiveFields()` to include FOV child fields:
  
  Modify in `src/hub/controllers/Field3dController.ts` (around line 229):
  ```typescript
  getActiveFields(): string[] {
    let activeFields = [...this.sourceList.getActiveFields(), ...ALLIANCE_KEYS, ...DRIVER_STATION_KEYS];
    
    // Add FOV child fields for FOV cone types
    let sources = this.sourceList.getState(true);
    sources.forEach(source => {
      if (source.type === "fovCone" || source.type === "fovConeLegacy") {
        activeFields.push(source.logKey + "/fov");
      }
    });
    
    return activeFields;
  }
  ```

### Quality Assurance Checks

- [ ] FOV angle is correctly read from child "/fov" number field
- [ ] Default FOV of 60 degrees is used when no child field exists
- [ ] FOV is clamped to reasonable range (10-170 degrees)
- [ ] FOV child field is marked as active so it loads from log
- [ ] TypeScript compiles without errors
- [ ] Depth value is properly converted from string option to number

---

## Phase 3: FOV Cone Object Manager

### Description

Create the FovConeManager class to handle rendering FOV cones using THREE.js geometry.

### Tasks

- [ ] **3.1** Create `src/shared/renderers/field3d/objectManagers/FovConeManager.ts`:
  
  ```typescript
  // Copyright (c) 2021-2025 Littleton Robotics
  // http://github.com/Mechanical-Advantage
  //
  // Use of this source code is governed by a BSD
  // license that can be found in the LICENSE file
  // at the root directory of this project.
  
  import * as THREE from "three";
  import { Field3dRendererCommand_FovConeObj } from "../../Field3dRenderer";
  import ObjectManager from "../ObjectManager";
  
  export default class FovConeManager extends ObjectManager<Field3dRendererCommand_FovConeObj> {
    private wireframeMeshes: THREE.LineSegments[] = [];
    private filledMeshes: THREE.Mesh[] = [];
    private lastStyle: "wireframe" | "filled" = "wireframe";
    private lastColor = "";
    private lastFov = 60;
    private lastDepth = 2;
  
    constructor(
      root: THREE.Object3D,
      materialSpecular: THREE.Color,
      materialShininess: number,
      mode: "low-power" | "standard" | "cinematic",
      isXR: boolean,
      requestRender: () => void
    ) {
      super(root, materialSpecular, materialShininess, mode, isXR, requestRender);
    }
  
    dispose(): void {
      this.wireframeMeshes.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.root.remove(mesh);
      });
      this.filledMeshes.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.root.remove(mesh);
      });
      this.wireframeMeshes = [];
      this.filledMeshes = [];
    }
  
    setObjectData(object: Field3dRendererCommand_FovConeObj): void {
      // Check if we need to rebuild geometries
      const needsRebuild = 
        object.style !== this.lastStyle ||
        object.color !== this.lastColor ||
        object.fov !== this.lastFov ||
        object.depth !== this.lastDepth;
  
      if (needsRebuild) {
        this.dispose();
        this.lastStyle = object.style;
        this.lastColor = object.color;
        this.lastFov = object.fov;
        this.lastDepth = object.depth;
      }
  
      // Calculate FOV cone dimensions
      const halfFovRad = (object.fov / 2) * (Math.PI / 180);
      const halfWidth = Math.tan(halfFovRad) * object.depth;
      const halfHeight = halfWidth; // Square FOV
  
      // Ensure we have the right number of meshes
      const currentMeshes = object.style === "wireframe" ? this.wireframeMeshes : this.filledMeshes;
      const targetCount = object.poses.length;
  
      // Remove excess meshes
      while (currentMeshes.length > targetCount) {
        const mesh = currentMeshes.pop()!;
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.root.remove(mesh);
      }
  
      // Add new meshes
      while (currentMeshes.length < targetCount) {
        if (object.style === "wireframe") {
          const geometry = this.createWireframeGeometry(halfWidth, halfHeight, object.depth);
          const material = new THREE.LineBasicMaterial({ color: object.color });
          const mesh = new THREE.LineSegments(geometry, material);
          this.wireframeMeshes.push(mesh);
          this.root.add(mesh);
        } else {
          const geometry = this.createFilledGeometry(halfWidth, halfHeight, object.depth);
          const material = new THREE.MeshPhongMaterial({
            color: object.color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            specular: this.materialSpecular,
            shininess: this.materialShininess
          });
          const mesh = new THREE.Mesh(geometry, material);
          this.filledMeshes.push(mesh);
          this.root.add(mesh);
        }
      }
  
      // Update mesh positions and rotations
      object.poses.forEach((annotatedPose, index) => {
        const mesh = currentMeshes[index];
        const pose = annotatedPose.pose;
        
        // Set position
        mesh.position.set(
          pose.translation[0],
          pose.translation[2],
          -pose.translation[1]
        );
        
        // Set rotation
        mesh.quaternion.set(
          pose.rotation[0],
          pose.rotation[2],
          -pose.rotation[1],
          pose.rotation[3]
        );
      });
    }
  
    /** Creates wireframe geometry showing 4 corner lines */
    private createWireframeGeometry(halfWidth: number, halfHeight: number, depth: number): THREE.BufferGeometry {
      const positions = new Float32Array([
        // Origin to top-left
        0, 0, 0,
        -halfWidth, halfHeight, depth,
        // Origin to top-right
        0, 0, 0,
        halfWidth, halfHeight, depth,
        // Origin to bottom-left
        0, 0, 0,
        -halfWidth, -halfHeight, depth,
        // Origin to bottom-right
        0, 0, 0,
        halfWidth, -halfHeight, depth,
        // Rectangle at far plane
        -halfWidth, halfHeight, depth,
        halfWidth, halfHeight, depth,
        
        halfWidth, halfHeight, depth,
        halfWidth, -halfHeight, depth,
        
        halfWidth, -halfHeight, depth,
        -halfWidth, -halfHeight, depth,
        
        -halfWidth, -halfHeight, depth,
        -halfWidth, halfHeight, depth
      ]);
  
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      return geometry;
    }
  
    /** Creates filled geometry showing transparent faces */
    private createFilledGeometry(halfWidth: number, halfHeight: number, depth: number): THREE.BufferGeometry {
      const positions = new Float32Array([
        // Top face
        0, 0, 0,
        -halfWidth, halfHeight, depth,
        halfWidth, halfHeight, depth,
        
        // Right face
        0, 0, 0,
        halfWidth, halfHeight, depth,
        halfWidth, -halfHeight, depth,
        
        // Bottom face
        0, 0, 0,
        halfWidth, -halfHeight, depth,
        -halfWidth, -halfHeight, depth,
        
        // Left face
        0, 0, 0,
        -halfWidth, -halfHeight, depth,
        -halfWidth, halfHeight, depth
      ]);
  
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.computeVertexNormals();
      return geometry;
    }
  }
  ```

### Quality Assurance Checks

- [ ] FovConeManager extends ObjectManager properly
- [ ] Wireframe shows 4 corner lines and far plane rectangle
- [ ] Filled mode shows 4 transparent triangular faces
- [ ] Geometries are properly disposed when rebuilding
- [ ] Position and rotation transformation matches other 3D objects
- [ ] FOV angle correctly calculates cone dimensions
- [ ] Depth parameter controls visualization distance
- [ ] TypeScript compiles without errors

---

## Phase 4: Integration with Field3dRendererImpl

### Description

Integrate the FovConeManager into the main 3D renderer implementation.

### Tasks

- [ ] **4.1** Add FovConeManager to imports in `src/shared/renderers/Field3dRendererImpl.ts`:
  
  Add to imports (around line 28):
  ```typescript
  import FovConeManager from "./field3d/objectManagers/FovConeManager";
  ```

- [ ] **4.2** Initialize FovConeManager in constructor:
  
  Add to the objectManagers array initialization (around line 290):
  ```typescript
  this.objectManagers.push({
    type: "fovCone",
    manager: new FovConeManager(
      this.wpilibFieldCoordinateGroup,
      this.MATERIAL_SPECULAR,
      this.MATERIAL_SHININESS,
      mode,
      false,
      () => (this.shouldRender = true)
    ),
    active: false
  });
  ```

- [ ] **4.3** Update XR initialization if needed:
  
  Check if XR needs special handling (around line 320). If XR support is desired, add similar initialization in XR section.

### Quality Assurance Checks

- [ ] FovConeManager is properly imported
- [ ] Manager is added to objectManagers array with correct type
- [ ] Manager receives correct scene group (wpilibFieldCoordinateGroup)
- [ ] Manager is initialized with proper material properties
- [ ] Render request callback is properly set
- [ ] TypeScript compiles without errors
- [ ] No console errors when 3D field loads

---

## Phase 5: Testing and Refinement

### Description

Test the FOV cone visualization with various configurations and refine as needed.

### Tasks

- [ ] **5.1** Test basic wireframe visualization:
  - Create a test Pose3d field in log
  - Add as FOV Cone with wireframe style
  - Verify 4 corner lines appear correctly
  - Verify far plane rectangle renders

- [ ] **5.2** Test filled visualization:
  - Switch style to filled
  - Verify 4 transparent faces appear
  - Check transparency (should be 30% opacity)
  - Verify faces are visible from all angles (DoubleSide)

- [ ] **5.3** Test custom FOV angle:
  - Create `/fov` child field with number value
  - Try values: 30, 60, 90, 120
  - Verify cone widens/narrows appropriately
  - Verify clamping at 10 and 170 degrees

- [ ] **5.4** Test depth options:
  - Try different depth values (1m, 2m, 3m, 5m)
  - Verify cone extends to correct distance
  - Verify proportions remain correct

- [ ] **5.5** Test with multiple poses:
  - Create Pose3d[] array field
  - Verify multiple cones render simultaneously
  - Check performance with 10+ cones

- [ ] **5.6** Test color options:
  - Try different neon colors
  - Verify color applies to both wireframe and filled
  - Check visibility in light and dark modes

- [ ] **5.7** Test coordinate transformations:
  - Verify cone points in correct direction based on pose rotation
  - Test with different coordinate systems (wall-blue, center-rotated, etc.)
  - Verify with 2D and 3D poses

- [ ] **5.8** Test edge cases:
  - Empty Pose3d array
  - Invalid FOV values (negative, very large)
  - Missing /fov child field
  - Rapidly changing FOV values

### Quality Assurance Checks

- [ ] FOV cones render correctly in all tested scenarios
- [ ] Performance is acceptable with multiple cones
- [ ] No memory leaks when switching between visualizations
- [ ] Proper cleanup when tab is closed
- [ ] Works with both FRC and FTC field coordinate systems
- [ ] UI is intuitive and follows existing patterns
- [ ] Documentation tooltips are helpful (if added)

---

## Phase 6: Documentation and Polish

### Description

Add documentation and final polish to the feature.

### Tasks

- [ ] **6.1** Add documentation to hover tooltip (optional):
  
  Update `showDocs: true` tooltips if Field3dController_Config supports it.

- [ ] **6.2** Update user documentation:
  - Document FOV cone type in user guides
  - Explain how to set custom FOV with child field
  - Provide example log structures

- [ ] **6.3** Code cleanup:
  - Add JSDoc comments to FovConeManager methods
  - Ensure consistent naming conventions
  - Remove any debug console.log statements
  - Format code with `npm run format`

- [ ] **6.4** Consider future enhancements (don't implement now):
  - Aspect ratio support (non-square FOV)
  - Near plane visualization
  - Grid overlay on FOV visualization
  - FOV angle display label
  - Different cone base shapes (circular)

### Quality Assurance Checks

- [ ] Code is well-documented with comments
- [ ] Follows existing code style and patterns
- [ ] User documentation is clear and comprehensive
- [ ] No TypeScript or linting errors
- [ ] Passes `npm run check-format`
- [ ] Future enhancement ideas documented for reference

---

## Testing Checklist

### Functionality Tests
- [ ] FOV cone appears for Pose3d fields
- [ ] Wireframe shows 4 corner lines + rectangle
- [ ] Filled shows 4 transparent faces
- [ ] Default 60° FOV when no child field present
- [ ] Custom FOV from /fov number field works
- [ ] FOV clamping works (10-170°)
- [ ] Depth options (1m, 2m, 3m, 5m) work correctly
- [ ] Color selection works for both styles
- [ ] Multiple poses render multiple cones
- [ ] Poses arrays work correctly

### Integration Tests
- [ ] Works with Pose2d (converted to 3D)
- [ ] Works with Pose3d
- [ ] Works with Transform2d/3d
- [ ] Works with arrays of poses
- [ ] Works with legacy NumberArray format
- [ ] Coordinate system transformations correct
- [ ] Works in all 3D modes (cinematic, standard, low-power)

### Performance Tests
- [ ] No lag with 10 FOV cones
- [ ] Acceptable performance with 50 FOV cones
- [ ] Geometry disposal prevents memory leaks
- [ ] Switching between wireframe/filled is instant
- [ ] No stuttering when FOV angle updates frequently

### UI/UX Tests
- [ ] Type appears in source list correctly
- [ ] Icon (camera.viewfinder) displays properly
- [ ] Options menu works (color, style, depth)
- [ ] Drag-and-drop number field for FOV works
- [ ] Type name includes style (wireframe/filled)
- [ ] Follows existing 3D visualization patterns

### Cross-Platform Tests
- [ ] Works on Windows (Electron)
- [ ] Works on macOS (Electron)
- [ ] Works on Linux (Electron)
- [ ] Works in Lite mode (browser-based)
- [ ] Works with FRC fields
- [ ] Works with FTC fields

---

## Implementation Notes

### Key Design Decisions

1. **Default FOV**: 60 degrees chosen as reasonable default for most camera systems
2. **FOV Range**: 10-170 degrees prevents degenerate or extreme visualizations
3. **Transparency**: 30% opacity for filled mode balances visibility with seeing through
4. **Geometry Type**: BufferGeometry for both wireframe and filled for consistency
5. **Child Field Pattern**: Follows existing vision target color override pattern
6. **Two Styles**: Wireframe for performance, filled for better spatial understanding

### Performance Considerations

- Geometry is recreated only when FOV/depth/style changes
- Uses instancing pattern where possible (one geometry per pose)
- BufferGeometry is more efficient than regular Geometry
- Transparent faces use DoubleSide to reduce draw calls
- Disposes geometries properly to prevent memory leaks

### Alternative Approaches Considered (Not Implemented)

1. **Cone Primitive**: THREE.ConeGeometry could work but is harder to control aspect ratio
2. **ShapeGeometry**: More complex, harder to make wireframe version
3. **Custom Shader**: Overkill for this simple visualization
4. **Pyramid with Base**: Adds visual noise, harder to see through
5. **Multiple FOV Fields**: Would require "/fovX" and "/fovY" - too complex for 80/20 rule

### Known Limitations

- Square FOV only (aspect ratio = 1:1)
- No near plane visualization
- No depth fading effect
- No automatic scaling based on scene size
- No collision detection or occlusion
- FOV child field must be exact name "/fov"

---

## Completion Criteria

This feature is complete when:
- [ ] All 6 phases have passing QA checks
- [ ] All functionality tests pass
- [ ] No TypeScript compilation errors
- [ ] Code follows existing patterns and style
- [ ] Documentation is updated
- [ ] Performance is acceptable (>30 FPS with 10 cones)
- [ ] Feature works on all supported platforms
- [ ] No memory leaks or resource issues
- [ ] User can successfully visualize camera FOV from log data

---

## Estimated Implementation Time

- **Phase 1** (Type System): 30-45 minutes
- **Phase 2** (Data Flow): 45-60 minutes  
- **Phase 3** (Object Manager): 2-3 hours
- **Phase 4** (Integration): 30-45 minutes
- **Phase 5** (Testing): 2-3 hours
- **Phase 6** (Documentation): 1-2 hours

**Total: 7-10 hours** for a skilled developer familiar with the codebase.

---

## Future Enhancements (Post-MVP)

### Nice-to-Have Features
- Aspect ratio support (rectangular FOV)
- Adjustable near plane
- Grid overlay on FOV face
- FOV angle label display
- Different visualization shapes (circular, elliptical)
- Color gradient based on distance
- Occlusion/depth testing effects
- Animation/transition effects

### Advanced Features
- Multiple camera support (multi-camera rigs)
- Stereo camera FOV pairs
- Fisheye lens visualization
- Auto-detect FOV from camera intrinsics
- Coverage area heatmap
- Overlap detection between multiple cameras
- Real-time video texture mapping

---

## References

- **THREE.js LineSegments**: https://threejs.org/docs/#api/en/objects/LineSegments
- **THREE.js BufferGeometry**: https://threejs.org/docs/#api/en/core/BufferGeometry
- **Perspective Projection**: https://en.wikipedia.org/wiki/Perspective_(graphical)
- **Existing Implementation Examples**:
  - `src/shared/renderers/field3d/objectManagers/ConeManager.ts` - Similar geometry management
  - `src/shared/renderers/field3d/objectManagers/AxesManager.ts` - Wireframe line handling
  - `src/shared/renderers/field3d/objectManagers/RobotManager.ts` - Vision target lines (wireframe pattern)
  - `src/shared/renderers/field3d/objectManagers/TrajectoryManager.ts` - Path visualization

---

## Contact and Support

For questions or issues during implementation:
- Review existing ObjectManager implementations
- Check THREE.js documentation for geometry questions  
- Refer to Field3dController for command generation patterns
- Test incrementally - each phase should compile and run
- Use browser dev tools for 3D debugging and performance profiling
