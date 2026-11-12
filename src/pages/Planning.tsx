import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Church,
  ClipboardCopy,
  Printer,
  Star,
  Trash2,
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCongregations } from '../hooks/useCongregations';
import {
  SERVICES,
  SPECIALS,
  dayToIso,
  getService,
  getSpecial,
  isoToDay,
  type Congregation,
  type ScheduleEntry,
} from '../constants/congregations';
import { cn } from '../lib/utils';

const inputClass =
  'mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm';

type CellTarget = { day: string; congregation: Congregation; entry?: ScheduleEntry };

const EMPTY_FORM = { preacher: '', theme: '', specialId: '', pastorVisit: false, notes: '' };

const keyOf = (day: string, congregationId: string, serviceId: string) => `${day}|${congregationId}|${serviceId}`;

export function Planning() {
  const { appUser } = useAuth();
  const { congregations, loading: loadingCongregations } = useCongregations();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [serviceId, setServiceId] = useState<string>(SERVICES[0].id);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [target, setTarget] = useState<CellTarget | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const canEdit = appUser?.role === 'admin' || appUser?.role === 'leader';
  const service = getService(serviceId);

  // Carrega o planejamento do mês (todas as categorias de culto)
  useEffect(() => {
    const start = dayToIso(format(startOfMonth(month), 'yyyy-MM-dd'));
    const end = dayToIso(format(endOfMonth(month), 'yyyy-MM-dd'));
    const q = query(
      collection(db, 'schedules'),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'asc')
    );
    const unsubscribe = onSnapshot(
      q,
      snapshot => setEntries(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ScheduleEntry, 'id'>) }))),
      error => console.error('Erro ao carregar planejamento: ', error)
    );
    return () => unsubscribe();
  }, [month]);

  const byKey = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    entries.forEach(e => {
      const k = keyOf(isoToDay(e.date), e.congregationId, e.serviceId);
      if (!map.has(k)) map.set(k, e);
    });
    return map;
  }, [entries]);

  const days = useMemo(
    () =>
      eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
        .filter(d => d.getDay() === service.weekday)
        .map(d => format(d, 'yyyy-MM-dd')),
    [month, service.weekday]
  );

  const congregationName = (id: string) => congregations.find(c => c.id === id)?.name || 'Congregação removida';

  // Agenda do pastor: visitas no mês e conflitos (mesmo dia + mesmo culto em mais de um lugar)
  const pastorVisits = useMemo(
    () => entries.filter(e => e.pastorVisit).sort((a, b) => a.date.localeCompare(b.date)),
    [entries]
  );
  const conflictSlots = useMemo(() => {
    const count = new Map<string, number>();
    pastorVisits.forEach(e => {
      const k = `${isoToDay(e.date)}|${e.serviceId}`;
      count.set(k, (count.get(k) || 0) + 1);
    });
    return new Set([...count.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  }, [pastorVisits]);
  const notVisited = congregations.filter(c => !pastorVisits.some(e => e.congregationId === c.id));

  const preacherSuggestions = useMemo(() => {
    const names = new Set<string>();
    entries.forEach(e => e.preacher && names.add(e.preacher));
    if (appUser?.name) names.add(appUser.name);
    return [...names].sort();
  }, [entries, appUser]);

  const openCell = (day: string, congregation: Congregation) => {
    if (!canEdit) return;
    const entry = byKey.get(keyOf(day, congregation.id, serviceId));
    setTarget({ day, congregation, entry });
    setForm(
      entry
        ? {
            preacher: entry.preacher || '',
            theme: entry.theme || '',
            specialId: entry.specialId || '',
            pastorVisit: !!entry.pastorVisit,
            notes: entry.notes || '',
          }
        : EMPTY_FORM
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser || !target) return;
    setSaving(true);
    const optional: Record<string, string> = {};
    (['preacher', 'theme', 'specialId', 'notes'] as const).forEach(k => {
      if (form[k].trim()) optional[k] = form[k].trim();
    });
    try {
      if (target.entry) {
        const cleared: Record<string, unknown> = {};
        (['preacher', 'theme', 'specialId', 'notes'] as const).forEach(k => {
          if (!(k in optional) && target.entry![k] !== undefined) cleared[k] = deleteField();
        });
        await updateDoc(doc(db, 'schedules', target.entry.id), {
          ...optional,
          ...cleared,
          pastorVisit: form.pastorVisit,
        });
      } else {
        await addDoc(collection(db, 'schedules'), {
          ...optional,
          congregationId: target.congregation.id,
          date: dayToIso(target.day),
          serviceId,
          pastorVisit: form.pastorVisit,
          createdBy: appUser.uid,
          createdAt: new Date().toISOString(),
        });
      }
      setTarget(null);
    } catch (error) {
      console.error('Erro ao salvar planejamento: ', error);
      alert('Erro ao salvar. Verifique as permissões.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!target?.entry) return;
    if (!confirm('Remover esta programação?')) return;
    try {
      await deleteDoc(doc(db, 'schedules', target.entry.id));
      setTarget(null);
    } catch (error) {
      console.error('Erro ao remover programação: ', error);
      alert('Erro ao remover. Verifique as permissões.');
    }
  };

  const buildShareText = () => {
    const title = `*Escala — ${service.name} — ${format(month, 'MMMM yyyy', { locale: ptBR })}*`;
    const blocks = days.map(day => {
      const lines = congregations
        .map(c => {
          const entry = byKey.get(keyOf(day, c.id, serviceId));
          if (!entry) return null;
          const parts = [entry.preacher || 'a definir'];
          const special = getSpecial(entry.specialId);
          if (special) parts.push(`(${special.name})`);
          if (entry.pastorVisit) parts.push('⭐ Pastor');
          return `• ${c.name}: ${parts.join(' ')}`;
        })
        .filter(Boolean);
      const header = `📅 ${format(new Date(`${day}T12:00:00`), "dd/MM (EEEE)", { locale: ptBR })}`;
      return [header, ...(lines.length ? lines : ['• (sem programação lançada)'])].join('\n');
    });
    return [title, '', ...blocks.flatMap(b => [b, ''])].join('\n').trim();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Não foi possível copiar. Tente novamente.');
    }
  };

  const monthLabel = format(month, 'MMMM yyyy', { locale: ptBR });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planejamento das Congregações</h1>
          <p className="text-gray-500">Escala de cultos, pregadores e visitas pastorais.</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            onClick={handleCopy}
            className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
          >
            <ClipboardCopy className="w-4 h-4 mr-2" />
            {copied ? 'Copiado!' : 'Copiar p/ WhatsApp'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Mês + tipo de culto */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth(m => subMonths(m, 1))}
            className="p-2 rounded-md hover:bg-gray-100 print:hidden"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-semibold text-gray-900 capitalize min-w-40 text-center">{monthLabel}</span>
          <button
            onClick={() => setMonth(m => addMonths(m, 1))}
            className="p-2 rounded-md hover:bg-gray-100 print:hidden"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMonth(startOfMonth(new Date()))}
            className="ml-1 text-sm text-blue-600 hover:underline print:hidden"
          >
            Hoje
          </button>
        </div>
        <div className="flex flex-wrap gap-1 print:hidden">
          {SERVICES.map(s => (
            <button
              key={s.id}
              onClick={() => setServiceId(s.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium',
                s.id === serviceId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
        <span className="hidden print:block font-medium">{service.name}</span>
      </div>

      {loadingCongregations ? (
        <div className="text-center py-10 text-gray-500">Carregando...</div>
      ) : congregations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <Church className="w-12 h-12 mx-auto text-gray-300" />
          <p className="mt-3 text-gray-600 font-medium">Cadastre as congregações para começar o planejamento.</p>
          <Link to="/congregations" className="text-blue-600 hover:underline text-sm">
            Ir para Congregações
          </Link>
        </div>
      ) : (
        <>
          {/* Grade: datas x congregações */}
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 w-28">Data</th>
                  {congregations.map(c => (
                    <th key={c.id} className="px-4 py-3 text-left font-semibold text-gray-700 min-w-44">
                      {c.name}
                      <span className="block text-xs font-normal text-gray-400">{c.type === 'igreja' ? 'Igreja' : 'Grupo'}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {days.map(day => {
                  const conflict = conflictSlots.has(`${day}|${serviceId}`);
                  return (
                    <tr key={day} className={cn(conflict && 'bg-red-50')}>
                      <td className={cn('sticky left-0 px-4 py-3 align-top', conflict ? 'bg-red-50' : 'bg-white')}>
                        <div className="font-semibold text-gray-900">{format(new Date(`${day}T12:00:00`), 'dd/MM')}</div>
                        <div className="text-xs text-gray-500 capitalize">
                          {format(new Date(`${day}T12:00:00`), 'EEEE', { locale: ptBR })}
                        </div>
                        {conflict && (
                          <div className="mt-1 flex items-center text-xs text-red-600 font-medium" title="Pastor marcado em mais de uma congregação">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Conflito
                          </div>
                        )}
                      </td>
                      {congregations.map(c => {
                        const entry = byKey.get(keyOf(day, c.id, serviceId));
                        const special = getSpecial(entry?.specialId);
                        return (
                          <td key={c.id} className="px-2 py-2 align-top">
                            <button
                              type="button"
                              onClick={() => openCell(day, c)}
                              disabled={!canEdit}
                              className={cn(
                                'w-full min-h-16 text-left rounded-md p-2 border transition-colors',
                                entry
                                  ? 'border-gray-200 bg-white hover:border-blue-300'
                                  : 'border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500',
                                entry?.pastorVisit && 'border-amber-300 bg-amber-50',
                                !canEdit && 'cursor-default hover:border-gray-200'
                              )}
                            >
                              {entry ? (
                                <>
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="font-medium text-gray-900">{entry.preacher || 'A definir'}</span>
                                    {entry.pastorVisit && (
                                      <Star className="w-4 h-4 text-amber-500 fill-amber-400 flex-shrink-0" aria-label="Visita do pastor" />
                                    )}
                                  </div>
                                  {entry.theme && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{entry.theme}</div>}
                                  {special && (
                                    <span className={cn('inline-block mt-1 text-[11px] font-medium px-1.5 py-0.5 rounded', special.color)}>
                                      {special.name}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs">{canEdit ? '+ Adicionar' : '—'}</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Resumo pastoral */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <Star className="w-5 h-5 mr-2 text-amber-500" />
                Agenda do pastor em <span className="ml-1 capitalize">{format(month, 'MMMM', { locale: ptBR })}</span>
              </h2>
              {pastorVisits.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nenhuma visita pastoral marcada. Marque “Visita do pastor” ao lançar uma programação.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {pastorVisits.map(e => {
                    const conflict = conflictSlots.has(`${isoToDay(e.date)}|${e.serviceId}`);
                    return (
                      <li key={e.id} className="py-2 flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-gray-900">
                            {format(new Date(`${isoToDay(e.date)}T12:00:00`), 'dd/MM (EEE)', { locale: ptBR })}
                          </span>
                          <span className="text-gray-500"> · {getService(e.serviceId).short}</span>
                          <div className="text-gray-700">{congregationName(e.congregationId)}</div>
                        </div>
                        {conflict && (
                          <span className="flex items-center text-xs text-red-600 font-medium">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Conflito
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <Church className="w-5 h-5 mr-2 text-blue-500" />
                Congregações sem visita pastoral no mês
              </h2>
              {notVisited.length === 0 ? (
                <p className="text-sm text-green-700">Todas as congregações receberão visita do pastor neste mês. 🙌</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {notVisited.map(c => (
                    <span key={c.id} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Programações especiais no mês</h3>
                {entries.filter(e => e.specialId).length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhuma.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {entries
                      .filter(e => e.specialId)
                      .map(e => {
                        const special = getSpecial(e.specialId)!;
                        return (
                          <li key={e.id} className="flex items-center gap-2">
                            <span className={cn('text-[11px] font-medium px-1.5 py-0.5 rounded', special?.color)}>
                              {special?.name}
                            </span>
                            <span className="text-gray-700">
                              {format(new Date(`${isoToDay(e.date)}T12:00:00`), 'dd/MM')} · {congregationName(e.congregationId)}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de edição da célula */}
      {target && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setTarget(null)} />
            <div className="relative bg-white rounded-lg text-left shadow-xl w-full max-w-lg">
              <form onSubmit={handleSave}>
                <div className="px-4 pt-5 pb-4 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900">{target.congregation.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {service.name} ·{' '}
                    {format(new Date(`${target.day}T12:00:00`), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Pregador</label>
                      <input
                        type="text"
                        list="preacher-suggestions"
                        maxLength={100}
                        className={inputClass}
                        value={form.preacher}
                        onChange={e => setForm({ ...form, preacher: e.target.value })}
                        placeholder="Nome do pregador"
                        autoFocus
                      />
                      <datalist id="preacher-suggestions">
                        {preacherSuggestions.map(n => (
                          <option key={n} value={n} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tema / Observação do sermão</label>
                      <input
                        type="text"
                        maxLength={200}
                        className={inputClass}
                        value={form.theme}
                        onChange={e => setForm({ ...form, theme: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Programação especial</label>
                      <select
                        className={inputClass}
                        value={form.specialId}
                        onChange={e => setForm({ ...form, specialId: e.target.value })}
                      >
                        <option value="">Nenhuma (culto regular)</option>
                        {SPECIALS.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-amber-500"
                        checked={form.pastorVisit}
                        onChange={e => setForm({ ...form, pastorVisit: e.target.checked })}
                      />
                      <Star className="w-4 h-4 text-amber-500" />
                      Visita do pastor
                    </label>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Notas</label>
                      <textarea
                        maxLength={1000}
                        className={inputClass}
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 flex items-center gap-3 rounded-b-lg">
                  {target.entry && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="mr-auto inline-flex items-center text-sm text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remover
                    </button>
                  )}
                  <div className="ml-auto flex gap-3">
                    <button
                      type="button"
                      onClick={() => setTarget(null)}
                      className="inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex justify-center rounded-md px-4 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
