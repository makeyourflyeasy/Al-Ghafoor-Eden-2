
import React, { createContext, useState, useEffect, useMemo, useContext, useCallback, useRef } from 'react';
import { User, Flat, Payment, Expense, Notice, Message, Notification, Task, Inquiry, TenantTransaction, PersonalBudgetEntry, RecurringExpense, Contact, DeletedItem, DuesStatus, Role, Loan, CashTransfer, Dues, BuildingInfo } from '../types';
import { INITIAL_USERS, INITIAL_FLATS, INITIAL_PAYMENTS, INITIAL_EXPENSES, INITIAL_RECURRING_EXPENSES, INITIAL_NOTICES, INITIAL_MESSAGES, INITIAL_NOTIFICATIONS, INITIAL_TASKS, INITIAL_INQUIRIES, INITIAL_TENANT_TRANSACTIONS, INITIAL_PERSONAL_BUDGET_ENTRIES, INITIAL_CONTACTS, INITIAL_DELETED_ITEMS, INITIAL_LOANS, INITIAL_CASH_TRANSFERS, INITIAL_BUILDING_INFO } from '../constants';
import { formatCurrency } from '../components/Dashboard';
import { db } from '../firebase'; // Import database connection
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

// Define the shape of the context data
interface DataContextProps {
    users: User[]; setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    flats: Flat[]; setFlats: React.Dispatch<React.SetStateAction<Flat[]>>;
    payments: Payment[]; setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
    expenses: Expense[]; setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
    recurringExpenses: RecurringExpense[]; setRecurringExpenses: React.Dispatch<React.SetStateAction<RecurringExpense[]>>;
    notices: Notice[]; setNotices: React.Dispatch<React.SetStateAction<Notice[]>>;
    messages: Message[]; setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    notifications: Notification[]; setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
    tasks: Task[]; setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    inquiries: Inquiry[]; setInquiries: React.Dispatch<React.SetStateAction<Inquiry[]>>;
    tenantTransactions: TenantTransaction[]; setTenantTransactions: React.Dispatch<React.SetStateAction<TenantTransaction[]>>;
    personalBudgetEntries: PersonalBudgetEntry[]; setPersonalBudgetEntries: React.Dispatch<React.SetStateAction<PersonalBudgetEntry[]>>;
    contacts: Contact[]; setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
    deletedItems: DeletedItem[]; setDeletedItems: React.Dispatch<React.SetStateAction<DeletedItem[]>>;
    presidentMessage: string; setPresidentMessage: React.Dispatch<React.SetStateAction<string>>;
    loans: Loan[]; setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
    cashTransfers: CashTransfer[]; setCashTransfers: React.Dispatch<React.SetStateAction<CashTransfer[]>>;
    transactionCounter: number; setTransactionCounter: React.Dispatch<React.SetStateAction<number>>;
    buildingInfo: BuildingInfo; setBuildingInfo: React.Dispatch<React.SetStateAction<BuildingInfo>>;
    connectionError: string | null; // New state for connection health
    getNextTransactionId: () => string;
    handleInitiateCashTransfer: (senderId: string) => void;
    handleAccountantConfirmCashReceipt: (cashTransferId: string, confirmerId: string) => void;
    handleExpenseApproval: (expenseId: string, approverId: string) => void;
    handleRejectExpense: (expenseId: string, rejectorId: string, reason: string) => void;
    handlePayExpenseFromCash: (notificationId: string, payerId: string) => void;
    markNotificationAsRead: (notificationId: string) => void;
    handleConfirmRentPayment: (transactionId: string, ownerId: string) => void;
    handleAddPayable: (formData: any, requesterId: string) => Promise<void>;
    handleUpdatePayment: (paymentId: string, updatedData: Partial<Payment>) => void;
    handleDeletePayment: (paymentId: string) => void;
    handleUpdateExpense: (expenseId: string, updatedData: Partial<Expense>) => void;
    handleDeleteExpense: (expenseId: string) => void;
    handleDeleteLoan: (loanId: string) => void;
    handleDeleteDue: (flatId: string, dueMonth: string, dueDescription: string) => void;
    handleUpdateDue: (flatId: string, originalMonth: string, originalDescription: string, updatedData: Partial<Dues>) => void;
    generateBackupData: () => string;
    restoreBackupData: (jsonData: string) => void;
    createRestorePoint: () => void;
    handleTenantVacateRequest: (tenantId: string) => void;
    handleApproveVacate: (tenantId: string, approverRole: 'Owner' | 'Admin') => void;
    processPayment: (paymentData: { flatId: string; amount: number; date: string; purpose: string; description?: string; receiverId: string; }) => Payment | null;
}

// Create the context with a default undefined value
export const DataContext = createContext<DataContextProps | undefined>(undefined);

// Custom hook for easier context consumption
export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

// Simple debounce utility to delay function execution
const debounce = (func: (...args: any[]) => void, delay: number) => {
    let timeoutId: number;
    return (...args: any[]) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
            func(...args);
        }, delay);
    };
};

