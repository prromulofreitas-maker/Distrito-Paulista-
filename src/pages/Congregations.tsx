import React, { useState } from 'react';
import { addDoc, collection, deleteDoc, deleteField, doc, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Church, Plus, MapPin, User, Phone, Users, Pencil, Trash2, Droplets, CalendarRange } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCongregations } from '../hooks/useCongregations';
import type { Congregation, CongregationType } from '../constants/congregations';
import { cn } from '../lib/utils';

type FormState = {
  name: string;
  type: CongregationType;
  address: string;
  elderName: string;
  elderPhone: string;
  membersCount: string;
  baptismGoal: string;
  baptismsDone: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  type: 'igreja',
  address: '',
  elderName: '',
  elderPhone: '',
  membersCount: '',
  baptismGoal: '',
  baptismsDone: '',
  notes: '',
};

const inputClass =
  'mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm';

function toForm(c: Congregation): FormState {
  return {
    name: c.name,
    type: c.type,
    address: c.address || '',
    elderName: c.elderName || '',
    elderPhone: c.elderPhone || '',
    membersCount: c.membersCount?.toString() || '',
    baptismGoal: c.baptismGoal?.toString() || '',
    baptismsDone: c.baptismsDone?.toString() || '',
    notes: c.notes || '',
  };
}

/** Monta o documento sem campos vazios (as regras do Firestore aceitam campos opcionais ausentes). */
function toDoc(form: FormState) {
  const data: Record<string, string | number> = { name: form.name.trim(), type: form.type };
  (['address', 'elderName', 'elderPhone', 'notes'] as const).forEach(k => {
    if (form[k].trim()) data[k] = form[k].trim();
  });
  (['membersCount', 'baptismGoal', 'baptismsDone'] as const).forEach(k => {
    if (form[k] !== '') data[k] = Math.max(0, parseInt(form[k], 10) || 0);
  });
  return data;
}

