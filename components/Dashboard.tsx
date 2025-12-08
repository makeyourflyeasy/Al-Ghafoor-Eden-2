
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { User, Flat, Payment, Expense, Notice, Message, Role, Dues, DuesStatus, Notification, Task, Inquiry, TenantTransaction, PersonalBudgetEntry, RecurringExpense, Contact, DeletedItem, Loan, CashTransfer } from '../types';
import {
  BuildingIcon, UserIcon, LogoutIcon, DashboardIcon, UsersIcon, UsersGroupIcon,
  FinanceIcon, NoticeIcon, MessageIcon, LedgerIcon, BellIcon,
  CheckCircleIcon, XCircleIcon, ExclamationCircleIcon, PrintIcon, DownloadIcon, PaperAirplaneIcon, PlusCircleIcon, CashIcon, PhoneIcon, PencilIcon, TrashIcon, MenuIcon, SparklesIcon, IdentificationIcon, DocumentTextIcon, CameraIcon, ReceiptTaxIcon, ArrowLeftIcon, WhatsAppIcon, KeyIcon, ClockIcon, ClipboardListIcon, ShieldCheckIcon, DatabaseIcon, CloudArrowDownIcon, CloudArrowUpIcon, SettingsIcon
} from './Icons';
import { useData } from '../context/DataContext';
import DashboardHomePage from './dashboard/DashboardHomePage';
import UsersAndFlatsPage from './dashboard/UsersAndFlatsPage';
import FinancePage from './dashboard/FinancePage';
import UnionCommitteePage from './dashboard/UnionCommitteePage';
import NoticesPage from './dashboard/NoticesPage';
import ContactsPage from './dashboard/ContactsPage';
import LedgerPage from './dashboard/LedgerPage';
import StaffLedgerPage from './dashboard/StaffLedgerPage';
import TenantDashboard from './dashboard/TenantDashboard';
import TenantsPage from './dashboard/TenantsPage';
import SettingsPage from './dashboard/SettingsPage';
import { GoogleGenAI, Type } from "@google/genai";

declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

// --- Helper Functions ---
export const formatCurrency = (amount: number) => `PKR ${amount.toLocaleString()}`;
export const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// Enhanced File Processor: Compresses Images to save LocalStorage space
export const processFileForStorage = (file: File, maxWidth = 800, quality = 0.6): Promise<string> => {
    return new Promise((resolve, reject) => {
        // If it's not an image (e.g. PDF), return standard base64
        if (!file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    // Compress to JPEG with reduced quality
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                } else {
                    reject(new Error("Canvas context failed"));
                }
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = error => reject(error);
    });
};

// Deprecated: kept for backward compatibility if needed, but redirects to processor
export const fileToBase64 = (file: File): Promise<string> => {
    return processFileForStorage(file);
};

export const base64ToFile = (base64: string, filename: string): File => {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
};
export const getDuesSummary = (flat: Flat) => {
    if (!flat || !flat.dues) return { totalPending: 0, pendingMonths: 0 };
    const pendingDues = flat.dues.filter(d => d.status === DuesStatus.Pending || d.status === DuesStatus.Partial);
    const totalPending = pendingDues.reduce((sum, due) => sum + (due.amount - due.paidAmount), 0);
    const pendingMonths = pendingDues.filter(d => d.description === 'Maintenance' && d.status !== DuesStatus.Paid).length;
    return { totalPending, pendingMonths };
};

