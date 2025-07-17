const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const mongoUri = process.env.MONGO_URI;

// Middleware kiểm tra đăng nhập (giả lập, cần thay thế bằng xác thực thực tế)
function requireTenantLogin(req, res, next) {
  if (!req.session || !req.session.tenant_id) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  req.tenant_id = req.session.tenant_id;
  next();
}

// Giả lập dữ liệu đăng ký dịch vụ cho tenant (bạn cần thay bằng truy vấn DB thực tế)
const registrations = [
  {
    service_name: 'Thẻ Xe',
    registration_type: 'Đăng ký mới',
    user_name: 'Nguyễn Văn A',
    user_email: 'vana@example.com',
    apartment: 'A101',
    created_at: new Date(),
    status: 'Chờ duyệt',
    file_url: ''
  },
  {
    service_name: 'Tiện ích',
    registration_type: 'Gia hạn',
    user_name: 'Trần Thị B',
    user_email: 'thib@example.com',
    apartment: 'B202',
    created_at: new Date(),
    status: 'Đã duyệt',
    file_url: 'https://example.com/file.pdf'
  }
];

// API trả về danh sách đăng ký dịch vụ của tenant hiện tại
router.get('/registrations', requireTenantLogin, async (req, res) => {
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const regs = await client
      .db('car_registrations')
      .collection('registrations')
      .find({ tenant_id: req.tenant_id })
      .sort({ created_at: -1 })
      .toArray();
    await client.close();
    // Định dạng lại dữ liệu cho frontend
    const result = regs.map(r => ({
      service_name: 'Thẻ Xe',
      registration_type: 'Đăng ký mới',
      user_name: r.personal_info.full_name,
      user_email: r.personal_info.email,
      apartment: r.personal_info.apartment,
      created_at: r.created_at,
      status: r.status,
      file_url: (r.cccd_files && r.cccd_files[0]) ? `/minio/car-registrations/${r.cccd_files[0]}` : ''
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi truy vấn dữ liệu' });
  }
});

module.exports = router;
