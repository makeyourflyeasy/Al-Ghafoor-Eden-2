
import React, { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { User } from '../../types';
import { Card, formatDate, formatCurrency, PageHeader, Modal, CameraScanModal, processFileForStorage } from '../Dashboard';
import { ArrowLeftIcon, ClockIcon, PlusCircleIcon, CameraIcon, ReceiptTaxIcon, CheckCircleIcon, XCircleIcon, ExclamationCircleIcon } from '../Icons';


const StaffLedgerPage: React.FC<{ currentUser: User, onBack: () => void, showToast: (msg: string, type?: 'success'|'error') => void }> = ({ currentUser, onBack, showToast }) => {
    const { payments, expenses, cashTransfers, handleAddPayable } = useData();
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [requestForm, setRequestForm] = useState({ purpose: '', amount: '', description: '', invoiceImg: '' });

    const { cashLedgerData, salaryTransactions, myExpenseRequests } = useMemo(() => {
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

        const myExpenseRequests = expenses
            .filter(e => e.requestedBy === currentUser.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { cashLedgerData, salaryTransactions, myExpenseRequests };
    }, [payments, cashTransfers, expenses, currentUser.id, currentUser.ownerName]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await processFileForStorage(e.target.files[0]);
            setRequestForm(prev => ({ ...prev, invoiceImg: base64 }));
        }
    };

    const handleCapture = async (file: File) => {
        const base64 = await processFileForStorage(file);
        setRequestForm(prev => ({ ...prev, invoiceImg: base64 }));
    };

    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await handleAddPayable({
                type: 'new',
                purpose: requestForm.purpose,
                amount: requestForm.amount,
                description: requestForm.description,
                invoiceImg: requestForm.invoiceImg
            }, currentUser.id);
            
            showToast('Expense request submitted for approval.');
            setShowRequestModal(false);
            setRequestForm({ purpose: '', amount: '', description: '', invoiceImg: '' });
        } catch (error) {
            console.error(error);
            showToast('Failed to submit request.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusColor = (status: string, paid: boolean) => {
        if (status === 'Objected') return { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircleIcon className="w-4 h-4 mr-1"/> };
        if (paid) return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircleIcon className="w-4 h-4 mr-1"/> };
        if (status === 'Confirmed') return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <CheckCircleIcon className="w-4 h-4 mr-1"/> };
        return { bg: 'bg-amber-100', text: 'text-amber-700', icon: <ClockIcon className="w-4 h-4 mr-1"/> };
    };

    return (
        <div>
            {showRequestModal && (
                <Modal onClose={() => setShowRequestModal(false)} title="Request Expense Reimbursement" size="md">
                    {showCamera && <CameraScanModal onClose={() => setShowCamera(false)} onCapture={handleCapture} />}
                    <form onSubmit={handleSubmitRequest}>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Purpose</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="e.g., Generator Fuel, Cleaning Supplies"
                                    value={requestForm.purpose} 
                                    onChange={e => setRequestForm({...requestForm, purpose: e.target.value})} 
                                    className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Amount (PKR)</label>
                                <input 
                                    type="number" 
                                    required 
                                    value={requestForm.amount} 
                                    onChange={e => setRequestForm({...requestForm, amount: e.target.value})} 
                                    className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Description / Details</label>
                                <textarea 
                                    rows={2} 
                                    value={requestForm.description} 
                                    onChange={e => setRequestForm({...requestForm, description: e.target.value})} 
                                    className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Receipt / Image (Optional)</label>
                                <div className="flex items-center space-x-2 mt-1">
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
                                    <button type="button" onClick={() => setShowCamera(true)} className="p-2 bg-brand-100 text-brand-700 rounded-full hover:bg-brand-200" title="Scan with Camera">
                                        <CameraIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                {requestForm.invoiceImg && <p className="text-xs text-green-600 mt-1 font-semibold">Image Attached</p>}
                            </div>
                        </div>
                        <div className="bg-slate-200 px-6 py-4 text-right rounded-b-lg">
                            <button type="button" onClick={() => setShowRequestModal(false)} className="mr-3 px-4 py-2 text-sm font-bold text-slate-700 bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-bold text-white bg-brand-600 border-2 border-brand-600 rounded-lg hover:bg-brand-700 disabled:bg-slate-400">
                                {isSubmitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            <PageHeader title="My Ledger" subtitle={`Financial history for ${currentUser.ownerName}`}>
                 <div className="flex flex-wrap gap-2">
                    <button onClick={() => setShowRequestModal(true)} className="flex items-center bg-brand-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-brand-700 shadow-md">
                        <PlusCircleIcon className="w-5 h-5 mr-2" /> Request Expense
                    </button>
                    <button onClick={onBack} className="flex items-center bg-white text-slate-700 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-slate-200 shadow-md border border-slate-300">
                        <ArrowLeftIcon className="w-5 h-5 mr-2" /> Back
                    </button>
                 </div>
            </PageHeader>
            <div className="space-y-6">
                
                {/* Expense Claims Section */}
                <Card noPadding>
                    <div className="p-4 border-b">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center">
                            <ReceiptTaxIcon className="w-5 h-5 mr-2 text-slate-500" />
                            My Expense Claims
                        </h3>
                        <p className="text-sm text-slate-500">Track the status of reimbursement requests you have submitted.</p>
                    </div>
                    
                    {myExpenseRequests.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 italic">No expense requests found.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {myExpenseRequests.map(exp => {
                                const statusStyle = getStatusColor(exp.status, exp.paid);
                                return (
                                    <div key={exp.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-bold text-slate-800">{exp.purpose}</p>
                                                <p className="text-xs text-slate-500">{formatDate(exp.date)} &bull; {exp.id}</p>
                                            </div>
                                            <p className="font-bold text-slate-800">{formatCurrency(exp.amount)}</p>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                                                {statusStyle.icon}
                                                {exp.paid ? 'Paid' : exp.status}
                                            </span>
                                            {exp.paidBy && <span className="text-xs text-slate-400">Paid by Accountant</span>}
                                        </div>
                                        {exp.remarks && <p className="text-xs text-slate-600 mt-2 bg-slate-100 p-2 rounded">{exp.remarks}</p>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>

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
