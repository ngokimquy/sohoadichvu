const express = require('express');
const path = require('path');
const router = express.Router();

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
router.get('/dashboard', (req, res) => {
  if (!req.session || !req.session.tenant_id) {
    return res.redirect('/tenant/login');
  }
  res.sendFile(path.join(__dirname, '../views/tenant-dashboard.html'));
});

// Đăng xuất
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/tenant/login');
  });
});

module.exports = router;
