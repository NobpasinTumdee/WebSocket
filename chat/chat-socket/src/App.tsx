import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://192.168.1.4:3001'); // connect ไปที่ backend

const App: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    socket.on('chat', (msg: string) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('chat');
    };
  }, []);

  const sendMessage = () => {
    if (input.trim()) {
      socket.emit('chat', input);
      setInput('');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>💬 WebSocket Chat (React + TypeScript)</h2>
      <div style={{ height: 300, overflowY: 'auto', border: '1px solid gray', padding: 10 }}>
        {messages.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        style={{ marginTop: 10, width: '80%' }}
      />
      <button onClick={sendMessage} style={{ marginLeft: 10 }}>Send</button>
    </div>
  );
};

export default App;
