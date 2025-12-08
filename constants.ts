
import { User, Role, Flat, Payment, Expense, Notice, Message, DuesStatus, Notification, Task, Inquiry, TenantTransaction, PersonalBudgetEntry, RecurringExpense, Contact, DeletedItem, Loan, CashTransfer, BuildingInfo } from './types';

// --- USERS ---
export const INITIAL_USERS: User[] = [
  { id: 'admin', role: Role.Admin, ownerName: 'Arbab Khan', password: 'karachi021', residentType: 'Owner', contact: '0300-1234567', cashOnHand: 0 },
  { id: 'faisal', role: Role.Accountant, ownerName: 'Faisal', password: 'karachi123', residentType: 'Owner', contact: '0300-1234568', cashOnHand: 0 },
  { id: 'tahir', role: Role.AccountsChecker, ownerName: 'Tahir', password: 'karachi123', residentType: 'Owner', contact: '0300-1234569' },
  { id: 'usman', role: Role.AccountsChecker, ownerName: 'Usman', password: 'karachi123', residentType: 'Owner', contact: '0300-1234570' },
  { id: 'rahman', role: Role.Guard, ownerName: 'Rahman (Day)', password: 'karachi123', residentType: 'Owner', salary: 25000, cashOnHand: 0 },
  { id: 'nasir', role: Role.Guard, ownerName: 'Nasir (Night)', password: 'karachi123', residentType: 'Owner', salary: 25000, cashOnHand: 0 },
  { id: 'waqas', role: Role.Sweeper, ownerName: 'Waqas', password: 'karachi123', residentType: 'Owner', salary: 15000 },
  { id: 'mechanic1', role: Role.LiftMechanic, ownerName: 'Ali (Lift)', password: 'karachi123', residentType: 'Owner', salary: 10000 },
];

// --- BUILDING INFO ---
export const INITIAL_BUILDING_INFO: BuildingInfo = {
    name: 'Al Ghafoor Eden',
    address: 'Plot No. 1/28, Block A Block 1 Nazimabad, Karachi, 74600, Pakistan',
    totalFlats: 48,
    totalPenthouses: 3,
    totalShops: 0,
    totalOffices: 0,
    mezzanineDetails: 'Gym and Community Hall',
    parkingCapacity: 50,
    totalFloors: 8,
    flatsPerFloor: 6
};

// --- FLATS ---
const generateFlats = (): Flat[] => {
  const flats: Flat[] = [];
  const floors = 8; 
  const flatsPerFloor = 6;

  // Generate regular flats (Floors 1-8)
  for (let floor = 1; floor <= floors; floor++) {
    for (let num = 1; num <= flatsPerFloor; num++) {
      const flatId = `${floor}0${num}`;
      
      let maintenance = 6000;
      if (flatId === '205') maintenance = 1500;
      
      const flat: Flat = {
        id: flatId,
        label: `Flat ${flatId}`,
        floor: floor,
        monthlyMaintenance: maintenance,
        // RESET: No dues, fresh start for Dec 1st
        dues: [], 
        advanceBalance: 0,
        isVacant: false, // RESET: All owner occupied
        tenantHistory: [],
      };

      flats.push(flat);
      
      // Create a default owner user for every flat.
      INITIAL_USERS.push({
        id: `${flatId}own`,
        role: Role.Resident,
        ownerName: `Owner of ${flatId}`,
        password: 'pakistan123',
        residentType: 'Owner',
        contact: `0300-11${flatId}`
      });
    }
  }

  // Generate 9th Floor Penthouses
  const penthouseIds = ['902', '903', '905'];
  const penthouseMaintenance = 8000;
  penthouseIds.forEach((flatId) => {
    const flat: Flat = {
      id: flatId,
      label: `Penthouse ${flatId}`,
      floor: 9,
      monthlyMaintenance: penthouseMaintenance,
      dues: [], // RESET
      advanceBalance: 0,
      isVacant: false, // RESET
      tenantHistory: [],
    };
    flats.push(flat);
    // Create an owner for the penthouse.
    INITIAL_USERS.push({
        id: `${flatId}own`,
        role: Role.Resident,
        ownerName: `Owner of ${flatId}`,
        password: 'pakistan123',
        residentType: 'Owner',
        contact: `0300-11${flatId}`
    });
  });


  // Commercial and other properties
  const specialProperties: Omit<Flat, 'dues'| 'advanceBalance' | 'tenantHistory'>[] = [
    { id: 'M-01', label: 'Mezzanine Floor', floor: 0, monthlyMaintenance: 25000 },
    { id: 'G-01', label: 'Ground Floor', floor: 0, monthlyMaintenance: 40000 },
  ];

  specialProperties.forEach(prop => {
    flats.push({
      ...prop,
      dues: [], // RESET
      advanceBalance: 0,
      tenantHistory: [],
      isVacant: false // RESET
    });

    // Create an owner user for the property.
    INITIAL_USERS.push({
        id: `${prop.id}own`,
        role: Role.Resident,
        ownerName: `Owner of ${prop.label}`,
        password: 'pakistan123',
        residentType: 'Owner',
        contact: `0300-11${prop.id.replace(/-/g, '')}`
    });
  });

  return flats;
};

export const INITIAL_FLATS: Flat[] = generateFlats();

// EMPTY DATA FOR FRESH START DEC 1st
export const INITIAL_PAYMENTS: Payment[] = [];
export const INITIAL_EXPENSES: Expense[] = [];

// Default Recurring Expenses
export const INITIAL_RECURRING_EXPENSES: RecurringExpense[] = [
    { purpose: 'Lift Maintenance', amount: 5000 },
    { purpose: 'Generator Fuel', amount: 0 }, // Variable but recurring
    { purpose: 'Sweeper Salary', amount: 15000 },
    { purpose: 'Guard Salary (Day)', amount: 25000 },
    { purpose: 'Guard Salary (Night)', amount: 25000 },
    { purpose: 'K-Electric Common Bill', amount: 0 },
    { purpose: 'Water Bill', amount: 0 },
];

export const INITIAL_NOTICES: Notice[] = [];
export const INITIAL_MESSAGES: Message[] = [];
export const INITIAL_NOTIFICATIONS: Notification[] = [];
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_INQUIRIES: Inquiry[] = [];
export const INITIAL_TENANT_TRANSACTIONS: TenantTransaction[] = [];
export const INITIAL_PERSONAL_BUDGET_ENTRIES: PersonalBudgetEntry[] = [];

export const INITIAL_CONTACTS: Contact[] = [
    { id: 'c1', title: 'Building Manager', name: 'Faisal', contactNumber: '0300-1234568'},
    { id: 'c2', title: 'Emergency Guard (Day)', name: 'Rahman', contactNumber: '0311-1234567'},
    { id: 'c3', title: 'Emergency Guard (Night)', name: 'Nasir', contactNumber: '0311-1234569'},
];

export const INITIAL_DELETED_ITEMS: DeletedItem[] = [];
export const INITIAL_LOANS: Loan[] = [];
export const INITIAL_CASH_TRANSFERS: CashTransfer[] = [];
