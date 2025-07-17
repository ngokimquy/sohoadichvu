const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGO_URI;
const ADMIN_USER = 'ngokimquy';
const ADMIN_PASS = 'vienspkT1!';

// API khởi tạo thông số hệ thống (tạo tài khoản admin vào MongoDB)
router.get('/', async (req, res) => {
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const adminCol = client.db('admin').collection('admin_users');
    // Tạo tài khoản admin nếu chưa có
    const existed = await adminCol.findOne({ username: ADMIN_USER });
    if (!existed) {
      await adminCol.insertOne({ username: ADMIN_USER, password: ADMIN_PASS });
      await client.close();
      return res.send('Đã khởi tạo tài khoản admin mặc định!');
    }
    await client.close();
    res.send('Tài khoản admin đã tồn tại!');
  } catch (err) {
    res.status(500).send('Lỗi khi khởi tạo thông số!');
  }
});

module.exports = router;
