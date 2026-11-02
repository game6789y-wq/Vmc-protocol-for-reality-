/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Search,
  Filter,
  Trash2,
  Pause,
  Play,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  Code2,
} from 'lucide-react';
import { VMCPacket } from '../types/vmc';

interface StreamInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  packets: VMCPacket[];
  onClearPackets: () => void;
}

export const StreamInspector: React.FC<StreamInspectorProps> = ({
  isOpen,
  onClose,
  packets,
  onClearPackets,
}) => {
  const [filterText, setFilterText] = useState('');
  const [filterDirection, setFilterDirection] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [selectedPacket, setSelectedPacket] = useState<VMCPacket | null>(null);

  if (!isOpen) return null;

  const filteredPackets = packets.filter((pkt) => {
    if (filterDirection !== 'all' && pkt.direction !== filterDirection) return false;
    if (!filterText) return true;
    const search = filterText.toLowerCase();
    return (
      pkt.address.toLowerCase().includes(search) ||
      pkt.args.some((arg) => String(arg).toLowerCase().includes(search))
    );
  });

  const displayedPackets = isPaused ? filteredPackets : filteredPackets.slice(-150);

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(packets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `vmc_packets_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Live VMC OSC Inspector</h2>
              <p className="text-xs text-slate-400">
                Inspecting real-time Open Sound Control datagrams ({packets.length} captured)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Log</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close Inspector"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-800/80 bg-slate-950/40 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter by address (e.g. /Bone/Pos) or bone/blend name..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direction Filter */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              {(['all', 'inbound', 'outbound'] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => setFilterDirection(dir)}
                  className={`px-2.5 py-1 rounded text-[11px] capitalize font-medium ${
                    filterDirection === dir ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {dir}
                </button>
              ))}
            </div>

            {/* Pause scroll */}
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                isPaused ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? 'Resume Stream' : 'Pause Stream'}</span>
            </button>

            {/* Clear */}
            <button
              type="button"
              onClick={onClearPackets}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Clear Log"
              aria-label="Clear Log"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Packet Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-950/90 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Dir</th>
                  <th className="py-2.5 px-4 font-semibold">Address</th>
                  <th className="py-2.5 px-4 font-semibold">Subject / Key</th>
                  <th className="py-2.5 px-4 font-semibold">Arguments & Payload</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {displayedPackets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 font-sans">
                      No matching OSC packets captured yet.
                    </td>
                  </tr>
                ) : (
                  displayedPackets.map((pkt) => {
                    const isSelected = selectedPacket?.id === pkt.id;
                    const addressColor = pkt.address.includes('Bone')
                      ? 'text-sky-400'
                      : pkt.address.includes('Blend')
                      ? 'text-emerald-400'
                      : pkt.address.includes('Root')
                      ? 'text-purple-400'
                      : pkt.address.includes('Calib')
                      ? 'text-amber-400'
                      : 'text-slate-300';

                    const firstArg = pkt.args.length > 0 ? String(pkt.args[0]) : '-';
                    const remainingArgs = pkt.args
                      .slice(1)
                      .map((a) => (typeof a === 'number' ? a.toFixed(3) : String(a)))
                      .join(', ');

                    return (
                      <tr
                        key={pkt.id}
                        onClick={() => setSelectedPacket(pkt)}
                        className={`hover:bg-slate-800/60 cursor-pointer transition-colors ${
                          isSelected ? 'bg-sky-950/40 border-l-2 border-sky-400' : ''
                        }`}
                      >
                        <td className="py-2 px-4 whitespace-nowrap">
                          {pkt.direction === 'inbound' ? (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              <span className="text-[10px]">IN</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-sky-400">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span className="text-[10px]">OUT</span>
                            </span>
                          )}
                        </td>
                        <td className={`py-2 px-4 whitespace-nowrap font-bold ${addressColor}`}>
                          {pkt.address}
                        </td>
                        <td className="py-2 px-4 whitespace-nowrap text-white font-medium">
                          {firstArg}
                        </td>
                        <td className="py-2 px-4 text-slate-400 truncate max-w-xs">
                          {remainingArgs || '[]'}
                        </td>
                        <td className="py-2 px-4 whitespace-nowrap text-right text-slate-500">
                          {new Date(pkt.timestamp).toLocaleTimeString([], {
                            hour12: false,
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            fractionalSecondDigits: 3,
                          })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Details Drawer if Packet Selected */}
          {selectedPacket && (
            <div className="w-80 border-l border-slate-800 bg-slate-950/90 p-4 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-semibold text-white">Packet Details</span>
                <button
                  type="button"
                  onClick={() => setSelectedPacket(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <span className="block text-slate-500 text-[10px] uppercase">OSC Address</span>
                <span className="font-mono font-bold text-sky-400 text-sm">
                  {selectedPacket.address}
                </span>
              </div>

              <div>
                <span className="block text-slate-500 text-[10px] uppercase">Timestamp</span>
                <span className="font-mono text-slate-300">
                  {new Date(selectedPacket.timestamp).toISOString()}
                </span>
              </div>

              <div>
                <span className="block text-slate-500 text-[10px] uppercase mb-1">Parsed Arguments</span>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1 font-mono text-[11px]">
                  {selectedPacket.args.map((arg, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="text-slate-500">[{idx}]</span>
                      <span className="text-slate-200">
                        {typeof arg === 'number' ? arg.toFixed(5) : String(arg)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-slate-500 text-[10px] uppercase mb-1">Raw OSC String representation</span>
                <pre className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(selectedPacket, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
