import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DataProvider } from './context/DataContext';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
    
    const prefix = 'v2-titanium-dec1-';
    
    // 1. Identify the Restore Point
    const restorePointJson = localStorage.getItem(`${prefix}restore-point`);
    const hasAttemptedRestore = sessionStorage.getItem('app_auto_restore_attempted');

    // 2. AUTOMATIC RESTORE LOGIC
    // If we have a backup and haven't tried restoring in this session yet, DO NOT WIPE. Restore instead.
    if (restorePointJson && !hasAttemptedRestore) {
        console.log("CRASH DETECTED: Attempting to auto-restore from last stable point...");
        try {
            const backup = JSON.parse(restorePointJson);
            
            // Restore all keys from the backup object
            if (backup.users) localStorage.setItem(`${prefix}users`, JSON.stringify(backup.users));
            if (backup.flats) localStorage.setItem(`${prefix}flats`, JSON.stringify(backup.flats));
            if (backup.payments) localStorage.setItem(`${prefix}payments`, JSON.stringify(backup.payments));
            if (backup.expenses) localStorage.setItem(`${prefix}expenses`, JSON.stringify(backup.expenses));
            if (backup.recurringExpenses) localStorage.setItem(`${prefix}recurring-expenses`, JSON.stringify(backup.recurringExpenses));
            if (backup.notices) localStorage.setItem(`${prefix}notices`, JSON.stringify(backup.notices));
            if (backup.messages) localStorage.setItem(`${prefix}messages`, JSON.stringify(backup.messages));
            if (backup.notifications) localStorage.setItem(`${prefix}notifications`, JSON.stringify(backup.notifications));
            if (backup.tasks) localStorage.setItem(`${prefix}tasks`, JSON.stringify(backup.tasks));
            if (backup.inquiries) localStorage.setItem(`${prefix}inquiries`, JSON.stringify(backup.inquiries));
            if (backup.tenantTransactions) localStorage.setItem(`${prefix}tenantTransactions`, JSON.stringify(backup.tenantTransactions));
            if (backup.personalBudgetEntries) localStorage.setItem(`${prefix}personalBudgetEntries`, JSON.stringify(backup.personalBudgetEntries));
            if (backup.contacts) localStorage.setItem(`${prefix}contacts`, JSON.stringify(backup.contacts));
            if (backup.deletedItems) localStorage.setItem(`${prefix}deleted-items`, JSON.stringify(backup.deletedItems));
            if (backup.presidentMessage) localStorage.setItem(`${prefix}president-message`, JSON.stringify(backup.presidentMessage));
            if (backup.loans) localStorage.setItem(`${prefix}loans`, JSON.stringify(backup.loans));
            if (backup.cashTransfers) localStorage.setItem(`${prefix}cash-transfers`, JSON.stringify(backup.cashTransfers));
            if (backup.transactionCounter) localStorage.setItem(`${prefix}tx-counter`, JSON.stringify(backup.transactionCounter));

            // Mark that we tried restoration to prevent infinite loop if the backup itself is corrupt
            sessionStorage.setItem('app_auto_restore_attempted', 'true');
            
            // Reload to apply restored state
            window.location.reload();
            return;
        } catch (restoreError) {
            console.error("Failed to restore from backup:", restoreError);
            // If restore fails, proceed to full wipe below
        }
    }

    // 3. FALLBACK: FULL WIPE (Only if no backup or backup failed)
    // List of all keys used by DataContext
    const keysToRemove = [
        `${prefix}users`,
        `${prefix}flats`,
        `${prefix}payments`,
        `${prefix}expenses`,
        `${prefix}recurring-expenses`,
        `${prefix}notices`,
        `${prefix}messages`,
        `${prefix}notifications`,
        `${prefix}tasks`,
        `${prefix}inquiries`,
        `${prefix}tenantTransactions`,
        `${prefix}personalBudgetEntries`,
        `${prefix}contacts`,
        `${prefix}deleted-items`,
        `${prefix}president-message`,
        `${prefix}loans`,
        `${prefix}cash-transfers`,
        `${prefix}tx-counter`,
        `${prefix}monthly-run`
    ];
    
    // Check for reset loop to prevent infinite refreshing if error persists immediately
    const lastReset = sessionStorage.getItem('app_reset_timestamp');
    const now = Date.now();
    
    if (lastReset && (now - parseInt(lastReset)) < 5000) {
         // If reset happened less than 5 seconds ago, stop forcing reload to avoid loop
         return; 
    }

    // Clear data to reset app state to initial condition
    keysToRemove.forEach(key => localStorage.removeItem(key));
    sessionStorage.setItem('app_reset_timestamp', now.toString());
    sessionStorage.removeItem('app_auto_restore_attempted'); // Clear restore flag for fresh start
    
    // Reload the page to apply clean state
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
       // Fallback UI if the reload fails or loop detection stops it
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-10 text-center font-sans">
            <div className="max-w-md bg-white p-8 rounded-xl shadow-2xl border border-red-100">
                <h1 className="text-3xl font-bold mb-4 text-red-600">System Self-Correction</h1>
                <p className="text-lg mb-6 text-slate-600">
                    The application encountered a critical error. 
                    <br/><br/>
                    <span className="font-bold text-slate-800">Status:</span> attempted automatic data recovery.
                </p>
                <button onClick={() => { sessionStorage.removeItem('app_reset_timestamp'); sessionStorage.removeItem('app_auto_restore_attempted'); window.location.reload(); }} className="w-full px-6 py-3 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors shadow-lg">
                    Restart Application
                </button>
            </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <DataProvider>
        <App />
      </DataProvider>
    </ErrorBoundary>
  </React.StrictMode>
);