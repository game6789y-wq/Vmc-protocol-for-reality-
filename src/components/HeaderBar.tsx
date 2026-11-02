/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Activity,
  Play,
  Square,
  Terminal,
  Crosshair,
  Layers,
  Camera,
  Share2,
} from 'lucide-react';
import { VMCStreamStats, ConnectionMode } from '../types/vmc';

interface HeaderBarProps {
  stats: VMCStreamStats;
  isStreaming: boolean;
  onToggleStreaming: () => void;
  connectionMode: ConnectionMode;
  onOpenInspector: () => void;
  showTrackers: boolean;
  onToggleTrackers: () => void;
  showSkeleton: boolean;
  onToggleSkeleton: () => void;
  onResetCamera: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  stats,
  isStreaming,
  onToggleStreaming,
  connectionMode,
  onOpenInspector,
  showTrackers,
  onToggleTrackers,
  showSkeleton,
  onToggleSkeleton,
  onResetCamera,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-none text-slate-200">
      {/* Title & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 font-bold font-mono text-sm">
            VMC
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              VMC Protocol Studio
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-800/60 font-semibold">
                OSC 1.0
              </span>
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="capitalize">{connectionMode.replace('_', ' ')}</span>
              <span>•</span>
              <span className={isStreaming ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                {isStreaming ? 'Streaming Live' : 'Stream Paused'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Stream Telemetry Metrics Bar */}
      <div className="flex items-center gap-4 px-3 py-1.5 bg-slate-900/90 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-400 text-[11px]">Rate:</span>
          <span className="font-mono font-bold text-sky-400">
            {stats.packetsPerSec.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">pkt/s</span>
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 border-l border-slate-800 pl-3">
          <span className="text-slate-400 text-[11px]">Latency:</span>
          <span className="font-mono text-emerald-400 font-semibold">
            {stats.latencyMs.toFixed(1)} ms
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 border-l border-slate-800 pl-3">
          <span className="text-slate-400 text-[11px]">Bones:</span>
          <span className="font-mono text-slate-200">
            {stats.activeBonesCount}/20
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 border-l border-slate-800 pl-3">
          <span className="text-slate-400 text-[11px]">Packets:</span>
          <span className="font-mono text-slate-200">
            {stats.totalPackets.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Toggle Stream */}
        <button
          type="button"
          onClick={onToggleStreaming}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow ${
            isStreaming
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
          aria-label={isStreaming ? 'Pause VMC Stream' : 'Start VMC Stream'}
        >
          {isStreaming ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Pause Stream</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Stream</span>
            </>
          )}
        </button>

        {/* Viewport controls */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={onToggleSkeleton}
            className={`p-1.5 rounded text-xs transition-colors ${
              showSkeleton ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle Skeleton Joints"
            aria-label="Toggle Skeleton"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleTrackers}
            className={`p-1.5 rounded text-xs transition-colors ${
              showTrackers ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle 6DOF VR Trackers"
            aria-label="Toggle Trackers"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onResetCamera}
            className="p-1.5 rounded text-xs text-slate-400 hover:text-white transition-colors"
            title="Reset Camera View"
            aria-label="Reset Camera"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* Inspect OSC Modal trigger */}
        <button
          type="button"
          onClick={onOpenInspector}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs font-medium text-slate-200 transition-colors"
          aria-label="Inspect OSC Packets"
        >
          <Terminal className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">OSC Inspector</span>
        </button>
      </div>
    </header>
  );
};
