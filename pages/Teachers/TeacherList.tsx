
import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/StoreContext';
import { ICONS } from '../../constants';
import { Teacher, Status, UserRole } from '../../types';

interface TeacherListProps {
  userRole: UserRole;
  teacherId?: string;
}

const TeacherList: React.FC<TeacherListProps> = ({ userRole, teacherId }) => {
  const { teachers, addTeacher, updateTeacher, deleteTeacher, salaryRecords, attendance } = useStore();
  const isAdmin = userRole === UserRole.ADMIN;

  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'All',
    subject: '',
    qualification: '',
    joiningDate: ''
  });
  const [sortConfig, setSortConfig] = useState<{ key: keyof Teacher | 'id'; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Drawer & Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [drawerTeacher, setDrawerTeacher] = useState<Teacher | null>(null);
  const [drawerTab, setDrawerTab] = useState<'profile' | 'payroll' | 'attendance'>('profile');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    qualification: '',
    subjects: '',
    experience: 0,
    salaryType: 'Monthly' as 'Monthly' | 'Hourly' | 'Per Class',
    salaryAmount: 0,
    joiningDate: new Date().toISOString().split('T')[0],
    loginId: '',
    password: '',
  });

  // --- Derived Data ---

  // 1. Filter
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      if (!isAdmin && t.id !== teacherId) return false;

      const matchesSearch = (t.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.subjects.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchesStatus = filters.status === 'All' || t.status === filters.status;
      const matchesSubject = !filters.subject || t.subjects.some(s => s.toLowerCase().includes(filters.subject.toLowerCase()));
      const matchesQualification = !filters.qualification || t.qualification.toLowerCase().includes(filters.qualification.toLowerCase());
      const matchesJoining = !filters.joiningDate || t.joiningDate >= filters.joiningDate;

      return matchesSearch && matchesStatus && matchesSubject && matchesQualification && matchesJoining;
    });
  }, [teachers, searchTerm, filters, isAdmin, teacherId]);

  // 2. Sort
  const sortedTeachers = useMemo(() => {
    let sortableItems = [...filteredTeachers];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredTeachers, sortConfig]);

  // 3. Paginate
  const paginatedTeachers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTeachers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTeachers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedTeachers.length / itemsPerPage);

  // Stats
  const stats = useMemo(() => {
    return {
      total: teachers.length,
      active: teachers.filter(t => t.status === 'Active').length,
      inactive: teachers.filter(t => t.status !== 'Active').length,
      subjects: new Set(teachers.flatMap(t => t.subjects)).size
    };
  }, [teachers]);

  // --- Handlers ---

  const handleSort = (key: keyof Teacher | 'id') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTeacherIds(new Set(paginatedTeachers.map(t => t.id)));
    } else {
      setSelectedTeacherIds(new Set());
    }
  };

  const handleSelectTeacher = (id: string) => {
    const newSelected = new Set(selectedTeacherIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTeacherIds(newSelected);
  };

  const handleExport = (type: 'all' | 'filtered' | 'active') => {
    let dataToExport = teachers;
    if (type === 'filtered') dataToExport = sortedTeachers;
    if (type === 'active') dataToExport = teachers.filter(t => t.status === 'Active');

    const headers = [
      'Staff ID', 'Full Name', 'Email', 'Phone', 'Qualification',
      'Subjects', 'Experience (Years)', 'Salary Type', 'Salary Amount',
      'Joining Date', 'Status', 'Login ID', 'Last Updated'
    ];

    const rows = dataToExport.map(t => [
      t.id, t.fullName, t.email, t.phone, t.qualification,
      t.subjects.join('; '), t.experience, t.salaryType, t.salaryAmount,
      t.joiningDate, t.status, t.loginId, t.lastUpdated || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Asatizah_Directory_${type}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Form Handlers
  const openAddModal = () => {
    setFormData({
      fullName: '', email: '', phone: '', qualification: '', subjects: '',
      experience: 0, salaryType: 'Monthly', salaryAmount: 0,
      joiningDate: new Date().toISOString().split('T')[0], loginId: '', password: '',
    });
    setEditingTeacher(null);
    setIsModalOpen(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      fullName: teacher.fullName, email: teacher.email, phone: teacher.phone,
      qualification: teacher.qualification, subjects: teacher.subjects.join(', '),
      experience: teacher.experience, salaryType: teacher.salaryType,
      salaryAmount: teacher.salaryAmount, joiningDate: teacher.joiningDate,
      loginId: teacher.loginId || '', password: teacher.password || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subjectsArray = formData.subjects.split(',').map(s => s.trim()).filter(Boolean);
    const commonData = {
      ...formData,
      subjects: subjectsArray,
      lastUpdated: new Date().toISOString()
    };

    if (editingTeacher) {
      if (!isAdmin && editingTeacher.id !== teacherId) return;
      const updatedTeacher: Teacher = {
        ...editingTeacher,
        ...commonData,
        salaryType: isAdmin ? formData.salaryType : editingTeacher.salaryType,
        salaryAmount: isAdmin ? formData.salaryAmount : editingTeacher.salaryAmount,
      };
      updateTeacher(updatedTeacher);
    } else {
      if (!isAdmin) return;
      const newTeacher: Teacher = {
        ...commonData,
        id: `T-${Math.floor(100 + Math.random() * 899)}`,
        bankDetails: { accountNo: '', ifsc: '' },
        status: 'Active' as Status,
        assignedCourseIds: [],
      };
      addTeacher(newTeacher);
    }
    setIsModalOpen(false);
  };

  // --- Render Helpers ---

  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      Active: 'bg-emerald-100 text-emerald-700',
      Inactive: 'bg-slate-100 text-slate-500',
      'On Leave': 'bg-amber-100 text-amber-700',
      Resigned: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${styles[status as keyof typeof styles] || styles.Inactive}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 relative">

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isAdmin ? "Asatizah Directory" : "My Profile"}
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            {isAdmin ? "Manage Madrasa teachers, qualifications, and payroll details." : "View and update your educator profile."}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition-colors shadow-sm">
              {ICONS.Reports} Export
            </button>
            <div className="absolute right-0 top-full mt-2 bg-white border border-slate-100 shadow-xl rounded-xl p-2 w-48 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-20">
              <button onClick={() => handleExport('all')} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">Export All</button>
              <button onClick={() => handleExport('active')} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">Export Active Only</button>
              <button onClick={() => handleExport('filtered')} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">Export Current View</button>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all active:scale-95"
            >
              {ICONS.Plus} New Ustadh
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Teachers', value: stats.total, color: 'text-slate-900', bg: 'bg-white' },
            { label: 'Active Teachers', value: stats.active, color: 'text-emerald-600', bg: 'bg-white' },
            { label: 'Inactive / On Leave', value: stats.inactive, color: 'text-amber-600', bg: 'bg-white' },
            { label: 'Total Subjects', value: stats.subjects, color: 'text-indigo-600', bg: 'bg-white' }
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} p-5 rounded-2xl border border-slate-100 shadow-sm`}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className={`text-2xl font-black ${stat.color}`}>{stat.value}</h3>
            </div>
          ))}
        </div>
      )}

      {/* Filters & Search */}
      {isAdmin && (
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                {ICONS.Search}
              </div>
              <input
                type="text"
                placeholder="Search by name, ID or subject..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-0 text-slate-900 placeholder:text-slate-400 text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              <select
                className="bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-600 text-xs font-bold focus:ring-0 cursor-pointer min-w-[140px]"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="All">All Status</option>
                <option value="Active">Active Only</option>
                <option value="On Leave">On Leave</option>
                <option value="Resigned">Resigned</option>
              </select>
              <input
                type="text"
                placeholder="Filter by Qualification"
                className="bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-600 text-xs font-bold focus:ring-0 min-w-[160px]"
                value={filters.qualification}
                onChange={(e) => setFilters({ ...filters, qualification: e.target.value })}
              />
              <input
                type="date"
                className="bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-600 text-xs font-bold focus:ring-0"
                value={filters.joiningDate}
                onChange={(e) => setFilters({ ...filters, joiningDate: e.target.value })}
              />
              {(searchTerm || filters.status !== 'All' || filters.qualification || filters.joiningDate) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({ status: 'All', subject: '', qualification: '', joiningDate: '' });
                  }}
                  className="px-4 py-3 text-red-500 hover:text-red-700 text-xs font-bold whitespace-nowrap"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      {filteredTeachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-100 border-dashed">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
            {ICONS.Search}
          </div>
          <h3 className="text-slate-900 font-bold mb-1">No Asatizah Found</h3>
          <p className="text-slate-500 text-sm">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
              <table className="w-full text-left relative border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 border-b border-slate-100 w-12">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        checked={paginatedTeachers.length > 0 && selectedTeacherIds.size === paginatedTeachers.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    {[
                      { key: 'fullName', label: 'Ustadh Name' },
                      { key: 'id', label: 'Staff ID' },
                      { key: 'qualification', label: 'Qualification' },
                      { key: 'status', label: 'Status' },
                      { key: 'joiningDate', label: 'Joined' },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className="px-6 py-4 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                        onClick={() => handleSort(col.key as any)}
                      >
                        <div className="flex items-center gap-2">
                          {col.label}
                          {sortConfig?.key === col.key && (
                            <span className="text-emerald-500 text-xs">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedTeachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          checked={selectedTeacherIds.has(teacher.id)}
                          onChange={() => handleSelectTeacher(teacher.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setDrawerTeacher(teacher); setDrawerTab('profile'); }}>
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-emerald-50 shrink-0">
                            <img src={`https://ui-avatars.com/api/?name=${teacher.fullName}&background=d1fae5&color=059669`} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">{teacher.fullName}</p>
                            <p className="text-xs text-slate-400">{teacher.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-slate-500">{teacher.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-700 truncate max-w-[150px] block" title={teacher.qualification}>{teacher.qualification}</span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={teacher.status} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-500">{teacher.joiningDate}</span>
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === teacher.id ? null : teacher.id);
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        >
                          {ICONS.Options}
                        </button>
                        {activeMenuId === teacher.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 w-48 bg-white border border-slate-100 shadow-xl rounded-2xl py-2 z-20 animate-in fade-in zoom-in-95 duration-100 flex flex-col">
                              <button onClick={() => { setDrawerTeacher(teacher); setDrawerTab('profile'); setActiveMenuId(null); }} className="px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-emerald-600">
                                View Profile
                              </button>
                              <button onClick={() => { setDrawerTeacher(teacher); setDrawerTab('payroll'); setActiveMenuId(null); }} className="px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-emerald-600">
                                View Payroll
                              </button>
                              <button onClick={() => { openEditModal(teacher); setActiveMenuId(null); }} className="px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-emerald-600">
                                Edit Details
                              </button>
                              {isAdmin && (
                                <button onClick={() => { if (confirm(`Delete ${teacher.fullName}?`)) deleteTeacher(teacher.id); setActiveMenuId(null); }} className="px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50">
                                  Delete
                                </button>
                              )}
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

          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-4">
            {paginatedTeachers.map((teacher) => (
              <div key={teacher.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm" onClick={() => { setDrawerTeacher(teacher); setDrawerTab('profile'); }}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-emerald-50">
                      <img src={`https://ui-avatars.com/api/?name=${teacher.fullName}&background=d1fae5&color=059669`} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{teacher.fullName}</h3>
                      <p className="text-xs text-slate-500 font-medium">{teacher.qualification}</p>
                    </div>
                  </div>
                  <StatusBadge status={teacher.status} />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">ID</p>
                    <p className="text-sm font-bold text-slate-700">{teacher.id}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Joined</p>
                    <p className="text-sm font-bold text-slate-700">{teacher.joiningDate}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); openEditModal(teacher); }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); setDrawerTeacher(teacher); setDrawerTab('payroll'); }} className="flex-1 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold">Payroll</button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
            <p className="text-xs font-bold text-slate-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTeachers.length)} of {filteredTeachers.length} Asatizah
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${currentPage === page ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"
              >
                Next
              </button>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-slate-100 border-none rounded-lg text-xs font-bold text-slate-600 py-1.5 pl-3 pr-8 focus:ring-0 ml-2"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* Side Drawer */}
      {drawerTeacher && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setDrawerTeacher(null)} />
          <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">

            {/* Drawer Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-6 pt-12 pb-6">
              <div className="flex justify-between items-start mb-6">
                <div className="w-20 h-20 rounded-[2rem] bg-white border-4 border-white shadow-lg overflow-hidden">
                  <img src={`https://ui-avatars.com/api/?name=${drawerTeacher.fullName}&background=059669&color=fff&size=128`} className="w-full h-full object-cover" />
                </div>
                <button onClick={() => setDrawerTeacher(null)} className="p-2 bg-white text-slate-400 hover:text-slate-600 rounded-xl shadow-sm">✕</button>
              </div>
              <h2 className="text-2xl font-black text-slate-900">{drawerTeacher.fullName}</h2>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={drawerTeacher.status} />
                <span className="text-xs font-bold text-slate-400">• {drawerTeacher.id}</span>
              </div>
            </div>

            {/* Drawer Tabs */}
            <div className="flex border-b border-slate-100 px-6">
              {['profile', 'payroll', 'attendance'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDrawerTab(tab as any)}
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${drawerTab === tab ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">

              {drawerTab === 'profile' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                      <p className="text-sm font-bold text-slate-900 truncate">{drawerTeacher.email}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                      <p className="text-sm font-bold text-slate-900">{drawerTeacher.phone}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3">Academic & Professional</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-3 border-b border-slate-50">
                        <span className="text-sm font-medium text-slate-500">Qualification</span>
                        <span className="text-sm font-bold text-slate-900">{drawerTeacher.qualification}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-slate-50">
                        <span className="text-sm font-medium text-slate-500">Joined</span>
                        <span className="text-sm font-bold text-slate-900">{drawerTeacher.joiningDate}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-500 mb-2 block">Subjects</span>
                        <div className="flex flex-wrap gap-2">
                          {drawerTeacher.subjects.map((s, i) => (
                            <span key={i} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'payroll' && (
                <div className="space-y-6">
                  <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Base Salary</p>
                      <span className="px-3 py-1 bg-white/50 rounded-lg text-[9px] font-bold uppercase text-amber-700">{drawerTeacher.salaryType}</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900">₹{drawerTeacher.salaryAmount.toLocaleString()}</h3>
                    <p className="text-xs text-amber-700 font-medium mt-1">Per month guaranteed</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3">Recent Payouts</h4>
                    <div className="space-y-3">
                      {salaryRecords.filter(r => r.teacherId === drawerTeacher.id).length > 0 ? (
                        salaryRecords.filter(r => r.teacherId === drawerTeacher.id).slice(0, 5).map(record => (
                          <div key={record.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{record.month}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{record.status}</p>
                            </div>
                            <span className="text-emerald-600 font-black">₹{record.amount.toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-slate-400 text-sm py-8">No payout records found.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'attendance' && (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    {ICONS.Attendance}
                  </div>
                  <h3 className="font-bold text-slate-900">Attendance Log</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">This feature will track daily clock-in/out times for staff.</p>

                  {/* Placeholder for future implementation using attendance records if available */}
                  <div className="mt-8 grid grid-cols-2 gap-4 opacity-50">
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Present</p>
                      <p className="text-xl font-black text-slate-900">--</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Absent</p>
                      <p className="text-xl font-black text-slate-900">--</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => { openEditModal(drawerTeacher); setDrawerTeacher(null); }}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-transform"
              >
                Edit Full Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Modal (Reused Logic) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-lg text-slate-900">{editingTeacher ? 'Edit Ustadh' : 'New Registration'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Reuse the form fields from original code, styling updated */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                  <input
                    required type="text" className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700"
                    value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                    <input required type="email" className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-0 font-medium text-sm" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone</label>
                    <input required type="tel" className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-0 font-medium text-sm" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qualification</label>
                  <input required type="text" className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-0 font-medium text-sm" value={formData.qualification} onChange={e => setFormData({ ...formData, qualification: e.target.value })} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subjects (comma separated)</label>
                  <input required type="text" className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-0 font-medium text-sm" value={formData.subjects} onChange={e => setFormData({ ...formData, subjects: e.target.value })} />
                </div>

                {isAdmin && (
                  <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Salary Type</label>
                      <select className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-0 font-medium text-sm" value={formData.salaryType} onChange={e => setFormData({ ...formData, salaryType: e.target.value as any })}>
                        <option value="Monthly">Monthly</option>
                        <option value="Hourly">Hourly</option>
                        <option value="Per Class">Per Class</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                      <input required type="number" className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-0 font-medium text-sm" value={formData.salaryAmount} onChange={e => setFormData({ ...formData, salaryAmount: Number(e.target.value) })} />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Login Credentials</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Login ID" className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-0 font-medium text-sm" value={formData.loginId} onChange={e => setFormData({ ...formData, loginId: e.target.value })} />
                    <input type="text" placeholder="Password" className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-0 font-medium text-sm" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                  </div>
                </div>
              </div>
            </form>
            <div className="p-6 border-t border-slate-100 flex gap-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-xs">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg shadow-emerald-200">{editingTeacher ? 'Update' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeacherList;
