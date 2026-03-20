import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, BookMarked, BookOpen, History, BarChart2, Library, HelpCircle, ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PomodoroTimer } from './PomodoroTimer';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSidebarCollapsed, toggleSidebar, openModal } = useStore();

  return (
    <aside 
      className={`h-full bg-surface border-r border-white/5 shadow-[2px_0_15px_rgba(0,0,0,0.05)] shrink-0 flex flex-col transition-all duration-300 z-50
        ${isSidebarCollapsed ? 'w-[72px]' : 'w-[240px] hidden md:flex'}
      `}
    >
      {/* Brand / Logo */}
      <div className={`h-[72px] flex items-center border-b border-black/5 dark:border-white/5 ${isSidebarCollapsed ? 'justify-center' : 'justify-start px-6'}`}>
        <img 
          src="/regular-icon.png" 
          alt="Kikiyomi Logo" 
          className="w-10 h-10 rounded-xl shrink-0 shadow-md shadow-primary/20 object-cover"
        />
        {!isSidebarCollapsed && (
          <div className="ml-4 font-bold text-lg text-text tracking-wide whitespace-nowrap overflow-hidden">
            Kikiyomi
          </div>
        )}
      </div>

      {/* Main Nav Items */}
      <div className="flex-1 flex flex-col gap-2 py-6 px-3 overflow-hidden">
        <NavItem 
          icon={<LayoutDashboard size={22} />} 
          label="Dashboard" 
          active={location.pathname === '/'} 
          collapsed={isSidebarCollapsed}
          onClick={() => navigate('/')} 
        />
        <NavItem 
          icon={<Library size={22} />} 
          label="Library" 
          active={location.pathname === '/library'} 
          collapsed={isSidebarCollapsed}
          onClick={() => navigate('/library')} 
        />
        <NavItem 
          icon={<BarChart2 size={22} />} 
          label="Statistics" 
          active={location.pathname === '/statistics'} 
          collapsed={isSidebarCollapsed}
          onClick={() => navigate('/statistics')} 
        />
        {location.pathname.startsWith('/player') && (
          <NavItem 
            icon={<BookOpen size={22} />} 
            label="Reading Now" 
            active={true} 
            subtitle="Current Book"
            collapsed={isSidebarCollapsed}
          />
        )}
      </div>

      {/* Action / Modal Nav Items */}
      <div className="px-3 pb-3 flex flex-col gap-2 border-t border-black/5 dark:border-white/5 pt-6 overflow-hidden">
        <NavItem 
          icon={<BookMarked size={22} />} 
          label="Bookmarks" 
          collapsed={isSidebarCollapsed}
          onClick={() => openModal('isBookmarksOpen')} 
        />
        <NavItem 
          icon={<History size={22} />} 
          label="History" 
          collapsed={isSidebarCollapsed}
          onClick={() => openModal('isHistoryOpen')} 
        />
        <NavItem 
          icon={<Settings size={22} />} 
          label="Settings" 
          collapsed={isSidebarCollapsed}
          onClick={() => openModal('isSettingsOpen')} 
        />
        <NavItem 
          icon={<HelpCircle size={22} />} 
          label="Help" 
          collapsed={isSidebarCollapsed}
          onClick={() => openModal('isHelpOpen')} 
        />
      </div>

      {/* Pomodoro Timer Widget */}
      <PomodoroTimer />

      {/* Collapse Toggle */}
      <div className="px-3 pb-6 border-t border-black/5 dark:border-white/5 pt-3 overflow-hidden">
        <NavItem 
          icon={isSidebarCollapsed ? <ChevronRight size={22} /> : <ChevronLeft size={22} />} 
          label="Collapse" 
          collapsed={isSidebarCollapsed}
          onClick={toggleSidebar} 
        />
      </div>
    </aside>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  active?: boolean;
  collapsed: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, subtitle, active, collapsed, onClick }) => {
  return (
    <button 
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center p-3 rounded-xl border border-transparent transition-all duration-200 group cursor-pointer
        ${active 
          ? 'bg-primary/10 text-primary border-primary/20 shadow-sm' 
          : 'text-text-muted hover:bg-surface-hover hover:text-text hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]'
        }
      `}
    >
      <div className={`shrink-0 flex items-center justify-center ${active ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'} transition-opacity`}>
        {icon}
      </div>
      
      {!collapsed && (
        <div className="flex flex-col items-start ml-4 overflow-hidden">
          <span className={`text-sm font-semibold whitespace-nowrap tracking-wide leading-tight ${active ? 'text-text' : ''}`}>
            {label}
          </span>
          {subtitle && (
            <span className="text-[0.65rem] text-primary/70 uppercase tracking-widest font-bold mt-0.5 whitespace-nowrap">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </button>
  );
};
