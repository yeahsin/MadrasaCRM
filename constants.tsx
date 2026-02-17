
import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserSquare2,
  CalendarCheck,
  Wallet,
  BookOpen,
  GraduationCap,
  Settings,
  LogOut,
  Bell,
  Search,
  Plus,
  TrendingUp,
  CreditCard,
  FileText,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  Menu,
  ChevronRight,
  Filter,
  BookMarked,
  Upload,
  Download
} from 'lucide-react';

export const COLORS = {
  primary: '#059669', // emerald-600
  secondary: '#d97706', // amber-600
  success: '#10b981', // emerald-500
  danger: '#ef4444', // red-500
  warning: '#f59e0b', // amber-500
  background: '#f8fafc',
  white: '#ffffff',
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#064e3b', // Deep Emerald for sidebar
  }
};

export const ICONS = {
  Dashboard: <LayoutDashboard size={20} />,
  Talaba: <Users size={20} />,
  Asatizah: <UserSquare2 size={20} />,
  Attendance: <CalendarCheck size={20} />,
  Finance: <Wallet size={20} />,
  Halqat: <BookOpen size={20} />,
  HifzProgress: <BookMarked size={20} />,
  Settings: <Settings size={20} />,
  Logout: <LogOut size={20} />,
  Bell: <Bell size={20} />,
  Search: <Search size={18} />,
  Plus: <Plus size={18} />,
  Trending: <TrendingUp size={20} />,
  Payments: <CreditCard size={20} />,
  Reports: <FileText size={20} />,
  Options: <MoreVertical size={18} />,
  Present: <CheckCircle2 size={16} className="text-emerald-500" />,
  Absent: <XCircle size={16} className="text-red-500" />,
  Late: <Clock size={16} className="text-amber-500" />,
  Menu: <Menu size={24} />,
  ChevronRight: <ChevronRight size={16} />,
  Filter: <Filter size={18} />,
  Upload: <Upload size={18} />,
  Download: <Download size={18} />,
  CheckCircle2: <CheckCircle2 size={20} />
};
