import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Bar,
  ComposedChart
} from 'recharts';
import { ForecastPoint } from '../types';
import { Calendar, TrendingDown } from 'lucide-react';

interface UsageChartProps {
  data: ForecastPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  const formatValue = (val: number) => {
    return (val * 1000).toLocaleString();
  };

  const unitLabel = 'L';

  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 dark:bg-slate-950/95 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-slate-300 font-medium">{entry.name}</span>
              </div>
              <span className="text-xs font-mono font-bold text-white">{formatValue(entry.value)} {unitLabel}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const UsageChart: React.FC<UsageChartProps> = ({ data }) => {
  const unitLabel = 'L';
  
  const actualData = data.filter(d => d.actual !== undefined);
  const totalActual = actualData.reduce((acc, curr) => acc + (curr.actual || 0), 0);
  const avgUsage = actualData.length > 0 ? totalActual / actualData.length : 0;

  return (
    <div className="card-base p-8 h-[580px] relative overflow-hidden group">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-10 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
            <h3 className="col-header">Demand Analytics</h3>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-main)] font-display">Water Consumption Forecast</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">Predictive model with daily consumption tracking</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">Avg. Daily</p>
            <p className="text-sm font-bold text-brand-primary">{(avgUsage * 1000).toLocaleString()} L</p>
          </div>
          <div className="w-px h-8 bg-[var(--surface-border)]" />
          <div className="text-right">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">Unit</p>
            <p className="text-xs font-bold text-[var(--text-main)]">{unitLabel} / 24H</p>
          </div>
        </div>
      </div>
      
      <div className="h-[340px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748B" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#64748B" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8', letterSpacing: '0.05em' }}
              dy={15}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
              tickFormatter={(value) => {
                return (value * 1000 / 1000).toFixed(0) + 'k';
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}
            />
            
            <Bar 
              name="Daily Track"
              dataKey="actual" 
              barSize={20} 
              fill="currentColor" 
              className="text-slate-100 dark:text-slate-800"
              radius={[4, 4, 0, 0]}
            />

            <Area
              name="Confidence Range"
              type="monotone"
              dataKey="upperBound"
              stroke="none"
              fill="#0EA5E9"
              fillOpacity={0.05}
              activeDot={false}
            />
            
            <Area 
              name="Predicted"
              type="monotone" 
              dataKey="predicted" 
              stroke="#0EA5E9" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorPredicted)" 
              dot={{ r: 4, fill: '#0EA5E9', strokeWidth: 2, stroke: '#FFF' }}
              activeDot={{ r: 6, strokeWidth: 3, stroke: '#FFF' }}
            />
            
            <Area 
              name="Actual"
              type="monotone" 
              dataKey="actual" 
              stroke="#64748B" 
              strokeDasharray="5 5"
              strokeWidth={2}
              fill="url(#colorActual)"
              dot={{ r: 3, fill: '#64748B', strokeWidth: 2, stroke: '#FFF' }}
            />
            
            <ReferenceLine 
              x="Today" 
              stroke="#0EA5E9" 
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{ 
                position: 'top', 
                value: 'NOW', 
                fill: '#0EA5E9', 
                fontSize: 9, 
                fontWeight: 900,
                letterSpacing: '0.15em'
              }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-10 pt-6 border-t border-[var(--surface-border)] relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em]">Weekly Performance</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20">
            -4.2% VS LAST WEEK
          </span>
        </div>
        <div className="flex items-center gap-2 text-[var(--text-muted)] opacity-60">
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Week 14, 2026</span>
        </div>
      </div>

      {/* Decorative background element */}
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-brand-primary/10 transition-colors duration-700" />
    </div>
  );
};
