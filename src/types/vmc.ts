/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Standard Humanoid VRM / VMC Bone Names
export type VMCBoneName =
  | 'Hips'
  | 'Spine'
  | 'Chest'
  | 'UpperChest'
  | 'Neck'
  | 'Head'
  | 'LeftEye'
  | 'RightEye'
  | 'Jaw'
  | 'LeftShoulder'
  | 'LeftUpperArm'
  | 'LeftLowerArm'
  | 'LeftHand'
  | 'RightShoulder'
  | 'RightUpperArm'
  | 'RightLowerArm'
  | 'RightHand'
  | 'LeftUpperLeg'
  | 'LeftLowerLeg'
  | 'LeftFoot'
  | 'LeftToes'
  | 'RightUpperLeg'
  | 'RightLowerLeg'
  | 'RightFoot'
  | 'RightToes'
  | 'LeftThumbProximal'
  | 'LeftThumbIntermediate'
  | 'LeftThumbDistal'
  | 'LeftIndexProximal'
  | 'LeftIndexIntermediate'
  | 'LeftIndexDistal'
  | 'RightThumbProximal'
  | 'RightThumbIntermediate'
  | 'RightThumbDistal'
  | 'RightIndexProximal'
  | 'RightIndexIntermediate'
  | 'RightIndexDistal';

export const CORE_VMC_BONES: VMCBoneName[] = [
  'Hips',
  'Spine',
  'Chest',
  'UpperChest',
  'Neck',
  'Head',
  'LeftShoulder',
  'LeftUpperArm',
  'LeftLowerArm',
  'LeftHand',
  'RightShoulder',
  'RightUpperArm',
  'RightLowerArm',
  'RightHand',
  'LeftUpperLeg',
  'LeftLowerLeg',
  'LeftFoot',
  'RightUpperLeg',
  'RightLowerLeg',
  'RightFoot',
];

// Standard VMC / VRM Blendshapes
export type VMCBlendShapeName =
  | 'Joy'
  | 'Angry'
  | 'Sorrow'
  | 'Fun'
  | 'Surprised'
  | 'Blink'
  | 'Blink_L'
  | 'Blink_R'
  | 'A'
  | 'I'
  | 'U'
  | 'E'
  | 'O'
  | 'Neutral'
  | 'LookUp'
  | 'LookDown'
  | 'LookLeft'
  | 'LookRight';

export const STANDARD_BLENDSHAPES: VMCBlendShapeName[] = [
  'Joy',
  'Angry',
  'Sorrow',
  'Fun',
  'Surprised',
  'Blink',
  'Blink_L',
  'Blink_R',
  'A',
  'I',
  'U',
  'E',
  'O',
  'Neutral',
];

// Standard VMC Protocol OSC Addresses
export const VMC_ADDRESSES = {
  ROOT_POS: '/VMC/Ext/Root/Pos',
  BONE_POS: '/VMC/Ext/Bone/Pos',
  BLEND_VAL: '/VMC/Ext/Blend/Val',
  BLEND_APPLY: '/VMC/Ext/Blend/Apply',
  CAM: '/VMC/Ext/Cam',
  TRA_POS: '/VMC/Ext/Tra/Pos',
  OK: '/VMC/Ext/OK',
  TIME: '/VMC/Ext/T',
  SET_CALIB: '/VMC/Ext/Set/Calib',
  SET_CONFIG: '/VMC/Ext/Set/Config',
  DEVICE_HAPTIC: '/VMC/Device/Haptic',
  DEVICE_LIGHT: '/VMC/Device/Light',
  DEVICE_RESET: '/VMC/Device/Reset',
} as const;

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion4D {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface VMCRootData {
  name: string;
  position: Vector3D;
  rotation: Quaternion4D;
}

export interface VMCBoneData {
  name: VMCBoneName | string;
  position: Vector3D;
  rotation: Quaternion4D;
}

export interface VMCBlendData {
  name: string;
  value: number; // 0.0 - 1.0
}

export interface VMCCamData {
  name: string;
  position: Vector3D;
  rotation: Quaternion4D;
  fov: number;
}

export interface VMCTrackerData {
  name: string;
  position: Vector3D;
  rotation: Quaternion4D;
}

export interface VMCPacket {
  id: string;
  timestamp: number;
  address: string;
  args: (string | number | boolean | Uint8Array)[];
  direction: 'inbound' | 'outbound';
  rawSize?: number;
}

export interface VMCStreamStats {
  packetsPerSec: number;
  bytesPerSec: number;
  totalPackets: number;
  lastPacketTime: number;
  latencyMs: number;
  activeBonesCount: number;
  activeBlendshapesCount: number;
  calibrated: boolean;
}

export type ConnectionMode = 'simulator' | 'websocket_bridge' | 'udp_relay';

export interface VMCConnectionConfig {
  mode: ConnectionMode;
  wsUrl: string;
  udpPort: number;
  targetHost: string;
  targetPort: number;
  streamRateFps: number; // 30, 60, 90
  smoothing: number; // 0.0 - 1.0
  autoReconnect: boolean;
}

export interface DeviceControlState {
  calibrationState: 'idle' | 'calibrating' | 'calibrated';
  calibrationType: 't-pose' | 'a-pose' | 'neutral';
  trackerScaling: number;
  hapticIntensity: number;
  lightRgb: [number, number, number];
  cameraFollowMode: 'free' | 'follow_head' | 'follow_root' | 'orbit';
  selectedBone: VMCBoneName | null;
}
