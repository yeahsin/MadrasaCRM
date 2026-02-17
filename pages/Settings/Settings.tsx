
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/StoreContext';
import { SystemSettings } from '../../types';
import { ICONS } from '../../constants';

const Settings: React.FC = () => {
    const { settings, updateSettings } = useStore();
    const [formData, setFormData] = useState<SystemSettings>(settings);
    const [isDirty, setIsDirty] = useState(false);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);

    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setIsDirty(true);
        setShowSaveSuccess(false);
    };

    const handleSave = () => {
        updateSettings(formData);
        setIsDirty(false);
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 3000);
    };

    // Prevent accidental navigation
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Settings</h1>
                    <p className="text-slate-500 mt-2">Manage institution details and system-wide configurations.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={!isDirty}
                    className={`px-8 py-3 rounded-xl font-bold uppercase tracking-wide transition-all shadow-lg flex items-center gap-2
            ${isDirty
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 shadow-emerald-200'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                >
                    {ICONS.CheckCircle2}
                    Save Changes
                </button>
            </div>

            {showSaveSuccess && (
                <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl border border-emerald-100 flex items-center gap-2 animate-in slide-in-from-top-2">
                    {ICONS.CheckCircle2}
                    <span className="font-bold">Settings saved successfully!</span>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Institution Profile */}
                <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                            {ICONS.Talaba}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">Institution Profile</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">General Information</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Institution Name</label>
                            <input
                                type="text"
                                name="institutionName"
                                value={formData.institutionName}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Phone</label>
                                <input
                                    type="text"
                                    name="contactPhone"
                                    value={formData.contactPhone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
                                <input
                                    type="email"
                                    name="contactEmail"
                                    value={formData.contactEmail}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-600"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Address</label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-600 resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Finance Configuration */}
                <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                            {ICONS.Finance}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">Finance Configuration</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Receipts & Payments</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                            <div className="flex gap-3">
                                <div className="text-amber-500 mt-1">{ICONS.CheckCircle2}</div>
                                <div>
                                    <h4 className="font-bold text-amber-800 text-sm">Authorized Signature</h4>
                                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                        The name entered below will be automatically generated on all Fee Receipts and Salary Slips as the authorized signatory.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Authorized Signatory Name</label>
                            <input
                                type="text"
                                name="authorizedSignature"
                                value={formData.authorizedSignature}
                                onChange={handleChange}
                                placeholder="e.g. Mudir Name"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Currency</label>
                                <input
                                    type="text"
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Academic Year</label>
                                <input
                                    type="text"
                                    name="academicYear"
                                    value={formData.academicYear}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-600"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Info (Read Only for now) */}
                <div className="bg-slate-50 rounded-[2rem] border border-slate-200 p-8 shadow-inner col-span-1 lg:col-span-2 opacity-75">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center">
                            {ICONS.Settings}
                        </div>
                        <div>
                            <h3 className="font-bold text-md text-slate-700">System Defaults</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Timezone & Locale</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Timezone</label>
                            <div className="font-bold text-slate-600">{formData.timezone}</div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Version</label>
                            <div className="font-bold text-slate-600">v1.4.0 (Build 2025)</div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Database Status</label>
                            <div className="font-bold text-emerald-600 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Connected
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Settings;
