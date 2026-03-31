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

const renderTextWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline font-medium hover:opacity-80 break-all">
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

const MessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`mb-2 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`p-3 rounded-lg max-w-sm sm:max-w-md whitespace-pre-wrap ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
        {renderTextWithLinks(message.text)}
      </div>
    </div>
  );
};

export default MessageBubble;
