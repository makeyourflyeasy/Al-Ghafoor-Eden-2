

export enum Role {
  Resident = 'Resident',
  Admin = 'Admin',
  Guard = 'Guard',
  Accountant = 'Accountant',
  AccountsChecker = 'AccountsChecker',
  Sweeper = 'Sweeper',
  LiftMechanic = 'LiftMechanic',
}

export enum DuesStatus {
  Paid = 'Paid',
  Pending = 'Pending',
  Partial = 'Partial'
}

export interface BuildingInfo {
  name: string;
  address: string;
  logo?: string; // base64
  totalFlats: number;
  totalPenthouses: number;
  totalShops: number;
  totalOffices: number;
  mezzanineDetails: string;
  parkingCapacity: number;
  totalFloors: number;
  flatsPerFloor: number;
}

export interface User {
  id: string; // Flat number or special ID like 'admin'
  role: Role;
  password?: string;
  ownerName: string;
  ownerPic?: string;
  ownerCnicFront?: string;
  ownerCnicBack?: string;
  residentType: 'Owner' | 'Tenant';
  
  // Owner Specific Extended Details
  alternateContact?: string;
  currentAddress?: string;

  tenantName?: string;
  tenantPic?: string;
  tenantCnicFront?: string;
  tenantCnicBack?: string;
  policeVerification?: string;
  rentalAgreement?: string;
  contact?: string;
  salary?: number; // For staff
  cashOnHand?: number; // For Guards and Accountant
  vacatingStatus?: 'None' | 'Vacated' | 'Objection'; // New field for handling move-out logic
  vacateRequest?: {
    requestedDate: string;
    ownerApproved: boolean;
    adminApproved: boolean;
  };
}

export interface Flat {
  id: string; // e.g., '101', 'GF', 'M'
  label: string;
  floor: number;
  monthlyMaintenance: number;
  dues: Dues[];
  adminRemarks?: string;
  forSale?: boolean;
  forRent?: boolean;
  isBackend?: boolean;
  isVacant?: boolean;
  vacantSince?: string;
  advanceBalance?: number;
  tenantHistory?: { userId: string; startDate: string; endDate: string | null; }[];
}

export interface Dues {
    month: string; // YYYY-MM format
    amount: number;
    status: DuesStatus;
    paidAmount: number;
    description: string;
}

export interface Payment {
  id: string;
  flatId: string;
  amount: number;
  date: string;
  purpose: string;
  remarks?: string;
  receiptImg?: string; // base64 string for image
  receivedBy?: string; // Guard ID
  status: 'Confirmed' | 'Pending Confirmation' | 'Objected';
  transferStatus?: 'Pending' | 'Confirmed'; // For guard cash transfer
  confirmedBy?: string; // Accountant ID
  breakdown?: {
    description: string;
    amount: number;
  }[];
}

export interface RecurringExpense {
  purpose: string;
  amount: number;
}

export interface Expense {
  id:string;
  purpose: string;
  amount: number;
  date: string;
  dueDate?: string;
  amountAfterDueDate?: number;
  remarks?: string;
  invoiceImg?: string; // base64 string for image or PDF
  paid: boolean;
  paidBy?: string; // User ID
  status: 'Pending Approval' | 'Confirmed' | 'Paid' | 'Objected';
  requiresApproval?: boolean;
  approvedBy: string[]; // Array of User IDs of Accounts Checkers
  requestedBy?: string; // User ID of Guard/Sweeper
  details?: {
    previousUnits?: number;
    currentUnits?: number;
  }
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  image?: string; // For image uploads
}

export interface Message {
    id: string;
    from: string; // sender's flatId/userId
    to: string;   // recipient's flatId/userId
    content: string;
    timestamp: string;
    isRead?: boolean;
}

export interface Notification {
    id: string;
    recipientId: string; // Target user's ID
    message: string;
    date: string;
    isRead: boolean;
    actionType?: 'PAY_EXPENSE' | 'DUE_REMINDER' | 'PAYABLE_REMINDER' | 'INFO' | 'RENT_CONFIRMATION' | 'CASH_TRANSFER_CONFIRMATION' | 'EXPENSE_APPROVAL' | 'EXPENSE_REJECTED' | 'VACATE_REQUEST' | 'BILL_UPLOADED';
    payload?: {
        paymentId?: string;
        expenseId?: string;
        tenantTransactionId?: string;
        cashTransferId?: string;
        amount?: number;
        fromUserId?: string;
        tenantId?: string;
    };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  relatedFlatId: string;
  isCompleted: boolean;
  date: string;
  dueDate: string;
}

export interface Inquiry {
  id: string;
  type: 'Rent' | 'Purchase';
  property: string;
  message: string;
  date: string;
  isArchived?: boolean;
}

export interface TenantTransaction {
  id: string;
  userId: string; // The tenant user who this belongs to
  flatId: string; // The flat this transaction is for
  category: 'Rent' | 'K-Electric Bill' | 'Gas Bill' | 'Water Bill' | 'Other Invoice' | 'Maintenance Invoice';
  month: string; // YYYY-MM format, the month this transaction is for
  paidOn: string; // ISO date string when it was marked paid/uploaded
  amount?: number; // For 'Other Invoice'
  proofDocument?: string; // base64 string for the bill/receipt
  remarks?: string; // for 'Other Invoice'
  status?: 'Pending Confirmation' | 'Confirmed';
  ownerConfirmationBy?: string; // owner's userId
  confirmedOn?: string; // ISO date string
}


export interface PersonalBudgetEntry {
  id: string;
  userId: string;
  type: 'Income' | 'Expense';
  category: string;
  description: string;
  amount: number;
  date: string;
}

export interface Contact {
  id: string;
  title: string;
  name: string;
  contactNumber: string;
}

export interface DeletedItem {
  item: User | Flat | Payment | Expense | Notice | Message | Task | Inquiry | TenantTransaction | PersonalBudgetEntry | Contact | Loan;
  type: 'user' | 'flat' | 'payment' | 'expense' | 'notice' | 'message' | 'task' | 'inquiry' | 'tenantTransaction' | 'personalBudgetEntry' | 'contact' | 'loan';
  deletedAt: string;
}

export interface Loan {
  id: string;
  type: 'Received' | 'PaidOut';
  personId: string; // flatId, userId, or 'other'
  personName: string;
  amount: number;
  dueDate: string;
  date: string;
  status: 'Pending' | 'Paid';
  description: string;
}

export interface CashTransfer {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  date: string;
  status: 'Pending' | 'Confirmed';
  confirmedOn?: string;
}

declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}
