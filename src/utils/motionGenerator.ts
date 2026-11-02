/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  VMCBoneData,
  VMCBlendData,
  VMCRootData,
  VMCCamData,
  VMCTrackerData,
  Vector3D,
} from '../types/vmc';
import {
  DEFAULT_REST_POSITIONS,
  IDENTITY_QUATERNION,
  eulerToQuaternion,
} from './vmc';

export type MotionPreset = 'idle' | 'walking' | 'wave' | 'speech' | 't_pose' | 'a_pose';

export interface GeneratedVMCFrame {
  timestamp: number;
  root: VMCRootData;
  bones: VMCBoneData[];
  blendshapes: VMCBlendData[];
  trackers: VMCTrackerData[];
  cam: VMCCamData;
}

/**
 * Generate a deterministic procedural VMC frame based on preset and elapsed seconds.
 */
export function generateVMCFrame(preset: MotionPreset, timeSec: number): GeneratedVMCFrame {
  const t = timeSec;
  const bones: VMCBoneData[] = [];
  const blendshapes: VMCBlendData[] = [];

  // Default Root
  let rootPos: Vector3D = { x: 0, y: 0, z: 0 };
  let rootRot = IDENTITY_QUATERNION;

  // Trackers
  const trackers: VMCTrackerData[] = [];

  if (preset === 't_pose') {
    // Pure T-Pose
    for (const [boneName, pos] of Object.entries(DEFAULT_REST_POSITIONS)) {
      bones.push({
        name: boneName,
        position: { ...pos },
        rotation: IDENTITY_QUATERNION,
      });
    }
    blendshapes.push(
      { name: 'Neutral', value: 1.0 },
      { name: 'Joy', value: 0 },
      { name: 'Blink', value: 0 },
      { name: 'A', value: 0 }
    );
  } else if (preset === 'a_pose') {
    // A-Pose: Arms down 45 deg (-0.785 rad on Z)
    for (const [boneName, pos] of Object.entries(DEFAULT_REST_POSITIONS)) {
      let rot = IDENTITY_QUATERNION;
      if (boneName === 'LeftUpperArm') {
        rot = eulerToQuaternion(0, 0, -0.785);
      } else if (boneName === 'RightUpperArm') {
        rot = eulerToQuaternion(0, 0, 0.785);
      }
      bones.push({
        name: boneName,
        position: { ...pos },
        rotation: rot,
      });
    }
    blendshapes.push({ name: 'Neutral', value: 1.0 });
  } else if (preset === 'walking') {
    // Walk Cycle (frequency ~ 1.8 Hz)
    const freq = 3.6;
    const stride = Math.sin(t * freq);
    const cosStride = Math.cos(t * freq);

    // Pelvis bounce and sway
    rootPos = {
      x: Math.sin(t * freq * 0.5) * 0.04,
      y: Math.abs(Math.sin(t * freq)) * 0.05,
      z: 0,
    };
    rootRot = eulerToQuaternion(0, Math.sin(t * freq * 0.5) * 0.06, 0);

    for (const [boneName, pos] of Object.entries(DEFAULT_REST_POSITIONS)) {
      let rot = IDENTITY_QUATERNION;

      if (boneName === 'Hips') {
        rot = eulerToQuaternion(0.04, Math.sin(t * freq * 0.5) * 0.08, -stride * 0.03);
      } else if (boneName === 'Spine') {
        rot = eulerToQuaternion(-0.03, -Math.sin(t * freq * 0.5) * 0.05, 0);
      } else if (boneName === 'Chest' || boneName === 'UpperChest') {
        rot = eulerToQuaternion(0.02, -Math.sin(t * freq * 0.5) * 0.04, 0);
      } else if (boneName === 'Head') {
        rot = eulerToQuaternion(-0.03 + Math.sin(t * 1.5) * 0.02, Math.cos(t * freq * 0.5) * 0.03, 0);
      } else if (boneName === 'LeftUpperArm') {
        rot = eulerToQuaternion(-stride * 0.45, 0, -0.2);
      } else if (boneName === 'LeftLowerArm') {
        rot = eulerToQuaternion(Math.max(0, -stride * 0.3) + 0.2, 0, 0);
      } else if (boneName === 'RightUpperArm') {
        rot = eulerToQuaternion(stride * 0.45, 0, 0.2);
      } else if (boneName === 'RightLowerArm') {
        rot = eulerToQuaternion(Math.max(0, stride * 0.3) + 0.2, 0, 0);
      } else if (boneName === 'LeftUpperLeg') {
        rot = eulerToQuaternion(stride * 0.5, 0, 0);
      } else if (boneName === 'LeftLowerLeg') {
        rot = eulerToQuaternion(Math.max(0, -cosStride * 0.7), 0, 0);
      } else if (boneName === 'RightUpperLeg') {
        rot = eulerToQuaternion(-stride * 0.5, 0, 0);
      } else if (boneName === 'RightLowerLeg') {
        rot = eulerToQuaternion(Math.max(0, cosStride * 0.7), 0, 0);
      }

      bones.push({
        name: boneName,
        position: { ...pos },
        rotation: rot,
      });
    }

    // Blink occasionally
    const blinkCycle = (t % 4.0);
    const isBlinking = blinkCycle > 3.85 && blinkCycle < 3.98;
    blendshapes.push(
      { name: 'Blink', value: isBlinking ? 1.0 : 0 },
      { name: 'Joy', value: 0.15 },
      { name: 'Neutral', value: 0.85 }
    );
  } else if (preset === 'wave') {
    // Waving hand gesture
    const waveFreq = 4.5;
    const wave = Math.sin(t * waveFreq);

    for (const [boneName, pos] of Object.entries(DEFAULT_REST_POSITIONS)) {
      let rot = IDENTITY_QUATERNION;

      if (boneName === 'RightUpperArm') {
        // Raised arm
        rot = eulerToQuaternion(0.3, 0.2, 1.45 + wave * 0.15);
      } else if (boneName === 'RightLowerArm') {
        // Bent elbow
        rot = eulerToQuaternion(0.6, 0.4 + wave * 0.25, 0.3);
      } else if (boneName === 'RightHand') {
        // Wrist wave
        rot = eulerToQuaternion(0, 0, wave * 0.35);
      } else if (boneName === 'LeftUpperArm') {
        rot = eulerToQuaternion(0, 0, -0.35);
      } else if (boneName === 'Head') {
        rot = eulerToQuaternion(0.05, -0.15, -0.08 + Math.sin(t * 2) * 0.03);
      } else if (boneName === 'Spine' || boneName === 'Chest') {
        rot = eulerToQuaternion(0, 0, -0.05);
      }

      bones.push({
        name: boneName,
        position: { ...pos },
        rotation: rot,
      });
    }

    blendshapes.push(
      { name: 'Joy', value: 0.85 },
      { name: 'Fun', value: 0.6 },
      { name: 'Blink', value: (t % 3.2 > 3.05 && t % 3.2 < 3.18) ? 0.9 : 0 },
      { name: 'A', value: 0.2 }
    );
  } else if (preset === 'speech') {
    // Talking & Expressive gestures
    const visemeT = (t * 4.0) % 5;
    const mouthA = Math.max(0, Math.sin(t * 8)) * 0.7;
    const mouthI = Math.max(0, Math.cos(t * 6)) * 0.5;
    const mouthO = Math.max(0, Math.sin(t * 5 + 1)) * 0.6;

    for (const [boneName, pos] of Object.entries(DEFAULT_REST_POSITIONS)) {
      let rot = IDENTITY_QUATERNION;

      if (boneName === 'Head') {
        rot = eulerToQuaternion(
          Math.sin(t * 3) * 0.08 + 0.04,
          Math.cos(t * 1.5) * 0.12,
          Math.sin(t * 2) * 0.04
        );
      } else if (boneName === 'Spine' || boneName === 'Chest') {
        rot = eulerToQuaternion(Math.sin(t * 1.5) * 0.03, Math.sin(t * 1.0) * 0.04, 0);
      } else if (boneName === 'LeftUpperArm') {
        rot = eulerToQuaternion(0.2 + Math.sin(t * 2) * 0.1, 0, -0.4);
      } else if (boneName === 'RightUpperArm') {
        rot = eulerToQuaternion(0.25 + Math.cos(t * 2.2) * 0.12, 0, 0.4);
      }

      bones.push({
        name: boneName,
        position: { ...pos },
        rotation: rot,
      });
    }

    blendshapes.push(
      { name: 'A', value: mouthA },
      { name: 'I', value: mouthI },
      { name: 'O', value: mouthO },
      { name: 'Joy', value: 0.35 + Math.sin(t * 1.2) * 0.2 },
      { name: 'Blink', value: (t % 3.5 > 3.35 && t % 3.5 < 3.48) ? 1.0 : 0 }
    );
  } else {
    // 'idle' preset (Breathing, micro-sway)
    const breath = Math.sin(t * 1.8);
    const microSway = Math.cos(t * 0.8);

    rootPos = {
      x: microSway * 0.015,
      y: breath * 0.008,
      z: 0,
    };

    for (const [boneName, pos] of Object.entries(DEFAULT_REST_POSITIONS)) {
      let rot = IDENTITY_QUATERNION;

      if (boneName === 'Hips') {
        rot = eulerToQuaternion(0.02, microSway * 0.02, 0);
      } else if (boneName === 'Spine') {
        rot = eulerToQuaternion(breath * 0.025, 0, 0);
      } else if (boneName === 'Chest' || boneName === 'UpperChest') {
        rot = eulerToQuaternion(breath * 0.035, 0, 0);
      } else if (boneName === 'Neck' || boneName === 'Head') {
        rot = eulerToQuaternion(
          -breath * 0.02 + Math.sin(t * 0.6) * 0.03,
          microSway * 0.04,
          Math.sin(t * 0.5) * 0.02
        );
      } else if (boneName === 'LeftUpperArm') {
        rot = eulerToQuaternion(0, 0, -0.28 - breath * 0.015);
      } else if (boneName === 'RightUpperArm') {
        rot = eulerToQuaternion(0, 0, 0.28 + breath * 0.015);
      } else if (boneName === 'LeftLowerArm') {
        rot = eulerToQuaternion(0.1, 0, 0);
      } else if (boneName === 'RightLowerArm') {
        rot = eulerToQuaternion(0.1, 0, 0);
      }

      bones.push({
        name: boneName,
        position: { ...pos },
        rotation: rot,
      });
    }

    const blinkT = t % 4.2;
    const isBlink = blinkT > 4.02 && blinkT < 4.16;

    blendshapes.push(
      { name: 'Blink', value: isBlink ? 1.0 : 0 },
      { name: 'Joy', value: 0.1 },
      { name: 'Neutral', value: 0.9 }
    );
  }

  // Generate 6DOF Trackers around key body nodes
  trackers.push(
    { name: 'Tracker_Hips', position: { x: rootPos.x, y: 0.95 + rootPos.y, z: rootPos.z }, rotation: rootRot },
    { name: 'Tracker_Head', position: { x: rootPos.x, y: 1.62 + rootPos.y, z: rootPos.z }, rotation: IDENTITY_QUATERNION },
    { name: 'Tracker_LeftHand', position: { x: -0.65, y: 1.0, z: 0.1 }, rotation: IDENTITY_QUATERNION },
    { name: 'Tracker_RightHand', position: { x: 0.65, y: 1.0, z: 0.1 }, rotation: IDENTITY_QUATERNION },
    { name: 'Tracker_LeftFoot', position: { x: -0.15, y: 0.05, z: 0 }, rotation: IDENTITY_QUATERNION },
    { name: 'Tracker_RightFoot', position: { x: 0.15, y: 0.05, z: 0 }, rotation: IDENTITY_QUATERNION }
  );

  // Dynamic Camera representation
  const camPos: Vector3D = {
    x: Math.sin(t * 0.2) * 0.3,
    y: 1.45,
    z: 2.2 + Math.cos(t * 0.15) * 0.1,
  };
  const cam: VMCCamData = {
    name: 'Camera',
    position: camPos,
    rotation: IDENTITY_QUATERNION,
    fov: 48,
  };

  return {
    timestamp: Date.now(),
    root: { name: 'Root', position: rootPos, rotation: rootRot },
    bones,
    blendshapes,
    trackers,
    cam,
  };
}
