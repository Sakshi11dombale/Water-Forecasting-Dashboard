import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ShieldCheck, Clock, Building2, ChevronRight, Droplets } from 'lucide-react';
import { LeakAlert, BuildingData } from '../types';
import { cn } from '../lib/utils';

interface LeakDetectionProps {
  alerts: LeakAlert[];
  buildings: BuildingData[];
  isAnalyzing: boolean;
}

export const LeakDetection: React.FC<LeakDetectionProps> = ({ alerts, buildings, isAnalyzing }) => {
  const getBuildingName = (id: string) => {
    return buildings.find(b => b.id === id)?.name || 'Unknown Building';
  };

  const getSeverityColor = (severity: LeakAlert['severity']) => {
    switch (severity) {
      case 'High': return 'text-red-500 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20';
      case 'Medium': return 'text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20';
      case 'Low': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 border-yellow-100 dark:border-yellow-500/20';
      default: return 'text-slate-500 bg-slate-50 dark:bg-slate-500/10 border-slate-100 dark:border-slate-500/20';
    }
  };

  return (
    <div className="card-base p-6 space-y-6 relative overflow-hidden group">
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-3 rounded-2xl transition-all duration-500",
            alerts.length > 0 ? "bg-red-50 dark:bg-red-500/10 text-red-500 glow-red" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 glow-emerald"
          )}>
            {alerts.length > 0 ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-main)] tracking-tight font-display">Leak Detection System</h3>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">AI-Powered Anomaly Monitoring</p>
          </div>
        </div>
        {isAnalyzing && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-full border border-blue-100 dark:border-blue-500/20 shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Analyzing...</span>
          </div>
        )}
      </div>

      <div className="space-y-4 relative z-10">
        <AnimatePresence mode="popLayout">
          {alerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800"
            >
              <div className="p-4 bg-[var(--surface-card)] rounded-full shadow-xl shadow-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 glow-emerald">
                <ShieldCheck className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-main)]">No Leaks Detected</p>
                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.15em] mt-1">All nodes reporting normal flow patterns</p>
              </div>
            </motion.div>
          ) : (
            alerts.map((alert, index) => (
              <motion.div
                key={`${alert.buildingId}-${alert.timestamp}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "group relative p-5 rounded-[1.5rem] border transition-all duration-300 hover:shadow-xl",
                  getSeverityColor(alert.severity)
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 p-2.5 bg-[var(--surface-card)] rounded-xl shadow-sm border border-[var(--surface-border)] group-hover:scale-110 transition-transform">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[var(--text-main)] font-display">{getBuildingName(alert.buildingId)}</h4>
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg border bg-[var(--surface-card)] shadow-sm",
                          alert.severity === 'High' ? "text-red-600 border-red-100 dark:border-red-500/20" : 
                          alert.severity === 'Medium' ? "text-orange-600 border-orange-100 dark:border-orange-500/20" : 
                          "text-yellow-600 border-yellow-100 dark:border-yellow-500/20"
                        )}>
                          {alert.severity} Risk
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2 font-medium">
                        {alert.reasoning}
                      </p>
                      <div className="flex items-center gap-4 pt-1">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                          <Droplets className="w-3.5 h-3.5" />
                          {(alert.confidence * 100).toFixed(0)}% Confidence
                        </div>
                      </div>
                    </div>
                  </div>
                  <button className="p-2 bg-[var(--surface-card)] rounded-xl shadow-sm border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-brand-primary hover:border-brand-primary/20 transition-all active:scale-90">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="pt-6 border-t border-[var(--surface-border)] relative z-10">
        <div className="flex items-center justify-between text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.25em]">
          <span>Last Scan: {new Date().toLocaleTimeString()}</span>
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse glow-emerald" />
            System Active
          </span>
        </div>
      </div>

      {/* Decorative background element */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-50 dark:bg-slate-900/20 rounded-full blur-3xl pointer-events-none group-hover:bg-slate-100 dark:group-hover:bg-slate-900/30 transition-colors duration-700" />
    </div>
  );
};
