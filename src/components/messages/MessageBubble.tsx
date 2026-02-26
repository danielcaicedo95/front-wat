'use client';
import React from 'react';

type Message = {
  id: string;
  role: 'user' | 'model'; // ✅ usamos el mismo nombre que en page.tsx
  text: string;
  timestamp: string;      // ✅ usamos timestamp, no created_at
};

type Props = {
  message: Message;
};

const MessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`mb-2 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`p-3 rounded-lg max-w-xs ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
        {message.text}
      </div>
    </div>
  );
};

export default MessageBubble;
