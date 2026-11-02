/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  VMCBoneData,
  VMCBlendData,
  VMCRootData,
  VMCCamData,
  VMCTrackerData,
} from '../types/vmc';
import { DEFAULT_REST_POSITIONS } from '../utils/vmc';

interface ThreeViewportProps {
  rootData: VMCRootData;
  bonesMap: Map<string, VMCBoneData>;
  blendshapesMap: Map<string, number>;
  trackers: VMCTrackerData[];
  camData?: VMCCamData;
  showTrackers: boolean;
  showSkeleton: boolean;
  showMesh: boolean;
  onCameraPresetChange?: (preset: string) => void;
}

export const ThreeViewport: React.FC<ThreeViewportProps> = ({
  rootData,
  bonesMap,
  blendshapesMap,
  trackers,
  camData,
  showTrackers,
  showSkeleton,
  showMesh,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Store mutable references for the render loop
  const stateRef = useRef({
    rootData,
    bonesMap,
    blendshapesMap,
    trackers,
    camData,
    showTrackers,
    showSkeleton,
    showMesh,
  });

  // Keep stateRef in sync with latest props without tearing down Three.js canvas
  useEffect(() => {
    stateRef.current = {
      rootData,
      bonesMap,
      blendshapesMap,
      trackers,
      camData,
      showTrackers,
      showSkeleton,
      showMesh,
    };
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL to adhere to Ultra Mode & Three.js skill
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d14);
    scene.fog = new THREE.FogExp2(0x0a0d14, 0.08);

    // Camera - Centered to showcase full humanoid body
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.92, 2.8);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.85, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 15;
    controls.minDistance = 0.5;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;

    // Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x1e293b, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.8);
    keyLight.position.set(2.5, 4.5, 3.5);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 12;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(-3.0, 2.5, -2.5);
    scene.add(rimLight);

    // Ground Grid & Contact Shadow Floor
    const grid = new THREE.GridHelper(10, 20, 0x0284c7, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    // Ground Contact Shadow plane
    const shadowGeo = new THREE.PlaneGeometry(2.5, 2.5);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    shadowTex.colorSpace = THREE.SRGBColorSpace;

    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.005;
    scene.add(contactShadow);

    // Humanoid Model Group
    const avatarGroup = new THREE.Group();
    scene.add(avatarGroup);

    // Joint Spheres & Segment Meshes Map
    const jointMeshes = new Map<string, THREE.Mesh>();
    const boneLimbs = new Map<string, THREE.Mesh>();
    const trackerMeshes = new Map<string, THREE.Group>();

    // Stylized materials
    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.25,
      metalness: 0.8,
    });

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.6,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.2,
      metalness: 0.9,
    });

    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      roughness: 0.1,
      metalness: 0.95,
    });

    // Bone definitions with hierarchy
    const boneNames = Object.keys(DEFAULT_REST_POSITIONS);

    // Create joint meshes
    const jointGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const headGeo = new THREE.BoxGeometry(0.18, 0.22, 0.18);
    const visorGeo = new THREE.BoxGeometry(0.19, 0.06, 0.08);
    const chestGeo = new THREE.BoxGeometry(0.28, 0.2, 0.16);
    const hipsGeo = new THREE.BoxGeometry(0.26, 0.14, 0.16);
    const limbCylinderGeo = new THREE.CylinderGeometry(0.03, 0.035, 1, 12);

    for (const name of boneNames) {
      const group = new THREE.Group();
      group.name = `node_${name}`;

      // Joint Sphere
      const sphere = new THREE.Mesh(jointGeo, jointMat);
      sphere.castShadow = !isSoftwareGl;
      group.add(sphere);

      // Add stylized body parts on key anatomical nodes
      if (name === 'Head') {
        const headMesh = new THREE.Mesh(headGeo, bodyMat);
        headMesh.position.y = 0.06;
        headMesh.castShadow = !isSoftwareGl;
        group.add(headMesh);

        // Animated Visor / Facial plate
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.name = 'head_visor';
        visor.position.set(0, 0.07, 0.08);
        group.add(visor);

        // Jaw node for visemes (A, I, U, E, O)
        const jawGeo = new THREE.BoxGeometry(0.12, 0.04, 0.1);
        const jawMesh = new THREE.Mesh(jawGeo, accentMat);
        jawMesh.name = 'head_jaw';
        jawMesh.position.set(0, -0.06, 0.03);
        group.add(jawMesh);
      } else if (name === 'Chest') {
        const chestMesh = new THREE.Mesh(chestGeo, bodyMat);
        chestMesh.position.y = 0.05;
        chestMesh.castShadow = !isSoftwareGl;
        group.add(chestMesh);

        // Glowing Core Reactor
        const coreGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16);
        const coreMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.9,
          roughness: 0.2,
          metalness: 0.8,
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.rotation.x = Math.PI / 2;
        coreMesh.position.set(0, 0.06, 0.085);
        group.add(coreMesh);
      } else if (name === 'Hips') {
        const hipsMesh = new THREE.Mesh(hipsGeo, bodyMat);
        hipsMesh.position.y = 0;
        group.add(hipsMesh);
      } else if (name === 'LeftHand' || name === 'RightHand') {
        const palmGeo = new THREE.BoxGeometry(0.06, 0.08, 0.03);
        const palmMesh = new THREE.Mesh(palmGeo, bodyMat);
        group.add(palmMesh);
      } else if (name === 'LeftFoot' || name === 'RightFoot') {
        const footGeo = new THREE.BoxGeometry(0.08, 0.04, 0.16);
        const footMesh = new THREE.Mesh(footGeo, bodyMat);
        footMesh.position.set(0, -0.02, 0.04);
        group.add(footMesh);
      }

      avatarGroup.add(group);
      jointMeshes.set(name, sphere);
    }

    // Limbs linking joints
    const limbLinks: [string, string][] = [
      ['Hips', 'Spine'],
      ['Spine', 'Chest'],
      ['Chest', 'UpperChest'],
      ['UpperChest', 'Neck'],
      ['Neck', 'Head'],
      ['UpperChest', 'LeftShoulder'],
      ['LeftShoulder', 'LeftUpperArm'],
      ['LeftUpperArm', 'LeftLowerArm'],
      ['LeftLowerArm', 'LeftHand'],
      ['UpperChest', 'RightShoulder'],
      ['RightShoulder', 'RightUpperArm'],
      ['RightUpperArm', 'RightLowerArm'],
      ['RightLowerArm', 'RightHand'],
      ['Hips', 'LeftUpperLeg'],
      ['LeftUpperLeg', 'LeftLowerLeg'],
      ['LeftLowerLeg', 'LeftFoot'],
      ['Hips', 'RightUpperLeg'],
      ['RightUpperLeg', 'RightLowerLeg'],
      ['RightLowerLeg', 'RightFoot'],
    ];

    for (const [parent, child] of limbLinks) {
      const linkMesh = new THREE.Mesh(limbCylinderGeo, accentMat);
      linkMesh.castShadow = !isSoftwareGl;
      avatarGroup.add(linkMesh);
      boneLimbs.set(`${parent}_${child}`, linkMesh);
    }

    // 6DOF Trackers Group
    const trackersGroup = new THREE.Group();
    scene.add(trackersGroup);

    // Pre-allocated math variables to eliminate Garbage Collection in render loop
    const _p1 = new THREE.Vector3();
    const _p2 = new THREE.Vector3();
    const _mid = new THREE.Vector3();
    const _diff = new THREE.Vector3();
    const _orient = new THREE.Quaternion();

    // Map of absolute calculated 3D positions of bones in world space
    const worldBonePositions = new Map<string, THREE.Vector3>();
    for (const name of boneNames) {
      worldBonePositions.set(name, new THREE.Vector3());
    }

    // Animation & Render Loop
    let frameId = 0;
    let isDisposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function renderTick() {
      if (isDisposed) return;

      const {
        rootData: curRoot,
        bonesMap: curBones,
        blendshapesMap: curBlend,
        trackers: curTrackers,
        camData: curCam,
        showTrackers: curShowTrackers,
        showSkeleton: curShowSkeleton,
        showMesh: curShowMesh,
      } = stateRef.current;

      controls.update();

      // 1. Update Root position & rotation
      avatarGroup.position.set(curRoot.position.x, curRoot.position.y, curRoot.position.z);
      avatarGroup.quaternion.set(
        curRoot.rotation.x,
        curRoot.rotation.y,
        curRoot.rotation.z,
        curRoot.rotation.w
      );

      // Contact shadow follows root horizontal
      contactShadow.position.x = curRoot.position.x;
      contactShadow.position.z = curRoot.position.z;

      // 2. Compute forward kinematics / joint positions
      // Start with Hips (do not double add rest position)
      const hipsPos = DEFAULT_REST_POSITIONS['Hips'];
      const hipsBone = curBones.get('Hips');
      const hipsWorld = worldBonePositions.get('Hips')!;
      hipsWorld.set(
        hipsBone?.position.x ?? hipsPos.x,
        hipsBone?.position.y ?? hipsPos.y,
        hipsBone?.position.z ?? hipsPos.z
      );

      // Apply forward kinematics relative offsets
      const spinePos = DEFAULT_REST_POSITIONS['Spine'];
      worldBonePositions.get('Spine')!.copy(hipsWorld).add(new THREE.Vector3(spinePos.x, spinePos.y, spinePos.z));

      const chestPos = DEFAULT_REST_POSITIONS['Chest'];
      worldBonePositions.get('Chest')!.copy(worldBonePositions.get('Spine')!).add(new THREE.Vector3(chestPos.x, chestPos.y, chestPos.z));

      const uChestPos = DEFAULT_REST_POSITIONS['UpperChest'];
      const uChestWorld = worldBonePositions.get('UpperChest')!;
      uChestWorld.copy(worldBonePositions.get('Chest')!).add(new THREE.Vector3(uChestPos.x, uChestPos.y, uChestPos.z));

      const neckPos = DEFAULT_REST_POSITIONS['Neck'];
      worldBonePositions.get('Neck')!.copy(uChestWorld).add(new THREE.Vector3(neckPos.x, neckPos.y, neckPos.z));

      const headPos = DEFAULT_REST_POSITIONS['Head'];
      worldBonePositions.get('Head')!.copy(worldBonePositions.get('Neck')!).add(new THREE.Vector3(headPos.x, headPos.y, headPos.z));

      // Left Arm Chain
      const lShPos = DEFAULT_REST_POSITIONS['LeftShoulder'];
      const lShWorld = worldBonePositions.get('LeftShoulder')!;
      lShWorld.copy(uChestWorld).add(new THREE.Vector3(lShPos.x, lShPos.y, lShPos.z));

      const lArmPos = DEFAULT_REST_POSITIONS['LeftUpperArm'];
      const lArmBone = curBones.get('LeftUpperArm');
      const lArmRot = lArmBone
        ? new THREE.Quaternion(lArmBone.rotation.x, lArmBone.rotation.y, lArmBone.rotation.z, lArmBone.rotation.w)
        : new THREE.Quaternion();
      const lArmOffset = new THREE.Vector3(lArmPos.x, lArmPos.y, lArmPos.z).applyQuaternion(lArmRot);
      const lArmWorld = worldBonePositions.get('LeftUpperArm')!;
      lArmWorld.copy(lShWorld).add(lArmOffset);

      const lElbowPos = DEFAULT_REST_POSITIONS['LeftLowerArm'];
      const lElbowBone = curBones.get('LeftLowerArm');
      const lElbowRot = lElbowBone
        ? new THREE.Quaternion(lElbowBone.rotation.x, lElbowBone.rotation.y, lElbowBone.rotation.z, lElbowBone.rotation.w)
        : new THREE.Quaternion();
      const lForearmOffset = new THREE.Vector3(lElbowPos.x, lElbowPos.y, lElbowPos.z).applyQuaternion(lElbowRot);
      const lForearmWorld = worldBonePositions.get('LeftLowerArm')!;
      lForearmWorld.copy(lArmWorld).add(lForearmOffset);

      const lHandPos = DEFAULT_REST_POSITIONS['LeftHand'];
      worldBonePositions.get('LeftHand')!.copy(lForearmWorld).add(new THREE.Vector3(lHandPos.x, lHandPos.y, lHandPos.z));

      // Right Arm Chain
      const rShPos = DEFAULT_REST_POSITIONS['RightShoulder'];
      const rShWorld = worldBonePositions.get('RightShoulder')!;
      rShWorld.copy(uChestWorld).add(new THREE.Vector3(rShPos.x, rShPos.y, rShPos.z));

      const rArmPos = DEFAULT_REST_POSITIONS['RightUpperArm'];
      const rArmBone = curBones.get('RightUpperArm');
      const rArmRot = rArmBone
        ? new THREE.Quaternion(rArmBone.rotation.x, rArmBone.rotation.y, rArmBone.rotation.z, rArmBone.rotation.w)
        : new THREE.Quaternion();
      const rArmOffset = new THREE.Vector3(rArmPos.x, rArmPos.y, rArmPos.z).applyQuaternion(rArmRot);
      const rArmWorld = worldBonePositions.get('RightUpperArm')!;
      rArmWorld.copy(rShWorld).add(rArmOffset);

      const rElbowPos = DEFAULT_REST_POSITIONS['RightLowerArm'];
      const rElbowBone = curBones.get('RightLowerArm');
      const rElbowRot = rElbowBone
        ? new THREE.Quaternion(rElbowBone.rotation.x, rElbowBone.rotation.y, rElbowBone.rotation.z, rElbowBone.rotation.w)
        : new THREE.Quaternion();
      const rForearmOffset = new THREE.Vector3(rElbowPos.x, rElbowPos.y, rElbowPos.z).applyQuaternion(rElbowRot);
      const rForearmWorld = worldBonePositions.get('RightLowerArm')!;
      rForearmWorld.copy(rArmWorld).add(rForearmOffset);

      const rHandPos = DEFAULT_REST_POSITIONS['RightHand'];
      worldBonePositions.get('RightHand')!.copy(rForearmWorld).add(new THREE.Vector3(rHandPos.x, rHandPos.y, rHandPos.z));

      // Left Leg Chain
      const lLegPos = DEFAULT_REST_POSITIONS['LeftUpperLeg'];
      const lLegBone = curBones.get('LeftUpperLeg');
      const lLegRot = lLegBone
        ? new THREE.Quaternion(lLegBone.rotation.x, lLegBone.rotation.y, lLegBone.rotation.z, lLegBone.rotation.w)
        : new THREE.Quaternion();
      const lLegWorld = worldBonePositions.get('LeftUpperLeg')!;
      lLegWorld.copy(hipsWorld).add(new THREE.Vector3(lLegPos.x, lLegPos.y, lLegPos.z));

      const lKneePos = DEFAULT_REST_POSITIONS['LeftLowerLeg'];
      const lKneeBone = curBones.get('LeftLowerLeg');
      const lKneeRot = lKneeBone
        ? new THREE.Quaternion(lKneeBone.rotation.x, lKneeBone.rotation.y, lKneeBone.rotation.z, lKneeBone.rotation.w)
        : new THREE.Quaternion();
      const lKneeOffset = new THREE.Vector3(lKneePos.x, lKneePos.y, lKneePos.z).applyQuaternion(lKneeRot);
      const lKneeWorld = worldBonePositions.get('LeftLowerLeg')!;
      lKneeWorld.copy(lLegWorld).add(lKneeOffset);

      const lFootPos = DEFAULT_REST_POSITIONS['LeftFoot'];
      worldBonePositions.get('LeftFoot')!.copy(lKneeWorld).add(new THREE.Vector3(lFootPos.x, lFootPos.y, lFootPos.z));

      // Right Leg Chain
      const rLegPos = DEFAULT_REST_POSITIONS['RightUpperLeg'];
      const rLegBone = curBones.get('RightUpperLeg');
      const rLegRot = rLegBone
        ? new THREE.Quaternion(rLegBone.rotation.x, rLegBone.rotation.y, rLegBone.rotation.z, rLegBone.rotation.w)
        : new THREE.Quaternion();
      const rLegWorld = worldBonePositions.get('RightUpperLeg')!;
      rLegWorld.copy(hipsWorld).add(new THREE.Vector3(rLegPos.x, rLegPos.y, rLegPos.z));

      const rKneePos = DEFAULT_REST_POSITIONS['RightLowerLeg'];
      const rKneeBone = curBones.get('RightLowerLeg');
      const rKneeRot = rKneeBone
        ? new THREE.Quaternion(rKneeBone.rotation.x, rKneeBone.rotation.y, rKneeBone.rotation.z, rKneeBone.rotation.w)
        : new THREE.Quaternion();
      const rKneeOffset = new THREE.Vector3(rKneePos.x, rKneePos.y, rKneePos.z).applyQuaternion(rKneeRot);
      const rKneeWorld = worldBonePositions.get('RightLowerLeg')!;
      rKneeWorld.copy(rLegWorld).add(rKneeOffset);

      const rFootPos = DEFAULT_REST_POSITIONS['RightFoot'];
      worldBonePositions.get('RightFoot')!.copy(rKneeWorld).add(new THREE.Vector3(rFootPos.x, rFootPos.y, rFootPos.z));

      // 3. Update Joint Meshes positions & rotations
      for (const [name, pos] of worldBonePositions.entries()) {
        const node = avatarGroup.getObjectByName(`node_${name}`);
        if (node) {
          node.position.copy(pos);
          const bData = curBones.get(name);
          if (bData) {
            node.quaternion.set(
              bData.rotation.x,
              bData.rotation.y,
              bData.rotation.z,
              bData.rotation.w
            );
          }
        }
      }

      // 4. Update Limbs (Cylinders oriented between pairs)
      for (const [parent, child] of limbLinks) {
        const pParent = worldBonePositions.get(parent);
        const pChild = worldBonePositions.get(child);
        const limb = boneLimbs.get(`${parent}_${child}`);
        if (pParent && pChild && limb) {
          _p1.copy(pParent);
          _p2.copy(pChild);
          _mid.addVectors(_p1, _p2).multiplyScalar(0.5);
          _diff.subVectors(_p2, _p1);
          const dist = _diff.length();

          limb.position.copy(_mid);
          limb.scale.set(1, dist, 1);

          _orient.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _diff.normalize());
          limb.quaternion.copy(_orient);
          limb.visible = curShowSkeleton || curShowMesh;
        }
      }

      // 5. Facial Blendshape visualization (Head visor & Jaw)
      const headNode = avatarGroup.getObjectByName('node_Head');
      if (headNode) {
        const visor = headNode.getObjectByName('head_visor') as THREE.Mesh;
        const jaw = headNode.getObjectByName('head_jaw') as THREE.Mesh;

        const joyVal = curBlend.get('Joy') || 0;
        const blinkVal = curBlend.get('Blink') || curBlend.get('Blink_L') || 0;
        const mouthA = curBlend.get('A') || curBlend.get('O') || 0;

        if (visor) {
          // Blink scales visor height down
          visor.scale.y = Math.max(0.15, 1.0 - blinkVal * 0.85);
          // Color shift with Joy
          const visorMatRef = visor.material as THREE.MeshStandardMaterial;
          if (joyVal > 0.3) {
            visorMatRef.color.setHex(0x34d399); // mint green
            visorMatRef.emissive.setHex(0x059669);
          } else {
            visorMatRef.color.setHex(0x38bdf8); // sky cyan
            visorMatRef.emissive.setHex(0x0284c7);
          }
        }

        if (jaw) {
          // Mouth A/O opens jaw downward
          jaw.position.y = -0.06 - mouthA * 0.05;
        }
      }

      // 6. 6DOF Trackers update
      trackersGroup.visible = curShowTrackers;
      if (curShowTrackers) {
        for (const tra of curTrackers) {
          let traMesh = trackerMeshes.get(tra.name);
          if (!traMesh) {
            traMesh = new THREE.Group();
            // Tracker puck
            const puckGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16);
            const puckMat = new THREE.MeshStandardMaterial({
              color: 0x10b981,
              roughness: 0.3,
              metalness: 0.7,
            });
            const puck = new THREE.Mesh(puckGeo, puckMat);
            traMesh.add(puck);

            // Axes
            const axes = new THREE.AxesHelper(0.12);
            traMesh.add(axes);

            trackersGroup.add(traMesh);
            trackerMeshes.set(tra.name, traMesh);
          }

          traMesh.position.set(tra.position.x, tra.position.y, tra.position.z);
          traMesh.quaternion.set(tra.rotation.x, tra.rotation.y, tra.rotation.z, tra.rotation.w);
        }
      }



      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(renderTick);
      } else {
        frameId = requestAnimationFrame(renderTick);
      }
    }

    renderTick();

    // Resize handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="relative w-full h-full overflow-hidden bg-slate-950 select-none"
      data-testid="vmc-three-viewport"
    />
  );
};
