/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Activity,
  Sliders,
  Smile,
  Video,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  Radio,
  Zap,
  Crosshair,
  ShieldCheck,
  Disc,
} from 'lucide-react';
import {
  ConnectionMode,
  VMCConnectionConfig,
  DeviceControlState,
  STANDARD_BLENDSHAPES,
} from '../types/vmc';
import { MotionPreset } from '../utils/motionGenerator';

interface BottomDockProps {
  config: VMCConnectionConfig;
  onConfigChange: (newConfig: Partial<VMCConnectionConfig>) => void;
  motionPreset: MotionPreset;
  onMotionPresetChange: (preset: MotionPreset) => void;
  deviceControl: DeviceControlState;
  onDeviceControlChange: (control: Partial<DeviceControlState>) => void;
  onTriggerCalibration: (type: 't-pose' | 'a-pose') => void;
  onTriggerHaptic: (intensity: number) => void;
  blendshapeOverrides: Map<string, number>;
  onBlendshapeChange: (name: string, value: number) => void;
  overrideBlendshapes: boolean;
  onToggleBlendshapeOverride: (enabled: boolean) => void;
  // Recording
  isRecording: boolean;
  isPlayingRecorded: boolean;
  recordedFrameCount: number;
  currentPlaybackIndex: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPlayRecording: () => void;
  onPauseRecording: () => void;
  onScrubRecording: (index: number) => void;
  onExportRecording: () => void;
  onImportRecording: (event: React.ChangeEvent<HTMLInputElement>) => void;
  calibrationCountdown: number | null;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  config,
  onConfigChange,
  motionPreset,
  onMotionPresetChange,
  deviceControl,
  onDeviceControlChange,
  onTriggerCalibration,
  onTriggerHaptic,
  blendshapeOverrides,
  onBlendshapeChange,
  overrideBlendshapes,
  onToggleBlendshapeOverride,
  isRecording,
  isPlayingRecorded,
  recordedFrameCount,
  currentPlaybackIndex,
  onStartRecording,
  onStopRecording,
  onPlayRecording,
  onPauseRecording,
  onScrubRecording,
  onExportRecording,
  onImportRecording,
  calibrationCountdown,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'stream' | 'device' | 'face' | 'recorder'>('stream');

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[min(940px,95vw)] z-30 transition-all duration-300">
      {/* Collapse Toggle Bar */}
      <div className="flex justify-center mb-1">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/90 border border-slate-700/80 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
          aria-label={isCollapsed ? 'Show Controls' : 'Hide Controls'}
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
              <span>Collapse Dock</span>
            </>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Navigation Tab Bar */}
          <div className="flex items-center justify-between border-b border-slate-800/80 px-4 pt-2 bg-slate-950/60">
            <nav className="flex space-x-1" aria-label="Control Tabs">
              <button
                type="button"
                onClick={() => setActiveTab('stream')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                  activeTab === 'stream'
                    ? 'text-sky-400 border-sky-400 bg-slate-900'
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>Stream & Source</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('device')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                  activeTab === 'device'
                    ? 'text-sky-400 border-sky-400 bg-slate-900'
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Device Control</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('face')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                  activeTab === 'face'
                    ? 'text-sky-400 border-sky-400 bg-slate-900'
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Smile className="w-4 h-4" />
                <span>Face & Blendshapes</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('recorder')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                  activeTab === 'recorder'
                    ? 'text-sky-400 border-sky-400 bg-slate-900'
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Recorder & Playback</span>
              </button>
            </nav>

            <div className="flex items-center gap-2 pb-1.5 text-xs text-slate-400">
              <span className="font-mono text-slate-400 text-[11px]">VMC v2.3</span>
            </div>
          </div>

          {/* Tab Contents */}
          <div className="p-4 text-slate-200">
            {/* 1. Stream & Source */}
            {activeTab === 'stream' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Connection Mode */}
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Source Connection Mode
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['simulator', 'websocket_bridge', 'udp_relay'] as ConnectionMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => onConfigChange({ mode })}
                          className={`px-2 py-1.5 text-[11px] font-medium rounded-lg text-center transition-all ${
                            config.mode === mode
                              ? 'bg-sky-500 text-white shadow font-semibold'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-white'
                          }`}
                        >
                          {mode === 'simulator' ? 'Simulator' : mode === 'websocket_bridge' ? 'WS Bridge' : 'UDP Relay'}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      {config.mode === 'simulator'
                        ? 'Internal mocap generator emitting real-time 6DOF bones & blendshapes.'
                        : config.mode === 'websocket_bridge'
                        ? 'Connects to backend /ws/vmc relaying external client streams.'
                        : 'Streams directly through backend UDP socket (Port 39539).'}
                    </p>
                  </div>

                  {/* Simulator Motion Presets (when in simulator mode) */}
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Mocap Motion Preset
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['idle', 'walking', 'wave', 'speech', 't_pose', 'a_pose'] as MotionPreset[]).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => onMotionPresetChange(preset)}
                          className={`px-2 py-1 text-[11px] font-medium rounded-md capitalize transition-colors ${
                            motionPreset === preset
                              ? 'bg-sky-600 text-white font-semibold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {preset.replace('_', '-')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rate & Kinematic Smoothing */}
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Stream Rate (FPS)
                      </label>
                      <div className="flex gap-1">
                        {[30, 60, 90].map((fps) => (
                          <button
                            key={fps}
                            type="button"
                            onClick={() => onConfigChange({ streamRateFps: fps })}
                            className={`px-2 py-0.5 text-xs rounded font-mono ${
                              config.streamRateFps === fps
                                ? 'bg-sky-500 text-white font-bold'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {fps}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Motion Smoothing (Slerp)</span>
                        <span className="font-mono text-sky-400">{Math.round(config.smoothing * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.9"
                        step="0.05"
                        value={config.smoothing}
                        onChange={(e) => onConfigChange({ smoothing: parseFloat(e.target.value) })}
                        className="w-full accent-sky-500 bg-slate-800 rounded-lg h-1.5 cursor-pointer"
                        aria-label="Motion Smoothing"
                      />
                    </div>
                  </div>
                </div>

                {/* Target Outbound UDP broadcast config */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-slate-950/40 rounded-xl border border-slate-800/80 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-300">Outbound OSC Target:</span>
                    <span className="font-mono text-sky-400">{config.targetHost}:{config.targetPort}</span>
                    <span className="text-slate-500 text-[11px]">(VRChat/Unity/VSeeFace)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="targetHostInput" className="text-slate-400">Host:</label>
                    <input
                      id="targetHostInput"
                      type="text"
                      value={config.targetHost}
                      onChange={(e) => onConfigChange({ targetHost: e.target.value })}
                      className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono w-28 text-xs"
                    />
                    <label htmlFor="targetPortInput" className="text-slate-400">Port:</label>
                    <input
                      id="targetPortInput"
                      type="number"
                      value={config.targetPort}
                      onChange={(e) => onConfigChange({ targetPort: parseInt(e.target.value) || 39540 })}
                      className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono w-20 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Device Control & Calibration */}
            {activeTab === 'device' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Calibration Triggers */}
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        VMC Calibration Triggers
                      </span>
                      {deviceControl.calibrationState === 'calibrated' ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" />
                          Calibrated
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded-full">
                          Uncalibrated
                        </span>
                      )}
                    </div>

                    {calibrationCountdown !== null ? (
                      <div className="flex flex-col items-center justify-center py-4 bg-sky-950/40 border border-sky-800/50 rounded-lg">
                        <span className="text-2xl font-bold font-mono text-sky-400">{calibrationCountdown}</span>
                        <span className="text-xs text-sky-200 mt-1">Hold Pose...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onTriggerCalibration('t-pose')}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors shadow"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                          <span>T-Pose Calib</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onTriggerCalibration('a-pose')}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                          <span>A-Pose Calib</span>
                        </button>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 mt-2.5">
                      Transmits <code className="text-sky-400">/VMC/Ext/Set/Calib</code> to align 6DOF skeleton coordinates.
                    </p>
                  </div>

                  {/* Device Ping & Haptics */}
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-3">
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Hardware Controls
                    </span>

                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Haptic Pulse Intensity</span>
                        <span className="font-mono text-sky-400">{Math.round(deviceControl.hapticIntensity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={deviceControl.hapticIntensity}
                        onChange={(e) => onDeviceControlChange({ hapticIntensity: parseFloat(e.target.value) })}
                        className="w-full accent-sky-500 bg-slate-800 rounded-lg h-1.5 cursor-pointer"
                        aria-label="Haptic Intensity"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => onTriggerHaptic(deviceControl.hapticIntensity)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Send /VMC/Device/Haptic</span>
                    </button>
                  </div>

                  {/* Tracker Scale & Camera Mode */}
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Tracking Scale & Camera
                    </span>

                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Tracker Position Scale</span>
                        <span className="font-mono text-sky-400">{deviceControl.trackerScaling.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={deviceControl.trackerScaling}
                        onChange={(e) => onDeviceControlChange({ trackerScaling: parseFloat(e.target.value) })}
                        className="w-full accent-sky-500 bg-slate-800 rounded-lg h-1.5 cursor-pointer"
                        aria-label="Tracker Scaling"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span>Camera Follow:</span>
                      <div className="flex gap-1">
                        {(['free', 'follow_head', 'follow_root'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => onDeviceControlChange({ cameraFollowMode: mode })}
                            className={`px-2 py-0.5 rounded text-[11px] capitalize ${
                              deviceControl.cameraFollowMode === mode
                                ? 'bg-sky-500 text-white font-medium'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {mode.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Face & Blendshapes */}
            {activeTab === 'face' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                      <input
                        type="checkbox"
                        checked={overrideBlendshapes}
                        onChange={(e) => onToggleBlendshapeOverride(e.target.checked)}
                        className="w-4 h-4 text-sky-500 rounded bg-slate-800 border-slate-700"
                      />
                      <span>Enable Manual Facial Override</span>
                    </label>
                    <span className="text-slate-500 text-[11px]">(Injects custom `/VMC/Ext/Blend/Val` packets)</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onToggleBlendshapeOverride(true);
                        onBlendshapeChange('Joy', 0.9);
                        onBlendshapeChange('Fun', 0.6);
                      }}
                      className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
                    >
                      Smile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onToggleBlendshapeOverride(true);
                        onBlendshapeChange('Blink_L', 1.0);
                      }}
                      className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
                    >
                      Wink
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onToggleBlendshapeOverride(true);
                        onBlendshapeChange('O', 0.8);
                        onBlendshapeChange('Surprised', 0.7);
                      }}
                      className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
                    >
                      Surprise
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        STANDARD_BLENDSHAPES.forEach((b) => onBlendshapeChange(b, 0));
                        onToggleBlendshapeOverride(false);
                      }}
                      className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Blendshape Sliders Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['Joy', 'Angry', 'Sorrow', 'Fun', 'Blink', 'Blink_L', 'A', 'O'].map((name) => {
                    const val = blendshapeOverrides.get(name) || 0;
                    return (
                      <div key={name} className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                        <div className="flex justify-between text-xs text-slate-300 mb-1">
                          <span className="font-medium">{name}</span>
                          <span className="font-mono text-sky-400">{(val * 100).toFixed(0)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={val}
                          disabled={!overrideBlendshapes}
                          onChange={(e) => onBlendshapeChange(name, parseFloat(e.target.value))}
                          className="w-full accent-sky-500 bg-slate-800 rounded-lg h-1.5 cursor-pointer disabled:opacity-40"
                          aria-label={`Blendshape ${name}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Recorder & Playback */}
            {activeTab === 'recorder' && (
              <div className="space-y-4">
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                  {/* Timeline Scrub */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Timeline Frames</span>
                      <span className="font-mono text-sky-400">
                        {recordedFrameCount > 0
                          ? `${currentPlaybackIndex + 1} / ${recordedFrameCount} frames`
                          : '0 frames'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={Math.max(0, recordedFrameCount - 1)}
                      value={currentPlaybackIndex}
                      disabled={recordedFrameCount === 0 || isRecording}
                      onChange={(e) => onScrubRecording(parseInt(e.target.value) || 0)}
                      className="w-full accent-sky-500 bg-slate-800 rounded-lg h-2 cursor-pointer disabled:opacity-40"
                      aria-label="Timeline scrubber"
                    />
                  </div>

                  {/* Transport Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      {isRecording ? (
                        <button
                          type="button"
                          onClick={onStopRecording}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Disc className="w-4 h-4 text-white" />
                          <span>Stop Recording ({recordedFrameCount})</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onStartRecording}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-red-400 hover:text-red-300 border border-red-900/40 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Disc className="w-4 h-4 text-red-500" />
                          <span>Record VMC Stream</span>
                        </button>
                      )}

                      {recordedFrameCount > 0 && !isRecording && (
                        <>
                          {isPlayingRecorded ? (
                            <button
                              type="button"
                              onClick={onPauseRecording}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              <Pause className="w-3.5 h-3.5" />
                              <span>Pause</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={onPlayRecording}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Play Stream</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onScrubRecording(0)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                            aria-label="Rewind to start"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onExportRecording}
                        disabled={recordedFrameCount === 0}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-sky-400" />
                        <span>Export JSON</span>
                      </button>

                      <label className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-sky-400" />
                        <span>Import Dump</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={onImportRecording}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
