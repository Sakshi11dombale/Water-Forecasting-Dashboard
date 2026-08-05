import { useState, useEffect, FormEvent } from 'react';
import { Droplets, Activity, AlertTriangle, Cpu, Calendar, RefreshCw, ShieldCheck, Zap, LogOut, User, Lock, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UsageChart } from './components/UsageChart';
import { BuildingGrid } from './components/BuildingGrid';
import { LeakDetection } from './components/LeakDetection';
import { ConservationImpact } from './components/ConservationImpact';
import { BuildingData, ForecastPoint, LeakAlert } from './types';
import { getWaterForecast, detectLeaks } from './lib/gemini';
import { cn } from './lib/utils';
import { auth, loginWithGoogle, logout as firebaseLogout } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

const MOCK_BUILDINGS: BuildingData[] = [
  { id: '01', name: 'Main Academic Hall', type: 'Academic', currentUsage: 124.5, dailyLimit: 150, status: 'Normal', futureNeed: 165.0, upgradeSuggestion: 'Install low-flow fixtures' },
  { id: '02', name: 'Science Research Center', type: 'Academic', currentUsage: 289.2, dailyLimit: 300, status: 'Warning', futureNeed: 350.0, upgradeSuggestion: 'Expand storage tank' },
  { id: '03', name: 'West Campus Dorms', type: 'Residential', currentUsage: 412.8, dailyLimit: 450, status: 'Normal', futureNeed: 480.0, upgradeSuggestion: 'Greywater recycling' },
  { id: '04', name: 'Student Union', type: 'Administrative', currentUsage: 85.4, dailyLimit: 100, status: 'Normal', futureNeed: 110.0, upgradeSuggestion: 'Smart meter upgrade' },
  { id: '05', name: 'Athletic Complex', type: 'Athletic', currentUsage: 195.0, dailyLimit: 200, status: 'Critical', futureNeed: 240.0, upgradeSuggestion: 'Irrigation automation' },
  { id: '06', name: 'Library Annex', type: 'Academic', currentUsage: 42.1, dailyLimit: 60, status: 'Normal', futureNeed: 55.0, upgradeSuggestion: 'Leak detection sensors' },
];

