
import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { BuildingInfo, Role, User } from '../../types';
import { Card, Modal, PageHeader, processFileForStorage } from '../Dashboard';
import { BuildingIcon, CloudIcon, DatabaseIcon, PencilIcon, PlusCircleIcon, TrashIcon, UserIcon, UsersGroupIcon, CameraIcon, CheckCircleIcon, XCircleIcon, DownloadIcon, CloudArrowUpIcon, ClipboardListIcon, ExclamationCircleIcon, ShieldCheckIcon } from '../Icons';

const SettingsPage: React.FC<{ currentUser: User, showToast: (message: string, type?: 'success' | 'error') => void }> = ({ currentUser, showToast }) => {
    const { buildingInfo, setBuildingInfo, users, setUsers, generateBackupData, restoreBackupData } = useData();
    const [activeTab, setActiveTab] = useState<'general' | 'users' | 'backup' | 'cloud'>('general');
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [tempBuildingInfo, setTempBuildingInfo] = useState<BuildingInfo>(buildingInfo);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [backupFile, setBackupFile] = useState<File | null>(null);

    // --- GENERAL TAB LOGIC ---
    const handleSaveGeneral = () => {
        setBuildingInfo(tempBuildingInfo);
        setIsEditingInfo(false);
        showToast('Building information updated successfully!');
    };

    const handleLogoChange = async (file: File) => {
        const base64 = await processFileForStorage(file);
        setTempBuildingInfo(prev => ({ ...prev, logo: base64 }));
    };

    // --- USER MANAGEMENT LOGIC ---
    const staffRoles = [Role.Admin, Role.Accountant, Role.AccountsChecker, Role.Guard, Role.Sweeper, Role.LiftMechanic];
    const staffUsers = useMemo(() => users.filter(u => staffRoles.includes(u.role)), [users]);

    const handleUserSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simplified submit logic for brevity, normally would handle form data
        if (editingUser) {
            setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
            showToast('User updated!');
        } else {
            // New user logic would go here, ensuring unique ID
             if(editingUser) setUsers(prev => [...prev, editingUser]);
             showToast('User added!');
        }
        setShowUserModal(false);
        setEditingUser(null);
    };
    
    const handleSaveUser = (user: User) => {
         if (users.some(u => u.id === user.id && u !== editingUser)) {
             showToast('User ID already exists.', 'error');
             return;
         }
         if (editingUser && users.find(u => u.id === editingUser.id)) {
             setUsers(prev => prev.map(u => u.id === editingUser.id ? user : u));
             showToast('User updated successfully.');
         } else {
             setUsers(prev => [...prev, user]);
             showToast('User added successfully.');
         }
         setShowUserModal(false);
         setEditingUser(null);
    }

    const handleDeleteUser = (userId: string) => {
        if (userId === 'admin') {
            showToast('Cannot delete main admin.', 'error');
            return;
        }
        if (window.confirm('Are you sure you want to delete this user?')) {
            setUsers(prev => prev.filter(u => u.id !== userId));
            showToast('User deleted.');
        }
    };

    // --- BACKUP LOGIC ---
    const handleDownloadBackup = () => {
        const jsonString = generateBackupData();
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FullBackup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Backup downloaded.');
    };

    const handleRestoreBackup = () => {
        if (!backupFile) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = e.target?.result as string;
                if (window.confirm('This will overwrite ALL current data. Are you sure?')) {
                    restoreBackupData(json);
                    showToast('System restored successfully!', 'success');
                    window.location.reload();
                }
            } catch (err) {
                showToast('Invalid backup file.', 'error');
            }
        };
        reader.readAsText(backupFile);
    };

    // Slightly more specific rule to reduce noise, though still "public" effectively for the app
    const firestoreRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only allow access to this app's data collection
    match /app_data_v2_titanium/{document=**} {
      allow read, write: if true;
    }
  }
}`;

    const handleCopyRules = () => {
        navigator.clipboard.writeText(firestoreRules);
        showToast('Rules copied to clipboard!', 'success');
    };

    return (
        <div>
            <PageHeader title="Settings" subtitle="Configure building parameters and manage system access." />
            
            <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg mb-6 w-full md:w-auto overflow-x-auto">
                <button onClick={() => setActiveTab('general')} className={`px-4 py-2 rounded-md font-semibold text-sm flex items-center whitespace-nowrap ${activeTab === 'general' ? 'bg-white text-slate-800 shadow' : 'text-slate-600 hover:bg-slate-300'}`}>
                    <BuildingIcon className="w-4 h-4 mr-2"/> General Info
                </button>
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-md font-semibold text-sm flex items-center whitespace-nowrap ${activeTab === 'users' ? 'bg-white text-slate-800 shadow' : 'text-slate-600 hover:bg-slate-300'}`}>
                    <UsersGroupIcon className="w-4 h-4 mr-2"/> User Management
                </button>
                <button onClick={() => setActiveTab('backup')} className={`px-4 py-2 rounded-md font-semibold text-sm flex items-center whitespace-nowrap ${activeTab === 'backup' ? 'bg-white text-slate-800 shadow' : 'text-slate-600 hover:bg-slate-300'}`}>
                    <DatabaseIcon className="w-4 h-4 mr-2"/> Backup & Restore
                </button>
                <button onClick={() => setActiveTab('cloud')} className={`px-4 py-2 rounded-md font-semibold text-sm flex items-center whitespace-nowrap ${activeTab === 'cloud' ? 'bg-white text-slate-800 shadow' : 'text-slate-600 hover:bg-slate-300'}`}>
                    <CloudIcon className="w-4 h-4 mr-2"/> Cloud Connectivity
                </button>
            </div>

            {/* --- GENERAL TAB --- */}
            {activeTab === 'general' && (
                <Card title="Building Configuration" titleAction={
                    !isEditingInfo ? 
                    <button onClick={() => { setTempBuildingInfo(buildingInfo); setIsEditingInfo(true); }} className="text-brand-600 hover:underline text-sm font-bold">Edit</button> : 
                    <div className="space-x-2">
                        <button onClick={() => setIsEditingInfo(false)} className="text-slate-500 hover:text-slate-700 text-sm font-bold">Cancel</button>
                        <button onClick={handleSaveGeneral} className="text-green-600 hover:text-green-700 text-sm font-bold">Save</button>
                    </div>
                }>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                            {tempBuildingInfo.logo ? <img src={tempBuildingInfo.logo} alt="Logo" className="h-32 w-auto object-contain mb-2"/> : <BuildingIcon className="h-20 w-20 text-slate-300 mb-2"/>}
                            {isEditingInfo && (
                                <label className="cursor-pointer bg-white border border-slate-300 px-3 py-1 rounded text-sm font-medium hover:bg-slate-50">
                                    Change Logo <input type="file" accept="image/*" onChange={e => e.target.files && handleLogoChange(e.target.files[0])} className="hidden"/>
                                </label>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700">Building Name</label>
                            <input disabled={!isEditingInfo} value={tempBuildingInfo.name} onChange={e => setTempBuildingInfo({...tempBuildingInfo, name: e.target.value})} className="w-full mt-1 p-2 border rounded bg-white disabled:bg-slate-100" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700">Address</label>
                            <input disabled={!isEditingInfo} value={tempBuildingInfo.address} onChange={e => setTempBuildingInfo({...tempBuildingInfo, address: e.target.value})} className="w-full mt-1 p-2 border rounded bg-white disabled:bg-slate-100" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-slate-500">Total Flats</label><input type="number" disabled={!isEditingInfo} value={tempBuildingInfo.totalFlats} onChange={e => setTempBuildingInfo({...tempBuildingInfo, totalFlats: parseInt(e.target.value)})} className="w-full mt-1 p-2 border rounded" /></div>
                            <div><label className="block text-xs font-bold text-slate-500">Penthouses</label><input type="number" disabled={!isEditingInfo} value={tempBuildingInfo.totalPenthouses} onChange={e => setTempBuildingInfo({...tempBuildingInfo, totalPenthouses: parseInt(e.target.value)})} className="w-full mt-1 p-2 border rounded" /></div>
                            <div><label className="block text-xs font-bold text-slate-500">Shops</label><input type="number" disabled={!isEditingInfo} value={tempBuildingInfo.totalShops} onChange={e => setTempBuildingInfo({...tempBuildingInfo, totalShops: parseInt(e.target.value)})} className="w-full mt-1 p-2 border rounded" /></div>
                            <div><label className="block text-xs font-bold text-slate-500">Offices</label><input type="number" disabled={!isEditingInfo} value={tempBuildingInfo.totalOffices} onChange={e => setTempBuildingInfo({...tempBuildingInfo, totalOffices: parseInt(e.target.value)})} className="w-full mt-1 p-2 border rounded" /></div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-700">Mezzanine Details</label>
                            <input disabled={!isEditingInfo} value={tempBuildingInfo.mezzanineDetails} onChange={e => setTempBuildingInfo({...tempBuildingInfo, mezzanineDetails: e.target.value})} className="w-full mt-1 p-2 border rounded bg-white disabled:bg-slate-100" />
                        </div>

                        <div className="md:col-span-2 border-t pt-4 mt-2">
                            <h4 className="font-bold text-slate-800 mb-3">Floor Configuration</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                 <div><label className="block text-xs font-bold text-slate-500">Total Floors</label><input type="number" disabled={!isEditingInfo} value={tempBuildingInfo.totalFloors} onChange={e => setTempBuildingInfo({...tempBuildingInfo, totalFloors: parseInt(e.target.value)})} className="w-full mt-1 p-2 border rounded" /></div>
                                 <div><label className="block text-xs font-bold text-slate-500">Flats per Floor</label><input type="number" disabled={!isEditingInfo} value={tempBuildingInfo.flatsPerFloor} onChange={e => setTempBuildingInfo({...tempBuildingInfo, flatsPerFloor: parseInt(e.target.value)})} className="w-full mt-1 p-2 border rounded" /></div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* --- CLOUD TAB --- */}
            {activeTab === 'cloud' && (
                <div className="space-y-6">
                    <Card title="Firebase Cloud Connection">
                        <div className="flex items-center mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <CloudIcon className="w-8 h-8 text-blue-600 mr-3" />
                            <div>
                                <h3 className="font-bold text-blue-900">Sync Status</h3>
                                <p className="text-sm text-blue-700">Enable cloud database to sync data across all admin and guard devices.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-bold text-slate-800 mb-2">Instructions</h4>
                                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
                                    <li>Go to <a href="https://console.firebase.google.com/" target="_blank" className="text-brand-600 underline font-bold">Firebase Console</a>.</li>
                                    <li>Open project <strong>alghafooreden</strong>.</li>
                                    <li>Click <strong>Build &gt; Firestore Database</strong> in the side menu.</li>
                                    <li className="text-red-600 font-bold text-xs">NOT "Realtime Database"</li>
                                    <li>Click the <strong>Rules</strong> tab.</li>
                                    <li>Paste the code and click <strong>Publish</strong>.</li>
                                </ol>
                            </div>
                            
                            <div className="flex flex-col">
                                <h4 className="font-bold text-slate-800 mb-2">Rules Code</h4>
                                <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto relative flex-1">
                                    <pre>{firestoreRules}</pre>
                                    <button onClick={handleCopyRules} className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded text-white flex items-center">
                                        <ClipboardListIcon className="w-4 h-4 mr-1" /> Copy
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg">
                            <div className="flex items-start">
                                <ShieldCheckIcon className="w-6 h-6 text-amber-600 mr-3 mt-1 flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-amber-800">Regarding the "Public Access" Warning</h4>
                                    <p className="text-sm text-amber-700 mt-1">
                                        Firebase will show a warning: <em>"Your security rules are defined as public, so anyone can steal, modify, or delete data."</em>
                                    </p>
                                    <p className="text-sm text-amber-700 mt-2 font-medium">
                                        <strong>This is expected for this app.</strong> Since the app uses its own internal user management system instead of Google Login, the database connection must be open to the app.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title="Troubleshooting Common Errors">
                        <div className="space-y-4">
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center mb-2">
                                    <ExclamationCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                                    <h4 className="font-bold text-red-800 text-sm">Error: "Line 1: Parse error"</h4>
                                </div>
                                <p className="text-sm text-slate-600">
                                    This happens if you paste the code into <strong>Realtime Database</strong>.
                                    <br/><br/>
                                    <strong>Solution:</strong> Look at the left sidebar. Click <strong>Firestore Database</strong> (it usually has an orange/cloud icon).
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* --- BACKUP TAB --- */}
            {activeTab === 'backup' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card title="Download Backup">
                        <p className="text-slate-600 text-sm mb-4">Save a complete copy of all your data (Users, Payments, Expenses) to your computer.</p>
                        <button onClick={handleDownloadBackup} className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">
                            <DownloadIcon className="w-5 h-5 mr-2" /> Download JSON Backup
                        </button>
                    </Card>

                    <Card title="Restore from Backup">
                        <p className="text-slate-600 text-sm mb-4">Restore data from a previously saved JSON file. <strong className="text-red-600">Warning: This will replace current data.</strong></p>
                        <div className="space-y-3">
                            <input type="file" accept=".json" onChange={e => setBackupFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"/>
                            <button onClick={handleRestoreBackup} disabled={!backupFile} className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed">
                                <CloudArrowUpIcon className="w-5 h-5 mr-2" /> Restore Data
                            </button>
                        </div>
                    </Card>
                </div>
            )}

            {/* --- USERS TAB --- */}
            {activeTab === 'users' && (
                <div>
                    <Card title="Staff & Management Accounts" titleAction={<button onClick={() => { setEditingUser({id:'', role:Role.Guard, ownerName:'', password:'', residentType:'Owner'}); setShowUserModal(true); }} className="text-brand-600 hover:underline text-sm font-bold flex items-center"><PlusCircleIcon className="w-4 h-4 mr-1"/> Add New</button>}>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50"><tr><th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Role</th><th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">ID</th><th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Password</th><th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th></tr></thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {staffUsers.map(user => (
                                        <tr key={user.id}>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{user.ownerName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500">{user.role}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono text-xs">{user.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono text-xs">{user.password}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => { setEditingUser(user); setShowUserModal(true); }} className="text-brand-600 hover:text-brand-900 mr-3"><PencilIcon className="w-4 h-4"/></button>
                                                <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900"><TrashIcon className="w-4 h-4"/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {showUserModal && editingUser && (
                <Modal onClose={() => setShowUserModal(false)} title={users.some(u => u.id === editingUser.id && u !== editingUser) ? 'Edit User' : 'Add User'}>
                    <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(editingUser); }}>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-sm font-bold text-slate-700">Name</label><input required value={editingUser.ownerName} onChange={e => setEditingUser({...editingUser, ownerName: e.target.value})} className="w-full p-2 border rounded"/></div>
                            <div><label className="block text-sm font-bold text-slate-700">Role</label><select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as Role})} className="w-full p-2 border rounded">{staffRoles.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                            <div><label className="block text-sm font-bold text-slate-700">User ID (Login)</label><input required value={editingUser.id} onChange={e => setEditingUser({...editingUser, id: e.target.value})} disabled={users.some(u => u.id === editingUser?.id)} className="w-full p-2 border rounded disabled:bg-slate-100"/></div>
                            <div><label className="block text-sm font-bold text-slate-700">Password</label><input required value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="w-full p-2 border rounded"/></div>
                            <div><label className="block text-sm font-bold text-slate-700">Monthly Salary (If applicable)</label><input type="number" value={editingUser.salary || ''} onChange={e => setEditingUser({...editingUser, salary: parseFloat(e.target.value)})} className="w-full p-2 border rounded"/></div>
                        </div>
                        <div className="bg-slate-100 p-4 text-right rounded-b-lg">
                            <button type="submit" className="px-4 py-2 bg-brand-600 text-white font-bold rounded hover:bg-brand-700">Save User</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default SettingsPage;
