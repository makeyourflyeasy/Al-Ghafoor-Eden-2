
import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { User, Role, Flat, DuesStatus, Notification } from '../types';
import { 
    BuildingIcon, DashboardIcon, UsersIcon, FinanceIcon, NoticeIcon, 
    MessageIcon, LedgerIcon, LibraryIcon, BellIcon, MenuIcon, 
    LogoutIcon, XCircleIcon, CameraIcon, CheckCircleIcon 
} from './Icons';

// Import Sub-pages
import DashboardHomePage from './dashboard/DashboardHomePage';
import FinancePage from './dashboard/FinancePage';
import LedgerPage from './dashboard/LedgerPage';
import StaffLedgerPage from './dashboard/StaffLedgerPage';
import UnionCommitteePage from './dashboard/UnionCommitteePage';
import NoticesPage from './dashboard/NoticesPage';
import ContactsPage from './dashboard/ContactsPage';
import SettingsPage from './dashboard/SettingsPage';
import TenantsPage from './dashboard/TenantsPage';
import UsersAndFlatsPage from './dashboard/UsersAndFlatsPage';
import TenantDashboard from './dashboard/TenantDashboard';

// --- HELPERS ---

export const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const getDuesSummary = (flat: Flat) => {
    if (!flat || !flat.dues) return { totalPending: 0, pendingMonths: 0, advanceBalance: flat.advanceBalance || 0 };
    const pendingDues = flat.dues.filter(d => d.status === DuesStatus.Pending || d.status === DuesStatus.Partial);
    const totalPending = pendingDues.reduce((sum, due) => sum + (due.amount - due.paidAmount), 0);
    const pendingMonths = pendingDues.filter(d => d.description === 'Maintenance' && d.status !== DuesStatus.Paid).length;
    return { totalPending, pendingMonths, advanceBalance: flat.advanceBalance || 0 };
};

export const processFileForStorage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const base64ToFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

export const generateEntryPermissionPdf = (flat: Flat, name: string) => {
    // Correctly access jsPDF from the UMD namespace on window
    const { jsPDF } = window.jspdf || (window as any).jspdf || {};
    
    if (!jsPDF) { 
        alert("PDF Library not loaded. Please refresh the page."); 
        return; 
    }
    
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("AL GHAFOOR EDEN", 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text("ENTRY PERMISSION / MOVE-IN PASS", 105, 35, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.line(20, 45, 190, 45);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 160, 55, { align: 'right' });
    
    doc.text("To Security In-Charge,", 20, 65);
    doc.text("Al Ghafoor Eden.", 20, 72);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Subject: Permission to Move In for Flat ${flat.label}`, 20, 85);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`This is to certify that Mr./Ms. ${name} has cleared all necessary dues and charges.`, 20, 95);
    doc.text("They are hereby permitted to shift their luggage and household items into the building.", 20, 102);
    
    doc.setFont('helvetica', 'bold');
    doc.text("Authorized By:", 20, 130);
    doc.text("Union Committee", 20, 137);
    
    doc.save(`Entry_Permission_${flat.id}.pdf`);
};

export const generateNOCPdf = (user: User, flat: Flat) => {
    // Correctly access jsPDF from the UMD namespace on window
    const { jsPDF } = window.jspdf || (window as any).jspdf || {};
    
    if (!jsPDF) { 
        alert("PDF Library not loaded. Please refresh the page."); 
        return; 
    }
    
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("AL GHAFOOR EDEN", 105, 20, { align: 'center' });
    
    doc.setFontSize(18);
    doc.text("NO OBJECTION CERTIFICATE", 105, 40, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.line(20, 50, 190, 50);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 160, 60, { align: 'right' });
    
    doc.text("To Whom It May Concern,", 20, 70);
    
    const name = user.tenantName || user.ownerName;
    const cnic = user.id; // Using ID as proxy for CNIC if not available in top level
    
    doc.text(`This is to certify that Mr./Ms. ${name}, resident of Flat No. ${flat.label},`, 20, 85);
    doc.text("has cleared all maintenance dues and outstanding bills with the Union Committee.", 20, 92);
    
    doc.text("The administration has NO OBJECTION to their moving out/vacating the premises.", 20, 105);
    
    doc.setFont('helvetica', 'italic');
    doc.text("Note: This NOC is valid for 7 days from the date of issue.", 20, 120);
    
    doc.setFont('helvetica', 'bold');
    doc.text("Union Committee", 160, 150, { align: 'center' });
    doc.text("Al Ghafoor Eden", 160, 156, { align: 'center' });
    
    doc.save(`NOC_${flat.id}_${name}.pdf`);
};

// --- COMPONENTS ---

export const Card: React.FC<{ title?: string; children: React.ReactNode; className?: string; noPadding?: boolean; titleAction?: React.ReactNode }> = ({ title, children, className = '', noPadding = false, titleAction }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
        {title && (
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
                {titleAction && <div>{titleAction}</div>}
            </div>
        )}
        <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
);

export const Modal: React.FC<{ onClose: () => void; title: string; children: React.ReactNode; size?: 'md' | 'lg' | 'xl' | '4xl'; zIndexClass?: string }> = ({ onClose, title, children, size = 'md', zIndexClass = 'z-50' }) => {
    const sizeClasses = {
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '4xl': 'max-w-4xl'
    };
    return (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center ${zIndexClass} p-4 animate-fadeIn`}>
            <div className={`bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto transform transition-all`}>
                <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white z-10">
                    <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
};

