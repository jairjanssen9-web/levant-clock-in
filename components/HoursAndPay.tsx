import React, { useState, useMemo, useEffect } from 'react';
import { Employee, TimeLog } from '../types';
import { Button } from './Button';
import { Download, Calendar, Clock, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface HoursAndPayProps {
  employees: Employee[];
  logs: TimeLog[];
}

export const HoursAndPay: React.FC<HoursAndPayProps> = ({ employees, logs }) => {
  const activeEmployees = useMemo(() => employees.filter(e => e.isActive), [employees]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedEmpId, setSelectedEmpId] = useState(activeEmployees[0]?.id || '');

  // Als de geselecteerde medewerker is verwijderd, kies de eerste actieve
  useEffect(() => {
    const stillActive = activeEmployees.some(e => e.id === selectedEmpId);
    if (!stillActive && activeEmployees.length > 0) {
      setSelectedEmpId(activeEmployees[0].id);
    } else if (activeEmployees.length === 0) {
      setSelectedEmpId('');
    }
  }, [activeEmployees, selectedEmpId]);

  const employee = activeEmployees.find(e => e.id === selectedEmpId);

  // Filter logs for employee and month
  const monthlyLogs = useMemo(() => {
    return logs.filter(log => {
      const logMonth = log.date.substring(0, 7);
      return log.employeeId === selectedEmpId && logMonth === selectedMonth && log.status === 'completed';
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [logs, selectedEmpId, selectedMonth]);

  // Calculate total hours
  const totalHours = useMemo(() => {
    let total = 0;
    monthlyLogs.forEach(log => {
      if (log.clockIn && log.clockOut) {
        const start = new Date(log.clockIn).getTime();
        const end = new Date(log.clockOut).getTime();
        const hours = (end - start) / (1000 * 60 * 60);
        total += hours;
      }
    });
    return total;
  }, [monthlyLogs]);

  const generatePDF = () => {
    if (!employee) return;

    const doc: any = new jsPDF();

    // Header styling
    doc.setFillColor(20, 20, 20); // Dark background
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(212, 175, 55); // Levant Gold
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.text("LEVANT", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("Urenregistratie", 105, 30, { align: "center" });

    // Info Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Medewerker: ${employee.name}`, 14, 50);
    doc.text(`Maand: ${selectedMonth}`, 14, 56);
    
    doc.setFont("times", "bold");
    doc.text(`Totaal Uren: ${totalHours.toFixed(2)}`, 140, 50);

    // Table (geen kolom voor aanpassingen)
    const tableData = monthlyLogs.map(log => {
      const date = log.date;
      const start = log.clockIn ? new Date(log.clockIn).toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'}) : '-';
      const end = log.clockOut ? new Date(log.clockOut).toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'}) : '-';
      
      let hoursStr = '0.00';
      if(log.clockIn && log.clockOut) {
          const diff = (new Date(log.clockOut).getTime() - new Date(log.clockIn).getTime()) / (1000 * 60 * 60);
          hoursStr = diff.toFixed(2);
      }

      return [date, start, end, hoursStr];
    });

    autoTable(doc, {
      startY: 70,
      head: [['Datum', 'Start', 'Eind', 'Uren']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [28, 25, 23], textColor: [212, 175, 55] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable?.finalY || 150;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Dit document is automatisch gegenereerd door het Levant Personeelsportaal.", 14, finalY + 10);

    doc.save(`Levant_Uren_${employee.name.replace(' ', '_')}_${selectedMonth}.pdf`);
  };

  // Geen actieve medewerkers: toon alleen melding (geen PDF-mogelijkheid)
  if (activeEmployees.length === 0) {
    return (
      <div className="space-y-6 md:space-y-8">
        <header>
          <h2 className="text-4xl md:text-5xl font-serif text-white mb-2">Uren Lijst</h2>
          <p className="text-neutral-400 font-bold uppercase tracking-widest text-sm md:text-base">Bekijk gewerkte uren & exporteer</p>
        </header>
        <div className="bg-neutral-900/80 border border-neutral-800 p-8 md:p-12 rounded-3xl text-center shadow-lg">
          <p className="text-neutral-400 text-lg md:text-xl mb-2">Er staan geen medewerkers in het systeem.</p>
          <p className="text-neutral-500 text-sm md:text-base">Voeg in <strong className="text-levant-gold">Beheer → Team</strong> eerst medewerkers toe om uren te bekijken of een PDF te maken.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
       <header>
        <h2 className="text-4xl md:text-5xl font-serif text-white mb-2">Uren Lijst</h2>
        <p className="text-neutral-400 font-bold uppercase tracking-widest text-sm md:text-base">Bekijk gewerkte uren & exporteer</p>
      </header>

      <div className="grid md:grid-cols-3 gap-6 md:gap-8">
        {/* Alleen actieve medewerkers; PDF alleen voor hen */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-6 md:p-8 rounded-3xl space-y-6 md:space-y-8 h-fit shadow-lg">
          <div>
            <label className="block text-xs md:text-sm uppercase text-levant-gold mb-3 font-black tracking-widest">Kies Medewerker</label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full bg-neutral-800 border-2 border-neutral-700 text-white text-lg md:text-xl rounded-xl p-4 md:p-5 focus:border-levant-gold outline-none font-bold min-h-[3rem] md:min-h-[3.5rem]"
            >
              {activeEmployees.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs md:text-sm uppercase text-levant-gold mb-3 font-black tracking-widest">Maand</label>
            <input 
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-neutral-800 border-2 border-neutral-700 text-white text-lg md:text-xl rounded-xl p-4 md:p-5 focus:border-levant-gold outline-none font-bold min-h-[3rem] md:min-h-[3.5rem]"
            />
          </div>

          <div className="pt-2 md:pt-4">
            <Button onClick={generatePDF} className="w-full" size="lg" variant="primary" disabled={!employee}>
              <Download size={20} className="md:w-6 md:h-6" /> Download PDF
            </Button>
          </div>
        </div>

        {/* Results — iPad: grotere totalen en rijen */}
        <div className="md:col-span-2 space-y-6">
            <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 border border-levant-gold/30 p-6 md:p-8 rounded-3xl relative overflow-hidden flex items-center justify-between">
                <div>
                   <p className="text-sm md:text-base text-levant-gold uppercase tracking-widest mb-2 font-black">Totaal Uren ({new Date(selectedMonth).toLocaleString('nl-NL', {month: 'long'})})</p>
                   <div className="flex items-baseline gap-3">
                      <p className="text-6xl md:text-7xl lg:text-8xl font-serif text-white font-bold">{totalHours.toFixed(2)}</p>
                      <span className="text-xl md:text-2xl font-sans text-neutral-500 font-bold">uur</span>
                   </div>
                </div>
                <div className="opacity-10 text-levant-gold">
                   <Clock size={100} className="md:w-32 md:h-32" />
                </div>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl overflow-hidden">
               <div className="grid grid-cols-3 bg-neutral-900 p-4 md:p-6 text-xs md:text-sm font-black text-neutral-500 uppercase tracking-widest">
                 <div className="col-span-1">Datum</div>
                 <div className="col-span-1">Tijden</div>
                 <div className="col-span-1 text-right">Uren</div>
               </div>
               
               <div className="divide-y divide-neutral-800 max-h-[400px] md:max-h-[500px] overflow-y-auto custom-scrollbar">
               {monthlyLogs.length === 0 ? (
                  <div className="p-8 md:p-12 text-center text-neutral-500 text-base md:text-lg space-y-2">
                    <p className="italic">Geen uren gevonden voor deze maand.</p>
                    <p className="text-sm text-neutral-600">Kies een andere maand in de selector links; het logboek in Beheer toont uren van alle maanden.</p>
                  </div>
                ) : (
                    monthlyLogs.map(log => {
                      const hours = log.clockOut 
                        ? ((new Date(log.clockOut).getTime() - new Date(log.clockIn).getTime()) / (1000 * 60 * 60)).toFixed(2) 
                        : '...';
                      
                      return (
                        <div key={log.id} className="grid grid-cols-3 p-4 md:p-6 text-base md:text-lg hover:bg-white/5 transition-colors items-center min-h-[3.25rem] md:min-h-[3.75rem]">
                          <div className="text-white font-bold">
                            {new Date(log.date).toLocaleDateString('nl-NL', {weekday: 'short', day: 'numeric'})}
                          </div>
                          <div className="text-neutral-400 text-sm md:text-base">
                            <span className="block">{new Date(log.clockIn).toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'})} IN</span>
                             {log.clockOut && <span className="block">{new Date(log.clockOut).toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'})} UIT</span>}
                          </div>
                          <div className="text-right text-levant-gold font-mono font-bold text-xl md:text-2xl">{hours}</div>
                        </div>
                      )
                    })
                 )}
               </div>
            </div>
        </div>
      </div>
    </div>
  );
};