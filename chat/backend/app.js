const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');


// prisma
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// ดึงข้อความทั้งหมดเมื่อ client ขอ
app.get('/messages', async (req, res) => {
    const messages = await prisma.message.findMany({
        orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
});

app.delete('/delete', async (req, res) => {
    const result = await prisma.message.deleteMany();
    io.emit('chat-cleared'); // ส่ง event ไปทุก client
    res.json({ deletedCount: result.count });
});

io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    socket.on('chat', async (messageText) => {
        // 1. บันทึกข้อความลงฐานข้อมูล
        const saved = await prisma.message.create({
            data: { content: messageText }
        });

        const payload = {
            ...saved,
            senderId: socket.id, // แนบ id ของคนส่ง
        };

        // 2. ส่งข้อความกลับไปยังทุก client
        io.emit('chat', payload);
    });

    socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
    });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
