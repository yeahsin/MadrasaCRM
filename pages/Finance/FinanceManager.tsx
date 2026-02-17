
import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useStore } from '../../store/StoreContext';
import { ICONS } from '../../constants';
import { Lock, TrendingUp, TrendingDown, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { FeeRecord, SalaryRecord, Teacher, UserRole } from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

interface FinanceManagerProps {
  userRole: UserRole;
  teacherId?: string;
}

const FinanceManager: React.FC<FinanceManagerProps> = ({ userRole, teacherId }) => {
  const { students, teachers, feeRecords, salaryRecords, addFeeRecord, addSalaryRecord, courses, monthlyStatuses, toggleMonthStatus, settings } = useStore();

  const isAdmin = userRole === UserRole.ADMIN;

  const [activeTab, setActiveTab] = useState<'fees' | 'salaries'>(isAdmin ? 'fees' : 'salaries');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<FeeRecord | null>(null);
  const [isSalaryReceiptModalOpen, setIsSalaryReceiptModalOpen] = useState(false);
  const [selectedSalaryReceipt, setSelectedSalaryReceipt] = useState<SalaryRecord | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const salaryReceiptRef = useRef<HTMLDivElement>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [selectedParentName, setSelectedParentName] = useState('');
  const [selectedParentPhone, setSelectedParentPhone] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [salaryPaymentAmount, setSalaryPaymentAmount] = useState<number>(0);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [isPayrollInitialized, setIsPayrollInitialized] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState<'fees' | 'payroll' | null>(null);

  const [viewMode, setViewMode] = useState<'month' | 'custom'>('month');
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const isMonthClosed = useMemo(() => {
    if (viewMode !== 'month') return false;
    return monthlyStatuses.find(s => s.month === selectedMonth)?.isClosed || false;
  }, [monthlyStatuses, selectedMonth, viewMode]);

  const isDateInPeriod = (dateStr: string) => {
    return dateStr >= dateRange.from && dateStr <= dateRange.to;
  };

  // Filter records based on role
  const displayTeachers = isAdmin ? teachers : teachers.filter(t => t.id === teacherId);
  const displaySalaryRecords = isAdmin ? salaryRecords : salaryRecords.filter(r => r.teacherId === teacherId);
  const displayFeeRecords = isAdmin ? feeRecords : []; // Teachers don't see fees

  // Stats calculation
  const getFilteredRecords = (records: any[], type: 'fee' | 'salary') => {
    return records.filter(r => {
      if (viewMode === 'month') {
        return r.month === selectedMonth;
      }
      return r.date >= dateRange.from && r.date <= dateRange.to;
    });
  };

  const monthlyRevenue = getFilteredRecords(displayFeeRecords, 'fee')
    .reduce((sum, r) => sum + r.amountPaid, 0);

  const monthlySalaries = getFilteredRecords(displaySalaryRecords, 'salary')
    .filter(r => r.status === 'Paid')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalPossibleRevenue = isAdmin
    ? students.filter(s => s.status === 'Active').reduce((sum, s) => sum + s.feeStructure.totalFee, 0)
    : 0;

  const outstanding = viewMode === 'month' ? totalPossibleRevenue - monthlyRevenue : 0;
  const netPosition = monthlyRevenue - monthlySalaries;

  // Financial Health Score Calculation
  const collectionRate = totalPossibleRevenue > 0 ? (monthlyRevenue / totalPossibleRevenue) * 100 : 0;
  const healthScore = Math.min(100, Math.round(collectionRate * 0.6 + (outstanding === 0 ? 40 : 20)));
  const healthStatus = healthScore >= 80 ? 'Healthy' : healthScore >= 50 ? 'Moderate' : 'Critical';

  // Chart Data Preparation (Mock for now, ideally aggregated from records)
  const chartData = useMemo(() => {
    // Generate data based on viewMode. For 'month', show weeks? For 'custom', show days?
    // specific logic:
    const data = [];
    const labels = viewMode === 'month' ? ['Week 1', 'Week 2', 'Week 3', 'Week 4'] : ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

    for (let i = 0; i < labels.length; i++) {
      data.push({
        name: labels[i],
        revenue: Math.floor(monthlyRevenue / labels.length + (Math.random() * 5000 - 2500)),
        expenses: Math.floor(monthlySalaries / labels.length + (Math.random() * 3000 - 1500)),
      });
    }
    return data;
  }, [monthlyRevenue, monthlySalaries, viewMode]);

  const stats = isAdmin ? [
    {
      label: 'Net Position',
      value: `₹${netPosition.toLocaleString()}`,
      color: netPosition >= 0 ? 'text-emerald-600' : 'text-red-600',
      icon: netPosition >= 0 ? TrendingUp : TrendingDown,
      sub: viewMode === 'month' ? 'vs Last Month' : 'vs Period'
    },
    {
      label: 'Total Revenue',
      value: `₹${monthlyRevenue.toLocaleString()}`,
      color: 'text-blue-600',
      icon: Activity,
      sub: `${collectionRate.toFixed(1)}% Collected`
    },
    {
      label: 'Staff Payouts',
      value: `₹${monthlySalaries.toLocaleString()}`,
      color: 'text-amber-600',
      icon: CheckCircle2,
      sub: 'Processed'
    },
    ...(viewMode === 'month' ? [{
      label: 'Pending',
      value: `₹${outstanding > 0 ? outstanding.toLocaleString() : 0}`,
      color: 'text-red-600',
      icon: AlertCircle,
      sub: `${students.length} Students`
    }] : []),
  ] : [
    {
      label: viewMode === 'month' ? `${selectedMonth} My Payouts` : 'Period Payouts',
      value: `₹${monthlySalaries.toLocaleString()}`,
      color: 'text-emerald-600',
      icon: Activity,
      sub: 'Received'
    },
  ];

  const handleExportPDF = async (type: 'fees' | 'payroll') => {
    const tableContainer = document.querySelector('.custom-scrollbar table') as HTMLElement;
    if (!tableContainer) return;

    try {
      const canvas = await html2canvas(tableContainer);
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.setFontSize(18);
      pdf.text(type === 'fees' ? 'Fee Collection Report' : 'Payroll Report', 14, 22);
      pdf.setFontSize(11);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

      pdf.addImage(imgData, 'PNG', 0, 40, pdfWidth, pdfHeight);
      pdf.save(`${type}_report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("PDF Export Failed", error);
    }
  };

  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Records");

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

  const handleExportFees = (type: 'excel' | 'pdf' = 'excel') => {
    if (!isAdmin) return;

    if (type === 'pdf') {
      handleExportPDF('fees');
      setExportMenuOpen(null);
      return;
    }

    const data = students.map(student => {
      // For export, we need to be careful.
      // If Custom Range: show records within range.
      // If Month: show records for that month.

      const records = displayFeeRecords.filter(r => {
        if (viewMode === 'month') return r.studentId === student.id && r.month === selectedMonth;
        return r.studentId === student.id && isDateInPeriod(r.date);
      });

      // Filter: In Custom Mode, only show students with actual transaction records.
      if (viewMode === 'custom' && records.length === 0) return null;

      const totalPaid = records.reduce((sum, r) => sum + r.amountPaid, 0);
      const totalFee = student.feeStructure.totalFee;

      const balanceAmount = totalFee - totalPaid;
      const balanceDisplay = totalPaid >= totalFee ? 'Paid Full' : balanceAmount;
      const statusDisplay = totalPaid >= totalFee ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Due');

      return {
        'Period': viewMode === 'month' ? selectedMonth : `${dateRange.from} to ${dateRange.to}`,
        'Student Name': student.fullName,
        'Student ID': student.id,
        'Course': courses.find(c => c.id === student.courseId)?.name || 'N/A',
        'Total Fee': totalFee,
        'Amount Paid': totalPaid,
        'Balance': balanceDisplay,
        'Status': statusDisplay,
        'Receipts': records.map(r => r.receiptNo).join(', ')
      };
    }).filter(Boolean); // Filter out nulls

    exportToExcel(data, `Fees_Report_${viewMode === 'month' ? selectedMonth : 'Custom'}`);
    setExportMenuOpen(null);
  };

  const handleExportPayroll = (type: 'excel' | 'pdf' = 'excel') => {
    if (type === 'pdf') {
      handleExportPDF('payroll');
      setExportMenuOpen(null);
      return;
    }

    const data = displayTeachers.map(teacher => {
      const records = displaySalaryRecords.filter(r => {
        if (viewMode === 'month') return r.teacherId === teacher.id && r.month === selectedMonth;
        return r.teacherId === teacher.id && isDateInPeriod(r.date);
      });

      // Filter: In Custom Mode, only show teachers with actual transaction records.
      if (viewMode === 'custom' && records.length === 0) return null;

      const totalPaid = records.reduce((sum, r) => sum + r.amount, 0);
      const totalSalary = teacher.salaryAmount;

      const balanceAmount = totalSalary - totalPaid;
      const balanceDisplay = totalPaid >= totalSalary ? 'Paid Full' : balanceAmount;
      const statusDisplay = totalPaid >= totalSalary ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending');

      return {
        'Period': viewMode === 'month' ? selectedMonth : `${dateRange.from} to ${dateRange.to}`,
        'Teacher Name': teacher.fullName,
        'Teacher ID': teacher.id,
        'Subject/Dept': teacher.subjects.join(', '),
        'Monthly Salary': totalSalary,
        'Amount Paid': totalPaid,
        'Balance': balanceDisplay,
        'Status': statusDisplay,
        'Payment Mode': Array.from(new Set(records.map(r => r.mode))).join(', '),
        'Last Payment Date': records.length > 0 ? records[records.length - 1].date : 'N/A'
      };
    }).filter(Boolean); // Filter out nulls

    exportToExcel(data, `Payroll_Report_${viewMode === 'month' ? selectedMonth : 'Custom'}`);
    setExportMenuOpen(null);
  };

  const downloadReceipt = (ref: React.RefObject<HTMLDivElement>, fileName: string) => {
    if (!ref.current) return;

    html2canvas(ref.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (clonedDoc) => {
        // Find the logo in the cloned document and force its size for the capture
        const logo = (clonedDoc.getElementById('receipt-logo-student') || clonedDoc.getElementById('receipt-logo-salary')) as HTMLImageElement;
        if (logo) {
          logo.style.width = '128px'; // w-32 equivalent
          logo.style.height = '128px'; // h-32 equivalent
          logo.style.minWidth = '128px';
          logo.style.minHeight = '128px';
          logo.style.objectFit = 'contain';
        }

        // Force the main container to a fixed width for clear PDF generation
        const receiptDiv = clonedDoc.querySelector('.receipt-capture-area') as HTMLDivElement;
        if (receiptDiv) {
          receiptDiv.style.width = '800px';
          receiptDiv.style.minWidth = '800px';
          receiptDiv.style.display = 'block';
          receiptDiv.style.padding = '40px';
        }
      }
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${fileName}.pdf`);
    });
  };

  const downloadSalaryReceipt = () => {
    if (!selectedSalaryReceipt) return;
    const identifier = selectedSalaryReceipt.receiptNo || selectedSalaryReceipt.id.split('-').pop()?.toUpperCase();
    downloadReceipt(salaryReceiptRef, `Salary_Receipt_${identifier}`);
  };

  const filteredStudentsForSelection = useMemo(() => {
    return students.filter(s =>
      s.fullName.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(studentSearchTerm.toLowerCase())
    );
  }, [students, studentSearchTerm]);

  const handleCollectFee = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    const existingRecords = feeRecords.filter(r => r.studentId === student.id && r.month === selectedMonth);
    const totalPaidSoFar = existingRecords.reduce((sum, r) => sum + r.amountPaid, 0);
    const totalFee = student.feeStructure.totalFee;
    const newTotalPaid = totalPaidSoFar + paymentAmount;

    const newRecord: FeeRecord = {
      id: `PAY-${Math.random().toString(36).substr(2, 9)}`,
      studentId: student.id,
      amountPaid: paymentAmount,
      date: new Date().toISOString().split('T')[0],
      month: selectedMonth, // Always record for the currently selected month context, or maybe we should unlock this?
      // Required simplifiction: User records payment for the "Selected Month" in UI,
      // even if they are in Custom View.
      // FIX: If in custom view, we should probably default to current month or ask user.
      // Actually, let's just use the selectedMonth state which is always present.
      mode: 'Cash',
      reference: 'DIRECT',
      status: newTotalPaid >= totalFee ? 'Paid' : 'Partial',
      receiptNo: `REC-${Date.now().toString().slice(-6)}`
    };

    addFeeRecord(newRecord);
    setIsCollectModalOpen(false);
    setSelectedStudentId('');
    setSelectedStudentName('');
    setSelectedParentName('');
    setSelectedParentPhone('');
    setPaymentAmount(0);
  };

  const handlePaySalary = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find(t => t.id === selectedTeacherId);
    if (!teacher) return;

    const existingRecords = salaryRecords.filter(r => r.teacherId === teacher.id && r.month === selectedMonth);
    const totalPaidSoFar = existingRecords.reduce((sum, r) => sum + r.amount, 0);
    const totalSalary = teacher.salaryAmount;
    const newTotalPaid = totalPaidSoFar + salaryPaymentAmount;

    const form = e.target as HTMLFormElement;
    const mode = (form.elements.namedItem('payMode') as HTMLSelectElement).value as any;

    const newRecord: SalaryRecord = {
      id: `SAL-${Math.random().toString(36).substr(2, 9)}`,
      teacherId: teacher.id,
      amount: salaryPaymentAmount,
      month: selectedMonth,
      status: newTotalPaid >= totalSalary ? 'Paid' : 'Partial',
      date: new Date().toISOString().split('T')[0],
      mode: mode,
      receiptNo: `SAL-${Date.now().toString().slice(-6)}`
    };

    addSalaryRecord(newRecord);
    setIsSalaryModalOpen(false);
    setSelectedTeacherId('');
    setSalaryPaymentAmount(0);
  };

  const openSalaryModal = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher) {
      const existingRecords = salaryRecords.filter(r => r.teacherId === teacherId && r.month === selectedMonth);
      const totalPaidSoFar = existingRecords.reduce((sum, r) => sum + r.amount, 0);
      setSalaryPaymentAmount(teacher.salaryAmount - totalPaidSoFar);
    }
    setIsSalaryModalOpen(true);
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Finance & Accounts</h1>
          <p className="text-slate-500 text-sm font-medium">
            {isAdmin ? "Manage monthly revenue and staff payroll." : "View your monthly payroll and receipts."}
          </p>
        </div>
        {isAdmin && (
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm self-start">
            <button
              onClick={() => setActiveTab('fees')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'fees' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-400 hover:bg-slate-50'
                }`}
            >
              Fees
            </button>
            <button
              onClick={() => setActiveTab('salaries')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'salaries' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-400 hover:bg-slate-50'
                }`}
            >
              Payroll
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Viewing Period:</span>

        <select
          className="bg-slate-50 border-none rounded-xl px-4 py-2 font-bold text-slate-700 focus:ring-0 text-sm"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as 'month' | 'custom')}
        >
          <option value="month">Monthly</option>
          <option value="custom">Custom Range</option>
        </select>

        {viewMode === 'month' ? (
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <input
              type="month"
              className="w-full sm:w-auto bg-slate-50 border-none rounded-xl px-4 py-2 font-black text-emerald-600 focus:ring-0 text-sm"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setIsPayrollInitialized(false);
              }}
            />
            {isAdmin && (
              <button
                onClick={() => toggleMonthStatus(selectedMonth, !isMonthClosed)}
                className={`flex-1 sm:flex-0 whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isMonthClosed
                  ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
              >
                {isMonthClosed ? 'Re-open Month' : 'Close Month'}
              </button>
            )}
            {isMonthClosed && (
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Lock size={12} /> Locked
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              className="flex-1 sm:w-auto bg-slate-50 border-none rounded-xl px-4 py-2 font-medium text-slate-700 focus:ring-0 text-sm"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            />
            <span className="text-slate-300 font-bold">-</span>
            <input
              type="date"
              className="flex-1 sm:w-auto bg-slate-50 border-none rounded-xl px-4 py-2 font-medium text-slate-700 focus:ring-0 text-sm"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${stat.color.replace('text-', 'bg-').replace('600', '50')} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              {stat.sub && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg">{stat.sub}</span>}
            </div>
            <h3 className={`text-2xl font-black ${stat.color} tracking-tight mb-1`}>{stat.value}</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Analytics Section */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Financial Analytics</h3>
                <p className="text-xs font-medium text-slate-400">Revenue vs Staff Payouts</p>
              </div>
              {/* Toggle could go here */}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
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
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className={`absolute inset-0 opacity-5 ${healthStatus === 'Healthy' ? 'bg-emerald-500' : healthStatus === 'Moderate' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
            <div className="relative z-10">
              <div className="mb-4 inline-flex p-4 rounded-full bg-slate-50 shadow-sm">
                <Activity size={32} className={healthStatus === 'Healthy' ? 'text-emerald-500' : healthStatus === 'Moderate' ? 'text-amber-500' : 'text-red-500'} />
              </div>
              <h3 className="text-4xl font-black text-slate-900 mb-1">{healthScore}%</h3>
              <div className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4 ${healthStatus === 'Healthy' ? 'bg-emerald-100 text-emerald-700' : healthStatus === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                {healthStatus}
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Financial Health Score</p>
              <p className="text-slate-400 text-[10px] font-medium mt-2 max-w-[200px]">Based on collection efficiency and payroll consistency.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fees' ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">Fee Collection • {viewMode === 'month' ? selectedMonth : `${dateRange.from} to ${dateRange.to}`}</h3>
            <div className="flex gap-3 relative">
              <button
                onClick={() => setExportMenuOpen(exportMenuOpen === 'fees' ? null : 'fees')}
                className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
              >
                {ICONS.Reports} Export
              </button>
              {exportMenuOpen === 'fees' && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-20 animate-in slide-in-from-top-2">
                  <button onClick={() => { handleExportFees('excel'); setExportMenuOpen(null); }} className="w-full text-left px-6 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-600 p-1 rounded">XLS</span> Export Excel
                  </button>
                  <button onClick={() => { handleExportFees('pdf'); setExportMenuOpen(null); }} className="w-full text-left px-6 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                    <span className="bg-red-100 text-red-600 p-1 rounded">PDF</span> Export PDF
                  </button>
                </div>
              )}
              <button
                onClick={() => setIsCollectModalOpen(true)}
                disabled={isMonthClosed && viewMode === 'month'}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ICONS.Plus} Record Payment
              </button>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Talib Name</th>
                  <th className="px-6 py-4">Class</th>
                  <th className="px-6 py-4">Fee Structure</th>
                  <th className="px-6 py-4">Paid / Balance</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Receipts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map(student => {
                  const records = feeRecords.filter(r => {
                    if (viewMode === 'month') return r.studentId === student.id && r.month === selectedMonth;
                    return r.studentId === student.id && isDateInPeriod(r.date);
                  });

                  // In Custom View, only show students who have payments in that range?
                  // Or show all students but with 0 paid if no payments?
                  // Let's hide students with 0 payments in Custom View to keep it clean, 
                  // BUT dashboard usually shows all students in monthly view.
                  // For "Fee Collection", it usually implies "Expected vs Paid".
                  // In Custom Range, "Expected" is undefined/complex.
                  // DECISION: In Custom Mode, only show students with actual transaction records.

                  if (viewMode === 'custom' && records.length === 0) return null;

                  const totalPaid = records.reduce((sum, r) => sum + r.amountPaid, 0);
                  const totalFee = student.feeStructure.totalFee;
                  const isFullyPaid = totalPaid >= totalFee;
                  const isPartial = totalPaid > 0 && totalPaid < totalFee;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <img src={`https://ui-avatars.com/api/?name=${student.fullName}&background=059669&color=fff&bold=true`} className="w-8 h-8 rounded-xl shadow-sm" />
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{student.fullName}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{student.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <span className="text-xs font-bold text-slate-600">
                          {courses.find(c => c.id === student.courseId)?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700">₹{student.feeStructure.totalFee.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{student.feeStructure.type || 'Standard'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 w-32">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500">
                            <span>₹{totalPaid.toLocaleString()}</span>
                            <span>₹{totalFee.toLocaleString()}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (totalPaid / totalFee) * 100)}%` }}></div>
                          </div>
                          <span className="text-[10px] text-red-400 font-bold">{totalPaid < totalFee ? `Due: ₹${(totalFee - totalPaid).toLocaleString()}` : 'Settled'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${totalPaid >= totalFee ? 'bg-emerald-100 text-emerald-700' :
                          totalPaid > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-50 text-red-500'
                          }`}>
                          {totalPaid >= totalFee ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-8 py-4">
                        {records.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {records.map(r => (
                              <button
                                key={r.id}
                                onClick={() => {
                                  setSelectedReceipt(r);
                                  setIsReceiptModalOpen(true);
                                }}
                                className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md w-fit hover:bg-emerald-600 hover:text-white transition-colors"
                              >
                                #{r.receiptNo}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          {!isPayrollInitialized && salaryRecords.filter(r => r.month === selectedMonth).length === 0 ? (
            <div className="bg-white p-12 lg:p-20 text-center rounded-[3rem] border-2 border-dashed border-slate-100">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                {ICONS.Finance}
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Staff Payroll Management</h3>
              <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm leading-relaxed">Initialize the payroll sheet to view active Asatizah and process their salaries for {selectedMonth}.</p>
              <button
                onClick={() => setIsPayrollInitialized(true)}
                className="mt-8 px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-100 hover:scale-105 transition-transform"
              >
                Initialize {selectedMonth} Payroll
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">Payroll Records • {viewMode === 'month' ? selectedMonth : `${dateRange.from} to ${dateRange.to}`}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Status: {salaryRecords.filter(r => r.month === selectedMonth).length > 0 ? 'Processed' : 'Draft'}</p>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setExportMenuOpen(exportMenuOpen === 'payroll' ? null : 'payroll')}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                  >
                    {ICONS.Reports} Export
                  </button>
                  {exportMenuOpen === 'payroll' && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-20 animate-in slide-in-from-top-2">
                      <button onClick={() => { handleExportPayroll('excel'); setExportMenuOpen(null); }} className="w-full text-left px-6 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                        <span className="bg-emerald-100 text-emerald-600 p-1 rounded">XLS</span> Export Excel
                      </button>
                      <button onClick={() => { handleExportPayroll('pdf'); setExportMenuOpen(null); }} className="w-full text-left px-6 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                        <span className="bg-red-100 text-red-600 p-1 rounded">PDF</span> Export PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black tracking-widest">
                    <tr>
                      <th className="px-8 py-4">Ustadh / Staff</th>
                      <th className="px-8 py-4">Salary Breakdown</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4">Receipts</th>
                      <th className="px-8 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {teachers.map(teacher => {
                      const records = salaryRecords.filter(r => {
                        if (viewMode === 'month') return r.teacherId === teacher.id && r.month === selectedMonth;
                        return r.teacherId === teacher.id && isDateInPeriod(r.date);
                      });

                      if (viewMode === 'custom' && records.length === 0) return null;

                      const totalPaid = records.reduce((sum, r) => sum + r.amount, 0);
                      const totalSalary = teacher.salaryAmount;
                      const isFullyPaid = totalPaid >= totalSalary;
                      const isPartial = totalPaid > 0 && totalPaid < totalSalary;

                      return (
                        <tr key={teacher.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <img src={`https://ui-avatars.com/api/?name=${teacher.fullName}&background=d97706&color=fff&bold=true`} className="w-8 h-8 rounded-xl shadow-sm" />
                              <div>
                                <p className="font-bold text-slate-900 text-sm">{teacher.fullName}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{teacher.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-700 w-32">
                                <span>Base:</span>
                                <span>₹{teacher.salaryAmount.toLocaleString()}</span>
                              </div>
                              <div className="h-px bg-slate-100 w-32 my-1"></div>
                              <div className="flex items-center justify-between text-sm font-black text-slate-900 w-32">
                                <span>Net:</span>
                                <span>₹{totalSalary.toLocaleString()}</span>
                              </div>
                              <span className="text-[10px] text-emerald-600 font-bold mt-1">Paid: ₹{totalPaid.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${isFullyPaid ? 'bg-emerald-100 text-emerald-700' :
                              isPartial ? 'bg-amber-100 text-amber-700' : 'bg-red-50 text-red-500'
                              }`}>
                              {isFullyPaid ? 'Paid' : isPartial ? 'Partial' : 'Pending'}
                            </span>
                          </td>

                          <td className="px-8 py-4">
                            {records.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {records.map(r => (
                                  <button
                                    key={r.id}
                                    onClick={() => {
                                      setSelectedSalaryReceipt(r);
                                      setIsSalaryReceiptModalOpen(true);
                                    }}
                                    className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md w-fit hover:bg-amber-600 hover:text-white transition-colors"
                                  >
                                    #{r.receiptNo || r.id.split('-').pop()?.toUpperCase()}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-8 py-4 text-center">
                            {!isFullyPaid ? (
                              <button
                                onClick={() => openSalaryModal(teacher.id)}
                                disabled={(isMonthClosed && viewMode === 'month')}
                                className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isPartial ? 'Pay Balance' : 'Record Pay'}
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (records.length > 0) {
                                    setSelectedSalaryReceipt(records[records.length - 1]);
                                    setIsSalaryReceiptModalOpen(true);
                                  }
                                }}
                                className="text-slate-300 hover:text-emerald-600 p-2"
                              >
                                {ICONS.Reports}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )
      }

      {/* Collect Fee Modal */}
      {
        isCollectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsCollectModalOpen(false)} />
            <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <h3 className="font-black text-sm sm:text-base uppercase tracking-widest text-slate-800">Record Talib Payment</h3>
                <button
                  onClick={() => setIsCollectModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                <p className="text-slate-500 text-center mb-6 text-sm">Monthly fee for {selectedMonth}</p>

                <form onSubmit={handleCollectFee} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Find Talib</label>
                      <input
                        type="text"
                        placeholder="Search by Name or ID..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm font-medium"
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Confirm Profile</label>
                      <select
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-sm"
                        value={selectedStudentName}
                        onChange={(e) => {
                          setSelectedStudentName(e.target.value);
                          setSelectedStudentId('');
                          setSelectedParentName('');
                          setSelectedParentPhone('');
                        }}
                      >
                        <option value="">Choose Student Name...</option>
                        {Array.from(new Set(filteredStudentsForSelection.map(s => s.fullName.toLowerCase())))
                          .map(lowerName => {
                            const originalStudent = filteredStudentsForSelection.find(s => s.fullName.toLowerCase() === lowerName);
                            return (
                              <option key={lowerName} value={originalStudent?.fullName}>
                                {originalStudent?.fullName}
                              </option>
                            );
                          })
                        }
                      </select>
                    </div>

                    {selectedStudentName && (
                      <>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Parent's Name</label>
                          <select
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-sm"
                            value={selectedParentName}
                            onChange={(e) => {
                              setSelectedParentName(e.target.value);
                              setSelectedParentPhone('');
                              setSelectedStudentId('');
                            }}
                          >
                            <option value="">Choose Parent...</option>
                            {students
                              .filter(s => s.fullName.toLowerCase() === selectedStudentName.toLowerCase())
                              .map(s => (
                                <option key={s.id + s.parentName} value={s.parentName}>
                                  {s.parentName}
                                </option>
                              ))
                            }
                          </select>
                        </div>

                        {selectedParentName && (
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Parent's Number</label>
                            <select
                              required
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-sm"
                              value={selectedParentPhone}
                              onChange={(e) => {
                                const phone = e.target.value;
                                setSelectedParentPhone(phone);
                                const student = students.find(s =>
                                  s.fullName.toLowerCase() === selectedStudentName.toLowerCase() &&
                                  s.parentName === selectedParentName &&
                                  s.parentPhone === phone
                                );
                                if (student) setSelectedStudentId(student.id);
                              }}
                            >
                              <option value="">Choose Number...</option>
                              {students
                                .filter(s =>
                                  s.fullName.toLowerCase() === selectedStudentName.toLowerCase() &&
                                  s.parentName === selectedParentName
                                )
                                .map(s => (
                                  <option key={s.id + s.parentPhone} value={s.parentPhone}>
                                    {s.parentPhone}
                                  </option>
                                ))
                              }
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Amount (₹)</label>
                          <input
                            type="number"
                            required
                            min="1"
                            placeholder="Enter amount..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-sm"
                            value={paymentAmount || ''}
                            onChange={(e) => setPaymentAmount(Number(e.target.value))}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {selectedStudentId && (
                    <div className="bg-emerald-50 p-6 rounded-[1.5rem] border border-emerald-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                      {(() => {
                        const student = students.find(s => s.id === selectedStudentId);
                        const totalFee = student?.feeStructure.totalFee || 0;
                        const paidSoFar = feeRecords
                          .filter(r => r.studentId === selectedStudentId && r.month === selectedMonth)
                          .reduce((sum, r) => sum + r.amountPaid, 0);
                        const balance = totalFee - paidSoFar;

                        return (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Monthly Fee</span>
                              <span className="font-bold text-emerald-800">₹{totalFee.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Paid So Far</span>
                              <span className="font-bold text-emerald-800">₹{paidSoFar.toLocaleString()}</span>
                            </div>
                            <div className="border-t border-emerald-200/50 pt-2 flex justify-between items-center">
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Remaining Balance</span>
                              <span className="text-xl font-black text-emerald-700">₹{(balance - paymentAmount).toLocaleString()}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button type="button" onClick={() => {
                      setIsCollectModalOpen(false);
                      setSelectedStudentId('');
                      setSelectedStudentName('');
                      setSelectedParentName('');
                      setSelectedParentPhone('');
                      setPaymentAmount(0);
                    }} className="order-2 sm:order-1 flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs">Cancel</button>
                    <button type="submit" disabled={!selectedStudentId || paymentAmount <= 0 || (isMonthClosed && viewMode === 'month')} className="order-1 sm:order-2 flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed">Confirm Collection</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }

      {/* Salary Record Modal */}
      {
        isSalaryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsSalaryModalOpen(false)} />
            <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <h3 className="font-black text-sm sm:text-base uppercase tracking-widest text-slate-800">Process Salary Payment</h3>
                <button
                  onClick={() => setIsSalaryModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                <p className="text-slate-500 text-center mb-6 text-sm">Confirm payout for {selectedMonth}</p>

                <form onSubmit={handlePaySalary} className="space-y-6">
                  <div className="bg-amber-50 p-6 rounded-[1.5rem] border border-amber-100 space-y-4">
                    <div className="flex items-center gap-4">
                      <img src={`https://ui-avatars.com/api/?name=${teachers.find(t => t.id === selectedTeacherId)?.fullName}&background=d97706&color=fff&bold=true`} className="w-12 h-12 rounded-xl" />
                      <div>
                        <p className="text-lg font-black text-amber-900">{teachers.find(t => t.id === selectedTeacherId)?.fullName}</p>
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{selectedTeacherId}</p>
                      </div>
                    </div>
                    <div className="border-t border-amber-100 pt-4 space-y-2">
                      {(() => {
                        const teacher = teachers.find(t => t.id === selectedTeacherId);
                        const totalSalary = teacher?.salaryAmount || 0;
                        const paidSoFar = salaryRecords
                          .filter(r => r.teacherId === selectedTeacherId && r.month === selectedMonth)
                          .reduce((sum, r) => sum + r.amount, 0);
                        const balance = totalSalary - paidSoFar;

                        return (
                          <>
                            <div className="flex justify-between items-center text-[10px] font-black text-amber-600 uppercase tracking-widest">
                              <span>Base Salary</span>
                              <span>₹{totalSalary.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black text-amber-600 uppercase tracking-widest">
                              <span>Paid So Far</span>
                              <span>₹{paidSoFar.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-amber-200/50">
                              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Remaining Balance</span>
                              <span className="text-xl font-black text-amber-900">₹{(balance - salaryPaymentAmount).toLocaleString()}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Amount (₹)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-amber-500/20 outline-none font-bold text-sm"
                        value={salaryPaymentAmount || ''}
                        onChange={(e) => setSalaryPaymentAmount(Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Mode</label>
                      <select
                        name="payMode"
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-amber-500/20 outline-none font-bold text-sm"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="UPI">UPI Payment</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button type="button" onClick={() => {
                      setIsSalaryModalOpen(false);
                      setSelectedTeacherId('');
                      setSalaryPaymentAmount(0);
                    }} className="order-2 sm:order-1 flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs">Cancel</button>
                    <button type="submit" disabled={salaryPaymentAmount <= 0} className="order-1 sm:order-2 flex-1 py-4 bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-amber-100 disabled:opacity-50">Process Payout</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }
      {/* Receipt Modal */}
      {
        isReceiptModalOpen && selectedReceipt && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsReceiptModalOpen(false)} />
            <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">

              {/* Modal Header */}
              <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <h3 className="font-black text-xs sm:text-sm uppercase tracking-widest text-slate-800">Payment Receipt</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadReceipt(receiptRef, `Fee_Receipt_${selectedReceipt.receiptNo}`)}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                    title="Download PDF"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  </button>
                  <button
                    onClick={() => setIsReceiptModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Receipt Content Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-slate-50/30">
                <div ref={receiptRef} className="bg-white p-4 sm:p-10 shadow-sm sm:shadow-none rounded-2xl sm:rounded-none mx-auto receipt-capture-area" style={{ minWidth: 'min(100%, 600px)' }}>
                  <style>{`
                  @media print {
                    body * { visibility: hidden; }
                    #receipt-content, #receipt-content * { visibility: visible; }
                    #receipt-content { 
                      position: fixed; 
                      left: 0; 
                      top: 0; 
                      width: 100%; 
                      padding: 40px;
                    }
                    .no-print-modal { box-shadow: none !important; border: none !important; }
                  }
                `}</style>

                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 sm:mb-10">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <img src="/images/Bismilla Shah Madrasa Logo.png" className="w-20 h-20 sm:w-32 sm:h-32 object-contain bg-slate-50 rounded-2xl p-2" alt="Logo" id="receipt-logo-student" />
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">{settings.institutionName}</h2>
                        <p className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-tighter mt-1">Professional Management</p>
                      </div>
                    </div>
                    <div className="sm:text-right w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end">
                      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt No</p>
                      <p className="text-base sm:text-lg font-black text-emerald-600">#{selectedReceipt.receiptNo}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-10">
                    <div className="p-3 sm:p-0 bg-slate-50 sm:bg-transparent rounded-xl">
                      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Student Details</p>
                      <p className="font-bold text-slate-900 text-sm sm:text-base">{students.find(s => s.id === selectedReceipt.studentId)?.fullName || 'N/A'}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500">ID: {selectedReceipt.studentId}</p>
                    </div>
                    <div className="p-3 sm:p-0 bg-slate-50 sm:bg-transparent rounded-xl sm:text-right">
                      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment Date</p>
                      <p className="font-bold text-slate-900 text-sm sm:text-base">{selectedReceipt.date}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500">Month: {selectedReceipt.month}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</span>
                      <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                      <span className="font-bold text-slate-700 text-xs sm:text-sm">Monthly Education Fee</span>
                      <span className="font-black text-slate-900 text-sm sm:text-base">₹{selectedReceipt.amountPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 mb-4">
                      <span className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-widest">Amount in this Receipt</span>
                      <span className="text-lg sm:text-xl font-black text-emerald-600">₹{selectedReceipt.amountPaid.toLocaleString()}</span>
                    </div>

                    {(() => {
                      const student = students.find(s => s.id === selectedReceipt.studentId);
                      const totalFee = student?.feeStructure.totalFee || 0;
                      const monthRecords = feeRecords.filter(r => r.studentId === selectedReceipt.studentId && r.month === selectedReceipt.month);
                      const totalPaidInMonth = monthRecords.reduce((sum, r) => sum + r.amountPaid, 0);
                      const balance = totalFee - totalPaidInMonth;

                      return (
                        <div className="border-t border-slate-200 pt-4 mt-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Month Fee</span>
                            <span className="text-[10px] sm:text-xs font-bold text-slate-600">₹{totalFee.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Paid for {selectedReceipt.month}</span>
                            <span className="text-[10px] sm:text-xs font-bold text-slate-600">₹{totalPaidInMonth.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 px-3 bg-white rounded-xl border border-slate-100">
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-900 uppercase tracking-widest">Status</span>
                            {balance <= 0 ? (
                              <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase">Complete payment for this month has been made.</span>
                            ) : (
                              <div className="text-right">
                                <span className="text-[9px] sm:text-[10px] font-black text-red-500 uppercase tracking-widest block">Pending Balance</span>
                                <span className="text-xs sm:text-sm font-black text-red-600">₹{balance.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 sm:gap-0">
                    <div className="text-center sm:text-left">
                      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment Mode</p>
                      <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                        {selectedReceipt.mode}
                      </span>
                    </div>
                    <div className="text-center">
                      <div className="w-32 h-px bg-slate-200 mb-2 mx-auto"></div>
                      <p className="text-[10px] sm:text-xs font-black text-slate-800 uppercase tracking-widest">{settings.authorizedSignature}</p>
                      <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Authorized Signature</p>
                    </div>
                  </div>

                  <div className="mt-8 sm:mt-12 text-center">
                    <p className="text-[8px] sm:text-[10px] text-slate-400 font-medium">This is a computer-generated receipt and does not require a physical signature.</p>
                    <p className="text-[9px] sm:text-[10px] text-emerald-600 font-black uppercase mt-1">JazakAllah Khairan</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Salary Receipt Modal */}
      {
        isSalaryReceiptModalOpen && selectedSalaryReceipt && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsSalaryReceiptModalOpen(false)} />
            <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">

              {/* Modal Header */}
              <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <h3 className="font-black text-xs sm:text-sm uppercase tracking-widest text-slate-800">Salary Receipt</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadSalaryReceipt}
                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                    title="Download PDF"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  </button>
                  <button
                    onClick={() => setIsSalaryReceiptModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Receipt Content Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-slate-50/30">
                <div ref={salaryReceiptRef} className="bg-white p-4 sm:p-10 shadow-sm sm:shadow-none rounded-2xl sm:rounded-none mx-auto receipt-capture-area" style={{ minWidth: 'min(100%, 600px)' }}>
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 sm:mb-10">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <img src="/images/Bismilla Shah Madrasa Logo.png" className="w-20 h-20 sm:w-32 sm:h-32 object-contain bg-slate-50 rounded-2xl p-2" alt="Logo" id="receipt-logo-salary" />
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">{settings.institutionName}</h2>
                        <p className="text-[10px] sm:text-xs font-bold text-amber-600 uppercase tracking-tighter mt-1">Professional Management</p>
                      </div>
                    </div>
                    <div className="sm:text-right w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end">
                      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt No</p>
                      <p className="text-base sm:text-lg font-black text-amber-600">#{selectedSalaryReceipt.receiptNo || selectedSalaryReceipt.id.split('-').pop()?.toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-10">
                    <div className="p-3 sm:p-0 bg-slate-50 sm:bg-transparent rounded-xl">
                      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ustadh / Staff</p>
                      <p className="font-bold text-slate-900 text-sm sm:text-base">{teachers.find(t => t.id === selectedSalaryReceipt.teacherId)?.fullName || 'N/A'}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500">ID: {selectedSalaryReceipt.teacherId}</p>
                    </div>
                    <div className="p-3 sm:p-0 bg-slate-50 sm:bg-transparent rounded-xl sm:text-right">
                      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment Date</p>
                      <p className="font-bold text-slate-900 text-sm sm:text-base">{selectedSalaryReceipt.date}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500">Month: {selectedSalaryReceipt.month}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</span>
                      <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                      <span className="font-bold text-slate-700 text-xs sm:text-sm">Staff Monthly Salary</span>
                      <span className="font-black text-slate-900 text-sm sm:text-base">₹{selectedSalaryReceipt.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 mb-4">
                      <span className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-widest">Amount in this Receipt</span>
                      <span className="text-lg sm:text-xl font-black text-amber-600">₹{selectedSalaryReceipt.amount.toLocaleString()}</span>
                    </div>

                    {(() => {
                      const teacher = teachers.find(t => t.id === selectedSalaryReceipt.teacherId);
                      const totalSalary = teacher?.salaryAmount || 0;
                      const monthRecords = salaryRecords.filter(r => r.teacherId === selectedSalaryReceipt.teacherId && r.month === selectedSalaryReceipt.month);
                      const totalPaidInMonth = monthRecords.reduce((sum, r) => sum + r.amount, 0);
                      const balance = totalSalary - totalPaidInMonth;

                      return (
                        <div className="border-t border-slate-200 pt-4 mt-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Monthly Salary</span>
                            <span className="text-[10px] sm:text-xs font-bold text-slate-600">₹{totalSalary.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Paid for {selectedSalaryReceipt.month}</span>
                            <span className="text-[10px] sm:text-xs font-bold text-slate-600">₹{totalPaidInMonth.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 px-3 bg-white rounded-xl border border-slate-100">
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-900 uppercase tracking-widest">Status</span>
                            {balance <= 0 ? (
                              <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase">Complete payment for this month has been made.</span>
                            ) : (
                              <div className="text-right">
                                <span className="text-[9px] sm:text-[10px] font-black text-red-500 uppercase tracking-widest block">Remaining Balance</span>
                                <span className="text-xs sm:text-sm font-black text-red-600">₹{balance.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 sm:gap-0">
                    <div className="text-center sm:text-left">
                      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment Mode</p>
                      <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                        {selectedSalaryReceipt.mode}
                      </span>
                    </div>
                    <div className="text-center">
                      <div className="w-32 h-px bg-slate-200 mb-2 mx-auto"></div>
                      <p className="text-[10px] sm:text-xs font-black text-slate-800 uppercase tracking-widest">{settings.authorizedSignature}</p>
                      <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Authorized Signature</p>
                    </div>
                  </div>

                  <div className="mt-8 sm:mt-12 text-center">
                    <p className="text-[8px] sm:text-[10px] text-slate-400 font-medium">This is a computer-generated salary receipt and does not require a physical signature.</p>
                    <p className="text-[9px] sm:text-[10px] text-amber-600 font-black uppercase mt-1">Authorized Document</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
};

export default FinanceManager;
