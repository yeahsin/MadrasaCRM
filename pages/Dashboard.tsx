
import React, { useMemo, useState } from 'react';
import { useStore } from '../store/StoreContext';
import { UserRole, Student, FeeRecord } from '../types';
import { ICONS } from '../constants';
import * as ReactRouterDOM from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  ArrowUpRight, ArrowDownRight, MoreHorizontal, Bell, Calendar as CalendarIcon,
  AlertCircle, CheckCircle2, DollarSign, Users, GraduationCap, TrendingUp,
  Activity, ArrowRight
} from 'lucide-react';

const { Link } = ReactRouterDOM;

interface DashboardProps {
  role: UserRole;
  teacherId?: string;
}

// --- Icons & Colors Helper ---
const COLORS = ['#059669', '#d97706', '#0ea5e9', '#6366f1', '#ef4444'];

// --- Helper Functions ---

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

const getIslamicDate = () => {
  try {
    return new Intl.DateTimeFormat('en-TN-u-ca-islamic', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(Date.now());
  } catch (e) {
    return '';
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

// --- Components ---

const KPICard = ({ title, value, trend, trendValue, icon, color, sparkData, onClick }: any) => (
  <div onClick={onClick} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
    <div className={`absolute top-0 right-0 p-20 opacity-5 rounded-bl-[10rem] pointer-events-none transition-transform group-hover:scale-110 duration-500 ${color.replace('text-', 'bg-')}`}></div>
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className={`p-3.5 rounded-2xl ${color.replace('text-', 'bg-').replace('600', '50')} ${color}`}>
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
          {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trendValue}
        </div>
      )}
    </div>
    <div className="relative z-10">
      <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-1">{value}</h3>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
    </div>
    {sparkData && (
      <div className="h-10 mt-4 -mx-2 opacity-50 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkData}>
            <Line type="monotone" dataKey="value" stroke={color.includes('emerald') ? '#059669' : color.includes('amber') ? '#d97706' : '#0ea5e9'} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

const ActivityItem = ({ title, desc, time, type }: any) => {
  const iconMap: any = {
    'admission': <Users size={16} />,
    'payment': <DollarSign size={16} />,
    'salary': <DollarSign size={16} />,
    'default': <Activity size={16} />
  };
  const colorMap: any = {
    'admission': 'bg-blue-50 text-blue-600',
    'payment': 'bg-emerald-50 text-emerald-600',
    'salary': 'bg-amber-50 text-amber-600',
    'default': 'bg-slate-50 text-slate-600'
  };

  return (
    <div className="flex gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorMap[type] || colorMap.default}`}>
        {iconMap[type] || iconMap.default}
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-slate-900 leading-snug">{title}</p>
        <p className="text-xs text-slate-500 font-medium mt-0.5">{desc}</p>
      </div>
      <span className="text-[10px] font-bold text-slate-300 whitespace-nowrap">{time}</span>
    </div>
  );
};



const Dashboard: React.FC<DashboardProps> = ({ role, teacherId }) => {
  const { students, teachers, feeRecords, courses, addStudent, addCourse } = useStore();
  const [chartRange, setChartRange] = useState<'Week' | 'Month' | 'Year'>('Week');

  // --- Derived Statistics & Insights ---

  const stats = useMemo(() => {
    const activeStudents = students.filter(s => s.status === 'Active');
    const totalRevenue = feeRecords.reduce((sum, r) => sum + r.amountPaid, 0);
    const activeHalqas = courses.length;

    // Trends (Mock logic for demonstration as historical comparison requires extensive past data)
    // In real app, compare with previous month's data
    const studentGrowth = '+5.2%';
    const revenueGrowth = '+12.8%';
    const halqaGrowth = '+2';

    return {
      totalStudents: activeStudents.length,
      totalTeachers: teachers.length,
      revenue: totalRevenue,
      activeHalqas,
      studentGrowth, revenueGrowth, halqaGrowth
    };
  }, [students, teachers, feeRecords, courses]);

  // Sparkline Mock Data
  const sparkData = [
    { value: 10 }, { value: 25 }, { value: 15 }, { value: 30 }, { value: 45 }, { value: 35 }, { value: 55 }
  ];

  // Financial Chart Data
  const financialData = useMemo(() => {
    // Generate last 7 days or months data
    const data = [];
    const labels = chartRange === 'Week' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

    for (let i = 0; i < labels.length; i++) {
      data.push({
        name: labels[i],
        revenue: Math.floor(Math.random() * 50000) + 10000,
        expenses: Math.floor(Math.random() * 30000) + 5000,
      });
    }
    return data;
  }, [chartRange]);

  // Enrollment Data
  const enrollmentData = useMemo(() => {
    return courses.map(c => ({
      name: c.name,
      value: students.filter(s => s.courseId === c.id && s.status === 'Active').length
    })).slice(0, 5); // Top 5 courses
  }, [courses, students]);

  // Attention Items
  const attentionItems = useMemo(() => {
    const items = [];
    const pendingFees = students.filter(s => {
      // Mock check: 20% of students have pending fees
      return Math.random() > 0.8;
    }).length;

    if (pendingFees > 0) items.push({ title: 'Pending Fees', desc: `${pendingFees} students have overdue payments`, urgency: 'high', link: '/students' });
    items.push({ title: 'Teacher Attendance', desc: '3 teachers not marked today', urgency: 'medium', link: '/teachers' });

    return items;
  }, [students]);

  // Activity Feed
  const recentActivity = useMemo(() => {
    const activities = [];
    // Admission Activities
    students.slice(0, 3).forEach(s => {
      activities.push({
        title: 'New Admission',
        desc: `${s.fullName} joined ${courses.find(c => c.id === s.courseId)?.name}`,
        time: '2h ago',
        type: 'admission',
        date: s.admissionDate
      });
    });
    // Fee Activities
    feeRecords.slice(0, 3).forEach(r => {
      const s = students.find(st => st.id === r.studentId);
      activities.push({
        title: 'Fee Received',
        desc: `Received ₹${r.amountPaid} from ${s?.fullName}`,
        time: '4h ago',
        type: 'payment',
        date: r.date
      });
    });
    return activities.sort((a, b) => b.date > a.date ? 1 : -1).slice(0, 5);
  }, [students, feeRecords, courses]);


  // --- Render ---

  if (role !== UserRole.ADMIN) {
    // Simplified Teacher Dashboard (keeping it clean but upgraded visual style)
    // Reusing logical components would be ideal but for brevity inline update:
    return (
      <div className="space-y-8 animate-in fade-in pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest mb-1">{getIslamicDate()}</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{getGreeting()}, Ustadh.</h1>
            <p className="text-slate-500 font-medium">Here is your daily summary.</p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-2xl font-black text-slate-900">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{new Date().toDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Teacher Stats */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">My Students</p>
            <h3 className="text-4xl font-black text-slate-900">
              {students.filter(s => s.assignedTeacherIds.includes(teacherId || '')).length}
            </h3>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">My Halqat</p>
            <h3 className="text-4xl font-black text-emerald-600">
              {courses.filter(c => c.teacherId === teacherId).length}
            </h3>
          </div>
          <div className="bg-emerald-600 p-6 rounded-[2rem] shadow-lg text-white relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-emerald-100 font-bold text-xs uppercase tracking-widest mb-2">Actions</p>
              <Link to="/attendance" className="inline-block px-4 py-2 bg-white text-emerald-700 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all">Mark Attendance</Link>
            </div>
          </div>
        </div>

        {/* Teacher's Students Table */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-6">
          <h3 className="text-lg font-black text-slate-900 mb-6 px-2">My Class List</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.filter(s => s.assignedTeacherIds.includes(teacherId || '')).map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-sm text-slate-700">{s.fullName}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{courses.find(c => c.id === s.courseId)?.name}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase">{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- Admin Dashboard ---

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">

      {/* 1. Smart Greeting Section */}
      <div>
        <div className="flex items-center gap-2 mb-2">

          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
            {new Date().toDateString()}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          {getGreeting()}, Director.
        </h1>
        <p className="text-slate-500 font-medium text-sm md:text-base mt-1 flex items-center gap-2">
          <Activity size={16} className="text-emerald-500" />
          <span className="font-bold text-slate-700">Insight:</span> 2 new admissions today & all systems active.
        </p>
      </div>

      {/* 2. Upgrade Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPICard
          title="Total Talaba" value={stats.totalStudents}
          trend="up" trendValue={stats.studentGrowth}
          icon={<Users size={24} />} color="text-emerald-600"
          sparkData={sparkData} onClick={() => { }}
        />
        <KPICard
          title="Total Revenue" value={formatCurrency(stats.revenue)}
          trend="up" trendValue={stats.revenueGrowth}
          icon={<DollarSign size={24} />} color="text-blue-600"
          sparkData={[...sparkData].reverse()} onClick={() => { }}
        />
        <KPICard
          title="Total Asatizah" value={stats.totalTeachers}
          trend="neutral" trendValue="Stable"
          icon={<GraduationCap size={24} />} color="text-amber-600"
          sparkData={sparkData} onClick={() => { }}
        />
        <KPICard
          title="Active Halqat" value={stats.activeHalqas}
          trend="up" trendValue={stats.halqaGrowth}
          icon={<CheckCircle2 size={24} />} color="text-indigo-600"
          sparkData={sparkData} onClick={() => { }}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* 3. Financial Growth Chart */}
        <div className="xl:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-black text-lg text-slate-900">Financial Growth</h3>
              <p className="text-xs font-medium text-slate-400">Income vs Expenses Analysis</p>
            </div>
            <div className="flex bg-slate-50 p-1 rounded-xl">
              {['Week', 'Month', 'Year'].map((r) => (
                <button key={r} onClick={() => setChartRange(r as any)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${chartRange === r ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7. Revenue Intelligence / Enrollment Breakdown */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
          <h3 className="font-black text-lg text-slate-900 mb-1">Enrollment Data</h3>
          <p className="text-xs font-medium text-slate-400 mb-6">Distribution by Halqa</p>

          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={enrollmentData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {enrollmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
              <span className="text-3xl font-black text-slate-900">{stats.totalStudents}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {enrollmentData.slice(0, 3).map((item, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="font-bold text-slate-600">{item.name}</span>
                </div>
                <span className="font-black text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* 5. Latest Admissions Table */}
        <div className="xl:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black text-lg text-slate-900">Latest Admissions</h3>
            <button onClick={() => (window as any).location.href = '/students'} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-widest flex items-center gap-1">
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto p-2">
            <table className="w-full text-left">
              <thead className="text-[10px] uppercase font-black text-slate-400 tracking-widest bg-slate-50/50 rounded-xl">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Class</th>
                  <th className="px-6 py-4">Fee Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.slice(0, 5).map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 group transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 overflow-hidden">
                          <img src={`https://ui-avatars.com/api/?name=${student.fullName}&background=d1fae5&color=059669`} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{student.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{student.admissionDate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-xs text-slate-600">{courses.find(c => c.id === student.courseId)?.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wide">Paid</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6 & 8. Attention & Activity Feed */}
        <div className="space-y-6">

          {/* Attention Required */}
          <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="text-red-500" size={20} />
              <h3 className="font-black text-red-900 text-sm uppercase tracking-widest">Attention Required</h3>
            </div>
            <div className="space-y-3">
              {attentionItems.map((item, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-red-100 hover:shadow-md transition-shadow cursor-pointer">
                  <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                </div>
              ))}
              {attentionItems.length === 0 && <p className="text-xs text-slate-400 italic">No urgent alerts.</p>}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="font-black text-slate-900 text-lg mb-4 pl-2">Recent Activity</h3>
            <div className="space-y-2">
              {recentActivity.map((activity, i) => (
                <ActivityItem key={i} {...activity} />
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
