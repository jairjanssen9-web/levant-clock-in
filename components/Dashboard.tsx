import React, { useState, useEffect } from 'react';
import { Employee, TimeLog } from '../types';
import { Button } from './Button';
import { LogIn, LogOut, CheckCircle2, History, UserX, Timer } from 'lucide-react';

interface DashboardProps {
  employees: Employee[];
  logs: TimeLog[];
  onClockIn: (employeeId: string) => void;
  onClockOut: (employeeId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ employees, logs, onClockIn, onClockOut }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employeeToClockOut, setEmployeeToClockOut] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get today's date string YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Logic to determine status
  const activeLogs = logs.filter(log => log.status === 'active');
  const activeEmployeeIds = activeLogs.map(log => log.employeeId);
  
  // Find employees who are NOT active but have a completed log for TODAY
  const finishedTodayIds = logs
    .filter(log => log.date === todayStr && log.status === 'completed' && !activeEmployeeIds.includes(log.employeeId))
    .map(log => log.employeeId);

  const confirmClockOut = () => {
    if (employeeToClockOut) {
      onClockOut(employeeToClockOut);
      setEmployeeToClockOut(null);
    }
  };

  const getClockOutName = () => employees.find(e => e.id === employeeToClockOut)?.name || 'je';

  // Helper to calculate live duration
  const getDurationString = (startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = currentTime.getTime();
    const diff = Math.max(0, now - start);
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}u ${minutes}m`;
  };

  return (
    <div className="space-y-8 animate-fade-in flex flex-col h-full relative">
      {/* Clock Out Confirmation Modal */}
      {employeeToClockOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
           <div className="bg-neutral-900 border border-levant-gold rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl transform scale-100 transition-all">
              <div className="flex flex-col items-center text-center space-y-4 md:space-y-5">
                 <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-neutral-800 text-levant-gold flex items-center justify-center mb-2 border border-levant-gold/30">
                    <LogOut size={28} className="md:w-8 md:h-8" />
                 </div>
                 <h3 className="text-xl md:text-2xl font-serif text-white">Uitklokken Bevestigen</h3>
                 <p className="text-neutral-400 text-sm md:text-base">
                   <strong className="text-white">{getClockOutName()}</strong>, weet je zeker dat je wilt uitklokken?
                 </p>
                 <div className="flex gap-4 w-full mt-6">
                    <Button variant="secondary" onClick={() => setEmployeeToClockOut(null)} className="flex-1 py-4 md:py-5">
                       Annuleren
                    </Button>
                    <Button variant="primary" onClick={confirmClockOut} className="flex-1 py-4 md:py-5">
                       Bevestigen
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-center border-b border-levant-gold/20 pb-6 md:pb-8">
        <div className="text-center md:text-left">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white mb-2">Wie ben jij?</h2>
          <p className="text-neutral-500 uppercase tracking-widest font-bold text-sm md:text-base lg:text-lg">
            Selecteer je naam om te starten
          </p>
        </div>
        <div className="text-center md:text-right mt-6 md:mt-0 bg-neutral-900/80 p-6 md:p-8 rounded-2xl border border-levant-gold/20 shadow-xl min-w-[280px] md:min-w-[320px]">
          <div className="text-5xl md:text-6xl lg:text-7xl font-black text-levant-gold font-sans tracking-tighter">
            {currentTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-neutral-400 uppercase tracking-widest text-xs md:text-sm font-bold mt-2">
            {currentTime.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </header>

      {/* Grid: 1 col mobile, 2 col iPad, 3 col desktop — iPad grotere gaps en kaarten */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 pb-20">
        {employees.filter(e => e.isActive).map(employee => {
          const isWorking = activeEmployeeIds.includes(employee.id);
          const hasFinished = finishedTodayIds.includes(employee.id);
          const currentLog = isWorking ? activeLogs.find(l => l.employeeId === employee.id) : null;
          
          // Dynamic styles based on status
          let cardStyle = "bg-neutral-900/60 border-neutral-800 hover:border-levant-gold/50 hover:bg-neutral-800";
          let avatarStyle = "bg-neutral-800 text-neutral-500";
          let statusLabel = <span className="text-neutral-600 text-xs md:text-sm uppercase font-bold tracking-widest flex items-center gap-2"><UserX size={14} className="md:w-4 md:h-4"/> Nog niet begonnen</span>;

          if (isWorking) {
            cardStyle = "bg-neutral-900 border-levant-gold shadow-[0_0_30px_rgba(212,175,55,0.15)] scale-[1.02]";
            avatarStyle = "bg-levant-gold text-black ring-4 ring-levant-gold/30";
            
            const clockInTime = currentLog ? new Date(currentLog.clockIn).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : '–';
            const duration = currentLog ? getDurationString(currentLog.clockIn) : '0u 0m';

            statusLabel = (
              <div className="flex flex-col gap-1.5 md:gap-2 w-full">
                <div className="text-levant-gold/90 text-xs md:text-sm font-bold uppercase tracking-wider">
                  Ingeklokt om {clockInTime}
                </div>
                <div className="flex items-center justify-center gap-2 text-levant-gold bg-levant-gold/10 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm md:text-base font-bold uppercase tracking-wide border border-levant-gold/20 animate-pulse">
                  <Timer size={14} className="md:w-4 md:h-4" />
                  <span>{duration}</span>
                </div>
              </div>
            );
          } else if (hasFinished) {
            cardStyle = "bg-neutral-900/30 border-neutral-800 opacity-80 hover:opacity-100";
            avatarStyle = "bg-neutral-800 text-neutral-600 border border-neutral-700";
             statusLabel = (
              <div className="flex items-center gap-2 text-neutral-400 bg-neutral-800 px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold uppercase tracking-wide">
                 <History size={14} className="md:w-4 md:h-4" />
                 Uitgeklokt vandaag
              </div>
            );
          }

          return (
            <div 
              key={employee.id} 
              className={`relative overflow-hidden rounded-3xl transition-all duration-300 border-2 p-1 ${cardStyle}`}
            >
              <div className="p-6 md:p-8 lg:p-8 flex flex-col items-center text-center space-y-4 md:space-y-5 h-full justify-between">
                
                <div className="flex flex-col items-center w-full">
                    {/* Avatar / Initial — iPad groter */}
                    <div className={`
                      w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center text-4xl md:text-5xl font-serif font-bold mb-4 shadow-2xl
                      ${avatarStyle}
                    `}>
                      {employee.name.charAt(0)}
                    </div>

                    {/* Name & Role — iPad grotere tekst */}
                    <div className="mb-4">
                      <h3 className={`text-2xl md:text-3xl lg:text-3xl font-bold leading-tight ${isWorking ? 'text-white' : 'text-neutral-300'}`}>
                        {employee.name}
                      </h3>
                      <p className="text-xs md:text-sm font-bold uppercase tracking-widest text-neutral-500 mt-2">
                        {employee.role}
                      </p>
                    </div>

                    {/* Status Indicator (ingeklokt om + duur) — iPad iets groter */}
                    <div className="min-h-[2.5rem] md:min-h-[3rem] flex items-center justify-center w-full mb-4">
                      {statusLabel}
                    </div>
                </div>

                {/* Massive Action Button — iPad grotere tap target */}
                <div className="w-full">
                  {isWorking ? (
                    <Button 
                      variant="clock-out" 
                      size="xl"
                      onClick={() => setEmployeeToClockOut(employee.id)}
                      className="w-full py-6 md:py-8 text-base md:text-xl font-black tracking-wide"
                    >
                      <LogOut size={24} className="md:w-7 md:h-7 shrink-0" />
                      <span className="whitespace-nowrap">Uitklokken</span>
                    </Button>
                  ) : (
                    <Button 
                      variant="clock-in" 
                      size="xl"
                      onClick={() => onClockIn(employee.id)}
                      className="w-full py-6 md:py-8 text-lg md:text-xl"
                    >
                      <LogIn size={28} className="md:w-8 md:h-8 shrink-0" /> INKLOKKEN
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
