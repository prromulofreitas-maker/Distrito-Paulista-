import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Bell, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DEPARTMENTS } from '../constants/departments';
import { cn } from '../lib/utils';
import { EventCarousel } from '../components/EventCarousel';

export function Dashboard() {
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!appUser) return;

    // Fetch recent events (increased limit to support carousel)
    const eventsQuery = query(collection(db, 'events'), orderBy('date', 'asc'), limit(10));
    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      setRecentEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch recent announcements
    const announcementsQuery = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(3));
    const unsubscribeAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
      setRecentAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch pending tasks for the user
    // Note: In a real app, we would query where('assignedTo', '==', appUser.uid) and where('status', '==', 'pending')
    // But this requires a composite index. For simplicity in this demo, we'll fetch recent tasks and filter.
    const tasksQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setPendingTasks(tasks.filter(t => t.assignedTo === appUser.uid && t.status === 'pending').slice(0, 3));
    });

    return () => {
      unsubscribeEvents();
      unsubscribeAnnouncements();
      unsubscribeTasks();
    };
  }, [appUser]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Olá, {appUser?.name}</h1>
        <p className="text-gray-500">Bem-vindo ao painel do Distrito de Paulista - Conectados em Missão.</p>
      </div>

      <EventCarousel events={recentEvents} />

      {/* Departments Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Departamentos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {DEPARTMENTS.filter(d => d.id !== 'geral').map(dept => {
            const Icon = dept.icon;
            return (
              <div 
                key={dept.id} 
                onClick={() => navigate(`/materials?department=${dept.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-3", dept.bgColor, dept.color)}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium text-gray-700 leading-tight">{dept.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Avisos */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-blue-500" />
              Avisos Recentes
            </h2>
          </div>
          <div className="space-y-4">
            {recentAnnouncements.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum aviso recente.</p>
            ) : (
              recentAnnouncements.map(announcement => (
                <div key={announcement.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <h3 className="text-sm font-medium text-gray-900">{announcement.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{announcement.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Eventos */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-green-500" />
              Próximos Eventos
            </h2>
          </div>
          <div className="space-y-4">
            {recentEvents.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum evento próximo.</p>
            ) : (
              recentEvents.slice(0, 3).map(event => (
                <div key={event.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <h3 className="text-sm font-medium text-gray-900">{event.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(event.date), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-gray-500">{event.location}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tarefas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <CheckSquare className="w-5 h-5 mr-2 text-orange-500" />
              Minhas Tarefas
            </h2>
          </div>
          <div className="space-y-4">
            {pendingTasks.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma tarefa pendente.</p>
            ) : (
              pendingTasks.map(task => (
                <div key={task.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                  {task.dueDate && (
                    <p className="text-xs text-red-500 mt-1">
                      Prazo: {format(new Date(task.dueDate), "dd/MM/yyyy")}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
