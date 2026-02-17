
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '../../store/StoreContext';
import { ICONS, COLORS } from '../../constants';
import { Attendance, UserRole } from '../../types';

// Define the available modes for the attendance manager
type AttendanceMode = 'selection' | 'students' | 'teachers' | 'history';

interface AttendanceManagerProps {
  userRole: UserRole;
  teacherId?: string;
}

const AttendanceManager: React.FC<AttendanceManagerProps> = ({ userRole, teacherId }) => {
  const { students, teachers, courses, attendance, markAttendance } = useStore();

  const isAdmin = userRole === UserRole.ADMIN;
  const isTeacher = userRole === UserRole.TEACHER;
  const isSubstitute = userRole === UserRole.SUBSTITUTE;

  const [mode, setMode] = useState<AttendanceMode>(isSubstitute ? 'students' : 'selection');

  // Helper to get local YYYY-MM-DD string
  const getLocalYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Teacher or Substitute specific batches
  const myCourses = isAdmin ? courses : courses.filter(c => c.teacherId === teacherId);
  const [selectedCourse, setSelectedCourse] = useState(myCourses[0]?.id || '');
  const [date, setDate] = useState(getLocalYYYYMMDD(new Date()));
  const [attendanceState, setAttendanceState] = useState<Record<string, 'Present' | 'Absent' | 'Late'>>({});

  // For History View
  const [historyType, setHistoryType] = useState<'students' | 'teachers'>('students');
  const [historyFilter, setHistoryFilter] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState(getLocalYYYYMMDD(new Date()));
  const [customEndDate, setCustomEndDate] = useState(getLocalYYYYMMDD(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHistoryHalqa, setSelectedHistoryHalqa] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Browser navigation guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // In-app navigation guard (Mode switching)
  const handleModeChange = (newMode: AttendanceMode) => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Do you want to leave without saving?')) {
        setHasUnsavedChanges(false);
        setMode(newMode);
      }
    } else {
      setMode(newMode);
    }
  };

  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");

    // Auto-size columns
    const maxWidths = data.reduce((acc, row) => {
      Object.keys(row).forEach((key, i) => {
        const val = row[key] ? row[key].toString().length : 10;
        acc[i] = Math.max(acc[i] || 0, val, key.length);
      });
      return acc;
    }, [] as number[]);

    ws['!cols'] = maxWidths.map(w => ({ wch: w + 2 }));

    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const filteredStudents = students.filter(s => s.courseId === selectedCourse);
  const activeTeachers = teachers.filter(t => t.status === 'Active');

  // Load existing attendance records when date or mode changes
  useEffect(() => {
    const existingRecords: Record<string, 'Present' | 'Absent' | 'Late'> = {};

    if (mode === 'students') {
      // Load existing student attendance for the selected date
      filteredStudents.forEach(student => {
        const record = attendance.find(
          att => att.studentId === student.id && att.date === date
        );
        if (record) {
          existingRecords[student.id] = record.status as 'Present' | 'Absent' | 'Late';
        }
      });
    } else if (mode === 'teachers') {
      // Load existing teacher attendance for the selected date
      activeTeachers.forEach(teacher => {
        const record = attendance.find(
          att => att.teacherId === teacher.id && att.date === date && (att.courseId === 'STAFF' || !att.courseId)
        );
        if (record) {
          existingRecords[teacher.id] = record.status as 'Present' | 'Absent' | 'Late';
        }
      });
    }

    setAttendanceState(existingRecords);
  }, [date, mode, selectedCourse, students, teachers, attendance]);

  const handleStatusChange = (id: string, status: 'Present' | 'Absent' | 'Late') => {
    setAttendanceState(prev => ({ ...prev, [id]: status }));
    setHasUnsavedChanges(true);
  };

  const handleExportHistory = () => {
    const data = getFilteredHistory().map(rec => {
      const student = students.find(s => s.id === rec.studentId);
      const teacher = teachers.find(t => t.id === rec.teacherId);
      const course = courses.find(c => c.id === rec.courseId);

      const isStudent = rec.studentId && rec.studentId !== 'N/A';

      return {
        'Date': rec.date,
        'Name': student?.fullName || teacher?.fullName || 'Unknown',
        'ID': isStudent ? rec.studentId : rec.teacherId,
        'Type': isStudent ? 'Student' : 'Teacher',
        'Halqa/Dept': student ? (course?.name || 'Unknown Halqa') : 'Administration staff',
        'Status': rec.status,
        'Remarks': rec.remarks || ''
      };
    });

    exportToExcel(data, `Attendance_History_${historyType}_${getLocalYYYYMMDD(new Date())}`);
  };

  const handleExportMarking = () => {
    const list = mode === 'students' ? filteredStudents : activeTeachers;
    const data = list.map(item => ({
      'Date': date,
      'Name': item.fullName,
      'ID': item.id,
      'Status': attendanceState[item.id] !== undefined ? attendanceState[item.id] : 'Attendance Not Marked',
      'Course/Dept': mode === 'students' ? (courses.find(c => c.id === selectedCourse)?.name || 'N/A') : 'Staff'
    }));

    exportToExcel(data, `Attendance_Register_${mode}_${date}`);
  };

  const submitAttendance = () => {
    let list = mode === 'students' ? filteredStudents : activeTeachers;

    // Filter out records that haven't been marked (applies to BOTH Students and Teachers)
    list = list.filter(item => attendanceState[item.id] !== undefined);

    if (list.length === 0) {
      alert(`Please mark attendance for at least one ${mode === 'students' ? 'student' : 'teacher'}.`);
      return;
    }

    const records: Attendance[] = list.map(item => ({
      id: `ATT-${Math.random().toString(36).substr(2, 9)}`,
      studentId: mode === 'students' ? item.id : 'N/A',
      teacherId: mode === 'teachers' ? item.id : (courses.find(c => c.id === selectedCourse)?.teacherId || 'SYSTEM'),
      courseId: mode === 'students' ? selectedCourse : 'STAFF',
      date,
      status: attendanceState[item.id] || 'Present',
      markedByRole: userRole,
    }));

    if (records.length > 0) {
      markAttendance(records);
      alert(`${mode === 'students' ? 'Talaba' : 'Asatizah'} attendance recorded successfully.`);
      setHasUnsavedChanges(false);
      if (!isSubstitute) setMode('selection');
      setAttendanceState({});
    }
  };

  const getFilteredHistory = () => {
    let filtered = [...attendance];

    // Filter by Type (Students vs Teachers)
    if (historyType === 'students') {
      // Students have a valid studentId and courseId is NOT 'STAFF'
      filtered = filtered.filter(rec => rec.studentId && rec.studentId !== 'N/A' && rec.courseId !== 'STAFF');

      // Filter by Halqa/Class (only for students)
      if (selectedHistoryHalqa) {
        filtered = filtered.filter(rec => rec.courseId === selectedHistoryHalqa);
      }
    } else {
      // Teachers have courseId 'STAFF' or it's stored as null for staff records
      filtered = filtered.filter(rec => rec.courseId === 'STAFF' || !rec.courseId || rec.studentId === 'N/A');
    }

    // Filter by Date
    const today = new Date();
    const todayStr = getLocalYYYYMMDD(today);

    if (historyFilter === 'today') {
      filtered = filtered.filter(rec => rec.date === todayStr);
    } else if (historyFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      const weekAgoStr = getLocalYYYYMMDD(weekAgo);
      filtered = filtered.filter(rec => rec.date >= weekAgoStr);
    } else if (historyFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      const monthAgoStr = getLocalYYYYMMDD(monthAgo);
      filtered = filtered.filter(rec => rec.date >= monthAgoStr);
    } else if (historyFilter === 'custom') {
      if (customStartDate) filtered = filtered.filter(rec => rec.date >= customStartDate);
      if (customEndDate) filtered = filtered.filter(rec => rec.date <= customEndDate);
    }

    // Filter by Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(rec => {
        if (historyType === 'students') {
          const student = students.find(s => s.id === rec.studentId);
          if (!student) return false;

          const name = student.fullName.toLowerCase();
          const id = student.id.toLowerCase();
          const className = student.class.toLowerCase();

          return name.includes(query) || id.includes(query) || className.includes(query);
        } else {
          const teacher = teachers.find(t => t.id === rec.teacherId);
          if (!teacher) return false;

          const name = teacher.fullName.toLowerCase();
          const id = teacher.id.toLowerCase();

          // For teachers, we can also search by Department (which is usually the Course/Dept name)
          // In teacher view, courseId is 'STAFF', so we don't really have a specific course name per record
          // but we can search name and ID
          return name.includes(query) || id.includes(query);
        }
      });
    }

    // Admin/Teacher permissions filter
    return filtered.filter(rec =>
      isAdmin ||
      (historyType === 'teachers' && rec.teacherId === teacherId) ||
      myCourses.some(mc => mc.id === rec.courseId)
    );
  };

  const displayHistoryRecords = getFilteredHistory();

  if (mode === 'selection') {
    return (
      <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Attendance Center</h1>
          <p className="text-slate-500 text-sm font-medium">Select an option to manage daily attendance or view history.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <button
            onClick={() => setMode('students')}
            className="group bg-white p-6 lg:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-500 transition-all text-left"
          >
            <div className="w-14 h-14 lg:w-16 lg:h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              {ICONS.Talaba}
            </div>
            <h3 className="text-lg lg:text-xl font-black text-slate-900">Talaba/Student Attendance</h3>
            <p className="text-slate-500 mt-2 text-xs lg:text-sm leading-relaxed">Mark daily attendance for students in your Halqat.</p>
          </button>

          {isAdmin && (
            <button
              onClick={() => setMode('teachers')}
              className="group bg-white p-6 lg:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-amber-500 transition-all text-left"
            >
              <div className="w-14 h-14 lg:w-16 lg:h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                {ICONS.Asatizah}
              </div>
              <h3 className="text-lg lg:text-xl font-black text-slate-900">Asatizah/Teacher Attendance</h3>
              <p className="text-slate-500 mt-2 text-xs lg:text-sm leading-relaxed">Track presence and leave records for staff members.</p>
            </button>
          )}

          {!isSubstitute && (
            <button
              onClick={() => setMode('history')}
              className="group bg-white p-6 lg:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all text-left"
            >
              <div className="w-14 h-14 lg:w-16 lg:h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                {ICONS.Attendance}
              </div>
              <h3 className="text-lg lg:text-xl font-black text-slate-900">Past Records</h3>
              <p className="text-slate-500 mt-2 text-xs lg:text-sm leading-relaxed">View and edit historical attendance data for your batches.</p>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'history') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-500 pb-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button onClick={() => handleModeChange('selection')} className="text-emerald-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 mb-2 hover:underline">
              ← Back to Selection
            </button>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Attendance History</h1>
          </div>

          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
            <button
              onClick={() => setHistoryType('students')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${historyType === 'students' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-400 hover:bg-slate-50'
                }`}
            >
              Students
            </button>
            <button
              onClick={() => setHistoryType('teachers')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${historyType === 'teachers' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-400 hover:bg-slate-50'
                }`}
            >
              Teachers
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1">
            <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Date Filter</label>
                <div className="relative">
                  <select
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value as any)}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-black text-slate-700 focus:ring-2 focus:ring-emerald-500/10 text-sm appearance-none cursor-pointer"
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    {ICONS.Filter}
                  </div>
                </div>
              </div>

              {historyFilter === 'custom' && (
                <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">From</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl font-bold text-slate-600 text-sm focus:ring-2 focus:ring-emerald-500/10"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">To</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl font-bold text-slate-600 text-sm focus:ring-2 focus:ring-emerald-500/10"
                    />
                  </div>
                </div>
              )}

              {historyType === 'students' && (
                <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Filter Halqa</label>
                  <div className="relative">
                    <select
                      value={selectedHistoryHalqa}
                      onChange={(e) => setSelectedHistoryHalqa(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-black text-slate-700 focus:ring-2 focus:ring-emerald-500/10 text-sm appearance-none cursor-pointer"
                    >
                      <option value="">All Halqas</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>{course.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      {ICONS.Filter}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm mb-4 flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-transparent focus-within:border-emerald-500/20 focus-within:bg-white transition-all w-full">
                <span className="text-slate-400">{ICONS.Search}</span>
                <input
                  type="text"
                  placeholder={historyType === 'students' ? "Search student name, ID or class..." : "Search teacher name or ID..."}
                  className="bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-slate-600 w-full placeholder:text-slate-300"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={handleExportHistory}
                className="w-full md:w-auto px-6 py-3 bg-white border border-slate-100 text-slate-600 rounded-2xl hover:bg-slate-50 font-black uppercase tracking-widest text-[10px] shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {ICONS.Reports} Export Excel
              </button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
              {displayHistoryRecords.length > 0 ? (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black tracking-widest">
                      <tr>
                        <th className="px-8 py-4">Name</th>
                        <th className="px-8 py-4">Date</th>
                        <th className="px-8 py-4">Halqa / Dept</th>
                        <th className="px-8 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {displayHistoryRecords.map(rec => {
                        const student = students.find(s => s.id === rec.studentId);
                        const teacher = teachers.find(t => t.id === rec.teacherId);
                        const name = student?.fullName || teacher?.fullName || 'Unknown';
                        return (
                          <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                <img
                                  src={`https://ui-avatars.com/api/?name=${name}&background=${student ? '059669' : 'd97706'}&color=fff&bold=true`}
                                  className="w-8 h-8 rounded-xl shadow-sm"
                                  alt=""
                                />
                                <span className="font-bold text-slate-900 text-sm">{name}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight bg-slate-50 text-slate-500">
                                {rec.date}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-xs font-bold text-slate-500">
                              {student ? (courses.find(c => c.id === rec.courseId)?.name || 'Unknown Halqa') : 'Administration'}
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex justify-center">
                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${rec.status === 'Present' ? 'bg-emerald-100 text-emerald-700' :
                                  rec.status === 'Absent' ? 'bg-red-100 text-red-600' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>
                                  {rec.status}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-16 lg:p-24 text-center h-[400px]">
                  <div className="w-16 h-16 lg:w-20 lg:h-20 bg-slate-50 text-slate-200 rounded-3xl flex items-center justify-center mb-6">
                    {ICONS.Attendance}
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">No records found</h3>
                  <p className="text-slate-500 mt-2 text-sm">Try adjusting your filters or search query.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MARKING MODE (Students or Teachers)
  const isStudentMarking = mode === 'students';
  const listToMark = isStudentMarking ? filteredStudents : activeTeachers;

  return (
    <div className="space-y-6 animate-in slide-in-from-left duration-500 pb-16">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          {!isSubstitute && (
            <button onClick={() => handleModeChange('selection')} className="text-emerald-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 mb-2 hover:underline">
              ← Back to Selection
            </button>
          )}
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Register {isStudentMarking ? 'Talaba' : 'Asatizah'}
          </h1>
          <p className="text-slate-500 text-sm font-medium">Daily register for {date}.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="date"
            className="px-4 py-3 bg-white border border-slate-100 rounded-2xl font-black text-emerald-600 focus:ring-2 focus:ring-emerald-500/10 shadow-sm text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            onClick={handleExportMarking}
            className="px-6 py-3 bg-white border border-slate-100 text-slate-600 rounded-2xl hover:bg-slate-50 font-black uppercase tracking-widest text-xs shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {ICONS.Reports} Export
          </button>
          <button
            onClick={submitAttendance}
            className="px-8 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {ICONS.Present} Submit Register
          </button>
        </div>
      </div>

      {isStudentMarking && (
        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 whitespace-nowrap">Filter Halqa:</span>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {myCourses.map(course => (
              <button
                key={course.id}
                onClick={() => setSelectedCourse(course.id)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all whitespace-nowrap ${selectedCourse === course.id
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
              >
                {course.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MOBILE LIST VIEW */}
      <div className="lg:hidden space-y-4">
        {listToMark.length > 0 ? (
          listToMark.map(item => {
            const currentStatus = attendanceState[item.id];
            return (
              <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <img
                    src={`https://ui-avatars.com/api/?name=${item.fullName}&background=${isStudentMarking ? '059669' : 'd97706'}&color=fff&bold=true`}
                    className="w-12 h-12 rounded-2xl shadow-sm"
                    alt=""
                  />
                  <div>
                    <h4 className="font-black text-slate-900 leading-tight">{item.fullName}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1.5 rounded-2xl">
                  <button
                    onClick={() => handleStatusChange(item.id, 'Present')}
                    className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all gap-1 ${currentStatus === 'Present'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-[1.02]'
                      : 'text-slate-400 hover:bg-slate-100'
                      }`}
                  >
                    <span className="text-lg">●</span>
                    <span className="text-[9px] font-black uppercase">Present</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange(item.id, 'Absent')}
                    className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all gap-1 ${currentStatus === 'Absent'
                      ? 'bg-red-500 text-white shadow-lg shadow-red-200 scale-[1.02]'
                      : 'text-slate-400 hover:bg-slate-100'
                      }`}
                  >
                    <span className="text-lg">●</span>
                    <span className="text-[9px] font-black uppercase">Absent</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange(item.id, 'Late')}
                    className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all gap-1 ${currentStatus === 'Late'
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 scale-[1.02]'
                      : 'text-slate-400 hover:bg-slate-100'
                      }`}
                  >
                    <span className="text-lg">●</span>
                    <span className="text-[9px] font-black uppercase">Late</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white p-12 text-center rounded-[2.5rem] border-2 border-dashed border-slate-100">
            <p className="text-slate-400 font-bold text-sm">No records to display.</p>
          </div>
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden lg:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black tracking-widest">
              <tr>
                <th className="px-8 py-5">Person Details</th>
                <th className="px-8 py-5">ID</th>
                <th className="px-8 py-5 text-center">Status Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {listToMark.length > 0 ? (
                listToMark.map(item => {
                  const currentStatus = attendanceState[item.id];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <img
                            src={`https://ui-avatars.com/api/?name=${item.fullName}&background=${isStudentMarking ? '059669' : 'd97706'}&color=fff&bold=true`}
                            className="w-10 h-10 rounded-xl shadow-sm group-hover:scale-110 transition-transform"
                            alt=""
                          />
                          <span className="font-black text-slate-800 text-sm tracking-tight">{item.fullName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-xs text-slate-400 font-mono font-bold uppercase tracking-wider">{item.id}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-center">
                          <div className="flex p-1 bg-slate-50 rounded-2xl w-fit border border-slate-100">
                            <button
                              onClick={() => handleStatusChange(item.id, 'Present')}
                              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${currentStatus === 'Present'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                            >
                              <span className={currentStatus === 'Present' ? 'text-white' : 'text-emerald-500'}>●</span>
                              Present
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, 'Absent')}
                              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${currentStatus === 'Absent'
                                ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                                : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                                }`}
                            >
                              <span className={currentStatus === 'Absent' ? 'text-white' : 'text-red-500'}>●</span>
                              Absent
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, 'Late')}
                              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${currentStatus === 'Late'
                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                                : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                                }`}
                            >
                              <span className={currentStatus === 'Late' ? 'text-white' : 'text-amber-500'}>●</span>
                              Late
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="px-8 py-24 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-slate-50 text-slate-100 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
                        {ICONS.Attendance}
                      </div>
                      <p className="font-black text-slate-400 text-sm uppercase tracking-widest">No Active Personnel Found</p>
                      <p className="text-slate-300 text-xs mt-2">Check your assigned batches.</p>
                    </div>
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

export default AttendanceManager;
