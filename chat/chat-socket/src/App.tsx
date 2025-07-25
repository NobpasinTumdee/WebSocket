import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import './App.css';

type Message = {
  id: number;
  content: string;
  createdAt: string;
  senderId?: string;
};

const socket: Socket = io('http://localhost:3001');

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    // ดึง socket.id ของตัวเอง
    socket.on('connect', () => {
      setMyId(String(socket.id));
    });

    // โหลดข้อความเก่า
    axios.get<Message[]>('http://localhost:3001/messages')
      .then(res => setMessages(res.data));

    // ฟังข้อความใหม่
    socket.on('chat', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('chat-cleared', () => {
      setMessages([]);
    });

    return () => {
      socket.off('chat');
      socket.off('chat-cleared');
    };
  }, []);

  const sendMessage = () => {
    if (input.trim()) {
      socket.emit('chat', input);
      setInput('');
    }
  };

  const clearAllMessages = async () => {
    await axios.delete('http://localhost:3001/delete');
    setMessages([]);
  };


  return (
    <>
      <h1 style={{ textAlign: 'center' }}>💬 WebSocket Chat</h1>

      <div className='phone-container'>
        <div className='header-phone'>
          <img src="https://upload-os-bbs.hoyolab.com/upload/2021/09/24/24211997/365954e3bddb8802db36385b3b162295_3694980290945719298.jpg" alt="" />
          <h3 style={{ margin: '0' }}>PorGz</h3>
          <button onClick={clearAllMessages} className='button-clear'>Clear</button>
        </div>

        <div className='chat-container'>
          {messages.map((msg) => {
            const isMe = msg.senderId === myId;
            return (
              <div
                key={msg.id}
                className={`chat ${isMe ? 'sender' : 'receiver'}`}
              >
                {msg.content}
                <br />
                <small>{new Date(msg.createdAt).toLocaleTimeString()}</small>
              </div>
            );
          })}
        </div>

        <div className='input-chat'>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            required
            className='input-phone'
          />
          <button onClick={sendMessage} className='button-send'>
            send
          </button>
        </div>
      </div>
    </>
  );
};

export default App;