const MOCK_FORECAST: ForecastPoint[] = [
  { time: 'Mon', actual: 420, predicted: 430, upperBound: 450, lowerBound: 410 },
  { time: 'Tue', actual: 445, predicted: 440, upperBound: 465, lowerBound: 415 },
  { time: 'Wed', actual: 460, predicted: 455, upperBound: 480, lowerBound: 430 },
  { time: 'Thu', actual: 435, predicted: 445, upperBound: 470, lowerBound: 420 },
  { time: 'Today', actual: 480, predicted: 475, upperBound: 505, lowerBound: 455 },
  { time: 'Sat', predicted: 320, upperBound: 350, lowerBound: 290 },
  { time: 'Sun', predicted: 310, upperBound: 340, lowerBound: 280 },
];

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleDemoLogin = (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    // Demo credentials
    if (username === 'admin@aquila.io' && password === 'password123') {
      const demoUser = {
        uid: 'demo-user-123',
        displayName: 'Demo Operator',
        email: 'admin@aquila.io',
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      } as any;
      
      setUser(demoUser);
      localStorage.setItem('demo_user', JSON.stringify(demoUser));
    } else {
      setLoginError('Invalid demo credentials. Use admin@aquila.io / password123');
    }
  };
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  const [buildings] = useState<BuildingData[]>(MOCK_BUILDINGS);
  const [forecast] = useState<ForecastPoint[]>(MOCK_FORECAST);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>("System initialized. Monitoring real-time flow rates across 6 primary nodes.");
  const [leakAlerts, setLeakAlerts] = useState<LeakAlert[]>([]);
  const [isAnalyzingLeaks, setIsAnalyzingLeaks] = useState(false);
  const [currentFlowData, setCurrentFlowData] = useState<Record<string, number>>({});

  useEffect(() => {
    const savedDemoUser = localStorage.getItem('demo_user');
    if (savedDemoUser) {
      setUser(JSON.parse(savedDemoUser));
      setIsAuthReady(true);
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        localStorage.removeItem('demo_user');
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Periodically check for leaks using AI
  useEffect(() => {
    if (!user) return;

    const checkLeaks = async () => {
      if (Object.keys(currentFlowData).length === 0) return;
      
      setIsAnalyzingLeaks(true);
      try {
        const flowArray = Object.entries(currentFlowData).map(([id, flow]) => ({ 
          id, 
          flow,
          name: buildings.find(b => b.id === id)?.name,
          type: buildings.find(b => b.id === id)?.type
        }));
        const alerts = await detectLeaks(flowArray);
        setLeakAlerts(alerts);
      } catch (error) {
        console.error("Leak detection failed:", error);
      } finally {
        setIsAnalyzingLeaks(false);
      }
    };

    const interval = setInterval(checkLeaks, 20000); // Check every 20 seconds
    return () => clearInterval(interval);
  }, [currentFlowData, user, buildings]);

  const logout = async () => {
    await firebaseLogout();
    setUser(null);
    localStorage.removeItem('demo_user');
  };

  const handleFlowUpdate = (flowData: Record<string, number>) => {
    setCurrentFlowData(flowData);
  };

  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    setAiInsight("Analyzing historical consumption patterns and environmental variables...");
    
    try {
      const results = await getWaterForecast(MOCK_BUILDINGS);
      if (results && results.length > 0) {
        setAiInsight(results[0].reasoning || "Analysis complete. Expected surge in Athletic Complex usage due to upcoming weekend event.");
      }
    } catch (error) {
      setAiInsight("Analysis failed. Reverting to local heuristic models.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatValue = (val: number) => {
    return (val * 1000).toLocaleString();
  };

  const unitLabel = 'L';

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[var(--surface-bg)] flex items-center justify-center transition-colors duration-500">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-brand-primary p-4 rounded-2xl shadow-xl animate-pulse">
            <Droplets className="w-8 h-8 text-white" />
          </div>
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.3em]">Initializing Aquila...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--surface-bg)] flex items-center justify-center p-6 transition-colors duration-500">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[var(--surface-card)] rounded-3xl shadow-2xl shadow-brand-primary/10 border border-[var(--surface-border)] p-8 text-center space-y-8"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="bg-brand-primary p-4 rounded-2xl shadow-lg shadow-brand-primary/20">
              <Droplets className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">Aquila Intelligence</h1>
              <p className="text-[10px] font-bold text-brand-primary tracking-[0.2em] uppercase mt-1">Water Management System</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-left space-y-2">
              <div className="flex items-center gap-2 text-[var(--text-main)] opacity-70">
                <Lock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Secure Access</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Please sign in with your authorized campus credentials or use the demo account.
              </p>
            </div>

            <form onSubmit={handleDemoLogin} className="space-y-3">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider ml-1">Demo Email</label>
                <input 
                  type="email" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin@aquila.io"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                />
              </div>
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider ml-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                />
              </div>
              {loginError && (
                <p className="text-[10px] font-bold text-red-500 text-left ml-1">{loginError}</p>
              )}
              <button
                type="submit"
                className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold text-sm hover:bg-brand-primary/90 transition-all active:scale-[0.98] shadow-lg shadow-brand-primary/20"
              >
                Demo Login
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--surface-border)]"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                <span className="bg-[var(--surface-card)] px-2 text-[var(--text-muted)]">Or continue with</span>
              </div>
            </div>

            <button
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 dark:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-700 transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Sign in with Google
            </button>
          </div>

          <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-widest">
            Authorized Personnel Only
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] transition-colors duration-500">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-[var(--surface-border)] px-8 py-4">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-brand-primary p-2 rounded-xl shadow-lg shadow-brand-primary/20">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div className="hidden min-[450px]:block">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-main)] leading-none">AQUILA</h1>
              <p className="text-[10px] font-bold text-brand-primary tracking-[0.2em] uppercase mt-1">Water Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-6 min-w-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-500/10 rounded-full border border-green-100 dark:border-green-500/20 shrink-0">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">System Live</span>
            </div>
            
            <div className="hidden md:flex items-center gap-4 border-l border-[var(--surface-border)] pl-6 shrink-0">
              <div className="text-right">
                <p className="col-header leading-none mb-1">Current Load</p>
                <p className="data-value text-lg leading-none">
                  {formatValue(1149.0)} <span className="text-[10px] opacity-40">{unitLabel}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 md:gap-4 border-l border-[var(--surface-border)] pl-3 md:pl-6 shrink-0 min-w-0">
                <div className="text-right hidden sm:block min-w-0">
                  <p className="text-[10px] font-bold text-[var(--text-main)] leading-none mb-1 truncate max-w-[80px] md:max-w-[120px]">{user.displayName}</p>
                  <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none">Operator</p>
                </div>
                {user.photoURL ? (
                  <img src={user.photoURL} className="w-8 h-8 rounded-full border border-[var(--surface-border)] shrink-0" alt="Avatar" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-[var(--surface-border)] shrink-0">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                )}
              </div>
              
              <button 
                onClick={logout}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all active:scale-95 shrink-0"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </nav>

      <main className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-main)]">Operations Dashboard</h2>
          <p className="text-[var(--text-muted)] max-w-2xl">
            Real-time monitoring and predictive analysis for campus-wide water distribution. 
            AI-driven insights help optimize consumption and detect anomalies before they escalate.
          </p>
        </motion.div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Efficiency', value: '94.2%', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', glow: 'glow-primary' },
            { label: 'Predicted Demand', value: `${formatValue(480.0)} ${unitLabel}`, icon: Zap, color: 'text-brand-primary', bg: 'bg-brand-primary/10', glow: 'glow-primary' },
            { label: 'Active Leaks', value: leakAlerts.length.toString().padStart(2, '0'), icon: AlertTriangle, color: leakAlerts.length > 0 ? 'text-red-500' : 'text-emerald-500', bg: leakAlerts.length > 0 ? 'bg-red-50 dark:bg-red-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10', glow: leakAlerts.length > 0 ? 'glow-red' : 'glow-emerald' },
            { label: 'AI Confidence', value: '88.5%', icon: Cpu, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', glow: 'glow-primary' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={cn("card-base p-6 flex justify-between items-center group", stat.glow)}
            >
              <div>
                <h3 className="col-header mb-1">{stat.label}</h3>
                <p className="text-2xl font-bold tracking-tight text-[var(--text-main)]">{stat.value}</p>
              </div>
              <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column: Chart & Insights */}
          <div className="xl:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <UsageChart data={forecast} />
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="card-base p-8 bg-slate-900 dark:bg-slate-950 text-white relative overflow-hidden group"
              >
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="bg-brand-primary/20 p-2.5 rounded-xl glow-primary">
                      <Zap className="w-5 h-5 text-brand-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm tracking-tight font-display">Aquila Intelligence</h3>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Real-time Analysis Engine</p>
                    </div>
                  </div>
                  <button 
                    onClick={runAiAnalysis}
                    disabled={isAnalyzing}
                    className="p-2 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50 active:scale-95"
                  >
                    <RefreshCw className={cn("w-4 h-4", isAnalyzing && "animate-spin")} />
                  </button>
                </div>
                
                <div className="relative z-10 min-h-[120px] flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    <motion.p 
                      key={aiInsight}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="font-mono text-sm leading-relaxed text-slate-300"
                    >
                      {aiInsight}
                    </motion.p>
                  </AnimatePresence>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-brand-primary/10 rounded-full blur-3xl group-hover:bg-brand-primary/20 transition-colors" />
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.1),transparent_50%)]" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                <ConservationImpact />
              </motion.div>
            </div>
          </div>

          {/* Right Column: Building List */}
          <div className="space-y-6">
            <div className="flex justify-between items-end px-1">
              <div>
                <h3 className="col-header">Node Monitoring</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">Live sensor network status</p>
              </div>
              <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">6 ACTIVE</span>
            </div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <BuildingGrid 
                buildings={buildings} 
                onDataUpdate={handleFlowUpdate}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
            >
              <LeakDetection 
                alerts={leakAlerts} 
                buildings={buildings} 
                isAnalyzing={isAnalyzingLeaks} 
              />
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="card-base p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-primary" />
                <h4 className="col-header">Operational Schedule</h4>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Next Maintenance</span>
                  <span className="data-value text-xs text-brand-primary">APR 12, 2026</span>
                </div>
                
                <div className="p-3 bg-blue-50/50 dark:bg-blue-500/10 rounded-xl border border-blue-100/50 dark:border-blue-500/20">
                  <p className="text-[10px] text-blue-700 dark:text-blue-400 leading-relaxed font-medium italic">
                    "System automatically adjusts flow rates during off-peak hours (22:00 - 05:00) to minimize pressure-related leaks."
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-[1600px] mx-auto px-8 pt-16 pb-12">
        <div className="border-t border-[var(--surface-border)] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 opacity-40 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          <div className="flex items-center gap-4">
            <span>Aquila v1.0.4</span>
            <span className="w-1 h-1 rounded-full bg-slate-400" />
            <span>© 2026 Campus Operations Intelligence</span>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3 h-3" />
            <span>Last Sync: 15:29:13 UTC</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
