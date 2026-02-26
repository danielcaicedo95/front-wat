'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ConversationList from '@/components/messages/ConversationList';
import ChatWindow from '@/components/messages/ChatWindow';

export type Message = {
  id: string;
  phone_number: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
};

export type Conversation = {
  phone_number: string;
  lastMessage: string;
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [view, setView] = useState<'list' | 'chat'>('list');

  useEffect(() => {
    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('phone_number, text, timestamp')
        .order('timestamp', { ascending: false });

      if (error || !data) {
        console.error('Error cargando conversaciones:', error?.message);
        return;
      }

      const unique: Record<string, Conversation> = {};
      for (const msg of data) {
        if (!unique[msg.phone_number]) {
          unique[msg.phone_number] = {
            phone_number: msg.phone_number,
            lastMessage: msg.text,
          };
        }
      }

      setConversations(Object.values(unique));
    };

    fetchConversations();
  }, []);

  useEffect(() => {
    if (!selectedNumber) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('phone_number', selectedNumber)
        .order('timestamp');

      setMessages((data as Message[]) || []);
    };

    fetchMessages();

    const channel = supabase
      .channel(`messages-${selectedNumber}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `phone_number=eq.${selectedNumber}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedNumber]);

  const handleSelect = (phone: string) => {
    setSelectedNumber(phone);
    setView('chat'); // solo móvil
  };

  const handleBack = () => {
    setView('list');
  };

  return (
    <div className="flex h-screen">
      {/* Lista de conversaciones: siempre visible en desktop, condicional en mobile */}
      <div className={`${selectedNumber ? 'hidden md:block' : 'block'} w-full md:w-72`}>
        <ConversationList
          conversations={conversations}
          onSelect={setSelectedNumber}
          selectedId={selectedNumber}
        />
      </div>
  
      {/* Ventana del chat: condicional en mobile, siempre visible si hay número seleccionado */}
      <div className={`${selectedNumber ? 'block' : 'hidden'} md:flex flex-1`}>
        <ChatWindow
          messages={messages}
          onBack={() => setSelectedNumber(null)} // Solo se activa en mobile
        />
      </div>
    </div>
  );
  
}
