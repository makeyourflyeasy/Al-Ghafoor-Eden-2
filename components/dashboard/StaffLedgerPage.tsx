import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { User } from '../../types';
import { Card, formatDate, formatCurrency, PageHeader } from '../Dashboard';
import { ArrowLeftIcon, ClockIcon } from '../Icons';


const StaffLedgerPage: React.FC<{ currentUser: User, onBack: () => void }> = ({ currentUser, onBack }) => {
    const { payments, expenses, cashTransfers } = useData();

    const { cashLedgerData, salaryTransactions, finalBalance } = useMemo(() => {
        const received = payments
            .filter(p => p.receivedBy === currentUser.id)
            .map(p => ({
                date: p.date,
                description: `Payment from Flat ${p.flatId}`,
                debit: 0,
                credit: p.amount,
                status: 'Confirmed' as const,
            }));

        const transferred = cashTransfers
            .filter(t => t.fromUserId === currentUser.id)
            .map(t => ({
                date: t.date,
                description: 'Cash Transferred to Accountant',
                debit: t.amount,
                credit: 0,
                status: t.status,
            }));

        const allCashTransactions = [...received, ...transferred]
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let runningBalance = 0;
        const cashLedgerData = allCashTransactions.map(t => {
            runningBalance += t.credit - t.debit;
            return { ...t, balance: runningBalance };
        });

        const salaryTransactions = expenses
            .filter(e => e.purpose === `${currentUser.ownerName} Salary`)
            .map(e => ({
                date: e.date,
                description: 'Monthly Salary',
                status: e.paid ? 'Paid' : 'Due',
                amount: e.amount
            }))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { cashLedgerData, salaryTransactions, finalBalance: runningBalance };
    }, [payments, cashTransfers, expenses, currentUser.id, currentUser.ownerName]);

    return (
        <div>
            <PageHeader title="My Ledger" subtitle={`Financial history for ${currentUser.ownerName}`}>
                 <button onClick={onBack} className="flex items-center bg-white text-slate-700 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-slate-200 shadow-md border border-slate-300"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Back to Dashboard</button>
            </PageHeader>
            <div className="space-y-6">
                <Card noPadding>
                    <div className="p-4 border-b">
                        <h3 className="text-lg font-bold text-slate-800">Cash Ledger (Union Funds)</h3>
                        <p className="text-sm text-slate-500">This ledger tracks cash you handle on behalf of the union.</p>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden p-4 space-y-3 bg-slate-50">
                         {cashLedgerData.length === 0 ? (
                            <div className="text-center p-8 text-slate-500">No cash transactions found.</div>
                        ) : (
                            cashLedgerData.map((item, i) => (
                                <div key={i} className="bg-white p-4 rounded-lg shadow-sm border-l-4" style={{ borderColor: item.credit ? '#10B981' : '#EF4444' }}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-slate-800">{item.description}</p>
                                            <p className="text-xs text-slate-500">{formatDate(item.date)}</p>
                                        </div>
                                        <p className={`font-bold text-lg ${item.credit ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(item.credit || item.debit)}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-100">
                                        <div>
                                            {item.status && (
                                                <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {item.status === 'Pending' && <ClockIcon className="w-3 h-3 mr-1" />}
                                                    {item.status}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500">Balance</p>
                                            <p className="font-semibold text-slate-700">{formatCurrency(item.balance)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div className="flex justify-between items-center p-3 bg-slate-800 text-white rounded-lg text-sm mt-3">
                            <span className="font-bold">Current Cash on Hand</span>
                            <span className="font-extrabold text-base">{formatCurrency(currentUser.cashOnHand || 0)}</span>
                        </div>
                    </div>

                    {/* Desktop View */}
                    <div className="overflow-x-auto hidden md:block"><table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-100"><tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Debit (Cash Out)</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Credit (Cash In)</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Balance</th>
                        </tr></thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {cashLedgerData.length === 0 ? (
                                <tr><td colSpan={6} className="text-center p-8 text-slate-500">No cash transactions found.</td></tr>
                            ) : (
                                cashLedgerData.map((t, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4 whitespace-nowrap">{formatDate(t.date)}</td>
                                        <td className="px-6 py-4 font-medium">{t.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {t.status && (
                                                <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${t.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {t.status === 'Pending' && <ClockIcon className="w-3 h-3 mr-1" />}
                                                    {t.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right text-red-600 whitespace-nowrap">{t.debit > 0 ? formatCurrency(t.debit) : '-'}</td>
                                        <td className="px-6 py-4 text-right text-green-600 whitespace-nowrap">{t.credit > 0 ? formatCurrency(t.credit) : '-'}</td>
                                        <td className="px-6 py-4 text-right font-semibold whitespace-nowrap">{formatCurrency(t.balance)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot className="bg-slate-800 text-white">
                            <tr>
                                <td colSpan={5} className="px-6 py-3 text-right font-bold text-sm">Current Cash on Hand</td>
                                <td className="px-6 py-3 text-right font-extrabold text-base">{formatCurrency(currentUser.cashOnHand || 0)}</td>
                            </tr>
                        </tfoot>
                     </table></div>
                </Card>

                <Card noPadding>
                    <div className="p-4 border-b">
                        <h3 className="text-lg font-bold text-slate-800">Salary Statement</h3>
                        <p className="text-sm text-slate-500">This statement shows your personal salary status.</p>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden p-4 space-y-3 bg-slate-50">
                        {salaryTransactions.length === 0 ? (
                           <div className="text-center p-8 text-slate-500">No salary records found.</div>
                        ) : (
                            salaryTransactions.map((t, i) => (
                                <div key={i} className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-slate-800">{t.description}</p>
                                        <p className="text-xs text-slate-500">{formatDate(t.date)}</p>
                                    </div>
                                    <div className="text-right">
                                         <p className="font-semibold text-lg text-slate-800">{formatCurrency(t.amount)}</p>
                                         <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${t.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {t.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    {/* Desktop View */}
                    <div className="overflow-x-auto hidden md:block"><table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-100"><tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Description</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Amount</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Status</th>
                        </tr></thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                             {salaryTransactions.length === 0 ? (
                                <tr><td colSpan={4} className="text-center p-8 text-slate-500">No salary records found.</td></tr>
                            ) : (
                                salaryTransactions.map((t, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4">{formatDate(t.date)}</td>
                                        <td className="px-6 py-4 font-medium">{t.description}</td>
                                        <td className="px-6 py-4 text-right font-semibold">{formatCurrency(t.amount)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${t.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {t.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                     </table></div>
                </Card>
            </div>
        </div>
    )
}

export default StaffLedgerPage;