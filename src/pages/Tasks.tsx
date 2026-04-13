import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, AppUser } from '../contexts/AuthContext';
import { CheckSquare, Plus, Clock, CheckCircle, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { DEPARTMENTS, getDepartmentName } from '../constants/departments';

export function Tasks() {
  const { appUser } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', assignedTo: '', departmentId: 'geral' });

  useEffect(() => {
    // Fetch Tasks
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Users for assignment
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as AppUser));
    });

    return () => {
      unsubscribe();
      unsubscribeUsers();
    };
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    try {
      await addDoc(collection(db, 'tasks'), {
        ...newTask,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
        status: 'pending',
        createdBy: appUser.uid,
        createdAt: new Date().toISOString(),
      });
      setIsModalOpen(false);
      setNewTask({ title: '', description: '', dueDate: '', assignedTo: '', departmentId: 'geral' });
    } catch (error) {
      console.error("Error adding task: ", error);
      alert("Erro ao adicionar tarefa. Verifique as permissões.");
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        status: currentStatus === 'pending' ? 'completed' : 'pending'
      });
    } catch (error) {
      console.error("Error updating task: ", error);
      alert("Erro ao atualizar tarefa.");
    }
  };

  const canAdd = appUser?.role === 'admin' || appUser?.role === 'leader';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarefas</h1>
          <p className="text-gray-500">Gerenciamento de atividades.</p>
        </div>
        {canAdd && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Tarefa
          </button>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {tasks.length === 0 ? (
            <li className="px-6 py-4 text-center text-gray-500">Nenhuma tarefa encontrada.</li>
          ) : (
            tasks.map((task) => {
              const assignedUser = users.find(u => u.uid === task.assignedTo);
              const isCompleted = task.status === 'completed';
              
              return (
                <li key={task.id}>
                  <div className="px-4 py-4 sm:px-6 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center flex-1 min-w-0">
                      <button 
                        onClick={() => toggleTaskStatus(task.id, task.status)}
                        className="flex-shrink-0 mr-4 focus:outline-none"
                        disabled={task.assignedTo !== appUser?.uid && appUser?.role !== 'admin' && appUser?.role !== 'leader'}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-6 w-6 text-green-500" />
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-gray-300 hover:border-orange-500" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {task.title}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{task.description}</p>
                        <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                          {task.dueDate && (
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {format(new Date(task.dueDate), "dd/MM/yyyy")}
                            </span>
                          )}
                          <span>Atribuído a: {assignedUser?.name || 'Desconhecido'}</span>
                          <span className="flex items-center">
                            <Tag className="w-3 h-3 mr-1" />
                            {getDepartmentName(task.departmentId)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>

      {/* Modal Add Task */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setIsModalOpen(false)}></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddTask}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Adicionar Nova Tarefa</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Título</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        value={newTask.title}
                        onChange={e => setNewTask({...newTask, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Descrição</label>
                      <textarea
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        value={newTask.description}
                        onChange={e => setNewTask({...newTask, description: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Data de Entrega</label>
                      <input
                        type="date"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        value={newTask.dueDate}
                        onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Atribuir a</label>
                      <select
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        value={newTask.assignedTo}
                        onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}
                      >
                        <option value="">Selecione um membro...</option>
                        {users.map(user => (
                          <option key={user.uid} value={user.uid}>{user.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Departamento</label>
                      <select
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        value={newTask.departmentId}
                        onChange={e => setNewTask({...newTask, departmentId: e.target.value})}
                      >
                        {DEPARTMENTS.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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
