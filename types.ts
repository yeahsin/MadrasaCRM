
export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  ACCOUNTANT = 'ACCOUNTANT',
  STUDENT = 'STUDENT',
  SUBSTITUTE = 'SUBSTITUTE',
}

export type Status = 'Active' | 'Inactive' | 'Dropped' | 'Completed' | 'On Leave' | 'Resigned';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  studentId?: string;
  teacherId?: string;
  substituteForId?: string; // ID of the teacher being substituted
}

export interface Student {
  id: string;
  fullName: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  admissionDate: string;
  courseId: string;
  class: string;
  assignedTeacherIds: string[];
  feeStructure: FeeStructure;
  status: Status;
  photoUrl?: string;
  remarks?: string;
}

export interface Teacher {
  id: string;
  fullName: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  qualification: string;
  subjects: string[];
  experience: number;
  joiningDate: string;
  salaryType: 'Monthly' | 'Hourly' | 'Per Class';
  salaryAmount: number;
  bankDetails: {
    accountNo: string;
    ifsc: string;
  };
  status: Status;
  assignedCourseIds: string[];
  // Login credentials created by Admin
  loginId?: string;
  password?: string;
  lastUpdated?: string;
}

export interface Course {
  id: string;
  name: string;
  duration: string;
  subjects: string[];
  baseFee: number;
  teacherId: string;
  timings: string;
}

export interface FeeStructure {
  totalFee: number; // Used as Monthly Fee
  isInstallment: boolean;
  installmentsCount: number;
  discount: number; // amount or %
}

export interface Attendance {
  id: string;
  studentId: string;
  teacherId: string;
  courseId: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late';
  remarks?: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  amountPaid: number;
  date: string; // Transaction date
  month: string; // The month this fee is for (e.g., "2024-05")
  mode: 'Cash' | 'UPI' | 'Bank' | 'Card';
  reference: string;
  status: 'Paid' | 'Partial' | 'Due';
  receiptNo: string;
}

export interface SalaryRecord {
  id: string;
  teacherId: string;
  amount: number;
  month: string;
  status: 'Paid' | 'Partial' | 'Pending';
  date?: string;
  mode?: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque';
  receiptNo?: string;
}

export interface TestResult {
  id: string;
  testId: string;
  studentId: string;
  marks: number;
  totalMarks: number;
  grade: string;
  remarks: string;
  date: string;
}

export interface MonthlyStatus {
  month: string; // "YYYY-MM"
  isClosed: boolean;
  closedBy?: string; // User ID
  closedAt?: string; // ISO Date
}

export interface SystemSettings {
  institutionName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  authorizedSignature: string;
  currency: string;
  academicYear: string;
  timezone: string;
}
