/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  VMC_ADDRESSES,
  VMCBoneData,
  VMCBlendData,
  VMCRootData,
  VMCCamData,
  VMCTrackerData,
  VMCBoneName,
  Quaternion4D,
  Vector3D,
} from '../types/vmc';
import { OSCMessage } from './osc';

/**
 * Standard Humanoid Rig Bone Hierarchy
 * maps each bone to its parent bone in standard VRM/VMC armature.
 */
export const BONE_HIERARCHY: Record<string, string | null> = {
  Hips: null,
  Spine: 'Hips',
  Chest: 'Spine',
  UpperChest: 'Chest',
  Neck: 'UpperChest',
  Head: 'Neck',
  LeftEye: 'Head',
  RightEye: 'Head',
  Jaw: 'Head',
  LeftShoulder: 'UpperChest',
  LeftUpperArm: 'LeftShoulder',
  LeftLowerArm: 'LeftUpperArm',
  LeftHand: 'LeftLowerArm',
  RightShoulder: 'UpperChest',
  RightUpperArm: 'RightShoulder',
  RightLowerArm: 'RightUpperArm',
  RightHand: 'RightLowerArm',
  LeftUpperLeg: 'Hips',
  LeftLowerLeg: 'LeftUpperLeg',
  LeftFoot: 'LeftLowerLeg',
  LeftToes: 'LeftFoot',
  RightUpperLeg: 'Hips',
  RightLowerLeg: 'RightUpperLeg',
  RightFoot: 'RightLowerLeg',
  RightToes: 'RightFoot',
};

/**
 * Default standard Humanoid T-Pose rest positions (relative local offsets).
 */
export const DEFAULT_REST_POSITIONS: Record<string, Vector3D> = {
  Hips: { x: 0, y: 0.95, z: 0 },
  Spine: { x: 0, y: 0.12, z: 0 },
  Chest: { x: 0, y: 0.14, z: 0 },
  UpperChest: { x: 0, y: 0.15, z: 0 },
  Neck: { x: 0, y: 0.1, z: 0 },
  Head: { x: 0, y: 0.14, z: 0 },
  LeftShoulder: { x: 0.12, y: 0.08, z: 0 },
  LeftUpperArm: { x: 0.16, y: 0, z: 0 },
  LeftLowerArm: { x: 0.24, y: 0, z: 0 },
  LeftHand: { x: 0.22, y: 0, z: 0 },
  RightShoulder: { x: -0.12, y: 0.08, z: 0 },
  RightUpperArm: { x: -0.16, y: 0, z: 0 },
  RightLowerArm: { x: -0.24, y: 0, z: 0 },
  RightHand: { x: -0.22, y: 0, z: 0 },
  LeftUpperLeg: { x: 0.1, y: -0.05, z: 0 },
  LeftLowerLeg: { x: 0, y: -0.42, z: 0 },
  LeftFoot: { x: 0, y: -0.4, z: 0 },
  RightUpperLeg: { x: -0.1, y: -0.05, z: 0 },
  RightLowerLeg: { x: 0, y: -0.42, z: 0 },
  RightFoot: { x: 0, y: -0.4, z: 0 },
};

/**
 * Identity quaternion [x=0, y=0, z=0, w=1]
 */
export const IDENTITY_QUATERNION: Quaternion4D = { x: 0, y: 0, z: 0, w: 1 };

/**
 * Parse an OSC message into a VMC Bone Data object if matches /VMC/Ext/Bone/Pos
 */
export function parseVMCBoneMessage(msg: OSCMessage): VMCBoneData | null {
  if (msg.address !== VMC_ADDRESSES.BONE_POS || msg.args.length < 8) {
    return null;
  }
  const name = String(msg.args[0]);
  const px = Number(msg.args[1]) || 0;
  const py = Number(msg.args[2]) || 0;
  const pz = Number(msg.args[3]) || 0;
  const qx = Number(msg.args[4]) || 0;
  const qy = Number(msg.args[5]) || 0;
  const qz = Number(msg.args[6]) || 0;
  const qw = Number(msg.args[7]) || 1;

  return {
    name,
    position: { x: px, y: py, z: pz },
    rotation: normalizeQuaternion({ x: qx, y: qy, z: qz, w: qw }),
  };
}

