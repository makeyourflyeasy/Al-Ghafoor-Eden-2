
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import { Role, User, Flat, DuesStatus } from '../../types';
import { Card, formatCurrency, getDuesSummary, Modal, PageHeader, StatCard } from '../Dashboard';
import { BuildingIcon, CheckCircleIcon, DownloadIcon, ExclamationCircleIcon, ReceiptTaxIcon, UsersIcon, WhatsAppIcon, CashIcon, KeyIcon, CloudArrowDownIcon, CloudArrowUpIcon, DatabaseIcon, ShieldCheckIcon, LockIcon } from '../Icons';

const PrintableHomePage: React.FC = () => {
    const { flats, users, presidentMessage } = useData();

    const getPrintableDuesSummary = useCallback((flat: Flat) => {
        if (!flat || !flat.dues) return { totalPending: 0, pendingMonths: 0 };
        const pendingDues = flat.dues.filter(d => d.status === DuesStatus.Pending || d.status === DuesStatus.Partial);
        const totalPending = pendingDues.reduce((sum, due) => sum + (due.amount - due.paidAmount), 0);
        const pendingMonths = pendingDues.filter(d => d.description === 'Maintenance' && d.status !== DuesStatus.Paid).length;
        return { totalPending, pendingMonths };
    }, []);

    const PrintableFlatCard: React.FC<{ flat: Flat; user?: User; }> = React.memo(({ flat, user }) => {
        const { totalPending, pendingMonths } = getPrintableDuesSummary(flat);
        const advanceBalance = flat.advanceBalance || 0;

        let borderColor = 'border-green-500';
        let duesText = 'Dues are clear';
        let duesTextColor = 'text-green-600';
        let occupancyText = 'Occupied';
        let occupancyBgColor = 'bg-green-100';
        let occupancyTextColor = 'text-green-800';
        
        if (flat.isVacant) {
            borderColor = 'border-blue-500';
            occupancyText = 'Vacant';
            occupancyBgColor = 'bg-blue-100';
            occupancyTextColor = 'text-blue-800';
            if (totalPending > 0) {
                duesText = `Dues Pending: ${formatCurrency(totalPending)}`;
                duesTextColor = 'text-amber-600';
            } else {
                 duesText = 'No Dues';
                 duesTextColor = 'text-slate-600';
            }
        } else {
            if (user) {
                occupancyText = user.residentType === 'Owner' ? 'Owner Occupied' : 'Tenant Occupied';
            }
    
            if (totalPending > 0) {
                if (pendingMonths === 1) borderColor = 'border-amber-500';
                else if (pendingMonths >= 2) borderColor = 'border-red-500';
                duesText = `${pendingMonths} Month(s) Pending (${formatCurrency(totalPending)})`;
                duesTextColor = 'text-red-700';
            } else if (advanceBalance > 0) {
                 duesText = `Advance Paid (${formatCurrency(advanceBalance)})`;
            }
        }
        
        return (
            <div className={`bg-white rounded-lg shadow-md border-l-8 ${borderColor} flex flex-col justify-between break-inside-avoid`}>
                <div className="p-4">
                    <p className="font-extrabold text-2xl text-slate-800">{flat.label}</p>
                    <p className={`text-sm font-semibold mt-2 ${duesTextColor}`}>
                        {duesText}
                    </p>
                </div>
                <div className={`px-4 py-2 rounded-b-md mt-2 ${occupancyBgColor}`}>
                    <p className={`text-xs font-bold uppercase tracking-wider ${occupancyTextColor}`}>{occupancyText}</p>
                </div>
            </div>
        );
    });

    const sortedFlats = useMemo(() =>
        [...flats].sort((a, b) => {
            const aNum = parseInt(a.id, 10);
            const bNum = parseInt(b.id, 10);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            return a.id.localeCompare(b.id);
        }),
    [flats]);

    return (
        <div className="bg-white p-8" style={{ width: '216mm' }}>
            <div className="text-center mb-6 pb-4 border-b">
                <h1 className="text-4xl font-extrabold text-slate-900 uppercase tracking-wide">AL GHAFOOR EDEN</h1>
                <p className="text-sm text-slate-500 mt-1">Plot No. 1/28, Block A Block 1 Nazimabad, Karachi, 74600, Pakistan</p>
                <div className="flex items-center justify-center mt-4">
                     <BuildingIcon className="h-8 w-8 text-brand-600 mr-2" />
                     <p className="text-xl text-slate-600 font-bold">Community Dues Status Report</p>
                </div>
                 <p className="text-xs text-slate-400 mt-2">Generated on: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>

            {presidentMessage && (
                <div className="mb-6 bg-brand-50 border-l-4 border-brand-500 text-brand-800 p-4 rounded-r-lg shadow-md break-inside-avoid" role="alert">
                    <p className="font-bold text-sm uppercase tracking-wider">Message from the President of Union Committee</p>
                    <p className="mt-1">{presidentMessage}</p>
                </div>
            )}
            <div className="grid grid-cols-4 gap-4">
                {sortedFlats.map(flat => {
                    const user = users.find(u => u.id === flat.id);
                    return <PrintableFlatCard key={flat.id} flat={flat} user={user} />;
                })}
            </div>
        </div>
    );
};

const WhatsAppMessageModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { flats } = useData();
    const [isCopied, setIsCopied] = useState(false);

    const message = useMemo(() => {
        const flatsWithDues = flats
            .map(flat => ({ ...flat, duesSummary: getDuesSummary(flat) }))
            .filter(flat => flat.duesSummary.totalPending > 0)
            .sort((a, b) => a.label.localeCompare(b.label));

        if (flatsWithDues.length === 0) {
            return "All dues are clear! Thank you to all residents for their timely payments.";
        }

        const header = `*Al Ghafoor Eden - Dues Reminder*\n\nDear Residents,\n\nKindly clear your pending maintenance dues at your earliest convenience. The following flats have outstanding payments:\n\n`;
        const footer = `\nThank you for your cooperation.\n- Union Committee`;

        const list = flatsWithDues
            .map(flat => `- ${flat.label}: ${formatCurrency(flat.duesSummary.totalPending)}`)
            .join('\n');

        return `${header}${list}${footer}`;
    }, [flats]);

    const handleCopy = () => {
        navigator.clipboard.writeText(message);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <Modal onClose={onClose} title="WhatsApp Dues Reminder" size="lg">
            <div className="p-6">
                <p className="text-sm text-slate-600 mb-4">A message has been generated for all flats with pending dues. You can copy this message and paste it into your WhatsApp group.</p>
                <textarea
                    readOnly
                    value={message}
                    rows={10}
                    className="w-full p-3 border-2 border-slate-300 rounded-lg bg-slate-50 text-slate-800 text-sm whitespace-pre-wrap"
                />
            </div>
            <div className="bg-slate-200 px-6 py-4 text-right rounded-b-lg">
                <button
                    onClick={handleCopy}
                    className={`w-full flex items-center justify-center px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors ${isCopied ? 'bg-green-600' : 'bg-brand-600 hover:bg-brand-700'}`}
                >
                    {isCopied ? <><CheckCircleIcon className="w-5 h-5 mr-2" /> Copied to Clipboard!</> : 'Copy Message'}
                </button>
            </div>
        </Modal>
    );
};

const CashOnHandSummary: React.FC = () => {
    const { users } = useData();
    
    const accountant = useMemo(() => users.find(u => u.role === Role.Accountant), [users]);
    const guards = useMemo(() => users.filter(u => u.role === Role.Guard), [users]);
    
    const accountantCash = accountant?.cashOnHand || 0;
    const guardCash = guards.reduce((sum, g) => sum + (g.cashOnHand || 0), 0);
    const totalBookBalance = accountantCash + guardCash;

    return (
        <Card title="Cash on Hand Summary (Book Balance)" className="mt-8">
            <div className="space-y-3">
                 <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div>
                         <p className="font-bold text-blue-900 text-lg">Accountant Cash</p>
                         <p className="text-xs text-blue-600">{accountant?.ownerName || 'Accountant'}</p>
                    </div>
                    <p className="font-bold text-blue-900 text-xl">{formatCurrency(accountantCash)}</p>
                </div>

                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-100">
                    <div>
                        <p className="font-bold text-green-900 text-lg">Guard Cash</p>
                        <div className="text-xs text-green-700 mt-1">
                            {guards.map(g => (g.cashOnHand || 0) > 0 ? (
                                <span key={g.id} className="mr-3 bg-green-200 px-2 py-0.5 rounded">{g.ownerName}: {formatCurrency(g.cashOnHand || 0)}</span>
                            ) : null)}
                             {guardCash === 0 && <span>No cash with guards</span>}
                        </div>
                    </div>
                    <p className="font-bold text-green-900 text-xl">{formatCurrency(guardCash)}</p>
                </div>
            </div>
            
            <div className="flex justify-between items-center p-5 bg-slate-800 text-white rounded-xl mt-6 shadow-lg">
                <div>
                    <p className="font-bold text-xl">Total Book Balance</p>
                    <p className="text-xs text-slate-400">Accountant + Guard Funds</p>
                </div>
                <p className="font-extrabold text-3xl">{formatCurrency(totalBookBalance)}</p>
            </div>
        </Card>
    )
}


