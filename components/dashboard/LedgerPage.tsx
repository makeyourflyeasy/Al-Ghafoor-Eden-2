
import React, { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { Role, User } from '../../types';
import { Card, formatDate, formatCurrency, PageHeader } from '../Dashboard';
import { ArrowLeftIcon, DownloadIcon } from '../Icons';

const LedgerPage: React.FC<{
    initialParams: { flatId?: string; fromPage?: string } | null;
    currentUser: User;
    onBack?: (page: string) => void;
}> = ({ initialParams, currentUser, onBack }) => {
    const { flats, payments } = useData();
    const isResident = currentUser.role === Role.Resident;
    
    const [selectedFlatId, setSelectedFlatId] = useState<string>(isResident ? currentUser.id.replace(/own|tnt/i, '') : (initialParams?.flatId || flats[0]?.id || ''));
    
    // Admin-specific state
    const [startDate, setStartDate] = useState<string>('2023-01-01');
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const allTransactions = useMemo(() => {
        const flat = flats.find(f => f.id === selectedFlatId);
        if (!flat) return [];
        
        const flatDues = flat.dues.map(d => ({ date: `${d.month}-01`, description: d.description, debit: d.amount, credit: 0, balance: 0 }));
        const flatPayments = payments.filter(p => p.flatId === selectedFlatId).map(p => ({ date: p.date, description: p.purpose, credit: p.amount, debit: 0, balance: 0 }));
        return [...flatDues, ...flatPayments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    }, [selectedFlatId, flats, payments]);
    
    const ledgerData = useMemo(() => {
        let runningBalance = 0;
        return allTransactions.map(t => {
            runningBalance += (t.credit || 0) - (t.debit || 0);
            return { ...t, balance: runningBalance };
        });
    }, [allTransactions]);
    
    const filteredLedgerData = useMemo(() => {
        if (isResident) {
            return ledgerData;
        }
        return ledgerData.filter(t => new Date(t.date) >= new Date(startDate) && new Date(t.date) <= new Date(endDate));
    }, [ledgerData, isResident, startDate, endDate]);

    const openingBalance = useMemo(() => {
        if (isResident) return 0;
        const firstTransactionDate = filteredLedgerData.length > 0 ? new Date(filteredLedgerData[0].date) : new Date();
        const firstTransactionIndex = ledgerData.findIndex(t => new Date(t.date) >= firstTransactionDate);
        return firstTransactionIndex > 0 ? ledgerData[firstTransactionIndex - 1].balance : 0;
    }, [filteredLedgerData, ledgerData, isResident]);

    const handleDownloadFullLedger = () => {
        const flat = flats.find(f => f.id === selectedFlatId);
        if(!flat) return;

        const bodyData = filteredLedgerData.map(item => [formatDate(item.date), item.description, item.debit ? item.debit.toLocaleString() : '', item.credit ? item.credit.toLocaleString() : '', item.balance.toLocaleString()]);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Professional Header with Building Details
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85); // Slate-700
        doc.text("AL GHAFOOR EDEN", 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105); // Slate-600
        doc.text("Plot No. 1/28, Block A Block 1 Nazimabad", 105, 26, { align: 'center' });
        doc.text("Karachi, 74600, Pakistan", 105, 31, { align: 'center' });
        doc.text("Union Committee Ledger", 105, 36, { align: 'center' });

        doc.setLineWidth(0.5);
        doc.setDrawColor(203, 213, 225); // Slate-300
        doc.line(14, 40, 196, 40);
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text(`Flat Ledger: ${flat.label}`, 14, 50);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(`Statement Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 56);

        (doc as any).autoTable({
            startY: 62,
            head: [['Date', 'Description', 'Debit (PKR)', 'Credit (PKR)', 'Balance (PKR)']],
            body: [['', 'Opening Balance', '', '', openingBalance.toLocaleString()], ...bodyData],
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85] }, // Titanium Slate Color
            styles: { fontSize: 9, cellPadding: 3 },
        });
        
        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184); // Slate-400
            doc.text('Al Ghafoor Eden - Union Committee', 14, 285);
            doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });
        }

        doc.save(`Ledger_${selectedFlatId}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleDownloadLastReceipt = () => {
        const myLastPayment = payments
            .filter(p => p.flatId === selectedFlatId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;

        if (!myLastPayment) return;
        
        const flat = flats.find(f => f.id === myLastPayment.flatId);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 140] });

        // Receipt Header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("AL GHAFOOR EDEN", 40, 15, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text("Plot No. 1/28, Block A Block 1", 40, 20, { align: 'center' });
        doc.text("Nazimabad, Karachi, 74600", 40, 24, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("Payment Receipt", 40, 32, { align: 'center' });

        doc.setLineWidth(0.2);
        doc.line(10, 36, 70, 36);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Receipt ID: ${myLastPayment.id}`, 10, 44);
        doc.text(`Date: ${formatDate(myLastPayment.date)}`, 10, 49);
        doc.line(10, 54, 70, 54);
        doc.text(`Flat No: ${flat?.label || myLastPayment.flatId}`, 10, 61);
        doc.text("Paid To: Union Committee", 10, 66);
        doc.line(10, 72, 70, 72);
        doc.setFont('helvetica', 'bold');
        doc.text("Purpose", 10, 79);
        doc.text("Amount", 70, 79, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(myLastPayment.purpose, 10, 86);
        doc.text(myLastPayment.amount.toLocaleString(), 70, 86, { align: 'right' });
        doc.line(10, 94, 70, 94);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text("Total Paid:", 10, 102);
        doc.text(`PKR ${myLastPayment.amount.toLocaleString()}`, 70, 102, { align: 'right' });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text("Thank you for your timely payment!", 40, 119, { align: 'center' });
        doc.text("Authorized Signature", 40, 129, { align: 'center' });

        doc.save(`Receipt_${myLastPayment.id}.pdf`);
    };

    return (
        <div>
            <PageHeader title={isResident ? "My Ledger" : `Ledger for ${flats.find(f => f.id === selectedFlatId)?.label || ''}`} subtitle={isResident ? "View your financial history." : "View a resident's financial history."}>
                 <div className="flex items-center space-x-2">
                    {initialParams?.fromPage && onBack && (
                         <button onClick={() => onBack(initialParams.fromPage!)} className="flex items-center bg-white text-slate-700 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-slate-200 shadow-md border border-slate-300"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Back</button>
                    )}
                    {isResident && (
                        <>
                        <button onClick={handleDownloadLastReceipt} className="flex items-center bg-white text-slate-700 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-slate-200 shadow-md border border-slate-300"><DownloadIcon className="w-5 h-5 mr-2" />Download Last Receipt</button>
                        <button onClick={handleDownloadFullLedger} className="flex items-center bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-slate-700 shadow-md"><DownloadIcon className="w-5 h-5 mr-2" />Download Full Ledger</button>
                        </>
                    )}
                </div>
            </PageHeader>
            {!isResident ? (
                 <Card>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Select Flat</label>
                            <select value={selectedFlatId} onChange={e => setSelectedFlatId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900">
                                {flats.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                            </select>
                        </div>
                        <div><label className="block text-sm font-medium text-slate-700">Start Date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full pl-3 pr-2 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900"/></div>
                        <div><label className="block text-sm font-medium text-slate-700">End Date</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full pl-3 pr-2 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900"/></div>
                        <button onClick={handleDownloadFullLedger} className="w-full flex items-center justify-center bg-brand-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-brand-700 shadow-md h-fit"><DownloadIcon className="w-5 h-5 mr-2" />Download PDF</button>
                    </div>
                </Card>
            ) : null}

            <div className="mt-6">
                <Card noPadding>
                     {/* Mobile View */}
                    <div className="md:hidden p-4 space-y-3 bg-slate-50">
                        {!isResident && (
                            <div className="flex justify-between items-center p-3 bg-slate-200 rounded-lg text-sm">
                                <span className="font-semibold text-slate-700">Opening Balance</span>
                                <span className="font-bold text-slate-800">{formatCurrency(openingBalance)}</span>
                            </div>
                        )}
                        {filteredLedgerData.map((item, index) => (
                            <div key={index} className="bg-white p-4 rounded-lg shadow-sm border-l-4" style={{ borderColor: item.credit ? '#10B981' : '#EF4444' }}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-slate-800">{item.description}</p>
                                        <p className="text-xs text-slate-500">{formatDate(item.date)}</p>
                                    </div>
                                    <p className={`font-bold text-lg ${item.credit ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(item.credit || item.debit)}</p>
                                </div>
                                <div className="text-right mt-2 pt-2 border-t border-slate-100">
                                    <p className="text-xs text-slate-500">Balance</p>
                                    <p className="font-semibold text-slate-700">{formatCurrency(item.balance)}</p>
                                </div>
                            </div>
                        ))}
                        {!isResident && (
                            <div className="flex justify-between items-center p-3 bg-slate-800 text-white rounded-lg text-sm">
                                <span className="font-bold">Closing Balance</span>
                                <span className="font-extrabold text-base">{formatCurrency(ledgerData[ledgerData.length - 1]?.balance ?? openingBalance)}</span>
                            </div>
                        )}
                    </div>

                    {/* Desktop View */}
                    <div className="overflow-x-auto hidden md:block">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-100"><tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Description</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Debit</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Credit</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Balance</th>
                            </tr></thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {!isResident && <tr className="font-semibold bg-slate-50"><td colSpan={4} className="px-6 py-3 text-right text-sm text-slate-700">Opening Balance</td><td className="px-6 py-3 text-right text-sm text-slate-700">{formatCurrency(openingBalance)}</td></tr>}
                                {filteredLedgerData.map((item, index) => (<tr key={index}>
                                    <td className="px-6 py-4">{formatDate(item.date)}</td>
                                    <td className="px-6 py-4 font-medium">{item.description}</td>
                                    <td className="px-6 py-4 text-right text-red-600">{item.debit ? formatCurrency(item.debit) : '-'}</td>
                                    <td className="px-6 py-4 text-right text-green-600">{item.credit ? formatCurrency(item.credit) : '-'}</td>
                                    <td className="px-6 py-4 font-semibold text-right">{formatCurrency(item.balance)}</td>
                                </tr>))}
                                 {!isResident && <tr className="font-bold bg-slate-100"><td colSpan={4} className="px-6 py-3 text-right text-sm text-slate-800">Closing Balance</td><td className="px-6 py-3 text-right text-sm text-slate-800">{formatCurrency(ledgerData[ledgerData.length - 1]?.balance ?? openingBalance)}</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default LedgerPage;