export const generateNOCPdf = (user: User, flat: Flat) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("AL GHAFOOR EDEN", 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text("Plot No. 1/28, Block A Block 1 Nazimabad", 105, 26, { align: 'center' });
    doc.text("Karachi, 74600, Pakistan", 105, 31, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.setDrawColor(30, 41, 59);
    doc.line(20, 40, 190, 40);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("NO OBJECTION CERTIFICATE (NOC)", 105, 55, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 160, 70, { align: 'right' });

    doc.text("To Whom It May Concern,", 20, 80);

    const body = `This is to certify that Mr./Ms. ${user.tenantName || user.ownerName} (User ID: ${user.id}), resident of Flat No. ${flat.label}, has cleared all dues and liabilities with the building management.

The Union Committee of Al Ghafoor Eden has NO OBJECTION to them vacating the building.

We wish them the best in their future endeavors.`;

    const splitText = doc.splitTextToSize(body, 170);
    doc.text(splitText, 20, 95);

    doc.setFont('helvetica', 'bold');
    doc.text("Status: CLEARED & APPROVED", 20, 150);
    
    // Stamp area
    doc.setDrawColor(150);
    doc.rect(130, 160, 50, 20);
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Union Stamp", 155, 172, { align: 'center' });

    doc.setTextColor(0);
    doc.text("__________________________", 20, 200);
    doc.text("President / Administrator", 20, 206);

    doc.save(`NOC_${flat.id}_${user.id}.pdf`);
};

export const generateEntryPermissionPdf = (flat: Flat, residentName: string) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74); // Green color
    doc.text("ENTRY PERMISSION / MOVE-IN PASS", 105, 25, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("AL GHAFOOR EDEN", 105, 35, { align: 'center' });
    
    doc.setLineWidth(1);
    doc.setDrawColor(22, 163, 74);
    doc.line(20, 42, 190, 42);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    doc.text("To: Security In-Charge", 20, 60);
    
    doc.text("Please allow entry for moving in to the following property:", 20, 70);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Flat No: ${flat.label}`, 20, 85);
    doc.text(`Resident Name: ${residentName}`, 20, 95);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text("This pass is generated after verifying that all previous building dues for this unit", 20, 110);
    doc.text("have been successfully cleared.", 20, 116);

    doc.setFontSize(16);
    doc.setTextColor(22, 163, 74);
    doc.setFont('helvetica', 'bold');
    doc.text("ACCESS GRANTED", 105, 140, { align: 'center' });
    
    doc.setDrawColor(0);
    doc.rect(75, 130, 60, 15); // Box around access granted

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'italic');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 250);
    doc.text("Note: This document is mandatory for gate entry of household goods.", 20, 255);

    doc.save(`EntryPass_${flat.id}.pdf`);
};


// --- Reusable Components (Premium & Responsive) ---

export const Modal: React.FC<{ children: React.ReactNode, onClose: () => void, title: string, size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl', zIndexClass?: string }> = ({ children, onClose, title, size = '2xl', zIndexClass = 'z-[100]' }) => (
    <div className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center ${zIndexClass} p-4 animate-fadeIn`}>
        <div className={`bg-white rounded-xl shadow-2xl w-full max-w-${size} transform transition-all flex flex-col max-h-[90vh]`}>
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white rounded-t-xl flex-shrink-0">
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{title}</h3>
                <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors focus:outline-none">
                    <XCircleIcon className="w-7 h-7" />
                </button>
            </div>
            <div className="overflow-y-auto p-0 custom-scrollbar">
                {children}
            </div>
        </div>
    </div>
);

export const CameraScanModal: React.FC<{ onClose: () => void; onCapture: (file: File) => void }> = ({ onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [image, setImage] = useState<string | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                setStream(s);
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                alert("Could not access camera.");
                onClose();
            }
        };
        startCamera();
        return () => {
            stream?.getTracks().forEach(t => t.stop());
        };
    }, []);

    const handleCapture = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Compress
            setImage(dataUrl);
        }
    };

    const handleRetake = () => {
        setImage(null);
    };

    const handleSavePdf = () => {
        if (image) {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            const imgProps = pdf.getImageProperties(image);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(image, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            const pdfBase64 = pdf.output('datauristring');
            const file = base64ToFile(pdfBase64, `scan_${Date.now()}.pdf`);
            onCapture(file);
            onClose();
        }
    };

    return (
        <Modal onClose={onClose} title="Camera Scan (AI)" size="lg" zIndexClass="z-[200]">
            <div className="p-4 flex flex-col items-center space-y-4">
                {image ? (
                    <img src={image} alt="Captured" className="w-full h-auto max-h-[60vh] object-contain rounded-lg border-4 border-slate-200" />
                ) : (
                    <div className="relative w-full max-h-[60vh] bg-black rounded-lg overflow-hidden">
                         <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    </div>
                )}
                
                <div className="flex space-x-4">
                    {!image ? (
                        <button onClick={handleCapture} className="px-6 py-3 bg-brand-600 text-white rounded-full font-bold shadow-lg hover:bg-brand-700 flex items-center">
                            <CameraIcon className="w-6 h-6 mr-2" /> Capture
                        </button>
                    ) : (
                        <>
                            <button onClick={handleRetake} className="px-4 py-2 bg-slate-500 text-white rounded-lg font-semibold hover:bg-slate-600">Retake</button>
                            <button onClick={handleSavePdf} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold shadow-md hover:bg-green-700 flex items-center">
                                <DocumentTextIcon className="w-5 h-5 mr-2" /> Save as PDF Scan
                            </button>
                        </>
                    )}
                </div>
                <p className="text-xs text-slate-500">AI processing will convert your capture into a PDF document.</p>
            </div>
        </Modal>
    );
};

