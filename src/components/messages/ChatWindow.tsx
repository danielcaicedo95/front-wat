import React from 'react';
import { Message } from '@/app/messages/page';

interface Props {
  messages: Message[];
  onBack?: () => void;
}

export default function ChatWindow({ messages, onBack }: Props) {
  return (
    <div className="flex-1 flex flex-col bg-white h-full relative">
      {/* Botón de volver (solo en mobile) */}
      {onBack && (
        <button
          onClick={onBack}
          className="md:hidden absolute top-2 left-2 z-10 bg-blue-500 text-white px-3 py-1 rounded-md"
        >
          ← Back
        </button>
      )}

      <div className="flex-1 p-4 pt-10 space-y-2 overflow-y-auto flex flex-col">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 rounded-md max-w-xs md:max-w-md break-words ${
              msg.role === 'user'
                ? 'bg-gray-200 md:self-end md:text-right'
                : 'bg-blue-200 md:self-start md:text-left'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>
    </div>
  );
}
