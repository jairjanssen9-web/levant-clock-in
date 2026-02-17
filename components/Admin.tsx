import React, { useState, useMemo } from 'react';
import { Employee, TimeLog, Role } from '../types';
import { Button } from './Button';
import { UserPlus, UserMinus, Pencil, AlertTriangle, Save, X, History, FileText, LogOut, Settings, KeyRound, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminProps {
  employees: Employee[];
  logs: TimeLog[];
  onAddEmployee: (name: string, role: Role) => void;
  onEditEmployee: (id: string, name: string, role: Role) => void;
  onRemoveEmployee: (id: string) => void;
  onEditLog: (logId: string, newIn: string, newOut: string, reason: string) => void;
  onDeleteAllLogs: () => Promise<boolean>;
  onFullReset: () => Promise<boolean>;
  onLogout: () => void;
}

export const Admin: React.FC<AdminProps> = ({ employees, logs, onAddEmployee, onEditEmployee, onRemoveEmployee, onEditLog, onDeleteAllLogs, onFullReset, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'staff' | 'logs' | 'audit' | 'settings'>('staff');

  // New Employee State
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Role>(Role.SERVER);

  // Edit Employee State
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<Role>(Role.SERVER);

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
  const [confirmDeleteAllLogs, setConfirmDeleteAllLogs] = useState(false);
  const [deletingLogs, setDeletingLogs] = useState(false);
  const [confirmFullReset, setConfirmFullReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [deleteLogsError, setDeleteLogsError] = useState<string | null>(null);

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
  };

  const startEditEmployee = (emp: Employee) => {
    setEmployeeToEdit(emp);
    setEditName(emp.name);
    setEditRole(emp.role);
  };

  const saveEditEmployee = () => {
    if (employeeToEdit && editName.trim()) {
      onEditEmployee(employeeToEdit.id, editName.trim(), editRole);
      setEmployeeToEdit(null);
    }
  };

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
      {/* Full reset confirmation modal */}
      {confirmFullReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-red-500/70 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4 md:space-y-5">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-red-900/30 text-red-500 flex items-center justify-center mb-2">
                <AlertTriangle size={28} className="md:w-8 md:h-8" />
              </div>
              <h3 className="text-xl md:text-2xl font-serif text-white">Volledige reset</h3>
              <p className="text-neutral-400 text-sm md:text-base">
                Alle medewerkers, uren en instellingen (o.a. pincode) worden permanent verwijderd. Daarna verschijnt het <strong className="text-levant-gold">installatiescherm</strong> opnieuw, zodat de klant de app zelf kan instellen.
              </p>
              {resetError && (
                <p className="text-red-400 text-sm font-bold bg-red-900/20 px-4 py-2 rounded-lg w-full">
                  {resetError}
                </p>
              )}
              <div className="flex gap-4 w-full mt-6">
                <Button variant="secondary" onClick={() => { setConfirmFullReset(false); setResetError(null); }} className="flex-1 py-4 md:py-5" disabled={resetting}>
                  Annuleren
                </Button>
                <Button variant="danger" onClick={async () => {
                  setResetError(null);
                  setResetting(true);
                  const ok = await onFullReset();
                  setResetting(false);
                  if (!ok) setResetError('Reset mislukt. Controleer de verbinding en probeer opnieuw.');
                }} className="flex-1 py-4 md:py-5" disabled={resetting}>
                  {resetting ? 'Bezig...' : 'Reset uitvoeren'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete all logs confirmation modal */}
      {confirmDeleteAllLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-red-500/50 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4 md:space-y-5">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-red-900/20 text-red-500 flex items-center justify-center mb-2">
                <AlertTriangle size={28} className="md:w-8 md:h-8" />
              </div>
              <h3 className="text-xl md:text-2xl font-serif text-white">Alle uren verwijderen</h3>
              <p className="text-neutral-400 text-sm md:text-base">
                Alle opgeslagen in- en uitklokregistraties worden permanent verwijderd. Er wordt geen registratie van deze actie bewaard.
              </p>
              {deleteLogsError && (
                <p className="text-red-400 text-sm font-bold bg-red-900/20 px-4 py-2 rounded-lg w-full">
                  {deleteLogsError}
                </p>
              )}
              <div className="flex gap-4 w-full mt-6">
                <Button variant="secondary" onClick={() => { setConfirmDeleteAllLogs(false); setDeleteLogsError(null); }} className="flex-1 py-4 md:py-5" disabled={deletingLogs}>
                  Annuleren
                </Button>
                <Button variant="danger" onClick={async () => {
                  setDeleteLogsError(null);
                  setDeletingLogs(true);
                  const ok = await onDeleteAllLogs();
                  setDeletingLogs(false);
                  if (ok) setConfirmDeleteAllLogs(false);
                  else setDeleteLogsError('Verwijderen mislukt. Controleer de verbinding en probeer opnieuw.');
                }} className="flex-1 py-4 md:py-5" disabled={deletingLogs}>
                  {deletingLogs ? 'Bezig...' : 'Alles verwijderen'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deletion Confirmation Modal */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
           <div className="bg-neutral-900 border border-levant-gold rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl transform scale-100 transition-all">
              <div className="flex flex-col items-center text-center space-y-4 md:space-y-5">
                 <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-red-900/20 text-red-500 flex items-center justify-center mb-2">
                    <AlertTriangle size={28} className="md:w-8 md:h-8" />
                 </div>
                 <h3 className="text-xl md:text-2xl font-serif text-white">Weet je het zeker?</h3>
                 <p className="text-neutral-400 text-sm md:text-base">
                   Je staat op het punt om <strong className="text-white">{getEmployeeNameForDelete()}</strong> te verwijderen. De persoon verdwijnt uit de lijst; <strong className="text-levant-gold">gewerkte uren blijven nog een maand bewaard</strong> voor rapportage.
                 </p>
                 <div className="flex gap-4 w-full mt-6">
                    <Button variant="secondary" onClick={() => setEmployeeToDelete(null)} className="flex-1 py-4 md:py-5">
                       Annuleren
                    </Button>
                    <Button variant="danger" onClick={confirmDelete} className="flex-1 py-4 md:py-5">
                       Verwijderen
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {employeeToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-levant-gold rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <div className="flex flex-col space-y-6">
              <h3 className="text-xl md:text-2xl font-serif text-white flex items-center gap-2">
                <Pencil size={24} className="text-levant-gold md:w-7 md:h-7" /> Persoon aanpassen
              </h3>
              <div>
                <label className="text-xs md:text-sm font-bold uppercase text-neutral-500 tracking-widest mb-2 block">Naam</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-neutral-800 border-2 border-neutral-700 text-white rounded-xl p-4 md:p-5 focus:border-levant-gold outline-none text-base md:text-lg min-h-[3rem] md:min-h-[3.5rem]"
                  placeholder="Volledige naam"
                />
              </div>
              <div>
                <label className="text-xs md:text-sm font-bold uppercase text-neutral-500 tracking-widest mb-2 block">Rol</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as Role)}
                  className="w-full bg-neutral-800 border-2 border-neutral-700 text-white rounded-xl p-4 md:p-5 focus:border-levant-gold outline-none text-base md:text-lg min-h-[3rem] md:min-h-[3.5rem]"
                >
                  {Object.values(Role).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4 pt-2">
                <Button variant="secondary" onClick={() => setEmployeeToEdit(null)} className="flex-1">Annuleren</Button>
                <Button onClick={saveEditEmployee} className="flex-1" disabled={!editName.trim()}>
                  <Save size={18} className="md:w-5 md:h-5" /> Opslaan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
         <div>
            <h2 className="text-3xl md:text-4xl font-serif text-white mb-2">Beheer</h2>
            <p className="text-neutral-400 text-sm md:text-base">Team en tijdregistratie administratie</p>
         </div>
         <div className="flex items-center gap-3 md:gap-4 self-end md:self-auto w-full md:w-auto">
             <div className="flex gap-2 bg-neutral-900 p-2 rounded-xl border border-neutral-800 w-full md:w-auto overflow-x-auto">
               <button 
                onClick={() => setActiveTab('staff')}
                className={`px-5 py-3.5 md:px-6 md:py-4 rounded-lg text-sm md:text-base font-bold transition-all flex items-center gap-2 whitespace-nowrap min-h-[2.75rem] md:min-h-[3.25rem] ${activeTab === 'staff' ? 'bg-levant-gold text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
               >
                 <UserPlus size={18} className="md:w-5 md:h-5" /> Team
               </button>
               <button 
                onClick={() => setActiveTab('logs')}
                className={`px-5 py-3.5 md:px-6 md:py-4 rounded-lg text-sm md:text-base font-bold transition-all flex items-center gap-2 whitespace-nowrap min-h-[2.75rem] md:min-h-[3.25rem] ${activeTab === 'logs' ? 'bg-levant-gold text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
               >
                 <FileText size={18} className="md:w-5 md:h-5" /> Logboek
               </button>
               <button 
                onClick={() => setActiveTab('audit')}
                className={`px-5 py-3.5 md:px-6 md:py-4 rounded-lg text-sm md:text-base font-bold transition-all flex items-center gap-2 whitespace-nowrap min-h-[2.75rem] md:min-h-[3.25rem] ${activeTab === 'audit' ? 'bg-levant-gold text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
               >
                 <History size={18} className="md:w-5 md:h-5" /> Audit
               </button>
               <button 
                onClick={() => setActiveTab('settings')}
                className={`px-5 py-3.5 md:px-6 md:py-4 rounded-lg text-sm md:text-base font-bold transition-all flex items-center gap-2 whitespace-nowrap min-h-[2.75rem] md:min-h-[3.25rem] ${activeTab === 'settings' ? 'bg-levant-gold text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
               >
                 <Settings size={18} className="md:w-5 md:h-5" />
               </button>
             </div>
             <Button variant="secondary" onClick={onLogout} className="h-full min-h-[2.75rem] md:min-h-[3.25rem] aspect-square md:aspect-auto md:px-6">
                <LogOut size={20} className="md:w-5 md:h-5" /> <span className="hidden md:inline">Uitloggen</span>
             </Button>
         </div>
      </header>

      {activeTab === 'staff' && (
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
           <div className="bg-neutral-900/80 border border-levant-gold/30 p-6 md:p-8 rounded-2xl h-fit shadow-lg">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <UserPlus size={24} className="md:w-7 md:h-7 text-levant-gold" /> Nieuw Lid
              </h3>
              <div className="space-y-6">
                 <div>
                    <label className="text-xs md:text-sm font-bold uppercase text-neutral-500 tracking-widest mb-2 block">Naam</label>
                    <input 
                    type="text" 
                    placeholder="Volledige Naam"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-neutral-800 border-2 border-neutral-700 text-white rounded-xl p-4 md:p-5 focus:border-levant-gold outline-none text-lg md:text-xl min-h-[3rem] md:min-h-[3.5rem]"
                    />
                 </div>
                 <div>
                    <label className="text-xs md:text-sm font-bold uppercase text-neutral-500 tracking-widest mb-2 block">Rol</label>
                    <select 
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as Role)}
                    className="w-full bg-neutral-800 border-2 border-neutral-700 text-white rounded-xl p-4 md:p-5 focus:border-levant-gold outline-none text-lg md:text-xl min-h-[3rem] md:min-h-[3.5rem]"
                    >
                    {Object.values(Role).map(r => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                    </select>
                 </div>
                 <Button onClick={handleAddEmp} className="w-full py-4 md:py-5 text-lg md:text-xl">Toevoegen</Button>
              </div>
           </div>

           <div className="md:col-span-2 space-y-4">
              {employees.filter(e => e.isActive).map(emp => (
                 <div key={emp.id} className="flex items-center justify-between p-5 md:p-6 rounded-2xl border transition-all min-h-[4rem] md:min-h-[4.5rem] bg-neutral-800/50 border-neutral-700 hover:border-levant-gold/30">
                    <div className="flex items-center gap-4 md:gap-6">
                       <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-neutral-700 flex items-center justify-center font-serif text-lg md:text-xl text-levant-gold shadow-inner shrink-0">
                          {emp.name.charAt(0)}
                       </div>
                       <div>
                          <p className="font-bold text-white text-base md:text-lg">{emp.name}</p>
                          <p className="text-xs md:text-sm font-bold uppercase tracking-widest text-neutral-400">{emp.role}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEditEmployee(emp)}
                        className="text-levant-gold hover:bg-levant-gold/20 p-3 md:p-4 rounded-xl transition-colors border border-transparent hover:border-levant-gold/50 min-h-[2.75rem] min-w-[2.75rem] md:min-h-[3.25rem] md:min-w-[3.25rem] flex items-center justify-center"
                        title="Persoon aanpassen"
                      >
                        <Pencil size={22} className="md:w-6 md:h-6" />
                      </button>
                      <button 
                        onClick={() => setEmployeeToDelete(emp.id)} 
                        className="text-red-500 hover:bg-red-900/20 p-3 md:p-4 rounded-xl transition-colors border border-transparent hover:border-red-900/50 min-h-[2.75rem] min-w-[2.75rem] md:min-h-[3.25rem] md:min-w-[3.25rem] flex items-center justify-center"
                        title="Verwijderen (uren blijven bewaard)"
                      >
                        <UserMinus size={22} className="md:w-6 md:h-6" />
                      </button>
                    </div>
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
                 <div key={log.id} className="border-b border-neutral-800 p-5 md:p-6 transition-colors hover:bg-white/5 last:border-0">
                    {isEditing ? (
                       <div className="bg-black/40 p-5 md:p-6 rounded-xl border border-levant-gold space-y-6">
                          <div className="flex justify-between items-center mb-2">
                             <h4 className="font-bold text-white text-lg md:text-xl">Wijzig Tijd voor {emp?.name}</h4>
                             <button onClick={() => setEditingLogId(null)} className="p-2 md:p-3 hover:bg-white/10 rounded-full min-h-[2.75rem] min-w-[2.75rem] flex items-center justify-center"><X size={24} className="md:w-6 md:h-6" /></button>
                          </div>
                          <div className="grid md:grid-cols-2 gap-6">
                             <div>
                               <label className="text-xs md:text-sm font-bold uppercase text-neutral-500 tracking-widest mb-2 block">Starttijd</label>
                               <input type="datetime-local" value={editIn} onChange={e => setEditIn(e.target.value)} className="w-full bg-neutral-800 p-4 md:p-5 rounded-xl text-white border border-neutral-600 focus:border-levant-gold outline-none text-base md:text-lg min-h-[3rem] md:min-h-[3.5rem]" />
                             </div>
                             <div>
                               <label className="text-xs md:text-sm font-bold uppercase text-neutral-500 tracking-widest mb-2 block">Eindtijd</label>
                               <input type="datetime-local" value={editOut} onChange={e => setEditOut(e.target.value)} className="w-full bg-neutral-800 p-4 md:p-5 rounded-xl text-white border border-neutral-600 focus:border-levant-gold outline-none text-base md:text-lg min-h-[3rem] md:min-h-[3.5rem]" />
                             </div>
                          </div>
                          <div>
                             <label className="text-xs md:text-sm font-bold uppercase text-neutral-500 tracking-widest mb-2 block">Reden van wijziging (Verplicht)</label>
                             <input 
                              type="text" 
                              value={editReason} 
                              onChange={e => setEditReason(e.target.value)} 
                              placeholder="Bijv. Vergeten uit te klokken"
                              className="w-full bg-neutral-800 p-4 md:p-5 rounded-xl text-white border border-neutral-600 focus:border-levant-gold outline-none text-base md:text-lg min-h-[3rem] md:min-h-[3.5rem]" 
                             />
                          </div>
                          <div className="flex justify-end gap-4 pt-2">
                             <Button variant="secondary" size="lg" onClick={() => setEditingLogId(null)}>Annuleren</Button>
                             <Button size="lg" onClick={saveEdit}><Save size={20} className="md:w-5 md:h-5" /> Opslaan</Button>
                          </div>
                       </div>
                    ) : (
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                          <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <span className="font-bold text-white text-lg md:text-xl">{emp?.name}</span>
                                <span className="text-sm md:text-base text-neutral-500 bg-neutral-800 px-2 py-1 rounded">
                                    {new Date(log.date).toLocaleDateString('nl-NL', {weekday: 'short', day: 'numeric', month: 'short'})}
                                </span>
                             </div>
                             <div className="flex flex-wrap items-center gap-4 text-base md:text-lg text-neutral-300">
                                <span className="bg-neutral-800/50 px-3 py-1.5 rounded border border-neutral-800">
                                    {new Date(log.clockIn).toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'})} - {log.clockOut ? new Date(log.clockOut).toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'}) : '...'}
                                </span>
                                {log.clockOut && (
                                   <span className="text-levant-gold font-mono font-bold text-lg md:text-xl">
                                     {((new Date(log.clockOut).getTime() - new Date(log.clockIn).getTime()) / (1000 * 60 * 60)).toFixed(2)}u
                                   </span>
                                )}
                             </div>
                             {log.edits.length > 0 && (
                               <div className="mt-3 text-xs md:text-sm text-neutral-500 flex items-center gap-2">
                                  <AlertTriangle size={12} className="text-orange-400 md:w-3.5 md:h-3.5" /> 
                                  <span>Laatste wijziging: {log.edits[log.edits.length-1].adminName} ({new Date(log.edits[log.edits.length-1].date).toLocaleDateString()})</span>
                               </div>
                             )}
                          </div>
                          <Button variant="secondary" size="md" onClick={() => startEdit(log)} className="md:w-auto w-full min-h-[3rem] md:min-h-[3.25rem]">
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
            <div className="p-5 md:p-6 border-b border-neutral-800 bg-neutral-900/50">
               <h3 className="font-serif text-xl md:text-2xl text-levant-gold flex items-center gap-3">
                  <History size={24} className="md:w-7 md:h-7" /> Audit Logboek
               </h3>
               <p className="text-sm md:text-base text-neutral-500 mt-1">Geschiedenis van alle administratieve wijzigingen</p>
            </div>
            {auditTrail.length === 0 ? (
               <div className="p-12 md:p-16 text-center text-neutral-500 italic text-base md:text-lg">
                  Nog geen wijzigingen geregistreerd.
               </div>
            ) : (
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm md:text-base text-neutral-400 min-w-[800px]">
                     <thead className="bg-neutral-900 text-xs md:text-sm uppercase font-bold text-neutral-500">
                        <tr>
                           <th className="p-4 md:p-6">Tijdstip Wijziging</th>
                           <th className="p-4 md:p-6">Medewerker</th>
                           <th className="p-4 md:p-6">Dienst Datum</th>
                           <th className="p-4 md:p-6">Wijziging</th>
                           <th className="p-4 md:p-6">Reden</th>
                           <th className="p-4 md:p-6">Admin</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-neutral-800">
                        {auditTrail.map((audit, idx) => (
                           <tr key={idx} className="hover:bg-white/5 transition-colors">
                              <td className="p-4 md:p-6 font-mono text-white text-xs md:text-sm">
                                 {new Date(audit.date).toLocaleString('nl-NL')}
                              </td>
                              <td className="p-4 md:p-6 font-bold text-white">
                                 {getEmployeeName(audit.employeeId)}
                              </td>
                              <td className="p-4 md:p-6">
                                 {audit.logDate}
                              </td>
                              <td className="p-4 md:p-6 text-xs md:text-sm font-mono">
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
                              <td className="p-4 md:p-6 italic text-neutral-300 text-xs md:text-sm">"{audit.reason}"</td>
                              <td className="p-4 md:p-6 text-levant-gold">{audit.adminName}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </div>
      )}

      {activeTab === 'settings' && (
          <div className="bg-neutral-900/80 border border-levant-gold/30 p-6 md:p-8 rounded-2xl max-w-xl mx-auto shadow-2xl">
             <div className="flex items-center gap-4 mb-6 md:mb-8 border-b border-levant-gold/20 pb-6">
                <div className="p-4 md:p-5 bg-levant-gold text-black rounded-full shrink-0">
                    <Settings size={28} className="md:w-8 md:h-8" />
                </div>
                <div>
                    <h3 className="text-2xl md:text-3xl font-serif text-white">Admin Instellingen</h3>
                    <p className="text-neutral-400 text-sm md:text-base">Beveiliging en toegang</p>
                </div>
             </div>

             <div className="space-y-6">
                <div className="bg-red-900/10 border border-red-900/30 p-4 md:p-5 rounded-xl text-sm md:text-base text-red-200">
                    <p className="flex items-center gap-2 font-bold mb-1"><Lock size={14} className="md:w-4 md:h-4"/> Beveiligde Actie</p>
                    Voer je Admin inloggegevens in om de dagelijkse pincode te wijzigen.
                </div>

                <div>
                    <label className="text-xs md:text-sm font-bold uppercase text-neutral-500 tracking-widest mb-2 block">Admin Email</label>
                    <input 
                        type="email" 
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full bg-neutral-800 border-2 border-neutral-700 text-white rounded-xl p-4 md:p-5 focus:border-levant-gold outline-none text-base md:text-lg min-h-[3rem] md:min-h-[3.5rem]"
                    />
                </div>
                 <div>
                    <label className="text-xs md:text-sm font-bold uppercase text-neutral-500 tracking-widest mb-2 block">Admin Wachtwoord</label>
                    <input 
                        type="password" 
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full bg-neutral-800 border-2 border-neutral-700 text-white rounded-xl p-4 md:p-5 focus:border-levant-gold outline-none text-base md:text-lg min-h-[3rem] md:min-h-[3.5rem]"
                    />
                </div>
                 <div>
                    <label className="text-xs md:text-sm font-bold uppercase text-levant-gold tracking-widest mb-2 block flex items-center gap-2">
                        <KeyRound size={14} className="md:w-4 md:h-4"/> Nieuwe Pincode
                    </label>
                    <input 
                        type="text" 
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        maxLength={6}
                        placeholder="1234"
                        className="w-full bg-neutral-800 border-2 border-neutral-700 text-white rounded-xl p-4 md:p-5 focus:border-levant-gold outline-none text-xl md:text-2xl tracking-[0.5em] text-center min-h-[3rem] md:min-h-[3.5rem]"
                    />
                </div>

                {settingsMsg && (
                    <p className={`text-center font-bold ${settingsMsg.includes('succes') ? 'text-green-500' : 'text-red-500'}`}>
                        {settingsMsg}
                    </p>
                )}

                <Button onClick={handleChangePin} size="lg" className="w-full mt-4 py-4 md:py-5 text-base md:text-lg">Pincode Wijzigen</Button>

                <div className="border-t border-neutral-700 pt-6 md:pt-8 mt-6 md:mt-8">
                  <p className="flex items-center gap-2 font-bold text-red-300 mb-2 text-sm md:text-base"><AlertTriangle size={14} className="md:w-4 md:h-4"/> Gevaarzone</p>
                  <p className="text-sm md:text-base text-neutral-500 mb-4">Verwijder alle opgeslagen uren (inklok/uitklok). Er wordt geen audit of registratie van deze actie bijgehouden.</p>
                  <Button variant="danger" size="lg" className="w-full py-4 md:py-5 text-base md:text-lg mb-4" onClick={() => setConfirmDeleteAllLogs(true)}>
                    Alle uren verwijderen
                  </Button>
                  <p className="text-sm md:text-base text-neutral-500 mb-2 mt-6 pt-4 border-t border-neutral-700">Voor overdracht aan klant: alles wissen en opnieuw het installatiescherm tonen.</p>
                  <Button variant="danger" size="lg" className="w-full py-4 md:py-5 text-base md:text-lg border-2 border-red-500" onClick={() => setConfirmFullReset(true)}>
                    Volledige reset (installatie opnieuw)
                  </Button>
                </div>
             </div>
          </div>
      )}
    </div>
  );
};
