const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middlewares/adminAuth');
const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGO_URI;
const ADMIN_USER = 'ngokimquy';
const ADMIN_PASS = 'vienspkT1!';

// Middleware: chỉ cho phép truy cập admin từ domain chính (không cho subdomain)
router.use((req, res, next) => {
  const host = req.headers.host || '';
  // Chỉ cho phép truy cập admin khi host là kimcuongxanh.com hoặc kimcuongxanh.local (không có subdomain)
  if (/^(kimcuongxanh\.(com|local))(\:\d+)?$/.test(host.trim().toLowerCase())) {
    return next();
  }
  // Nếu là subdomain thì cấm truy cập admin
  return res.status(403).send('Không có quyền truy cập trang admin từ subdomain!');
});

// Route GET /admin hoặc /admin/login: trả về giao diện đăng nhập đẹp
router.get(['/', '/login'], (req, res) => {
  res.sendFile(require('path').join(__dirname, '../views/admin-login.html'));
});

// Route POST /admin/login: xử lý đăng nhập AJAX
router.post('/login', express.json(), async (req, res) => {
  const { username, password } = req.body;
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const adminCol = client.db('admin').collection('admin_users');
    const user = await adminCol.findOne({ username, password });
    await client.close();
    if (user) {
      res.cookie('admin_auth', '1', { httpOnly: true });
      console.log(`Admin ${username} logged in successfully.`);
      return res.json({ success: true });
    }
    res.json({ success: false, error: 'Sai tài khoản hoặc mật khẩu!' });
  } catch (err) {
    res.json({ success: false, error: 'Lỗi hệ thống!' });
  }
});

// Middleware xác thực admin cho dashboard và API
router.use((req, res, next) => {
  if (req.cookies && req.cookies.admin_auth === '1') return next();
  // Nếu chưa đăng nhập thì chuyển về trang login
  if (req.path.startsWith('/api')) return res.status(401).json({ error: 'Chưa đăng nhập admin' });
  res.redirect('/admin/login');
});

// Route dashboard
router.get('/dashboard', (req, res) => {
  res.sendFile(require('path').join(__dirname, '../views/admin-dashboard.html'));
});

// API lấy danh sách tenants
router.get('/api/tenants', async (req, res) => {
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const tenants = await client.db('admin').collection('tenants').find({}).toArray();
    await client.close();
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi lấy danh sách tenant' });
  }
});

// API lấy danh sách đăng ký thẻ xe
router.get('/api/car-registrations', async (req, res) => {
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const regs = await client.db('car_registrations').collection('registrations').find({}).toArray();
    await client.close();
    res.json(regs);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi lấy danh sách đăng ký' });
  }
});

// API logout
router.post('/logout', (req, res) => {
  res.clearCookie('admin_auth');
  res.json({ success: true });
});

// --- API khởi tạo thông số hệ thống (tạo tài khoản admin vào MongoDB) ---
// Đặt API này ở ngoài, không nằm trong router admin

// Trong app.js hoặc server.js:
// const khoiTaoThongSo = require('../utils/khoitaothongso');
// app.use('/khoitaothongso', khoiTaoThongSo);

// --- XÓA HOẶC DI CHUYỂN ĐOẠN NÀY RA NGOÀI FILE admin.js ---

// --- API quản lý tài khoản tenant ---
// Lấy danh sách tenant users
router.get('/api/tenant-users', async (req, res) => {
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const users = await client.db('admin').collection('tenant_users').find({}).toArray();
    await client.close();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi lấy danh sách tenant user' });
  }
});
// Thêm mới tenant user
router.post('/api/tenant-users', express.json(), async (req, res) => {
  const { username, name, email, tenant_id, password, status } = req.body;
  if (!username || !name || !email || !tenant_id || !password) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  }
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const col = client.db('admin').collection('tenant_users');
    const existed = await col.findOne({ username });
    if (existed) {
      await client.close();
      return res.status(409).json({ error: 'Username đã tồn tại' });
    }
    const user = {
      username, name, email, tenant_id, password, status: status || 'active',
      created_at: new Date(), updated_at: new Date()
    };
    await col.insertOne(user);
    await client.close();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi thêm tenant user' });
  }
});
// Sửa tenant user
router.put('/api/tenant-users/:id', express.json(), async (req, res) => {
  const { id } = req.params;
  const { name, email, tenant_id, status } = req.body;
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const col = client.db('admin').collection('tenant_users');
    await col.updateOne(
      { _id: require('mongodb').ObjectId(id) },
      { $set: { name, email, tenant_id, status, updated_at: new Date() } }
    );
    await client.close();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi cập nhật tenant user' });
  }
});
// Xóa tenant user
router.delete('/api/tenant-users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const col = client.db('admin').collection('tenant_users');
    await col.deleteOne({ _id: require('mongodb').ObjectId(id) });
    await client.close();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xóa tenant user' });
  }
});
// Reset mật khẩu tenant user
router.patch('/api/tenant-users/:id/reset-password', express.json(), async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Thiếu mật khẩu mới' });
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const col = client.db('admin').collection('tenant_users');
    await col.updateOne(
      { _id: require('mongodb').ObjectId(id) },
      { $set: { password, updated_at: new Date() } }
    );
    await client.close();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi reset mật khẩu' });
  }
});
// Thêm mới tenant
router.post('/api/tenants', express.json(), async (req, res) => {
  const { name, tenant_id, email, status } = req.body;
  if (!name || !tenant_id || !email) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  }
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const col = client.db('admin').collection('tenants');
    const existed = await col.findOne({ tenant_id });
    if (existed) {
      await client.close();
      return res.status(409).json({ error: 'Mã tenant đã tồn tại' });
    }
    const tenant = {
      name, tenant_id, email, status: status || 'active',
      created_at: new Date(), updated_at: new Date()
    };
    await col.insertOne(tenant);
    await client.close();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi thêm tenant' });
  }
});
// Sửa tenant
router.put('/api/tenants/:id', express.json(), async (req, res) => {
  const { id } = req.params;
  const { name, tenant_id, email, status } = req.body;
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const col = client.db('admin').collection('tenants');
    await col.updateOne(
      { _id: require('mongodb').ObjectId(id) },
      { $set: { name, tenant_id, email, status, updated_at: new Date() } }
    );
    await client.close();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi cập nhật tenant' });
  }
});
// Xoá tenant
router.delete('/api/tenants/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const col = client.db('admin').collection('tenants');
    await col.deleteOne({ _id: require('mongodb').ObjectId(id) });
    await client.close();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xoá tenant' });
  }
});

module.exports = router;
