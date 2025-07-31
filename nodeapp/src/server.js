const app = require('./app');
const http = require('http');
const socketIo = require('socket.io');
const PORT = process.env.PORT || 3000;

// Tạo HTTP server
const server = http.createServer(app);

// Khởi tạo Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store connected admin sockets
const adminSockets = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Handle admin login
  socket.on('admin-login', (data) => {
    const { tenant_id } = data;
    console.log(`Admin logged in for tenant: ${tenant_id}`);
    
    // Store admin socket with tenant_id
    adminSockets.set(tenant_id, socket.id);
    socket.tenant_id = tenant_id;
    
    // Join tenant-specific room
    socket.join(`tenant-${tenant_id}`);
    
    socket.emit('admin-login-success', { message: 'Admin connected successfully' });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Remove from admin sockets if exists
    if (socket.tenant_id) {
      adminSockets.delete(socket.tenant_id);
    }
  });
});

// Export io để sử dụng trong các route khác
app.set('io', io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server with Socket.IO is running on port ${PORT}`);
});
