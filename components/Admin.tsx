import React, { useState, useMemo } from 'react';
import { Employee, TimeLog, Role } from '../types';
import { Button } from './Button';
import { UserPlus, UserMinus, AlertTriangle, Save, X, History, FileText, LogOut, Settings, KeyRound, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminProps {
  employees: Employee[];
  logs: TimeLog[];
  onAddEmployee: (name: string, role: Role) => void;
  onRemoveEmployee: (id: string) => void;
  onEditLog: (logId: string, newIn: string, newOut: string, reason: string) => void;
  onLogout: () => void;
}

export const Admin: React.FC<AdminProps> = ({ employees, logs, onAddEmployee, onRemoveEmployee, onEditLog, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'staff' | 'logs' | 'audit' | 'settings'>('staff');

  // New Employee State
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Role>(Role.SERVER);

  // Deletion State
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  // Edit Log State
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editIn, setEditIn] = useState('');
  const [editOut, setEditOut] = useState('');
  const [editReason, setEditReason] = useState('');

  // Settings State
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [settingsMsg, setSettingsMsg] = useState('');

  const handleAddEmp = () => {
    if (newName) {
      onAddEmployee(newName, newRole);
      setNewName('');
    }
  };

  const confirmDelete = () => {
    if (employeeToDelete) {
        onRemoveEmployee(employeeToDelete);
        setEmployeeToDelete(null);
    }
  }

  const startEdit = (log: TimeLog) => {
    setEditingLogId(log.id);
    const toLocalISO = (iso: string) => {
       const d = new Date(iso);
       d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
       return d.toISOString().slice(0, 16);
    }

    setEditIn(toLocalISO(log.clockIn));
    setEditOut(log.clockOut ? toLocalISO(log.clockOut) : '');
    setEditReason('');
  };

  const saveEdit = () => {
    if (editingLogId && editReason) {
      const dateIn = new Date(editIn);
      const dateOut = editOut ? new Date(editOut) : null;
      
      onEditLog(
        editingLogId, 
        dateIn.toISOString(), 
        dateOut ? dateOut.toISOString() : '', 
        editReason
      );
      setEditingLogId(null);
    } else {
        alert("Vul aub een reden in voor de wijziging.");
    }
  };

  const handleChangePin = async () => {
      if(!authEmail || !authPassword || !newPin) {
          setSettingsMsg("Vul alle velden in.");
          return;
      }

      setSettingsMsg("Verifiëren...");
      
      // 1. Verify credentials via Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword
      });

      if (error || !data.user) {
          setSettingsMsg("Wachtwoord of email onjuist.");
          return;
      }

      // 2. Update PIN in database
      const { error: dbError } = await supabase
        .from('settings')
        .update({ pin_code: newPin })
        .gt('id', 0); // Update all/first row

      if (dbError) {
          setSettingsMsg("Fout bij opslaan pincode.");
      } else {
          setSettingsMsg("Pincode succesvol gewijzigd!");
          setAuthPassword('');
          setNewPin('');
      }
  };

  const completedLogs = useMemo(() => 
    logs.filter(l => l.status === 'completed').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  , [logs]);

  // Aggregate all edits for Audit Trail
  const auditTrail = useMemo(() => {
    const trail = logs.flatMap(log => 
      log.edits.map(edit => ({
        ...edit,
        logDate: log.date,
        employeeId: log.employeeId,
        logId: log.id
      }))
    );
    return trail.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs]);

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Onbekend';
  const getEmployeeNameForDelete = () => employees.find(e => e.id === employeeToDelete)?.name || 'deze medewerker';

  return (
    <div className="space-y-6 relative">
      {/* Deletion Confirmation Modal */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
           <div className="bg-neutral-900 border border-levant-gold rounded-2xl p-8 max-w-md w-full shadow-2xl transform scale-100 transition-all">
              <div className="flex flex-col items-center text-center space-y-4">
                 <div className="w-16 h-16 rounded-full bg-red-900/20 text-red-500 flex items-center justify-center mb-2">
                    <AlertTriangle size={32} />
                 </div>
                 <h3 className="text-2xl font-serif text-white">Weet je het zeker?</h3>
                 <p className="text-neutral-400">
                   Je staat op het punt om <strong className="text-white">{getEmployeeNameForDelete()}</strong> te verwijderen. Dit kan niet ongedaan worden gemaakt.
                 </p>
                 <div className="flex gap-4 w-full mt-6">
                    <Button variant="secondary" onClick={() => setEmployeeToDelete(null)} className="flex-1 py-4">
                       Annuleren
                    </Button>
                    <Button variant="danger" onClick={confirmDelete} className="flex-1 py-4">
                       Verwijderen
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
         <div>
            <h2 className="text-3xl font-serif text-white mb-2">Beheer</h2>
            <p className="text-neutral-400">Team en tijdregistratie administratie</p>
         </div>
         <div className="flex items-center gap-4 self-end md:self-auto">
             <div className="flex gap-2 bg-neutral-900 p-2 rounded-xl border border-neutral-800 w-full md:w-auto overflow-x-auto">
               <button 
                onClick={() => setActiveTab('staff')}
                className={`px-6 py-3 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'staff' ? 'bg-levant-gold text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
               >
                 <UserPlus size={18} /> Team
               </button>
               <button 
                onClick={() => setActiveTab('logs')}
                className={`px-6 py-3 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'logs' ? 'bg-levant-gold text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
               >
                 <FileText size={18} /> Logboek
               </button>
               <button 
                onClick={() => setActiveTab('audit')}
                className={`px-6 py-3 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'audit' ? 'bg-levant-gold text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
               >
                 <History size={18} /> Audit
               </button>
               <button 
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-3 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'settings' ? 'bg-levant-gold text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
               >
                 <Settings size={18} />
               </button>
             </div>
             <Button variant="secondary" onClick={onLogout} className="h-full aspect-square md:aspect-auto md:px-6">
                <LogOut size={20} /> <span className="hidden md:inline">Uitloggen</span>
             </Button>
         </div>
      </header>

      {activeTab === 'staff' && (
        <div className="grid md:grid-cols-3 gap-8">
           <div className="bg-neutral-900/80 border border-levant-gold/30 p-8 rounded-2xl h-fit shadow-lg">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <UserPlus size={24} className="text-levant-gold" /> Nieuw Lid
              </h3>
              <div className="space-y-6">
                 <div>
                    <label className="text-xs font-bold uppercase text-neutral-500 tracking-widest mb-2 block">Naam</label>
                    <input 
                    type="text" 
                    placeholder="Volledige Naam"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-neutral-800 border-2 border-neutral-700 text-white rounded-xl p-4 focus:border-levant-gold outline-none text-lg"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold uppercase text-neutral-500 tracking-widest mb-2 block">Rol</label>
                    <select 
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as Role)}
                    className="w-full bg-neutral-800 border-2 border-neutral-700 text-white rounded-xl p-4 focus:border-levant-gold outline-none text-lg"
                    >
                    {Object.values(Role).map(r => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                    </select>
                 </div>
                 <Button onClick={handleAddEmp} className="w-full py-4 text-lg">Toevoegen</Button>
              </div>
           </div>

           <div className="md:col-span-2 space-y-4">
              {employees.map(emp => (
                 <div key={emp.id} className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${emp.isActive ? 'bg-neutral-800/50 border-neutral-700 hover:border-levant-gold/30' : 'bg-neutral-900 border-neutral-800 opacity-50'}`}>
                    <div className="flex items-center gap-6">
                       <div className="w-14 h-14 rounded-full bg-neutral-700 flex items-center justify-center font-serif text-xl text-levant-gold shadow-inner">
                          {emp.name.charAt(0)}
                       </div>
                       <div>
                          <p className="font-bold text-white text-lg">{emp.name}</p>
                          <p className="text-sm font-bold uppercase tracking-widest text-neutral-400">{emp.role}</p>
                       </div>
                    </div>
                    {emp.isActive && (
                      <button 
                        onClick={() => setEmployeeToDelete(emp.id)} 
                        className="text-red-500 hover:bg-red-900/20 p-4 rounded-xl transition-colors border border-transparent hover:border-red-900/50"
                      >
                        <UserMinus size={24} />
                      </button>
                    )}
                 </div>
              ))}
           </div>
        </div>
      )}
      
      {activeTab === 'logs' && (
        <div className="space-y-4">
           <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden">
             {completedLogs.map(log => {
               const emp = employees.find(e => e.id === log.employeeId);
               const isEditing = editingLogId === log.id;
               
               return (
                 <div key={log.id} className="border-b border-neutral-800 p-6 transition-colors hover:bg-white/5 last:border-0">
                    {isEditing ? (
                       <div className="bg-black/40 p-6 rounded-xl border border-levant-gold space-y-6">
                          <div className="flex justify-between items-center mb-2">
                             <h4 className="font-bold text-white text-lg">Wijzig Tijd voor {emp?.name}</h4>
                             <button onClick={() => setEditingLogId(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
                          </div>
                          <div className="grid md:grid-cols-2 gap-6">
                             <div>
                               <label className="text-xs font-bold uppercase text-neutral-500 tracking-widest mb-2 block">Starttijd</label>
                               <input type="datetime-local" value={editIn} onChange={e => setEditIn(e.target.value)} className="w-full bg-neutral-800 p-4 rounded-xl text-white border border-neutral-600 focus:border-levant-gold outline-none" />
                             </div>
                             <div>
                               <label className="text-xs font-bold uppercase text-neutral-500 tracking-widest mb-2 block">Eindtijd</label>
                               <input type="datetime-local" value={editOut} onChange={e => setEditOut(e.target.value)} className="w-full bg-neutral-800 p-4 rounded-xl text-white border border-neutral-600 focus:border-levant-gold outline-none" />
                             </div>
                          </div>
                          <div>
                             <label className="text-xs font-bold uppercase text-neutral-500 tracking-widest mb-2 block">Reden van wijziging (Verplicht)</label>
                             <input 
                              type="text" 
                              value={editReason} 
                              onChange={e => setEditReason(e.target.value)} 
                              placeholder="Bijv. Vergeten uit te klokken"
                              className="w-full bg-neutral-800 p-4 rounded-xl text-white border border-neutral-600 focus:border-levant-gold outline-none" 
                             />
                          </div>
                          <div className="flex justify-end gap-4 pt-2">
                             <Button variant="secondary" size="lg" onClick={() => setEditingLogId(null)}>Annuleren</Button>
                             <Button size="lg" onClick={saveEdit}><Save size={20} /> Opslaan</Button>
                          </div>
                       </div>
                    ) : (
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex-1">
                             <div className="flex items-center gap-3 mb-2">
                                <span className="font-bold text-white text-lg">{emp?.name}</span>
                                <span className="text-sm text-neutral-500 bg-neutral-800 px-2 py-1 rounded">
                                    {new Date(log.date).toLocaleDateString('nl-NL', {weekday: 'short', day: 'numeric', month: 'short'})}
                                </span>
                             </div>
                             <div className="flex flex-wrap items-center gap-4 text-base text-neutral-300">
                                <span className="bg-neutral-800/50 px-3 py-1 rounded border border-neutral-800">
                                    {new Date(log.clockIn).toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'})} - {log.clockOut ? new Date(log.clockOut).toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'}) : '...'}
                                </span>
                                {log.clockOut && (
                                   <span className="text-levant-gold font-mono font-bold text-lg">
                                     {((new Date(log.clockOut).getTime() - new Date(log.clockIn).getTime()) / (1000 * 60 * 60)).toFixed(2)}u
                                   </span>
                                )}
                             </div>
                             {log.edits.length > 0 && (
                               <div className="mt-3 text-xs text-neutral-500 flex items-center gap-2">
                                  <AlertTriangle size={12} className="text-orange-400" /> 
                                  <span>Laatste wijziging: {log.edits[log.edits.length-1].adminName} ({new Date(log.edits[log.edits.length-1].date).toLocaleDateString()})</span>
                               </div>
                             )}
                          </div>
                          <Button variant="secondary" size="md" onClick={() => startEdit(log)} className="md:w-auto w-full">
                            Wijzigen
                          </Button>
                       </div>
                    )}
                 </div>
               )
             })}
           </div>
        </div>
      )}

      {activeTab === 'audit' && (
         <div className="bg-levant-gray/30 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-neutral-800 bg-neutral-900/50">
               <h3 className="font-serif text-xl text-levant-gold flex items-center gap-3">
                  <History size={24} /> Audit Logboek
               </h3>
               <p className="text-sm text-neutral-500 mt-1">Geschiedenis van alle administratieve wijzigingen</p>
            </div>
            {auditTrail.length === 0 ? (
               <div className="p-16 text-center text-neutral-500 italic text-lg">
                  Nog geen wijzigingen geregistreerd.
               </div>
            ) : (
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-neutral-400 min-w-[800px]">
                     <thead className="bg-neutral-900 text-xs uppercase font-bold text-neutral-500">
                        <tr>
                           <th className="p-6">Tijdstip Wijziging</th>
                           <th className="p-6">Medewerker</th>
                           <th className="p-6">Dienst Datum</th>
                           <th className="p-6">Wijziging</th>
                           <th className="p-6">Reden</th>
                           <th className="p-6">Admin</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-neutral-800">
                        {auditTrail.map((audit, idx) => (
                           <tr key={idx} className="hover:bg-white/5 transition-colors">
                              <td className="p-6 font-mono text-white">
                                 {new Date(audit.date).toLocaleString('nl-NL')}
                              </td>
                              <td className="p-6 font-bold text-white">
                                 {getEmployeeName(audit.employeeId)}
                              </td>
                              <td className="p-6">
                                 {audit.logDate}
                              </td>
                              <td className="p-6 text-xs font-mono">
                                 {audit.previousIn !== audit.newIn && (
                                    <div className="flex flex-col gap-1 mb-2">
                                       <span className="text-red-400 line-through opacity-70">
                                          In: {new Date(audit.previousIn!).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                       </span>
                                       <span className="text-green-400">
                                          In: {new Date(audit.newIn!).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                       </span>
                                    </div>
                                 )}
                                 {audit.previousOut !== audit.newOut && (
                                    <div className="flex flex-col gap-1">
                                       <span className="text-red-400 line-through opacity-70">
                                          Uit: {audit.previousOut ? new Date(audit.previousOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'N/A'}
                                       </span>
                                       <span className="text-green-400">
                                          Uit: {audit.newOut ? new Date(audit.newOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'N/A'}
                                       </span>
                                    </div>
                                 )}
                              </td>
                              <td className="p-6 italic text-neutral-300">"{audit.reason}"</td>
                              <td className="p-6 text-levant-gold">{audit.adminName}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </div>
      )}

      {activeTab === 'settings' && (
          <div className="bg-neutral-900/80 border border-levant-gold/30 p-8 rounded-2xl max-w-xl mx-auto shadow-2xl">
             <div className="flex items-center gap-4 mb-8 border-b border-levant-gold/20 pb-6">
                <div className="p-4 bg-levant-gold text-black rounded-full">
                    <Settings size={28} />
                </div>
                <div>
                    <h3 className="text-2xl font-serif text-white">Admin Instellingen</h3>
                    <p className="text-neutral-400">Beveiliging en toegang</p>
                </div>
             </div>

             <div className="space-y-6">
                <div className="bg-red-900/10 border border-red-900/30 p-4 rounded-xl text-sm text-red-200">
                    <p className="flex items-center gap-2 font-bold mb-1"><Lock size={14}/> Beveiligde Actie</p>
                    Voer je Admin inloggegevens in om de dagelijkse pincode te wijzigen.
                </div>

                <div>
                    <label className="text-xs font-bold uppercase text-neutral-500 tracking-widest mb-2 block">Admin Email</label>
                    <input 
                        type="email" 
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full bg-neutral-800 border-2 border-neutral-700 text-white rounded-xl p-4 focus:border-levant-gold outline-none"
                    />
                </div>
                 <div>
                    <label className="text-xs font-bold uppercase text-neutral-500 tracking-widest mb-2 block">Admin Wachtwoord</label>
                    <input 
                        type="password" 
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full bg-neutral-800 border-2 border-neutral-700 text-white rounded-xl p-4 focus:border-levant-gold outline-none"
                    />
                </div>
                 <div>
                    <label className="text-xs font-bold uppercase text-levant-gold tracking-widest mb-2 block flex items-center gap-2">
                        <KeyRound size={14}/> Nieuwe Pincode
                    </label>
                    <input 
                        type="text" 
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        maxLength={6}
                        placeholder="1234"
                        className="w-full bg-neutral-800 border-2 border-neutral-700 text-white rounded-xl p-4 focus:border-levant-gold outline-none text-2xl tracking-[0.5em] text-center"
                    />
                </div>

                {settingsMsg && (
                    <p className={`text-center font-bold ${settingsMsg.includes('succes') ? 'text-green-500' : 'text-red-500'}`}>
                        {settingsMsg}
                    </p>
                )}

                <Button onClick={handleChangePin} size="lg" className="w-full mt-4">Pincode Wijzigen</Button>
             </div>
          </div>
      )}
    </div>
  );
};
