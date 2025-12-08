import React, { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { TenantTransaction, User } from '../../types';
import { Card, formatDate, PageHeader } from '../Dashboard';
import { CheckCircleIcon, DocumentTextIcon, ExclamationCircleIcon, XCircleIcon } from '../Icons';

type Category = TenantTransaction['category'];
const BILL_CATEGORIES: Category[] = ['Rent', 'K-Electric Bill', 'Gas Bill', 'Water Bill'];

const TenantStatusDetail: React.FC<{ tenant: User }> = ({ tenant }) => {
    const { tenantTransactions } = useData();
    const [historyMonths, setHistoryMonths] = useState(() => {
        const months = new Set<string>();
        const today = new Date();
        // Show current month and last 2 months by default
        for (let i = 0; i < 3; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.add(date.toISOString().slice(0, 7));
        }
        tenantTransactions
            .filter(t => t.userId === tenant.id)
            .forEach(t => months.add(t.month));
            
        return Array.from(months).sort().reverse();
    });

    const StatusIndicator: React.FC<{ status: 'Clear' | 'Pending' | 'Defaulter' }> = ({ status }) => {
        const styles = {
            Clear: { icon: <CheckCircleIcon className="w-5 h-5 text-green-500" />, text: 'text-green-600', bg: 'bg-green-100' },
            Pending: { icon: <ExclamationCircleIcon className="w-5 h-5 text-amber-500" />, text: 'text-amber-600', bg: 'bg-amber-100' },
            Defaulter: { icon: <XCircleIcon className="w-5 h-5 text-red-500" />, text: 'text-red-600', bg: 'bg-red-100' },
        };
        const style = styles[status];
        return (
            <div className={`flex items-center space-x-2 px-2 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                {style.icon}
                <span>{status}</span>
            </div>
        );
    };

    const handleViewProof = (tx?: TenantTransaction) => {
        if (tx?.proofDocument) {
            window.dispatchEvent(new CustomEvent('viewfile', { detail: { data: tx.proofDocument, name: `${tx.category} for ${tx.month}` } }));
        }
    };
    
    return (
        <div className="mt-4">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Monthly History</h3>
            <div className="space-y-4">
                {historyMonths.map(month => {
                    const monthTransactions = tenantTransactions.filter(t => t.userId === tenant.id && t.month === month);
                    const currentMonth = new Date().toISOString().slice(0, 7);
                    const isPastMonth = month < currentMonth;

                    return (
                        <Card key={month} title={new Date(month + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}>
                             <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {BILL_CATEGORIES.map(category => {
                                    const tx = monthTransactions.find(t => t.category === category);
                                    let status: 'Clear' | 'Pending' | 'Defaulter' = 'Pending';
                                    if(tx) status = 'Clear';
                                    else if(isPastMonth) status = 'Defaulter';

                                    return (
                                        <div key={category} className="text-center p-3 bg-slate-50 rounded-lg">
                                            <p className="font-semibold text-slate-700 text-sm">{category}</p>
                                            <div className="my-2 flex justify-center"><StatusIndicator status={status} /></div>
                                            {tx?.proofDocument && (
                                                <button onClick={() => handleViewProof(tx)} className="text-xs text-brand-600 hover:underline">View Proof</button>
                                            )}
                                        </div>
                                    )
                                })}
                             </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
};


const TenantsPage: React.FC<{ currentUser: User, showToast: (message: string) => void }> = ({ currentUser, showToast }) => {
    const { users } = useData();
    const [selectedTenant, setSelectedTenant] = useState<User | null>(null);

    const tenants = useMemo(() => users.filter(u => u.residentType === 'Tenant'), [users]);
    
    return (
        <div>
            <PageHeader title="Tenant Management" subtitle="Oversee tenant bill payments and rent records." />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1">
                    <Card title="All Tenants">
                        <div className="space-y-2">
                            {tenants.map(tenant => {
                                const isSelected = selectedTenant?.id === tenant.id;
                                return (
                                <button key={tenant.id} onClick={() => setSelectedTenant(tenant)}
                                    className={`w-full text-left p-3 rounded-lg transition-colors ${isSelected ? 'bg-brand-600 shadow' : 'bg-slate-100 hover:bg-slate-200'}`}
                                >
                                    <p className={`font-bold ${isSelected ? 'text-white' : 'text-slate-800'}`}>{tenant.tenantName || tenant.ownerName}</p>
                                    <p className={`text-sm ${isSelected ? 'text-brand-100' : 'text-slate-500'}`}>Flat {tenant.id.replace(/own|tnt/i, '')}</p>
                                </button>
                                )
                            })}
                        </div>
                    </Card>
                </div>
                <div className="md:col-span-3">
                    <Card>
                        {selectedTenant ? (
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">{selectedTenant.tenantName || selectedTenant.ownerName}</h2>
                                <p className="text-slate-500 font-semibold">Flat {selectedTenant.id.replace(/own|tnt/i, '')} | {selectedTenant.contact}</p>
                                <TenantStatusDetail tenant={selectedTenant} />
                            </div>
                        ) : (
                           <div className="text-center py-12">
                             <DocumentTextIcon className="w-16 h-16 mx-auto text-slate-300" />
                             <h3 className="mt-2 text-xl font-semibold text-slate-700">Select a Tenant</h3>
                             <p className="mt-1 text-slate-500">Choose a tenant from the list to view their payment history.</p>
                           </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default TenantsPage;