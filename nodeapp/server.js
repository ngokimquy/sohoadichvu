const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const { MongoClient } = require('mongodb');
const Minio = require('minio');

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  // Lấy subdomain từ host header
  const host = req.headers.host || '';
  let subdomain = '';
  // Tách subdomain nếu có dạng sub.domain.com
  const parts = host.split('.');
  if (parts.length > 2) {
    subdomain = parts.slice(0, parts.length - 2).join('.');
  } else {
    subdomain = '(không có subdomain)';
  }
  res.send(`
    <html>
      <head><title>Welcome</title></head>
      <body>
        <h1>Welcome ${subdomain}</h1>
        <p>Subdomain: <b>${subdomain}</b></p>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ]);
});

const mongoUri = process.env.MONGO_URI;
const minioEndpoint = process.env.MINIO_ENDPOINT;
const minioUser = process.env.MINIO_ROOT_USER;
const minioPass = process.env.MINIO_ROOT_PASSWORD;

app.get('/check-mongodb', async (req, res) => {
  let mongoStatus = 'fail';
  console.log("co nguoiffff ket noi toi mongodb");
  try {
    const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 3000 });
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    mongoStatus = 'success';
    await client.close();
  } catch (err) {
    mongoStatus = 'fail';
  }
  res.json({ mongodb: mongoStatus });
});

app.get('/check-minio', async (req, res) => {
  let minioStatus = 'fail';
  try {
    const minioClient = new Minio.Client({
      endPoint: minioEndpoint.split(':')[0],
      port: parseInt(minioEndpoint.split(':')[1]),
      useSSL: false,
      accessKey: minioUser,
      secretKey: minioPass,
    });
    await minioClient.listBuckets();
    minioStatus = 'success';
  } catch (err) {
    minioStatus = 'fail';
  }
  res.json({ minio: minioStatus });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