const DashboardHomePage: React.FC<{ currentUser: User, showToast: (message: string, type?: 'success' | 'error') => void }> = ({ currentUser, showToast }) => {
    const { flats, setFlats, payments, expenses, presidentMessage, setPresidentMessage, users, generateBackupData, restoreBackupData, createRestorePoint } = useData();
    const [isPrinting, setIsPrinting] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const printableRef = useRef<HTMLDivElement>(null);
    const backupInputRef = useRef<HTMLInputElement>(null);

    const totalPendingDues = useMemo(() => flats.reduce((total, flat) => total + getDuesSummary(flat).totalPending, 0), [flats]);
    
    const totalPaymentsThisMonth = useMemo(() => {
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        return payments
            .filter(p => {
                const pDate = new Date(p.date);
                return pDate.getMonth() === thisMonth && pDate.getFullYear() === thisYear;
            })
            .reduce((sum, p) => sum + p.amount, 0);
    }, [payments]);

    const totalPayableAmount = useMemo(() => expenses.filter(e => !e.paid).reduce((sum, e) => sum + e.amount, 0), [expenses]);

    const totalPaidExpenseThisMonth = useMemo(() => {
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        return expenses
            .filter(e => {
                const eDate = new Date(e.date);
                return e.paid && eDate.getMonth() === thisMonth && eDate.getFullYear() === thisYear;
            })
            .reduce((sum, e) => sum + e.amount, 0);
    }, [expenses]);
    
    const sortedFlats = useMemo(() => [...flats].sort((a, b) => {
        const aNum = parseInt(a.id, 10);
        const bNum = parseInt(b.id, 10);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        if (!isNaN(aNum)) return -1;
        if (!isNaN(bNum)) return 1;
        return a.id.localeCompare(b.id);
    }), [flats]);

    const [selectedFlatForRemark, setSelectedFlatForRemark] = useState<string>(sortedFlats[0]?.id || '');
    const [currentRemark, setCurrentRemark] = useState('');

    useEffect(() => {
        const flat = flats.find(f => f.id === selectedFlatForRemark);
        setCurrentRemark(flat?.adminRemarks || '');
    }, [selectedFlatForRemark, flats]);

    const handleSaveRemark = () => {
        setFlats(prevFlats => prevFlats.map(f =>
            f.id === selectedFlatForRemark
                ? { ...f, adminRemarks: currentRemark.trim() ? currentRemark.trim() : undefined }
                : f
        ));
        showToast('Remark saved successfully!');
    };
    
    const handleSaveMessage = () => {
        showToast('President\'s message saved!');
    };

    const handleDownloadHomePage = () => {
        setIsPrinting(true);
    };

    const handleDownloadCredentials = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Professional Header for Credentials PDF
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text("AL GHAFOOR EDEN", 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text("Plot No. 1/28, Block A Block 1 Nazimabad, Karachi, 74600, Pakistan", 105, 26, { align: 'center' });
        doc.text("Confidential User Credentials List", 105, 32, { align: 'center' });

        doc.setLineWidth(0.5);
        doc.setDrawColor(203, 213, 225);
        doc.line(14, 38, 196, 38);

        const bodyData = users.map(u => [u.id, u.password || 'N/A', u.role, u.ownerName]);

        (doc as any).autoTable({
            startY: 45,
            head: [['User ID', 'Password', 'Role', 'Name']],
            body: bodyData,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59] }, // Slate-800
        });

        doc.save('User_Credentials_Backup.pdf');
        showToast('Credentials file downloaded.');
    };

    const handleDownloadBackup = () => {
        const jsonString = generateBackupData();
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AlGhafoorEden_FullBackup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('System backup downloaded successfully.');
    };

    const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = event.target?.result as string;
                if (window.confirm("WARNING: This will overwrite ALL current data with the data from the backup file. This action cannot be undone. Are you sure?")) {
                    restoreBackupData(json);
                    showToast("System restored successfully from backup.", "success");
                }
            } catch (err) {
                console.error(err);
                showToast("Failed to restore backup. Invalid file.", "error");
            }
        };
        reader.readAsText(file);
        // Reset input value so same file can be selected again if needed
        e.target.value = '';
    };
    
    const handleUpdateRestorePoint = () => {
        createRestorePoint();
        showToast("Restore Point updated! App will revert to this state in case of crash.");
    }


    useEffect(() => {
        if (isPrinting && printableRef.current) {
            const { html2canvas, jspdf } = window;
            const input = printableRef.current;
            
            showToast('Generating PDF... please wait.');

            // Optimized settings for smaller file size
            html2canvas(input, {
                scale: 1.5, // Lower scale for smaller image
                useCORS: true,
                logging: false,
                windowWidth: input.scrollWidth,
                windowHeight: input.scrollHeight,
            }).then((canvas: HTMLCanvasElement) => {
                // Use JPEG format with compression (0.75 quality)
                const imgData = canvas.toDataURL('image/jpeg', 0.75);
                const { jsPDF } = jspdf;
                
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'legal'
                });

                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgProps= pdf.getImageProperties(imgData);
                const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
                
                let heightLeft = imgHeight;
                let position = 0;

                // Use FAST compression mode
                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, '', 'FAST');
                heightLeft -= pdfHeight;

                while (heightLeft > 0) {
                    position = position - pdfHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, '', 'FAST');
                    heightLeft -= pdfHeight;
                }
                
                pdf.save(`AlGhafoorEden_Status_${new Date().toISOString().split('T')[0]}.pdf`);
                setIsPrinting(false);
            }).catch((err: any) => {
                console.error("Error generating PDF:", err);
                showToast("Failed to generate PDF.", "error");
                setIsPrinting(false);
            });
        }
    }, [isPrinting, showToast]);


    return (
    <div>
        {showWhatsAppModal && <WhatsAppMessageModal onClose={() => setShowWhatsAppModal(false)} />}
        
        <PageHeader title={`Welcome, ${currentUser.ownerName}!`} subtitle="Here's a summary of the building's current status.">
            <div className="flex flex-wrap items-center gap-2">
                {currentUser.role === Role.Admin && (
                     <>
                        <button onClick={() => setShowWhatsAppModal(true)} className="flex items-center bg-green-500 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-green-600 shadow-md">
                            <WhatsAppIcon className="w-5 h-5 mr-2" />
                            Create WhatsApp Message
                        </button>
                        <button onClick={handleDownloadHomePage} disabled={isPrinting} className="flex items-center bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-slate-700 shadow-md disabled:bg-slate-400 disabled:cursor-wait">
                            <DownloadIcon className="w-5 h-5 mr-2" />
                            {isPrinting ? 'Generating...' : 'Download Home Page'}
                        </button>
                     </>
                )}
            </div>
        </PageHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <StatCard title="Total Receivable Dues" value={formatCurrency(totalPendingDues)} icon={<ExclamationCircleIcon className="w-8 h-8"/>} color="red" />
             <StatCard title="Total Payable Expenses" value={formatCurrency(totalPayableAmount)} icon={<ReceiptTaxIcon className="w-8 h-8"/>} color="amber" />
             <StatCard title="Received This Month" value={formatCurrency(totalPaymentsThisMonth)} icon={<CashIcon className="w-8 h-8"/>} color="green" />
             <StatCard title="Expenses Paid This Month" value={formatCurrency(totalPaidExpenseThisMonth)} icon={<CheckCircleIcon className="w-8 h-8"/>} color="blue" />
             <StatCard title="Total Flats" value={flats.length.toString()} icon={<BuildingIcon className="w-8 h-8"/>} />
             <StatCard title="Occupied" value={flats.filter(f => !f.isVacant).length.toString()} icon={<UsersIcon className="w-8 h-8"/>} />
        </div>
        
        { [Role.Admin, Role.Accountant].includes(currentUser.role) && <CashOnHandSummary /> }

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
             {/* System Administration Card for Admins */}
             {currentUser.role === Role.Admin && (
                <Card title="System Administration" className="lg:col-span-2 bg-slate-50 border-2 border-slate-200">
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center space-x-2 mb-2 text-slate-800 font-bold text-lg">
                                    <KeyIcon className="w-6 h-6 text-brand-600" />
                                    <h3>Credentials</h3>
                                </div>
                                <p className="text-sm text-slate-500 mb-4">Download a PDF list of all user IDs and passwords.</p>
                            </div>
                            <button onClick={handleDownloadCredentials} className="w-full flex items-center justify-center px-4 py-2 bg-slate-700 text-white font-bold rounded-md hover:bg-slate-800">
                                <DownloadIcon className="w-5 h-5 mr-2" /> Download List
                            </button>
                        </div>

                        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between">
                             <div>
                                <div className="flex items-center space-x-2 mb-2 text-slate-800 font-bold text-lg">
                                    <DatabaseIcon className="w-6 h-6 text-blue-600" />
                                    <h3>Manual Backup</h3>
                                </div>
                                <p className="text-sm text-slate-500 mb-4">Download full JSON backup of all app data.</p>
                            </div>
                            <button onClick={handleDownloadBackup} className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700">
                                <CloudArrowDownIcon className="w-5 h-5 mr-2" /> Download Backup
                            </button>
                        </div>

                        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between">
                             <div>
                                <div className="flex items-center space-x-2 mb-2 text-slate-800 font-bold text-lg">
                                    <ShieldCheckIcon className="w-6 h-6 text-green-600" />
                                    <h3>Restore System</h3>
                                </div>
                                <p className="text-sm text-slate-500 mb-4">Restore from a previous backup file. <strong>Overwrites current data.</strong></p>
                            </div>
                            <div className="relative">
                                <input 
                                    type="file" 
                                    accept=".json" 
                                    ref={backupInputRef}
                                    onChange={handleUploadBackup}
                                    className="hidden" 
                                />
                                <button onClick={() => backupInputRef.current?.click()} className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white font-bold rounded-md hover:bg-green-700">
                                    <CloudArrowUpIcon className="w-5 h-5 mr-2" /> Upload & Restore
                                </button>
                            </div>
                        </div>
                        
                        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between">
                             <div>
                                <div className="flex items-center space-x-2 mb-2 text-slate-800 font-bold text-lg">
                                    <LockIcon className="w-6 h-6 text-amber-600" />
                                    <h3>Safe Point</h3>
                                </div>
                                <p className="text-sm text-slate-500 mb-4">Update the auto-restore point to the current state.</p>
                            </div>
                            <button onClick={handleUpdateRestorePoint} className="w-full flex items-center justify-center px-4 py-2 bg-amber-600 text-white font-bold rounded-md hover:bg-amber-700">
                                <CheckCircleIcon className="w-5 h-5 mr-2" /> Update Safe Point
                            </button>
                        </div>
                    </div>
                </Card>
            )}

            {currentUser.role === Role.Admin && (
                <>
                    <Card title="President's Message for Home Page">
                        <p className="text-sm text-slate-500 mb-2">This message will be displayed prominently on the public home page.</p>
                        <textarea
                            value={presidentMessage}
                            onChange={(e) => setPresidentMessage(e.target.value)}
                            rows={4}
                            placeholder="Enter a message for all residents and visitors..."
                            className="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 bg-white text-slate-900 placeholder-slate-400"
                        />
                        <div className="mt-4 text-right">
                            <button onClick={handleSaveMessage} className="px-4 py-2 text-sm font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700">
                                Save Message
                            </button>
                        </div>
                    </Card>
                    <Card title="Admin Remarks for Flats">
                        <p className="text-sm text-slate-500 mb-2">Add a public remark for a specific flat. This will be visible in the flat's details on the home page.</p>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="flat-select" className="block text-sm font-medium text-slate-700">Select Flat</label>
                                <select
                                    id="flat-select"
                                    value={selectedFlatForRemark}
                                    onChange={(e) => setSelectedFlatForRemark(e.target.value)}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-2 border-slate-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md bg-white text-slate-900"
                                >
                                    {sortedFlats.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="remark-textarea" className="block text-sm font-medium text-slate-700">Remark</label>
                                <textarea
                                    id="remark-textarea"
                                    value={currentRemark}
                                    onChange={(e) => setCurrentRemark(e.target.value)}
                                    rows={3}
                                    placeholder="e.g., Potential buyer visiting next week..."
                                    className="mt-1 w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 bg-white text-slate-900 placeholder-slate-400"
                                />
                            </div>
                            <div className="text-right">
                                <button onClick={handleSaveRemark} className="px-4 py-2 text-sm font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700">
                                    Save Remark
                                </button>
                            </div>
                        </div>
                    </Card>
                </>
            )}
        </div>
        {isPrinting && (
            <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}>
                <div ref={printableRef}>
                    <PrintableHomePage />
                </div>
            </div>
        )}
    </div>
    )
};

export default DashboardHomePage;