export const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode, subtext?: string, onClick?: () => void, color?: string }> = React.memo(({ title, value, icon, subtext, onClick, color = 'brand' }) => {
    const colorClasses: { [key: string]: string } = {
        brand: 'bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white',
        green: 'bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white',
        red: 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white',
        amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white',
        blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    };
    
    return (
        <div onClick={onClick} className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center h-full transition-all duration-300 group ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : ''}`}>
            <div className={`p-4 rounded-2xl mr-5 transition-colors duration-300 ${colorClasses[color]}`}>{icon}</div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
                <p className="text-2xl font-black text-slate-800 tracking-tight">{value}</p>
                {subtext && <p className="text-xs text-slate-500 font-medium mt-1">{subtext}</p>}
            </div>
        </div>
    );
});

export const PageHeader: React.FC<{ title: string, subtitle?: string, children?: React.ReactNode }> = ({ title, subtitle, children }) => (
    <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 animate-fadeIn">
        <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
            {subtitle && <p className="text-slate-500 mt-1 text-lg font-medium">{subtitle}</p>}
        </div>
        {children && <div className="flex-shrink-0 flex flex-wrap gap-3 w-full lg:w-auto">{children}</div>}
    </div>
);

export const Card: React.FC<{ children: React.ReactNode, title?: string, className?: string, titleAction?: React.ReactNode, noPadding?: boolean }> = ({ children, title, className = '', titleAction, noPadding = false }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden ${className}`}>
        {title && (
            <div className="flex justify-between items-center border-b border-slate-100 p-5 bg-gradient-to-r from-slate-50/50 to-transparent">
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                {titleAction}
            </div>
        )}
        <div className={!noPadding ? "p-5 sm:p-6" : ""}>
            {children}
        </div>
    </div>
);

