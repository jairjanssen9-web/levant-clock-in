import React, { useRef, useCallback, useState } from 'react';
import { Clock, FileText, Users, Menu, X } from 'lucide-react';

const SIDEBAR_WIDTH = 280;

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
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartX = useRef(0);
  const touchStartOffset = useRef(0);

  const closeSidebar = useCallback(() => {
    setIsOpen(false);
    setDragOffset(0);
    setIsDragging(false);
  }, []);

  const openSidebar = useCallback(() => {
    setIsOpen(true);
    setDragOffset(0);
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, startedOnSidebar: boolean) => {
      if (!startedOnSidebar && !isOpen) return; // when closed, only handle from edge strip
      if (startedOnSidebar && isOpen) {
        touchStartX.current = e.touches[0].clientX;
        touchStartOffset.current = dragOffset;
        setIsDragging(true);
        return;
      }
      if (!isOpen && e.touches[0].clientX <= 24) {
        touchStartX.current = e.touches[0].clientX;
        touchStartOffset.current = dragOffset;
        setIsDragging(true);
      }
    },
    [isOpen, dragOffset]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      const x = e.touches[0].clientX;
      const deltaX = x - touchStartX.current;
      if (isOpen) {
        const next = touchStartOffset.current + deltaX;
        setDragOffset(Math.max(-SIDEBAR_WIDTH, Math.min(0, next)));
      } else {
        const next = touchStartOffset.current + deltaX;
        setDragOffset(Math.max(0, Math.min(SIDEBAR_WIDTH, next)));
      }
    },
    [isDragging, isOpen]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    const threshold = SIDEBAR_WIDTH * 0.35;
    if (isOpen) {
      setIsOpen(dragOffset > -threshold);
    } else {
      setIsOpen(dragOffset > threshold);
    }
    setDragOffset(0);
    setIsDragging(false);
  }, [isDragging, isOpen, dragOffset]);

  const handleTouchStartEdge = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartOffset.current = dragOffset;
    setIsDragging(true);
  }, [dragOffset]);

  const sidebarTransform = (() => {
    const base = isOpen ? 0 : -SIDEBAR_WIDTH;
    return `translateX(${base + dragOffset}px)`;
  })();

  const navItems = [
    { id: 'dashboard', label: 'Inklokken', icon: <Clock size={24} /> },
    { id: 'hours', label: 'Uren Lijst', icon: <FileText size={24} /> },
    { id: 'admin', label: 'Admin', icon: <Users size={24} /> },
  ];

  return (
    <div
      className="min-h-screen w-full bg-levant-black text-white font-sans selection:bg-levant-gold selection:text-black"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{ touchAction: isDragging ? 'none' : 'auto' }}
    >
      {/* Main content: fullscreen with scroll when content overflows (e.g. many employees) */}
      <main className="fixed inset-0 w-full flex flex-col bg-levant-black overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-fixed z-0" aria-hidden />
        <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-sm z-0" aria-hidden />
        <div className="relative z-10 flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto flex flex-col w-full flex-1 md:pb-12">
            {/* Menu button: always visible when sidebar closed */}
            <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
              <button
                type="button"
                onClick={openSidebar}
                className="text-levant-gold p-3 min-h-[2.75rem] min-w-[2.75rem] flex items-center justify-center rounded-xl hover:bg-white/10 active:bg-white/20 touch-manipulation"
                aria-label="Menu openen"
              >
                <Menu size={28} />
              </button>
              <h1 className="text-2xl md:text-3xl font-serif text-levant-gold tracking-widest font-bold pointer-events-none">
                LEVANT
              </h1>
              <div className="w-[2.75rem]" />
            </div>
            {children}
          </div>
        </div>
      </main>

      {/* Touch strip at left edge when sidebar closed — drag right to open */}
      {!isOpen && (
        <div
          className="fixed left-0 top-0 bottom-0 w-8 z-30 touch-manipulation"
          style={{ touchAction: 'none' }}
          onTouchStart={handleTouchStartEdge}
          aria-hidden
        />
      )}

      {/* Backdrop when sidebar open — tap to close */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 transition-opacity duration-200"
          style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
          onClick={closeSidebar}
          aria-hidden
        />
      )}

      {/* Sidebar: overlay, slides over content */}
      <aside
        className="fixed inset-y-0 left-0 z-40 w-[280px] bg-levant-dark border-r border-levant-gray shadow-2xl"
        style={{
          transform: sidebarTransform,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          touchAction: 'none',
        }}
        onTouchStart={(e) => handleTouchStart(e, true)}
      >
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-levant-gray/50">
          <h2 className="text-2xl font-serif text-levant-gold tracking-widest font-bold">LEVANT</h2>
          <button
            type="button"
            onClick={closeSidebar}
            className="text-levant-gold p-2 min-h-[2.75rem] min-w-[2.75rem] flex items-center justify-center rounded-xl hover:bg-white/10 active:bg-white/20 touch-manipulation"
            aria-label="Menu sluiten"
          >
            <X size={24} />
          </button>
        </div>
        <p className="text-xs md:text-sm text-neutral-400 uppercase tracking-widest px-4 pb-4">Personeel</p>
        <nav className="p-4 md:p-6 space-y-3 md:space-y-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onTabChange(item.id);
                closeSidebar();
              }}
              className={`
                w-full flex items-center gap-4 px-6 py-5 md:py-6 rounded-2xl transition-all duration-200 text-lg md:text-xl
                min-h-[3.25rem] md:min-h-[3.75rem] touch-manipulation
                ${activeTab === item.id
                  ? 'bg-levant-gold text-levant-black font-black shadow-[0_0_20px_rgba(212,175,55,0.3)] scale-105'
                  : 'text-neutral-500 hover:text-levant-gold hover:bg-white/5 active:bg-white/10'}
              `}
            >
              <span className="shrink-0 [&>svg]:w-6 [&>svg]:h-6 md:[&>svg]:w-7 md:[&>svg]:h-7">{item.icon}</span>
              <span className="uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </div>
  );
};
