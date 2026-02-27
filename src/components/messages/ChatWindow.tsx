'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Message } from '@/app/messages/page';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface Props {
  messages: Message[];
  selectedPhone: string | null;
  onBack?: () => void;
  onMessageSent?: (msg: Message) => void;
}

function formatTime(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

const AVATAR_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-violet-500'];
function avatarColor(phone: string) {
  const sum = [...phone].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export default function ChatWindow({ messages, selectedPhone, onBack, onMessageSent }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll al último mensaje cada vez que llegan mensajes nuevos
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !selectedPhone || sending) return;
    setSending(true);
    setSendError('');

    try {
      const res = await fetch(`${API_URL}/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: selectedPhone, message: text.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        setSendError(err.detail || 'Error al enviar');
        return;
      }

      // El mensaje se agrega vía Supabase Realtime automáticamente,
      // pero también lo agregamos de forma optimista para respuesta inmediata
      const optimistic: Message = {
        id: `opt-${Date.now()}`,
        phone_number: selectedPhone,
        role: 'model',
        text: text.trim(),
        timestamp: new Date().toISOString(),
      };
      onMessageSent?.(optimistic);
      setText('');
      textareaRef.current?.focus();
    } catch (e) {
      setSendError('No se pudo conectar al servidor');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!selectedPhone) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
        <span className="text-5xl mb-3">💬</span>
        <p className="text-sm font-medium">Selecciona una conversación</p>
        <p className="text-xs mt-1">para ver los mensajes</p>
      </div>
    );
  }

  const initials = selectedPhone.slice(-2);

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header del chat */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        {/* Botón volver (solo móvil) */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden mr-1 p-1 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full ${avatarColor(selectedPhone)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">{selectedPhone}</p>
          <p className="text-xs text-emerald-500 font-medium">WhatsApp</p>
        </div>
      </div>

      {/* Mensajes */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        style={{ backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: '24px 24px', backgroundColor: '#f3f4f6' }}
      >
        {messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-xs text-gray-400 bg-white px-3 py-1.5 rounded-full shadow-sm">Sin mensajes</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const showTime = !prevMsg || msg.role !== prevMsg.role;

            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                  {showTime && (
                    <span className={`text-[10px] text-gray-400 mb-0.5 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                      {isUser ? 'Cliente' : '🤖 Bot'} · {formatTime(msg.timestamp)}
                    </span>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${isUser
                        ? 'bg-white text-gray-800 rounded-tr-sm'
                        : 'bg-indigo-600 text-white rounded-tl-sm'
                      }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Caja de respuesta */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        {sendError && (
          <p className="text-xs text-red-500 mb-2">⚠️ {sendError}</p>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-gray-100 rounded-2xl px-3 py-2 flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => { setText(e.target.value); setSendError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje... (Enter para enviar)"
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 resize-none outline-none max-h-28 overflow-y-auto"
              style={{ minHeight: '24px' }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${text.trim() && !sending
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md'
                : 'bg-gray-200 cursor-not-allowed'
              }`}
          >
            {sending ? (
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className={`w-5 h-5 ${text.trim() ? 'text-white' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">
          El mensaje se enviará por WhatsApp · <span className="text-amber-500">⚠️ el bot quedará en pausa para este número</span>
        </p>
      </div>
    </div>
  );
}
