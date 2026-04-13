import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  channelId: string;
  createdAt: string;
}

export function Chat() {
  const { appUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen to messages in the general channel
    const q = query(
      collection(db, 'messages'), 
      orderBy('createdAt', 'asc'),
      limit(100) // Limit to last 100 messages for performance
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      // Filter client-side for 'general' channel to avoid needing a composite index immediately
      setMessages(fetchedMessages.filter(m => m.channelId === 'general'));
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      await addDoc(collection(db, 'messages'), {
        text: messageText,
        senderId: appUser.uid,
        senderName: appUser.name,
        channelId: 'general',
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Erro ao enviar mensagem.");
      setNewMessage(messageText); // Restore input on failure
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center">
        <MessageSquare className="w-5 h-5 text-blue-600 mr-2" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Chat Geral</h2>
          <p className="text-xs text-gray-500">Comunicação com todos os membros do distrito</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2">
            <MessageSquare className="w-8 h-8 text-gray-300" />
            <p>Nenhuma mensagem ainda. Seja o primeiro a dizer olá!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === appUser?.uid;
            const showName = index === 0 || messages[index - 1].senderId !== msg.senderId;
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {showName && !isMe && (
                  <span className="text-xs text-gray-500 mb-1 ml-1">{msg.senderName}</span>
                )}
                <div 
                  className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                    isMe 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm shadow-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                </div>
                <span className="text-[10px] text-gray-400 mt-1 mx-1">
                  {format(new Date(msg.createdAt), "HH:mm", { locale: ptBR })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 border-gray-300 rounded-full px-4 py-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 border"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center w-10 h-10"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
