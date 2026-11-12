export type CongregationType = 'igreja' | 'grupo';

export interface Congregation {
  id: string;
  name: string;
  type: CongregationType;
  address?: string;
  elderName?: string;
  elderPhone?: string;
  membersCount?: number;
  baptismGoal?: number;
  baptismsDone?: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface ScheduleEntry {
  id: string;
  congregationId: string;
  date: string; // ISO (yyyy-MM-ddT12:00:00.000Z)
  serviceId: string;
  preacher?: string;
  theme?: string;
  specialId?: string;
  pastorVisit: boolean;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

/** Cultos regulares. weekday: 0 = domingo ... 6 = sábado */
export const SERVICES = [
  { id: 'sabado-manha', name: 'Culto Divino', short: 'Sáb. manhã', weekday: 6 },
  { id: 'sabado-tarde', name: 'Culto Jovem / Tarde', short: 'Sáb. tarde', weekday: 6 },
  { id: 'domingo-noite', name: 'Culto de Domingo', short: 'Dom. noite', weekday: 0 },
  { id: 'quarta-noite', name: 'Culto de Oração', short: 'Qua. noite', weekday: 3 },
] as const;

/** Programações especiais que podem marcar um culto */
export const SPECIALS = [
  { id: 'santa-ceia', name: 'Santa Ceia', color: 'bg-red-100 text-red-800' },
  { id: 'batismo', name: 'Batismo', color: 'bg-sky-100 text-sky-800' },
  { id: 'dia-especial', name: 'Dia Especial', color: 'bg-amber-100 text-amber-800' },
  { id: 'semana-oracao', name: 'Semana de Oração', color: 'bg-violet-100 text-violet-800' },
  { id: 'evangelismo', name: 'Evangelismo', color: 'bg-orange-100 text-orange-800' },
  { id: 'assembleia', name: 'Assembleia / Comissão', color: 'bg-slate-200 text-slate-800' },
  { id: 'visita-departamental', name: 'Visita Departamental', color: 'bg-emerald-100 text-emerald-800' },
] as const;

export function getService(id: string) {
  return SERVICES.find(s => s.id === id) || SERVICES[0];
}

export function getSpecial(id?: string) {
  return id ? SPECIALS.find(s => s.id === id) : undefined;
}

/** yyyy-MM-dd -> ISO compatível com as regras do Firestore (meio-dia UTC evita problemas de fuso) */
export function dayToIso(day: string) {
  return `${day}T12:00:00.000Z`;
}

export function isoToDay(iso: string) {
  return iso.slice(0, 10);
}
