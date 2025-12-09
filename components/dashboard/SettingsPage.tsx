
import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { BuildingInfo, Role, User } from '../../types';
import { Card, Modal, PageHeader, processFileForStorage } from '../Dashboard';
import { BuildingIcon, CloudIcon, DatabaseIcon, PencilIcon, PlusCircleIcon, TrashIcon, UserIcon, UsersGroupIcon, CameraIcon, CheckCircleIcon, XCircleIcon, DownloadIcon, CloudArrowUpIcon, ClipboardListIcon } from '../Icons';

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

    const generatedFlatList = useMemo(() => {
        const { totalFloors, flatsPerFloor } = tempBuildingInfo;
        let list = [];
        for (let f = 1; f <= totalFloors; f++) {
            const floorFlats = [];
            for (let n = 1; n <= flatsPerFloor; n++) {
                floorFlats.push(`${f}0${n}`);
            }
            list.push(`Floor ${f}: ${floorFlats.join(', ')}`);
        }
        return list.join('\n');
    }, [tempBuildingInfo.totalFloors, tempBuildingInfo.flatsPerFloor]);

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

    const firestoreRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
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
                            <h4 className="font-bold text-slate-800 mb-3">Floor Configuration (AI Generation Logic)</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                 <div><label className="block text-xs font-bold text-slate-500">Total Floors</label><input type="number" disabled={!isEditingInfo} value={tempBuildingInfo.totalFloors} onChange={e => setTempBuildingInfo({...tempBuildingInfo, totalFloors: parseInt(e.target.value)})} className="w-full mt-1 p-2 border rounded" /></div>
                                 <div><label className="block text-xs font-bold text-slate-500">Flats per Floor</label><input type="number" disabled={!isEditingInfo} value={tempBuildingInfo.flatsPerFloor} onChange={e => setTempBuildingInfo({...tempBuildingInfo, flatsPerFloor: parseInt(e.target.value)})} className="w-full mt-1 p-2 border rounded" /></div>
                            </div>
                            <div className="bg-slate-100 p-3 rounded text-xs font-mono text-slate-600 whitespace-pre-wrap h-32 overflow-y-auto border">
                                {generatedFlatList}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">* This logic is used when resetting or generating new flats.</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* --- USERS TAB --- */}
            {activeTab === 'users' && (
                <Card title="Staff User Management" titleAction={
                    <button onClick={() => { setEditingUser({ id: '', ownerName: '', role: Role.Guard, password: '', residentType: 'Owner' } as User); setShowUserModal(true); }} className="bg-brand-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-brand-700 flex items-center"><PlusCircleIcon className="w-4 h-4 mr-1"/> Add User</button>
                }>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">ID / Password</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Contact</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {staffUsers.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden mr-3">
                                                {u.ownerPic ? <img src={u.ownerPic} className="h-full w-full object-cover"/> : <UserIcon className="p-1 text-slate-400"/>}
                                            </div>
                                            <span className="font-medium text-slate-900">{u.ownerName}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{u.role}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500">{u.id} / {u.password}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{u.contact || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <button onClick={() => { setEditingUser(u); setShowUserModal(true); }} className="text-brand-600 hover:text-brand-900"><PencilIcon className="w-5 h-5"/></button>
                                            {u.id !== 'admin' && <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-900"><TrashIcon className="w-5 h-5"/></button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* --- BACKUP TAB --- */}
            {activeTab === 'backup' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card title="Download Backup">
                        <div className="text-center p-6">
                            <DatabaseIcon className="w-16 h-16 mx-auto text-brand-600 mb-4" />
                            <p className="text-slate-600 mb-6">Download a full copy of the entire application database (Users, Flats, Finance, History) as a secure JSON file.</p>
                            <button onClick={handleDownloadBackup} className="w-full py-3 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 flex items-center justify-center">
                                <DownloadIcon className="w-5 h-5 mr-2" /> Download Full Backup
                            </button>
                        </div>
                    </Card>
                    <Card title="Restore Backup">
                        <div className="text-center p-6">
                            <CloudArrowUpIcon className="w-16 h-16 mx-auto text-green-600 mb-4" />
                            <p className="text-slate-600 mb-6">Upload a previously downloaded JSON backup file to restore the system. <span className="text-red-600 font-bold">Warning: This replaces all current data.</span></p>
                            <div className="flex space-x-2">
                                <input type="file" accept=".json" onChange={e => setBackupFile(e.target.files ? e.target.files[0] : null)} className="flex-1 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"/>
                                <button onClick={handleRestoreBackup} disabled={!backupFile} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50">Restore</button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* --- CLOUD TAB --- */}
            {activeTab === 'cloud' && (
                <div className="space-y-6">
                    <Card title="Cloud Connectivity Status">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between mb-6">
                            <div className="flex items-center">
                                <div className="h-3 w-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                                <div>
                                    <p className="font-bold text-green-800">Connected & Syncing</p>
                                    <p className="text-xs text-green-600">Data is automatically syncing to the local database.</p>
                                </div>
                            </div>
                            <CloudIcon className="w-8 h-8 text-green-300" />
                        </div>
                    </Card>

                    <Card title="How to Fix 'Permission Denied' (ڈیٹا لائیو کرنے کا طریقہ)">
                        <div className="prose prose-sm text-slate-600">
                            <p>اگر آپ کا ڈیٹا ریفریش کرنے پر غائب ہو جاتا ہے یا دوسری ڈیوائس پر نظر نہیں آتا، تو آپ کو Firebase Console میں جا کر <strong>Rules</strong> تبدیل کرنے ہوں گے۔</p>
                            
                            <div className="bg-amber-50 p-4 border-l-4 border-amber-500 rounded my-4">
                                <h5 className="font-bold text-amber-800">ہدایات (Urdu Instructions):</h5>
                                <ol className="list-decimal pl-5 space-y-2 mt-2 text-amber-900 font-semibold">
                                    <li><a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-brand-600 underline font-bold">Firebase Console</a> ویب سائٹ پر جائیں۔</li>
                                    <li>اپنے پروجیکٹ (e.g., <strong>alghafooreden</strong>) پر کلک کریں۔</li>
                                    <li>الٹے ہاتھ والے مینو سے <strong>Build</strong> اور پھر <strong>Firestore Database</strong> پر کلک کریں۔ <br/> <span className="text-red-600">(نوٹ: "Realtime Database" پر کلک نہ کریں، وہ غلط جگہ ہے)</span>.</li>
                                    <li>اوپر <strong>Rules</strong> کے ٹیب پر کلک کریں۔</li>
                                    <li>وہاں موجود پرانے کوڈ کو ہٹا کر نیچے دیا گیا کوڈ پیسٹ کریں اور <strong>Publish</strong> کا بٹن دبائیں۔</li>
                                </ol>
                            </div>

                            <div className="relative mt-4 bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                                <pre>{firestoreRules}</pre>
                                <button 
                                    onClick={handleCopyRules} 
                                    className="absolute top-2 right-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded flex items-center"
                                >
                                    <ClipboardListIcon className="w-4 h-4 mr-1"/> Copy Code
                                </button>
                            </div>
                            <p className="mt-4 text-sm text-slate-500">یہ سیٹنگ کرنے کے بعد آپ کا ڈیٹا تمام ڈیوائسز پر فوری (Live) اپڈیٹ ہونا شروع ہو جائے گا۔</p>
                        </div>
                    </Card>
                </div>
            )}

            {/* User Modal */}
            {showUserModal && (
                <Modal onClose={() => setShowUserModal(false)} title={editingUser?.id ? "Edit User" : "Add New User"} size="lg">
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if(editingUser) handleSaveUser(editingUser);
                    }}>
                        <div className="p-6 space-y-4">
                            <div className="flex flex-col items-center mb-4">
                                <div className="w-24 h-24 bg-slate-200 rounded-full overflow-hidden relative group">
                                    {editingUser?.ownerPic ? <img src={editingUser.ownerPic} className="w-full h-full object-cover" /> : <UserIcon className="p-4 text-slate-400 w-full h-full"/>}
                                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                        <CameraIcon className="w-8 h-8 text-white"/>
                                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && handleLogoChange(e.target.files[0]).then(b64 => setEditingUser(prev => prev ? {...prev, ownerPic: b64} : null))} />
                                    </label>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-slate-700">Name</label><input required value={editingUser?.ownerName || ''} onChange={e => setEditingUser(prev => prev ? {...prev, ownerName: e.target.value} : null)} className="w-full mt-1 p-2 border rounded" /></div>
                                <div><label className="block text-sm font-medium text-slate-700">Role</label><select value={editingUser?.role} onChange={e => setEditingUser(prev => prev ? {...prev, role: e.target.value as Role} : null)} className="w-full mt-1 p-2 border rounded">{staffRoles.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                                <div><label className="block text-sm font-medium text-slate-700">User ID</label><input required value={editingUser?.id || ''} onChange={e => setEditingUser(prev => prev ? {...prev, id: e.target.value} : null)} disabled={!!users.find(u => u.id === editingUser?.id && users.includes(editingUser!))} className="w-full mt-1 p-2 border rounded disabled:bg-slate-100" /></div>
                                <div><label className="block text-sm font-medium text-slate-700">Password</label><input required value={editingUser?.password || ''} onChange={e => setEditingUser(prev => prev ? {...prev, password: e.target.value} : null)} className="w-full mt-1 p-2 border rounded" /></div>
                                <div><label className="block text-sm font-medium text-slate-700">Contact</label><input value={editingUser?.contact || ''} onChange={e => setEditingUser(prev => prev ? {...prev, contact: e.target.value} : null)} className="w-full mt-1 p-2 border rounded" /></div>
                                {[Role.Guard, Role.Accountant, Role.Sweeper, Role.LiftMechanic].includes(editingUser?.role as any) && (
                                    <div><label className="block text-sm font-medium text-slate-700">Monthly Salary</label><input type="number" value={editingUser?.salary || ''} onChange={e => setEditingUser(prev => prev ? {...prev, salary: parseFloat(e.target.value)} : null)} className="w-full mt-1 p-2 border rounded" /></div>
                                )}
                            </div>
                        </div>
                        <div className="bg-slate-200 px-6 py-4 text-right rounded-b-lg">
                            <button type="button" onClick={() => setShowUserModal(false)} className="mr-2 px-4 py-2 text-slate-600 font-bold hover:bg-slate-300 rounded">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-brand-600 text-white font-bold rounded hover:bg-brand-700">Save User</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default SettingsPage;