export const NotificationCenter: React.FC<{ currentUser: User, onNotificationClick: (n: Notification) => void }> = ({ currentUser, onNotificationClick }) => {
    const { notifications } = useData();
    const [isOpen, setIsOpen] = useState(false);
    const userNotifications = useMemo(() => notifications.filter(n => n.recipientId === currentUser.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [notifications, currentUser.id]);
    const unreadCount = userNotifications.filter(n => !n.isRead).length;

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full focus:outline-none">
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white transform translate-x-1/4 -translate-y-1/4 animate-pulse"></span>
                )}
            </button>
            
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-30 cursor-default" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl z-40 overflow-hidden border border-slate-200 animate-fadeIn">
                        <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-700">Notifications</h3>
                            {unreadCount > 0 && <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} New</span>}
                        </div>
                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                            {userNotifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">No notifications yet.</div>
                            ) : (
                                userNotifications.map(n => (
                                    <div 
                                        key={n.id} 
                                        onClick={() => { onNotificationClick(n); setIsOpen(false); }}
                                        className={`p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <p className={`text-sm ${!n.isRead ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{n.message}</p>
                                        <p className="text-xs text-slate-400 mt-1">{formatDate(n.date)}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const SidebarLink: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed?: boolean }> = ({ icon, label, active, onClick, collapsed }) => (
    <button 
        onClick={onClick} 
        className={`flex items-center w-full p-3 rounded-xl transition-all duration-200 group mb-1 ${active ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' : 'text-slate-500 hover:bg-slate-100 hover:text-brand-600'}`}
    >
        <div className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-brand-600'}`}>
            {icon}
        </div>
        {!collapsed && <span className={`ml-3 font-medium text-sm ${collapsed ? 'hidden' : 'block'}`}>{label}</span>}
    </button>
);

const Toast: React.FC<{ message: string, type: 'success' | 'error', onClose: () => void }> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-6 right-6 z-[200] px-6 py-4 rounded-lg shadow-2xl flex items-center animate-slideIn ${type === 'success' ? 'bg-slate-800 text-white' : 'bg-red-500 text-white'}`}>
            {type === 'success' ? <CheckCircleIcon className="w-6 h-6 mr-3" /> : <ExclamationCircleIcon className="w-6 h-6 mr-3" />}
            <span className="font-medium">{message}</span>
        </div>
    );
};

const Dashboard: React.FC<{ currentUserId: string; onLogout: () => void }> = ({ currentUserId, onLogout }) => {
    const { users } = useData();
    const currentUser = users.find(u => u.id === currentUserId);
    const [activePage, setActivePage] = useState('home');
    const [isSidebarOpen, setSidebarOpen] = useState(true); // Desktop default
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
    const [navigationParams, setNavigationParams] = useState<any>(null);

    const showToast = (msg: string, type: 'success'|'error' = 'success') => setToast({msg, type});

    if (!currentUser) return <div>Error: User not found</div>;

    // If Tenant, Render Separate Dashboard Layout
    if (currentUser.role === Role.Resident && currentUser.residentType === 'Tenant') {
        return <TenantDashboard currentUser={currentUser} onLogout={onLogout} showToast={showToast} isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />;
    }

    const menuItems = [
        { id: 'home', label: 'Dashboard', icon: <DashboardIcon className="w-5 h-5" />, roles: [Role.Admin, Role.Accountant, Role.AccountsChecker, Role.Resident, Role.Guard] },
        { id: 'users', label: 'Users & Flats', icon: <UsersIcon className="w-5 h-5" />, roles: [Role.Admin, Role.Accountant] },
        { id: 'tenants', label: 'Tenants', icon: <UsersGroupIcon className="w-5 h-5" />, roles: [Role.Admin, Role.Accountant, Role.AccountsChecker] },
        { id: 'finance', label: 'Finance', icon: <FinanceIcon className="w-5 h-5" />, roles: [Role.Admin, Role.Accountant, Role.AccountsChecker] },
        { id: 'ledger', label: 'Ledgers', icon: <LedgerIcon className="w-5 h-5" />, roles: [Role.Admin, Role.Accountant, Role.AccountsChecker, Role.Resident] },
        { id: 'staff-ledger', label: 'My Ledger', icon: <LedgerIcon className="w-5 h-5" />, roles: [Role.Guard, Role.Sweeper] },
        { id: 'committee', label: 'Union Committee', icon: <UsersGroupIcon className="w-5 h-5" />, roles: [Role.Admin] },
        { id: 'notices', label: 'Notices', icon: <NoticeIcon className="w-5 h-5" />, roles: [Role.Admin, Role.Accountant, Role.AccountsChecker, Role.Resident, Role.Guard] },
        { id: 'contacts', label: 'Contacts', icon: <PhoneIcon className="w-5 h-5" />, roles: [Role.Admin, Role.Accountant, Role.AccountsChecker, Role.Resident, Role.Guard, Role.Sweeper] },
        { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" />, roles: [Role.Admin] },
    ];

    const filteredMenuItems = menuItems.filter(item => item.roles.includes(currentUser.role));

    const handleNavigate = (pageId: string, params: any = null) => {
        setNavigationParams(params);
        setActivePage(pageId);
        setMobileMenuOpen(false);
    };

    const renderPage = () => {
        switch (activePage) {
            case 'home': return <DashboardHomePage currentUser={currentUser} showToast={showToast} />;
            case 'users': return <UsersAndFlatsPage currentUser={currentUser} showToast={showToast} onNavigateToLedger={(flatId) => handleNavigate('ledger', { flatId, fromPage: 'users' })} initialOpenFlatId={navigationParams?.flatId} />;
            case 'tenants': return <TenantsPage currentUser={currentUser} showToast={showToast} />;
            case 'finance': return <FinancePage currentUser={currentUser} showToast={showToast} />;
            case 'ledger': return <LedgerPage currentUser={currentUser} initialParams={navigationParams} onBack={(page) => handleNavigate(page, { flatId: navigationParams?.flatId })} />;
            case 'staff-ledger': return <StaffLedgerPage currentUser={currentUser} onBack={() => handleNavigate('home')} />;
            case 'committee': return <UnionCommitteePage currentUser={currentUser} showToast={showToast} />;
            case 'notices': return <NoticesPage currentUser={currentUser} showToast={showToast} />;
            case 'contacts': return <ContactsPage currentUser={currentUser} showToast={showToast} />;
            case 'settings': return <SettingsPage currentUser={currentUser} showToast={showToast} />;
            default: return <DashboardHomePage currentUser={currentUser} showToast={showToast} />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            
            {/* Sidebar - Desktop */}
            <aside className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                <div className="p-5 flex items-center justify-center border-b border-slate-100">
                    <BuildingIcon className="w-8 h-8 text-brand-600" />
                    {isSidebarOpen && <span className="ml-3 font-extrabold text-xl text-slate-800 tracking-tight">Eden</span>}
                </div>
                
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                    {filteredMenuItems.map(item => (
                        <SidebarLink 
                            key={item.id} 
                            {...item} 
                            active={activePage === item.id} 
                            onClick={() => handleNavigate(item.id)} 
                            collapsed={!isSidebarOpen}
                        />
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="w-full flex justify-center p-2 text-slate-400 hover:text-brand-600 mb-2">
                        <MenuIcon className="w-5 h-5" />
                    </button>
                    <button onClick={onLogout} className={`flex items-center w-full p-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors ${!isSidebarOpen ? 'justify-center' : ''}`}>
                        <LogoutIcon className="w-5 h-5" />
                        {isSidebarOpen && <span className="ml-3 font-medium text-sm">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile Header & Menu Overlay */}
            <div className="md:hidden fixed w-full z-50 bg-white border-b border-slate-200 shadow-sm">
                <div className="flex justify-between items-center p-4">
                    <div className="flex items-center">
                        <BuildingIcon className="w-8 h-8 text-brand-600 mr-2" />
                        <span className="font-extrabold text-lg text-slate-800">Al Ghafoor Eden</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationCenter currentUser={currentUser} onNotificationClick={(n) => console.log(n)} />
                        <button onClick={() => setMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600 focus:outline-none">
                            {isMobileMenuOpen ? <XCircleIcon className="w-8 h-8" /> : <MenuIcon className="w-8 h-8" />}
                        </button>
                    </div>
                </div>
                {isMobileMenuOpen && (
                    <nav className="bg-white border-t border-slate-100 p-4 space-y-2 shadow-lg absolute w-full max-h-[80vh] overflow-y-auto">
                        {filteredMenuItems.map(item => (
                            <button 
                                key={item.id} 
                                onClick={() => handleNavigate(item.id)} 
                                className={`flex items-center w-full p-4 rounded-xl font-medium ${activePage === item.id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <div className="mr-4">{item.icon}</div>
                                {item.label}
                            </button>
                        ))}
                        <button onClick={onLogout} className="flex items-center w-full p-4 rounded-xl font-medium text-red-600 hover:bg-red-50 mt-4">
                            <div className="mr-4"><LogoutIcon className="w-5 h-5" /></div>
                            Logout
                        </button>
                    </nav>
                )}
            </div>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/50 pt-20 md:pt-0">
                {/* Desktop Header */}
                <header className="hidden md:flex justify-between items-center py-5 px-8 bg-white border-b border-slate-200 sticky top-0 z-20">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">
                            {menuItems.find(i => i.id === activePage)?.label}
                        </h1>
                    </div>
                    <div className="flex items-center space-x-6">
                        <NotificationCenter currentUser={currentUser} onNotificationClick={(n) => {
                            if (n.actionType === 'VACATE_REQUEST') {
                                // Navigate to relevant page if needed, or show modal
                                if (currentUser.role === Role.Admin) {
                                    handleNavigate('users', { flatId: n.payload?.tenantId?.replace(/tnt/i, '') });
                                }
                            }
                        }} />
                        <div className="flex items-center space-x-3 pl-6 border-l border-slate-200">
                            <div className="text-right hidden lg:block">
                                <p className="text-sm font-bold text-slate-800">{currentUser.ownerName}</p>
                                <p className="text-xs text-slate-500 font-medium">{currentUser.role}</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-brand-100 border-2 border-white shadow-sm flex items-center justify-center text-brand-600 font-bold overflow-hidden">
                                {currentUser.ownerPic ? <img src={currentUser.ownerPic} alt="Profile" className="h-full w-full object-cover" /> : currentUser.ownerName.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto">
                        {renderPage()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
