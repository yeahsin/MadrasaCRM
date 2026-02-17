
import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '../../store/StoreContext';
import { ICONS } from '../../constants';
import { Student, Status, Course, UserRole } from '../../types';

interface StudentListProps {
  userRole: UserRole;
  teacherId?: string;
}

const StudentList: React.FC<StudentListProps> = ({ userRole, teacherId }) => {
  const { students, courses, teachers, addStudent, addBulkStudents, updateStudent, deleteStudent, addCourse, feeRecords, attendance, refreshData } = useStore();
  const isAdmin = userRole === UserRole.ADMIN;

  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    class: 'All',
    halqa: 'All',
    status: 'All',
    admissionDate: ''
  });
  const [sortConfig, setSortConfig] = useState<{ key: keyof Student | 'monthlyFee' | 'feeStatus'; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Drawer & Selection
  const [drawerStudent, setDrawerStudent] = useState<Student | null>(null);
  const [drawerTab, setDrawerTab] = useState<'profile' | 'fees' | 'attendance'>('profile');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isManualHalqa, setIsManualHalqa] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manualHalqaName, setManualHalqaName] = useState('');
  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', dob: '', gender: 'Male',
    parentName: '', parentPhone: '', courseId: courses[0]?.id || '',
    class: '', monthlyFee: 0,
  });

  // --- Derived Data ---

  // Filter students based on role
  const baseStudents = useMemo(() => {
    return isAdmin
      ? students
      : students.filter(s => {
        const teacherCourses = courses.filter(c => c.teacherId === teacherId).map(c => c.id);
        return s.assignedTeacherIds.includes(teacherId || '') || teacherCourses.includes(s.courseId);
      });
  }, [students, isAdmin, teacherId, courses]);

  // Advanced Filtering
  const filteredStudents = useMemo(() => {
    return baseStudents.filter(s => {
      const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesClass = filters.class === 'All' || s.class === filters.class;
      const matchesHalqa = filters.halqa === 'All' || s.courseId === filters.halqa;
      const matchesStatus = filters.status === 'All' || s.status === filters.status;
      const matchesDate = !filters.admissionDate || s.admissionDate >= filters.admissionDate;

      return matchesSearch && matchesClass && matchesHalqa && matchesStatus && matchesDate;
    });
  }, [baseStudents, searchTerm, filters]);

  // Financial Status Helper
  const getFeeStatus = (student: Student) => {
    // Simplified logic: Check if current month fee is paid
    // Ideally this would check against a specific billing cycle
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const paidForMonth = feeRecords
      .filter(r => r.studentId === student.id && r.month === currentMonth)
      .reduce((sum, r) => sum + r.amountPaid, 0);

    const totalFee = student.feeStructure.totalFee;
    if (totalFee === 0) return 'Free';
    if (paidForMonth >= totalFee) return 'Paid';
    if (paidForMonth > 0) return 'Partial';
    return 'Pending';
  };

  // Sorting
  const sortedStudents = useMemo(() => {
    let sortableItems = [...filteredStudents];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Student];
        let bValue: any = b[sortConfig.key as keyof Student];

        if (sortConfig.key === 'monthlyFee') {
          aValue = a.feeStructure.totalFee;
          bValue = b.feeStructure.totalFee;
        } else if (sortConfig.key === 'feeStatus') {
          aValue = getFeeStatus(a);
          bValue = getFeeStatus(b);
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredStudents, sortConfig, feeRecords]);

  // Pagination
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedStudents, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedStudents.length / itemsPerPage);

  // Stats
  const stats = useMemo(() => {
    return {
      total: baseStudents.length,
      active: baseStudents.filter(s => s.status === 'Active').length,
      inactive: baseStudents.filter(s => s.status !== 'Active').length,
      revenue: baseStudents
        .filter(s => s.status === 'Active')
        .reduce((sum, s) => sum + s.feeStructure.totalFee, 0),
      halqas: new Set(baseStudents.map(s => s.courseId)).size
    };
  }, [baseStudents]);

  // --- Handlers ---

  const handleSort = (key: keyof Student | 'monthlyFee' | 'feeStatus') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedStudentIds(new Set(paginatedStudents.map(s => s.id)));
    else setSelectedStudentIds(new Set());
  };

  const handleSelectStudent = (id: string) => {
    const newSelected = new Set(selectedStudentIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedStudentIds(newSelected);
  };

  const handleManualHalqa = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'MANUAL') {
      setIsManualHalqa(true);
    } else {
      setIsManualHalqa(false);
      const selectedCourse = courses.find(c => c.id === e.target.value);
      setFormData({
        ...formData,
        courseId: e.target.value,
        monthlyFee: selectedCourse?.baseFee || 0
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin && !teacherId) return;

    let targetCourseId = formData.courseId;
    if (isManualHalqa && manualHalqaName.trim() && isAdmin) {
      const newCourseId = `C-${Math.floor(100 + Math.random() * 899)}`;
      const newCourse: Course = {
        id: newCourseId, name: manualHalqaName, duration: 'Indefinite',
        subjects: ['General'], baseFee: formData.monthlyFee,
        teacherId: teachers[0]?.id || 'SYSTEM', timings: 'TBD'
      };
      addCourse(newCourse);
      targetCourseId = newCourseId;
    }

    if (editingStudent) {
      updateStudent({
        ...editingStudent, ...formData, courseId: targetCourseId,
        feeStructure: { ...editingStudent.feeStructure, totalFee: formData.monthlyFee }
      });
    } else {
      const newStudent: Student = {
        ...formData, courseId: targetCourseId,
        id: `S-${Math.floor(1000 + Math.random() * 9000)}`,
        admissionDate: new Date().toISOString().split('T')[0],
        address: '', parentEmail: '', assignedTeacherIds: teacherId ? [teacherId] : [],
        status: 'Active' as Status,
        feeStructure: { totalFee: formData.monthlyFee, isInstallment: false, installmentsCount: 1, discount: 0 },
      };
      addStudent(newStudent);
    }
    setIsModalOpen(false); setEditingStudent(null); resetForm();
  };

  const resetForm = () => {
    setFormData({
      fullName: '', email: '', phone: '', dob: '', gender: 'Male',
      parentName: '', parentPhone: '', courseId: courses[0]?.id || '',
      class: '', monthlyFee: 0,
    });
    setIsManualHalqa(false); setManualHalqaName('');
  };

  // Bulk & Export
  const handleExport = (type: 'all' | 'filtered' | 'selected' | 'defaulters') => {
    let data = students;
    if (type === 'filtered') data = sortedStudents;
    if (type === 'selected') data = students.filter(s => selectedStudentIds.has(s.id));
    if (type === 'defaulters') data = students.filter(s => getFeeStatus(s) === 'Pending' || getFeeStatus(s) === 'Partial');

    const headers = ['Madrasa ID', 'Full Name', 'Email', 'Phone', 'Parent Name', 'Parent Phone', 'Course', 'Class', 'Status', 'Monthly Fee', 'Fee Status'];
    const rows = data.map(s => [
      s.id, s.fullName, s.email, s.phone, s.parentName, s.parentPhone,
      courses.find(c => c.id === s.courseId)?.name || s.courseId,
      s.class, s.status, s.feeStructure.totalFee, getFeeStatus(s)
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Talaba_Export_${type}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedStudentIds.size} students?`)) {
      selectedStudentIds.forEach(id => deleteStudent(id));
      setSelectedStudentIds(new Set());
    }
  };

  // Excel Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const mapped = rows.map((row) => {
          // Try multiple header names for flexibility
          const fullName = row['FullName'] || row['Name'] || row['Full Name'] || '';
          const email = row['Email'] || row['E-mail'] || '';
          const phone = (row['Phone'] || row['Mobile'] || row['Contact'] || '')?.toString();
          const dob = row['DOB'] || row['DateOfBirth'] || '';
          const gender = row['Gender'] || 'Male';
          const parentName = row['ParentName'] || row['GuardianName'] || '';
          const parentPhone = (row['ParentPhone'] || row['Parent Contact'] || '')?.toString();
          const classLevel = row['Class'] || row['class'] || '';
          const monthlyFee = Number(row['MonthlyFee'] || row['Fee'] || 0) || 0;

          // Try to map course by name if provided
          const courseName = row['Course'] || row['Halqa'] || row['CourseName'] || '';
          const course = courses.find(c => c.name.toLowerCase() === (courseName || '').toLowerCase());

          const studentObj: any = {
            id: `S-${Math.floor(1000 + Math.random() * 9000)}`,
            fullName,
            email,
            phone,
            dob,
            gender,
            parentName,
            parentPhone,
            courseId: course ? course.id : courses[0]?.id || '',
            class: classLevel,
            admissionDate: new Date().toISOString().split('T')[0],
            address: '',
            parentEmail: '',
            assignedTeacherIds: [],
            status: 'Active',
            feeStructure: { totalFee: monthlyFee, isInstallment: false, installmentsCount: 1, discount: 0 }
          };
          return studentObj;
        });

        // Use store helper so API_BASE and refresh logic are centralized
        const result = await addBulkStudents(mapped);
        setIsBulkMenuOpen(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        alert(`Imported ${result?.processed || 0} students${(result?.errors && result.errors.length) ? `, ${result.errors.length} errors` : ''}`);
      } catch (err: any) {
        console.error('Upload error', err);
        alert('Bulk upload failed: ' + (err.message || err));
      }
    };
    reader.readAsArrayBuffer(file);
  };
  const handleDownloadSample = () => {
    const headers = [['FullName', 'Email', 'Phone', 'DOB', 'Gender', 'ParentName', 'ParentPhone', 'Class', 'MonthlyFee']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample");
    XLSX.writeFile(wb, "Student_Upload_Sample.xlsx");
    setIsBulkMenuOpen(false);
  };

  // --- Render Components ---

  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      Active: 'bg-emerald-100 text-emerald-700',
      Inactive: 'bg-slate-100 text-slate-500',
      Dropped: 'bg-red-100 text-red-700',
      Completed: 'bg-blue-100 text-blue-700',
    };
    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${styles[status as keyof typeof styles] || styles.Inactive}`}>{status}</span>;
  };

  const FeeStatusBadge = ({ status }: { status: string }) => {
    const styles = {
      Paid: 'bg-emerald-100 text-emerald-700',
      Partial: 'bg-amber-100 text-amber-700',
      Pending: 'bg-red-100 text-red-700',
      Free: 'bg-slate-100 text-slate-500'
    };
    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${styles[status as keyof typeof styles] || styles.Pending}`}>{status}</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 relative">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Talaba Directory</h1>
          <p className="text-slate-500 text-sm font-medium">Manage student admissions, fees, and academic records.</p>
        </div>
        {(isAdmin || teacherId) && (
          <div className="flex gap-3">
            {selectedStudentIds.size > 0 ? (
              <>
                <button onClick={() => handleExport('selected')} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs">Export ({selectedStudentIds.size})</button>
                {isAdmin && <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-xs">Delete ({selectedStudentIds.size})</button>}
              </>
            ) : (
              <>
                <div className="relative group">
                  <button onClick={() => setIsBulkMenuOpen(!isBulkMenuOpen)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition-colors shadow-sm">
                    {ICONS.Upload} Upload
                  </button>
                  {isBulkMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsBulkMenuOpen(false)} />
                      <div className="absolute top-full mt-2 bg-white border border-slate-100 shadow-xl rounded-xl p-2 w-48 z-20">
                        <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">Upload Excel</button>
                        <button onClick={handleDownloadSample} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">Download Sample</button>
                      </div>
                    </>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                </div>

                <div className="relative group">
                  <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition-colors shadow-sm">
                    {ICONS.Reports} Export
                  </button>
                  <div className="absolute right-0 top-full mt-2 bg-white border border-slate-100 shadow-xl rounded-xl p-2 w-48 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-20">
                    <button onClick={() => handleExport('all')} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">Export All</button>
                    <button onClick={() => handleExport('filtered')} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">Export Current View</button>
                    <button onClick={() => handleExport('defaulters')} className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg">Export Defaulters</button>
                  </div>
                </div>

                <button onClick={() => { setEditingStudent(null); resetForm(); setIsModalOpen(true); }} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all active:scale-95">
                  {ICONS.Plus} New Talib
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: stats.total, color: 'text-slate-900', bg: 'bg-white' },
          { label: 'Active Students', value: stats.active, color: 'text-emerald-600', bg: 'bg-white' },
          { label: 'Total Monthly Fees', value: `₹${stats.revenue.toLocaleString()}`, color: 'text-emerald-600', bg: 'bg-white' },
          { label: 'Total Halqas', value: stats.halqas, color: 'text-indigo-600', bg: 'bg-white' }
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} p-5 rounded-2xl border border-slate-100 shadow-sm`}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className={`text-2xl font-black ${stat.color}`}>{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{ICONS.Search}</div>
            <input
              type="text"
              placeholder="Search by Name, ID or Email..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-0 text-slate-900 placeholder:text-slate-400 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <select className="bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-600 text-xs font-bold focus:ring-0 cursor-pointer min-w-[120px]" value={filters.class} onChange={(e) => setFilters({ ...filters, class: e.target.value })}>
              <option value="All">All Classes</option>
              {[...new Set(baseStudents.map(s => s.class))].filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-600 text-xs font-bold focus:ring-0 cursor-pointer min-w-[120px]" value={filters.halqa} onChange={(e) => setFilters({ ...filters, halqa: e.target.value })}>
              <option value="All">All Halqas</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-600 text-xs font-bold focus:ring-0 cursor-pointer min-w-[120px]" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <input type="date" className="bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-600 text-xs font-bold focus:ring-0" value={filters.admissionDate} onChange={(e) => setFilters({ ...filters, admissionDate: e.target.value })} />

            {(searchTerm || filters.class !== 'All' || filters.halqa !== 'All' || filters.status !== 'All' || filters.admissionDate) && (
              <button onClick={() => { setSearchTerm(''); setFilters({ class: 'All', halqa: 'All', status: 'All', admissionDate: '' }); }} className="px-4 py-3 text-red-500 hover:text-red-700 text-xs font-bold whitespace-nowrap">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-100 border-dashed">
          <h3 className="text-slate-900 font-bold mb-1">No Talaba Found</h3>
          <p className="text-slate-500 text-sm">Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
              <table className="w-full text-left relative border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 border-b border-slate-100 w-12">
                      <input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" checked={paginatedStudents.length > 0 && selectedStudentIds.size === paginatedStudents.length} onChange={handleSelectAll} />
                    </th>
                    {[
                      { key: 'fullName', label: 'Talib Name' },
                      { key: 'id', label: 'ID' },
                      { key: 'class', label: 'Class' },
                      { key: 'monthlyFee', label: 'Monthly Fee' },
                      { key: 'feeStatus', label: 'Status' },
                    ].map(col => (
                      <th key={col.key} className="px-6 py-4 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100 cursor-pointer" onClick={() => handleSort(col.key as any)}>
                        <div className="flex items-center gap-2">{col.label} {sortConfig?.key === col.key && <span className="text-emerald-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}</div>
                      </th>
                    ))}
                    <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedStudents.map(student => (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4"><input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" checked={selectedStudentIds.has(student.id)} onChange={() => handleSelectStudent(student.id)} /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setDrawerStudent(student); setDrawerTab('profile'); }}>
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-emerald-50 shrink-0">
                            <img src={`https://ui-avatars.com/api/?name=${student.fullName}&background=d1fae5&color=059669`} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">{student.fullName}</p>
                            <p className="text-xs text-slate-400">{courses.find(c => c.id === student.courseId)?.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="font-mono text-xs font-bold text-slate-500">{student.id}</span></td>
                      <td className="px-6 py-4"><span className="text-xs font-medium text-slate-700">{student.class}</span></td>
                      <td className="px-6 py-4"><span className="font-bold text-slate-900 text-xs">₹{student.feeStructure.totalFee}</span></td>
                      <td className="px-6 py-4"><FeeStatusBadge status={getFeeStatus(student)} /></td>
                      <td className="px-6 py-4 text-right relative">
                        <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === student.id ? null : student.id); }} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all">{ICONS.Options}</button>
                        {activeMenuId === student.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 w-48 bg-white border border-slate-100 shadow-xl rounded-2xl py-2 z-20 flex flex-col">
                              <button onClick={() => { setDrawerStudent(student); setDrawerTab('profile'); setActiveMenuId(null); }} className="px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50">View Profile</button>
                              <button onClick={() => { setEditingStudent(student); setFormData({ ...formData, ...student, monthlyFee: student.feeStructure.totalFee }); setIsModalOpen(true); setActiveMenuId(null); }} className="px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50">Edit Details</button>
                              <button onClick={() => { setDrawerStudent(student); setDrawerTab('fees'); setActiveMenuId(null); }} className="px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50">Fee History</button>
                              {isAdmin && <button onClick={() => { if (confirm('Delete?')) deleteStudent(student.id); setActiveMenuId(null); }} className="px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button>}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {paginatedStudents.map(student => (
              <div key={student.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm" onClick={() => { setDrawerStudent(student); setDrawerTab('profile'); }}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-emerald-50">
                      <img src={`https://ui-avatars.com/api/?name=${student.fullName}&background=d1fae5&color=059669`} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{student.fullName}</h3>
                      <p className="text-xs text-slate-500 font-medium">{courses.find(c => c.id === student.courseId)?.name}</p>
                    </div>
                  </div>
                  <FeeStatusBadge status={getFeeStatus(student)} />
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); setEditingStudent(student); setFormData({ ...formData, ...student, monthlyFee: student.feeStructure.totalFee }); setIsModalOpen(true); }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); setDrawerStudent(student); setDrawerTab('fees'); }} className="flex-1 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold">Fees</button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
            <p className="text-xs font-bold text-slate-400">Page {currentPage} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30">Prev</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30">Next</button>
            </div>
          </div>
        </>
      )}

      {/* Side Drawer */}
      {drawerStudent && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setDrawerStudent(null)} />
          <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">

            <div className="bg-slate-50 border-b border-slate-100 p-6 pt-12 pb-6">
              <div className="flex justify-between items-start mb-6">
                <div className="w-20 h-20 rounded-[2rem] bg-white border-4 border-white shadow-lg overflow-hidden">
                  <img src={`https://ui-avatars.com/api/?name=${drawerStudent.fullName}&background=059669&color=fff&size=128`} className="w-full h-full object-cover" />
                </div>
                <button onClick={() => setDrawerStudent(null)} className="p-2 bg-white text-slate-400 hover:text-slate-600 rounded-xl shadow-sm">✕</button>
              </div>
              <h2 className="text-2xl font-black text-slate-900">{drawerStudent.fullName}</h2>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={drawerStudent.status} />
                <span className="text-xs font-bold text-slate-400">• {drawerStudent.id}</span>
              </div>
            </div>

            <div className="flex border-b border-slate-100 px-6">
              {['profile', 'fees', 'attendance'].map((tab) => (
                <button key={tab} onClick={() => setDrawerTab(tab as any)} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${drawerTab === tab ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{tab}</button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {drawerTab === 'profile' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Parent Info</h4>
                    <p className="text-sm font-bold text-slate-900">{drawerStudent.parentName}</p>
                    <p className="text-xs text-slate-500 font-medium">{drawerStudent.parentPhone}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Halqa Info</h4>
                    <p className="text-sm font-bold text-slate-900">{courses.find(c => c.id === drawerStudent.courseId)?.name}</p>
                    <p className="text-xs text-slate-500 font-medium">Class Level: {drawerStudent.class}</p>
                  </div>
                </div>
              )}
              {drawerTab === 'fees' && (
                <div className="space-y-6">
                  <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Monthly Fee</p>
                    <h3 className="text-3xl font-black text-slate-900">₹{drawerStudent.feeStructure.totalFee}</h3>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3">Payment History</h4>
                    {feeRecords.filter(r => r.studentId === drawerStudent.id).slice(0, 5).map(r => (
                      <div key={r.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                        <div><p className="text-sm font-bold text-slate-900">{r.month}</p><p className="text-[10px] uppercase text-slate-400 font-bold">{r.status}</p></div>
                        <span className="text-emerald-600 font-black">₹{r.amountPaid}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {drawerTab === 'attendance' && (
                <div className="text-center py-10 opacity-50">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">{ICONS.Attendance}</div>
                  <p className="text-xs text-slate-500">Attendance log coming soon.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <button onClick={() => { setEditingStudent(drawerStudent); setFormData({ ...formData, ...drawerStudent!, monthlyFee: drawerStudent!.feeStructure.totalFee }); setIsModalOpen(true); setDrawerStudent(null); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-transform">Edit Admission Record</button>
            </div>
          </div>
        </div>
      )}

      {/* Reused Modal Logic for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-lg text-slate-900">{editingStudent ? 'Edit Student' : 'New Admission'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Simplified Form for Brevity - Keeping essential fields */}
              <div className="space-y-4">
                <input required placeholder="Full Name" className="w-full p-3 bg-slate-50 rounded-xl" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <input required placeholder="Parent Name" className="w-full p-3 bg-slate-50 rounded-xl" value={formData.parentName} onChange={e => setFormData({ ...formData, parentName: e.target.value })} />
                  <input required placeholder="Parent Phone" className="w-full p-3 bg-slate-50 rounded-xl" value={formData.parentPhone} onChange={e => setFormData({ ...formData, parentPhone: e.target.value })} />
                </div>
                <select className="w-full p-3 bg-slate-50 rounded-xl" value={isManualHalqa ? 'MANUAL' : formData.courseId} onChange={handleManualHalqa}>
                  <option value="">Select Halqa</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  {isAdmin && <option value="MANUAL">+ Create New</option>}
                </select>
                {isManualHalqa && <input placeholder="New Halqa Name" className="w-full p-3 bg-emerald-50 rounded-xl" value={manualHalqaName} onChange={e => setManualHalqaName(e.target.value)} />}
                <input type="number" placeholder="Monthly Fee" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-emerald-600" value={formData.monthlyFee} onChange={e => setFormData({ ...formData, monthlyFee: Number(e.target.value) })} disabled={!isAdmin} />
              </div>
            </form>
            <div className="p-6 border-t border-slate-100 flex gap-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-xs">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg shadow-emerald-200">{editingStudent ? 'Update' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentList;
