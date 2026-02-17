
import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/StoreContext';
import { ICONS } from '../../constants';
import * as ReactRouterDOM from 'react-router-dom';
import { UserRole } from '../../types';

const { Link } = ReactRouterDOM;

interface AdmissionsListProps {
  userRole: UserRole;
  teacherId?: string;
}

const AdmissionsList: React.FC<AdmissionsListProps> = ({ userRole, teacherId }) => {
  const { students, courses } = useStore();
  const [filterType, setFilterType] = useState<'Today' | 'This Week' | 'This Month' | 'Custom'>('This Month');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const isAdmin = userRole === UserRole.ADMIN;

  const filteredAdmissions = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // First filter by role
    const baseStudents = isAdmin 
      ? students 
      : students.filter(s => {
          const teacherCourseIds = courses.filter(c => c.teacherId === teacherId).map(c => c.id);
          return s.assignedTeacherIds.includes(teacherId || '') || teacherCourseIds.includes(s.courseId);
        });

    return baseStudents.filter(student => {
      const admissionDate = new Date(student.admissionDate);
      
      if (filterType === 'Today') {
        return admissionDate >= today;
      }
      if (filterType === 'This Week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return admissionDate >= startOfWeek;
      }
      if (filterType === 'This Month') {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return admissionDate >= startOfMonth;
      }
      if (filterType === 'Custom' && dateRange.start && dateRange.end) {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        return admissionDate >= start && admissionDate <= end;
      }
      return true;
    });
  }, [students, filterType, dateRange]);

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/" className="text-emerald-600 hover:text-emerald-700 font-bold text-xs uppercase tracking-widest flex items-center gap-1 transition-all">
              ← Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Full Admissions Log</h1>
          <p className="text-slate-500 text-sm font-medium">History of all student enrollments.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filter Period</label>
            <select 
              className="block w-48 bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-emerald-500/20"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>Custom</option>
            </select>
          </div>

          {filterType === 'Custom' && (
            <div className="flex items-end gap-3 animate-in slide-in-from-left-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                <input 
                  type="date" 
                  className="block bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-emerald-500/20"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                <input 
                  type="date" 
                  className="block bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-emerald-500/20"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto custom-scrollbar -mx-6">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black tracking-widest">
              <tr>
                <th className="px-8 py-4">Talib</th>
                <th className="px-8 py-4">Halqa</th>
                <th className="px-8 py-4">Class</th>
                <th className="px-8 py-4">Date</th>
                <th className="px-8 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAdmissions.map(student => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <img src={`https://ui-avatars.com/api/?name=${student.fullName}&background=059669&color=fff&bold=true`} className="w-8 h-8 rounded-xl shrink-0 shadow-sm" alt="" />
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">{student.fullName}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{student.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-slate-600 font-medium text-xs">
                    {courses.find(c => c.id === student.courseId)?.name || 'N/A'}
                  </td>
                  <td className="px-8 py-4 text-slate-600 font-medium text-xs">{student.class}</td>
                  <td className="px-8 py-4 text-slate-400 font-mono text-[10px]">{student.admissionDate}</td>
                  <td className="px-8 py-4">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                      student.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredAdmissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-medium italic">
                    No admission records found for the selected range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdmissionsList;