export function Congregations() {
  const { appUser } = useAuth();
  const { congregations, loading } = useCongregations();
  const [editing, setEditing] = useState<Congregation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const canEdit = appUser?.role === 'admin' || appUser?.role === 'leader';

  const totals = congregations.reduce(
    (acc, c) => ({
      members: acc.members + (c.membersCount || 0),
      goal: acc.goal + (c.baptismGoal || 0),
      done: acc.done + (c.baptismsDone || 0),
    }),
    { members: 0, goal: 0, done: 0 }
  );

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (c: Congregation) => {
    setEditing(c);
    setForm(toForm(c));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;
    setSaving(true);
    try {
      if (editing) {
        // updateDoc substitui apenas os campos enviados; remove os que ficaram vazios
        const data = toDoc(form);
        const cleared: Record<string, unknown> = {};
        (['address', 'elderName', 'elderPhone', 'notes', 'membersCount', 'baptismGoal', 'baptismsDone'] as const).forEach(k => {
          if (!(k in data) && editing[k] !== undefined) cleared[k] = deleteField();
        });
        await updateDoc(doc(db, 'congregations', editing.id), { ...data, ...cleared });
      } else {
        await addDoc(collection(db, 'congregations'), {
          ...toDoc(form),
          createdBy: appUser.uid,
          createdAt: new Date().toISOString(),
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar congregação: ', error);
      alert('Erro ao salvar congregação. Verifique as permissões.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Congregation) => {
    if (!confirm(`Excluir a congregação "${c.name}"? O planejamento já lançado para ela continuará salvo.`)) return;
    try {
      await deleteDoc(doc(db, 'congregations', c.id));
    } catch (error) {
      console.error('Erro ao excluir congregação: ', error);
      alert('Erro ao excluir. Apenas administradores podem excluir congregações.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Congregações</h1>
          <p className="text-gray-500">Igrejas e grupos do distrito, liderança e metas.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/planning"
            className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <CalendarRange className="w-5 h-5 mr-2" />
            Planejamento
          </Link>
          {canEdit && (
            <button
              onClick={openNew}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nova Congregação
            </button>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Igrejas" value={congregations.filter(c => c.type === 'igreja').length} />
        <SummaryCard label="Grupos" value={congregations.filter(c => c.type === 'grupo').length} />
        <SummaryCard label="Membros" value={totals.members} />
        <SummaryCard
          label="Batismos no ano"
          value={`${totals.done}${totals.goal ? ` / ${totals.goal}` : ''}`}
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Carregando...</div>
      ) : congregations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <Church className="w-12 h-12 mx-auto text-gray-300" />
          <p className="mt-3 text-gray-600 font-medium">Nenhuma congregação cadastrada.</p>
          {canEdit && <p className="text-sm text-gray-500">Comece cadastrando as igrejas e grupos do distrito.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {congregations.map(c => {
            const pct = c.baptismGoal ? Math.min(100, Math.round(((c.baptismsDone || 0) / c.baptismGoal) * 100)) : 0;
            return (
              <div key={c.id} className="bg-white rounded-lg shadow p-6 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center min-w-0">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                      <Church className="w-5 h-5" />
                    </div>
                    <div className="ml-3 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{c.name}</h3>
                      <span
                        className={cn(
                          'inline-block text-xs font-medium px-2 py-0.5 rounded-full',
                          c.type === 'igreja' ? 'bg-blue-50 text-blue-700' : 'bg-teal-50 text-teal-700'
                        )}
                      >
                        {c.type === 'igreja' ? 'Igreja' : 'Grupo'}
                      </span>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {appUser?.role === 'admin' && (
                        <button onClick={() => handleDelete(c)} className="p-1.5 text-gray-400 hover:text-red-600" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-sm text-gray-600 flex-1">
                  {c.address && (
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                      <span>{c.address}</span>
                    </div>
                  )}
                  {c.elderName && (
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      Ancião: {c.elderName}
                    </div>
                  )}
                  {c.elderPhone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      <a
                        href={`https://wa.me/55${c.elderPhone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {c.elderPhone}
                      </a>
                    </div>
                  )}
                  {c.membersCount !== undefined && (
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-gray-400" />
                      {c.membersCount} membros
                    </div>
                  )}
                  {c.notes && <p className="text-gray-500 italic pt-1">{c.notes}</p>}
                </div>

                {c.baptismGoal ? (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center text-gray-700 font-medium">
                        <Droplets className="w-4 h-4 mr-1 text-sky-500" />
                        Meta de batismos
                      </span>
                      <span className="text-gray-600">
                        {c.baptismsDone || 0} / {c.baptismGoal}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setIsModalOpen(false)} />
            <div className="relative bg-white rounded-lg text-left shadow-xl w-full max-w-lg">
              <form onSubmit={handleSave}>
                <div className="px-4 pt-5 pb-4 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {editing ? 'Editar Congregação' : 'Nova Congregação'}
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Nome</label>
                        <input
                          type="text"
                          required
                          maxLength={100}
                          className={inputClass}
                          value={form.name}
                          onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tipo</label>
                        <select
                          className={inputClass}
                          value={form.type}
                          onChange={e => setForm({ ...form, type: e.target.value as CongregationType })}
                        >
                          <option value="igreja">Igreja</option>
                          <option value="grupo">Grupo</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Endereço</label>
                      <input
                        type="text"
                        maxLength={200}
                        className={inputClass}
                        value={form.address}
                        onChange={e => setForm({ ...form, address: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Primeiro ancião / dirigente</label>
                        <input
                          type="text"
                          maxLength={100}
                          className={inputClass}
                          value={form.elderName}
                          onChange={e => setForm({ ...form, elderName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Telefone (WhatsApp)</label>
                        <input
                          type="tel"
                          maxLength={30}
                          placeholder="(81) 90000-0000"
                          className={inputClass}
                          value={form.elderPhone}
                          onChange={e => setForm({ ...form, elderPhone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Membros</label>
                        <input
                          type="number"
                          min={0}
                          className={inputClass}
                          value={form.membersCount}
                          onChange={e => setForm({ ...form, membersCount: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Meta batismos</label>
                        <input
                          type="number"
                          min={0}
                          className={inputClass}
                          value={form.baptismGoal}
                          onChange={e => setForm({ ...form, baptismGoal: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Realizados</label>
                        <input
                          type="number"
                          min={0}
                          className={inputClass}
                          value={form.baptismsDone}
                          onChange={e => setForm({ ...form, baptismsDone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Observações</label>
                      <textarea
                        maxLength={1000}
                        className={inputClass}
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-row-reverse gap-3 rounded-b-lg">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex justify-center rounded-md px-4 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
