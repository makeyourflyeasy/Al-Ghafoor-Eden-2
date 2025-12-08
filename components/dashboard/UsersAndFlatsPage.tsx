









import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Dues, DuesStatus, Flat, Role, User } from '../../types';
import { Card, processFileForStorage, formatCurrency, generateEntryPermissionPdf, getDuesSummary, Modal, PageHeader, CameraScanModal, base64ToFile } from '../Dashboard';
import { DocumentTextIcon, IdentificationIcon, PencilIcon, TrashIcon, UserIcon, DownloadIcon, ExclamationCircleIcon, CheckCircleIcon, KeyIcon, CameraIcon } from '../Icons';

const Section: React.FC<{title: string, children: React.ReactNode, className?: string}> = ({title, children, className}) => (
    <div className={`border-t border-slate-200 pt-5 mt-5 first:mt-0 first:border-t-0 first:pt-0 ${className}`}>
        <h4 className="text-lg font-bold text-slate-700 mb-4">{title}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {children}
        </div>
    </div>
);

const FileUploadField: React.FC<{
    label: string;
    fileData?: string;
    onFileSelect: (file: File) => void;
    onRemove: () => void;
    accept: string;
    icon: React.ReactNode;
    readOnly?: boolean;
}> = ({ label, fileData, onFileSelect, onRemove, accept, icon, readOnly = false }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [showCamera, setShowCamera] = useState(false);
    const isImage = fileData?.startsWith('data:image');
    const isPdf = fileData?.startsWith('data:application/pdf');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };
    
    const handleViewClick = () => {
        if (!fileData) return;
        const event = new CustomEvent('viewfile', { detail: { data: fileData, name: label } });
        window.dispatchEvent(event);
    };

    return (
        <div className="md:col-span-2 bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
            {showCamera && <CameraScanModal onClose={() => setShowCamera(false)} onCapture={onFileSelect} />}
            <div className="flex items-center">
                <div className="w-12 h-12 bg-slate-100 rounded-md flex items-center justify-center mr-4 text-slate-500">
                    {isImage && fileData ? <img src={fileData} alt={label} className="w-full h-full object-cover rounded-md" /> : isPdf ? <DocumentTextIcon className="text-red-500 w-8 h-8"/> : icon}
                </div>
                <div>
                    <p className="font-semibold text-slate-800">{label}</p>
                    {fileData ? (
                        <div className="flex items-center space-x-2 text-sm">
                            <button onClick={handleViewClick} type="button" className="text-brand-600 hover:underline font-medium">View</button>
                            {!readOnly && <>
                              <span className="text-slate-300">|</span>
                              <button onClick={onRemove} type="button" className="text-red-600 hover:underline font-medium">Remove</button>
                            </>}
                        </div>
                    ) : (
                       <p className="text-sm text-slate-500">Not uploaded</p>
                    )}
                </div>
            </div>
            {!readOnly && (
                <div className="flex space-x-2">
                    <input type="file" ref={inputRef} onChange={handleFileChange} accept={accept} className="hidden" />
                    {!fileData && (
                        <button type="button" onClick={() => setShowCamera(true)} className="p-2 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-md" title="Scan with Camera">
                            <CameraIcon className="w-5 h-5" />
                        </button>
                    )}
                    <button type="button" onClick={() => inputRef.current?.click()} className="px-3 py-1.5 text-sm font-semibold bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300">
                        {fileData ? 'Change' : 'Upload'}
                    </button>
                </div>
            )}
        </div>
    );
};


