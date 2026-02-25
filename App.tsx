import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { HoursAndPay } from './components/HoursAndPay';
import { Admin } from './components/Admin';
import { AdminSetup } from './components/AdminSetup';
import { Button } from './components/Button';
import { Employee, TimeLog, Role } from './types';
import { Lock, Loader } from 'lucide-react';
import { supabase, toCamelCase, toSnakeCase, isSupabaseConfigured } from './lib/supabase';

/** Only in Cursor/dev: allow app without Supabase and optional admin bypass. Production build never sets this. */
const isOfflineDevMode = import.meta.env.DEV;

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  
  // App Status State
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [adminPin, setAdminPin] = useState<string | null>(null);

  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);

  // 1. Initial Data Fetch & Setup Check (alleen als Supabase is geconfigureerd)
  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Settings (PIN)
      const { data: settingsData } = await supabase.from('settings').select('*');
      
      if (!settingsData || settingsData.length === 0) {
        setNeedsSetup(true);
        setLoading(false);
        return;
      }
      
      setAdminPin(settingsData[0].pin_code);

      // Fetch Employees
      const { data: empData, error: empError } = await supabase.from('employees').select('*');
      if (empError) throw empError;
      setEmployees(toCamelCase<Employee[]>(empData || []));

      // Fetch Logs
      const { data: logData, error: logError } = await supabase.from('time_logs').select('*');
      if (logError) throw logError;
      setLogs(toCamelCase<TimeLog[]>(logData || []));

      // Cleanup Old Logs (> 3 months)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      await supabase.from('time_logs').delete().lt('date', threeMonthsAgo.toISOString().split('T')[0]);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Actions wrapped with Supabase (when not configured, only local state is updated)
  const handleClockIn = async (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    
    const newLog = {
        employeeId,
        date: today,
        clockIn: now,
        status: 'active',
        edits: []
    };

    const tempId = Math.random().toString();
    setLogs(prev => [...prev, { ...newLog, id: tempId, clockOut: null } as TimeLog]);

    if (isOfflineDevMode && !isSupabaseConfigured) return;

    const { data, error } = await supabase.from('time_logs').insert([toSnakeCase(newLog)]).select();
    if (error) {
        console.error(error);
        await fetchData();
    } else if(data) {
        // Replace temp with real
        setLogs(prev => prev.map(l => l.id === tempId ? toCamelCase<TimeLog>(data[0]) : l));
    }
  };

  const handleClockOut = async (employeeId: string) => {
    const log = logs.find(l => l.employeeId === employeeId && l.status === 'active');
    if (!log) return;

    const now = new Date().toISOString();
    setLogs(prev => prev.map(l => l.id === log.id ? { ...l, clockOut: now, status: 'completed' } : l));

    if (isOfflineDevMode && !isSupabaseConfigured) return;

    const { error } = await supabase
        .from('time_logs')
        .update(toSnakeCase({ clockOut: now, status: 'completed' }))
        .eq('id', log.id);

    if (error) {
        console.error(error);
        await fetchData();
    }
  };

  const handleAddEmployee = async (name: string, role: Role) => {
    if (isOfflineDevMode && !isSupabaseConfigured) {
      const newEmp: Employee = { id: crypto.randomUUID(), name, role, isActive: true };
      setEmployees(prev => [...prev, newEmp]);
      return;
    }
    const newEmp = { name, role, isActive: true };
    const { data, error } = await supabase.from('employees').insert([toSnakeCase(newEmp)]).select();
    
    if (error) {
      console.error('Medewerker toevoegen mislukt:', error);
      await fetchData();
      return;
    }
    if (data && data[0]) {
      setEmployees(prev => [...prev, toCamelCase<Employee>(data[0])]);
    }
  };

  const handleRemoveEmployee = async (id: string) => {
    setEmployees(employees.map(e => e.id === id ? { ...e, isActive: false } : e));
    if (isOfflineDevMode && !isSupabaseConfigured) return;
    const { error } = await supabase.from('employees').update(toSnakeCase({ isActive: false })).eq('id', id);
    if (error) {
      console.error('Medewerker verwijderen mislukt:', error);
      await fetchData();
    }
  };

  const handleEditEmployee = async (id: string, name: string, role: Role) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, name, role } : e));
    if (isOfflineDevMode && !isSupabaseConfigured) return;
    const updated = { name, role };
    const { error } = await supabase.from('employees').update(toSnakeCase(updated)).eq('id', id);
    if (error) {
      console.error('Medewerker bijwerken mislukt:', error);
      await fetchData();
    }
  };

  /** Verwijder alle voltooide uren; ingelogde (actieve) registraties blijven staan. Retourneert false bij fout. */
  const handleDeleteAllLogs = async (): Promise<boolean> => {
    if (isOfflineDevMode && !isSupabaseConfigured) {
      setLogs(prev => prev.filter(l => l.status === 'active'));
      return true;
    }
    const { error } = await supabase.from('time_logs').delete().eq('status', 'completed');
    if (error) {
      console.error('Alle uren verwijderen mislukt:', error);
      return false;
    }
    setLogs(prev => prev.filter(l => l.status === 'active'));
    return true;
  };

  /** Volledige reset: alle uren, medewerkers en instellingen verwijderen. Bij succes wordt herladen (installatiescherm). Retourneert false bij fout. */
  const handleFullReset = async (): Promise<boolean> => {
    if (isOfflineDevMode && !isSupabaseConfigured) {
      setLogs([]);
      setEmployees([]);
      return true;
    }
    try {
      const { error: err1 } = await supabase.from('time_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (err1) {
        console.error('Reset time_logs mislukt:', err1);
        return false;
      }
      const { error: err2 } = await supabase.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (err2) {
        console.error('Reset employees mislukt:', err2);
        return false;
      }
      const { error: err3 } = await supabase.from('settings').delete().gte('id', 0);
      if (err3) {
        console.error('Reset settings mislukt:', err3);
        return false;
      }
      window.location.reload();
      return true;
    } catch (e) {
      console.error('Reset mislukt:', e);
      return false;
    }
  };

  /** Handmatig nieuwe uren toevoegen (of iemand geklockt heeft of niet). */
  const handleAddLog = async (employeeId: string, date: string, clockIn: string, clockOut: string | null, reason: string) => {
    const editRecord = {
      date: new Date().toISOString(),
      newIn: clockIn,
      newOut: clockOut || undefined,
      reason: reason || 'Handmatig toegevoegd door admin',
      adminName: 'Admin'
    };
    const newLog = {
      employeeId,
      date,
      clockIn,
      clockOut: clockOut || null,
      status: (clockOut ? 'completed' : 'active') as 'active' | 'completed',
      edits: [editRecord]
    };
    const tempId = Math.random().toString();
    setLogs(prev => [...prev, { ...newLog, id: tempId } as TimeLog]);
    if (isOfflineDevMode && !isSupabaseConfigured) return;
    const { data, error } = await supabase.from('time_logs').insert([toSnakeCase(newLog)]).select();
    if (error) {
      console.error('Nieuwe uren toevoegen mislukt:', error);
      await fetchData();
    } else if (data?.[0]) {
      setLogs(prev => prev.map(l => l.id === tempId ? toCamelCase<TimeLog>(data[0]) : l));
    }
  };
    

  const handleEditLog = async (logId: string, newIn: string, newOut: string, reason: string) => {
    const originalLog = logs.find(l => l.id === logId);
    if (!originalLog) return;

    const editRecord = {
      date: new Date().toISOString(),
      previousIn: originalLog.clockIn,
      previousOut: originalLog.clockOut || undefined,
      newIn: newIn,
      newOut: newOut || undefined,
      reason,
      adminName: 'Admin'
    };

    const updatedEdits = [...originalLog.edits, editRecord];
    const newStatus: 'active' | 'completed' = newOut ? 'completed' : 'active';
    const updatePayload = {
      clockIn: newIn,
      clockOut: newOut || null,
      status: newStatus,
      edits: updatedEdits
    };

    setLogs(prev => prev.map(l => l.id === logId ? { ...l, ...updatePayload } : l));
    if (isOfflineDevMode && !isSupabaseConfigured) return;
    const { error } = await supabase.from('time_logs').update(toSnakeCase(updatePayload)).eq('id', logId);
    if (error) {
      console.error('Log wijzigen mislukt:', error);
      await fetchData();
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Offline dev with no Supabase: adminPin stays null; allow any non-empty input so the form works
    const pinValid = isOfflineDevMode && adminPin === null
      ? passwordInput.trim().length > 0
      : passwordInput === adminPin;
    if (pinValid) {
       setIsAdmin(true);
       setLoginError(false);
       setPasswordInput('');
    } else {
       setLoginError(true);
    }
  };

  // --- RENDERING ---

  // Production only: require Supabase to be configured (live app must use backend)
  if (!isOfflineDevMode && !isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md bg-neutral-900 border border-levant-gold/50 rounded-2xl p-8 text-center space-y-4">
          <p className="font-serif text-xl text-levant-gold">Supabase niet geconfigureerd</p>
          <p className="text-neutral-400 text-sm">
            Voeg in <code className="bg-neutral-800 px-2 py-1 rounded">.env.local</code> toe:
          </p>
          <pre className="text-left text-xs bg-neutral-800 p-4 rounded-xl overflow-x-auto text-neutral-300">
{`VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=jouw-anon-key`}
          </pre>
          <p className="text-neutral-500 text-xs">
            Geen spaties aan het begin van regels. Zie <strong>docs/SUPABASE_SETUP.md</strong>.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
      return (
          <div className="min-h-screen bg-black flex flex-col items-center justify-center text-levant-gold gap-4">
              <Loader size={48} className="animate-spin" />
              <p className="font-serif tracking-widest animate-pulse">LEVANT SYSTEM LOADING...</p>
          </div>
      );
  }

  // Show setup when Supabase is configured and no PIN has been set yet (production or dev with Supabase)
  if (needsSetup) {
      return <AdminSetup onComplete={() => window.location.reload()} />;
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && (
        <Dashboard 
          employees={employees} 
          logs={logs} 
          onClockIn={handleClockIn} 
          onClockOut={handleClockOut} 
        />
      )}
      {activeTab === 'hours' && (
        <HoursAndPay employees={employees} logs={logs} />
      )}
      {activeTab === 'admin' && (
        isAdmin ? (
          <Admin 
            employees={employees} 
            logs={logs}
            onAddEmployee={handleAddEmployee}
            onEditEmployee={handleEditEmployee}
            onRemoveEmployee={handleRemoveEmployee}
            onAddLog={handleAddLog}
            onEditLog={handleEditLog}
            onDeleteAllLogs={handleDeleteAllLogs}
            onFullReset={handleFullReset}
            onLogout={() => setIsAdmin(false)}
          />
        ) : (
          <div className="flex h-full items-center justify-center flex-col p-4 md:p-6 animate-fade-in">
             <div className="bg-neutral-900 border border-levant-gold/30 p-8 md:p-10 rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-levant-gold to-transparent opacity-50"></div>
                
                <div className="flex justify-center mb-5 md:mb-6">
                   <div className="p-4 md:p-5 rounded-full bg-neutral-800 text-levant-gold border border-levant-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                      <Lock size={32} className="md:w-10 md:h-10" />
                   </div>
                </div>

                <h2 className="text-3xl md:text-4xl font-serif text-white mb-2 text-center">Admin Login</h2>
                <p className="text-neutral-500 text-center mb-6 md:mb-8 text-sm md:text-base">Toegang tot personeelsbeheer</p>
                
                <form onSubmit={handleLogin} className="space-y-6">
                   <div>
                      <label className="block text-xs md:text-sm uppercase text-neutral-500 mb-2 tracking-widest font-bold text-center">Pincode</label>
                      <input 
                        type="password" 
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full bg-neutral-800 border-2 border-neutral-700 text-white rounded-xl p-4 md:p-5 focus:border-levant-gold outline-none text-xl md:text-2xl text-center tracking-[0.5em] transition-colors min-h-[3.25rem] md:min-h-[3.75rem]"
                        placeholder="••••"
                      />
                   </div>
                   {loginError && (
                     <p className="text-red-500 text-center text-sm md:text-base font-bold bg-red-900/10 py-2 md:py-3 rounded animate-pulse">
                        Onjuiste Pincode
                     </p>
                   )}
                   <Button type="submit" className="w-full py-4 md:py-5 text-lg md:text-xl" variant="primary">
                      Verifieer
                   </Button>
                   {isOfflineDevMode && (
                     <p className="text-neutral-500 text-xs text-center mt-3">
                       Geen pincode? <button type="button" onClick={() => { setIsAdmin(true); setLoginError(false); }} className="text-levant-gold underline hover:no-underline">Development: open admin</button>
                     </p>
                   )}
                </form>
             </div>
          </div>
        )
      )}
    </Layout>
  );
}