/**
 * useSyncState:
 * 1. Reads from LocalStorage initially (Offline-first / Fast load).
 * 2. Connects to Firebase Firestore if available.
 * 3. Syncs real-time changes from Firestore (Server -> Client).
 * 4. Pushes local changes to Firestore with debounce (Client -> Server).
 */
function useSyncState<T>(key: string, initialState: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    // 1. Initialize from LocalStorage
    const [state, setState] = useState<T>(() => {
        try {
            const storedValue = localStorage.getItem(key);
            return storedValue ? JSON.parse(storedValue) : initialState;
        } catch (error) {
            console.warn(`Error reading localStorage key “${key}”:`, error);
            return initialState;
        }
    });

    const isInternalUpdate = useRef(false);

    // 2. Real-time Subscription (Server -> Client)
    useEffect(() => {
        if (!db) return; // Fallback to local-only if no DB

        const docRef = doc(db, "app_data_v2_titanium", key); // Collection: app_data, Doc: key
        
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data && data.value !== undefined) {
                    // Only update if data is different to avoid loops
                    if (JSON.stringify(data.value) !== JSON.stringify(state)) {
                        console.log(`Synced ${key} from Cloud.`);
                        // Prevent this update from triggering a write back to server
                        isInternalUpdate.current = true; 
                        setState(data.value);
                        // Also update local storage for offline backup
                        localStorage.setItem(key, JSON.stringify(data.value));
                    }
                }
            } else {
                // If doc doesn't exist on cloud but we have local, we might want to push local?
                // For now, we just stick to local state.
                console.log(`Document ${key} does not exist on Cloud yet.`);
            }
        }, (error) => {
            console.error(`Sync error for ${key}:`, error);
        });

        return () => unsubscribe();
    }, [key]); // Intentionally exclude 'state' to avoid re-subscribing

    // 3. Push Changes (Client -> Server)
    const debouncedSave = useCallback(
        debounce(async (value: T) => {
            // Save to LocalStorage always
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error(`LocalStorage Error ${key}:`, error);
            }

            // Save to Firebase if connected and not an internal update
            if (db && !isInternalUpdate.current) {
                try {
                    await setDoc(doc(db, "app_data_v2_titanium", key), { value });
                    console.log(`Saved ${key} to Cloud.`);
                } catch (error) {
                    console.error(`Cloud Save Error ${key}:`, error);
                }
            }
            // Reset internal flag
            isInternalUpdate.current = false;
        }, 1000), // 1 second debounce to reduce writes
        [key]
    );

    useEffect(() => {
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }
        debouncedSave(state);
    }, [state, debouncedSave]);

    return [state, setState];
}


