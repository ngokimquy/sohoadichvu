const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const { MongoClient } = require('mongodb');
const Minio = require('minio');
const basicAuth = require('basic-auth');
const fs = require('fs');
const path = require('path');

// Middleware
app.use(express.json());

// Middleware lấy tenant_id từ subdomain
app.use((req, res, next) => {
  const host = req.headers.host || '';
  const parts = host.split('.');
  if (parts.length > 2) {
    req.tenant_id = parts.slice(0, parts.length - 2).join('.');
  } else {
    req.tenant_id = null;
  }
  next();
});

// Routes
app.get('/', (req, res) => {
  // Lấy subdomain từ host header'
  console.log("co truy cap subdomain");
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

const ADMIN_USER = 'ngokimquy';
const ADMIN_PASS = 'vienspkT1!';

// Middleware xác thực admin
function adminAuth(req, res, next) {
  const user = basicAuth(req);
  if (!user || user.name !== ADMIN_USER || user.pass !== ADMIN_PASS) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication required.');
  }
  next();
}

// Trang login admin (GET) và dashboard (GET)
app.get('/admin', (req, res) => {
  res.send(`
    <html>
      <head><title>Admin Login</title></head>
      <body>
        <h2>Đăng nhập Admin</h2>
        <form method="post" action="/admin">
          <input type="text" name="username" placeholder="Username" required /> <br/>
          <input type="password" name="password" placeholder="Password" required /> <br/>
          <button type="submit">Login</button>
        </form>
      </body>
    </html>
  `);
});

app.post('/admin', express.urlencoded({ extended: true }), (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    // Đăng nhập thành công, chuyển đến dashboard
    res.redirect('/admin/dashboard');
  } else {
    res.send('Sai thông tin đăng nhập. !');
  }
});

// Route: Lấy danh sách tenant (chỉ cho admin)
app.get('/admin/tenants', adminAuth, async (req, res) => {
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const tenants = await client.db('admin').collection('tenants').find({}).toArray();
    await client.close();
    res.send(`
      <h2>Danh sách Tenant</h2>
      <a href="/admin/tenants/add">Thêm Tenant</a>
      <ul>
        ${tenants.map(t => `<li>${t.tenant_id} - ${t.name} - ${t.active ? 'Active' : 'Inactive'}
          <a href="/admin/tenants/delete/${t.tenant_id}">Xóa</a>
        </li>`).join('')}
      </ul>
    `);
  } catch (err) {
    res.send('Lỗi khi lấy danh sách tenant');
  }
});

// Route: Form thêm tenant
app.get('/admin/tenants/add', adminAuth, (req, res) => {
  res.send(`
    <h2>Thêm Tenant</h2>
    <form method="post" action="/admin/tenants/add">
      <input name="tenant_id" placeholder="Tenant ID" required /> <br/>
      <input name="name" placeholder="Tên công ty" required /> <br/>
      <button type="submit">Thêm</button>
    </form>
  `);
});

// Route: Xử lý thêm tenant
app.post('/admin/tenants/add', adminAuth, express.urlencoded({ extended: true }), async (req, res) => {
  const { tenant_id, name } = req.body;
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    await client.db('admin').collection('tenants').insertOne({ tenant_id, name, active: true });
    await client.close();
    res.redirect('/admin/tenants');
  } catch (err) {
    res.send('Lỗi khi thêm tenant');
  }
});

// Route: Xóa tenant
app.get('/admin/tenants/delete/:tenant_id', adminAuth, async (req, res) => {
  const { tenant_id } = req.params;
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    await client.db('admin').collection('tenants').deleteOne({ tenant_id });
    await client.close();
    res.redirect('/admin/tenants');
  } catch (err) {
    res.send('Lỗi khi xóa tenant');
  }
});

// Sửa dashboard để có link quản lý tenant
app.get('/admin/dashboard', adminAuth, (req, res) => {
  res.send('<h1>Chào mừng Admin!</h1><p><a href="/admin/tenants">Quản lý tenant</a></p>');
});

// Route đăng ký dịch vụ chung cho tenant (render từ file HTML)
app.get('/tenants/:service?', async (req, res) => {
  const tenantId = req.tenant_id;
  let chungcuName = '';
  if (tenantId) {
    try {
      const client = new MongoClient(mongoUri);
      await client.connect();
      const tenant = await client.db('admin').collection('tenants').findOne({ tenant_id: tenantId });
      await client.close();
      if (tenant && tenant.name) {
        chungcuName = tenant.name;
      }
    } catch (err) {
      // Bỏ qua lỗi, chỉ không hiện tên
    }
  }
  const htmlPath = path.join(__dirname, 'src', 'views', 'tenant-register.html');
  fs.readFile(htmlPath, 'utf8', (err, html) => {
    if (err) return res.status(500).send('Lỗi đọc giao diện');
    res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
