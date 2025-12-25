import React, { useState, useRef, useEffect } from 'react';
import { askGeminiAssistant } from '../services/geminiService';

const GeminiChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([
    { role: 'bot', text: 'Halo! Ada yang bisa dibantu untuk pendaftaran Pushbike Kudus?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    const botResponse = await askGeminiAssistant(userMsg);
    
    setMessages(prev => [...prev, { role: 'bot', text: botResponse }]);
    setIsLoading(false);
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-white border border-slate-200 shadow-xl rounded-lg w-80 h-96 flex flex-col mb-4 overflow-hidden">
          <div className="bg-orange-500 text-white p-3 flex justify-between items-center">
            <h3 className="font-semibold text-sm">Bantuan Pushbike</h3>
            <button onClick={toggleChat} className="text-white hover:text-orange-200">&times;</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] text-sm p-2 rounded-lg ${m.role === 'user' ? 'bg-orange-100 text-orange-900' : 'bg-white border text-slate-700'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && <div className="text-xs text-slate-400 italic">Sedang mengetik...</div>}
            <div ref={endRef} />
          </div>
          <div className="p-2 bg-white border-t flex">
            <input
              type="text"
              className="flex-1 text-sm border rounded-l-md px-2 py-1 focus:outline-none focus:border-orange-500"
              placeholder="Tanya sesuatu..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button 
              onClick={sendMessage}
              disabled={isLoading}
              className="bg-orange-500 text-white px-3 py-1 rounded-r-md text-sm hover:bg-orange-600 disabled:opacity-50"
            >
              Kirim
            </button>
          </div>
        </div>
      )}
      <button 
        onClick={toggleChat}
        className="bg-orange-600 hover:bg-orange-700 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-105 flex items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    </div>
  );
};

export default GeminiChat;
