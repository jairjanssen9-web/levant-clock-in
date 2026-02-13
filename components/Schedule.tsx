import React, { useState } from 'react';
import { Employee, Shift } from '../types';
import { Button } from './Button';
import { Plus, Trash2, Calendar as CalIcon } from 'lucide-react';

interface ScheduleProps {
  employees: Employee[];
  shifts: Shift[];
  onAddShift: (shift: Omit<Shift, 'id'>) => void;
  onRemoveShift: (id: string) => void;
  isAdmin: boolean;
}

export const Schedule: React.FC<ScheduleProps> = ({ employees, shifts, onAddShift, onRemoveShift, isAdmin }) => {
  // Simple week view based on today
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Generate 7 days starting from selectedDate (or beginning of week)
  const getDaysArray = () => {
    const days = [];
    const current = new Date(selectedDate);
    // Align to Monday? Let's just show next 7 days for simplicity
    for (let i = 0; i < 7; i++) {
      const d = new Date(current);
      d.setDate(current.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getDaysArray();

  const [newShiftEmp, setNewShiftEmp] = useState(employees[0]?.id || '');
  const [newShiftStart, setNewShiftStart] = useState('17:00');
  const [newShiftEnd, setNewShiftEnd] = useState('23:00');
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  const activeDateStr = weekDays[activeDayIdx].toISOString().split('T')[0];

  const handleAdd = () => {
    onAddShift({
      employeeId: newShiftEmp,
      date: activeDateStr,
      startTime: newShiftStart,
      endTime: newShiftEnd
    });
  };

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h2 className="text-3xl font-serif text-white mb-2">Week Rooster</h2>
        <p className="text-neutral-400">Planning voor de komende dagen</p>
      </header>

      {/* Date Navigation */}
      <div className="flex overflow-x-auto gap-4 pb-4 border-b border-levant-gray/50 custom-scrollbar">
        {weekDays.map((date, idx) => {
          const dateStr = date.toISOString().split('T')[0];
          const isSelected = idx === activeDayIdx;
          const dayShifts = shifts.filter(s => s.date === dateStr);

          return (
            <button
              key={idx}
              onClick={() => setActiveDayIdx(idx)}
              className={`
                min-w-[120px] p-4 rounded-lg border transition-all duration-300 flex flex-col items-center gap-1
                ${isSelected 
                  ? 'bg-levant-gold text-levant-black border-levant-gold' 
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-levant-gold/50'}
              `}
            >
              <span className="uppercase text-xs font-bold tracking-widest">
                {date.toLocaleDateString('nl-NL', { weekday: 'short' })}
              </span>
              <span className="text-2xl font-serif font-bold">
                {date.getDate()}
              </span>
              <span className="text-xs opacity-70">
                {dayShifts.length} diensten
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Shifts List for Active Day */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-xl font-serif text-levant-gold mb-4">
            Planning voor {weekDays[activeDayIdx].toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>

          <div className="bg-levant-gray/30 border border-levant-gold/10 rounded-lg p-6 min-h-[300px]">
            {shifts.filter(s => s.date === activeDateStr).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-500 italic">
                <CalIcon className="w-12 h-12 mb-2 opacity-20" />
                Geen diensten gepland voor deze dag.
              </div>
            ) : (
              <div className="space-y-3">
                {shifts
                  .filter(s => s.date === activeDateStr)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map(shift => {
                    const emp = employees.find(e => e.id === shift.employeeId);
                    if (!emp) return null;
                    return (
                      <div key={shift.id} className="flex items-center justify-between bg-neutral-900/80 p-4 rounded border-l-4 border-levant-gold">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-levant-gold font-bold font-serif">
                             {emp.name.charAt(0)}
                           </div>
                           <div>
                             <p className="font-bold text-white">{emp.name}</p>
                             <div className="flex items-center gap-2 text-sm text-neutral-400">
                               <span className="text-levant-gold">{shift.startTime}</span>
                               <span>-</span>
                               <span>{shift.endTime}</span>
                             </div>
                           </div>
                        </div>
                        {isAdmin && (
                          <button 
                            onClick={() => onRemoveShift(shift.id)}
                            className="p-2 text-red-500 hover:bg-red-900/20 rounded transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Admin Add Shift Panel */}
        {isAdmin ? (
          <div className="bg-neutral-900/90 border border-levant-gold/30 p-6 rounded-lg h-fit">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Plus size={18} className="text-levant-gold" /> 
              Dienst Toevoegen
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-neutral-500 mb-1">Medewerker</label>
                <select 
                  value={newShiftEmp}
                  onChange={(e) => setNewShiftEmp(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white rounded p-3 focus:border-levant-gold outline-none"
                >
                  {employees.filter(e => e.isActive).map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs uppercase text-neutral-500 mb-1">Start</label>
                   <input 
                    type="time" 
                    value={newShiftStart}
                    onChange={(e) => setNewShiftStart(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 text-white rounded p-3 focus:border-levant-gold outline-none"
                   />
                </div>
                <div>
                   <label className="block text-xs uppercase text-neutral-500 mb-1">Eind</label>
                   <input 
                    type="time" 
                    value={newShiftEnd}
                    onChange={(e) => setNewShiftEnd(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 text-white rounded p-3 focus:border-levant-gold outline-none"
                   />
                </div>
              </div>

              <Button onClick={handleAdd} className="w-full mt-4">
                Toevoegen aan Rooster
              </Button>
            </div>
          </div>
        ) : (
           <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-lg h-fit flex flex-col items-center text-center justify-center text-neutral-500">
             <p>Alleen beheerders kunnen het rooster aanpassen.</p>
           </div>
        )}
      </div>
    </div>
  );
};