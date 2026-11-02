/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThreeViewport } from './components/ThreeViewport';
import { HeaderBar } from './components/HeaderBar';
import { BottomDock } from './components/BottomDock';
import { StreamInspector } from './components/StreamInspector';
import {
  VMCRootData,
  VMCBoneData,
  VMCTrackerData,
  VMCCamData,
  VMCPacket,
  VMCStreamStats,
  VMCConnectionConfig,
  DeviceControlState,
  VMC_ADDRESSES,
} from './types/vmc';
import {
  DEFAULT_REST_POSITIONS,
  IDENTITY_QUATERNION,
  createVMCBoneMessage,
  createVMCRootMessage,
  createVMCBlendMessage,
  createVMCCalibMessage,
  createVMCOKMessage,
  createDeviceHapticMessage,
  parseVMCBoneMessage,
  parseVMCRootMessage,
  parseVMCBlendMessage,
  parseVMCCamMessage,
  parseVMCTrackerMessage,
  slerpQuaternion,
  lerpVector,
} from './utils/vmc';
import { generateVMCFrame, MotionPreset, GeneratedVMCFrame } from './utils/motionGenerator';
import { OSCMessage } from './utils/osc';

export default function App() {
  // Connection Configuration
  const [config, setConfig] = useState<VMCConnectionConfig>({
    mode: 'simulator',
    wsUrl: `ws://${window.location.host}/ws/vmc`,
    udpPort: 39539,
    targetHost: '127.0.0.1',
    targetPort: 39540,
    streamRateFps: 60,
    smoothing: 0.25,
    autoReconnect: true,
  });

  // Motion Preset for built-in generator
  const [motionPreset, setMotionPreset] = useState<MotionPreset>('idle');
  const [isStreaming, setIsStreaming] = useState(true);

  // Viewport display toggles
  const [showTrackers, setShowTrackers] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showMesh, setShowMesh] = useState(true);

  // Inspector modal toggle
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [packetsLog, setPacketsLog] = useState<VMCPacket[]>([]);

  // Device Control & Calibration
  const [deviceControl, setDeviceControl] = useState<DeviceControlState>({
    calibrationState: 'calibrated',
    calibrationType: 't-pose',
    trackerScaling: 1.0,
    hapticIntensity: 0.7,
    lightRgb: [0.2, 0.7, 1.0],
    cameraFollowMode: 'free',
    selectedBone: null,
  });
  const [calibrationCountdown, setCalibrationCountdown] = useState<number | null>(null);

  // Facial Blendshape Manual Overrides
  const [overrideBlendshapes, setOverrideBlendshapes] = useState(false);
  const [blendshapeOverrides, setBlendshapeOverrides] = useState<Map<string, number>>(new Map());

  // Real-Time Humanoid Kinematic State
  const [rootData, setRootData] = useState<VMCRootData>({
    name: 'Root',
    position: { x: 0, y: 0, z: 0 },
    rotation: IDENTITY_QUATERNION,
  });

  const [bonesMap, setBonesMap] = useState<Map<string, VMCBoneData>>(() => {
    const map = new Map<string, VMCBoneData>();
    for (const [name, pos] of Object.entries(DEFAULT_REST_POSITIONS)) {
      map.set(name, {
        name,
        position: { ...pos },
        rotation: IDENTITY_QUATERNION,
      });
    }
    return map;
  });

  const [blendshapesMap, setBlendshapesMap] = useState<Map<string, number>>(new Map());
  const [trackers, setTrackers] = useState<VMCTrackerData[]>([]);
  const [camData, setCamData] = useState<VMCCamData | undefined>();

  // Stream Telemetry Metrics
  const [stats, setStats] = useState<VMCStreamStats>({
    packetsPerSec: 0,
    bytesPerSec: 0,
    totalPackets: 0,
    lastPacketTime: Date.now(),
    latencyMs: 1.8,
    activeBonesCount: 20,
    activeBlendshapesCount: 12,
    calibrated: true,
  });

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
  const [recordedFrames, setRecordedFrames] = useState<GeneratedVMCFrame[]>([]);
  const [currentPlaybackIndex, setCurrentPlaybackIndex] = useState(0);

  // Refs for high-speed streaming loop
  const wsRef = useRef<WebSocket | null>(null);
  const packetCountWindowRef = useRef(0);
  const lastPacketSecRef = useRef(Date.now());
  const elapsedSecRef = useRef(0);
  const configRef = useRef(config);
  configRef.current = config;

  const motionPresetRef = useRef(motionPreset);
  motionPresetRef.current = motionPreset;

  const isStreamingRef = useRef(isStreaming);
  isStreamingRef.current = isStreaming;

  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  const isPlayingRecordedRef = useRef(isPlayingRecorded);
  isPlayingRecordedRef.current = isPlayingRecorded;

  const recordedFramesRef = useRef(recordedFrames);
  recordedFramesRef.current = recordedFrames;

  const currentPlaybackIndexRef = useRef(currentPlaybackIndex);
  currentPlaybackIndexRef.current = currentPlaybackIndex;

  const overrideBlendshapesRef = useRef(overrideBlendshapes);
  overrideBlendshapesRef.current = overrideBlendshapes;

  const blendshapeOverridesRef = useRef(blendshapeOverrides);
  blendshapeOverridesRef.current = blendshapeOverrides;

  // Add packet to rolling inspector log (capped at 300)
  const logPacket = useCallback((pkt: VMCPacket) => {
    setPacketsLog((prev) => {
      const next = [...prev, pkt];
      if (next.length > 300) return next.slice(-300);
      return next;
    });
  }, []);

  // Dispatch OSC Packet out through WebSocket backend or simulator
  const dispatchOutboundPacket = useCallback((msg: OSCMessage) => {
    const pkt: VMCPacket = {
      id: Math.random().toString(36).slice(2, 9),
      timestamp: Date.now(),
      address: msg.address,
      args: msg.args.map((a) => (a instanceof Uint8Array ? '[binary]' : a)),
      direction: 'outbound',
    };
    logPacket(pkt);

    // If WebSocket is open and connected to server, send to outbound UDP
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'send_osc',
          targetHost: configRef.current.targetHost,
          targetPort: configRef.current.targetPort,
          packet: msg,
        })
      );
    }
  }, [logPacket]);

  // Connect to WebSocket server for bridge/relay
  useEffect(() => {
    if (config.mode === 'simulator') return;

    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWS = () => {
      try {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${proto}//${window.location.host}/ws/vmc`;
        socket = new WebSocket(url);
        wsRef.current = socket;

        socket.onopen = () => {
          console.log('[App] Connected to VMC WebSocket Bridge');
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'osc_packet' && data.packet) {
              const osc: OSCMessage = data.packet;

              // Log
              const pkt: VMCPacket = {
                id: Math.random().toString(36).slice(2, 9),
                timestamp: data.timestamp || Date.now(),
                address: osc.address,
                args: osc.args || [],
                direction: 'inbound',
              };
              logPacket(pkt);

              // Update stats
              packetCountWindowRef.current++;

              // Route packet
              if (osc.address === VMC_ADDRESSES.BONE_POS) {
                const b = parseVMCBoneMessage(osc);
                if (b) {
                  setBonesMap((prev) => {
                    const next = new Map(prev);
                    next.set(b.name, b);
                    return next;
                  });
                }
              } else if (osc.address === VMC_ADDRESSES.ROOT_POS) {
                const r = parseVMCRootMessage(osc);
                if (r) setRootData(r);
              } else if (osc.address === VMC_ADDRESSES.BLEND_VAL) {
                const bl = parseVMCBlendMessage(osc);
                if (bl) {
                  setBlendshapesMap((prev) => {
                    const next = new Map(prev);
                    next.set(bl.name, bl.value);
                    return next;
                  });
                }
              } else if (osc.address === VMC_ADDRESSES.CAM) {
                const c = parseVMCCamMessage(osc);
                if (c) setCamData(c);
              } else if (osc.address === VMC_ADDRESSES.TRA_POS) {
                const tr = parseVMCTrackerMessage(osc);
                if (tr) {
                  setTrackers((prev) => {
                    const filtered = prev.filter((p) => p.name !== tr.name);
                    return [...filtered, tr];
                  });
                }
              }
            }
          } catch {
            // non-json
          }
        };

        socket.onclose = () => {
          if (config.autoReconnect) {
            reconnectTimeout = setTimeout(connectWS, 2000);
          }
        };
      } catch (e) {
        // ws error
      }
    };

    connectWS();

    return () => {
      clearTimeout(reconnectTimeout);
      if (socket) socket.close();
      wsRef.current = null;
    };
  }, [config.mode, config.autoReconnect, logPacket]);

  // Main Streaming & Animation Loop (Handles Simulator & Playback)
  useEffect(() => {
    let intervalId: any = null;
    const intervalMs = Math.round(1000 / config.streamRateFps);

    intervalId = setInterval(() => {
      if (!isStreamingRef.current) return;

      const now = Date.now();
      packetCountWindowRef.current += 1;

      // Handle recorded session playback
      if (isPlayingRecordedRef.current && recordedFramesRef.current.length > 0) {
        const frames = recordedFramesRef.current;
        let nextIdx = currentPlaybackIndexRef.current + 1;
        if (nextIdx >= frames.length) nextIdx = 0; // loop
        setCurrentPlaybackIndex(nextIdx);

        const currentFrame = frames[nextIdx];
        if (currentFrame) {
          setRootData(currentFrame.root);
          const bMap = new Map<string, VMCBoneData>();
          for (const b of currentFrame.bones) bMap.set(b.name, b);
          setBonesMap(bMap);

          const blMap = new Map<string, number>();
          for (const bl of currentFrame.blendshapes) blMap.set(bl.name, bl.value);
          setBlendshapesMap(blMap);

          setTrackers(currentFrame.trackers);
          setCamData(currentFrame.cam);
        }
        return;
      }

      // Handle Simulator Generation
      if (configRef.current.mode === 'simulator') {
        elapsedSecRef.current += intervalMs / 1000;
        const frame = generateVMCFrame(motionPresetRef.current, elapsedSecRef.current);

        // Apply Facial Overrides if user enabled them
        if (overrideBlendshapesRef.current) {
          for (const [k, v] of blendshapeOverridesRef.current.entries()) {
            const existing = frame.blendshapes.find((b) => b.name === k);
            if (existing) existing.value = v;
            else frame.blendshapes.push({ name: k, value: v });
          }
        }

        // Apply Kinematic Smoothing if enabled
        const smoothFactor = 1 - configRef.current.smoothing;
        if (smoothFactor < 0.99) {
          setRootData((prev) => ({
            name: frame.root.name,
            position: lerpVector(prev.position, frame.root.position, smoothFactor),
            rotation: slerpQuaternion(prev.rotation, frame.root.rotation, smoothFactor),
          }));

          setBonesMap((prev) => {
            const next = new Map(prev);
            for (const b of frame.bones) {
              const old = prev.get(b.name);
              if (old) {
                next.set(b.name, {
                  name: b.name,
                  position: lerpVector(old.position, b.position, smoothFactor),
                  rotation: slerpQuaternion(old.rotation, b.rotation, smoothFactor),
                });
              } else {
                next.set(b.name, b);
              }
            }
            return next;
          });
        } else {
          setRootData(frame.root);
          const nextBones = new Map<string, VMCBoneData>();
          for (const b of frame.bones) nextBones.set(b.name, b);
          setBonesMap(nextBones);
        }

        const nextBlend = new Map<string, number>();
        for (const bl of frame.blendshapes) nextBlend.set(bl.name, bl.value);
        setBlendshapesMap(nextBlend);

        setTrackers(frame.trackers);
        setCamData(frame.cam);

        // Record frame if recording is active
        if (isRecordingRef.current) {
          setRecordedFrames((prev) => [...prev, frame]);
        }

        // Log sample packet periodically (1 in every 10 frames to keep UI fast)
        if (packetCountWindowRef.current % 10 === 0) {
          const sampleBone = frame.bones[0];
          if (sampleBone) {
            logPacket({
              id: Math.random().toString(36).slice(2, 9),
              timestamp: now,
              address: VMC_ADDRESSES.BONE_POS,
              args: [
                sampleBone.name,
                sampleBone.position.x,
                sampleBone.position.y,
                sampleBone.position.z,
                sampleBone.rotation.x,
                sampleBone.rotation.y,
                sampleBone.rotation.z,
                sampleBone.rotation.w,
              ],
              direction: 'inbound',
            });
          }
        }
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [config.streamRateFps, logPacket]);

  // Telemetry Rate Calculator (runs every 1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const deltaSec = (now - lastPacketSecRef.current) / 1000;
      if (deltaSec > 0) {
        const added = packetCountWindowRef.current;
        packetCountWindowRef.current = 0;
        const rate = added / deltaSec;
        setStats((prev) => ({
          ...prev,
          packetsPerSec: rate,
          totalPackets: prev.totalPackets + added,
          lastPacketTime: now,
          activeBonesCount: bonesMap.size,
          activeBlendshapesCount: blendshapesMap.size,
          latencyMs: 1.5 + Math.random() * 0.8,
        }));
        lastPacketSecRef.current = now;
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [bonesMap.size, blendshapesMap.size]);

  // Trigger Calibration Flow
  const handleTriggerCalibration = (type: 't-pose' | 'a-pose') => {
    setDeviceControl((prev) => ({ ...prev, calibrationState: 'calibrating', calibrationType: type }));
    setCalibrationCountdown(3);

    const timer = setInterval(() => {
      setCalibrationCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Set pose
          setMotionPreset(type === 't-pose' ? 't_pose' : 'a_pose');
          // Dispatch VMC OSC Calibration Packet
          const calibTypeNum = type === 't-pose' ? 0 : 1;
          dispatchOutboundPacket(createVMCCalibMessage(calibTypeNum));
          dispatchOutboundPacket(createVMCOKMessage(1));

          setDeviceControl((d) => ({ ...d, calibrationState: 'calibrated' }));
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Trigger Haptic Pulse
  const handleTriggerHaptic = (intensity: number) => {
    dispatchOutboundPacket(createDeviceHapticMessage(intensity, 200));
  };

  // Facial Blendshape Change
  const handleBlendshapeChange = (name: string, value: number) => {
    setBlendshapeOverrides((prev) => {
      const next = new Map(prev);
      next.set(name, value);
      return next;
    });
    // Send /VMC/Ext/Blend/Val packet
    dispatchOutboundPacket(createVMCBlendMessage(name, value));
  };

  // Recording Controls
  const handleStartRecording = () => {
    setRecordedFrames([]);
    setCurrentPlaybackIndex(0);
    setIsRecording(true);
    setIsPlayingRecorded(false);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handleExportRecording = () => {
    if (recordedFrames.length === 0) return;
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(recordedFrames, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', jsonStr);
    dl.setAttribute('download', `vmc_session_${Date.now()}.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
  };

  const handleImportRecording = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecordedFrames(parsed);
          setCurrentPlaybackIndex(0);
          setIsPlayingRecorded(true);
        }
      } catch {
        alert('Invalid VMC session JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 flex flex-col">
      {/* Top Bar Header */}
      <HeaderBar
        stats={stats}
        isStreaming={isStreaming}
        onToggleStreaming={() => setIsStreaming(!isStreaming)}
        connectionMode={config.mode}
        onOpenInspector={() => setIsInspectorOpen(true)}
        showTrackers={showTrackers}
        onToggleTrackers={() => setShowTrackers(!showTrackers)}
        showSkeleton={showSkeleton}
        onToggleSkeleton={() => setShowSkeleton(!showSkeleton)}
        onResetCamera={() => {
          // Trigger re-centering
          setRootData((r) => ({ ...r, position: { x: 0, y: 0, z: 0 } }));
        }}
      />

      {/* Main 3D Viewport (Full Viewport, 100% Unobstructed Center) */}
      <main className="flex-1 w-full h-full relative" aria-label="3D VMC Mannequin Stage">
        <ThreeViewport
          rootData={rootData}
          bonesMap={bonesMap}
          blendshapesMap={blendshapesMap}
          trackers={trackers}
          camData={camData}
          showTrackers={showTrackers}
          showSkeleton={showSkeleton}
          showMesh={showMesh}
        />
      </main>

      {/* Collapsible Bottom Control Dock */}
      <BottomDock
        config={config}
        onConfigChange={(newCfg) => setConfig((c) => ({ ...c, ...newCfg }))}
        motionPreset={motionPreset}
        onMotionPresetChange={setMotionPreset}
        deviceControl={deviceControl}
        onDeviceControlChange={(dc) => setDeviceControl((d) => ({ ...d, ...dc }))}
        onTriggerCalibration={handleTriggerCalibration}
        onTriggerHaptic={handleTriggerHaptic}
        blendshapeOverrides={blendshapeOverrides}
        onBlendshapeChange={handleBlendshapeChange}
        overrideBlendshapes={overrideBlendshapes}
        onToggleBlendshapeOverride={setOverrideBlendshapes}
        isRecording={isRecording}
        isPlayingRecorded={isPlayingRecorded}
        recordedFrameCount={recordedFrames.length}
        currentPlaybackIndex={currentPlaybackIndex}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onPlayRecording={() => setIsPlayingRecorded(true)}
        onPauseRecording={() => setIsPlayingRecorded(false)}
        onScrubRecording={(idx) => {
          setCurrentPlaybackIndex(idx);
          const f = recordedFrames[idx];
          if (f) {
            setRootData(f.root);
            const bm = new Map<string, VMCBoneData>();
            for (const b of f.bones) bm.set(b.name, b);
            setBonesMap(bm);
          }
        }}
        onExportRecording={handleExportRecording}
        onImportRecording={handleImportRecording}
        calibrationCountdown={calibrationCountdown}
      />

      {/* OSC Inspector Modal */}
      <StreamInspector
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        packets={packetsLog}
        onClearPackets={() => setPacketsLog([])}
      />
    </div>
  );
}
