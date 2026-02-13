import React, { useState, useMemo } from 'react';
import { Employee, TimeLog } from '../types';
import { Button } from './Button';
import { Download, Calendar, Clock, FileText, Pencil } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface HoursAndPayProps {
  employees: Employee[];
  logs: TimeLog[];
}

export const HoursAndPay: React.FC<HoursAndPayProps> = ({ employees, logs }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');

  const employee = employees.find(e => e.id === selectedEmpId);

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

    // Table
    const tableData = monthlyLogs.map(log => {
      const date = log.date;
      const start = log.clockIn ? new Date(log.clockIn).toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'}) : '-';
      const end = log.clockOut ? new Date(log.clockOut).toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'}) : '-';
      
      let hoursStr = '0.00';
      if(log.clockIn && log.clockOut) {
          const diff = (new Date(log.clockOut).getTime() - new Date(log.clockIn).getTime()) / (1000 * 60 * 60);
          hoursStr = diff.toFixed(2);
      }

      const edited = log.edits.length > 0 ? `Ja (${log.edits.length})` : 'Nee';

      return [date, start, end, hoursStr, edited];
    });

    autoTable(doc, {
      startY: 70,
      head: [['Datum', 'Start', 'Eind', 'Uren', 'Aangepast']],
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

  return (
    <div className="space-y-8">
       <header>
        <h2 className="text-4xl font-serif text-white mb-2">Uren Lijst</h2>
        <p className="text-neutral-400 font-bold uppercase tracking-widest">Bekijk gewerkte uren & exporteer</p>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-8 rounded-3xl space-y-8 h-fit shadow-lg">
          <div>
            <label className="block text-xs uppercase text-levant-gold mb-3 font-black tracking-widest">Kies Medewerker</label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full bg-neutral-800 border-2 border-neutral-700 text-white text-lg rounded-xl p-4 focus:border-levant-gold outline-none font-bold"
            >
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase text-levant-gold mb-3 font-black tracking-widest">Maand</label>
            <input 
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-neutral-800 border-2 border-neutral-700 text-white text-lg rounded-xl p-4 focus:border-levant-gold outline-none font-bold"
            />
          </div>

          <div className="pt-4">
            <Button onClick={generatePDF} className="w-full" size="lg" variant="primary">
              <Download size={20} /> Download PDF
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="md:col-span-2 space-y-6">
            {/* Cards */}
            <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 border border-levant-gold/30 p-8 rounded-3xl relative overflow-hidden flex items-center justify-between">
                <div>
                   <p className="text-sm text-levant-gold uppercase tracking-widest mb-2 font-black">Totaal Uren ({new Date(selectedMonth).toLocaleString('nl-NL', {month: 'long'})})</p>
                   <div className="flex items-baseline gap-3">
                      <p className="text-7xl font-serif text-white font-bold">{totalHours.toFixed(2)}</p>
                      <span className="text-2xl font-sans text-neutral-500 font-bold">uur</span>
                   </div>
                </div>
                <div className="opacity-10 text-levant-gold">
                   <Clock size={120} />
                </div>
            </div>

            {/* List */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl overflow-hidden">
               <div className="grid grid-cols-4 bg-neutral-900 p-6 text-xs font-black text-neutral-500 uppercase tracking-widest">
                 <div className="col-span-1">Datum</div>
                 <div className="col-span-1">Tijden</div>
                 <div className="col-span-1 text-right">Uren</div>
                 <div className="col-span-1 text-right">Info</div>
               </div>
               
               <div className="divide-y divide-neutral-800 max-h-[500px] overflow-y-auto custom-scrollbar">
                 {monthlyLogs.length === 0 ? (
                   <div className="p-12 text-center text-neutral-500 italic text-lg">Geen uren gevonden voor deze maand.</div>
                 ) : (
                    monthlyLogs.map(log => {
                      const hours = log.clockOut 
                        ? ((new Date(log.clockOut).getTime() - new Date(log.clockIn).getTime()) / (1000 * 60 * 60)).toFixed(2) 
                        : '...';
                      
                      return (
                        <div key={log.id} className="grid grid-cols-4 p-6 text-base hover:bg-white/5 transition-colors items-center">
                          <div className="text-white font-bold">
                            {new Date(log.date).toLocaleDateString('nl-NL', {weekday: 'short', day: 'numeric'})}
                          </div>
                          <div className="text-neutral-400 text-sm">
                            <span className="block">{new Date(log.clockIn).toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'})} IN</span>
                             {log.clockOut && <span className="block">{new Date(log.clockOut).toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'})} UIT</span>}
                          </div>
                          <div className="text-right text-levant-gold font-mono font-bold text-xl">{hours}</div>
                          <div className="text-right flex items-center justify-end gap-2">
                            {log.edits.length > 0 ? (
                              <>
                                <span title="Deze uren zijn door een admin aangepast" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40" aria-hidden="true">
                                  <Pencil size={16} strokeWidth={2.5} />
                                </span>
                                <span className="text-[10px] bg-neutral-800 text-amber-400 px-2 py-1 rounded border border-neutral-700 font-bold uppercase tracking-wider">
                                  Aangepast
                                </span>
                              </>
                            ) : (
                               <span className="text-neutral-700 text-xs">—</span>
                            )}
                          </div>
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