/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeOSCMessage,
  decodeOSCMessage,
  pad4,
  OSCMessage,
} from './osc';
import {
  parseVMCBoneMessage,
  parseVMCRootMessage,
  parseVMCBlendMessage,
  createVMCBoneMessage,
  createVMCRootMessage,
  createVMCBlendMessage,
  createVMCCalibMessage,
  createVMCOKMessage,
  createDeviceHapticMessage,
  normalizeQuaternion,
  slerpQuaternion,
  eulerToQuaternion,
  IDENTITY_QUATERNION,
} from './vmc';
import { generateVMCFrame } from './motionGenerator';
import { VMC_ADDRESSES } from '../types/vmc';

test('pad4 rounds up to nearest multiple of 4', () => {
  assert.equal(pad4(0), 0);
  assert.equal(pad4(1), 4);
  assert.equal(pad4(4), 4);
  assert.equal(pad4(5), 8);
  assert.equal(pad4(11), 12);
  assert.equal(pad4(12), 12);
});

test('OSC message encodes and decodes symmetrically', () => {
  const original: OSCMessage = {
    address: '/test/osc',
    args: ['hello', 42, 3.14159, true, false],
  };

  const encoded = encodeOSCMessage(original);
  assert.ok(encoded.length > 0);
  assert.equal(encoded.length % 4, 0, 'OSC binary packet must be 4-byte aligned');

  const decoded = decodeOSCMessage(encoded);
  assert.equal(decoded.address, '/test/osc');
  assert.equal(decoded.args[0], 'hello');
  assert.equal(decoded.args[1], 42);
  assert.ok(Math.abs((decoded.args[2] as number) - 3.14159) < 0.0001);
  assert.equal(decoded.args[3], true);
  assert.equal(decoded.args[4], false);
});

test('VMC Bone Pos message creates and parses correctly', () => {
  const boneMsg = createVMCBoneMessage(
    'Head',
    { x: 0.1, y: 1.5, z: 0.05 },
    { x: 0, y: 0.38268, z: 0, w: 0.92388 }
  );

  assert.equal(boneMsg.address, VMC_ADDRESSES.BONE_POS);
  assert.equal(boneMsg.args[0], 'Head');

  // Encode to binary and decode
  const binary = encodeOSCMessage(boneMsg);
  const decoded = decodeOSCMessage(binary);
  const parsed = parseVMCBoneMessage(decoded);

  assert.ok(parsed !== null);
  assert.equal(parsed.name, 'Head');
  assert.ok(Math.abs(parsed.position.x - 0.1) < 0.001);
  assert.ok(Math.abs(parsed.position.y - 1.5) < 0.001);
  assert.ok(Math.abs(parsed.rotation.w - 0.92388) < 0.01);
});

test('VMC Root Pos message creates and parses correctly', () => {
  const rootMsg = createVMCRootMessage(
    'Root',
    { x: 0, y: 0.05, z: -0.1 },
    IDENTITY_QUATERNION
  );

  assert.equal(rootMsg.address, VMC_ADDRESSES.ROOT_POS);
  const binary = encodeOSCMessage(rootMsg);
  const decoded = decodeOSCMessage(binary);
  const parsed = parseVMCRootMessage(decoded);

  assert.ok(parsed !== null);
  assert.equal(parsed.name, 'Root');
  assert.ok(Math.abs(parsed.position.y - 0.05) < 0.001);
  assert.equal(parsed.rotation.w, 1);
});

test('VMC BlendShape message creates and parses with 0.0-1.0 clamp', () => {
  const blendMsg = createVMCBlendMessage('Joy', 0.85);
  assert.equal(blendMsg.address, VMC_ADDRESSES.BLEND_VAL);

  const binary = encodeOSCMessage(blendMsg);
  const decoded = decodeOSCMessage(binary);
  const parsed = parseVMCBlendMessage(decoded);

  assert.ok(parsed !== null);
  assert.equal(parsed.name, 'Joy');
  assert.ok(Math.abs(parsed.value - 0.85) < 0.001);
});

test('VMC Calibration and Device Control messages format properly', () => {
  const calibMsg = createVMCCalibMessage(0); // T-Pose
  assert.equal(calibMsg.address, VMC_ADDRESSES.SET_CALIB);
  assert.equal(calibMsg.args[0], 0);

  const okMsg = createVMCOKMessage(1);
  assert.equal(okMsg.address, VMC_ADDRESSES.OK);
  assert.equal(okMsg.args[0], 1);

  const hapticMsg = createDeviceHapticMessage(0.75, 200);
  assert.equal(hapticMsg.address, VMC_ADDRESSES.DEVICE_HAPTIC);
  assert.equal(hapticMsg.args[0], 0.75);
  assert.equal(hapticMsg.args[1], 200);
});

test('Quaternion math: normalize, euler conversion, and slerp', () => {
  const unnorm = { x: 3, y: 0, z: 4, w: 0 };
  const norm = normalizeQuaternion(unnorm);
  const length = Math.sqrt(norm.x * norm.x + norm.y * norm.y + norm.z * norm.z + norm.w * norm.w);
  assert.ok(Math.abs(length - 1.0) < 0.0001);

  // Euler 90 deg around Y
  const qY90 = eulerToQuaternion(0, Math.PI / 2, 0);
  assert.ok(Math.abs(qY90.y - Math.sin(Math.PI / 4)) < 0.001);
  assert.ok(Math.abs(qY90.w - Math.cos(Math.PI / 4)) < 0.001);

  // Slerp halfway
  const qIdent = IDENTITY_QUATERNION;
  const qMid = slerpQuaternion(qIdent, qY90, 0.5);
  const midLen = Math.sqrt(qMid.x * qMid.x + qMid.y * qMid.y + qMid.z * qMid.z + qMid.w * qMid.w);
  assert.ok(Math.abs(midLen - 1.0) < 0.0001);
});

test('Motion Generator produces complete humanoid frame data', () => {
  const frame = generateVMCFrame('idle', 1.0);
  assert.ok(frame.timestamp > 0);
  assert.equal(frame.root.name, 'Root');
  assert.ok(frame.bones.length >= 15);
  assert.ok(frame.blendshapes.length >= 2);
  assert.ok(frame.trackers.length >= 4);
  assert.equal(frame.cam.name, 'Camera');

  // Verify bone names exist
  const boneNames = frame.bones.map((b) => b.name);
  assert.ok(boneNames.includes('Head'));
  assert.ok(boneNames.includes('Hips'));
  assert.ok(boneNames.includes('LeftHand'));
  assert.ok(boneNames.includes('RightHand'));
});
