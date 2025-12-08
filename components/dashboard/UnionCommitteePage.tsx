import React, { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { Role, User } from '../../types';
import { Card, Modal, PageHeader } from '../Dashboard';
import { PencilIcon, PlusCircleIcon, TrashIcon, UserIcon } from '../Icons';


const UnionCommitteePage: React.FC<{ currentUser: User, showToast: (message: string) => void }> = ({ currentUser, showToast }) => {
    const { users, setUsers } = useData();
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const committeeMembers = useMemo(() => users.filter(u => [Role.Admin, Role.Accountant, Role.AccountsChecker].includes(u.role)), [users]);
    const canEdit = currentUser.role === Role.Admin;

    const handleOpenModal = (user: User | null = null) => { setEditingUser(user); setShowModal(true); };
    const handleCloseModal = () => { setEditingUser(null); setShowModal(false); };

    const handleSubmit = (formData: { [key: string]: any }) => {
        if (editingUser) {
            setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...editingUser, ...formData } : u));
            showToast('User updated!');
        } else {
            const newUser: User = { id: formData.id, role: formData.role, ownerName: formData.ownerName, password: formData.password, contact: formData.contact, residentType: 'Owner' };
            setUsers(prev => [...prev, newUser]);
            showToast('User added!');
        }
        handleCloseModal();
    };

    const handleDelete = (userId: string) => {
        if (userId === 'admin') { alert("The main admin account cannot be deleted."); return; }
        if (window.confirm('Are you sure you want to delete this user?')) {
            setUsers(prev => prev.filter(u => u.id !== userId));
            showToast('User deleted.');
        }
    };

    const roleOptions = [Role.Admin, Role.Accountant, Role.AccountsChecker].map(role => ({ value: role, label: role }));

    return (
        <div>
            {showModal && <Modal onClose={handleCloseModal} title={editingUser ? 'Edit Member' : 'Add Member'} size="lg">
                <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); handleSubmit({ id: data.get('id') as string, ownerName: data.get('ownerName') as string, role: data.get('role') as Role, password: data.get('password') as string, contact: data.get('contact') as string }); }}>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="id" required defaultValue={editingUser?.id} disabled={!!editingUser} placeholder="User ID" className="p-2 border-2 border-slate-300 rounded-md bg-white text-slate-900 disabled:bg-slate-200" />
                        <input name="ownerName" required defaultValue={editingUser?.ownerName} placeholder="Name" className="p-2 border-2 border-slate-300 rounded-md bg-white text-slate-900" />
                        <select name="role" required defaultValue={editingUser?.role} className="p-2 border-2 border-slate-300 rounded-md bg-white text-slate-900">{roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
                        <input name="password" required defaultValue={editingUser?.password} placeholder="Password" type="password" className="p-2 border-2 border-slate-300 rounded-md bg-white text-slate-900" />
                        <input name="contact" defaultValue={editingUser?.contact} placeholder="Contact" className="p-2 border-2 border-slate-300 rounded-md bg-white text-slate-900 md:col-span-2" />
                    </div>
                    <div className="bg-slate-200 px-6 py-4 text-right rounded-b-lg"><button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-brand-600 rounded-lg">Save</button></div>
                </form>
            </Modal>}
            <PageHeader title="Union Committee Management" subtitle="Manage accounts for core management staff.">
                {canEdit && <button onClick={() => handleOpenModal()} className="flex items-center bg-brand-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-brand-700 shadow-md"><PlusCircleIcon className="w-5 h-5 mr-2" />Add Member</button>}
            </PageHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {committeeMembers.map(user => (
                    <Card key={user.id} noPadding>
                        <div className="p-5 flex items-center">
                            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mr-4">
                                <UserIcon className="w-8 h-8 text-slate-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl text-slate-800">{user.ownerName}</h3>
                                <p className="text-sm text-slate-500">{user.id} - {user.role}</p>
                            </div>
                        </div>
                        {canEdit && (
                            <div className="bg-slate-50 px-5 py-3 flex justify-end space-x-2 border-t">
                                <button onClick={() => handleOpenModal(user)} className="p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-200 rounded-md"><PencilIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDelete(user.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-200 rounded-md"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        )}
                    </Card>
                 ))}
            </div>
        </div>
    );
};

export default UnionCommitteePage;
