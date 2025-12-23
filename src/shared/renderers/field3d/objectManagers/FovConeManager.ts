// Copyright (c) 2021-2025 Littleton Robotics
// http://github.com/Mechanical-Advantage
//
// Use of this source code is governed by a BSD
// license that can be found in the LICENSE file
// at the root directory of this project.

import * as THREE from "three";
import { Field3dRendererCommand_FovConeObj } from "../../Field3dRenderer";
import ObjectManager from "../ObjectManager";

/**
 * Manages FOV (Field of View) cone visualizations for camera poses.
 * Supports both wireframe (4 corner lines + rectangle) and filled (4 transparent faces) rendering.
 */
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

  /**
   * Updates the FOV cone meshes based on the provided object data.
   * Rebuilds geometries if FOV, depth, style, or color changes.
   * Updates mesh count to match number of poses and transforms each mesh.
   */
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

      // Set position (no manual transformation - wpilibCoordinateGroup handles coordinate system)
      mesh.position.set(...pose.translation);

      // Set rotation
      mesh.quaternion.set(pose.rotation[0], pose.rotation[2], -pose.rotation[1], pose.rotation[3]);
    });
  }

  /**
   * Creates wireframe geometry showing 4 corner lines from origin to far plane
   * and a rectangle at the far plane representing the FOV boundary.
   * @param halfWidth Half width of the FOV rectangle at depth distance
   * @param halfHeight Half height of the FOV rectangle at depth distance
   * @param depth Distance from origin to far plane
   */
  private createWireframeGeometry(halfWidth: number, halfHeight: number, depth: number): THREE.BufferGeometry {
    // Geometry in WPILib coordinates: X=depth (forward), Y=horizontal (left/right), Z=vertical (up/down)
    const positions = new Float32Array([
      // Origin to top-left
      0,
      0,
      0,
      depth,
      -halfWidth,
      halfHeight,
      // Origin to top-right
      0,
      0,
      0,
      depth,
      halfWidth,
      halfHeight,
      // Origin to bottom-left
      0,
      0,
      0,
      depth,
      -halfWidth,
      -halfHeight,
      // Origin to bottom-right
      0,
      0,
      0,
      depth,
      halfWidth,
      -halfHeight,
      // Rectangle at far plane
      depth,
      -halfWidth,
      halfHeight,
      depth,
      halfWidth,
      halfHeight,

      depth,
      halfWidth,
      halfHeight,
      depth,
      halfWidth,
      -halfHeight,

      depth,
      halfWidth,
      -halfHeight,
      depth,
      -halfWidth,
      -halfHeight,

      depth,
      -halfWidth,
      -halfHeight,
      depth,
      -halfWidth,
      halfHeight
    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }

  /**
   * Creates filled geometry showing 4 transparent triangular faces forming a pyramid.
   * Each face connects the origin to one edge of the FOV rectangle.
   * @param halfWidth Half width of the FOV rectangle at depth distance
   * @param halfHeight Half height of the FOV rectangle at depth distance
   * @param depth Distance from origin to far plane
   */
  private createFilledGeometry(halfWidth: number, halfHeight: number, depth: number): THREE.BufferGeometry {
    // Geometry in WPILib coordinates: X=depth (forward), Y=horizontal (left/right), Z=vertical (up/down)
    const positions = new Float32Array([
      // Top face
      0,
      0,
      0,
      depth,
      -halfWidth,
      halfHeight,
      depth,
      halfWidth,
      halfHeight,

      // Right face
      0,
      0,
      0,
      depth,
      halfWidth,
      halfHeight,
      depth,
      halfWidth,
      -halfHeight,

      // Bottom face
      0,
      0,
      0,
      depth,
      halfWidth,
      -halfHeight,
      depth,
      -halfWidth,
      -halfHeight,

      // Left face
      0,
      0,
      0,
      depth,
      -halfWidth,
      -halfHeight,
      depth,
      -halfWidth,
      halfHeight
    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }
}
