import React from 'react';
import { Clock, FileText, Users, Menu, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  onTabChange, 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Inklokken', icon: <Clock size={24} /> },
    { id: 'hours', label: 'Uren Lijst', icon: <FileText size={24} /> },
    { id: 'admin', label: 'Admin', icon: <Users size={24} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-levant-black text-white font-sans selection:bg-levant-gold selection:text-black">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-levant-gray bg-levant-black/95 sticky top-0 z-50">
        <h1 className="text-2xl font-serif text-levant-gold tracking-widest font-bold">LEVANT</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-levant-gold p-3 min-h-[2.75rem] min-w-[2.75rem] flex items-center justify-center touch-target">
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Sidebar Navigation — iPad: breder, grotere tekst en knoppen */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 md:w-80 lg:w-80 bg-levant-dark border-r border-levant-gray transform transition-transform duration-300 ease-in-out
        md:sticky md:top-0 md:h-screen md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-10 md:p-8 md:pt-10 text-center border-b border-levant-gray/50">
          <h1 className="text-4xl md:text-5xl font-serif text-levant-gold tracking-widest mb-2 font-bold">LEVANT</h1>
          <p className="text-xs md:text-sm text-neutral-400 uppercase tracking-widest">Personeel</p>
        </div>

        <nav className="p-6 md:p-6 space-y-3 md:space-y-4 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`
                w-full flex items-center gap-4 px-6 py-5 md:py-6 rounded-2xl transition-all duration-200 text-lg md:text-xl
                min-h-[3.25rem] md:min-h-[3.75rem]
                ${activeTab === item.id 
                  ? 'bg-levant-gold text-levant-black font-black shadow-[0_0_20px_rgba(212,175,55,0.3)] scale-105' 
                  : 'text-neutral-500 hover:text-levant-gold hover:bg-white/5'}
              `}
            >
              <span className="shrink-0 [&>svg]:w-6 [&>svg]:h-6 md:[&>svg]:w-7 md:[&>svg]:h-7">{item.icon}</span>
              <span className="uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative min-h-screen bg-[url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-fixed">
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-sm z-0" />
        
        <div className="relative z-10 p-4 md:p-8 lg:p-10 max-w-7xl mx-auto flex flex-col min-h-screen md:pb-12">
          {children}
        </div>
      </main>
    </div>
  );
};
