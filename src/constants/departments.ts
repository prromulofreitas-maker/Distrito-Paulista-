import { 
  Users, 
  Shield, 
  HeartHandshake, 
  Wallet, 
  UserRound, 
  Baby, 
  Calculator, 
  Flame, 
  FileText, 
  Compass, 
  Tent, 
  BookOpen, 
  Music
} from 'lucide-react';

export const DEPARTMENTS = [
  { id: 'geral', name: 'Geral (Todos)', icon: Users, color: 'text-gray-500', bgColor: 'bg-gray-100' },
  { id: 'ancionato', name: 'Ancionato', icon: Shield, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { id: 'diaconato', name: 'Diaconato', icon: HeartHandshake, color: 'text-teal-600', bgColor: 'bg-teal-100' },
  { id: 'mordomia', name: 'Mordomia', icon: Wallet, color: 'text-green-600', bgColor: 'bg-green-100' },
  { id: 'ministerio-da-mulher', name: 'Ministério da Mulher', icon: UserRound, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  { id: 'ministerio-da-crianca', name: 'Ministério da Criança', icon: Baby, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  { id: 'tesouraria', name: 'Tesouraria', icon: Calculator, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  { id: 'mipes', name: 'MIPES', icon: Flame, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  { id: 'secretaria', name: 'Secretaria', icon: FileText, color: 'text-slate-600', bgColor: 'bg-slate-100' },
  { id: 'desbravadores', name: 'Desbravadores', icon: Compass, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  { id: 'aventureiros', name: 'Aventureiros', icon: Tent, color: 'text-lime-600', bgColor: 'bg-lime-100' },
  { id: 'biblioteca-teologica', name: 'Biblioteca Teológica', icon: BookOpen, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  { id: 'jovens', name: 'Jovens', icon: Music, color: 'text-purple-600', bgColor: 'bg-purple-100' },
];

export function getDepartmentName(id: string): string {
  const dept = DEPARTMENTS.find(d => d.id === id);
  return dept ? dept.name : 'Desconhecido';
}

export function getDepartment(id: string) {
  return DEPARTMENTS.find(d => d.id === id) || DEPARTMENTS[0];
}
