// components/messages/ConversationList.tsx
import React from 'react';
import { Conversation } from '@/app/messages/page';

interface Props {
  conversations: Conversation[];
  onSelect: (phone: string) => void;
  selectedId: string | null;
}

export default function ConversationList({
    conversations,
    onSelect,
    selectedId,
  }: Props) {
    return (
      <div className="w-full md:w-72 min-w-[220px] max-w-xs border-r border-gray-300 bg-white overflow-y-auto h-full">
        <h2 className="text-lg font-semibold p-4 border-b">Conversaciones</h2>
        {conversations.map((conv) => (
          <div
            key={conv.phone_number}
            onClick={() => onSelect(conv.phone_number)}
            className={`p-3 cursor-pointer hover:bg-gray-100 ${
              selectedId === conv.phone_number ? 'bg-blue-100' : ''
            }`}
          >
            <p className="font-bold text-sm text-gray-800 truncate">
              {conv.phone_number || 'Número no disponible'}
            </p>
            <p className="text-gray-500 text-sm truncate">{conv.lastMessage}</p>
          </div>
        ))}
      </div>
    );
  }
  