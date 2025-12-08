import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Contact, Role, User } from '../../types';
import { Card, Modal, PageHeader } from '../Dashboard';
import { PencilIcon, PhoneIcon, PlusCircleIcon, TrashIcon } from '../Icons';

const ContactsPage: React.FC<{ currentUser: User, showToast: (message: string) => void }> = ({ currentUser, showToast }) => {
    const { contacts, setContacts } = useData();
    const [showModal, setShowModal] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const canEdit = currentUser.role === Role.Admin;

    const handleOpenModal = (contact: Contact | null = null) => { setEditingContact(contact); setShowModal(true); };
    const handleCloseModal = () => { setEditingContact(null); setShowModal(false); };

    const handleSubmit = (formData: { [key: string]: string }) => {
        if (editingContact) {
            setContacts(prev => prev.map(c => c.id === editingContact.id ? { ...editingContact, ...formData } : c));
            showToast('Contact updated!');
        } else {
            setContacts(prev => [{ id: `c-${Date.now()}`, ...formData } as Contact, ...prev]);
            showToast('Contact added!');
        }
        handleCloseModal();
    };
    
    const handleDelete = (contactId: string) => {
        if (window.confirm('Are you sure?')) {
            setContacts(prev => prev.filter(c => c.id !== contactId));
            showToast('Contact deleted.');
        }
    };

    return (
        <div>
            {showModal && canEdit && <Modal onClose={handleCloseModal} title={editingContact ? 'Edit Contact' : 'Add Contact'} size="lg">
                 <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); handleSubmit({title: data.get('title') as string, name: data.get('name') as string, contactNumber: data.get('contactNumber') as string}); }}>
                    <div className="p-6 grid grid-cols-1 gap-4">
                        <input name="title" required defaultValue={editingContact?.title} placeholder="Title" className="w-full p-2 border-2 border-slate-300 rounded-md bg-white text-slate-900" />
                        <input name="name" required defaultValue={editingContact?.name} placeholder="Name" className="w-full p-2 border-2 border-slate-300 rounded-md bg-white text-slate-900" />
                        <input name="contactNumber" required defaultValue={editingContact?.contactNumber} placeholder="Contact Number" className="w-full p-2 border-2 border-slate-300 rounded-md bg-white text-slate-900" />
                    </div>
                    <div className="bg-slate-200 px-6 py-4 text-right rounded-b-lg"><button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-brand-600 rounded-lg">Save</button></div>
                </form>
            </Modal>}
            <PageHeader title="Important Contacts" subtitle="A directory of essential personnel and services.">
                 {canEdit && <button onClick={() => handleOpenModal()} className="flex items-center bg-brand-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-brand-700 shadow-md"><PlusCircleIcon className="w-5 h-5 mr-2" />Add Contact</button>}
            </PageHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {contacts.map(contact => (
                    <Card key={contact.id} className="flex flex-col">
                       <div className="flex-1">
                            <p className="text-sm font-semibold text-brand-600">{contact.title}</p>
                            <p className="text-2xl font-bold text-slate-800 mt-1">{contact.name}</p>
                             <a href={`tel:${contact.contactNumber}`} className="flex items-center text-slate-600 mt-2 hover:text-brand-600 group">
                                <PhoneIcon className="w-5 h-5 mr-2 transition-colors group-hover:text-brand-600" />
                                <span className="font-semibold transition-colors group-hover:text-brand-600">{contact.contactNumber}</span>
                             </a>
                       </div>
                       {canEdit && 
                         <div className="border-t mt-4 pt-3 flex justify-end space-x-2">
                            <button onClick={() => handleOpenModal(contact)} className="p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-md"><PencilIcon className="w-5 h-5"/></button>
                            <button onClick={() => handleDelete(contact.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-md"><TrashIcon className="w-5 h-5"/></button>
                        </div>
                       }
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default ContactsPage;
