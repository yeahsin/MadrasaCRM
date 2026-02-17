
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Student, Teacher, Course, Attendance, FeeRecord, SalaryRecord, TestResult, MonthlyStatus, SystemSettings } from '../types';

// Live backend hosted on StackCP
const API_BASE = 'https://madrasa.quantumautomationssuite.com/backend';

interface StoreContextType {
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  attendance: Attendance[];
  feeRecords: FeeRecord[];
  salaryRecords: SalaryRecord[];
  testResults: TestResult[];
  monthlyStatuses: MonthlyStatus[];
  isLoading: boolean;

  addStudent: (student: Student) => void;
  addBulkStudents: (students: Student[] | any[]) => Promise<any>;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;

  addTeacher: (teacher: Teacher) => void;
  updateTeacher: (teacher: Teacher) => void;
  deleteTeacher: (id: string) => void;

  addCourse: (course: Course) => void;
  updateCourse: (course: Course) => void;
  deleteCourse: (id: string) => void;

  markAttendance: (records: Attendance[]) => void;
  addFeeRecord: (record: FeeRecord) => void;
  addSalaryRecord: (record: SalaryRecord) => void;

  toggleMonthStatus: (month: string, isClosed: boolean) => void;

  settings: SystemSettings;
  updateSettings: (settings: SystemSettings) => void;

  refreshData: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  // Mock monthly statuses for now, ideally fetched from backend
  const [monthlyStatuses, setMonthlyStatuses] = useState<MonthlyStatus[]>([]);

  const [settings, setSettings] = useState<SystemSettings>({
    institutionName: 'Bismilla Shah Madrasa',
    contactPhone: '+91 98765 43210',
    contactEmail: 'admin@bismillashah.com',
    address: '123, Ilm Street, Knowledge City',
    authorizedSignature: 'Mudir Name',
    currency: 'INR',
    academicYear: '2025-2026',
    timezone: 'Asia/Kolkata'
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/fetch_all.php`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();

      // Post-processing to link teachers to students
      const processedStudents = data.students.map((s: any) => {
        // Link logic matching fetch_all.php
        const course = data.courses.find((c: any) => c.id === s.courseId);
        return {
          ...s,
          assignedTeacherIds: course ? [course.teacherId] : []
        };
      });

      setStudents(processedStudents);
      setTeachers(data.teachers);
      setCourses(data.courses);
      setAttendance(data.attendance);
      setFeeRecords(data.feeRecords);
      setSalaryRecords(data.salaryRecords);
      // Initialize monthly statuses from local storage or defaults if backend doesn't support yet
      const savedStatuses = localStorage.getItem('monthlyStatuses');
      if (savedStatuses) {
        setMonthlyStatuses(JSON.parse(savedStatuses));
      }

      // Load Settings
      const savedSettings = localStorage.getItem('systemSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-migrate legacy branding if present in localStorage
  useEffect(() => {
    if (settings.institutionName === 'MadrasaStream Institute') {
      const newSettings = { ...settings, institutionName: 'Bismilla Shah Madrasa' };
      if (settings.contactEmail === 'admin@madrasastream.com') {
        newSettings.contactEmail = 'admin@bismillashah.com';
      }
      updateSettings(newSettings);
    }
  }, [settings]);

  const apiCall = async (endpoint: string, data: any) => {
    setIsLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      let json = null;
      try { json = await resp.json(); } catch (e) { /* ignore */ }
      await fetchData(); // Refresh data after mutation
      return json;
    } catch (e) {
      console.error("API Error", e);
      setIsLoading(false);
      throw e;
    }
  };

  const deleteApiCall = async (type: string, id: string) => {
    setIsLoading(true);
    try {
      await fetch(`${API_BASE}/delete.php?type=${type}&id=${id}`, { method: 'POST' });
      await fetchData();
    } catch (e) {
      console.error("Delete Error", e);
      setIsLoading(false);
    }
  }

  const addStudent = (s: Student) => apiCall('sync_student.php', s);
  const addBulkStudents = (students: Student[] | any[]) => apiCall('sync_students_bulk.php', students);
  const updateStudent = (s: Student) => apiCall('sync_student.php', s);
  const deleteStudent = (id: string) => deleteApiCall('student', id);

  const addTeacher = (t: Teacher) => apiCall('sync_teacher.php', t);
  const updateTeacher = (t: Teacher) => apiCall('sync_teacher.php', t);
  const deleteTeacher = (id: string) => deleteApiCall('teacher', id);

  const addCourse = (c: Course) => apiCall('sync_course.php', c);
  const updateCourse = (c: Course) => apiCall('sync_course.php', c);
  const deleteCourse = (id: string) => deleteApiCall('course', id);

  const markAttendance = (recs: Attendance[]) => apiCall('mark_attendance.php', recs);
  const addFeeRecord = (rec: FeeRecord) => apiCall('record_fee.php', rec);
  const addSalaryRecord = (rec: SalaryRecord) => apiCall('record_salary.php', rec);

  const toggleMonthStatus = (month: string, isClosed: boolean) => {
    const newStatus: MonthlyStatus = {
      month,
      isClosed,
      closedAt: isClosed ? new Date().toISOString() : undefined
    };

    setMonthlyStatuses(prev => {
      const existing = prev.filter(s => s.month !== month);
      const updated = [...existing, newStatus];
      localStorage.setItem('monthlyStatuses', JSON.stringify(updated));
      return updated;
    });
  };

  const updateSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    localStorage.setItem('systemSettings', JSON.stringify(newSettings));
  };

  return (
    <StoreContext.Provider value={{
      students, teachers, courses, attendance, feeRecords, salaryRecords, testResults,
      monthlyStatuses, settings,
      isLoading,
      addStudent, addBulkStudents, updateStudent, deleteStudent,
      addTeacher, updateTeacher, deleteTeacher,
      addCourse, updateCourse, deleteCourse,
      markAttendance, addFeeRecord, addSalaryRecord,
      toggleMonthStatus, updateSettings,
      refreshData: fetchData
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
