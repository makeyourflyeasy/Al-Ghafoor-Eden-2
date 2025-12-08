




import React, { useMemo, useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { Notification, TenantTransaction, User } from '../../types';
import { Card, processFileForStorage, formatDate, Modal, PageHeader, NotificationCenter, generateNOCPdf, CameraScanModal } from '../Dashboard';
import { ArrowLeftIcon, BuildingIcon, CheckCircleIcon, DocumentTextIcon, KeyIcon, LogoutIcon, MenuIcon, PaperAirplaneIcon, ReceiptTaxIcon, ShareIcon, DownloadIcon, ExclamationCircleIcon, XCircleIcon, UserIcon, CameraIcon, PhoneIcon, TrashIcon, PencilIcon, ClockIcon } from '../Icons';

type Category = TenantTransaction['category'];

const UploadBillModal: React.FC<{
    category: Category;
    onClose: () => void;
    onSubmit: (category: Category, proof: string, amount?: number, remarks?: string) => void;
}> = ({ category, onClose, onSubmit }) => {
    const [proof, setProof] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [remarks, setRemarks] = useState('');
    const [showCamera, setShowCamera] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await processFileForStorage(e.target.files[0]);
            setProof(base64);
        }
    };
    
    const handleCapture = async (file: File) => {
        const base64 = await processFileForStorage(file);
        setProof(base64);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!proof) {
            alert('Please upload a proof document.');
            return;
        }
        onSubmit(category, proof, amount ? parseFloat(amount) : undefined, remarks);
    };

    return (
        <Modal onClose={onClose} title={`Upload ${category}`} size="lg">
            {showCamera && <CameraScanModal onClose={() => setShowCamera(false)} onCapture={handleCapture} />}
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    <p className="text-slate-600">Please upload a clear picture or PDF of your {category}.</p>
                    <div className="flex space-x-4">
                        <div className="flex-1 p-4 border-2 border-dashed border-slate-300 rounded-lg text-center hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <input type="file" accept="image/*,application/pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                            {!proof ? (
                                <div className="py-8">
                                    <DocumentTextIcon className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                                    <span className="text-brand-600 font-semibold">Click to select a file</span>
                                </div>
                            ) : (
                                <div className="text-green-600 font-semibold flex flex-col items-center justify-center py-8">
                                    <CheckCircleIcon className="w-12 h-12 mb-2" /> 
                                    <span>File Selected!</span>
                                    <span className="text-xs text-slate-500 mt-1">Click again to change</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-center">
                            <span className="text-slate-400 font-bold">OR</span>
                        </div>
                        <button type="button" onClick={() => setShowCamera(true)} className="flex-1 flex flex-col items-center justify-center p-4 bg-brand-50 border-2 border-brand-200 rounded-lg text-brand-700 hover:bg-brand-100 transition-colors">
                            <CameraIcon className="w-12 h-12 mb-2" />
                            <span className="font-semibold">Scan with Camera</span>
                        </button>
                    </div>

                    {(category === 'Other Invoice' || category === 'Maintenance Invoice') && (
                        <>
                         <div><label className="block text-sm font-medium text-slate-700">Claim Amount (PKR)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                         <div><label className="block text-sm font-medium text-slate-700">Description / Remarks</label><textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                        </>
                    )}
                </div>
                <div className="bg-slate-200 px-6 py-4 text-right rounded-b-lg">
                    <button type="button" onClick={onClose} className="mr-3 px-4 py-2 text-slate-700 font-bold hover:bg-slate-300 rounded-lg">Cancel</button>
                    <button type="submit" disabled={!proof} className="px-4 py-2 text-sm font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:bg-slate-400">
                        Submit
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const TenantProfileModal: React.FC<{
    user: User;
    onClose: () => void;
    onSave: (updatedData: Partial<User>) => void;
}> = ({ user, onClose, onSave }) => {
    const [pic, setPic] = useState(user.tenantPic || user.ownerPic);
    const [contact, setContact] = useState(user.contact || '');
    const [showCamera, setShowCamera] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await processFileForStorage(e.target.files[0]);
            setPic(base64);
        }
    };
    
    const handleCapture = async (file: File) => {
        const base64 = await processFileForStorage(file);
        setPic(base64);
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ tenantPic: pic, contact });
        onClose();
    };

    return (
        <Modal onClose={onClose} title="Update Profile" size="md">
            {showCamera && <CameraScanModal onClose={() => setShowCamera(false)} onCapture={handleCapture} />}
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-6">
                    <div className="flex flex-col items-center">
                        <div className="w-32 h-32 rounded-full bg-slate-200 overflow-hidden relative group border-4 border-white shadow-lg">
                            {pic ? <img src={pic} alt="Profile" className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-6 text-slate-400" />}
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity space-y-2">
                                <label className="cursor-pointer text-white text-xs flex flex-col items-center">
                                    <DocumentTextIcon className="w-6 h-6 mb-1" />
                                    Upload
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                </label>
                                <button type="button" onClick={() => setShowCamera(true)} className="text-white text-xs flex flex-col items-center">
                                    <CameraIcon className="w-6 h-6 mb-1" />
                                    Camera
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Tap to upload or capture picture</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Mobile Number</label>
                        <input type="text" value={contact} onChange={e => setContact(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" placeholder="0300-1234567" />
                    </div>
                </div>
                <div className="bg-slate-200 px-6 py-4 text-right rounded-b-lg">
                    <button type="submit" className="px-6 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700">Save Changes</button>
                </div>
            </form>
        </Modal>
    )
};

const SuccessModal: React.FC<{ onClose: () => void, title: string, message: string }> = ({ onClose, title, message }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[200] p-4 animate-fadeIn">
        <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full text-center overflow-hidden">
            <div className="bg-green-50 p-6 flex justify-center">
                <CheckCircleIcon className="w-20 h-20 text-white" />
            </div>
            <div className="p-6">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-slate-600 mb-6">{message}</p>
                <button onClick={onClose} className="w-full py-3 px-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md transition-all">
                    Okay, Got it
                </button>
            </div>
        </div>
    </div>
);

const TenantDashboard: React.FC<{
    currentUser: User; onLogout: () => void; showToast: (message: string) => void; isSidebarOpen: boolean; setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ currentUser, onLogout, showToast, isSidebarOpen, setSidebarOpen }) => {
    const { setTenantTransactions, tenantTransactions, setNotifications, markNotificationAsRead, flats, handleTenantVacateRequest, setUsers } = useData();
    const [uploadCategory, setUploadCategory] = useState<Category | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    
    // Logic to check if the tenant is fully vacated or has objection
    const isFullyVacated = currentUser.vacatingStatus === 'Vacated';
    const isObjection = currentUser.vacatingStatus === 'Objection';
    const isLocked = isFullyVacated || isObjection;

    const flatId = currentUser.id.replace(/own|tnt/i, '');
    const flat = flats.find(f => f.id === flatId);
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const handleDownloadNOC = () => {
        if (flat && isFullyVacated) {
            generateNOCPdf(currentUser, flat);
        } else if (isObjection) {
             showToast('Cannot download NOC. Please clear pending dues first.');
        }
    };

    const isPaid = (category: Category) => {
        return tenantTransactions.some(t => 
            t.userId === currentUser.id && 
            t.category === category && 
            t.month === currentMonth
        );
    };

    const handleUploadSubmit = (category: Category, proof: string, amount?: number, remarks?: string) => {
         const newTxId = `tt-${Date.now()}`;
         const newTx: TenantTransaction = {
            id: newTxId,
            userId: currentUser.id,
            flatId: flatId,
            category: category,
            month: currentMonth,
            paidOn: new Date().toISOString(),
            proofDocument: proof,
            amount,
            remarks,
            status: 'Confirmed' // Auto-confirm upload, owner reviews history
        };
        setTenantTransactions(prev => [newTx, ...prev]);
        
        // Notify Owner
        const ownerId = `${flatId}own`;
        const newNotif: Notification = {
            id: `notif-bill-${newTxId}`,
            recipientId: ownerId,
            message: `Tenant has uploaded ${category} for ${new Date().toLocaleString('default', { month: 'long' })}.`,
            date: new Date().toISOString(),
            isRead: false,
            actionType: 'BILL_UPLOADED',
            payload: { tenantTransactionId: newTxId }
        };
        setNotifications(prev => [newNotif, ...prev]);

        showToast(`${category} uploaded successfully!`);
        setUploadCategory(null);
    };
    
    const handleRequestVacate = () => {
        handleTenantVacateRequest(currentUser.id);
        setShowSuccessModal(true);
    };

    const handleUpdateProfile = (updatedData: Partial<User>) => {
        setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...updatedData } : u));
        showToast("Profile updated successfully!");
    };

    const handleNotificationClick = (notif: Notification) => {
        markNotificationAsRead(notif.id);
    };

    const UploadCard: React.FC<{ label: string, icon: React.ReactNode, onClick: () => void }> = ({ label, icon, onClick }) => (
        <button 
            onClick={onClick} 
            disabled={isLocked}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-brand-500 hover:shadow-md transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed h-full"
        >
            <div className="w-14 h-14 mb-3 text-slate-400 group-hover:text-brand-600 transition-colors bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-brand-50">
                {icon}
            </div>
            <span className="font-semibold text-slate-700 group-hover:text-brand-700">{label}</span>
        </button>
    );
    
    const PaidCard: React.FC<{ label: string }> = ({ label }) => (
        <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-xl shadow-sm border border-green-200 h-full">
            <div className="w-14 h-14 mb-3 text-green-600 bg-white rounded-full flex items-center justify-center border border-green-100 shadow-sm">
                <CheckCircleIcon className="w-8 h-8"/>
            </div>
            <span className="font-bold text-green-700 text-center text-sm">This Month<br/>{label} Paid</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {showSuccessModal && <SuccessModal title="Request Sent" message="Your request to vacate has been successfully sent to both the Flat Owner and the Admin. Please wait for their approval." onClose={() => setShowSuccessModal(false)} />}
            {uploadCategory && <UploadBillModal category={uploadCategory} onClose={() => setUploadCategory(null)} onSubmit={handleUploadSubmit} />}
            {showProfileModal && <TenantProfileModal user={currentUser} onClose={() => setShowProfileModal(false)} onSave={handleUpdateProfile} />}

            <header className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-30">
                <div className="flex items-center space-x-3">
                     <BuildingIcon className="h-8 w-8 text-brand-600" />
                     <div>
                        <h1 className="text-lg font-extrabold text-slate-900">Tenant Portal</h1>
                        <p className="text-xs text-slate-500">{flat ? `Flat ${flat.label}` : ''}</p>
                     </div>
                </div>
                <div className="flex items-center space-x-3">
                     <NotificationCenter currentUser={currentUser} onNotificationClick={handleNotificationClick} />
                     <button onClick={onLogout} className="text-slate-500 hover:text-red-600 p-2 rounded-full bg-slate-100 hover:bg-red-50">
                        <LogoutIcon className="w-5 h-5" />
                     </button>
                </div>
            </header>

            <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 rounded-full bg-white border-4 border-slate-200 overflow-hidden shadow-sm">
                             {currentUser.tenantPic || currentUser.ownerPic ? (
                                 <img src={currentUser.tenantPic || currentUser.ownerPic} alt="Profile" className="w-full h-full object-cover" />
                             ) : (
                                 <UserIcon className="w-full h-full p-4 text-slate-300" />
                             )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Welcome, {currentUser.tenantName || currentUser.ownerName}</h2>
                            <p className="text-slate-500">{currentUser.contact || 'No contact added'}</p>
                        </div>
                    </div>
                    {!isLocked && (
                        <button onClick={() => setShowProfileModal(true)} className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 shadow-sm flex items-center">
                            <PencilIcon className="w-4 h-4 mr-2"/> Edit Profile
                        </button>
                    )}
                </div>

                {/* VACATE STATUS BANNER */}
                {currentUser.vacateRequest && (
                    <div className={`p-6 rounded-xl border-l-8 shadow-md ${isFullyVacated ? 'bg-green-50 border-green-500' : (isObjection ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500')}`}>
                        <div className="flex flex-col md:flex-row justify-between items-center">
                            <div className="mb-4 md:mb-0">
                                <h3 className={`text-xl font-bold ${isFullyVacated ? 'text-green-800' : (isObjection ? 'text-red-800' : 'text-blue-800')} flex items-center`}>
                                    {isFullyVacated ? <CheckCircleIcon className="w-6 h-6 mr-2"/> : <ExclamationCircleIcon className="w-6 h-6 mr-2"/>}
                                    {isFullyVacated ? 'Approved to Vacate' : (isObjection ? 'Vacate Request Objected' : 'Vacate Request Pending')}
                                </h3>
                                {!isLocked && (
                                    <div className="mt-2 flex flex-wrap gap-4 text-sm">
                                        <span className={`flex items-center font-semibold ${currentUser.vacateRequest.ownerApproved ? 'text-green-600' : 'text-amber-600'}`}>
                                            {currentUser.vacateRequest.ownerApproved ? <CheckCircleIcon className="w-4 h-4 mr-1"/> : <ClockIcon className="w-4 h-4 mr-1"/>} Owner Approval: {currentUser.vacateRequest.ownerApproved ? 'Done' : 'Pending'}
                                        </span>
                                        <span className={`flex items-center font-semibold ${currentUser.vacateRequest.adminApproved ? 'text-green-600' : 'text-amber-600'}`}>
                                            {currentUser.vacateRequest.adminApproved ? <CheckCircleIcon className="w-4 h-4 mr-1"/> : <ClockIcon className="w-4 h-4 mr-1"/>} Admin Approval: {currentUser.vacateRequest.adminApproved ? 'Done' : 'Pending'}
                                        </span>
                                    </div>
                                )}
                                {isObjection && <p className="text-red-700 mt-2">You have outstanding dues. Please clear them with the Admin to proceed.</p>}
                            </div>
                            
                            {isFullyVacated && (
                                <button onClick={handleDownloadNOC} className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg flex items-center animate-pulse">
                                    <DownloadIcon className="w-6 h-6 mr-2" /> Download NOC
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* MAIN ACTIONS */}
                {!isLocked ? (
                    <>
                        <div>
                            <h3 className="text-lg font-bold text-slate-700 mb-4 border-b pb-2">Utility & Invoice Uploads</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {isPaid('K-Electric Bill') ? <PaidCard label="Electric"/> : <UploadCard label="Electric Bill" icon={<ShareIcon className="w-8 h-8"/>} onClick={() => setUploadCategory('K-Electric Bill')} />}
                                {isPaid('Gas Bill') ? <PaidCard label="Gas"/> : <UploadCard label="Gas Bill" icon={<ShareIcon className="w-8 h-8"/>} onClick={() => setUploadCategory('Gas Bill')} />}
                                {isPaid('Water Bill') ? <PaidCard label="Water"/> : <UploadCard label="Water Bill" icon={<ShareIcon className="w-8 h-8"/>} onClick={() => setUploadCategory('Water Bill')} />}
                                <UploadCard label="Maintenance Invoice" icon={<ReceiptTaxIcon className="w-8 h-8"/>} onClick={() => setUploadCategory('Maintenance Invoice')} />
                            </div>
                        </div>

                        {!currentUser.vacateRequest && (
                            <div className="pt-8 border-t border-slate-200">
                                <div className="flex justify-center">
                                    <button onClick={handleRequestVacate} className="px-8 py-3 bg-white border-2 border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-300 transition-all shadow-sm flex items-center">
                                        <LogoutIcon className="w-5 h-5 mr-2" /> Request to Vacate Flat
                                    </button>
                                </div>
                                <p className="text-center text-xs text-slate-400 mt-3">Sending this request will notify the Owner and Admin.</p>
                            </div>
                        )}
                    </>
                ) : (
                    !isFullyVacated && !isObjection && <div className="text-center p-10 text-slate-500 italic">Account features are locked pending vacate approval.</div>
                )}

            </main>
        </div>
    );
};

export default TenantDashboard;
