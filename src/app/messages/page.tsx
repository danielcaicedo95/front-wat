'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  lastTimestamp: string;
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMobileChat, setIsMobileChat] = useState(false);

  // ── Cargar conversaciones ──────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('phone_number, text, timestamp')
      .order('timestamp', { ascending: false });

    if (error || !data) return;

    const unique: Record<string, Conversation> = {};
    for (const msg of data) {
      if (!unique[msg.phone_number]) {
        unique[msg.phone_number] = {
          phone_number: msg.phone_number,
          lastMessage: msg.text,
          lastTimestamp: msg.timestamp,
        };
      }
    }
    // Ordenar por más reciente
    setConversations(
      Object.values(unique).sort(
        (a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
      )
    );
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── Cargar mensajes del número seleccionado ────────────────────────────────
  useEffect(() => {
    if (!selectedNumber) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('phone_number', selectedNumber)
        .order('timestamp', { ascending: true });
      setMessages((data as Message[]) || []);
    };

    fetchMessages();

    // Realtime: nuevos mensajes en este chat
    const channel = supabase
      .channel(`chat-${selectedNumber}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `phone_number=eq.${selectedNumber}` },
        (payload) => {
          setMessages((prev) => {
            // Evitar duplicados (mensaje optimista ya agregado)
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
          // Actualizar también la lista de conversaciones
          loadConversations();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedNumber, loadConversations]);

  const handleSelect = (phone: string) => {
    setSelectedNumber(phone);
    setIsMobileChat(true);
  };

  const handleBack = () => {
    setIsMobileChat(false);
    setSelectedNumber(null);
  };

  const handleMessageSent = (msg: Message) => {
    setMessages((prev) => [...prev, msg]);
    loadConversations();
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar — conversaciones */}
      <div className={`
        ${isMobileChat ? 'hidden' : 'flex'} md:flex
        flex-col w-full md:w-72 lg:w-80 flex-shrink-0
      `}>
        <ConversationList
          conversations={conversations}
          onSelect={handleSelect}
          selectedId={selectedNumber}
        />
      </div>

      {/* Panel de chat */}
      <div className={`
        ${isMobileChat ? 'flex' : 'hidden'} md:flex
        flex-1 flex-col min-w-0
      `}>
        <ChatWindow
          messages={messages}
          selectedPhone={selectedNumber}
          onBack={handleBack}
          onMessageSent={handleMessageSent}
        />
      </div>
    </div>
  );
}
