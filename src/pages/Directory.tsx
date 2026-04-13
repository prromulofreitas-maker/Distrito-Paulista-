import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, AppUser } from '../contexts/AuthContext';
import { Mail, Tag, Edit2, X, Check } from 'lucide-react';
import { DEPARTMENTS, getDepartmentName } from '../constants/departments';

export function Directory() {
  const { appUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ role: 'member', departmentId: 'geral' });

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as AppUser));
    });
    return () => unsubscribe();
  }, []);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'leader': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'leader': return 'Líder';
      default: return 'Membro';
    }
  };

  const handleEditClick = (user: AppUser) => {
    setEditForm({
      role: user.role,
      departmentId: user.departmentId || 'geral'
    });
    setEditingUserId(user.uid);
  };

  const handleSaveEdit = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: editForm.role,
        departmentId: editForm.departmentId
      });
      setEditingUserId(null);
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Erro ao atualizar usuário. Verifique suas permissões.");
    }
  };

  const isAdmin = appUser?.role === 'admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Diretório</h1>
        <p className="text-gray-500">Membros e líderes do distrito.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <div key={user.uid} className="bg-white rounded-lg shadow flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                {editingUserId === user.uid ? (
                  <select
                    className="text-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={editForm.role}
                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                  >
                    <option value="member">Membro</option>
                    <option value="leader">Líder</option>
                    <option value="admin">Administrador</option>
                  </select>
                ) : (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                )}
              </div>
              
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-gray-900 truncate pr-2">{user.name}</h3>
                {isAdmin && editingUserId !== user.uid && (
                  <button onClick={() => handleEditClick(user)} className="text-gray-400 hover:text-blue-600">
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-500">
                  <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                  <a href={`mailto:${user.email}`} className="hover:text-blue-600 truncate">
                    {user.email}
                  </a>
                </div>
                
                <div className="flex items-center text-sm text-gray-500">
                  <Tag className="w-4 h-4 mr-2 flex-shrink-0" />
                  {editingUserId === user.uid ? (
                    <select
                      className="text-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-full"
                      value={editForm.departmentId}
                      onChange={(e) => setEditForm({...editForm, departmentId: e.target.value})}
                    >
                      {DEPARTMENTS.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="truncate">{getDepartmentName(user.departmentId || 'geral')}</span>
                  )}
                </div>
              </div>

              {editingUserId === user.uid && (
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => setEditingUserId(null)}
                    className="flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    <X className="w-3 h-3 mr-1" /> Cancelar
                  </button>
                  <button
                    onClick={() => handleSaveEdit(user.uid)}
                    className="flex items-center px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    <Check className="w-3 h-3 mr-1" /> Salvar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
