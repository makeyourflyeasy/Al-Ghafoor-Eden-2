
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import SplashScreen from './components/SplashScreen';
import { User, Flat, DuesStatus, Notification, Inquiry, Role } from './types';
import { BuildingIcon, UserIcon, SparklesIcon, XCircleIcon, HomeModernIcon, ArrowLeftIcon, CheckCircleIcon, KeyIcon, TagIcon, BuildingOfficeIcon, ExclamationCircleIcon, NoticeIcon } from './components/Icons';
import { useData } from './context/DataContext';

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const formatCurrency = (amount: number) => `PKR ${amount.toLocaleString()}`;

const getDuesSummary = (flat: Flat) => {
    if (!flat || !flat.dues) return { totalPending: 0, pendingMonths: 0, advanceBalance: flat?.advanceBalance || 0 };
    const pendingDues = flat.dues.filter(d => d.status === DuesStatus.Pending || d.status === DuesStatus.Partial);
    const totalPending = pendingDues.reduce((sum, due) => sum + (due.amount - due.paidAmount), 0);
    const pendingMonths = pendingDues.filter(d => d.description === 'Maintenance' && d.status !== DuesStatus.Paid).length;
    return { totalPending, pendingMonths, advanceBalance: flat.advanceBalance || 0 };
};


const PublicFlatCard: React.FC<{ flat: Flat; owner?: User; tenant?: User; onClick?: () => void; }> = React.memo(({ flat, owner, tenant, onClick }) => {
    const { totalPending, pendingMonths, advanceBalance } = getDuesSummary(flat);

    let borderColor = 'border-green-500';
    let duesText = 'Dues are clear';
    let duesTextColor = 'text-green-600';
    let occupancyText = 'Occupied';
    let occupancyBgColor = 'bg-green-100';
    let occupancyTextColor = 'text-green-800';
    
    if (flat.isVacant) {
        borderColor = 'border-blue-500';
        occupancyText = 'Vacant';
        occupancyBgColor = 'bg-blue-100';
        occupancyTextColor = 'text-blue-800';
        if (totalPending > 0) {
            duesText = `Dues Pending: ${formatCurrency(totalPending)}`;
            duesTextColor = 'text-amber-600';
        } else {
             duesText = 'No Dues';
             duesTextColor = 'text-slate-600';
        }
    } else {
        occupancyText = tenant ? 'Tenant Occupied' : 'Owner Occupied';

        if (totalPending > 0) {
            if (pendingMonths === 1) borderColor = 'border-amber-500';
            else if (pendingMonths >= 2) borderColor = 'border-red-500';
            duesText = `${pendingMonths} Month(s) Pending (${formatCurrency(totalPending)})`;
            duesTextColor = 'text-red-700';
        } else if (advanceBalance > 0) {
            duesText = `Advance Paid (${formatCurrency(advanceBalance)})`;
            duesTextColor = 'text-green-600';
        }
    }

    const interactiveClasses = onClick ? 'cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1' : '';

    return (
        <div onClick={onClick} className={`bg-white rounded-lg shadow-md border-l-8 ${borderColor} ${interactiveClasses} flex flex-col justify-between`}>
            <div className="p-4">
                <p className="font-extrabold text-2xl text-slate-800">{flat.label}</p>
                <p className={`text-sm font-semibold mt-2 ${duesTextColor}`}>
                    {duesText}
                </p>
            </div>
            <div className={`px-4 py-2 rounded-b-md mt-2 ${occupancyBgColor}`}>
                <p className={`text-xs font-bold uppercase tracking-wider ${occupancyTextColor}`}>{occupancyText}</p>
            </div>
        </div>
    );
});

