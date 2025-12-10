




import React, { useMemo, useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { Dues, DuesStatus, Expense, Loan, Payment, Role, User, RecurringExpense } from '../../types';
import { Card, processFileForStorage, formatCurrency, formatDate, Modal, PageHeader, CameraScanModal, base64ToFile } from '../Dashboard';
import { CheckCircleIcon, DownloadIcon, PencilIcon, PlusCircleIcon, PrintIcon, ReceiptTaxIcon, TrashIcon, XCircleIcon, SparklesIcon, ClockIcon, CameraIcon } from '../Icons';
import { GoogleGenAI, Type } from "@google/genai";

const PaymentReceiptModal: React.FC<{
    payment: Payment;
    onClose: () => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}> = ({ payment, onClose, showToast }) => {
    const { flats, users } = useData();
    const flat = flats.find(f => f.id === payment.flatId);
    
    const getDuesSummary = (flat: any) => {
        if (!flat || !flat.dues) return { totalPending: 0 };
        const pendingDues = flat.dues.filter((d: any) => d.status === DuesStatus.Pending || d.status === DuesStatus.Partial);
        const totalPending = pendingDues.reduce((sum: number, due: any) => sum + (due.amount - due.paidAmount), 0);
        return { totalPending };
    };

    const { totalPending } = flat ? getDuesSummary(flat) : { totalPending: 0 };
    const advanceBalance = flat?.advanceBalance || 0;
    const receivedBy = users.find(u => u.id === payment.receivedBy)?.ownerName || payment.receivedBy;

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        showToast('Generating Receipt PDF...');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 140] }); // Small receipt format

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
        doc.text(`Receipt ID: ${payment.id}`, 10, 44);
        doc.text(`Date: ${formatDate(payment.date)}`, 10, 49);
        doc.line(10, 54, 70, 54);
        doc.text(`Flat No: ${flat?.label || payment.flatId}`, 10, 61);
        doc.text("Paid To: Union Committee", 10, 66);
        doc.line(10, 72, 70, 72);
        
        // Table Header
        doc.setFont('helvetica', 'bold');
        doc.text("Purpose", 10, 79);
        doc.text("Amount", 70, 79, { align: 'right' });
        
        // Table Body
        doc.setFont('helvetica', 'normal');
        doc.text(payment.purpose, 10, 86);
        doc.text(payment.amount.toLocaleString(), 70, 86, { align: 'right' });
        
        doc.line(10, 94, 70, 94);
        
        // Total
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text("Total Paid:", 10, 102);
        doc.text(`PKR ${payment.amount.toLocaleString()}`, 70, 102, { align: 'right' });
        
        // Footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text("Thank you for your timely payment!", 40, 119, { align: 'center' });
        doc.text("Authorized Signature", 40, 129, { align: 'center' });

        doc.save(`Receipt_${payment.id}.pdf`);
    };
    
    const getSummaryDetails = () => {
        if (totalPending > 0) {
            return {
                text: `Dues Remaining: ${formatCurrency(totalPending)}`,
                bgColor: 'bg-amber-100',
                textColor: 'text-amber-800',
            };
        }
        if (advanceBalance > 0) {
            return {
                text: `New Advance Balance: ${formatCurrency(advanceBalance)}`,
                bgColor: 'bg-green-100',
                textColor: 'text-green-800',
            };
        }
        return {
            text: "All Dues Cleared",
            bgColor: 'bg-green-100',
            textColor: 'text-green-800',
        };
    };

    const summaryDetails = getSummaryDetails();
    const breakdownItems = payment.breakdown && payment.breakdown.length > 0 ? payment.breakdown : [{ description: payment.remarks || payment.purpose, amount: payment.amount }];

    return (
        <Modal onClose={onClose} title="Payment Receipt" size="md" zIndexClass="z-[150]">
            <div>
                <div id="printable-receipt" className="p-6 bg-white text-slate-900">
                    <div className="text-center mb-2">
                        <ReceiptTaxIcon className="w-12 h-12 mx-auto text-brand-600" />
                        <h2 className="font-bold text-xl mt-2">AL GHAFOOR EDEN</h2>
                        <p className="text-xs text-slate-500">Plot No. 1/28, Block A Block 1 Nazimabad</p>
                        <p className="text-xs text-slate-500">Karachi, 74600, Pakistan</p>
                    </div>
                    <hr className="border-slate-200 my-4"/>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-6">
                        <div><strong>Receipt ID:</strong> {payment.id}</div>
                        <div className="text-right"><strong>Date:</strong> {formatDate(payment.date)}</div>
                        <div><strong>Flat No:</strong> {flat?.label}</div>
                        <div className="text-right"><strong>Received By:</strong> {receivedBy}</div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg border">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600 border-b pb-2 mb-3">Payment Details</h3>
                        <div className="space-y-2 text-sm">
                            {breakdownItems.map((item, index) => (
                                <div key={index} className="flex justify-between items-center">
                                    <span className="text-slate-700">{item.description}</span>
                                    <span className="font-semibold text-slate-800">{formatCurrency(item.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="border-t-2 border-slate-200 mt-6 pt-4">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-base font-semibold text-slate-600">Total Amount Paid</span>
                            <span className="text-2xl font-bold text-slate-900">{formatCurrency(payment.amount)}</span>
                        </div>
                        
                        <div className={`p-3 rounded-lg text-center ${summaryDetails.bgColor}`}>
                            <p className={`font-bold text-base ${summaryDetails.textColor}`}>{summaryDetails.text}</p>
                        </div>
                    </div>

                    {payment.remarks && (
                        <div className="mt-4 pt-4 border-t">
                             <p className="text-xs text-slate-500 font-semibold">Remarks:</p>
                             <p className="text-sm text-slate-700">{payment.remarks}</p>
                        </div>
                    )}
                    <div className="mt-8 pt-4 border-t border-dashed border-slate-300 flex justify-between items-end">
                         <div className="text-xs text-slate-400">System Generated</div>
                         <div className="text-right">
                             <div className="h-8 border-b border-slate-300 w-32 mb-1"></div>
                             <p className="text-xs text-slate-500">Authorized Signature</p>
                         </div>
                    </div>
                </div>
            </div>
            <div className="p-4 bg-slate-100 flex justify-end space-x-2 rounded-b-lg">
                <button onClick={handlePrint} className="flex items-center bg-white text-slate-700 px-4 py-2 rounded-lg font-semibold text-sm border border-slate-300 hover:bg-slate-50 shadow-sm"><PrintIcon className="w-5 h-5 mr-2" />Print</button>
                <button onClick={handleDownload} className="flex items-center bg-brand-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-brand-700 shadow-sm"><DownloadIcon className="w-5 h-5 mr-2" />Download PDF</button>
            </div>
        </Modal>
    );
};

const AddPaymentModal: React.FC<{
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}> = ({ onClose, onSubmit }) => {
    const { flats } = useData();
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        purpose: 'Maintenance',
        flatId: '',
        amount: '',
        description: '',
        otherPurpose: '',
        dueDate: ''
    });
    const [totalDues, setTotalDues] = useState<number | null>(null);

    const flatOptions = useMemo(() => flats.map(f => ({ value: f.id, label: f.label })).sort((a, b) => a.label.localeCompare(b.label)), [flats]);

    const getDuesSummary = (flat: any) => {
        if (!flat || !flat.dues) return { totalPending: 0 };
        const pendingDues = flat.dues.filter((d: any) => d.status === DuesStatus.Pending || d.status === DuesStatus.Partial);
        const totalPending = pendingDues.reduce((sum: number, due: any) => sum + (due.amount - due.paidAmount), 0);
        return { totalPending };
    };

    React.useEffect(() => {
        if (formData.flatId && formData.purpose === 'Maintenance') {
            const flat = flats.find(f => f.id === formData.flatId);
            if (flat) {
                const { totalPending } = getDuesSummary(flat);
                setTotalDues(totalPending);
            }
        } else {
            setTotalDues(null);
        }
    }, [formData.flatId, formData.purpose, flats]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalData = { ...formData };
        if (formData.purpose === 'Other' && formData.otherPurpose.trim()) {
            finalData.purpose = formData.otherPurpose.trim();
        }
        onSubmit(finalData);
    };

    return (
        <Modal onClose={onClose} title="Add Payment" size="lg">
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Date</label>
                        <input type="date" name="date" required value={formData.date} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">From (Property/Person)</label>
                        <select name="flatId" required value={formData.flatId} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900">
                            <option value="">Select Property...</option>
                            {flatOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                    </div>

                    {totalDues !== null && (
                        <div className="p-4 bg-slate-200 rounded-lg space-y-2">
                            <div className="flex justify-between items-center">
                                <p className="font-semibold text-slate-700">Total Pending Dues</p>
                                <p className="font-bold text-lg text-red-600">{formatCurrency(totalDues)}</p>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="font-semibold text-slate-700">Remaining Balance</p>
                                <p className="font-bold text-lg text-green-600">
                                    {formatCurrency(totalDues - (parseFloat(formData.amount) || 0))}
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Purpose</label>
                        <select name="purpose" required value={formData.purpose} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900">
                            <option>Maintenance</option>
                            <option>New Tenant Entry Charge</option>
                            <option>Building Support</option>
                            <option>Fine</option>
                            <option>Loan Received</option>
                            <option>Other</option>
                        </select>
                    </div>

                    {formData.purpose === 'Loan Received' && (
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Loan Due Date</label>
                            <input type="date" name="dueDate" required value={formData.dueDate} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900"/>
                        </div>
                    )}
                    
                    {formData.purpose === 'Other' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Specify Purpose</label>
                            <input name="otherPurpose" type="text" required value={formData.otherPurpose} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Amount</label>
                        <input name="amount" type="number" required value={formData.amount} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700">Description / Remarks (Optional)</label>
                        <textarea name="description" rows={2} value={formData.description} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" />
                    </div>
                </div>
                 <div className="bg-slate-200 px-6 py-4 text-right rounded-b-lg">
                    <button type="button" onClick={onClose} className="mr-3 px-4 py-2 text-sm font-bold text-slate-700 bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-green-600 border-2 border-green-600 rounded-lg hover:bg-green-700">Add Payment</button>
                </div>
            </form>
        </Modal>
    );
};

const PayPayableModal: React.FC<{
    onClose: () => void;
    onSubmit: (itemId: string, itemType: string, paidBy: string, paymentDate: string) => void;
    buildingTotalCash: number;
}> = ({ onClose, onSubmit, buildingTotalCash }) => {
    const { expenses, loans, users } = useData();
    const [selectedPayableId, setSelectedPayableId] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    
    const payables = useMemo(() => {
        const expensePayables = expenses
            .filter(e => !e.paid && e.status === 'Confirmed')
            .map(e => ({
                id: e.id,
                label: `${e.purpose} - ${formatCurrency(e.amount)}`,
                amount: e.amount,
                type: 'expense',
                remarks: e.remarks,
            }));
        
        const loanPayables = loans
            .filter(l => l.type === 'Received' && l.status === 'Pending')
            .map(l => ({
                id: l.id,
                label: `Loan repayment to ${l.personName} - ${formatCurrency(l.amount)}`,
                amount: l.amount,
                type: 'loan',
                remarks: l.description,
            }));

        return [...expensePayables, ...loanPayables];
    }, [expenses, loans]);
    
    const accountant = useMemo(() => users.find(u => u.role === Role.Accountant), [users]);
    const selectedItemDetails = useMemo(() => payables.find(p => p.id === selectedPayableId), [payables, selectedPayableId]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountant || !selectedItemDetails) {
            alert('Accountant user or selected item not found. Cannot process payment.');
            return;
        }
        if (buildingTotalCash < selectedItemDetails.amount) {
            alert('یہ انٹری نہیں ہو سکتی کیونکہ پیسے پورے نہیں ہیں');
            return;
        }
        onSubmit(selectedItemDetails.id, selectedItemDetails.type, accountant.id, paymentDate);
    };

    const canPay = selectedItemDetails && buildingTotalCash >= selectedItemDetails.amount;
    
    return (
        <Modal onClose={onClose} title="Pay Payable" size="lg">
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Date of Payment</label>
                        <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Expense/Loan to Pay</label>
                        <select required value={selectedPayableId} onChange={e => setSelectedPayableId(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900">
                            <option value="">Select Payable...</option>
                            {payables.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                    </div>

                    {selectedItemDetails && (
                        <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 space-y-3 animate-fadeIn">
                            <h4 className="font-bold text-slate-800">Item Details</h4>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold text-slate-600">Details:</span>
                                <span className="font-medium text-slate-800 text-right">{selectedItemDetails.label}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold text-slate-600">Amount:</span>
                                <span className="font-bold text-lg text-red-600">{formatCurrency(selectedItemDetails.amount)}</span>
                            </div>
                             <div className="pt-3 border-t">
                                <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t">
                                    <span className="font-bold text-slate-600">Building's Total Cash Balance:</span>
                                    <span className="font-bold text-lg text-green-600">{formatCurrency(buildingTotalCash)}</span>
                                </div>
                            </div>
                            {!canPay && (
                                <div className="p-3 bg-red-100 text-red-800 rounded-md text-sm font-semibold text-center">
                                    Insufficient cash on hand to pay this expense. The "Mark as Paid" button is disabled.
                                </div>
                            )}
                            {selectedItemDetails.remarks && (
                                <div className="text-sm">
                                    <span className="font-semibold text-slate-600">Remarks:</span>
                                    <p className="text-slate-700 bg-white p-2 rounded-md mt-1">{selectedItemDetails.remarks}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                 <div className="bg-slate-200 px-6 py-4 text-right rounded-b-lg">
                    <button type="button" onClick={onClose} className="mr-3 px-4 py-2 text-sm font-bold text-slate-700 bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                    <button type="submit" disabled={!canPay || !selectedPayableId} className="px-4 py-2 text-sm font-bold text-white bg-red-600 border-2 border-red-600 rounded-lg hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed">Mark as Paid</button>
                </div>
            </form>
        </Modal>
    );
};

const AddPayableModal: React.FC<{ onClose: () => void; onSubmit: (data: any) => Promise<void>; showToast: (message: string, type?: 'success' | 'error') => void; }> = ({ onClose, onSubmit, showToast }) => {
    const { recurringExpenses, users } = useData();
    const [type, setType] = useState<'existing' | 'new' | 'loan'>('existing');
    const [selectedExpense, setSelectedExpense] = useState('');
    const [formData, setFormData] = useState<any>({});
    const [personId, setPersonId] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showCamera, setShowCamera] = useState(false);

    const peopleOptions = useMemo(() => [
        { id: 'other', ownerName: 'Other...' },
        ...users.filter(u => [Role.Resident, Role.Guard, Role.Sweeper].includes(u.role)),
    ].map(u => ({ value: u.id, label: u.id === 'other' ? 'Other...' : `${u.ownerName} (${u.id})` })), [users]);
    
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); const submissionData = { type, personId, ...formData }; if (type === 'existing') { submissionData.purpose = selectedExpense; } onSubmit(submissionData); };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setFormData((prev: any) => ({...prev, [name]: value})); };
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => { if(e.target.files && e.target.files[0]) { const base64 = await processFileForStorage(e.target.files[0]); setFormData((prev: any) => ({...prev, invoiceImg: base64})); } }
    
    const handleCapture = async (file: File) => {
        const base64 = await processFileForStorage(file);
        setFormData((prev: any) => ({...prev, invoiceImg: base64}));
    };

    const handleAnalyzeInvoice = async () => {
        const invoiceImg = formData.invoiceImg;
        if (!invoiceImg) { showToast("Please upload an image first.", "error"); return; }
        setIsAnalyzing(true);
        try {
            const [header, data] = invoiceImg.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [ { inlineData: { mimeType, data } }, { text: "Analyze this invoice. Return a JSON object: purpose (short string), amount (number), description (detailed items/vendor), date (YYYY-MM-DD)." } ],
                config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { purpose: { type: Type.STRING }, amount: { type: Type.NUMBER }, description: { type: Type.STRING }, date: { type: Type.STRING }, } } }
            });
            let jsonText = response.text;
            if (jsonText) {
                if (jsonText.startsWith('```json')) { jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, ''); } else if (jsonText.startsWith('```')) { jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, ''); }
                const result = JSON.parse(jsonText);
                setFormData((prev: any) => ({ ...prev, purpose: result.purpose || prev.purpose, amount: result.amount || prev.amount, description: result.description || prev.description, dueDate: result.date || prev.dueDate }));
                showToast("Invoice analyzed successfully!");
            }
        } catch (error) { console.error("AI Analysis failed", error); showToast("Failed to analyze invoice.", "error"); } finally { setIsAnalyzing(false); }
    };

    return (
        <Modal onClose={onClose} title="Add Payable" size="lg">
            {showCamera && <CameraScanModal onClose={() => setShowCamera(false)} onCapture={handleCapture} />}
            <form onSubmit={handleSubmit}>
                 <div className="p-6 space-y-4">
                    <div className="flex bg-slate-200 rounded-lg p-1">
                        <button type="button" onClick={() => setType('existing')} className={`w-1/3 p-2 rounded-md font-semibold ${type==='existing' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}>Recurring Expense</button>
                        <button type="button" onClick={() => setType('new')} className={`w-1/3 p-2 rounded-md font-semibold ${type==='new' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}>New Expense</button>
                        <button type="button" onClick={() => setType('loan')} className={`w-1/3 p-2 rounded-md font-semibold ${type==='loan' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}>Loan Paid Out</button>
                    </div>
                     <div><p className="text-sm text-slate-600">A new transaction ID will be automatically generated and sent for approval.</p></div>
                    {type === 'existing' ? (
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-slate-700">Expense Type</label><select required value={selectedExpense} onChange={e => setSelectedExpense(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900"><option value="">Select...</option>{recurringExpenses.map(r => <option key={r.purpose} value={r.purpose}>{r.purpose}</option>)}</select></div>
                             {selectedExpense && <div><label className="block text-sm font-medium text-slate-700">Amount</label><input type="number" name="amount" required onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>}
                             {selectedExpense === 'Water Bill' && <><div className="md:col-span-1"><label className="block text-sm font-medium text-slate-700">Previous Units</label><input type="number" name="previousUnits" onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div><div className="md:col-span-1"><label className="block text-sm font-medium text-slate-700">Current Units</label><input type="number" name="currentUnits" onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div></>}
                             {selectedExpense && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Bill Picture</label>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <input type="file" name="invoiceImg" accept="image/*,application/pdf" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
                                        <button type="button" onClick={() => setShowCamera(true)} className="p-2 bg-brand-100 text-brand-700 rounded-full hover:bg-brand-200" title="Scan with Camera">
                                            <CameraIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                             )}
                        </div>
                    ) : type === 'new' ? (
                         <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Invoice Picture (Optional)</label>
                                <div className="flex items-center space-x-2 mt-1">
                                    <input type="file" name="invoiceImg" accept="image/*,application/pdf" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
                                    <button type="button" onClick={() => setShowCamera(true)} className="p-2 bg-brand-100 text-brand-700 rounded-full hover:bg-brand-200" title="Scan with Camera">
                                        <CameraIcon className="w-5 h-5" />
                                    </button>
                                    {formData.invoiceImg && (<button type="button" onClick={handleAnalyzeInvoice} disabled={isAnalyzing} className="flex items-center px-3 py-2 bg-brand-100 text-brand-700 text-xs font-bold rounded-full hover:bg-brand-200 disabled:opacity-50 transition-colors">{isAnalyzing ? 'Analyzing...' : <><SparklesIcon className="w-4 h-4 mr-1"/> Auto-fill with AI</>}</button>)}
                                </div>
                            </div>
                            <div><label className="block text-sm font-medium text-slate-700">Payee Name</label><input type="text" name="payee" required value={formData.payee || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                            <div><label className="block text-sm font-medium text-slate-700">Purpose</label><input type="text" name="purpose" required value={formData.purpose || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                            <div><label className="block text-sm font-medium text-slate-700">Amount</label><input type="number" name="amount" required value={formData.amount || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                            <div><label className="block text-sm font-medium text-slate-700">Due Date (Optional)</label><input type="date" name="dueDate" value={formData.dueDate || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                            <div><label className="block text-sm font-medium text-slate-700">Description</label><textarea name="description" rows={2} value={formData.description || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                         </div>
                    ) : (
                         <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-slate-700">To</label><select required value={personId} onChange={e => setPersonId(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900"><option value="">Select Person...</option>{peopleOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
                            {personId === 'other' && <div><label className="block text-sm font-medium text-slate-700">Person's Name</label><input type="text" name="personName" required onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>}
                            <div><label className="block text-sm font-medium text-slate-700">Amount</label><input type="number" name="amount" required onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                            <div><label className="block text-sm font-medium text-slate-700">Due Date</label><input type="date" name="dueDate" required onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                            <div><label className="block text-sm font-medium text-slate-700">Description</label><textarea name="description" rows={2} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                        </div>
                    )}
                 </div>
                 <div className="bg-slate-200 px-6 py-4 text-right rounded-b-lg"><button type="button" onClick={onClose} className="mr-3 px-4 py-2 text-sm font-bold text-slate-700 bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button><button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-amber-600 border-2 border-amber-600 rounded-lg hover:bg-amber-700">Send for Approval</button></div>
            </form>
        </Modal>
    );
};

const AddReceivableModal: React.FC<{ onClose: () => void; onSubmit: (data: any) => void; }> = ({ onClose, onSubmit }) => {
    const { flats } = useData();
    const [applyTo, setApplyTo] = useState('specific');
    const [formData, setFormData] = useState({});
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit({applyTo, ...formData}); };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { const { name, value } = e.target; setFormData(prev => ({...prev, [name]: value})); };
    return (
        <Modal onClose={onClose} title="Add Receivable" size="lg">
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    <div><p className="text-sm text-slate-600">A new receivable due will be added to the selected properties' ledgers.</p></div>
                    <div><label className="block text-sm font-medium text-slate-700">Apply To</label><select value={applyTo} onChange={e => setApplyTo(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900"><option value="specific">A Specific Property</option><option value="all">All Properties</option><option value="flatsOnly">Only Residential Flats</option></select></div>
                    {applyTo === 'specific' && (<div><label className="block text-sm font-medium text-slate-700">Select Property</label><select name="flatId" required onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900"><option value="">Select...</option>{flats.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</select></div>)}
                     <div><label className="block text-sm font-medium text-slate-700">Purpose</label><select name="purpose" required onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900"><option value="">Select Purpose...</option><option>Maintenance</option><option>New Tenant Entry Charge</option><option>Building Support</option><option>Fine</option><option>Loan Refund</option><option>Other</option></select></div>
                    <div><label className="block text-sm font-medium text-slate-700">Amount (per unit)</label><input name="amount" type="number" required onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                    <div><label className="block text-sm font-medium text-slate-700">Description</label><textarea name="description" rows={2} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                </div>
                 <div className="bg-slate-200 px-6 py-4 text-right rounded-b-lg"><button type="button" onClick={onClose} className="mr-3 px-4 py-2 text-sm font-bold text-slate-700 bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button><button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-700">Add Receivable</button></div>
            </form>
        </Modal>
    );
};

const ExpenseDetailModal: React.FC<{ expense: Expense, onClose: () => void }> = ({ expense, onClose }) => {
    const { users } = useData();
    const handleViewInvoice = () => { if (expense.invoiceImg) { window.dispatchEvent(new CustomEvent('viewfile', { detail: { data: expense.invoiceImg, name: `Invoice for ${expense.purpose}` } })); } };
    const DetailRow: React.FC<{label:string, value?:string|number|null}> = ({label, value}) => value ? (<div className="flex justify-between items-center py-2 border-b border-slate-200"><p className="text-sm font-medium text-slate-500">{label}</p><p className="text-sm font-semibold text-slate-800 text-right">{value}</p></div>) : null;
    const paidBy = users.find(u => u.id === expense.paidBy)?.ownerName || expense.paidBy;
    const requestedBy = users.find(u => u.id === expense.requestedBy)?.ownerName || expense.requestedBy;
    const approvedBy = expense.approvedBy?.map(id => users.find(u => u.id === id)?.ownerName || id).join(', ');
    return (
        <Modal onClose={onClose} title="Expense Details" size="lg">
            <div className="p-6">
                <div className="text-center mb-4"><p className="text-sm text-slate-500">{expense.purpose}</p><p className="text-4xl font-bold text-slate-800">{formatCurrency(expense.amount)}</p><p className={`mt-1 text-sm font-bold ${expense.paid ? 'text-green-600' : 'text-amber-600'}`}>{expense.status}</p></div>
                <div className="bg-white p-4 rounded-lg border"><DetailRow label="Transaction ID" value={expense.id} /><DetailRow label="Date" value={formatDate(expense.date)} /><DetailRow label="Due Date" value={expense.dueDate ? formatDate(expense.dueDate) : 'N/A'} /><DetailRow label="Paid By" value={paidBy} /><DetailRow label="Requested By" value={requestedBy} /><DetailRow label="Approved By" value={approvedBy} /><DetailRow label="Remarks" value={expense.remarks} /></div>
                {expense.invoiceImg && (<div className="mt-4"><button onClick={handleViewInvoice} className="w-full text-center px-4 py-2 bg-brand-100 text-brand-700 font-semibold rounded-lg hover:bg-brand-200">View Attached Invoice</button></div>)}
            </div>
        </Modal>
    );
};

const LoanDetailModal: React.FC<{ loan: Loan, onClose: () => void }> = ({ loan, onClose }) => {
     const DetailRow: React.FC<{label:string, value?:string|number|null}> = ({label, value}) => value ? (<div className="flex justify-between items-center py-2 border-b border-slate-200"><p className="text-sm font-medium text-slate-500">{label}</p><p className="text-sm font-semibold text-slate-800 text-right">{value}</p></div>) : null;
    return (
        <Modal onClose={onClose} title="Loan Details" size="lg">
            <div className="p-6">
                 <div className="text-center mb-4"><p className="text-sm text-slate-500">{loan.type === 'Received' ? 'Loan Received From' : 'Loan Paid To'}: {loan.personName}</p><p className="text-4xl font-bold text-slate-800">{formatCurrency(loan.amount)}</p><p className={`mt-1 text-sm font-bold ${loan.status === 'Paid' ? 'text-green-600' : 'text-amber-600'}`}>{loan.status}</p></div>
                <div className="bg-white p-4 rounded-lg border"><DetailRow label="Transaction ID" value={loan.id} /><DetailRow label="Date" value={formatDate(loan.date)} /><DetailRow label="Due Date" value={formatDate(loan.dueDate)} /><DetailRow label="Description" value={loan.description} /></div>
            </div>
        </Modal>
    );
}

const EditTransactionModal: React.FC<{ transaction: Payment | Expense; onClose: () => void; onSave: (id: string, type: 'payment' | 'expense', data: { purpose: string, remarks?: string, amount: number, date: string }) => void; }> = ({ transaction, onClose, onSave }) => {
    const [purpose, setPurpose] = useState('purpose' in transaction ? transaction.purpose : '');
    const [remarks, setRemarks] = useState(transaction.remarks || '');
    const [amount, setAmount] = useState(transaction.amount.toString());
    const [date, setDate] = useState(new Date(transaction.date).toISOString().split('T')[0]);
    
    const type = 'flatId' in transaction ? 'payment' : 'expense';
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(transaction.id, type, { purpose, remarks, amount: parseFloat(amount), date }); };
    
    return (
        <Modal onClose={onClose} title={`Edit Transaction ${transaction.id}`} size="lg">
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    <div><label className="block text-sm font-medium text-slate-700">Purpose</label><input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                    <div><label className="block text-sm font-medium text-slate-700">Amount</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                    <div><label className="block text-sm font-medium text-slate-700">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                    <div><label className="block text-sm font-medium text-slate-700">Remarks</label><textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                </div>
                <div className="bg-slate-200 px-6 py-4 text-right rounded-b-lg"><button type="button" onClick={onClose} className="mr-3 px-4 py-2 text-sm font-bold text-slate-700 bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button><button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-brand-600 rounded-lg">Save Changes</button></div>
            </form>
        </Modal>
    );
};

const EditReceivableModal: React.FC<{ 
    data: {flatId: string, month: string, description: string, amount: number, dueDate: string, purpose: string}; 
    onClose: () => void; 
    onSave: (updatedData: {amount: number, description: string, dueDate: string}) => void;
}> = ({ data, onClose, onSave }) => {
    const [amount, setAmount] = useState(data.amount.toString());
    const [description, setDescription] = useState(data.purpose);
    const [dueDate, setDueDate] = useState(data.dueDate);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({amount: parseFloat(amount), description, dueDate});
    };

    return (
        <Modal onClose={onClose} title="Edit Receivable" size="md">
            <form onSubmit={handleSubmit}>
                 <div className="p-6 space-y-4">
                    <div><label className="block text-sm font-medium text-slate-700">Amount</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                    <div><label className="block text-sm font-medium text-slate-700">Description</label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                    <div><label className="block text-sm font-medium text-slate-700">Due Date (Reference)</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" /></div>
                </div>
                <div className="bg-slate-200 px-6 py-4 text-right rounded-b-lg"><button type="button" onClick={onClose} className="mr-3 px-4 py-2 text-sm font-bold text-slate-700 bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button><button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-brand-600 rounded-lg">Save Changes</button></div>
            </form>
        </Modal>
    );
};

const RejectionModal: React.FC<{ expense: Expense; onClose: () => void; onSubmit: (reason: string) => void; }> = ({ expense, onClose, onSubmit }) => {
    const [reason, setReason] = useState('');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!reason.trim()) { alert('Please provide a reason for rejection.'); return; } onSubmit(reason); };
    return (
        <Modal onClose={onClose} title={`Reject Expense: ${expense.purpose}`} size="lg">
            <form onSubmit={handleSubmit}>
                <div className="p-6"><label className="block text-sm font-medium text-slate-700">Reason for Rejection</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} required rows={4} className="mt-1 block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md text-slate-900" placeholder="e.g., Amount is too high, invoice is missing details..." /></div>
                <div className="bg-slate-200 px-6 py-4 text-right rounded-b-lg"><button type="button" onClick={onClose} className="mr-3 px-4 py-2 text-sm font-bold text-slate-700 bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button><button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg">Submit Rejection</button></div>
            </form>
        </Modal>
    );
};

const RecurringExpensesTab: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
    const { recurringExpenses, setRecurringExpenses } = useData();
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ purpose: '', amount: '' });
    const [showAddModal, setShowAddModal] = useState(false);

    const handleEdit = (index: number) => {
        setEditingIndex(index);
        setEditForm({ purpose: recurringExpenses[index].purpose, amount: recurringExpenses[index].amount.toString() });
    };

    const handleSaveEdit = (index: number) => {
        const newExpenses = [...recurringExpenses];
        newExpenses[index] = { purpose: editForm.purpose, amount: parseFloat(editForm.amount) };
        setRecurringExpenses(newExpenses);
        setEditingIndex(null);
    };

    const handleDelete = (index: number) => {
        if (window.confirm('Are you sure you want to delete this recurring expense?')) {
            const newExpenses = recurringExpenses.filter((_, i) => i !== index);
            setRecurringExpenses(newExpenses);
        }
    };

    const handleAdd = () => {
        if (!editForm.purpose || !editForm.amount) return;
        setRecurringExpenses([...recurringExpenses, { purpose: editForm.purpose, amount: parseFloat(editForm.amount) }]);
        setShowAddModal(false);
        setEditForm({ purpose: '', amount: '' });
    };

    return (
        <Card noPadding>
             {showAddModal && (
                <Modal onClose={() => setShowAddModal(false)} title="Add Recurring Expense" size="md">
                     <div className="p-6 space-y-4">
                        <input placeholder="Purpose (e.g., Lift Maintenance)" className="w-full p-2 border border-slate-300 rounded" value={editForm.purpose} onChange={e => setEditForm({...editForm, purpose: e.target.value})} />
                        <input type="number" placeholder="Amount (PKR)" className="w-full p-2 border border-slate-300 rounded" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} />
                    </div>
                    <div className="bg-slate-200 p-4 text-right">
                        <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Add</button>
                    </div>
                </Modal>
            )}

            <div className="p-4 flex justify-between items-center border-b">
                 <div>
                    <h3 className="font-bold text-slate-800">Recurring Monthly Expenses</h3>
                    <p className="text-sm text-slate-500">These items are automatically added to the Payable bill on the 1st of every month.</p>
                </div>
                {isAdmin && <button onClick={() => { setEditForm({purpose:'', amount:''}); setShowAddModal(true); }} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold text-sm hover:bg-blue-200"><PlusCircleIcon className="w-5 h-5 inline mr-1"/> Add Item</button>}
            </div>
            <div className="divide-y divide-slate-200">
                {recurringExpenses.map((item, index) => (
                    <div key={index} className="p-4 flex justify-between items-center hover:bg-slate-50">
                        {editingIndex === index ? (
                            <div className="flex-1 flex space-x-2">
                                <input className="border rounded px-2 py-1 w-1/2" value={editForm.purpose} onChange={e => setEditForm({...editForm, purpose: e.target.value})} />
                                <input className="border rounded px-2 py-1 w-1/4" type="number" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} />
                                <button onClick={() => handleSaveEdit(index)} className="text-green-600 font-bold text-sm">Save</button>
                                <button onClick={() => setEditingIndex(null)} className="text-slate-500 text-sm">Cancel</button>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <p className="font-medium text-slate-800">{item.purpose}</p>
                                    <p className="text-sm text-slate-500 font-semibold">{formatCurrency(item.amount)} / month</p>
                                </div>
                                {isAdmin && (
                                    <div className="flex space-x-2">
                                        <button onClick={() => handleEdit(index)} className="p-2 text-slate-400 hover:text-blue-600"><PencilIcon className="w-4 h-4"/></button>
                                        <button onClick={() => handleDelete(index)} className="p-2 text-slate-400 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>
        </Card>
    );
};


const ApprovalRequestsSection: React.FC<{ onApproval: (expenseId: string) => void, onReject: (expense: Expense) => void, currentUser: User, onTransactionSelect: (item: Expense) => void; }> = ({ onApproval, onReject, currentUser, onTransactionSelect }) => {
    const { expenses, users } = useData();
    const pending = useMemo(() => expenses.filter(e => e.status === 'Pending Approval' || e.status === 'Objected'), [expenses]);
    const getRequesterName = (userId?: string) => users.find(u => u.id === userId)?.ownerName || 'Unknown';
    if (pending.length === 0) { return (<Card><div className="text-center py-8"><CheckCircleIcon className="w-12 h-12 mx-auto text-green-400" /><h3 className="mt-2 text-xl font-semibold text-slate-700">All Clear!</h3><p className="mt-1 text-slate-500">There are no pending approval requests at the moment.</p></div></Card>); }
    return (
        <Card title="Approval Requests" noPadding>
            <div className="divide-y divide-slate-200">
                {pending.map(exp => {
                    const alreadyApproved = exp.approvedBy?.includes(currentUser.id);
                    const isObjected = exp.status === 'Objected';
                    return (
                        <div key={exp.id} className="p-4 hover:bg-slate-50">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                <div onClick={() => onTransactionSelect(exp)} className="cursor-pointer flex-1 mb-3 sm:mb-0"><p className="font-bold text-slate-800">{exp.purpose}</p><p className="text-sm text-slate-600">{formatCurrency(exp.amount)} requested by <span className="font-semibold">{getRequesterName(exp.requestedBy)}</span></p><p className="text-xs text-slate-400 mt-1">Approvers: {exp.approvedBy.map(id => users.find(u => u.id === id)?.ownerName).join(', ') || 'None'}</p>{isObjected && <p className="text-xs text-red-600 font-semibold mt-1">Status: REJECTED</p>}</div>
                                {!isObjected && (<div className="flex-shrink-0 flex items-center space-x-2"><button onClick={() => onReject(exp)} className="px-4 py-2 text-sm font-semibold bg-red-100 text-red-700 rounded-md hover:bg-red-200">Reject</button><button onClick={() => onApproval(exp.id)} disabled={alreadyApproved} className="px-4 py-2 text-sm font-semibold bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed">{alreadyApproved ? 'Approved' : 'Approve'}</button></div>)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};


const FinancePage: React.FC<{ currentUser: User, showToast: (message: string, type?: 'success' | 'error') => void }> = ({ currentUser, showToast }) => {
    const [activeTab, setActiveTab] = useState('buildingLedger');
    const { flats, setFlats, users, setUsers, payments, setPayments, expenses, setExpenses, handleExpenseApproval, handleRejectExpense, loans, setLoans, getNextTransactionId, handleAddPayable, handleUpdatePayment, handleDeletePayment, handleUpdateExpense, handleDeleteExpense, handleDeleteDue, handleDeleteLoan, handleUpdateDue, processPayment } = useData();
    const [showModal, setShowModal] = useState<string | null>(null);
    const [receiptData, setReceiptData] = useState<Payment | null>(null);
    const [viewingTransaction, setViewingTransaction] = useState<Payment | Expense | Loan | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<Payment | Expense | null>(null);
    const [rejectingExpense, setRejectingExpense] = useState<Expense | null>(null);
    const [editingReceivable, setEditingReceivable] = useState<{flatId: string, month: string, description: string, amount: number, dueDate: string, purpose: string} | null>(null);

    const isAdmin = currentUser.role === Role.Admin;
    const isAccountant = currentUser.role === Role.Accountant;
    const isChecker = currentUser.role === Role.AccountsChecker;

    const buildingTotalCash = useMemo(() => {
        const totalCredits = payments.reduce((sum, p) => sum + p.amount, 0);
        const totalDebits = expenses.filter(e => e.paid).reduce((sum, e) => sum + e.amount, 0);
        return totalCredits - totalDebits;
    }, [payments, expenses]);

    const handleAddPayment = async (formData: any): Promise<Payment | null> => {
        try {
            const amountPaid = parseFloat(formData.amount);
            const flatId = formData.flatId;
            const targetFlat = flats.find(f => f.id === flatId);

            if (!targetFlat) {
                showToast("Flat not found", "error");
                return null;
            }
            
            // Use shared logic from DataContext to handle dues breakdown
            const newPayment = processPayment({
                flatId,
                amount: amountPaid,
                date: new Date(formData.date).toISOString(),
                purpose: formData.purpose,
                description: formData.description,
                receiverId: currentUser.id
            });
            
            if (newPayment) {
                setShowModal(null);
                showToast('Payment added successfully!');
                return newPayment;
            }
            return null;
        } catch (error) {
            console.error("Error adding payment:", error);
            showToast("Failed to add payment.", "error");
            return null;
        }
    };
    
    const handleSubmitPayment = async (formData: any) => {
        if (formData.purpose === 'Loan Received') {
            const amount = parseFloat(formData.amount);
            const personId = formData.flatId;
            const person = users.find(u => u.id === personId) || flats.find(f => f.id === personId);
            if (!person) {
                showToast("Selected person/flat not found.", "error");
                return;
            }

            const personName = 'ownerName' in person ? person.ownerName : person.label;

            // 1. Create the Loan liability object
            const newLoan: Loan = {
                id: getNextTransactionId(),
                type: 'Received',
                personId: person.id,
                personName: personName,
                amount: amount,
                dueDate: new Date(formData.dueDate).toISOString(),
                date: new Date(formData.date).toISOString(),
                status: 'Pending',
                description: formData.description || `Loan received from ${personName}`
            };
            setLoans(prev => [newLoan, ...prev]);

            // 2. Create the Payment transaction for cash inflow
            const newPayment: Payment = {
                id: getNextTransactionId(),
                flatId: personId,
                amount: amount,
                date: new Date(formData.date).toISOString(),
                purpose: 'Loan Received',
                remarks: formData.description,
                status: 'Confirmed',
                receivedBy: currentUser.id,
                breakdown: [{ description: `Loan received from ${personName}`, amount: amount }]
            };
            setPayments(prev => [...prev, newPayment]);

            // 3. Update cash on hand for the current user
            setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, cashOnHand: (u.cashOnHand || 0) + amount } : u));
            setShowModal(null);
            showToast('Loan received and payment recorded successfully!');

        } else {
            // Existing logic for regular payments
            const payment = await handleAddPayment(formData);
            if (payment) {
                setReceiptData(payment);
            }
        }
    };

    const handleMakePayment = async (itemId: string, itemType: string, paidById: string, paymentDate: string) => {
        const processPayment = (amountToPay: number, purpose: string, id: string) => {
            if (buildingTotalCash < amountToPay) {
                showToast(`Insufficient total building cash (${formatCurrency(buildingTotalCash)}) for this payment.`, "error");
                return false;
            }

            let amountToDeduct = amountToPay;
            setUsers(prevUsers => {
                const newUsers = JSON.parse(JSON.stringify(prevUsers));
                const accountant = newUsers.find((u: User) => u.id === paidById);

                if (accountant) {
                    const accountantCash = accountant.cashOnHand || 0;
                    const deductionFromAccountant = Math.min(amountToDeduct, accountantCash);
                    accountant.cashOnHand = accountantCash - deductionFromAccountant;
                    amountToDeduct -= deductionFromAccountant;
                }

                if (amountToDeduct > 0) {
                    const guards = newUsers.filter((u: User) => u.role === Role.Guard).sort((a: User, b: User) => (b.cashOnHand || 0) - (a.cashOnHand || 0));
                    for (const guard of guards) {
                        if (amountToDeduct <= 0) break;
                        const guardCash = guard.cashOnHand || 0;
                        const deductionFromGuard = Math.min(amountToDeduct, guardCash);
                        guard.cashOnHand = guardCash - deductionFromGuard;
                        amountToDeduct -= deductionFromGuard;
                    }
                }
                
                return newUsers;
            });
            
            setShowModal(null);
            showToast(`${purpose} marked as paid.`);
            return true;
        };

        if (itemType === 'expense') {
            const expense = expenses.find(e => e.id === itemId);
            if(expense && processPayment(expense.amount, expense.purpose, expense.id)) {
                 setExpenses(prev => prev.map(e => e.id === expense.id ? {
                    ...e, 
                    paid: true, 
                    status: 'Paid', 
                    paidBy: paidById, 
                    date: new Date(paymentDate).toISOString() 
                 } : e));
            }
        } else if (itemType === 'loan') {
            const loan = loans.find(l => l.id === itemId);
            if (loan && processPayment(loan.amount, `Loan repayment to ${loan.personName}`, loan.id)) {
                setLoans(prev => prev.map(l => l.id === loan.id ? { ...l, status: 'Paid' } : l));
                const newExpense: Expense = {
                    id: getNextTransactionId(),
                    purpose: `Loan Repayment to ${loan.personName}`,
                    amount: loan.amount,
                    date: new Date(paymentDate).toISOString(),
                    paid: true,
                    status: 'Paid',
                    paidBy: paidById,
                    approvedBy: ['auto-approved'],
                    remarks: `Repayment of loan ID ${loan.id}`
                };
                setExpenses(prev => [...prev, newExpense]);
            }
        }
    };
    
    const handlePayableSubmit = async (formData: any) => {
        await handleAddPayable(formData, currentUser.id);
        
        if (formData.type === 'loan') {
            showToast('Loan request sent for approval.');
        } else if (formData.type === 'new') {
            showToast('New expense request sent for approval.');
        } else {
            showToast(`${formData.purpose} request sent for approval.`);
        }
        setShowModal(null);
    };
    
    const handleAddReceivable = (formData: any) => {
      const { purpose, description, amount, applyTo, flatId } = formData;
      const today = new Date();
      const newDue: Omit<Dues, 'month'> = {
        amount: parseFloat(amount),
        status: DuesStatus.Pending,
        paidAmount: 0,
        description: purpose === 'Other' ? (description || 'Charge') : purpose,
      };

      let affectedFlats: string[] = [];
      if (applyTo === 'all') {
        affectedFlats = flats.map(f => f.id);
      } else if (applyTo === 'flatsOnly') {
        affectedFlats = flats.filter(f => !isNaN(parseInt(f.id))).map(f => f.id);
      } else if (applyTo === 'specific' && flatId) {
        affectedFlats = [flatId];
      }
      
      setFlats(prev => prev.map(f => {
        if (affectedFlats.includes(f.id)) {
            const monthStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
            return { ...f, dues: [...f.dues, {...newDue, month: monthStr }] };
        }
        return f;
      }));
      
      setShowModal(null);
      showToast(`Receivable added to ${affectedFlats.length} properties.`);
    };

    const handleApprovalAction = (expenseId: string) => {
        handleExpenseApproval(expenseId, currentUser.id);
        showToast(`Request has been approved by you.`);
    };

    const handleRejectionSubmit = (reason: string) => {
        if (!rejectingExpense) return;
        handleRejectExpense(rejectingExpense.id, currentUser.id, reason);
        showToast('Request has been rejected.');
        setRejectingExpense(null);
    };

    const handleSaveEdit = (id: string, type: 'payment' | 'expense', data: { purpose: string, remarks?: string, amount: number, date: string }) => {
        if (type === 'payment') {
            handleUpdatePayment(id, { ...data, date: new Date(data.date).toISOString() });
        } else {
            handleUpdateExpense(id, { ...data, date: new Date(data.date).toISOString() });
        }
        showToast('Transaction updated successfully!');
        setEditingTransaction(null);
    };
    
    const handleDeleteTransaction = (item: Payment | Expense | Loan) => {
        let type: 'payment' | 'expense' | 'loan' = 'payment';
        if ('purpose' in item && !('flatId' in item)) type = 'expense';
        else if ('personId' in item) type = 'loan';
    
        if (type === 'payment' && window.confirm('Are you sure you want to delete this payment? This cannot be undone.')) {
            handleDeletePayment(item.id);
            showToast('Payment deleted.');
        } else if (type === 'expense' && window.confirm('Are you sure you want to delete this expense? This cannot be undone.')) {
            handleDeleteExpense(item.id);
            showToast('Expense deleted.');
        } else if (type === 'loan' && window.confirm('Are you sure you want to delete this loan entry? This cannot be undone.')) {
             handleDeleteLoan(item.id);
             showToast('Loan entry deleted.');
        }
    };
    
    const handleDeleteReceivable = (flatId: string, month: string, description: string) => {
        if (window.confirm('Are you sure you want to delete this receivable? This will affect the flat\'s balance.')) {
            handleDeleteDue(flatId, month, description);
            showToast('Receivable deleted.');
        }
    }

    const handleSaveReceivableEdit = (updatedData: {amount: number, description: string, dueDate: string}) => {
        if (editingReceivable) {
            handleUpdateDue(editingReceivable.flatId, editingReceivable.month, editingReceivable.description, {
                amount: updatedData.amount,
                description: updatedData.description,
            });
            showToast('Receivable updated successfully!');
            setEditingReceivable(null);
        }
    }

    return (
        <div>
            {showModal === 'addPayment' && <AddPaymentModal onClose={() => setShowModal(null)} onSubmit={handleSubmitPayment} />}
            {showModal === 'payPayable' && <PayPayableModal onClose={() => setShowModal(null)} onSubmit={handleMakePayment} buildingTotalCash={buildingTotalCash} />}
            {showModal === 'addPayable' && <AddPayableModal onClose={() => setShowModal(null)} onSubmit={handlePayableSubmit} showToast={showToast} />}
            {showModal === 'addReceivable' && <AddReceivableModal onClose={() => setShowModal(null)} onSubmit={handleAddReceivable} />}
            {receiptData && <PaymentReceiptModal payment={receiptData} onClose={() => setReceiptData(null)} showToast={showToast} />}
            {viewingTransaction && 'flatId' in viewingTransaction && viewingTransaction.status && <PaymentReceiptModal payment={viewingTransaction as Payment} onClose={() => setViewingTransaction(null)} showToast={showToast} />}
            {viewingTransaction && !('flatId' in viewingTransaction) && 'purpose' in viewingTransaction && <ExpenseDetailModal expense={viewingTransaction as Expense} onClose={() => setViewingTransaction(null)} />}
            {viewingTransaction && 'personId' in viewingTransaction && <LoanDetailModal loan={viewingTransaction as Loan} onClose={() => setViewingTransaction(null)} />}
            {editingTransaction && <EditTransactionModal transaction={editingTransaction} onClose={() => setEditingTransaction(null)} onSave={handleSaveEdit} />}
            {rejectingExpense && <RejectionModal expense={rejectingExpense} onClose={() => setRejectingExpense(null)} onSubmit={handleRejectionSubmit} />}
            {editingReceivable && <EditReceivableModal data={editingReceivable} onClose={() => setEditingReceivable(null)} onSave={handleSaveReceivableEdit} />}

            <PageHeader title="Finance Management" subtitle="Track all income and expenses.">
                {(isAdmin || isAccountant) && <button onClick={() => setShowModal('addPayment')} className="flex items-center bg-green-600 text-white px-3 py-2 rounded-lg font-semibold text-sm hover:bg-green-700 shadow-md"><PlusCircleIcon className="w-5 h-5 mr-2" />Add Payment</button>}
                {(isAdmin || isAccountant) && <button onClick={() => setShowModal('payPayable')} className="flex items-center bg-red-600 text-white px-3 py-2 rounded-lg font-semibold text-sm hover:bg-red-700 shadow-md"><PlusCircleIcon className="w-5 h-5 mr-2" />Pay Payable</button>}
                {(isAdmin || isAccountant) && <button onClick={() => setShowModal('addPayable')} className="flex items-center bg-amber-600 text-white px-3 py-2 rounded-lg font-semibold text-sm hover:bg-amber-700 shadow-md"><PlusCircleIcon className="w-5 h-5 mr-2" />Add Payable</button>}
                {(isAdmin || isAccountant) && <button onClick={() => setShowModal('addReceivable')} className="flex items-center bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 shadow-md"><PlusCircleIcon className="w-5 h-5 mr-2" />Add Receivable</button>}
            </PageHeader>
            
            {isChecker && <ApprovalRequestsSection onApproval={handleApprovalAction} onReject={setRejectingExpense} currentUser={currentUser} onTransactionSelect={setViewingTransaction} />}

            <div className="mt-8">
                <div className="mb-6 border-b border-slate-200">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto">
                        <button onClick={() => setActiveTab('buildingLedger')} className={`py-3 px-1 border-b-2 font-semibold text-sm whitespace-nowrap ${activeTab === 'buildingLedger' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>Building Ledger</button>
                        <button onClick={() => setActiveTab('receivables')} className={`py-3 px-1 border-b-2 font-semibold text-sm whitespace-nowrap ${activeTab === 'receivables' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>Receivables</button>
                        <button onClick={() => setActiveTab('payables')} className={`py-3 px-1 border-b-2 font-semibold text-sm whitespace-nowrap ${activeTab === 'payables' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>Payables</button>
                         {isAdmin && <button onClick={() => setActiveTab('recurring')} className={`py-3 px-1 border-b-2 font-semibold text-sm whitespace-nowrap ${activeTab === 'recurring' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>Recurring Expenses</button>}
                    </nav>
                </div>
                
                <div key={activeTab} className="animate-fadeIn">
                  {activeTab === 'buildingLedger' && <BuildingLedgerTab onTransactionSelect={setViewingTransaction} onEdit={setEditingTransaction} onDelete={handleDeleteTransaction} isAdmin={isAdmin}/>}
                  {activeTab === 'receivables' && <ReceivablesTab onDelete={handleDeleteReceivable} onEdit={setEditingReceivable} isAdmin={isAdmin} />}
                  {activeTab === 'payables' && <PayablesTab onTransactionSelect={setViewingTransaction} onEdit={setEditingTransaction} onDelete={handleDeleteTransaction} isAdmin={isAdmin}/>}
                  {activeTab === 'recurring' && isAdmin && <RecurringExpensesTab isAdmin={isAdmin} />}
                </div>
            </div>
        </div>
    );
};

const BuildingLedgerTab: React.FC<{ onTransactionSelect: (item: Payment | Expense) => void; onEdit: (item: Payment | Expense) => void; onDelete: (item: Payment | Expense) => void; isAdmin: boolean; }> = ({ onTransactionSelect, onEdit, onDelete, isAdmin }) => {
    const { payments, expenses, flats } = useData();
    const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [downloadPeriod, setDownloadPeriod] = useState<'currentMonth' | 'allTime' | 'custom'>('custom');

    const transactions = useMemo(() => {
        const getFlatLabel = (flatId: string) => flats.find(f => f.id === flatId)?.label || flatId;
        const allPayments = payments.map(p => ({
            date: p.date, id: p.id, details: p.purpose,
            description: p.remarks || `From: ${getFlatLabel(p.flatId)}`,
            debit: 0, credit: p.amount, type: 'payment' as const, original: p
        }));
        const paidExpenses = expenses.filter(e => e.paid).map(e => ({
            date: e.date, id: e.id, details: e.purpose,
            description: e.remarks || '',
            debit: e.amount, credit: 0, type: 'expense' as const, original: e
        }));
        
        return [...allPayments, ...paidExpenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [payments, expenses, flats]);

    const openingBalance = useMemo(() => transactions
        .filter(t => new Date(t.date) < new Date(startDate))
        .reduce((balance, t) => balance + t.credit - t.debit, 0), [transactions, startDate]);

    const filteredTransactions = useMemo(() => transactions
        .filter(t => {
            const tDate = new Date(t.date);
            const sDate = new Date(startDate);
            sDate.setHours(0,0,0,0);
            const eDate = new Date(endDate);
            eDate.setHours(23,59,59,999);
            return tDate >= sDate && tDate <= eDate
        }), [transactions, startDate, endDate]);
    
    let runningBalance = openingBalance;
    const ledgerData = filteredTransactions.map(t => {
        runningBalance += t.credit - t.debit;
        return { ...t, balance: runningBalance };
    });
    const closingBalance = ledgerData[ledgerData.length - 1]?.balance ?? openingBalance;

    const handleDownload = () => {
        let fromDate = new Date('2000-01-01');
        let toDate = new Date();
        if (downloadPeriod === 'currentMonth') {
            fromDate = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
        } else if (downloadPeriod === 'custom') {
            fromDate = new Date(startDate);
        }
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);

        const dataToDownload = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= fromDate && tDate <= toDate;
        });

        const downloadOpeningBalance = transactions
            .filter(t => new Date(t.date) < fromDate)
            .reduce((balance, t) => balance + t.credit - t.debit, 0);

        let runningBalanceForPdf = downloadOpeningBalance;
        const bodyData = dataToDownload.map(item => {
            runningBalanceForPdf += item.credit - item.debit;
            return [
                formatDate(item.date),
                item.id,
                item.details,
                item.description,
                item.debit ? formatCurrency(item.debit) : '',
                item.credit ? formatCurrency(item.credit) : '',
                formatCurrency(runningBalanceForPdf)
            ];
        });

        const downloadClosingBalance = runningBalanceForPdf;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Professional Header with Building Details
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text("AL GHAFOOR EDEN", 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text("Plot No. 1/28, Block A Block 1 Nazimabad", 105, 26, { align: 'center' });
        doc.text("Karachi, 74600, Pakistan", 105, 31, { align: 'center' });
        doc.text("Union Committee", 105, 36, { align: 'center' });

        doc.setLineWidth(0.5);
        doc.setDrawColor(203, 213, 225);
        doc.line(14, 40, 196, 40);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text("Building Ledger", 14, 50);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(`Period: ${formatDate(fromDate.toISOString())} to ${formatDate(toDate.toISOString())}`, 14, 56);
        doc.text(`Opening Balance: ${formatCurrency(downloadOpeningBalance)}`, 14, 62);
        doc.text(`Closing Balance: ${formatCurrency(downloadClosingBalance)}`, 14, 68);

        (doc as any).autoTable({
            startY: 74,
            head: [['Date', 'TXN ID', 'Details', 'Description', 'Debit', 'Credit', 'Balance']],
            body: bodyData,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [37, 47, 63], textColor: 255 },
            footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
            foot: [
                ['', '', '', 'Totals', formatCurrency(dataToDownload.reduce((s, i) => s + i.debit, 0)), formatCurrency(dataToDownload.reduce((s, i) => s + i.credit, 0)), ''],
            ]
        });

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text('Al Ghafoor Eden - Union Committee', 14, 285);
            doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });
        }

        doc.save(`BuildingLedger_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <Card noPadding>
          <div className="p-4 border-b">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div><label className="block text-sm font-medium text-slate-700">Start Date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full pl-3 pr-2 py-2 bg-white border-2 border-slate-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md text-slate-900"/></div>
                <div><label className="block text-sm font-medium text-slate-700">End Date</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full pl-3 pr-2 py-2 bg-white border-2 border-slate-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md text-slate-900"/></div>
                <div><label className="block text-sm font-medium text-slate-700">Download Period</label><select value={downloadPeriod} onChange={e => setDownloadPeriod(e.target.value as any)} className="mt-1 block w-full pl-3 pr-10 py-2 bg-white border-2 border-slate-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md text-slate-900"><option value="custom">Custom Date Range</option><option value="currentMonth">This Month</option><option value="allTime">All Time</option></select></div>
                <button onClick={handleDownload} className="flex items-center justify-center bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-slate-700 shadow-md h-fit"><DownloadIcon className="w-5 h-5 mr-2" />Download Ledger</button>
            </div>
          </div>

          {/* Mobile View */}
          <div className="md:hidden p-4 space-y-3 bg-slate-50">
            <div className="flex justify-between items-center p-3 bg-slate-200 rounded-lg text-sm">
                <span className="font-semibold text-slate-700">Opening Balance</span>
                <span className="font-bold text-slate-800">{formatCurrency(openingBalance)}</span>
            </div>
            {ledgerData.map((item) => (
              <div key={item.id} onClick={() => onTransactionSelect(item.original)} className="bg-white p-4 rounded-lg shadow-sm border-l-4 cursor-pointer" style={{ borderColor: item.credit ? '#10B981' : '#EF4444' }}>
                  <div className="flex justify-between items-start">
                      <div>
                          <p className="font-bold text-slate-800">{item.details}</p>
                          <p className="text-xs text-slate-500">{formatDate(item.date)} &bull; {item.id}</p>
                      </div>
                      <p className={`font-bold text-lg ${item.credit ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(item.credit || item.debit)}</p>
                  </div>
                  {item.description && <p className="text-sm text-slate-600 mt-2 pt-2 border-t border-slate-100">{item.description}</p>}
                  <div className="text-right mt-2">
                      <p className="text-xs text-slate-500">Balance</p>
                      <p className="font-semibold text-slate-700">{formatCurrency(item.balance)}</p>
                      {isAdmin && (
                        <div className="flex justify-end space-x-2 mt-2">
                            <button onClick={(e) => { e.stopPropagation(); onEdit(item.original); }} className="p-2 text-slate-500 hover:text-brand-600 bg-slate-100 rounded-md"><PencilIcon className="w-4 h-4"/></button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(item.original); }} className="p-2 text-slate-500 hover:text-red-600 bg-slate-100 rounded-md"><TrashIcon className="w-4 h-4"/></button>
                        </div>
                      )}
                  </div>
              </div>
            ))}
             <div className="flex justify-between items-center p-3 bg-slate-800 text-white rounded-lg text-sm">
                <span className="font-bold">Final Balance (Cash on Hand)</span>
                <span className="font-extrabold text-base">{formatCurrency(closingBalance)}</span>
            </div>
          </div>

          {/* Desktop View */}
          <div className="overflow-x-auto hidden md:block"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-100"><tr><th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Date</th><th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">TXN ID</th><th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Details</th><th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Description</th><th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Debit</th><th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Credit</th><th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Balance</th>{isAdmin && <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>}</tr></thead><tbody className="bg-white divide-y divide-slate-200"><tr className="font-semibold bg-slate-50"><td colSpan={isAdmin ? 7 : 6} className="px-6 py-3 text-right text-sm text-slate-700">Opening Balance</td><td className="px-6 py-3 text-right text-sm text-slate-700">{formatCurrency(openingBalance)}</td></tr>{ledgerData.map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => onTransactionSelect(item.original)}>{formatDate(item.date)}</td><td className="px-6 py-4 text-xs text-slate-500 cursor-pointer" onClick={() => onTransactionSelect(item.original)}>{item.id}</td><td className="px-6 py-4 font-medium cursor-pointer" onClick={() => onTransactionSelect(item.original)}>{item.details}</td><td className="px-6 py-4 text-sm text-slate-600 cursor-pointer" onClick={() => onTransactionSelect(item.original)}>{item.description}</td><td className="px-6 py-4 text-right text-red-600 whitespace-nowrap cursor-pointer" onClick={() => onTransactionSelect(item.original)}>{item.debit ? formatCurrency(item.debit) : '-'}</td><td className="px-6 py-4 text-right text-green-600 whitespace-nowrap cursor-pointer" onClick={() => onTransactionSelect(item.original)}>{item.credit ? formatCurrency(item.credit) : '-'}</td><td className="px-6 py-4 text-right font-semibold whitespace-nowrap cursor-pointer" onClick={() => onTransactionSelect(item.original)}>{formatCurrency(item.balance)}</td>{isAdmin && <td className="px-6 py-4 text-right text-sm font-medium"><button onClick={(e) => { e.stopPropagation(); onEdit(item.original); }} className="p-1 text-slate-500 hover:text-brand-600 mr-2"><PencilIcon className="w-5 h-5"/></button><button onClick={(e) => { e.stopPropagation(); onDelete(item.original); }} className="p-1 text-slate-500 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button></td>}</tr>)}<tr className="font-bold bg-slate-800 text-white"><td colSpan={isAdmin ? 7 : 6} className="px-6 py-3 text-right text-sm">Final Balance (Total Cash on Hand)</td><td className="px-6 py-3 text-right text-sm">{formatCurrency(closingBalance)}</td></tr></tbody></table></div>
        </Card>
    );
};

const ReceivablesTab: React.FC<{onDelete: (flatId: string, month: string, description: string) => void; onEdit: (data: any) => void; isAdmin: boolean;}> = ({ onDelete, onEdit, isAdmin }) => {
    const { flats, loans } = useData();
    
    // Explicitly defining types for the union to prevent TS errors
    interface BaseReceivable {
        id: string;
        from: string;
        purpose: string;
        amount: number;
        dueDate: string;
    }
    interface DueReceivable extends BaseReceivable {
        type: 'due';
        flatId: string;
        month: string;
        description: string;
    }
    interface LoanReceivable extends BaseReceivable {
        type: 'loan';
    }
    type Receivable = DueReceivable | LoanReceivable;

    const receivables: Receivable[] = useMemo(() => {
        const dueReceivables: DueReceivable[] = flats.flatMap(f => f.dues.filter(d => d.status === DuesStatus.Pending || d.status === DuesStatus.Partial).map(d => ({
            id: `${f.id}-${d.month}-${d.description}`, 
            flatId: f.id, 
            from: f.label, 
            purpose: d.description, 
            amount: d.amount - d.paidAmount, 
            dueDate: `${d.month}-28`, 
            month: d.month, 
            description: d.description, 
            type: 'due' as const 
        })));
        
        const loanReceivables: LoanReceivable[] = loans.filter(l => l.type === 'PaidOut' && l.status === 'Pending').map(l => ({
            id: l.id, 
            from: l.personName, 
            purpose: 'Loan Repayment', 
            amount: l.amount, 
            dueDate: l.dueDate, 
            type: 'loan' as const 
        }));
        
        return [...dueReceivables, ...loanReceivables].sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [flats, loans]);

    return (
        <Card noPadding>
            {/* Mobile View */}
            <div className="md:hidden p-4 space-y-3 bg-slate-50">
                {receivables.map(due => (
                    <div key={due.id} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-amber-500">
                        <div className="flex justify-between items-start">
                            <p className="font-bold text-slate-800">{due.from}</p>
                            <p className="font-bold text-lg text-amber-600">{formatCurrency(due.amount)}</p>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{due.purpose}</p>
                        <div className="flex justify-between items-end mt-2 pt-2 border-t">
                             <p className="text-xs text-slate-500">Due on: {formatDate(due.dueDate)}</p>
                             {isAdmin && due.type === 'due' && (
                                <div className="flex space-x-2">
                                    <button onClick={(e) => { e.stopPropagation(); onEdit(due); }} className="p-1 text-slate-500 hover:text-brand-600"><PencilIcon className="w-4 h-4"/></button>
                                    <button onClick={(e) => { e.stopPropagation(); onDelete(due.flatId, due.month, due.description); }} className="p-1 text-slate-500 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                             )}
                        </div>
                    </div>
                ))}
            </div>
            {/* Desktop View */}
            <div className="overflow-x-auto hidden md:block"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">From</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Purpose</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th><th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>{isAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>}</tr></thead><tbody className="bg-white divide-y divide-slate-200">{receivables.length === 0 && <tr><td colSpan={isAdmin?5:4} className="px-6 py-4 text-center text-slate-500">No pending receivables.</td></tr>}{receivables.map((due) => (<tr key={due.id} className="hover:bg-slate-50"><td className="px-6 py-4 font-medium text-slate-900">{due.from}</td><td className="px-6 py-4 text-slate-500">{due.purpose}</td><td className="px-6 py-4 text-slate-500">{formatDate(due.dueDate)}</td><td className="px-6 py-4 text-right font-bold text-amber-600">{formatCurrency(due.amount)}</td>{isAdmin && <td className="px-6 py-4 text-right flex justify-end space-x-2">{due.type === 'due' && <><button onClick={(e) => { e.stopPropagation(); onEdit(due); }} className="text-slate-400 hover:text-brand-600"><PencilIcon className="w-5 h-5"/></button><button onClick={(e) => { e.stopPropagation(); onDelete(due.flatId, due.month, due.description); }} className="text-slate-400 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button></>}</td>}</tr>))}</tbody></table></div>
        </Card>
    );
};

const PayablesTab: React.FC<{ onTransactionSelect: (item: any) => void; onEdit: (item: any) => void; onDelete: (item: any) => void; isAdmin: boolean; }> = ({ onTransactionSelect, onEdit, onDelete, isAdmin }) => {
    const { expenses, loans } = useData();
    const payables = useMemo(() => {
        const expensePayables = expenses.filter(e => !e.paid && e.status === 'Confirmed').map(e => ({
            ...e, type: 'expense', label: e.purpose, dueDateDisplay: e.dueDate ? formatDate(e.dueDate) : 'N/A'
        }));
        const loanPayables = loans.filter(l => l.type === 'Received' && l.status === 'Pending').map(l => ({
            ...l, type: 'loan', label: `Repayment to ${l.personName}`, dueDateDisplay: formatDate(l.dueDate)
        }));
        return [...expensePayables, ...loanPayables].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [expenses, loans]);

    return (
        <Card noPadding>
            {/* Mobile View */}
             <div className="md:hidden p-4 space-y-3 bg-slate-50">
                {payables.length === 0 && <p className="text-center text-slate-500">No pending payables.</p>}
                {payables.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500">
                        <div className="flex justify-between items-start">
                            <p className="font-bold text-slate-800">{item.label}</p>
                            <p className="font-bold text-lg text-red-600">{formatCurrency(item.amount)}</p>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Due: {item.dueDateDisplay}</p>
                        {isAdmin && (
                            <div className="flex justify-end space-x-2 mt-2 border-t pt-2">
                                <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-1 text-slate-500 hover:text-brand-600"><PencilIcon className="w-5 h-5"/></button>
                                <button onClick={(e) => { e.stopPropagation(); onDelete(item); }} className="p-1 text-slate-500 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        )}
                    </div>
                ))}
             </div>

            {/* Desktop View */}
            <div className="overflow-x-auto hidden md:block">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Details</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                            {isAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {payables.length === 0 && <tr><td colSpan={isAdmin?4:3} className="px-6 py-4 text-center text-slate-500">No pending payables.</td></tr>}
                        {payables.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{item.label}</td>
                                <td className="px-6 py-4 text-slate-500">{item.dueDateDisplay}</td>
                                <td className="px-6 py-4 text-right font-bold text-red-600">{formatCurrency(item.amount)}</td>
                                {isAdmin && (
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="text-slate-400 hover:text-brand-600 mr-3"><PencilIcon className="w-5 h-5"/></button>
                                        <button onClick={(e) => { e.stopPropagation(); onDelete(item); }} className="text-slate-400 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

export default FinancePage;
