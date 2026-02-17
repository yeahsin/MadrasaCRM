
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { UserRole } from '../types';
import { ICONS } from '../constants';

const { Link, useLocation } = ReactRouterDOM;

interface LayoutProps {
  children: React.ReactNode;
  userRole: UserRole;
  userName: string;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, userRole, userName, onLogout }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const location = useLocation();

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth <= 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { label: 'Dashboard', path: '/', icon: ICONS.Dashboard, roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.SUBSTITUTE] },
    { label: 'Students', path: '/students', icon: ICONS.Talaba, roles: [UserRole.ADMIN, UserRole.TEACHER] },
    { label: 'Teachers', path: '/teachers', icon: ICONS.Asatizah, roles: [UserRole.ADMIN] },
    { label: 'Attendance', path: '/attendance', icon: ICONS.Attendance, roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.SUBSTITUTE] },
    { label: 'Halqat', path: '/courses', icon: ICONS.Halqat, roles: [UserRole.ADMIN, UserRole.TEACHER] },
    { label: 'Finance', path: '/finance', icon: ICONS.Finance, roles: [UserRole.ADMIN, UserRole.ACCOUNTANT] },
    { label: 'Hifz Tracker', path: '/performance', icon: ICONS.HifzProgress, roles: [UserRole.ADMIN, UserRole.TEACHER] },
    { label: 'Settings', path: '/settings', icon: ICONS.Settings, roles: [UserRole.ADMIN] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(userRole));

  // Bottom Nav Items (Main 4 for mobile)
  const bottomNavItems = [
    { label: 'Home', path: '/', icon: ICONS.Dashboard },
    { label: 'Students', path: '/students', icon: ICONS.Talaba },
    { label: 'Attend', path: '/attendance', icon: ICONS.Attendance },
    { label: 'Finance', path: '/finance', icon: ICONS.Finance },
  ].filter(item => menuItems.find(mi => mi.path === item.path)?.roles.includes(userRole));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && window.innerWidth <= 1024 && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300 animate-in fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Desktop Sidebar / Mobile Drawer) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 transition-all duration-300 bg-[#064e3b] text-white flex flex-col shadow-2xl lg:shadow-none overflow-hidden
          ${isSidebarOpen
            ? 'w-72 translate-x-0'
            : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'
          }
        `}
      >
        <div className="p-4 flex items-center justify-center h-36 shrink-0 border-b border-emerald-800/50">
          <img src="/images/Bismilla Shah Madrasa Logo.png" className="w-32 h-32 object-contain" alt="Logo" />
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-2 overflow-y-auto no-scrollbar">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={`flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-200 group ${isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/20 translate-x-1'
                    : 'text-emerald-100/60 hover:bg-emerald-800/50 hover:text-white'
                  }`}
              >
                <span className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : ''}`}>
                  {item.icon}
                </span>
                {isSidebarOpen && <span className="font-semibold whitespace-nowrap text-sm tracking-wide">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-emerald-800/50 shrink-0">
          <button
            onClick={onLogout}
            className="flex items-center gap-4 p-3.5 w-full text-emerald-100/60 hover:bg-red-500/10 hover:text-red-400 rounded-2xl transition-colors group"
          >
            <span className="shrink-0 transition-transform duration-200 group-hover:rotate-12">{ICONS.Logout}</span>
            {isSidebarOpen && <span className="font-semibold text-sm">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30">

          {/* LEFT SECTION (Desktop Hamburger) */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="hidden lg:flex text-slate-500 hover:text-emerald-600 p-2 rounded-xl hover:bg-slate-50 border border-slate-100 shadow-sm transition-all"
              aria-label="Toggle Sidebar"
            >
              {ICONS.Menu}
            </button>
            <h2 className="font-extrabold text-slate-800 hidden lg:block tracking-tight text-lg">
              {menuItems.find(m => m.path === location.pathname)?.label || 'Overview'}
            </h2>
            <div className="lg:hidden flex items-center gap-2">
              <img src="/images/Bismilla Shah Madrasa Logo.png" className="w-12 h-12 object-contain" alt="Logo" />
            </div>
          </div>

          {/* RIGHT SECTION (Mobile Hamburger + Profile) */}
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="hidden sm:flex items-center gap-2 lg:gap-4 border-r border-slate-100 pr-2 lg:pr-4">
              <button className="text-slate-400 hover:text-emerald-600 transition-colors p-2 relative">
                {ICONS.Bell}
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
            </div>

            <div className="flex items-center gap-3 h-8">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none">{userName}</p>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1 opacity-80">{userRole}</p>
              </div>
              <img
                src={`https://ui-avatars.com/api/?name=${userName}&background=059669&color=fff&bold=true`}
                className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl border border-emerald-100 shadow-sm"
                alt="Profile"
              />
            </div>

            {/* Mobile Hamburger Button (On the Right) */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex text-slate-500 hover:text-emerald-600 p-2 rounded-xl hover:bg-slate-50 border border-slate-100 shadow-sm transition-all"
              aria-label="Open Menu"
            >
              {ICONS.Menu}
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 lg:p-8 pb-24 lg:pb-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation (Always Visible for Core features) */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center lg:hidden z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] pb-safe">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${isActive ? 'text-emerald-600 scale-105' : 'text-slate-400'
                  }`}
              >
                <span className={isActive ? 'text-emerald-600' : ''}>{item.icon}</span>
                <span className={`text-[9px] font-bold tracking-tighter ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Layout;
