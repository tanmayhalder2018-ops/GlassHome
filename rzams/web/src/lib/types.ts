export type Role = 'Admin' | 'Staff';
export interface User { username: string; name: string; role: Role }
export interface UserRow extends User { status: 'Active' | 'Disabled'; lastLogin?: string; createdAt?: string }

export interface Student {
  id: string; name: string; phone: string; parentName: string; instrument: string; batch: string; fee: number;
  joinDate: string; status: 'Active' | 'Inactive'; whatsapp: string; email: string; address: string; photo: string;
  courseId: string; batchId: string; notes: string; updatedAt: string; billing: '' | 'Postpaid' | 'Prepaid';
}
export interface FeeRow { studentId: string; studentName: string; month: string; amount: number; paid: number; due: number; paymentDate: string }
export interface Allocation { month: string; amount: number; fee: number; dueAfter: number }
export interface Payment {
  id: string; date: string; studentId: string; studentName: string; course: string; amount: number; method: string; reference: string;
  months: string; allocation: Allocation[] | null; previousBalance: number | ''; currentFee: number | ''; remaining: number | '';
  nextDueDate: string; invoiceNo: string; status: 'Paid' | 'Partial' | 'Void' | 'Legacy'; notes: string; requestId: string;
  recordedBy: string; createdAt: string; voidReason: string;
}
export type AttendanceStatus = 'Present' | 'Absent' | 'Leave';
export interface AttendanceRow { date: string; studentId: string; studentName: string; status: AttendanceStatus; batchId: string; markedAt: string; markedBy: string }
export interface Course { id: string; name: string; fee: number; description: string; status: 'Active' | 'Inactive'; createdAt: string }
export interface Batch { id: string; name: string; courseId: string; teacherId: string; days: string; startTime: string; endTime: string; location: string; capacity: number | ''; status: 'Active' | 'Inactive'; createdAt: string }
export interface Teacher { id: string; name: string; phone: string; whatsapp: string; email: string; courseIds: string; status: 'Active' | 'Inactive'; joinDate: string; notes: string }
export interface ClassEntry { id: string; date: string; startTime: string; endTime: string; batchId: string; teacherId: string; courseId: string; location: string; status: 'Scheduled' | 'Completed' | 'Cancelled'; title: string; notes: string; createdAt: string }
export interface Expense { id: string; date: string; category: string; description: string; amount: number; method: string; createdBy: string; createdAt: string }
export interface Reminder { id: string; date: string; studentId: string; studentName: string; phone: string; amount: number; months: string; message: string; channel: string; status: string; createdBy: string }
export interface StudioClient { row: number; clientName: string; phone: string; projectName: string; total: number; advance: number; due: number; status: string }
export interface Task { row: number; date: string; task: string; priority: string; status: string; notes: string }
export interface Pending { studentId: string; name: string; phone: string; month: string; monthIndex: number; amount: number; paid: number; due: number; recorded: boolean; advance?: boolean }
export interface Meta { today: string; currentMonth: string; currentMonthIndex: number; feeStartMonth: string; version: string; setupDone: boolean }

export interface Settings {
  academyName: string; studioName: string; tagline: string; address: string; phone: string; whatsapp: string; email: string; website: string;
  invoicePrefix: string; invoiceFooter: string; signatory: string; paymentMethods: string; expenseCategories: string;
  feeStartMonth: string; defaultBilling: 'Postpaid' | 'Prepaid'; feeDueDay: string; reminderDaysBefore: string; calendarSync: string; logo: string;
  reminderTemplate: string; invoiceTemplate: string;
}

export interface AppData {
  user: User; meta: Meta; settings: Settings;
  students: Student[]; courses: Course[]; batches: Batch[]; teachers: Teacher[]; classes: ClassEntry[];
  attendance: AttendanceRow[]; fees: FeeRow[]; payments: Payment[]; pending: Pending[]; reminders: Reminder[];
  expenses: Expense[]; studio: StudioClient[]; tasks: Task[]; users: UserRow[];
}

export type CollectionName = Exclude<keyof AppData, 'user' | 'meta' | 'settings'>;
export interface ApiResult {
  delta?: Partial<Record<CollectionName, unknown[]>>;
  removed?: Partial<Record<CollectionName, string[]>>;
  replace?: Partial<Record<CollectionName, unknown[]>>;
  settings?: Settings;
  [k: string]: unknown;
}
