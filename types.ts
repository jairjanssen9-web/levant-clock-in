export enum Role {
  SERVER = 'Bediening',
  KITCHEN = 'Keuken',
  BAR = 'Bar',
  MANAGER = 'Manager'
}

export interface Employee {
  id: string;
  name: string;
  role: Role;
  isActive: boolean;
  photoUrl?: string; // Optional placeholder
}

export interface Shift {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface AuditLog {
  date: string;
  previousIn?: string;
  previousOut?: string;
  newIn?: string;
  newOut?: string;
  reason: string;
  adminName: string;
}

export interface TimeLog {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  clockIn: string; // ISO String
  clockOut: string | null; // ISO String or null if currently working
  status: 'active' | 'completed';
  edits: AuditLog[];
}