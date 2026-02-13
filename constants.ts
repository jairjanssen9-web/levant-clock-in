import { Employee, Role, TimeLog } from './types';

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Sarah Janssen', role: Role.MANAGER, isActive: true },
  { id: '2', name: 'Mo El-Amrani', role: Role.KITCHEN, isActive: true },
  { id: '3', name: 'Lisa de Vries', role: Role.SERVER, isActive: true },
  { id: '4', name: 'Tom Bakker', role: Role.BAR, isActive: true },
  { id: '5', name: 'Daan Meijer', role: Role.BAR, isActive: true },
  { id: '6', name: 'Sophie de Jong', role: Role.SERVER, isActive: true },
];

export const INITIAL_LOGS: TimeLog[] = []; // Starts empty, populated by usage