// Create the provider component
export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // UPDATED KEYS FOR TITANIUM THEME / FRESH START DEC 1st
    // Using useSyncState instead of usePersistentState
    const [users, setUsers] = useSyncState<User[]>('v2-titanium-dec1-users', INITIAL_USERS);
    const [flats, setFlats] = useSyncState<Flat[]>('v2-titanium-dec1-flats', INITIAL_FLATS);
    const [payments, setPayments] = useSyncState<Payment[]>('v2-titanium-dec1-payments', INITIAL_PAYMENTS);
    const [expenses, setExpenses] = useSyncState<Expense[]>('v2-titanium-dec1-expenses', INITIAL_EXPENSES);
    const [recurringExpenses, setRecurringExpenses] = useSyncState<RecurringExpense[]>('v2-titanium-dec1-recurring-expenses', INITIAL_RECURRING_EXPENSES);
    const [notices, setNotices] = useSyncState<Notice[]>('v2-titanium-dec1-notices', INITIAL_NOTICES);
    const [messages, setMessages] = useSyncState<Message[]>('v2-titanium-dec1-messages', INITIAL_MESSAGES);
    const [notifications, setNotifications] = useSyncState<Notification[]>('v2-titanium-dec1-notifications', INITIAL_NOTIFICATIONS);
    const [tasks, setTasks] = useSyncState<Task[]>('v2-titanium-dec1-tasks', INITIAL_TASKS);
    const [inquiries, setInquiries] = useSyncState<Inquiry[]>('v2-titanium-dec1-inquiries', INITIAL_INQUIRIES);
    const [tenantTransactions, setTenantTransactions] = useSyncState<TenantTransaction[]>('v2-titanium-dec1-tenantTransactions', INITIAL_TENANT_TRANSACTIONS);
    const [personalBudgetEntries, setPersonalBudgetEntries] = useSyncState<PersonalBudgetEntry[]>('v2-titanium-dec1-personalBudgetEntries', INITIAL_PERSONAL_BUDGET_ENTRIES);
    const [contacts, setContacts] = useSyncState<Contact[]>('v2-titanium-dec1-contacts', INITIAL_CONTACTS);
    const [deletedItems, setDeletedItems] = useSyncState<DeletedItem[]>('v2-titanium-dec1-deleted-items', INITIAL_DELETED_ITEMS);
    const [presidentMessage, setPresidentMessage] = useSyncState<string>('v2-titanium-dec1-president-message', 'Welcome to Al Ghafoor Eden Community Portal. Starting Fresh from December 1st.');
    const [loans, setLoans] = useSyncState<Loan[]>('v2-titanium-dec1-loans', INITIAL_LOANS);
    const [cashTransfers, setCashTransfers] = useSyncState<CashTransfer[]>('v2-titanium-dec1-cash-transfers', INITIAL_CASH_TRANSFERS);
    const [transactionCounter, setTransactionCounter] = useSyncState<number>('v2-titanium-dec1-tx-counter', 1);
    const [buildingInfo, setBuildingInfo] = useSyncState<BuildingInfo>('v2-titanium-dec1-building-info', INITIAL_BUILDING_INFO);
    
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const getNextTransactionId = useCallback(() => {
        const nextId = `EDEN${transactionCounter.toString().padStart(5, '0')}`;
        setTransactionCounter(prev => prev + 1);
        return nextId;
    }, [transactionCounter, setTransactionCounter]);

    // --- CONNECTION HEALTH CHECK ---
    useEffect(() => {
        if (!db) {
            setConnectionError('no-db');
            return;
        }
        
        // Subscribe to a lightweight document just to check connection/permission status
        const docRef = doc(db, "app_data_v2_titanium", "health_check");
        const unsubscribe = onSnapshot(docRef, 
            () => {
                setConnectionError(null); // Success
            }, 
            (err) => {
                console.error("Database health check failed:", err);
                if (err.code === 'permission-denied') {
                    setConnectionError('permission-denied');
                } else if (err.code === 'unavailable' || err.message.includes('offline')) {
                    setConnectionError('offline');
                } else {
                    setConnectionError('unknown');
                }
            }
        );

        return () => unsubscribe();
    }, []);

    // --- AUTOMATION AND WORKFLOW LOGIC ---
    useEffect(() => {
        const lastRun = localStorage.getItem('v2-titanium-dec1-monthly-run');
        const today = new Date();
        const currentMonthYear = `${today.getFullYear()}-${today.getMonth()}`;

        // Automation runs on the 1st of the month to generate dues
        if (lastRun !== currentMonthYear && today.getDate() === 1) {
            console.log('Running monthly automation...');
            
            // 1. Generate Monthly Maintenance Dues, applying any advance balance
            setFlats(prevFlats => prevFlats.map(flat => {
                
                let newAdvanceBalance = flat.advanceBalance || 0;
                
                // Logic: If vacant, charge 50% of maintenance. If occupied, full maintenance.
                const maintenanceCharge = flat.isVacant ? (flat.monthlyMaintenance / 2) : flat.monthlyMaintenance;
                
                let maintenanceDue = maintenanceCharge;
                let status = DuesStatus.Pending;
                let paidAmount = 0;

                if (newAdvanceBalance > 0) {
                    if (newAdvanceBalance >= maintenanceDue) {
                        newAdvanceBalance -= maintenanceDue;
                        status = DuesStatus.Paid;
                        paidAmount = maintenanceDue;
                    } else {
                        maintenanceDue -= newAdvanceBalance;
                        paidAmount = newAdvanceBalance;
                        status = DuesStatus.Partial;
                        newAdvanceBalance = 0;
                    }
                }
                
                const newDue = {
                    month: `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`,
                    amount: maintenanceCharge,
                    status: status,
                    paidAmount: paidAmount,
                    description: 'Maintenance'
                };
                const dueExists = flat.dues.some(d => d.month === newDue.month && d.description === 'Maintenance');
                return dueExists ? flat : { ...flat, dues: [...flat.dues, newDue], advanceBalance: newAdvanceBalance };
            }));

            // 2. Generate Recurring Expenses (from the Recurring Expenses List)
            // This ensures fixed expenses like Lift, Sweeper Salary etc are auto-added as Payable Bills
            const expensesToCreate = recurringExpenses.filter(re => re.amount > 0);
            
            if (expensesToCreate.length > 0) {
                const newExpenses = expensesToCreate.map(expenseInfo => {
                    // Check if it already exists for today (prevent duplicates if logic runs twice)
                    // We use current date for ID generation seed if needed, but here we use transaction counter
                    return {
                        id: getNextTransactionId(),
                        purpose: expenseInfo.purpose,
                        amount: expenseInfo.amount,
                        date: today.toISOString(),
                        paid: false,
                        status: 'Confirmed' as 'Confirmed',
                        approvedBy: ['auto-approved-recurring'],
                        remarks: 'Auto-generated monthly expense'
                    };
                });
                setExpenses(prev => [...newExpenses, ...prev]); // Add to top
            }

            localStorage.setItem('v2-titanium-dec1-monthly-run', currentMonthYear);
            console.log('Monthly automation complete.');
        }
    }, [flats, setFlats, expenses, setExpenses, recurringExpenses, getNextTransactionId]);

    // Notification Generation Logic
    useEffect(() => {
      const interval = setInterval(() => {
        const newNotifications: Notification[] = [];
        const today = new Date();
        
        flats.forEach(flat => {
          if (flat.dues.some(d => d.status === DuesStatus.Pending || d.status === DuesStatus.Partial)) {
            const residentUser = users.find(u => u.role === Role.Resident && u.id.startsWith(flat.id));
            if (residentUser) {
                const notifExists = notifications.some(n => n.recipientId === residentUser.id && n.actionType === 'DUE_REMINDER' && !n.isRead);
                if (!notifExists) {
                  newNotifications.push({ id: `notif-due-${residentUser.id}-${Date.now()}`, recipientId: residentUser.id, message: "You have pending maintenance dues. Please pay them at your earliest convenience.", date: today.toISOString(), isRead: false, actionType: 'DUE_REMINDER' });
                }
            }
          }
        });
        
        const accountant = users.find(u => u.role === Role.Accountant);
        if (accountant) {
          expenses.forEach(expense => {
            if (!expense.paid && expense.status === 'Confirmed' && (accountant.cashOnHand || 0) >= expense.amount) {
              const notifExists = notifications.some(n => n.payload?.expenseId === expense.id && !n.isRead);
              if (!notifExists) {
                 newNotifications.push({ id: `notif-pay-${expense.id}`, recipientId: accountant.id, message: `Please pay the pending expense: ${expense.purpose} (${expense.amount} PKR).`, date: today.toISOString(), isRead: false, actionType: 'PAYABLE_REMINDER', payload: { expenseId: expense.id, amount: expense.amount } });
              }
            }
          });
        }

        // Tenant reminders on the 4th of the month
        if (today.getDate() === 4) {
            const notifRunKey = `v2-titanium-dec1-tenant-notif-run-${today.getFullYear()}-${today.getMonth()}`;
            const hasRun = localStorage.getItem(notifRunKey);
            if (!hasRun) {
                const tenantUsers = users.filter(u => u.residentType === 'Tenant');
                tenantUsers.forEach(tenant => {
                    const flatId = tenant.id.replace(/tnt/i, '');
                    const flat = flats.find(f => f.id === flatId);
                    if(flat && !flat.isVacant) {
                        const message = `Reminder: Please pay rent and upload utility bills for ${today.toLocaleString('default', { month: 'long' })}`;
                        newNotifications.push({ 
                            id: `notif-tenant-monthly-${tenant.id}`,
                            recipientId: tenant.id,
                            message: message,
                            date: today.toISOString(),
                            isRead: false,
                            actionType: 'INFO'
                        });
                    }
                });
                localStorage.setItem(notifRunKey, 'true');
            }
        }


        if (newNotifications.length > 0) {
          setNotifications(prev => [...prev.filter(n => !newNotifications.find(nn => nn.id === n.id)), ...newNotifications]);
        }
      }, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
    }, [flats, expenses, users, notifications, setNotifications]);


    // --- WORKFLOW HANDLERS ---
    const handleAddPayable = async (formData: any, requesterId: string) => {
        const requester = users.find(u => u.id === requesterId);
        if (!requester) return;

        let newExpenseData: Omit<Expense, 'id'> | null = null;
        
        const commonExpenseProps = {
            amount: parseFloat(formData.amount),
            date: new Date().toISOString(),
            paid: false,
            status: 'Pending Approval' as 'Pending Approval',
            requiresApproval: true,
            approvedBy: [] as string[],
            requestedBy: requesterId,
            remarks: formData.description || formData.remarks,
            invoiceImg: formData.invoiceImg,
        };

        if (formData.type === 'loan') {
            const person = users.find(u => u.id === formData.personId);
            const personName = formData.personId === 'other' ? formData.personName : (person?.ownerName || 'Unknown');
            
            const newLoan: Loan = {
                id: getNextTransactionId(),
                type: 'PaidOut',
                personId: formData.personId,
                personName: personName,
                amount: parseFloat(formData.amount),
                dueDate: new Date(formData.dueDate).toISOString(),
                date: new Date().toISOString(),
                status: 'Pending',
                description: formData.description
            };
            setLoans(prev => [newLoan, ...prev]);

            newExpenseData = { ...commonExpenseProps, purpose: `Loan to ${personName}` };

        } else if (formData.type === 'new') {
            newExpenseData = {
                ...commonExpenseProps,
                purpose: formData.purpose,
                dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
            };
        } else { // existing recurring
            newExpenseData = {
                ...commonExpenseProps,
                purpose: formData.purpose,
                details: { previousUnits: formData.previousUnits, currentUnits: formData.currentUnits },
            };
        }

        if (newExpenseData) {
            const newExpense: Expense = { ...newExpenseData, id: getNextTransactionId() };
            setExpenses(prev => [newExpense, ...prev]);

            const checkers = users.filter(u => u.role === Role.AccountsChecker);
            const newNotifications: Notification[] = checkers.map(checker => ({
                id: `notif-approval-${newExpense.id}-${checker.id}`,
                recipientId: checker.id,
                message: `New expense approval needed: ${newExpense.purpose} for ${formatCurrency(newExpense.amount)} requested by ${requester.ownerName}.`,
                date: new Date().toISOString(),
                isRead: false,
                actionType: 'EXPENSE_APPROVAL',
                payload: { expenseId: newExpense.id }
            }));
            setNotifications(prev => [...prev, ...newNotifications]);
        }
        return Promise.resolve();
    };
    
    const handleInitiateCashTransfer = (senderId: string) => {
        const sender = users.find(u => u.id === senderId);
        const accountant = users.find(u => u.role === Role.Accountant);
        if (!sender || !accountant || (sender.cashOnHand || 0) <= 0) return;

        const amount = sender.cashOnHand || 0;

        const newTransfer: CashTransfer = {
            id: getNextTransactionId(),
            fromUserId: senderId,
            toUserId: accountant.id,
            amount: amount,
            date: new Date().toISOString(),
            status: 'Pending',
        };
        setCashTransfers(prev => [newTransfer, ...prev]);

        setUsers(prev => prev.map(u => {
            if (u.id === senderId) return { ...u, cashOnHand: 0 };
            return u;
        }));
        
        setNotifications(prev => [...prev, {
            id: `notif-cashtransfer-${newTransfer.id}`,
            recipientId: accountant.id,
            message: `${sender.ownerName} has transferred ${formatCurrency(amount)}. Please confirm receipt.`,
            date: new Date().toISOString(),
            isRead: false,
            actionType: 'CASH_TRANSFER_CONFIRMATION',
            payload: { cashTransferId: newTransfer.id }
        }]);
    };

    const handleAccountantConfirmCashReceipt = (cashTransferId: string, confirmerId: string) => {
        const transfer = cashTransfers.find(t => t.id === cashTransferId);
        if (!transfer || transfer.status === 'Confirmed') return;
    
        setCashTransfers(prev => prev.map(t => 
            t.id === cashTransferId ? { ...t, status: 'Confirmed', confirmedOn: new Date().toISOString() } : t
        ));
    
        setUsers(prev => prev.map(u => 
            u.id === confirmerId ? { ...u, cashOnHand: (u.cashOnHand || 0) + transfer.amount } : u
        ));
    
        setNotifications(prev => prev.map(n => 
            n.payload?.cashTransferId === cashTransferId 
                ? { ...n, isRead: true, message: `You confirmed receipt of ${formatCurrency(transfer.amount)} from ${users.find(u=>u.id === transfer.fromUserId)?.ownerName}.` }
                : n
        ));
    
        setNotifications(prev => [...prev, {
            id: `notif-cashtransfer-confirmed-${transfer.id}`,
            recipientId: transfer.fromUserId,
            message: `Your transfer of ${formatCurrency(transfer.amount)} has been confirmed by the accountant.`,
            date: new Date().toISOString(),
            isRead: false,
            actionType: 'INFO'
        }]);
    };
    
    const handleExpenseApproval = (expenseId: string, approverId: string) => {
        setExpenses(prevExpenses => {
            const expenseIndex = prevExpenses.findIndex(e => e.id === expenseId);
            if (expenseIndex === -1) return prevExpenses;

            const expense = prevExpenses[expenseIndex];
            if (expense.approvedBy?.includes(approverId)) return prevExpenses;
            
            const updatedApprovedBy = [...(expense.approvedBy || []), approverId];
            
            const checkers = users.filter(u => u.role === Role.AccountsChecker);
            const allApproved = checkers.every(c => updatedApprovedBy.includes(c.id));

            const updatedStatus = allApproved ? 'Confirmed' : expense.status;

            const updatedExpenses = [...prevExpenses];
            updatedExpenses[expenseIndex] = { ...expense, approvedBy: updatedApprovedBy, status: updatedStatus };
            
            return updatedExpenses;
        });
    };

    const handleRejectExpense = (expenseId: string, rejectorId: string, reason: string) => {
        setExpenses(prev => prev.map(e => {
            if (e.id === expenseId) {
                const rejector = users.find(u => u.id === rejectorId);
                const requester = users.find(u => u.id === e.requestedBy);
                const accountant = users.find(u => u.role === Role.Accountant);
                
                // Notify requester and accountant
                if (requester) {
                    setNotifications(n => [...n, { id: `notif-reject-${e.id}-${requester.id}`, recipientId: requester.id, message: `Your expense request "${e.purpose}" was rejected by ${rejector?.ownerName}. Reason: ${reason}`, date: new Date().toISOString(), isRead: false, actionType: 'EXPENSE_REJECTED', payload: { expenseId: e.id } }]);
                }
                if (accountant && accountant.id !== requester?.id) {
                     setNotifications(n => [...n, { id: `notif-reject-${e.id}-${accountant.id}`, recipientId: accountant.id, message: `Expense "${e.purpose}" was rejected by ${rejector?.ownerName}. Reason: ${reason}`, date: new Date().toISOString(), isRead: false, actionType: 'EXPENSE_REJECTED', payload: { expenseId: e.id } }]);
                }

                return { ...e, status: 'Objected', remarks: `Rejected by ${rejector?.ownerName}: ${reason}` };
            }
            return e;
        }));
    };

    const handlePayExpenseFromCash = (notificationId: string, payerId: string) => {
        const notif = notifications.find(n => n.id === notificationId);
        if (!notif || !notif.payload || !notif.payload.expenseId || !notif.payload.amount) return;

        const payer = users.find(u => u.id === payerId);
        if (!payer || (payer.cashOnHand || 0) < notif.payload.amount) {
            alert("Insufficient cash to pay this expense.");
            return;
        }
        
        setUsers(prev => prev.map(u => u.id === payerId ? { ...u, cashOnHand: (u.cashOnHand || 0) - notif.payload!.amount! } : u));
        setExpenses(prev => prev.map(e => e.id === notif.payload!.expenseId ? { ...e, paid: true, status: 'Paid', paidBy: payerId } : e));
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true, message: `You have marked expense ID ${notif.payload!.expenseId} as paid.` } : n));
    };
    
    const markNotificationAsRead = (notificationId: string) => {
        setNotifications(prev => prev.map(n => {
            if (n.id === notificationId) {
                return { ...n, isRead: true };
            }
            return n;
        }));
    };
    
    const handleConfirmRentPayment = (transactionId: string, ownerId: string) => {
        setTenantTransactions(prev => prev.map(tx =>
            tx.id === transactionId
                ? { ...tx, status: 'Confirmed', ownerConfirmationBy: ownerId, confirmedOn: new Date().toISOString() }
                : tx
        ));
        setNotifications(prev => prev.map(n =>
            n.payload?.tenantTransactionId === transactionId
                ? { ...n, isRead: true, message: `You have confirmed rent receipt.` }
                : n
        ));
    };

    const handleUpdatePayment = (paymentId: string, updatedData: Partial<Payment>) => {
        setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, ...updatedData } : p));
    };

    const handleDeletePayment = (paymentId: string) => {
        setPayments(prev => prev.filter(p => p.id !== paymentId));
    };

    const handleUpdateExpense = (expenseId: string, updatedData: Partial<Expense>) => {
        setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, ...updatedData } : e));
    };

    const handleDeleteExpense = (expenseId: string) => {
        setExpenses(prev => prev.filter(e => e.id !== expenseId));
    };
    
    const handleDeleteLoan = (loanId: string) => {
        setLoans(prev => prev.filter(l => l.id !== loanId));
    };

    const handleDeleteDue = (flatId: string, dueMonth: string, dueDescription: string) => {
        setFlats(prev => prev.map(f => {
            if (f.id === flatId) {
                const newDues = f.dues.filter(d => !(d.month === dueMonth && d.description === dueDescription));
                return { ...f, dues: newDues };
            }
            return f;
        }));
    };

    const handleUpdateDue = (flatId: string, originalMonth: string, originalDescription: string, updatedData: Partial<Dues>) => {
        setFlats(prev => prev.map(f => {
            if (f.id === flatId) {
                const newDues = f.dues.map(d => {
                    if (d.month === originalMonth && d.description === originalDescription) {
                        return { ...d, ...updatedData };
                    }
                    return d;
                });
                return { ...f, dues: newDues };
            }
            return f;
        }));
    };

    // --- TENANT VACATE WORKFLOW ---
    const handleTenantVacateRequest = (tenantId: string) => {
        const tenant = users.find(u => u.id === tenantId);
        if (!tenant) return;

        // 1. Update Tenant Status
        setUsers(prev => prev.map(u => u.id === tenantId ? {
            ...u,
            vacateRequest: {
                requestedDate: new Date().toISOString(),
                ownerApproved: false,
                adminApproved: false
            }
        } : u));

        // Robustly find Flat ID and Owner ID
        let flatId = tenantId.replace(/tnt/i, '');
        const ownerId = `${flatId}own`;

        // 2. Notify Owner
        setNotifications(prev => [...prev, {
            id: `notif-vacate-owner-${Date.now()}`,
            recipientId: ownerId,
            message: `Tenant ${tenant.ownerName} has requested to vacate Flat ${flatId}. Please approve.`,
            date: new Date().toISOString(),
            isRead: false,
            actionType: 'VACATE_REQUEST',
            payload: { tenantId, amount: 0 }
        }]);

        // 3. Notify Admin
        setNotifications(prev => [...prev, {
            id: `notif-vacate-admin-${Date.now()}`,
            recipientId: 'admin',
            message: `Tenant ${tenant.ownerName} (Flat ${flatId}) has requested to vacate. Admin approval required.`,
            date: new Date().toISOString(),
            isRead: false,
            actionType: 'VACATE_REQUEST',
            payload: { tenantId, amount: 0 }
        }]);
    };

    const handleApproveVacate = (tenantId: string, approverRole: 'Owner' | 'Admin') => {
        let tenant = users.find(u => u.id === tenantId);
        if (!tenant || !tenant.vacateRequest) return;

        const updatedRequest = {
            ...tenant.vacateRequest,
            ownerApproved: approverRole === 'Owner' ? true : tenant.vacateRequest.ownerApproved,
            adminApproved: approverRole === 'Admin' ? true : tenant.vacateRequest.adminApproved
        };
        
        const isFullyApproved = updatedRequest.ownerApproved && updatedRequest.adminApproved;

        // Logic to check dues before auto-vacating
        let vacatingStatus: 'None' | 'Vacated' | 'Objection' = 'None';
        
        if (isFullyApproved) {
             const flatId = tenantId.replace(/tnt/i, '');
             const flat = flats.find(f => f.id === flatId);
             if (flat) {
                 const pendingDues = flat.dues.filter(d => d.status !== DuesStatus.Paid).reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
                 vacatingStatus = pendingDues > 0 ? 'Objection' : 'Vacated';
                 
                 // If fully vacated, update flat history
                 if (vacatingStatus === 'Vacated') {
                      setFlats(prev => prev.map(f => {
                          if(f.id === flatId) {
                              return {
                                  ...f,
                                  isVacant: true,
                                  tenantHistory: f.tenantHistory?.map(h => h.userId === tenantId && !h.endDate ? {...h, endDate: new Date().toISOString()} : h)
                              }
                          }
                          return f;
                      }))
                 }
             }
        }

        setUsers(prev => prev.map(u => u.id === tenantId ? {
            ...u,
            vacateRequest: updatedRequest,
            vacatingStatus: isFullyApproved ? vacatingStatus : u.vacatingStatus
        } : u));
        
        // Remove "Action Required" notification for the person who just approved
        const approverId = approverRole === 'Admin' ? 'admin' : `${tenantId.replace(/tnt/i, '')}own`;
        
        setNotifications(prev => prev.filter(n => 
            !(n.actionType === 'VACATE_REQUEST' && n.payload?.tenantId === tenantId && n.recipientId === approverId)
        ));

        // Notify Tenant
        setNotifications(prev => [...prev, {
             id: `notif-vacate-status-${Date.now()}`,
             recipientId: tenantId,
             message: `Your vacate request has been approved by the ${approverRole}.`,
             date: new Date().toISOString(),
             isRead: false,
             actionType: 'INFO'
        }]);
    };

    const processPayment = (paymentData: { flatId: string; amount: number; date: string; purpose: string; description?: string; receiverId: string; }): Payment | null => {
        const { flatId, amount, date, purpose, description, receiverId } = paymentData;
        const targetFlat = flats.find(f => f.id === flatId);
        if (!targetFlat) return null;

        const breakdown: { description: string; amount: number; }[] = [];
        let remainingAmountToProcess = amount;
        
        const sortedDues = [...targetFlat.dues]
            .filter(d => d.status !== DuesStatus.Paid)
            .sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());
        
        for (const due of sortedDues) {
            if (remainingAmountToProcess <= 0) break;

            const dueStillOwed = due.amount - due.paidAmount;
            const amountToPayForThisDue = Math.min(remainingAmountToProcess, dueStillOwed);
            
            if (amountToPayForThisDue > 0) {
                breakdown.push({
                    description: `${due.description} for ${new Date(due.month + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                    amount: amountToPayForThisDue
                });
                remainingAmountToProcess -= amountToPayForThisDue;
            }
        }

        if (remainingAmountToProcess > 0) {
            breakdown.push({
                description: 'Advance Payment',
                amount: remainingAmountToProcess
            });
        }

        const newPayment: Payment = {
            id: getNextTransactionId(), flatId, amount, date, purpose,
            remarks: description, status: 'Confirmed', receivedBy: receiverId, breakdown
        };
        setPayments(prev => [newPayment, ...prev]);

        setUsers(prev => prev.map(u => u.id === receiverId ? { ...u, cashOnHand: (u.cashOnHand || 0) + amount } : u));
        
        setFlats(prev => prev.map(f => {
            if (f.id === flatId) {
                let remainingAmount = amount;
                let currentAdvance = f.advanceBalance || 0;
                
                const sortedDues = f.dues.filter(d => d.status !== DuesStatus.Paid).sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());
                
                const updatedDues = f.dues.map(due => {
                    const matchingDue = sortedDues.find(d => d.month === due.month && d.description === due.description);
                    if (matchingDue && remainingAmount > 0) {
                        const dueStillOwed = due.amount - due.paidAmount;
                        if(remainingAmount >= dueStillOwed) {
                            remainingAmount -= dueStillOwed;
                            return {...due, status: DuesStatus.Paid, paidAmount: due.amount};
                        } else {
                            const newPaidAmount = due.paidAmount + remainingAmount;
                            remainingAmount = 0;
                            return {...due, status: DuesStatus.Partial, paidAmount: newPaidAmount};
                        }
                    }
                    return due;
                });

                if(remainingAmount > 0) {
                    currentAdvance += remainingAmount;
                }
                
                return { ...f, dues: updatedDues, advanceBalance: currentAdvance };
            }
            return f;
        }));
        
        return newPayment;
    };

    // --- BACKUP / RESTORE LOGIC ---
    const generateBackupData = () => {
        const data = {
            users, flats, payments, expenses, recurringExpenses, notices, messages,
            notifications, tasks, inquiries, tenantTransactions, personalBudgetEntries,
            contacts, deletedItems, presidentMessage, loans, cashTransfers, transactionCounter, buildingInfo
        };
        return JSON.stringify(data);
    };

    const restoreBackupData = (jsonData: string) => {
        try {
            const data = JSON.parse(jsonData);
            if (data.users) setUsers(data.users);
            if (data.flats) setFlats(data.flats);
            if (data.payments) setPayments(data.payments);
            if (data.expenses) setExpenses(data.expenses);
            if (data.recurringExpenses) setRecurringExpenses(data.recurringExpenses);
            if (data.notices) setNotices(data.notices);
            if (data.messages) setMessages(data.messages);
            if (data.notifications) setNotifications(data.notifications);
            if (data.tasks) setTasks(data.tasks);
            if (data.inquiries) setInquiries(data.inquiries);
            if (data.tenantTransactions) setTenantTransactions(data.tenantTransactions);
            if (data.personalBudgetEntries) setPersonalBudgetEntries(data.personalBudgetEntries);
            if (data.contacts) setContacts(data.contacts);
            if (data.deletedItems) setDeletedItems(data.deletedItems);
            if (data.presidentMessage) setPresidentMessage(data.presidentMessage);
            if (data.loans) setLoans(data.loans);
            if (data.cashTransfers) setCashTransfers(data.cashTransfers);
            if (data.transactionCounter) setTransactionCounter(data.transactionCounter);
            if (data.buildingInfo) setBuildingInfo(data.buildingInfo);
        } catch (e) {
            console.error("Failed to restore backup:", e);
            throw new Error("Invalid backup file format.");
        }
    };
    
    // --- SNAPSHOT RESTORE POINT ---
    const createRestorePoint = () => {
        const snapshot = generateBackupData();
        localStorage.setItem('v2-titanium-dec1-restore-point', snapshot);
        console.log('Safe restore point created.');
    };
    
    useEffect(() => {
        if (!localStorage.getItem('v2-titanium-dec1-restore-point')) {
            createRestorePoint();
        }
    }, []);


    const value = useMemo(() => ({
        users, setUsers,
        flats, setFlats,
        payments, setPayments,
        expenses, setExpenses,
        recurringExpenses, setRecurringExpenses,
        notices, setNotices,
        messages, setMessages,
        notifications, setNotifications,
        tasks, setTasks,
        inquiries, setInquiries,
        tenantTransactions, setTenantTransactions,
        personalBudgetEntries, setPersonalBudgetEntries,
        contacts, setContacts,
        deletedItems, setDeletedItems,
        presidentMessage, setPresidentMessage,
        loans, setLoans,
        cashTransfers, setCashTransfers,
        transactionCounter, setTransactionCounter,
        buildingInfo, setBuildingInfo,
        connectionError, // Expose connection error status
        getNextTransactionId,
        handleInitiateCashTransfer,
        handleAccountantConfirmCashReceipt,
        handleExpenseApproval,
        handleRejectExpense,
        handlePayExpenseFromCash,
        markNotificationAsRead,
        handleConfirmRentPayment,
        handleAddPayable,
        handleUpdatePayment,
        handleDeletePayment,
        handleUpdateExpense,
        handleDeleteExpense,
        handleDeleteLoan,
        handleDeleteDue,
        handleUpdateDue,
        generateBackupData,
        restoreBackupData,
        createRestorePoint,
        handleTenantVacateRequest,
        handleApproveVacate,
        processPayment
    }), [
        users, flats, payments, expenses, recurringExpenses, notices, messages,
        notifications, tasks, inquiries, tenantTransactions, personalBudgetEntries, contacts, deletedItems, presidentMessage, loans, cashTransfers, transactionCounter, buildingInfo, connectionError,
        setUsers, setFlats, setPayments, setExpenses, setRecurringExpenses, setNotices, setMessages,
        setNotifications, setTasks, setInquiries, setTenantTransactions, setPersonalBudgetEntries, setContacts, setDeletedItems, setPresidentMessage, setLoans, setCashTransfers, setTransactionCounter, setBuildingInfo, getNextTransactionId
    ]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
