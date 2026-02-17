import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/StoreContext';
import { ICONS } from '../../constants';
import { Course, UserRole } from '../../types';

interface CourseManagerProps {
  userRole: UserRole;
  teacherId?: string;
}

const CourseManager: React.FC<CourseManagerProps> = ({ userRole, teacherId }) => {
  const { courses, teachers, students, addCourse, updateCourse, deleteCourse } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [timeStep, setTimeStep] = useState<'start' | 'end' | null>(null);
  const [startTime, setStartTime] = useState('');
  const [tempTime, setTempTime] = useState({ hour: '08', minute: '00', period: 'AM' });

  const handleTimeSet = () => {
    const formattedTime = `${tempTime.hour}:${tempTime.minute} ${tempTime.period}`;
    if (timeStep === 'start') {
      setStartTime(formattedTime);
      setTimeStep('end');
      setTempTime({ hour: '09', minute: '00', period: 'AM' });
    } else {
      setFormData({ ...formData, timings: `${startTime} - ${formattedTime}` });
      setHasUnsavedChanges(true);
      setTimeStep(null);
    }
  };

  const isAdmin = userRole === UserRole.ADMIN;

  const [formData, setFormData] = useState({
    name: '',
    duration: 'Indefinite',
    teacherId: '',
    timings: '',
    baseFee: 0
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Browser navigation guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && isModalOpen) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, isModalOpen]);

  // Modal Close Guard
  const handleCloseModal = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Do you want to leave without saving?')) {
        setHasUnsavedChanges(false);
        setIsModalOpen(false);
      }
    } else {
      setIsModalOpen(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const displayCourses = isAdmin
    ? courses
    : courses.filter(c => c.teacherId === teacherId);

  const openAdd = () => {
    setEditingCourse(null);
    setFormData({
      name: '',
      duration: 'Indefinite',
      teacherId: isAdmin ? (teachers[0]?.id || '') : (teacherId || ''),
      timings: '',
      baseFee: 0
    });
    setHasUnsavedChanges(false);
    setIsModalOpen(true);
  };

  const openEdit = (course: Course) => {
    // Safety check for teachers
    if (!isAdmin && course.teacherId !== teacherId) return;

    setEditingCourse(course);
    setEditingCourse(course);
    setFormData({ ...course });
    setHasUnsavedChanges(false);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Safety check: ensure teacherId is locked for non-admins
    const finalFormData = isAdmin ? formData : { ...formData, teacherId };

    if (editingCourse) {
      if (!isAdmin && editingCourse.teacherId !== teacherId) return;
      updateCourse({ ...editingCourse, ...finalFormData });
    } else {
      const newCourse: Course = {
        ...finalFormData,
        id: `C-${Math.floor(100 + Math.random() * 899)}`,
        subjects: ['General']
      };
      addCourse(newCourse);
    }
    setHasUnsavedChanges(false);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Halqat Management</h1>
          <p className="text-slate-500">
            {isAdmin ? "Define and manage all study batches." : "Overview of your assigned Halqat."}
          </p>
        </div>
        {(isAdmin || teacherId) && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
          >
            {ICONS.Plus} Create New Halqa
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayCourses.map(course => {
          const teacher = teachers.find(t => t.id === course.teacherId);
          const studentCount = students.filter(s => s.courseId === course.id).length;
          const canManage = isAdmin || (teacherId && course.teacherId === teacherId);

          return (
            <div key={course.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group relative">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  {ICONS.Halqat}
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(course)} className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors">
                      {ICONS.Options}
                    </button>
                    <button onClick={() => confirm(`Delete ${course.name}?`) && deleteCourse(course.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      {ICONS.Logout}
                    </button>
                  </div>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{course.name}</h3>
              <p className="text-xs text-slate-400 font-medium mb-4">{course.timings || 'Flexible Hours'}</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">Ustadh:</span>
                  <span className="text-slate-900 font-bold">{teacher?.fullName || 'Unassigned'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">Talaba:</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-bold text-xs">{studentCount} Students</span>
                </div>
              </div>
            </div>
          );
        })}
        {displayCourses.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400">
            No Halqat assigned yet.
          </div>
        )}
      </div>

      {isModalOpen && (isAdmin || teacherId) && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity" onClick={handleCloseModal} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300">
            <div className="h-full flex flex-col">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-emerald-800 text-white">
                <h2 className="text-xl font-bold">{editingCourse ? 'Edit Halqa' : 'New Halqa'}</h2>
                <button onClick={handleCloseModal} className="p-2 hover:bg-emerald-900 rounded-lg">{ICONS.Logout}</button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Halqa Name</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={formData.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Assigned Ustadh</label>
                  <select
                    disabled={!isAdmin}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                    value={formData.teacherId}
                    onChange={e => handleInputChange('teacherId', e.target.value)}
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Timings</label>
                  <input
                    type="text"
                    readOnly
                    placeholder="Set Halqa Timings"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer"
                    value={formData.timings}
                    onClick={() => {
                      setTempTime({ hour: '08', minute: '00', period: 'AM' });
                      setTimeStep('start');
                    }}
                  />
                </div>

                <div className="pt-8 flex gap-4">
                  <button type="button" onClick={handleCloseModal} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-700 text-white rounded-xl font-bold">Save Halqa</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {timeStep && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]" onClick={() => setTimeStep(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none">
            <div className="bg-white w-full max-w-xs rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 pointer-events-auto">
              <div className="bg-emerald-800 p-6 text-white text-center">
                <h3 className="text-xl font-bold tracking-tight">
                  {timeStep === 'start' ? 'Halqa Start from' : 'Halqa ends at'}
                </h3>
              </div>

              <div className="p-8">
                <div className="flex justify-center items-center gap-4 mb-8">
                  <div className="flex-1">
                    <div className="h-48 overflow-y-auto snap-y snap-mandatory scrollbar-hide py-20 bg-slate-50 rounded-2xl border border-slate-100">
                      {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                        <button
                          key={h}
                          onClick={() => setTempTime({ ...tempTime, hour: h })}
                          className={`block w-full py-3 text-2xl font-bold snap-center transition-all ${tempTime.hour === h ? 'text-emerald-600 scale-125' : 'text-slate-300'}`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-slate-300">:</span>
                  <div className="flex-1">
                    <div className="h-48 overflow-y-auto snap-y snap-mandatory scrollbar-hide py-20 bg-slate-50 rounded-2xl border border-slate-100">
                      {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                        <button
                          key={m}
                          onClick={() => setTempTime({ ...tempTime, minute: m })}
                          className={`block w-full py-3 text-2xl font-bold snap-center transition-all ${tempTime.minute === m ? 'text-emerald-600 scale-125' : 'text-slate-300'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {['AM', 'PM'].map(p => (
                      <button
                        key={p}
                        onClick={() => setTempTime({ ...tempTime, period: p as 'AM' | 'PM' })}
                        className={`px-4 py-2 rounded-xl font-bold transition-all ${tempTime.period === p ? 'bg-emerald-100 text-emerald-700 shadow-sm ring-1 ring-emerald-200' : 'bg-slate-50 text-slate-400'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleTimeSet}
                  className="w-full py-4 bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-700/20 active:scale-95 transition-all hover:bg-emerald-800"
                >
                  Set {timeStep === 'start' ? 'Start' : 'End'} Time
                </button>
              </div>
            </div>
          </div>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar { display: none; }
            .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>
        </>
      )}
    </div>
  );
};

export default CourseManager;
