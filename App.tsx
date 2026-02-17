
import React, { useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { StoreProvider, useStore } from './store/StoreContext';
import { UserRole, User } from './types';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import StudentList from './pages/Students/StudentList';
import TeacherList from './pages/Teachers/TeacherList';
import AttendanceManager from './pages/Attendance/AttendanceManager';
import FinanceManager from './pages/Finance/FinanceManager';
import CourseManager from './pages/Courses/CourseManager';
import AdmissionsList from './pages/Admissions/AdmissionsList';
import Settings from './pages/Settings/Settings';

const { HashRouter, Routes, Route, Navigate } = ReactRouterDOM;

const HifzProgress = () => (
  <div className="p-12 text-center bg-white rounded-[3rem] border border-slate-100">
    <h2 className="text-2xl font-black text-slate-900">Hifz Al-Quran Tracker</h2>
    <p className="text-slate-500 mt-2">Log daily memorization and revision (Sabaq, Sabqi, Manzil).</p>
    <div className="mt-8 text-emerald-600 font-bold">Coming Soon...</div>
  </div>
);

const SubstituteWizard: React.FC<{ onFinish: (user: User) => void, onBack: () => void }> = ({ onFinish, onBack }) => {
  const { teachers, courses } = useStore();
  const [step, setStep] = useState(1);
  const [nameOption, setNameOption] = useState<'select' | 'manual'>('select');
  const [selectedName, setSelectedName] = useState('');
  const [manualName, setManualName] = useState('');
  const [subForTeacherId, setSubForTeacherId] = useState('');

  const handleFinish = () => {
    const finalName = nameOption === 'select' ? selectedName : manualName;
    if (!finalName || !subForTeacherId) return;

    onFinish({
      id: `SUB-${Date.now()}`,
      name: `${finalName} (Substitute)`,
      email: 'sub@bismillashah.com',
      role: UserRole.SUBSTITUTE,
      substituteForId: subForTeacherId,
      avatar: `https://ui-avatars.com/api/?name=${finalName}&background=475569&color=fff`
    });
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#f0f9f6] p-4">
      <div className="bg-white p-6 lg:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border-t-8 border-slate-600">
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:underline">
            ← Cancel
          </button>
          <img src="/images/Bismilla Shah Madrasa Logo.png" className="w-32 h-32 object-contain" alt="Logo" />
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Step 1: Your Identity</h2>
              <p className="text-slate-400 text-xs mt-1">Select your name or enter it manually.</p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-50 rounded-xl">
                <button
                  onClick={() => setNameOption('select')}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${nameOption === 'select' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                >
                  Select Existing
                </button>
                <button
                  onClick={() => setNameOption('manual')}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${nameOption === 'manual' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                >
                  Manual Entry
                </button>
              </div>

              {nameOption === 'select' ? (
                <select
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-medium"
                  value={selectedName}
                  onChange={(e) => setSelectedName(e.target.value)}
                >
                  <option value="">Select your name...</option>
                  {teachers.map(t => <option key={t.id} value={t.fullName}>{t.fullName}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Type your full name..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-medium"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              )}
            </div>

            <button
              disabled={!(selectedName || manualName)}
              onClick={() => setStep(2)}
              className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Step 2: Assignment</h2>
              <p className="text-slate-400 text-xs mt-1">On behalf of which teacher are you taking the class?</p>
            </div>

            <select
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-medium"
              value={subForTeacherId}
              onChange={(e) => setSubForTeacherId(e.target.value)}
            >
              <option value="">Select Ustadh...</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs"
              >
                Back
              </button>
              <button
                disabled={!subForTeacherId}
                onClick={handleFinish}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-100"
              >
                Enter Portal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const LoginScreen: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [portal, setPortal] = useState<'selection' | 'admin' | 'teacher' | 'substitute'>('selection');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('https://madrasa.quantumautomationssuite.com/backend/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password })
      });

      const result = await response.json();

      if (result.success && result.user) {
        onLogin(result.user);
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch (e) {
      setError('Connection failed. Please check your internet.');
    } finally {
      setIsLoading(false);
    }
  };

  if (portal === 'substitute') {
    return <SubstituteWizard onFinish={onLogin} onBack={() => setPortal('selection')} />;
  }

  if (portal === 'selection') {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f0f9f6] p-4">
        <div className="bg-white p-6 lg:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md text-center border-t-8 border-emerald-600">
          <img src="/images/Bismilla Shah Madrasa Logo.png" className="w-40 h-40 lg:w-48 lg:h-48 mx-auto flex items-center justify-center mb-6 object-contain" alt="Logo" />
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Bismilla Shah Madrasa</h1>
          <p className="text-slate-500 mb-8 text-sm">Select your portal to continue.</p>

          <div className="space-y-4">
            <button
              onClick={() => { setPortal('admin'); setError(''); }}
              className="w-full p-5 rounded-2xl border-2 border-slate-50 bg-slate-50 hover:border-emerald-600 hover:bg-emerald-50 transition-all text-left flex items-center justify-between group"
            >
              <div>
                <p className="font-black text-slate-900 group-hover:text-emerald-700">Admin Portal</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Access & Management</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-300 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                →
              </div>
            </button>

            <button
              onClick={() => { setPortal('teacher'); setError(''); }}
              className="w-full p-5 rounded-2xl border-2 border-slate-50 bg-slate-50 hover:border-amber-600 hover:bg-amber-50 transition-all text-left flex items-center justify-between group"
            >
              <div>
                <p className="font-black text-slate-900 group-hover:text-amber-700">Ustadh Portal</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendance & Students</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-300 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm">
                →
              </div>
            </button>

            <button
              onClick={() => { setPortal('substitute'); setError(''); }}
              className="w-full p-5 rounded-2xl border-2 border-slate-50 bg-slate-50 hover:border-slate-600 hover:bg-slate-100 transition-all text-left flex items-center justify-between group"
            >
              <div>
                <p className="font-black text-slate-900 group-hover:text-slate-700">Substitute Teacher</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Temporary Attendance Entry</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-300 group-hover:bg-slate-800 group-hover:text-white transition-all shadow-sm">
                →
              </div>
            </button>
          </div>

          <p className="mt-12 text-[10px] text-slate-300 font-bold uppercase tracking-widest">v1.4.0 • Build 2025</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-[#f0f9f6] p-4">
      <div className="bg-white p-6 lg:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border-t-8 border-emerald-600">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => setPortal('selection')} className="text-emerald-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:underline">
            ← Switch Portal
          </button>
          <img src="/images/Bismilla Shah Madrasa Logo.png" className="w-32 h-32 object-contain" alt="Logo" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
          {portal === 'admin' ? 'Mudir Sign-in' : 'Ustadh Sign-in'}
        </h2>
        <p className="text-slate-500 mb-8 text-sm">Enter your credentials below.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Login ID</label>
            <input
              required
              type="text"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-medium"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Password</label>
            <input
              required
              type="password"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-medium"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-100 hover:scale-[1.02] transition-transform mt-4 disabled:opacity-50"
          >
            {isLoading ? 'Authenticating...' : 'Authenticate Portal'}
          </button>
        </form>
      </div>
    </div>
  );
};

const MainApp: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => {
  const { isLoading } = useStore();

  return (
    <HashRouter>
      <div className="relative h-screen overflow-hidden">
        {/* Immediate Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/20 backdrop-blur-[2px] transition-all">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center border border-slate-100 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">Processing</h2>
              <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest">Syncing with Server...</p>
            </div>
          </div>
        )}

        <Layout
          userRole={user.role}
          userName={user.name}
          onLogout={onLogout}
        >
          <Routes>
            <Route path="/" element={<Dashboard role={user.role} teacherId={user.teacherId || user.substituteForId} />} />
            <Route path="/students" element={<StudentList userRole={user.role} teacherId={user.teacherId || user.substituteForId} />} />
            <Route path="/teachers" element={<TeacherList userRole={user.role} teacherId={user.teacherId || user.substituteForId} />} />
            <Route path="/attendance" element={<AttendanceManager userRole={user.role} teacherId={user.teacherId || user.substituteForId} />} />
            <Route path="/finance" element={<FinanceManager userRole={user.role} teacherId={user.teacherId || user.substituteForId} />} />
            <Route path="/courses" element={<CourseManager userRole={user.role} teacherId={user.teacherId || user.substituteForId} />} />
            <Route path="/admissions" element={<AdmissionsList userRole={user.role} teacherId={user.teacherId || user.substituteForId} />} />
            <Route path="/performance" element={<HifzProgress />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </div>
    </HashRouter>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (userData: User) => {
    window.location.hash = '#/';
    setUser(userData);
  };

  const handleLogout = () => {
    window.location.hash = '#/';
    setUser(null);
  };

  return (
    <StoreProvider>
      {user ? (
        <MainApp user={user} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </StoreProvider>
  );
};

export default App;
