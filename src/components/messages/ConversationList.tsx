'use client';
import React from 'react';
import { Conversation } from '@/app/messages/page';

interface Props {
  conversations: Conversation[];
  onSelect: (phone: string) => void;
  selectedId: string | null;
}

function getInitials(phone: string) {
  return phone.slice(-2);
}

function formatTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMin = (now.getTime() - d.getTime()) / 60000;
  if (diffMin < 60) return `${Math.floor(diffMin)}m`;
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)}h`;
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

// Colores según el número de teléfono (consistentes)
const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500',
  'bg-sky-500', 'bg-violet-500', 'bg-teal-500', 'bg-orange-500',
];
function avatarColor(phone: string) {
  const sum = [...phone].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export default function ConversationList({ conversations, onSelect, selectedId }: Props) {
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-base font-bold text-gray-800">💬 Conversaciones</h2>
        <p className="text-xs text-gray-400 mt-0.5">{conversations.length} chats</p>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400">
            <span className="text-4xl mb-2">💬</span>
            <p className="text-sm">Sin conversaciones aún</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.phone_number}
              onClick={() => onSelect(conv.phone_number)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${selectedId === conv.phone_number ? 'bg-indigo-50 border-r-2 border-indigo-500' : ''
                }`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full ${avatarColor(conv.phone_number)} flex items-center justify-center text-white text-sm font-bold`}>
                {getInitials(conv.phone_number)}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {conv.phone_number}
                  </p>
                  <span className="text-xs text-gray-400 ml-1 flex-shrink-0">
                    {formatTime(conv.lastTimestamp || '')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {conv.lastMessage || '...'}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}