const FlatDetailModal: React.FC<{
    flat: Flat;
    onClose: () => void;
    onSave: (updatedUsers: User[], updatedFlat: Flat) => void;
    onNavigateToLedger: (flatId: string) => void;
    currentUser: User;
    showToast: (message: string, type?: 'success' | 'error') => void;
}> = ({ flat, onClose, onSave, onNavigateToLedger, currentUser, showToast }) => {
    const { users, handleApproveVacate } = useData();
    const initialOwner = useMemo(() => users.find(u => u.id === `${flat.id}own`), [users, flat.id]);
    const initialTenant = useMemo(() => users.find(u => u.id === `${flat.id}TNT` || u.id === `${flat.id}tnt`), [users, flat.id]);

    const [editableOwner, setEditableOwner] = useState<User | undefined>(initialOwner);
    const [editableTenant, setEditableTenant] = useState<User | undefined>(initialTenant);
    const [editableFlat, setEditableFlat] = useState<Flat>(flat);
    const [showEntryPass, setShowEntryPass] = useState(false);

    const { totalPending } = getDuesSummary(flat);
    const isAdmin = currentUser.role === Role.Admin;
    
    const generateRandomPassword = () => Math.floor(100000 + Math.random() * 900000).toString();

    const getResidencyStatus = (f: Flat, t?: User): 'owner' | 'tenant' | 'vacant' => {
        if (f.isVacant) return 'vacant';
        return t ? 'tenant' : 'owner';
    };
    
    const originalStatus = useMemo(() => getResidencyStatus(flat, initialTenant), [flat, initialTenant]);
    const [occupancyType, setOccupancyType] = useState<'Owner' | 'Tenant' | 'Vacant'>(getResidencyStatus(flat, initialTenant) === 'owner' ? 'Owner' : (getResidencyStatus(flat, initialTenant) === 'tenant' ? 'Tenant' : 'Vacant'));

    const handleResidencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as 'Owner' | 'Tenant' | 'Vacant';
        setOccupancyType(newStatus);

        if (newStatus === 'Vacant') {
            setEditableFlat(prev => ({ ...prev, isVacant: true }));
        } else {
            setEditableFlat(prev => ({ ...prev, isVacant: false }));
            if (newStatus === 'Tenant') {
                if (!editableTenant || editableTenant.vacatingStatus !== undefined) { 
                     setEditableTenant({
                        id: `${flat.id}TNT`, 
                        role: Role.Resident,
                        ownerName: '', 
                        password: generateRandomPassword(),
                        residentType: 'Tenant',
                        tenantName: '',
                        contact: '',
                        vacatingStatus: 'None'
                    });
                }
            }
        }
    };
    
    const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, userType: 'owner' | 'tenant') => {
        const { name, value } = e.target;
        const setUser = userType === 'owner' ? setEditableOwner : setEditableTenant;
        
        setUser(prev => {
            const updated = prev ? { ...prev, [name]: value } : prev;
            if (userType === 'tenant' && name === 'tenantName' && updated) {
                updated.ownerName = value;
            }
            return updated;
        });
    };

    const handleFlatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditableFlat(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const handleFileChange = async (field: keyof User, file: File, userType: 'owner' | 'tenant') => {
        const base64 = await processFileForStorage(file);
        const setUser = userType === 'owner' ? setEditableOwner : setEditableTenant;
        setUser(prev => prev ? { ...prev, [field]: base64 } : prev);
    };

    const handleFileRemove = (field: keyof User, userType: 'owner' | 'tenant') => {
        const setUser = userType === 'owner' ? setEditableOwner : setEditableTenant;
        setUser(prev => prev ? { ...prev, [field]: undefined } : prev);
    };

    const handleSaveChanges = () => {
        if (!editableOwner) {
            alert("Error: Owner data is missing.");
            return;
        }
        
        const isVacant = occupancyType === 'Vacant';
        const isTenant = occupancyType === 'Tenant';

        if (isTenant) {
            if (!editableTenant) {
                showToast("Tenant details are missing.", "error");
                return;
            }
            if (!editableTenant.password || editableTenant.password.trim() === '') {
                showToast("Please ensure the tenant has a password.", "error");
                return;
            }
            if (!editableTenant.tenantName || editableTenant.tenantName.trim() === '') {
                showToast("Please enter the tenant's name.", "error");
                return;
            }
        }

        let finalFlat = { ...editableFlat, isVacant };
        let newHistory = finalFlat.tenantHistory ? [...finalFlat.tenantHistory] : [];
        const usersToUpdate: User[] = [editableOwner];
        let finalTenant = editableTenant ? {...editableTenant} : undefined;

        // Logic for VACATING a Tenant
        if (isVacant && originalStatus === 'tenant' && finalTenant) {
            const { totalPending } = getDuesSummary(flat);
            if (totalPending > 0) {
                finalTenant.vacatingStatus = 'Objection';
                showToast("Tenant marked as 'Objection' due to pending dues.", 'error');
            } else {
                finalTenant.vacatingStatus = 'Vacated';
                showToast("Tenant successfully vacated.", 'success');
            }
            const historyIndex = newHistory.findIndex(h => h.userId === finalTenant?.id && h.endDate === null);
            if (historyIndex !== -1) {
                newHistory[historyIndex] = { ...newHistory[historyIndex], endDate: new Date().toISOString() };
            }
            usersToUpdate.push(finalTenant);
        } 
        // Logic for NEW OCCUPANCY (Vacant -> Occupied)
        else if (!isVacant && originalStatus === 'vacant') {
             const { totalPending } = getDuesSummary(flat);
             if (totalPending > 0) {
                 showToast("Cannot permit entry. Please clear all previous dues first.", "error");
                 return;
             }
             if (isTenant && finalTenant) {
                newHistory = newHistory.map(h => h.endDate === null ? {...h, endDate: new Date().toISOString()} : h);
                newHistory.push({ userId: finalTenant.id, startDate: new Date().toISOString(), endDate: null });
                
                const entryChargeDue: Dues = { month: new Date().toISOString().slice(0, 7), amount: 5000, status: DuesStatus.Pending, paidAmount: 0, description: 'New Tenant Entry Charge' };
                const chargeExists = finalFlat.dues.some(d => d.description === entryChargeDue.description && d.status === DuesStatus.Pending);
                if (!chargeExists) {
                    finalFlat.dues = [...finalFlat.dues, entryChargeDue];
                    showToast('PKR 5,000 New Tenant Entry Charge has been added.', 'success');
                }
                finalTenant.vacatingStatus = 'None';
                usersToUpdate.push({...finalTenant, residentType: 'Tenant'});
             }
             setShowEntryPass(true);
        }
        // Logic for simple update
        else if (isTenant && finalTenant) {
             finalTenant.vacatingStatus = 'None';
             usersToUpdate.push({...finalTenant, residentType: 'Tenant'});
        }
        
        finalFlat.tenantHistory = newHistory;
        onSave(usersToUpdate, finalFlat);
        
        if (originalStatus !== 'vacant' || isVacant) {
            onClose();
        }
    };
    
    const handleAdminApproveVacate = () => {
        if (editableTenant) {
            handleApproveVacate(editableTenant.id, 'Admin');
            showToast("You have approved the vacate request.");
            onClose();
        }
    };

    const handleDownloadEntryPass = () => {
        const name = !editableFlat.isVacant && editableTenant ? editableTenant.ownerName : editableOwner.ownerName;
        generateEntryPermissionPdf(flat, name);
        onClose();
    };

    let duesText = "All Dues Clear";
    let duesColor = "text-green-600";
    if (totalPending > 0) {
        duesText = `${formatCurrency(totalPending)} Pending`;
        duesColor = "text-red-600";
    }
    
    const SectionHeader = ({title}: {title: string}) => (
        <h3 className="text-lg font-bold text-slate-700 border-b pb-2 mb-4 mt-6 first:mt-0">{title}</h3>
    )

    if (!editableOwner) return <Modal onClose={onClose} title={`Error`}><div className="p-6 text-center"><p className="text-red-600 font-semibold">Could not find owner information.</p></div></Modal>;

    if (showEntryPass) {
         return (
            <Modal onClose={onClose} title="Entry Permission" size="md">
                <div className="p-6 text-center space-y-4">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                        <CheckCircleIcon className="h-10 w-10 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Occupancy Status Updated!</h3>
                    <p className="text-slate-600">Since all previous dues are cleared, you can now generate the Entry Permission / Move-In Pass.</p>
                    <button onClick={handleDownloadEntryPass} className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg">
                        <DownloadIcon className="w-5 h-5 mr-2" /> Download Entry Permission
                    </button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal onClose={onClose} title={`Manage ${flat.label}`} size="4xl">
            <div className="p-6 overflow-y-auto max-h-[75vh]">
                 {/* Admin Vacate Approval Alert */}
                 {editableTenant?.vacateRequest && !editableTenant.vacateRequest.adminApproved && isAdmin && (
                    <div className="mb-6 p-5 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg shadow-md flex flex-col sm:flex-row justify-between items-center">
                        <div className="mb-4 sm:mb-0">
                            <h3 className="text-lg font-bold text-blue-800 flex items-center"><ExclamationCircleIcon className="w-6 h-6 mr-2"/> Tenant Vacate Request</h3>
                            <p className="text-blue-700 mt-1">This tenant has requested to vacate. Owner approval is {editableTenant.vacateRequest.ownerApproved ? 'DONE' : 'PENDING'}.</p>
                        </div>
                        <button 
                            onClick={handleAdminApproveVacate}
                            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors flex items-center"
                        >
                            <CheckCircleIcon className="w-5 h-5 mr-2" /> Approve Vacate
                        </button>
                    </div>
                )}
                
                {/* SECTION 1: OWNER DETAILS */}
                <SectionHeader title="1. Owner Details" />
                <div className="space-y-4 animate-fadeIn">
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-32 h-32 rounded-full bg-slate-200 overflow-hidden relative group border-4 border-white shadow-lg">
                            {editableOwner.ownerPic ? <img src={editableOwner.ownerPic} alt="Profile" className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-6 text-slate-400" />}
                            {isAdmin && (
                                <label className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                    <CameraIcon className="w-10 h-10 text-white" />
                                    <input type="file" accept="image/*,application/pdf" onChange={e => e.target.files && handleFileChange('ownerPic', e.target.files[0], 'owner')} className="hidden" />
                                </label>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-slate-700">Owner Name</label><input type="text" name="ownerName" value={editableOwner.ownerName || ''} onChange={(e) => handleUserInputChange(e, 'owner')} disabled={!isAdmin} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-slate-900 disabled:bg-slate-200" /></div>
                        <div><label className="block text-sm font-medium text-slate-700">Contact Number</label><input type="text" name="contact" value={editableOwner.contact || ''} onChange={(e) => handleUserInputChange(e, 'owner')} disabled={!isAdmin} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-slate-900 disabled:bg-slate-200" /></div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <FileUploadField readOnly={!isAdmin} label="Owner CNIC (Front)" fileData={editableOwner.ownerCnicFront} icon={<IdentificationIcon />} onFileSelect={(file) => handleFileChange('ownerCnicFront', file, 'owner')} onRemove={() => handleFileRemove('ownerCnicFront', 'owner')} accept="image/*,application/pdf" />
                        <FileUploadField readOnly={!isAdmin} label="Owner CNIC (Back)" fileData={editableOwner.ownerCnicBack} icon={<IdentificationIcon />} onFileSelect={(file) => handleFileChange('ownerCnicBack', file, 'owner')} onRemove={() => handleFileRemove('ownerCnicBack', 'owner')} accept="image/*,application/pdf" />
                    </div>
                </div>

                 {/* SECTION 2: OCCUPANCY STATUS */}
                 <SectionHeader title="2. Occupancy Status" />
                 <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700">Current Status</label>
                    <select 
                        value={occupancyType} 
                        onChange={handleResidencyChange} 
                        disabled={!isAdmin}
                        className="mt-1 block w-full pl-3 pr-10 py-3 bg-white border-2 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-slate-900 disabled:bg-slate-200 text-lg font-medium"
                    >
                        <option value="Owner">Occupied by Owner</option>
                        <option value="Tenant">Occupied by Tenant</option>
                        <option value="Vacant">Vacant</option>
                    </select>
                </div>

                 {/* SECTION 3: TENANT DETAILS (CONDITIONAL) */}
                 {editableTenant && occupancyType === 'Tenant' && (
                    <div className="space-y-6 animate-fadeIn bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
                         <div>
                            <h4 className="font-bold text-slate-800 mb-4 border-b border-slate-300 pb-2">3. Tenant Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div><label className="block text-sm font-medium text-slate-700">Tenant Name</label><input type="text" name="tenantName" value={editableTenant.tenantName || ''} onChange={(e) => handleUserInputChange(e, 'tenant')} disabled={!isAdmin} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-slate-900 disabled:bg-slate-200" /></div>
                                <div><label className="block text-sm font-medium text-slate-700">Tenant Contact</label><input type="text" name="contact" value={editableTenant.contact || ''} onChange={(e) => handleUserInputChange(e, 'tenant')} disabled={!isAdmin} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-slate-900 disabled:bg-slate-200" /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FileUploadField readOnly={!isAdmin} label="Tenant CNIC (Front)" fileData={editableTenant.tenantCnicFront} icon={<IdentificationIcon />} onFileSelect={(file) => handleFileChange('tenantCnicFront', file, 'tenant')} onRemove={() => handleFileRemove('tenantCnicFront', 'tenant')} accept="image/*,application/pdf" />
                                <FileUploadField readOnly={!isAdmin} label="Tenant CNIC (Back)" fileData={editableTenant.tenantCnicBack} icon={<IdentificationIcon />} onFileSelect={(file) => handleFileChange('tenantCnicBack', file, 'tenant')} onRemove={() => handleFileRemove('tenantCnicBack', 'tenant')} accept="image/*,application/pdf" />
                                <FileUploadField readOnly={!isAdmin} label="Rental Agreement" fileData={editableTenant.rentalAgreement} icon={<DocumentTextIcon />} onFileSelect={(file) => handleFileChange('rentalAgreement', file, 'tenant')} onRemove={() => handleFileRemove('rentalAgreement', 'tenant')} accept="image/*,application/pdf" />
                                <FileUploadField readOnly={!isAdmin} label="Police Verification" fileData={editableTenant.policeVerification} icon={<DocumentTextIcon />} onFileSelect={(file) => handleFileChange('policeVerification', file, 'tenant')} onRemove={() => handleFileRemove('policeVerification', 'tenant')} accept="image/*,application/pdf" />
                            </div>
                        </div>

                         <div>
                            <h4 className="font-bold text-slate-800 mb-4 border-b border-slate-300 pb-2">Tenant App Credentials</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">User ID (Locked)</label>
                                    <input type="text" value={editableTenant.id} disabled className="mt-1 block w-full px-3 py-2 bg-slate-200 border-2 border-slate-300 rounded-md shadow-sm text-slate-900 font-mono" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Tenant Password</label>
                                    <div className="flex mt-1">
                                        <input 
                                            type="text" 
                                            name="password" 
                                            value={editableTenant.password || ''} 
                                            onChange={(e) => handleUserInputChange(e, 'tenant')} 
                                            placeholder="Password"
                                            disabled={!isAdmin} 
                                            className="block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-l-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-slate-900 disabled:bg-slate-200 placeholder-slate-400" 
                                        />
                                        {isAdmin && (
                                            <button 
                                                type="button"
                                                onClick={() => handleUserInputChange({target: { name: 'password', value: generateRandomPassword() }} as any, 'tenant')}
                                                className="px-3 py-2 bg-slate-200 border-2 border-l-0 border-slate-300 rounded-r-md text-slate-600 hover:bg-slate-300 font-semibold text-sm"
                                            >
                                                Generate
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                         </div>
                    </div>
                 )}

                 <SectionHeader title="Financial & Maintenance" />
                 <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between p-4 bg-slate-50 rounded-lg gap-4 border border-slate-200">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Dues Status</p>
                            <p className={`text-xl font-bold ${duesColor}`}>{duesText}</p>
                        </div>
                         <button onClick={() => onNavigateToLedger(flat.id)} className="px-4 py-2 text-sm font-semibold bg-brand-100 text-brand-700 rounded-md hover:bg-brand-200">Check Flat Ledger</button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Default Monthly Maintenance (PKR)</label>
                        <input 
                            type="number" 
                            name="monthlyMaintenance" 
                            value={editableFlat.monthlyMaintenance} 
                            onChange={handleFlatInputChange} 
                            disabled={!isAdmin} 
                            className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-slate-900 disabled:bg-slate-200" 
                        />
                         {occupancyType === 'Vacant' && (
                            <div className="mt-2 p-2 bg-green-50 text-green-800 text-sm font-bold rounded flex items-center">
                                <CheckCircleIcon className="w-4 h-4 mr-2"/>
                                Vacant Status Active: 50% Maintenance Waiver will be applied automatically.
                            </div>
                        )}
                    </div>
                </div>

            </div>
            {isAdmin && <div className="bg-slate-200 px-6 py-4 text-right rounded-b-lg sticky bottom-0">
                <button type="button" onClick={onClose} className="mr-3 px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={handleSaveChanges} className="px-6 py-2.5 text-sm font-bold text-white bg-brand-600 border-2 border-brand-600 rounded-lg hover:bg-brand-700">Save Changes</button>
            </div>}
        </Modal>
    );
};

const StaffDetailModal: React.FC<{
    user: User;
    onClose: () => void;
    onSave: (updatedUser: User) => void;
}> = ({ user, onClose, onSave }) => {
    const [editableUser, setEditableUser] = useState<User>(user);

    const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditableUser(prev => ({ ...prev, [name]: name === 'salary' ? parseFloat(value) || 0 : value }));
    };

    const handleSaveChanges = () => {
        onSave(editableUser);
    };

    return (
        <Modal onClose={onClose} title={`Manage Staff: ${user.ownerName}`} size="lg">
            <div className="p-6">
                 <Section title="Profile Details">
                    <div className="md:col-span-1"><label className="block text-sm font-medium text-slate-700">Name</label><input type="text" name="ownerName" value={editableUser.ownerName || ''} onChange={handleUserInputChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-sm text-slate-900" /></div>
                    <div className="md:col-span-1"><label className="block text-sm font-medium text-slate-700">Role</label><input type="text" value={editableUser.role} disabled className="mt-1 block w-full px-3 py-2 bg-slate-200 border-2 border-slate-300 rounded-md shadow-sm text-slate-900" /></div>
                    <div className="md:col-span-1"><label className="block text-sm font-medium text-slate-700">Monthly Salary (PKR)</label><input type="number" name="salary" value={editableUser.salary || ''} onChange={handleUserInputChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-sm text-slate-900" /></div>
                 </Section>
                 <Section title="User Credentials">
                    <div className="md:col-span-1"><label className="block text-sm font-medium text-slate-700">User ID</label><input type="text" value={editableUser.id} disabled className="mt-1 block w-full px-3 py-2 bg-slate-200 border-2 border-slate-300 rounded-md shadow-sm text-slate-900" /></div>
                    <div className="md:col-span-1"><label className="block text-sm font-medium text-slate-700">Password</label><input type="text" name="password" value={editableUser.password || ''} onChange={handleUserInputChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-sm text-slate-900" /></div>
                </Section>
            </div>
            <div className="bg-slate-200 px-6 py-4 text-right rounded-b-lg sticky bottom-0">
                <button type="button" onClick={onClose} className="mr-3 px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={handleSaveChanges} className="px-6 py-2.5 text-sm font-bold text-white bg-brand-600 border-2 border-brand-600 rounded-lg hover:bg-brand-700">Save Changes</button>
            </div>
        </Modal>
    );
};


const UsersAndFlatsPage: React.FC<{
    currentUser: User;
    showToast: (message: string, type?: 'success' | 'error') => void;
    onNavigateToLedger: (flatId: string) => void;
    initialOpenFlatId?: string | null;
}> = ({ currentUser, showToast, onNavigateToLedger, initialOpenFlatId }) => {
    const { flats, users, setUsers, setFlats } = useData();
    const [selectedItem, setSelectedItem] = useState<{ type: 'flat' | 'staff', id: string } | null>(null);

    const staffUsers = useMemo(() => users.filter(u => [Role.Guard, Role.Sweeper].includes(u.role)), [users]);
    
    const sortedFlats = useMemo(() => [...flats].sort((a, b) => {
        const aNum = parseInt(a.id, 10);
        const bNum = parseInt(b.id, 10);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        if (!isNaN(aNum)) return -1;
        if (!isNaN(bNum)) return 1;
        return a.id.localeCompare(b.id);
    }), [flats]);

    // Effect to auto-open flat modal if initialOpenFlatId is provided prop
    useEffect(() => {
        if (initialOpenFlatId) {
            const flat = flats.find(f => f.id === initialOpenFlatId);
            if (flat) {
                setSelectedItem({ type: 'flat', id: initialOpenFlatId });
            }
        }
    }, [initialOpenFlatId, flats]);


    const handleCloseModal = () => setSelectedItem(null);

    const handleSaveFlatChanges = (updatedUsers: User[], updatedFlat: Flat) => {
        setFlats(prev => prev.map(f => f.id === updatedFlat.id ? updatedFlat : f));

        setUsers(prev => {
            const userIdsToUpdate = new Set(updatedUsers.map(u => u.id));
            // IMPORTANT: For vacating, we might have the 'same' ID (TNT) but with updated status.
            // We need to be careful not to create duplicates.
            const otherUsers = prev.filter(u => !userIdsToUpdate.has(u.id));
            
            return [...otherUsers, ...updatedUsers];
        });

        showToast('Flat details saved successfully!');
        // Modal closes within the component logic if needed
    };
    
    const handleSaveStaffChanges = (updatedUser: User) => {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        showToast('Staff details saved successfully!');
        handleCloseModal();
    };


    const selectedFlat = selectedItem?.type === 'flat' ? flats.find(f => f.id === selectedItem.id) : null;
    const selectedStaffUser = selectedItem?.type === 'staff' ? users.find(u => u.id === selectedItem.id) : null;

    return (
        <div>
            {selectedFlat && (
                <FlatDetailModal 
                    flat={selectedFlat}
                    onClose={handleCloseModal}
                    onSave={handleSaveFlatChanges}
                    onNavigateToLedger={onNavigateToLedger}
                    currentUser={currentUser}
                    showToast={showToast}
                />
            )}
            {selectedStaffUser && (
                <StaffDetailModal user={selectedStaffUser} onClose={handleCloseModal} onSave={handleSaveStaffChanges} />
            )}
            <PageHeader title="Users & Flats Management" subtitle="View and manage all properties, residents, and staff."/>
            <Card title="Staff Members">
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {staffUsers.map(user => (
                        <button key={user.id} onClick={() => setSelectedItem({ type: 'staff', id: user.id })} className="bg-white rounded-lg shadow-md border-l-8 border-slate-500 text-left flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500">
                           <div className="p-4">
                             <p className="font-extrabold text-2xl text-slate-800">{user.ownerName}</p>
                             <p className="text-sm text-slate-600 mt-1 truncate">{user.role}</p>
                           </div>
                           <div className="px-4 py-1.5 rounded-b-md bg-slate-100 text-slate-800">
                                <p className="text-xs font-bold uppercase tracking-wider">Salary: {formatCurrency(user.salary || 0)}</p>
                           </div>
                        </button>
                    ))}
                 </div>
            </Card>
            <div className="mt-8">
                 <Card title="Flats & Properties">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                        {sortedFlats.map(flat => {
                            const owner = users.find(u => u.id === `${flat.id}own`);
                            const tenant = users.find(u => u.id === `${flat.id}TNT` || u.id === `${flat.id}tnt`);
                            const { pendingMonths } = getDuesSummary(flat);
                            let borderColor = 'border-green-500';
                            let statusText = tenant ? 'Tenant Occupied' : 'Owner Occupied';
                            let statusBg = 'bg-green-100 text-green-800';
                            
                            if (flat.isVacant) {
                                borderColor = 'border-blue-500';
                                statusText = 'Vacant';
                                statusBg = 'bg-blue-100 text-blue-800';
                            }
                            else if (pendingMonths > 2) borderColor = 'border-red-500';
                            else if (pendingMonths > 0) borderColor = 'border-amber-500';
                            
                            return (
                                <button key={flat.id} onClick={() => setSelectedItem({ type: 'flat', id: flat.id })} className={`bg-white rounded-lg shadow-md border-l-8 ${borderColor} text-left flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500`}>
                                   <div className="p-4">
                                     <p className="font-extrabold text-2xl text-slate-800">{flat.label}</p>
                                     <p className="text-sm text-slate-600 mt-1 truncate">{owner?.ownerName || 'No owner assigned'}</p>
                                   </div>
                                   <div className={`px-4 py-1.5 rounded-b-md ${statusBg}`}>
                                        <p className={`text-xs font-bold uppercase tracking-wider`}>{statusText}</p>
                                   </div>
                                </button>
                            );
                        })}
                    </div>
                 </Card>
            </div>
        </div>
    )
};

export default UsersAndFlatsPage;
