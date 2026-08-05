import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Info, Building2, Home, Settings, Trophy, AlertCircle, ChevronDown, Check, Search, Cpu, Zap, Activity, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip, Brush } from 'recharts';
import { BuildingData } from '../types';
import { cn } from '../lib/utils';

interface BuildingGridProps {
  buildings: BuildingData[];
  onDataUpdate?: (flowData: Record<string, number>) => void;
}

const TypeIcon = ({ type }: { type: BuildingData['type'] }) => {
  switch (type) {
    case 'Academic': return <Building2 className="w-4 h-4" />;
    case 'Residential': return <Home className="w-4 h-4" />;
    case 'Administrative': return <Settings className="w-4 h-4" />;
    case 'Athletic': return <Trophy className="w-4 h-4" />;
    default: return <Building2 className="w-4 h-4" />;
  }
};

export const BuildingGrid: React.FC<BuildingGridProps> = ({ buildings, onDataUpdate }) => {
  const [selectedId, setSelectedId] = useState<string>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [liveUsage, setLiveUsage] = useState<Record<string, number>>({});
  const [flowRates, setFlowRates] = useState<Record<string, number>>({});
  const [flowHistory, setFlowHistory] = useState<Record<string, { time: string, flow: number }[]>>({});
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Theme detection
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

    return () => observer.disconnect();
  }, []);

  // Initialize and update live usage and flow rates
  useEffect(() => {
    // Initial state
    const initialUsage: Record<string, number> = {};
    const initialFlow: Record<string, number> = {};
    const initialHistory: Record<string, { time: string, flow: number }[]> = {};
    
    buildings.forEach(b => {
      initialUsage[b.id] = b.currentUsage;
      const startFlow = 1.2 + Math.random() * 2;
      initialFlow[b.id] = startFlow;
      
      // Pre-fill some history
      initialHistory[b.id] = Array.from({ length: 30 }, (_, i) => ({
        time: `${i}:00`,
        flow: startFlow + (Math.random() - 0.5) * 0.5
      }));
    });
    
    setLiveUsage(initialUsage);
    setFlowRates(initialFlow);
    setFlowHistory(initialHistory);

    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      // Update Usage
      setLiveUsage(prev => {
        const next = { ...prev };
        buildings.forEach(b => {
          const current = prev[b.id] || b.currentUsage;
          const fluctuation = current * (Math.random() * 0.01 - 0.005);
          next[b.id] = Math.max(0, current + fluctuation);
        });
        return next;
      });

      // Update Flow Rates and History together for consistency
      setFlowRates(prevFlows => {
        const nextFlows = { ...prevFlows };
        const updates: Record<string, number> = {};
        
        buildings.forEach(b => {
          const current = prevFlows[b.id] || 1.5;
          const fluctuation = (Math.random() - 0.5) * 0.4;
          const newFlow = Math.max(0.1, Math.min(8.0, current + fluctuation));
          nextFlows[b.id] = newFlow;
          updates[b.id] = newFlow;
        });

        setFlowHistory(prevHistory => {
          if (isPaused) return prevHistory;
          const nextHistory = { ...prevHistory };
          buildings.forEach(b => {
            const history = prevHistory[b.id] || [];
            const newPoint = { time: now, flow: updates[b.id] };
            nextHistory[b.id] = [...history.slice(-29), newPoint]; // Keep last 30 points
          });
          return nextHistory;
        });

        return nextFlows;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [buildings, isPaused]);

  // Sync flow rates to parent for leak detection
  useEffect(() => {
    if (onDataUpdate && Object.keys(flowRates).length > 0) {
      onDataUpdate(flowRates);
    }
  }, [flowRates, onDataUpdate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedBuilding = useMemo(() => {
    return buildings.find(b => b.id === selectedId);
  }, [buildings, selectedId]);

  const getStatusColor = (usage: number, limit: number) => {
    const percentage = (usage / limit) * 100;
    if (percentage >= 95) return 'bg-red-500';
    if (percentage >= 85) return 'bg-orange-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-brand-primary';
  };

  const getStatusBg = (usage: number, limit: number) => {
    const percentage = (usage / limit) * 100;
    if (percentage >= 95) return 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-700 dark:text-red-400';
    if (percentage >= 85) return 'bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20 text-orange-700 dark:text-orange-400';
    if (percentage >= 70) return 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-100 dark:border-yellow-500/20 text-yellow-700 dark:text-yellow-400';
    return 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-400';
  };

  const formatValue = (val: number) => {
    return (val * 1000).toLocaleString();
  };

  const unitLabel = 'L';

  const formatFlow = (val: number) => {
    return val.toFixed(2);
  };

  const flowLabel = 'L/s';

  const renderBuildingCard = (building: BuildingData, isCompact = false) => {
    const currentUsage = liveUsage[building.id] || building.currentUsage;
    const currentFlow = flowRates[building.id] || 0;
    const percentage = (currentUsage / building.dailyLimit) * 100;
    const isAnomaly = building.status === 'Warning' || building.status === 'Critical';

    return (
      <motion.div
        layout
        key={building.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        onMouseEnter={() => isCompact && setHoveredId(building.id)}
        onMouseLeave={() => isCompact && setHoveredId(null)}
        className={cn(
          "card-base p-5 flex flex-col gap-4 group transition-all relative",
          !isCompact ? "border-brand-primary/20 shadow-xl shadow-brand-primary/5" : "hover:border-brand-primary/30"
        )}
      >
        {/* Tooltip for compact view */}
        <AnimatePresence>
          {isCompact && hoveredId === building.id && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-50 w-56 p-4 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white rounded-2xl shadow-2xl pointer-events-none border border-white/10"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Sensor Node {building.id}</span>
                  <div className={cn("w-2 h-2 rounded-full glow-primary", getStatusColor(currentUsage, building.dailyLimit))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Usage</p>
                    <p className="text-xs font-bold font-mono">{formatValue(currentUsage)} {unitLabel}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Limit</p>
                    <p className="text-xs font-bold font-mono">{formatValue(building.dailyLimit)} {unitLabel}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Health Status</p>
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    building.status === 'Normal' ? "text-emerald-400" : "text-orange-400"
                  )}>{building.status}</p>
                </div>
              </div>
              {/* Tooltip Arrow */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-950 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Row: Icon, Name, and Status */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "p-2.5 rounded-xl shrink-0 transition-colors",
              getStatusBg(currentUsage, building.dailyLimit)
            )}>
              <TypeIcon type={building.type} />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-[var(--text-main)] truncate text-sm">{building.name}</h4>
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{building.type}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-blue-50/50 dark:bg-blue-500/10 rounded-lg border border-blue-100/30 dark:border-blue-500/20 glow-primary">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.15em]">Live</span>
            </div>

            <motion.div 
              animate={isAnomaly ? {
                opacity: [1, 0.7, 1],
                scale: [1, 1.05, 1],
              } : {}}
              transition={isAnomaly ? {
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              } : {}}
              className={cn(
                "status-badge shadow-sm py-1 px-3",
                getStatusBg(currentUsage, building.dailyLimit)
              )}
            >
              {isAnomaly && <AlertCircle className="w-3 h-3" />}
              {building.status}
            </motion.div>
          </div>
        </div>

        {/* Real-time Flow Display */}
        <div className="grid grid-cols-2 gap-4 py-3 border-y border-[var(--surface-border)]">
          <div className="space-y-1">
            <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Flow Rate</p>
            <div className="flex items-baseline gap-1">
              <span className="data-value text-sm font-bold text-[var(--text-main)]">{formatFlow(currentFlow)}</span>
              <span className="text-[9px] text-[var(--text-muted)]">{flowLabel}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Daily Total</p>
            <div className="flex items-baseline gap-1">
              <span className="data-value text-sm font-bold text-[var(--text-main)]">{formatValue(currentUsage)}</span>
              <span className="text-[9px] text-[var(--text-muted)]">{unitLabel}</span>
            </div>
          </div>
        </div>

        {/* Usage Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-end">
            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Capacity Load</span>
            <span className="text-[10px] font-bold text-[var(--text-muted)]">{percentage.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, percentage)}%` }}
              className={cn("h-full rounded-full transition-colors duration-500", getStatusColor(currentUsage, building.dailyLimit))}
            />
          </div>
        </div>

        {/* Bottom Row: Capacity Planning */}
        {!isCompact && (
          <>
            <div className="pt-3 border-t border-[var(--surface-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-brand-primary/10 rounded-md">
                  <Cpu className="w-3 h-3 text-brand-primary" />
                </div>
                <div>
                  <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none mb-0.5">AI Forecast</p>
                  <p className="data-value text-[11px] text-brand-primary font-bold leading-none">
                    +{((building.futureNeed! - currentUsage) / currentUsage * 100).toFixed(0)}% Demand
                  </p>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[var(--text-muted)] italic leading-tight line-clamp-2">
                  "{building.upgradeSuggestion}"
                </p>
              </div>
            </div>

            {/* Real-time Flow Graph */}
            <div className="pt-4 border-t border-[var(--surface-border)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-blue-500" />
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Real-time Flow ({flowLabel})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsPaused(!isPaused)}
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded-md border transition-all",
                      isPaused ? "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400" : "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400"
                    )}
                  >
                    {isPaused ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
                    <span className="text-[8px] font-bold uppercase tracking-wider">{isPaused ? 'Resume' : 'Pause'}</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isPaused ? "bg-orange-500" : "bg-blue-500")} />
                    <span className={cn("text-[8px] font-bold uppercase tracking-wider", isPaused ? "text-orange-500" : "text-blue-500")}>
                      {isPaused ? 'Paused' : 'Live Stream'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="h-[160px] w-full bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-2 border border-[var(--surface-border)]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={flowHistory[building.id] || []} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id={`colorFlow-${building.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <Tooltip 
                      contentStyle={{ 
                        fontSize: '10px', 
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        padding: '4px 8px',
                        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                        color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                      }}
                      labelStyle={{ display: 'none' }}
                      formatter={(value: number) => [formatFlow(value), flowLabel]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="flow" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill={`url(#colorFlow-${building.id})`} 
                      isAnimationActive={false}
                    />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Brush 
                      dataKey="time" 
                      height={20} 
                      stroke="#3b82f6" 
                      fill="transparent"
                      startIndex={Math.max(0, (flowHistory[building.id]?.length || 0) - 15)}
                    >
                      <AreaChart>
                        <Area 
                          type="monotone" 
                          dataKey="flow" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.1} 
                        />
                      </AreaChart>
                    </Brush>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Dropdown Container */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Custom Dropdown */}
        <div className="relative flex-1" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-card)] border rounded-xl transition-all text-left group",
              isOpen ? "border-brand-primary ring-4 ring-brand-primary/5 shadow-sm" : "border-[var(--surface-border)] hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg transition-colors",
                selectedId === 'all' ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" : getStatusBg(liveUsage[selectedId] || selectedBuilding?.currentUsage || 0, selectedBuilding?.dailyLimit || 1)
              )}>
                {selectedId === 'all' ? <Search className="w-4 h-4" /> : <TypeIcon type={selectedBuilding!.type} />}
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">Monitoring Node</p>
                <p className="text-sm font-bold text-[var(--text-main)] leading-none">
                  {selectedId === 'all' ? 'All Active Nodes' : selectedBuilding?.name}
                </p>
              </div>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute z-[60] w-full mt-2 bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl shadow-2xl overflow-hidden"
              >
                <div className="max-h-[300px] overflow-y-auto py-2">
                  <button
                    onClick={() => { setSelectedId('all'); setIsOpen(false); }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left",
                      selectedId === 'all' && "bg-brand-primary/5 text-brand-primary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Search className="w-4 h-4 opacity-50" />
                      <span className="text-sm font-medium">All Active Nodes</span>
                    </div>
                    {selectedId === 'all' && <Check className="w-4 h-4" />}
                  </button>
                  
                  <div className="h-px bg-[var(--surface-border)] my-1 mx-4" />
                  
                  {buildings.map((building) => (
                    <button
                      key={building.id}
                      onClick={() => { setSelectedId(building.id); setIsOpen(false); }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left",
                        selectedId === building.id && "bg-brand-primary/5 text-brand-primary"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("p-1.5 rounded-lg", getStatusBg(liveUsage[building.id] || building.currentUsage, building.dailyLimit))}>
                          <TypeIcon type={building.type} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{building.name}</p>
                          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{building.type}</p>
                        </div>
                      </div>
                      {selectedId === building.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Display Area */}
      <div className="min-h-[200px]">
        <AnimatePresence mode="wait">
          {selectedId === 'all' ? (
            <motion.div 
              key="all"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4"
            >
              {buildings.map(b => renderBuildingCard(b, true))}
            </motion.div>
          ) : (
            <motion.div
              key={selectedId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {selectedBuilding && renderBuildingCard(selectedBuilding, false)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
