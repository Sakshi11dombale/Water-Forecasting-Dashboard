import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Droplets, Leaf } from 'lucide-react';

const data = [
  { name: 'Low-Flow Fixtures', savings: 4500, color: '#0EA5E9' },
  { id: '02', name: 'Greywater Recycling', savings: 8200, color: '#10B981' },
  { id: '03', name: 'Smart Irrigation', savings: 3100, color: '#F59E0B' },
  { id: '04', name: 'Leak Mitigation', savings: 2600, color: '#EF4444' },
];

const CustomTooltip = ({ active, payload, label, theme }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: payload[0].payload.color }} />
          <span className="text-xs font-mono font-bold text-white">{payload[0].value.toLocaleString()} Liters Saved</span>
        </div>
      </div>
    );
  }
  return null;
};

export const ConservationImpact: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

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

  return (
    <div className="card-base p-8 relative overflow-hidden group">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Leaf className="w-4 h-4 text-emerald-500" />
            <h3 className="col-header">Conservation Impact</h3>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-main)] font-display">Projected Daily Savings</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">Estimated water recovery through implemented efficiency measures</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 glow-emerald">
          <Droplets className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">18.4k L Total Savings</span>
        </div>
      </div>

      <div className="h-[240px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme === 'dark' ? '#1e293b' : '#F1F5F9'} />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#94a3b8' : '#64748B', width: 100 }}
              width={120}
            />
            <Tooltip content={<CustomTooltip theme={theme} />} cursor={{ fill: theme === 'dark' ? '#1e293b' : '#F8FAFC' }} />
            <Bar dataKey="savings" radius={[0, 8, 8, 0]} barSize={24}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Decorative background element */}
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};