/**
 * Parse an OSC message into a VMC Root Data object if matches /VMC/Ext/Root/Pos
 */
export function parseVMCRootMessage(msg: OSCMessage): VMCRootData | null {
  if (msg.address !== VMC_ADDRESSES.ROOT_POS || msg.args.length < 8) {
    return null;
  }
  const name = String(msg.args[0]);
  const px = Number(msg.args[1]) || 0;
  const py = Number(msg.args[2]) || 0;
  const pz = Number(msg.args[3]) || 0;
  const qx = Number(msg.args[4]) || 0;
  const qy = Number(msg.args[5]) || 0;
  const qz = Number(msg.args[6]) || 0;
  const qw = Number(msg.args[7]) || 1;

  return {
    name,
    position: { x: px, y: py, z: pz },
    rotation: normalizeQuaternion({ x: qx, y: qy, z: qz, w: qw }),
  };
}

/**
 * Parse an OSC message into a VMC Blendshape Data object if matches /VMC/Ext/Blend/Val
 */
export function parseVMCBlendMessage(msg: OSCMessage): VMCBlendData | null {
  if (msg.address !== VMC_ADDRESSES.BLEND_VAL || msg.args.length < 2) {
    return null;
  }
  const name = String(msg.args[0]);
  const value = Math.max(0, Math.min(1, Number(msg.args[1]) || 0));
  return { name, value };
}

/**
 * Parse an OSC message into a VMC Camera Data object if matches /VMC/Ext/Cam
 */
export function parseVMCCamMessage(msg: OSCMessage): VMCCamData | null {
  if (msg.address !== VMC_ADDRESSES.CAM || msg.args.length < 8) {
    return null;
  }
  const name = String(msg.args[0]);
  const px = Number(msg.args[1]) || 0;
  const py = Number(msg.args[2]) || 0;
  const pz = Number(msg.args[3]) || 0;
  const qx = Number(msg.args[4]) || 0;
  const qy = Number(msg.args[5]) || 0;
  const qz = Number(msg.args[6]) || 0;
  const qw = Number(msg.args[7]) || 1;
  const fov = msg.args.length >= 9 ? Number(msg.args[8]) : 50;

  return {
    name,
    position: { x: px, y: py, z: pz },
    rotation: normalizeQuaternion({ x: qx, y: qy, z: qz, w: qw }),
    fov: fov || 50,
  };
}

/**
 * Parse an OSC message into a VMC Tracker Data object if matches /VMC/Ext/Tra/Pos
 */
export function parseVMCTrackerMessage(msg: OSCMessage): VMCTrackerData | null {
  if (msg.address !== VMC_ADDRESSES.TRA_POS || msg.args.length < 8) {
    return null;
  }
  const name = String(msg.args[0]);
  const px = Number(msg.args[1]) || 0;
  const py = Number(msg.args[2]) || 0;
  const pz = Number(msg.args[3]) || 0;
  const qx = Number(msg.args[4]) || 0;
  const qy = Number(msg.args[5]) || 0;
  const qz = Number(msg.args[6]) || 0;
  const qw = Number(msg.args[7]) || 1;

  return {
    name,
    position: { x: px, y: py, z: pz },
    rotation: normalizeQuaternion({ x: qx, y: qy, z: qz, w: qw }),
  };
}

/**
 * Create a Bone Transform OSC Message for outbound streaming
 */
export function createVMCBoneMessage(
  boneName: VMCBoneName | string,
  pos: Vector3D,
  rot: Quaternion4D
): OSCMessage {
  return {
    address: VMC_ADDRESSES.BONE_POS,
    args: [boneName, pos.x, pos.y, pos.z, rot.x, rot.y, rot.z, rot.w],
  };
}

/**
 * Create a Root Transform OSC Message
 */
export function createVMCRootMessage(
  name: string,
  pos: Vector3D,
  rot: Quaternion4D
): OSCMessage {
  return {
    address: VMC_ADDRESSES.ROOT_POS,
    args: [name, pos.x, pos.y, pos.z, rot.x, rot.y, rot.z, rot.w],
  };
}

/**
 * Create a BlendShape OSC Message
 */