const InquiryModal: React.FC<{
    onClose: () => void;
    onSubmit: (inquiry: { type: 'Rent' | 'Purchase'; property: string; message: string; }) => void;
}> = ({ onClose, onSubmit }) => {
    const [step, setStep] = useState(1);
    const [inquiryType, setInquiryType] = useState<'Rent' | 'Purchase' | null>(null);
    const [property, setProperty] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const totalSteps = 3;

    const handleNext = () => setStep(s => s + 1);

    const selectInquiryType = (type: 'Rent' | 'Purchase') => {
        setInquiryType(type);
        handleNext();
    };

    const selectProperty = (prop: string) => {
        setProperty(prop);
        handleNext();
    };

    const handleSubmit = () => {
        if (!inquiryType || !property) return;
        onSubmit({ type: inquiryType, property, message });
        setIsSubmitted(true);
        setTimeout(onClose, 3000);
    };
    
    const ProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => (
        <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div 
                className="bg-brand-600 h-2.5 rounded-full" 
                style={{ width: `${(current / total) * 100}%`, transition: 'width 0.5s ease-in-out' }}
            ></div>
        </div>
    );

    const renderStep = () => {
        if (isSubmitted) {
            return (
                <div className="text-center p-8 flex flex-col items-center justify-center animate-fadeIn min-h-[400px]">
                    <CheckCircleIcon className="w-20 h-20 text-green-500 mb-4" />
                    <h3 className="text-3xl font-bold text-slate-800">Inquiry Sent!</h3>
                    <p className="text-slate-600 mt-2 max-w-sm">Thank you! The administration has been notified and will get in touch if a suitable property becomes available.</p>
                </div>
            )
        }
        
        const StepButton: React.FC<{ onClick: () => void, children: React.ReactNode, icon?: React.ReactNode }> = ({ onClick, children, icon }) => (
             <button onClick={onClick} className="w-full text-left p-5 rounded-lg bg-white hover:bg-brand-50 border-2 border-slate-200 hover:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-200 flex items-center shadow-lg">
                {icon && <div className="mr-4 text-brand-600">{icon}</div>}
                <span className="text-xl font-semibold text-slate-800 flex-1">{children}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
        );

        const FlatTypeButton: React.FC<{ onClick: () => void, children: React.ReactNode }> = ({ onClick, children }) => (
            <button onClick={onClick} className="w-full text-center p-3 rounded-lg bg-white hover:bg-brand-50 border-2 border-slate-200 hover:border-brand-500 transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <span className="font-semibold text-slate-800">{children}</span>
            </button>
        );

        switch (step) {
            case 1:
                return (
                    <div className="p-8 space-y-6">
                        <h3 className="text-2xl font-bold text-slate-800 text-center mb-6">I am looking to...</h3>
                        <div className="space-y-4">
                           <StepButton onClick={() => selectInquiryType('Rent')} icon={<KeyIcon className="w-10 h-10"/>}>Rent a Property</StepButton>
                           <StepButton onClick={() => selectInquiryType('Purchase')} icon={<TagIcon className="w-10 h-10"/>}>Purchase a Property</StepButton>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="p-8">
                        <h3 className="text-2xl font-bold text-slate-800 text-center mb-8">What type of property are you interested in?</h3>
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold text-slate-600 mb-2 border-b pb-2 flex items-center"><HomeModernIcon className="w-6 h-6 mr-2" />Flats</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                                    <FlatTypeButton onClick={() => selectProperty('2-Bed Flat')}>2-Bed</FlatTypeButton>
                                    <FlatTypeButton onClick={() => selectProperty('3-Bed Flat')}>3-Bed</FlatTypeButton>
                                    <FlatTypeButton onClick={() => selectProperty('Penthouse')}>Penthouse</FlatTypeButton>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-600 mb-2 border-b pb-2 flex items-center"><BuildingOfficeIcon className="w-6 h-6 mr-2" />Commercial Space</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                    <FlatTypeButton onClick={() => selectProperty('Mezzanine Floor')}>Mezzanine Floor</FlatTypeButton>
                                    <FlatTypeButton onClick={() => selectProperty('Ground Floor')}>Ground Floor</FlatTypeButton>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 3:
                 return (
                    <div className="p-8">
                        <h3 className="text-2xl font-bold text-slate-800 text-center mb-4">Any specific requirements? (Optional)</h3>
                        <p className="text-center text-slate-500 mb-6">You are interested in a <span className="font-semibold text-brand-700">{property}</span> for <span className="font-semibold text-brand-700">{inquiryType?.toLowerCase()}</span>.</p>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                            placeholder="e.g., higher floor, corner unit, fully furnished..."
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 bg-white text-slate-900 placeholder-slate-400"
                        />
                         <div className="mt-6 text-center">
                            <button onClick={handleSubmit} className="w-full bg-brand-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500">
                                Send Inquiry
                            </button>
                        </div>
                    </div>
                );
            default: return null;
        }
    }


    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 animate-fadeIn">
            <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all relative overflow-hidden">
                <div className="absolute top-0 left-0 p-4 z-10">
                    {step > 1 && !isSubmitted && (
                        <button onClick={() => setStep(s => s - 1)} className="p-2 rounded-full text-slate-600 bg-white/50 hover:bg-slate-200">
                           <ArrowLeftIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>
                 <div className="absolute top-0 right-0 p-4 z-10">
                    <button onClick={onClose} className="p-2 rounded-full text-slate-500 bg-white/50 hover:bg-slate-200 hover:text-slate-700">
                        <XCircleIcon className="w-8 h-8" />
                    </button>
                </div>
                <div className="p-5 border-b-2 border-slate-100">
                    <div className="flex items-center justify-center">
                        <HomeModernIcon className="h-10 w-10 text-brand-600 mr-3" />
                        <h2 className="text-3xl font-bold text-slate-800 text-center">Find Your Space</h2>
                    </div>
                    {!isSubmitted && <div className="mt-5 px-8"> <ProgressBar current={step} total={totalSteps} /> </div>}
                </div>
                <div key={step} className="animate-fadeIn">
                    {renderStep()}
                </div>
            </div>
        </div>
    )
};

const PublicFlatDetailModal: React.FC<{
    flat: Flat;
    owner?: User | null;
    onClose: () => void;
}> = ({ flat, owner, onClose }) => {
    const { users } = useData();
    const tenant = useMemo(() => users.find(u => u.id === `${flat.id}tnt`), [users, flat.id]);
    const { totalPending } = getDuesSummary(flat);

    let statusText: string;
    if (flat.isVacant) {
        statusText = "Vacant";
    } else if (tenant) {
        statusText = "Occupied by Tenant";
    } else {
        statusText = "Occupied by Owner";
    }

    const DuesInfo = () => (
        <div className="text-center p-4 rounded-lg bg-slate-100 border border-slate-200">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pending Dues</p>
            <p className={`font-bold text-3xl mt-1 ${totalPending > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {totalPending > 0 ? `${formatCurrency(totalPending)}` : 'All Clear'}
            </p>
        </div>
    );
    
    const ResidentInfoCard: React.FC<{ name: string, pic?: string, title: string }> = ({ name, pic, title }) => (
        <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
            <div className="h-20 w-20 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border-4 border-white shadow-md">
                {pic ? <img src={pic} alt={name} className="h-full w-full object-cover" /> : <UserIcon className="h-full w-full text-slate-400 p-4" />}
            </div>
            <div>
                <p className="text-md font-semibold text-slate-500">{title}</p>
                <p className="text-2xl font-bold text-slate-800">{name}</p>
            </div>
        </div>
    );

    const AdminRemark = () => (
        <div className="p-4 rounded-lg bg-amber-50 border-l-4 border-amber-400">
            <p className="font-bold text-amber-800 flex items-center">
                <ExclamationCircleIcon className="w-5 h-5 mr-2" />
                Admin Note
            </p>
            <p className="text-amber-700 mt-1">{flat.adminRemarks}</p>
        </div>
    );


    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-slate-50 rounded-xl shadow-2xl max-w-lg w-full transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start p-6 border-b-2 bg-white rounded-t-xl">
                   <div>
                        <h2 className="text-4xl font-extrabold text-slate-800">{flat.label}</h2>
                        <span className={`inline-block mt-2 px-3 py-1 text-sm font-semibold rounded-full ${flat.isVacant ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{statusText}</span>
                   </div>
                   <button onClick={onClose} className="p-1.5 -mt-2 -mr-2 rounded-full text-slate-400 hover:bg-slate-200">
                        <XCircleIcon className="w-8 h-8"/>
                   </button>
                </div>
                
                <div className="p-6 space-y-6">
                    {flat.adminRemarks && <AdminRemark />}
                    <DuesInfo />
                    <div className="space-y-4">
                        {owner && <ResidentInfoCard name={owner.ownerName} pic={owner.ownerPic} title="Owner" />}
                        {!flat.isVacant && tenant && (
                            <ResidentInfoCard name={tenant.tenantName || 'N/A'} pic={tenant.tenantPic} title="Tenant" />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


const PublicHomePage: React.FC<{
  onLoginClick: () => void;
  onInquirySubmit: (inquiry: { type: 'Rent' | 'Purchase'; property: string; message: string; }) => void;
}> = ({ onLoginClick, onInquirySubmit }) => {
    const { flats, users, presidentMessage, notices } = useData();
    const [search, setSearch] = useState('');
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const [selectedFlat, setSelectedFlat] = useState<Flat | null>(null);

    const sortedFlats = useMemo(() =>
        [...flats].sort((a, b) => {
            const aNum = parseInt(a.id, 10);
            const bNum = parseInt(b.id, 10);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            return a.id.localeCompare(b.id);
        }),
        [flats]
    );

    const filteredFlats = useMemo(() =>
        sortedFlats.filter(f => f.label.toLowerCase().includes(search.toLowerCase())),
        [search, sortedFlats]
    );
    
    const selectedOwner = useMemo(() => 
        selectedFlat ? users.find(u => u.id === `${selectedFlat.id}own`) : null,
        [selectedFlat, users]
    );

    const PublicHeader = () => (
        <header className="bg-white shadow-lg sticky top-0 z-10 p-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
                <BuildingIcon className="h-12 w-12 text-brand-600" />
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Al Ghafoor Eden</h1>
                    <p className="text-xs text-slate-500 font-medium">Community Portal</p>
                </div>
            </div>
            <div className="flex items-center space-x-3">
                 <button onClick={() => setShowInquiryModal(true)} className="flex items-center justify-center text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg shadow-md transition-all duration-200 hover:scale-105">
                    <SparklesIcon className="h-5 w-5 mr-2"/> Inquire Now
                </button>
                <button onClick={onLoginClick} className="flex items-center justify-center text-sm font-semibold text-brand-700 bg-brand-100 hover:bg-brand-200 px-4 py-2 rounded-lg shadow-md transition-all duration-200 hover:scale-105">
                  <UserIcon className="h-5 w-5 mr-2"/> Login
                </button>
            </div>
        </header>
    );

    return (
        <div className="min-h-screen bg-slate-100">
            {showInquiryModal && <InquiryModal onClose={() => setShowInquiryModal(false)} onSubmit={onInquirySubmit} />}
            {selectedFlat && (
                <PublicFlatDetailModal 
                    flat={selectedFlat}
                    owner={selectedOwner}
                    onClose={() => setSelectedFlat(null)}
                />
            )}

            <PublicHeader />
            <main className="p-4 sm:p-6 lg:p-8">
                 {presidentMessage && (
                    <div className="mb-6 bg-brand-50 border-l-4 border-brand-500 text-brand-800 p-4 rounded-r-lg shadow-md" role="alert">
                      <p className="font-bold text-sm uppercase tracking-wider">Message from the President of Union Committee</p>
                      <p className="mt-1">{presidentMessage}</p>
                    </div>
                )}
                 <div className="bg-white p-4 rounded-xl shadow-md mb-6 sticky top-[88px] z-[9]">
                    <input 
                      type="text" 
                      placeholder="Search by Flat Number (e.g. 103, 504)..." 
                      value={search} 
                      onChange={(e) => setSearch(e.target.value)} 
                      className="w-full p-3 text-lg border-2 border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 bg-white text-slate-900 placeholder-slate-400"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-1">
                        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center"><BuildingIcon className="w-6 h-6 mr-3 text-brand-600"/> Dues Status</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredFlats.map(flat => {
                                const owner = users.find(u => u.id === `${flat.id}own`);
                                const tenant = users.find(u => u.id === `${flat.id}tnt`);
                                return <PublicFlatCard 
                                    key={flat.id} 
                                    flat={flat} 
                                    owner={owner}
                                    tenant={tenant}
                                    onClick={() => setSelectedFlat(flat)}
                                />
                            })}
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center"><NoticeIcon className="w-6 h-6 mr-3 text-brand-600"/> Notice Board</h2>
                        <div className="space-y-4">
                            {notices.slice(0, 3).map(notice => (
                                <div key={notice.id} className="bg-white p-5 rounded-xl shadow-md transition-shadow hover:shadow-lg">
                                    <h3 className="font-bold text-lg text-slate-800">{notice.title}</h3>
                                    <p className="text-xs text-slate-500 font-semibold mt-1">{formatDate(notice.date)}</p>
                                    {notice.image && <img src={notice.image} alt={notice.title} className="mt-3 rounded-lg max-h-48 w-full object-cover" />}
                                    <p className="mt-3 text-slate-600 text-sm leading-relaxed">{notice.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};


const App: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { users, setNotifications, setInquiries } = useData();

  // Splash screen timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3500); // 3.5s splash duration
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (id: string, pass: string) => {
    const user = users.find(u => u.id.toLowerCase() === id.toLowerCase() && u.password === pass);
    if (user) {
      setCurrentUserId(user.id);
      setLoginError(null);
      setShowLogin(false);
    } else {
      setLoginError('Invalid User ID or Password.');
    }
  };

  const handleLogout = () => {
    setCurrentUserId(null);
  };
  
  const handleInquirySubmit = (inquiryData: { type: 'Rent' | 'Purchase'; property: string; message: string; }) => {
    const newNotification: Notification = {
        id: `notif-inquiry-${Date.now()}`,
        recipientId: 'admin',
        message: `New Inquiry (${inquiryData.type}): A user is interested in a ${inquiryData.property}. ${inquiryData.message ? `Message: "${inquiryData.message}"` : ''}`,
        date: new Date().toISOString(),
        isRead: false,
    };
    setNotifications(prev => [newNotification, ...prev]);

    const newInquiry: Inquiry = {
        id: `inq-${Date.now()}`,
        type: inquiryData.type,
        property: inquiryData.property,
        message: inquiryData.message,
        date: new Date().toISOString(),
        isArchived: false,
    };
    setInquiries(prev => [newInquiry, ...prev]);
  };

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <div className="App">
      {currentUserId ? (
        <Dashboard
          currentUserId={currentUserId}
          onLogout={handleLogout}
        />
      ) : showLogin ? (
        <LoginPage onLogin={handleLogin} error={loginError} onBack={() => setShowLogin(false)} />
      ) : (
        <PublicHomePage 
            onLoginClick={() => setShowLogin(true)} 
            onInquirySubmit={handleInquirySubmit}
        />
      )}
    </div>
  );
};

export default App;
