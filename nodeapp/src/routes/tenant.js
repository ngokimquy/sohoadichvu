const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
const router = express.Router();
const mongoUri = process.env.MONGO_URI;

// Middleware kiểm tra đăng nhập (giả lập, cần thay thế bằng xác thực thực tế)
function requireTenantLogin(req, res, next) {
  if (!req.session || !req.session.tenant_id) {
    return res.redirect('/tenant/login');
  }
  // Lấy tenant_id từ subdomain
  const host = req.headers.host || '';
  // Giả sử subdomain dạng: tenant1.example.com
  const subdomain = host.split('.')[0];
  req.tenant_id = subdomain;
  next();
}

// Trang login cho ban quản lý tenant
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/tenant-login.html'));
});

// Xử lý login (giả lập, cần thay thế bằng xác thực thực tế)
router.post('/login', express.urlencoded({ extended: true }), async (req, res) => {
  const { username, password } = req.body;
  // TODO: Kiểm tra username, password với DB
  // Ví dụ: nếu đúng thì lưu tenant_id vào session
  if (username && password) {
    // Giả lập: tenant_id = username
    req.session.tenant_id = username;
    return res.redirect('/tenant/dashboard');
  }
  res.redirect('/tenant/login?error=1');
});

// Trang dashboard (chỉ cho phép khi đã đăng nhập)
router.get('/dashboard', requireTenantLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/tenant-dashboard.html'));
});

// Đăng xuất
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/tenant/login');
  });
});

// API trả về danh sách đăng ký dịch vụ của tenant hiện tại
router.get('/api/registrations', requireTenantLogin, async (req, res) => {
  try {
    console.log('API /api/registrations - tenant_id:', req.tenant_id); // debug
    const client = new MongoClient(mongoUri);
    await client.connect();
    const regs = await client
      .db('car_registrations')
      .collection('registrations')
      .find({ tenant_id: req.tenant_id })
      .sort({ created_at: -1 })
      .toArray();
    await client.close();
    console.log('Số bản ghi tìm được:', regs.length); // debug
    // Định dạng lại dữ liệu cho frontend, kiểm tra null an toàn
    const result = regs.map(r => ({
      service_name: 'Thẻ Xe',
      registration_type: 'Đăng ký mới',
      user_name: r.personal_info?.full_name || '',
      user_email: r.personal_info?.email || '',
      apartment: r.personal_info?.apartment || '',
      created_at: r.created_at,
      status: r.status,
      file_url: (r.cccd_files && r.cccd_files[0]) ? `/minio/car-registrations/${r.cccd_files[0]}` : ''
    }));
    res.json(result);
  } catch (err) {
    console.error('Lỗi API /api/registrations:', err); // debug
    res.status(500).json({ error: 'Lỗi truy vấn dữ liệu' });
  }
});

// API lấy lưu ý/hướng dẫn dịch vụ động cho từng tenant/service
router.get('/api/service-note', async (req, res) => {
  try {
    // Lấy tenant_id từ subdomain
    const host = req.headers.host || '';
    const tenant_id = host.split('.')[0];
    const service_type = req.query.service;
    if (!service_type) return res.status(400).json({ error: 'Thiếu tham số service' });
    const client = new MongoClient(mongoUri);
    await client.connect();
    const note = await client
      .db('car_registrations')
      .collection('service_notes')
      .findOne({ tenant_id, service_type });
    await client.close();
    res.json({ content: note?.content || '' });
  } catch (err) {
    console.error('Lỗi API /api/service-note:', err);
    res.status(500).json({ error: 'Lỗi truy vấn dữ liệu' });
  }
});

module.exports = router;