export function createVMCBlendMessage(name: string, value: number): OSCMessage {
  return {
    address: VMC_ADDRESSES.BLEND_VAL,
    args: [name, Number(value.toFixed(4))],
  };
}

/**
 * Create a Blend Apply OSC Message
 */
export function createVMCBlendApplyMessage(): OSCMessage {
  return {
    address: VMC_ADDRESSES.BLEND_APPLY,
    args: [],
  };
}

/**
 * Create a Calibration Trigger OSC Message
 * @param calibType 0 = Normal / T-Pose, 1 = A-Pose, 2 = Reset
 */
export function createVMCCalibMessage(calibType: 0 | 1 | 2 = 0): OSCMessage {
  return {
    address: VMC_ADDRESSES.SET_CALIB,
    args: [calibType],
  };
}

/**
 * Create a Device Status OK OSC Message
 */
export function createVMCOKMessage(status: number = 1): OSCMessage {
  return {
    address: VMC_ADDRESSES.OK,
    args: [status],
  };
}

/**
 * Create a Device Haptic Command
 */
export function createDeviceHapticMessage(intensity: number, durationMs: number = 150): OSCMessage {
  return {
    address: VMC_ADDRESSES.DEVICE_HAPTIC,
    args: [intensity, durationMs],
  };
}

/**
 * Normalize quaternion to ensure valid orientation unit vector.
 */
export function normalizeQuaternion(q: Quaternion4D): Quaternion4D {
  const lenSq = q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w;
  if (lenSq === 0) return { x: 0, y: 0, z: 0, w: 1 };
  const invLen = 1 / Math.sqrt(lenSq);
  return {
    x: q.x * invLen,
    y: q.y * invLen,
    z: q.z * invLen,
    w: q.w * invLen,
  };
}

/**
 * Spherical linear interpolation between two quaternions (slerp)
 */
export function slerpQuaternion(q1: Quaternion4D, q2: Quaternion4D, t: number): Quaternion4D {
  let cosHalfTheta = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;

  let x2 = q2.x;
  let y2 = q2.y;
  let z2 = q2.z;
  let w2 = q2.w;

  if (cosHalfTheta < 0) {
    w2 = -w2;
    x2 = -x2;
    y2 = -y2;
    z2 = -z2;
    cosHalfTheta = -cosHalfTheta;
  }

  if (Math.abs(cosHalfTheta) >= 1.0) {
    return { x: q1.x, y: q1.y, z: q1.z, w: q1.w };
  }

  const halfTheta = Math.acos(cosHalfTheta);
  const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

  if (Math.abs(sinHalfTheta) < 0.001) {
    return {
      x: q1.x * 0.5 + x2 * 0.5,
      y: q1.y * 0.5 + y2 * 0.5,
      z: q1.z * 0.5 + z2 * 0.5,
      w: q1.w * 0.5 + w2 * 0.5,
    };
  }

  const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

  return {
    x: q1.x * ratioA + x2 * ratioB,
    y: q1.y * ratioA + y2 * ratioB,
    z: q1.z * ratioA + z2 * ratioB,
    w: q1.w * ratioA + w2 * ratioB,
  };
}

/**
 * Linear vector interpolation
 */
export function lerpVector(v1: Vector3D, v2: Vector3D, t: number): Vector3D {
  return {
    x: v1.x + (v2.x - v1.x) * t,
    y: v1.y + (v2.y - v1.y) * t,
    z: v1.z + (v2.z - v1.z) * t,
  };
}

/**
 * Euler Angles (in radians) to Quaternion converter
 * Order: YXZ (standard for VRM humanoid joints)
 */
export function eulerToQuaternion(rx: number, ry: number, rz: number): Quaternion4D {
  const c1 = Math.cos(ry / 2);
  const c2 = Math.cos(rx / 2);
  const c3 = Math.cos(rz / 2);
  const s1 = Math.sin(ry / 2);
  const s2 = Math.sin(rx / 2);
  const s3 = Math.sin(rz / 2);

  return {
    x: s1 * s2 * c3 + c1 * s2 * c3,
    y: s1 * c2 * c3 + c1 * s2 * s3,
    z: c1 * c2 * s3 - s1 * s2 * c3,
    w: c1 * c2 * c3 - s1 * s2 * s3,
  };
}
