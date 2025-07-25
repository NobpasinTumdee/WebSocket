// server.js
const WebSocket = require('ws');
const { PrismaClient } = require('@prisma/client');
const http = require('http'); // ใช้ http module เพื่อรองรับ CORS ง่ายๆ

const WS_PORT = 8080;
const prisma = new PrismaClient(); // สร้าง Instance ของ Prisma Client

// สร้าง HTTP Server (ใช้สำหรับ CORS Preflight request ได้ถ้าจำเป็น)
// และเพื่อให้ WebSocket Server ใช้ port เดียวกัน
const server = http.createServer((req, res) => {
    // Basic CORS header for simplicity (only if your client is on a different origin)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { // Handle preflight requests
        res.writeHead(204);
        res.end();
        return;
    }

    // This HTTP server is mainly for WebSocket upgrade.
    // For full REST API, you'd integrate Express.
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket server is running. Connect via WebSocket client.\n');
});

const wss = new WebSocket.Server({ server });

console.log(`WebSocket Server กำลังทำงานที่ ws://localhost:${WS_PORT}`);

// เก็บ Clients ที่เชื่อมต่ออยู่
const clients = new Set();

// ฟังก์ชันสำหรับ Broadcast ข้อความไปยังทุก Client ที่เชื่อมต่ออยู่
const broadcastMessage = (message) => {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
};

// Event: เมื่อมี Client เชื่อมต่อเข้ามา
wss.on('connection', async ws => {
    console.log('Client เชื่อมต่อเข้ามาแล้ว!');
    clients.add(ws); // เพิ่ม Client เข้าไปใน Set

    try {
        // ดึงข้อมูล Message ทั้งหมดจากฐานข้อมูลเมื่อ Client เชื่อมต่อ
        const messages = await prisma.message.findMany({
            orderBy: { timestamp: 'asc' }, // เรียงตามเวลา
        });
        // ส่งข้อมูลทั้งหมดที่ดึงมาให้ Client ที่เพิ่งเชื่อมต่อ
        ws.send(JSON.stringify({ type: 'INITIAL_MESSAGES', payload: messages }));
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อความเริ่มต้น:', error);
        ws.send(JSON.stringify({ type: 'ERROR', message: 'ไม่สามารถดึงข้อความเริ่มต้นได้' }));
    }

    // Event: เมื่อได้รับข้อความจาก Client
    ws.on('message', async message => {
        const receivedData = message.toString();
        console.log(`ได้รับข้อมูลจาก Client: ${receivedData}`);

        try {
            const parsedData = JSON.parse(receivedData);
            if (parsedData.type === 'NEW_MESSAGE' && parsedData.content) {
                // บันทึกข้อความใหม่ลงในฐานข้อมูล
                const newMessage = await prisma.message.create({
                    data: {
                        content: parsedData.content,
                    },
                });
                console.log('บันทึกข้อความใหม่ลงฐานข้อมูล:', newMessage);

                // Broadcast ข้อความใหม่ไปยังทุก Client ที่เชื่อมต่ออยู่
                broadcastMessage({ type: 'NEW_MESSAGE_ADDED', payload: newMessage });
            }
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการประมวลผลข้อความจาก Client หรือบันทึกฐานข้อมูล:', error);
        }
    });

    // Event: เมื่อ Client ปิดการเชื่อมต่อ
    ws.on('close', () => {
        console.log('Client ตัดการเชื่อมต่อแล้ว!');
        clients.delete(ws); // ลบ Client ออกจาก Set
    });

    // Event: เมื่อเกิดข้อผิดพลาด
    ws.on('error', error => {
        console.error('เกิดข้อผิดพลาดกับ Client:', error);
    });
});

// เริ่ม Server
server.listen(WS_PORT, () => {
    console.log(`HTTP/WebSocket Server กำลังทำงานที่ http://localhost:${WS_PORT}`);
});