export const PageHeader: React.FC<{ title: string; subtitle?: string; children?: React.ReactNode }> = ({ title, subtitle, children }) => (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
            <h1 className="text-2xl font-extrabold text-slate-800">{title}</h1>
            {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center space-x-3">
            {children}
        </div>
    </div>
);

export const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color?: 'blue' | 'green' | 'red' | 'amber' }> = ({ title, value, icon, color = 'blue' }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        red: 'bg-red-50 text-red-600',
        amber: 'bg-amber-50 text-amber-600',
    };
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center">
            <div className={`p-4 rounded-full mr-4 ${colorClasses[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-slate-500 text-sm font-medium">{title}</p>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
            </div>
        </div>
    );
};

export const NotificationCenter: React.FC<{ currentUser: User, onNotificationClick: (n: Notification) => void }> = ({ currentUser, onNotificationClick }) => {
    const { notifications } = useData();
    const [isOpen, setIsOpen] = useState(false);
    
    // Filter notifications for current user
    const myNotifications = notifications
        .filter(n => n.recipientId === currentUser.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
    const unreadCount = myNotifications.filter(n => !n.isRead).length;
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={notifRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-slate-500 hover:text-brand-600 rounded-full hover:bg-slate-100 transition-colors">
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 block h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                        {unreadCount}
                    </span>
                )}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[60]">
                    <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                        <h4 className="font-bold text-slate-800">Notifications</h4>
                        <span className="text-xs font-semibold text-slate-500">{unreadCount} Unread</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {myNotifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">No notifications</div>
                        ) : (
                            myNotifications.map(notif => (
                                <div 
                                    key={notif.id} 
                                    onClick={() => { onNotificationClick(notif); setIsOpen(false); }}
                                    className={`p-4 border-b hover:bg-slate-50 cursor-pointer transition-colors ${!notif.isRead ? 'bg-blue-50/50' : ''}`}
                                >
                                    <p className={`text-sm ${!notif.isRead ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{notif.message}</p>
                                    <p className="text-xs text-slate-400 mt-1">{formatDate(notif.date)}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const CameraScanModal: React.FC<{ onClose: () => void; onCapture: (file: File) => void }> = ({ onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(s => {
                setStream(s);
                if (videoRef.current) videoRef.current.srcObject = s;
            })
            .catch(err => console.error("Camera access denied:", err));
        
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, []);

    const handleCaptureClick = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                const file = base64ToFile(dataUrl, `capture_${Date.now()}.jpg`);
                onCapture(file);
                onClose();
            }
        }
    };

    return (
        <Modal onClose={onClose} title="Capture Image" size="lg" zIndexClass="z-[200]">
            <div className="p-4 bg-black flex flex-col items-center justify-center">
                <div className="relative w-full max-w-lg aspect-[4/3] bg-black rounded-lg overflow-hidden">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                </div>
                <div className="mt-4 flex space-x-4">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-700 text-white rounded-full font-bold">Cancel</button>
                    <button onClick={handleCaptureClick} className="px-6 py-2 bg-white text-black rounded-full font-bold flex items-center">
                        <CameraIcon className="w-5 h-5 mr-2" /> Capture
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// --- MAIN DASHBOARD COMPONENT ---

interface DashboardProps {
    currentUserId: string;
    onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUserId, onLogout }) => {
    const { users } = useData();
    const currentUser = users.find(u => u.id === currentUserId);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activePage, setActivePage] = useState('home');
    const [navigationParams, setNavigationParams] = useState<any>(null);
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    // Tenant logic separation
    if (currentUser?.residentType === 'Tenant') {
        return (
            <TenantDashboard 
                currentUser={currentUser} 
                onLogout={onLogout} 
                showToast={(msg) => setToast({ msg, type: 'success' })} 
                isSidebarOpen={sidebarOpen} 
                setSidebarOpen={setSidebarOpen} 
            />
        );
    }

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleNavigate = (page: string, params?: any) => {
        setActivePage(page);
        if (params) setNavigationParams(params);
        setSidebarOpen(false); // Close sidebar on mobile after navigation
    };

    const NavItem = ({ page, icon, label }: { page: string, icon: React.ReactNode, label: string }) => (
        <button
            onClick={() => handleNavigate(page)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activePage === page ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
        >
            <div className={`${activePage === page ? 'text-white' : 'text-slate-400'}`}>{icon}</div>
            <span className="font-semibold">{label}</span>
        </button>
    );

    const renderContent = () => {
        if (!currentUser) return null;

        switch (activePage) {
            case 'home': return <DashboardHomePage currentUser={currentUser} showToast={showToast} />;
            case 'users': return <UsersAndFlatsPage currentUser={currentUser} showToast={showToast} onNavigateToLedger={(flatId) => handleNavigate('ledger', { flatId, fromPage: 'users' })} />;
            case 'finance': return <FinancePage currentUser={currentUser} showToast={showToast} />;
            case 'ledger': return <LedgerPage currentUser={currentUser} initialParams={navigationParams} onBack={(page) => handleNavigate(page, { flatId: navigationParams?.flatId })} />;
            case 'staff-ledger': return <StaffLedgerPage currentUser={currentUser} showToast={showToast} onBack={() => handleNavigate('home')} />;
            case 'committee': return <UnionCommitteePage currentUser={currentUser} showToast={showToast} />;
            case 'notices': return <NoticesPage currentUser={currentUser} showToast={showToast} />;
            case 'contacts': return <ContactsPage currentUser={currentUser} showToast={showToast} />;
            case 'tenants': return <TenantsPage currentUser={currentUser} showToast={showToast} />;
            case 'settings': return <SettingsPage currentUser={currentUser} showToast={showToast} />;
            default: return <DashboardHomePage currentUser={currentUser} showToast={showToast} />;
        }
    };

    if (!currentUser) return <div>Loading User...</div>;

    const isAdmin = currentUser.role === Role.Admin;
    const isAccountant = currentUser.role === Role.Accountant || currentUser.role === Role.AccountsChecker;
    const isStaff = [Role.Guard, Role.Sweeper, Role.LiftMechanic].includes(currentUser.role);

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="h-20 flex items-center justify-center border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                        <BuildingIcon className="w-8 h-8 text-brand-500" />
                        <span className="text-xl font-bold tracking-wide">EDEN</span>
                    </div>
                </div>
                <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-5rem)]">
                    <NavItem page="home" icon={<DashboardIcon className="w-5 h-5" />} label="Dashboard" />
                    {(isAdmin || isAccountant) && <NavItem page="finance" icon={<FinanceIcon className="w-5 h-5" />} label="Finance" />}
                    {(isAdmin || isAccountant) && <NavItem page="ledger" icon={<LedgerIcon className="w-5 h-5" />} label="Building Ledger" />}
                    {(isAdmin || isAccountant) && <NavItem page="tenants" icon={<UsersIcon className="w-5 h-5" />} label="Tenants" />}
                    {(isAdmin || isAccountant) && <NavItem page="users" icon={<UsersIcon className="w-5 h-5" />} label="Users & Flats" />}
                    {isAdmin && <NavItem page="committee" icon={<UsersIcon className="w-5 h-5" />} label="Committee" />}
                    <NavItem page="notices" icon={<NoticeIcon className="w-5 h-5" />} label="Notices" />
                    <NavItem page="contacts" icon={<UsersIcon className="w-5 h-5" />} label="Contacts" />
                    {(isStaff || isAccountant) && <NavItem page="staff-ledger" icon={<LedgerIcon className="w-5 h-5" />} label="My Ledger" />}
                    {currentUser.role === Role.Resident && <NavItem page="ledger" icon={<LedgerIcon className="w-5 h-5" />} label="My Ledger" />}
                    {isAdmin && <div className="pt-4 mt-4 border-t border-slate-800"><NavItem page="settings" icon={<LibraryIcon className="w-5 h-5" />} label="Settings" /></div>}
                </nav>
            </aside>

            {/* Overlay for mobile sidebar */}
            {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setSidebarOpen(false)}></div>}

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen transition-all duration-300 w-full">
                {/* Header */}
                <header className="h-20 bg-white shadow-sm flex items-center justify-between px-6 sticky top-0 z-20">
                    <div className="flex items-center">
                        <button onClick={() => setSidebarOpen(true)} className="md:hidden mr-4 text-slate-500">
                            <MenuIcon className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800 hidden sm:block">
                            {activePage.charAt(0).toUpperCase() + activePage.slice(1).replace('-', ' ')}
                        </h2>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-800">{currentUser.ownerName}</p>
                            <p className="text-xs text-slate-500">{currentUser.role}</p>
                        </div>
                        <NotificationCenter currentUser={currentUser} onNotificationClick={(n) => {
                            if (n.payload?.expenseId) handleNavigate('finance');
                            else if (n.payload?.tenantTransactionId) handleNavigate('tenants');
                            // Add more navigation logic based on notification type
                        }} />
                        <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-full transition-colors" title="Logout">
                            <LogoutIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6 overflow-x-hidden">
                    {renderContent()}
                </div>
            </main>

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-lg shadow-2xl text-white font-semibold z-50 animate-bounce ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
