const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const Minio = require('minio');
const multer = require('multer');
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, fieldSize: 50 * 1024 * 1024 }
});

const mongoUri = process.env.MONGO_URI;

// Khởi tạo MinIO client
const minioEndpoint = process.env.MINIO_ENDPOINT;
const minioUser = process.env.MINIO_ROOT_USER;
const minioPass = process.env.MINIO_ROOT_PASSWORD;
let minioClient;
if (minioEndpoint && minioUser && minioPass) {
  minioClient = new Minio.Client({
    endPoint: minioEndpoint.split(':')[0],
    port: parseInt(minioEndpoint.split(':')[1]),
    useSSL: false,
    accessKey: minioUser,
    secretKey: minioPass,
  });
}

// Khi truy cập subdomain, chuyển hướng về trang đăng ký dịch vụ
router.get('/', (req, res) => {
  res.redirect('/tenants');
});

// Route trang đăng ký dịch vụ cho tất cả subdomain
router.get('/tenants/:service?/:subservice?', async (req, res) => {
  const tenantId = req.tenant_id;
  const service = req.params.service;
  const subservice = req.params.subservice;
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

  if (service === 'resident-info-register') {

      const htmlPath = path.join(__dirname, '..', 'views', 'resident-info-register.html');
    fs.readFile(htmlPath, 'utf8', (err, html) => {
      if (err) return res.status(500).send('Lỗi đọc giao diện');
      res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
    });
    return;



  }
  
  // Nếu service là car-registration, hiển thị trang dịch vụ thẻ xe
  if (service === 'car-registration') {
    // Nếu có subservice là monthly, hiển thị form đăng ký
    if (subservice === 'monthly') {
      const htmlPath = path.join(__dirname, '..', 'views', 'car-registration-form.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lỗi đọc giao diện');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    
    // Nếu có subservice là remake, hiển thị form làm lại thẻ
    if (subservice === 'remake') {
      const htmlPath = path.join(__dirname, '..', 'views', 'car-remake-form.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lỗi đọc giao diện');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    
    // Nếu có subservice là update, hiển thị form thay đổi thông tin
    if (subservice === 'update') {
      const htmlPath = path.join(__dirname, '..', 'views', 'car-update-form.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lỗi đọc giao diện');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    
    // Nếu có subservice là cancel, hiển thị form hủy thẻ
    if (subservice === 'cancel') {
      const htmlPath = path.join(__dirname, '..', 'views', 'car-cancel-form.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lỗi đọc giao diện');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    
    // Mặc định hiển thị trang dịch vụ thẻ xe
    const htmlPath = path.join(__dirname, '..', 'views', 'car-service.html');
    fs.readFile(htmlPath, 'utf8', (err, html) => {
      if (err) return res.status(500).send('Lỗi đọc giao diện');
      res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
    });
    return;
  }

  
  
  // Nếu service là utility-services, hiển thị trang dịch vụ tiện ích và các subservice con
  if (service === 'utility-services') {
    // Subservice: advertising-register
    if (subservice === 'advertising-register') {
      const htmlPath = path.join(__dirname, '..', 'views', 'advertising-register.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lỗi đọc giao diện');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    // Subservice: camera-check-request
    if (subservice === 'camera-check-request') {
      const htmlPath = path.join(__dirname, '..', 'views', 'camera-check-request.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lỗi đọc giao diện');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    // Subservice: pet-commitment-register
    if (subservice === 'pets-commitment-register') {
      const htmlPath = path.join(__dirname, '..', 'views', 'pets-commitment-register.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lỗi đọc giao diện');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
       if (subservice === 'community-room-register') {
      const htmlPath = path.join(__dirname, '..', 'views', 'community-room-register.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lỗi đọc giao diện');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    // Subservice: resident-info-register
  
    // Nếu không có subservice hoặc subservice không khớp, trả về trang mẹ utility-services
    const htmlPath = path.join(__dirname, '..', 'views', 'utility-services.html');
    fs.readFile(htmlPath, 'utf8', (err, html) => {
      if (err) return res.status(500).send('Lỗi đọc giao diện');
      res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
    });
    return;
  }
  
  // Nếu service là utility-card, kiểm tra từng subservice cụ thể
  if (service === 'utility-card') {
    // Subservice: elevator-register
    if (subservice === 'elevator-register') {
      const htmlPath = path.join(__dirname, '..', 'views', 'elevator-register.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lỗi đọc giao diện');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    // Subservice: elevator-cancel (chưa có form, để sẵn route)
    if (subservice === 'elevator-cancel') {
      const htmlPath = path.join(__dirname, '..', 'views', 'elevator-cancel.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lỗi đọc giao diện');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    // Subservice: pool-register (chưa có form, để sẵn route)
    if (subservice === 'pool-register') {
      const htmlPath = path.join(__dirname, '..', 'views', 'pool-register-form.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lỗi đọc giao diện');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    // Subservice: community-room-register
 
    // ...có thể bổ sung thêm các subservice khác ở đây...
    // Nếu không có subservice hoặc subservice không khớp, trả về trang mẹ utility-card
    const htmlPath = path.join(__dirname, '..', 'views', 'utility-card.html');
    fs.readFile(htmlPath, 'utf8', (err, html) => {
      if (err) return res.status(500).send('Lỗi đọc giao diện');
      res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
    });
    return;
  }

  // Mặc định hiển thị trang chính
  const htmlPath = path.join(__dirname, '..', 'views', 'tenant-register.html');
  fs.readFile(htmlPath, 'utf8', (err, html) => {
    if (err) return res.status(500).send('Lỗi đọc giao diện');
    res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
  });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

router.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ]);
});

// API kiểm tra kết nối MongoDB và MinIO
router.get('/api/healthcheck', async (req, res) => {
  // Kiểm tra MongoDB
  let mongoStatus = 'unknown';
  try {
    const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 3000 });
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    mongoStatus = 'connected';
    await client.close();
  } catch (err) {
    mongoStatus = 'error';
  }

  // Kiểm tra MinIO
  let minioStatus = 'unknown';
  if (minioClient) {
    try {
      await minioClient.listBuckets();
      minioStatus = 'connected';
    } catch (err) {
      minioStatus = 'error';
    }
  } else {
    minioStatus = 'not_configured';
  }

  res.json({
    mongo: mongoStatus,
    minio: minioStatus
  });
});

// API xử lý đăng ký thẻ xe
router.post('/api/car-registration', upload.fields([
  { name: 'cccdFiles', maxCount: 10 },
  { name: 'cavetFiles', maxCount: 10 }
]), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'Không xác định được tenant' });
  }
  try {
    // Lấy thông tin cá nhân
    const { fullName, phone, email, apartment, role, signature, registrationDate } = req.body;
    if (!fullName || !phone || !apartment || !role || !registrationDate) {
      return res.status(400).json({ error: 'Thiếu thông tin cá nhân hoặc ngày đăng ký xe' });
    }
    // Lấy thông tin xe (mảng)
    let vehicleTypes = req.body['vehicleType[]'] || req.body.vehicleType || [];
    let licensePlates = req.body['licensePlate[]'] || req.body.licensePlate || [];
    let ownerNames = req.body['ownerName[]'] || req.body.ownerName || [];
    if (!Array.isArray(vehicleTypes)) vehicleTypes = [vehicleTypes];
    if (!Array.isArray(licensePlates)) licensePlates = [licensePlates];
    if (!Array.isArray(ownerNames)) ownerNames = [ownerNames];
    if (
      vehicleTypes.length === 0 ||
      licensePlates.length === 0 ||
      ownerNames.length === 0 ||
      vehicleTypes.length !== licensePlates.length ||
      vehicleTypes.length !== ownerNames.length
    ) {
      return res.status(400).json({ error: 'Thiếu hoặc sai thông tin xe' });
    }
    const vehicles = vehicleTypes.map((type, i) => ({
      type,
      license_plate: licensePlates[i] || '',
      owner_name: ownerNames[i] || ''
    }));
    // Kiểm tra file hồ sơ
    const cccdFiles = req.files && req.files.cccdFiles ? req.files.cccdFiles : [];
    const cavetFiles = req.files && req.files.cavetFiles ? req.files.cavetFiles : [];
    if (cccdFiles.length === 0) {
      return res.status(400).json({ error: 'Thiếu file CCCD mặt trước' });
    }
    if (cavetFiles.length === 0) {
      return res.status(400).json({ error: 'Thiếu file Cavet xe mặt trước' });
    }
    // Kiểm tra signature hợp lệ
    if (
      !signature ||
      typeof signature !== 'string' ||
      !signature.startsWith('data:image/') ||
      !signature.includes('base64,') ||
      signature.split('base64,')[1].trim().length < 100
    ) {
      return res.status(400).json({ error: 'Vui lòng ký tên xác nhận' });
    }
    // Lưu file lên MinIO
    const bucketName = 'car-registrations';
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) await minioClient.makeBucket(bucketName);
    const cccdFileUrls = [];
    for (const file of cccdFiles) {
      const fileName = `${tenantId}_${Date.now()}_cccd_${file.originalname}`;
      await minioClient.putObject(bucketName, fileName, file.buffer, file.size);
      cccdFileUrls.push(fileName);
    }
    const cavetFileUrls = [];
    for (const file of cavetFiles) {
      const fileName = `${tenantId}_${Date.now()}_cavet_${file.originalname}`;
      await minioClient.putObject(bucketName, fileName, file.buffer, file.size);
      cavetFileUrls.push(fileName);
    }
    // Lưu chữ ký
    const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const signatureFileName = `${tenantId}_${Date.now()}_signature.png`;
    await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    // Lưu thông tin đăng ký vào MongoDB
    const client = new MongoClient(mongoUri);
    await client.connect();
    // Lấy tên chung cư
    let chungcuName = '';
    try {
      const tenant = await client.db('admin').collection('tenants').findOne({ tenant_id: tenantId });
      if (tenant && tenant.name) chungcuName = tenant.name;
    } catch (err) { /* ignore */ }
    const registrationData = {
      tenant_id: tenantId,
      personal_info: {
        full_name: fullName,
        phone,
        email,
        apartment,
        role
      },
      vehicles,
      registration_date: registrationDate,
      cccd_files: cccdFileUrls,
      cavet_files: cavetFileUrls,
      signature: signatureFileName,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    await client.db('car_registrations').collection('registrations').insertOne(registrationData);
    await client.close();
    res.json({ success: true, message: 'Đăng ký thành công!', chungcuName, createdAt: registrationData.created_at });
  } catch (error) {
    console.error('Error processing car registration:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra khi xử lý đăng ký' });
  }
});

// API xử lý làm lại thẻ xe
router.post('/api/car-remake', upload.fields([
  { name: 'cccdFiles', maxCount: 10 },
  { name: 'cavetFiles', maxCount: 10 }
]), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'Không xác định được tenant' });
  }
  try {
    // Lấy thông tin cá nhân
    const { fullName, phone, email, apartment, role, signature, remakeReason, oldCardNumber } = req.body;
    if (!fullName || !phone || !apartment || !role || !remakeReason) {
      return res.status(400).json({ error: 'Thiếu thông tin cá nhân hoặc lý do làm lại thẻ' });
    }
    // Lấy thông tin xe (mảng)
    let vehicleTypes = req.body['vehicleType[]'] || req.body.vehicleType || [];
    let licensePlates = req.body['licensePlate[]'] || req.body.licensePlate || [];
    let brands = req.body['brand[]'] || req.body.brand || [];
    let colors = req.body['color[]'] || req.body.color || [];
    if (!Array.isArray(vehicleTypes)) vehicleTypes = [vehicleTypes];
    if (!Array.isArray(licensePlates)) licensePlates = [licensePlates];
    if (!Array.isArray(brands)) brands = [brands];
    if (!Array.isArray(colors)) colors = [colors];
    if (
      vehicleTypes.length === 0 ||
      licensePlates.length === 0 ||
      vehicleTypes.length !== licensePlates.length
    ) {
      return res.status(400).json({ error: 'Thiếu hoặc sai thông tin xe' });
    }
    const vehicles = vehicleTypes.map((type, i) => ({
      type,
      license_plate: licensePlates[i] || '',
      brand: brands[i] || '',
      color: colors[i] || ''
    }));
    // Kiểm tra file hồ sơ
    const cccdFiles = req.files && req.files.cccdFiles ? req.files.cccdFiles : [];
    const cavetFiles = req.files && req.files.cavetFiles ? req.files.cavetFiles : [];
    if (cccdFiles.length === 0) {
      return res.status(400).json({ error: 'Thiếu file CCCD mặt trước' });
    }
    if (cavetFiles.length === 0) {
      return res.status(400).json({ error: 'Thiếu file Cavet xe mặt trước' });
    }
    // Kiểm tra signature hợp lệ
    if (
      !signature ||
      typeof signature !== 'string' ||
      !signature.startsWith('data:image/') ||
      !signature.includes('base64,') ||
      signature.split('base64,')[1].trim().length < 100
    ) {
      return res.status(400).json({ error: 'Vui lòng ký tên xác nhận' });
    }
    // Lưu file lên MinIO
    const bucketName = 'car-registrations';
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) await minioClient.makeBucket(bucketName);
    const cccdFileUrls = [];
    for (const file of cccdFiles) {
      const fileName = `${tenantId}_${Date.now()}_cccd_${file.originalname}`;
      await minioClient.putObject(bucketName, fileName, file.buffer, file.size);
      cccdFileUrls.push(fileName);
    }
    const cavetFileUrls = [];
    for (const file of cavetFiles) {
      const fileName = `${tenantId}_${Date.now()}_cavet_${file.originalname}`;
      await minioClient.putObject(bucketName, fileName, file.buffer, file.size);
      cavetFileUrls.push(fileName);
    }
    // Lưu chữ ký
    const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const signatureFileName = `${tenantId}_${Date.now()}_signature.png`;
    await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    // Lưu thông tin làm lại thẻ vào MongoDB
    const client = new MongoClient(mongoUri);
    await client.connect();
    // Lấy tên chung cư
    let chungcuName = '';
    try {
      const tenant = await client.db('admin').collection('tenants').findOne({ tenant_id: tenantId });
      if (tenant && tenant.name) chungcuName = tenant.name;
    } catch (err) { /* ignore */ }
    const remakeData = {
      tenant_id: tenantId,
      personal_info: {
        full_name: fullName,
        phone,
        email,
        apartment,
        role
      },
      vehicles,
      remake_reason: remakeReason,
      old_card_number: oldCardNumber || '',
      cccd_files: cccdFileUrls,
      cavet_files: cavetFileUrls,
      signature: signatureFileName,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    await client.db('car_registrations').collection('remake_requests').insertOne(remakeData);
    await client.close();
    res.json({ success: true, message: 'Gửi yêu cầu làm lại thẻ thành công!', chungcuName, createdAt: remakeData.created_at });
  } catch (error) {
    console.error('Error processing car remake:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra khi xử lý yêu cầu làm lại thẻ' });
  }
});

// API xử lý hủy thẻ xe
router.post('/api/car-cancel', upload.fields([
  { name: 'cccdFiles', maxCount: 10 },
  { name: 'cavetFiles', maxCount: 10 }
]), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'Không xác định được tenant' });
  }
  try {
    // Lấy thông tin cá nhân
    const { fullName, phone, email, apartment, role, signature, oldCardNumber, cancelDate } = req.body;
    if (!fullName || !phone || !apartment || !role || !cancelDate) {
      return res.status(400).json({ error: 'Thiếu thông tin cá nhân hoặc ngày hủy thẻ' });
    }
    // Lấy thông tin xe (mảng)
    let vehicleTypes = req.body['vehicleType[]'] || req.body.vehicleType || [];
    let licensePlates = req.body['licensePlate[]'] || req.body.licensePlate || [];
    let brands = req.body['brand[]'] || req.body.brand || [];
    let colors = req.body['color[]'] || req.body.color || [];
    if (!Array.isArray(vehicleTypes)) vehicleTypes = [vehicleTypes];
    if (!Array.isArray(licensePlates)) licensePlates = [licensePlates];
    if (!Array.isArray(brands)) brands = [brands];
    if (!Array.isArray(colors)) colors = [colors];
    if (
      vehicleTypes.length === 0 ||
      licensePlates.length === 0 ||
      vehicleTypes.length !== licensePlates.length
    ) {
      return res.status(400).json({ error: 'Thiếu hoặc sai thông tin xe' });
    }
    const vehicles = vehicleTypes.map((type, i) => ({
      type,
      license_plate: licensePlates[i] || '',
      brand: brands[i] || '',
      color: colors[i] || ''
    }));
    // Kiểm tra file hồ sơ
    const cccdFiles = req.files && req.files.cccdFiles ? req.files.cccdFiles : [];
    const cavetFiles = req.files && req.files.cavetFiles ? req.files.cavetFiles : [];
    if (cccdFiles.length === 0) {
      return res.status(400).json({ error: 'Thiếu file CCCD mặt trước' });
    }
    if (cavetFiles.length === 0) {
      return res.status(400).json({ error: 'Thiếu file Cavet xe mặt trước' });
    }
    // Kiểm tra signature hợp lệ
    if (
      !signature ||
      typeof signature !== 'string' ||
      !signature.startsWith('data:image/') ||
      !signature.includes('base64,') ||
      signature.split('base64,')[1].trim().length < 100
    ) {
      return res.status(400).json({ error: 'Vui lòng ký tên xác nhận' });
    }
    // Lưu file lên MinIO
    const bucketName = 'car-cancel'; // Đổi sang bucket riêng cho thẻ hủy
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) await minioClient.makeBucket(bucketName);
    const cccdFileUrls = [];
    for (const file of cccdFiles) {
      const fileName = `${tenantId}_${Date.now()}_cccd_${file.originalname}`;
      await minioClient.putObject(bucketName, fileName, file.buffer, file.size);
      cccdFileUrls.push(fileName);
    }
    const cavetFileUrls = [];
    for (const file of cavetFiles) {
      const fileName = `${tenantId}_${Date.now()}_cavet_${file.originalname}`;
      await minioClient.putObject(bucketName, fileName, file.buffer, file.size);
      cavetFileUrls.push(fileName);
    }
    // Lưu chữ ký
    const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const signatureFileName = `${tenantId}_${Date.now()}_signature.png`;
    await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    // Lưu thông tin hủy thẻ vào MongoDB (collection cancel_requests)
    const client = new MongoClient(mongoUri);
    await client.connect();
    // Lấy tên chung cư
    let chungcuName = '';
    try {
      const tenant = await client.db('admin').collection('tenants').findOne({ tenant_id: tenantId });
      if (tenant && tenant.name) chungcuName = tenant.name;
    } catch (err) { /* ignore */ }
    const cancelData = {
      tenant_id: tenantId,
      personal_info: {
        full_name: fullName,
        phone,
        email,
        apartment,
        role
      },
      vehicles,
      old_card_number: oldCardNumber || '',
      cancel_date: cancelDate,
      cccd_files: cccdFileUrls,
      cavet_files: cavetFileUrls,
      signature: signatureFileName,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    await client.db('car_registrations').collection('cancel_requests').insertOne(cancelData);
    await client.close();
    res.json({ success: true, message: 'Gửi yêu cầu hủy thẻ thành công!', chungcuName, createdAt: cancelData.created_at });
  } catch (error) {
    console.error('Error processing car cancel:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra khi xử lý yêu cầu hủy thẻ' });
  }
});

// API xử lý thay đổi thông tin xe
router.post('/api/car-update', upload.fields([
  { name: 'cccdFiles', maxCount: 10 },
  { name: 'cavetFiles', maxCount: 10 }
]), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'Không xác định được tenant' });
  }
  try {
    // Lấy thông tin cá nhân
    const { fullName, phone, email, apartment, role, changeDate, changeReason, signature } = req.body;
    if (!fullName || !phone || !apartment || !role || !changeDate || !changeReason) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }
    // Lấy thông tin xe (mảng)
    let vehicleTypes = req.body['vehicleType[]'] || req.body.vehicleType || [];
    let licensePlates = req.body['licensePlate[]'] || req.body.licensePlate || [];
    let ownerNames = req.body['ownerName[]'] || req.body.ownerName || [];
    if (!Array.isArray(vehicleTypes)) vehicleTypes = [vehicleTypes];
    if (!Array.isArray(licensePlates)) licensePlates = [licensePlates];
    if (!Array.isArray(ownerNames)) ownerNames = [ownerNames];
    if (
      vehicleTypes.length === 0 ||
      licensePlates.length === 0 ||
      ownerNames.length === 0 ||
      vehicleTypes.length !== licensePlates.length ||
      vehicleTypes.length !== ownerNames.length
    ) {
      return res.status(400).json({ error: 'Thiếu hoặc sai thông tin xe' });
    }
    const vehicles = vehicleTypes.map((type, i) => ({
      type,
      license_plate: licensePlates[i] || '',
      owner_name: ownerNames[i] || ''
    }));
    // Kiểm tra file hồ sơ
    const cccdFiles = req.files && req.files.cccdFiles ? req.files.cccdFiles : [];
    const cavetFiles = req.files && req.files.cavetFiles ? req.files.cavetFiles : [];
    if (cccdFiles.length === 0) {
      return res.status(400).json({ error: 'Thiếu file CCCD mặt trước' });
    }
    if (cavetFiles.length === 0) {
      return res.status(400).json({ error: 'Thiếu file Cavet xe mặt trước' });
    }
    // Kiểm tra signature hợp lệ
    if (
      !signature ||
      typeof signature !== 'string' ||
      !signature.startsWith('data:image/') ||
      !signature.includes('base64,') ||
      signature.split('base64,')[1].trim().length < 100
    ) {
      return res.status(400).json({ error: 'Vui lòng ký tên xác nhận' });
    }
    // Lưu file lên MinIO
    const bucketName = 'car-update';
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) await minioClient.makeBucket(bucketName);
    const cccdFileUrls = [];
    for (const file of cccdFiles) {
      const fileName = `${tenantId}_${Date.now()}_cccd_${file.originalname}`;
      await minioClient.putObject(bucketName, fileName, file.buffer, file.size);
      cccdFileUrls.push(fileName);
    }
    const cavetFileUrls = [];
    for (const file of cavetFiles) {
      const fileName = `${tenantId}_${Date.now()}_cavet_${file.originalname}`;
      await minioClient.putObject(bucketName, fileName, file.buffer, file.size);
      cavetFileUrls.push(fileName);
    }
    // Lưu chữ ký
    const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const signatureFileName = `${tenantId}_${Date.now()}_signature.png`;
    await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    // Lưu thông tin thay đổi vào MongoDB
    const client = new MongoClient(mongoUri);
    await client.connect();
    let chungcuName = '';
    try {
      const tenant = await client.db('admin').collection('tenants').findOne({ tenant_id: tenantId });
      if (tenant && tenant.name) chungcuName = tenant.name;
    } catch (err) { /* ignore */ }
    const updateData = {
      tenant_id: tenantId,
      personal_info: {
        full_name: fullName,
        phone,
        email,
        apartment,
        role
      },
      vehicles,
      change_date: changeDate,
      change_reason: changeReason,
      cccd_files: cccdFileUrls,
      cavet_files: cavetFileUrls,
      signature: signatureFileName,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    await client.db('car_registrations').collection('update_requests').insertOne(updateData);
    await client.close();
    res.json({ success: true, message: 'Gửi yêu cầu thay đổi thông tin xe thành công!', chungcuName, createdAt: updateData.created_at });
  } catch (error) {
    console.error('Error processing car update:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra khi xử lý yêu cầu thay đổi thông tin xe' });
  }
});

// Xử lý đăng ký thẻ tiện ích khác
router.post('/api/utility-card', express.urlencoded({ extended: true }), async (req, res) => {
  const { fullName, apartment, cardType, phone, email, note } = req.body;
  if (!fullName || !apartment || !cardType || !phone) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ thông tin bắt buộc.' });
  }
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const collection = client.db('admin').collection('utility_cards');
    await collection.insertOne({
      fullName, apartment, cardType, phone, email, note, createdAt: new Date()
    });
    await client.close();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Không thể lưu đăng ký. Vui lòng thử lại sau.' });
  }
});

// Đăng ký thẻ thang máy (có số lượng thẻ, ghi chú, file CCCD)
router.post('/api/elevator-card-register', upload.fields([
  { name: 'cccdFiles', maxCount: 10 }
]), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'Không xác định được tenant' });
  }
  try {
    const { fullName, apartment, phone, email, role, cardQuantity, note, signature } = req.body;
    if (!fullName || !apartment || !phone || !role || !cardQuantity) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ thông tin bắt buộc.' });
    }
    // Kiểm tra file CCCD
    const cccdFiles = req.files && req.files.cccdFiles ? req.files.cccdFiles : [];
    if (cccdFiles.length === 0) {
      return res.status(400).json({ success: false, error: 'Vui lòng tải lên file CCCD mặt trước.' });
    }
    // Kiểm tra signature hợp lệ
    if (
      !signature ||
      typeof signature !== 'string' ||
      !signature.startsWith('data:image/') ||
      !signature.includes('base64,') ||
      signature.split('base64,')[1].trim().length < 100
    ) {
      return res.status(400).json({ success: false, error: 'Vui lòng ký tên xác nhận.' });
    }
    // Lưu file lên MinIO
    const bucketName = 'elevator-cards';
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) await minioClient.makeBucket(bucketName);
    const cccdFileUrls = [];
    for (const file of cccdFiles) {
      const fileName = `${tenantId}_${Date.now()}_cccd_${file.originalname}`;
      await minioClient.putObject(bucketName, fileName, file.buffer, file.size);
      cccdFileUrls.push(fileName);
    }
    // Lưu chữ ký lên MinIO
    const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const signatureFileName = `${tenantId}_${Date.now()}_signature.png`;
    await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    // Lưu thông tin đăng ký vào MongoDB (db: utility_card, collection: elevator_cards)
    const client = new MongoClient(mongoUri);
    await client.connect();
    let chungcuName = '';
    try {
      const tenant = await client.db('admin').collection('tenants').findOne({ tenant_id: tenantId });
      if (tenant && tenant.name) chungcuName = tenant.name;
    } catch (err) { /* ignore */ }
    const registrationData = {
      tenant_id: tenantId,
      full_name: fullName,
      phone,
      email,
      apartment,
      role,
      card_quantity: Number(cardQuantity),
      note,
      cccd_files: cccdFileUrls,
      signature: signatureFileName,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    await client.db('utility_card').collection('elevator_cards').insertOne(registrationData);
    await client.close();
    res.json({ success: true, message: 'Đăng ký thẻ thang máy thành công!', chungcuName, createdAt: registrationData.created_at });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Không thể lưu đăng ký. Vui lòng thử lại sau.' });
  }
});

// Hủy thẻ thang máy
router.post('/api/elevator-card-cancel', upload.fields([
  { name: 'cccdFiles', maxCount: 10 }
]), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'Không xác định được tenant' });
  }
  try {
    const { fullName, apartment, phone, email, role, cardNumber, signature } = req.body;
    if (!fullName || !apartment || !phone || !role || !cardNumber) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ thông tin bắt buộc.' });
    }
    // Kiểm tra file CCCD
    const cccdFiles = req.files && req.files.cccdFiles ? req.files.cccdFiles : [];
    if (cccdFiles.length === 0) {
      return res.status(400).json({ success: false, error: 'Vui lòng tải lên file CCCD mặt trước.' });
    }
    // Kiểm tra signature hợp lệ
    if (
      !signature ||
      typeof signature !== 'string' ||
      !signature.startsWith('data:image/') ||
      !signature.includes('base64,') ||
      signature.split('base64,')[1].trim().length < 100
    ) {
      return res.status(400).json({ success: false, error: 'Vui lòng ký tên xác nhận.' });
    }
    // Lưu file lên MinIO
    const bucketName = 'elevator-cancel';
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) await minioClient.makeBucket(bucketName);
    const cccdFileUrls = [];
    for (const file of cccdFiles) {
      const fileName = `${tenantId}_${Date.now()}_cccd_${file.originalname}`;
      await minioClient.putObject(bucketName, fileName, file.buffer, file.size);
      cccdFileUrls.push(fileName);
    }
    // Lưu chữ ký lên MinIO
    const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const signatureFileName = `${tenantId}_${Date.now()}_signature.png`;
    await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    // Lưu thông tin hủy thẻ vào MongoDB (db: utility_card, collection: elevator_cancel_requests)
    const client = new MongoClient(mongoUri);
    await client.connect();
    let chungcuName = '';
    try {
      const tenant = await client.db('admin').collection('tenants').findOne({ tenant_id: tenantId });
      if (tenant && tenant.name) chungcuName = tenant.name;
    } catch (err) { /* ignore */ }
    const cancelData = {
      tenant_id: tenantId,
      full_name: fullName,
      phone,
      email,
      apartment,
      role,
      card_number: cardNumber,
      cccd_files: cccdFileUrls,
      signature: signatureFileName,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    await client.db('utility_card').collection('elevator_cancel_requests').insertOne(cancelData);
    await client.close();
    res.json({ success: true, message: 'Yêu cầu hủy thẻ thang máy thành công!', chungcuName, createdAt: cancelData.created_at });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Không thể gửi yêu cầu. Vui lòng thử lại sau.' });
  }
});

// Đăng ký vòng bơi
router.post('/api/pool-register', upload.fields([
  { name: 'cccdFiles', maxCount: 10 }
]), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'Không xác định được tenant' });
  }
  try {
    const { fullName, phone, email, apartment, role, swimQuantity, signature } = req.body;
    if (!fullName || !apartment || !phone || !role || !swimQuantity) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ thông tin bắt buộc.' });
    }
    // Kiểm tra file CCCD
    const cccdFiles = req.files && req.files.cccdFiles ? req.files.cccdFiles : [];
    if (cccdFiles.length === 0) {
      return res.status(400).json({ success: false, error: 'Vui lòng tải lên file CCCD mặt trước.' });
    }
    // Kiểm tra signature hợp lệ
    if (
      !signature ||
      typeof signature !== 'string' ||
      !signature.startsWith('data:image/') ||
      !signature.includes('base64,') ||
      signature.split('base64,')[1].trim().length < 100
    ) {
      return res.status(400).json({ success: false, error: 'Vui lòng ký tên xác nhận.' });
    }
    // Lưu file lên MinIO
    const bucketName = 'pool-registers';
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) await minioClient.makeBucket(bucketName);
    const cccdFileUrls = [];
    for (const file of cccdFiles) {
      const fileName = `${tenantId}_${Date.now()}_cccd_${file.originalname}`;
      await minioClient.putObject(bucketName, fileName, file.buffer, file.size);
      cccdFileUrls.push(fileName);
    }
    // Lưu chữ ký lên MinIO
    const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const signatureFileName = `${tenantId}_${Date.now()}_signature.png`;
    await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    // Lưu thông tin đăng ký vào MongoDB (db: utility_card, collection: pool_registers)
    const client = new MongoClient(mongoUri);
    await client.connect();
    let chungcuName = '';
    try {
      const tenant = await client.db('admin').collection('tenants').findOne({ tenant_id: tenantId });
      if (tenant && tenant.name) chungcuName = tenant.name;
    } catch (err) { /* ignore */ }
    const registrationData = {
      tenant_id: tenantId,
      full_name: fullName,
      phone,
      email,
      apartment,
      role,
      swim_quantity: Number(swimQuantity),
      cccd_files: cccdFileUrls,
      signature: signatureFileName,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    await client.db('utility_card').collection('pool_registers').insertOne(registrationData);
    await client.close();
    res.json({ success: true, message: 'Đăng ký vòng bơi thành công!', chungcuName, createdAt: registrationData.created_at });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Không thể lưu đăng ký. Vui lòng thử lại sau.' });
  }
});

// API xử lý đăng ký quảng cáo
router.post('/api/advertising-register', upload.none(), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'Không xác định được tenant' });
  }
  try {
    const { fullName, phone, email, apartment, role, content, location, adType, fromDate, toDate, signature } = req.body;
    if (!fullName || !phone || !apartment || !role || !content || !location || !adType || !fromDate || !toDate || !signature) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin bắt buộc.' });
    }
    // Lưu chữ ký (base64) vào MinIO nếu có
    let signatureFileName = '';
    if (signature && minioClient) {
      const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      signatureFileName = `${tenantId}_${Date.now()}_ad_signature.png`;
      const bucketName = 'advertising-register';
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) await minioClient.makeBucket(bucketName);
      await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    }
    // Lưu thông tin đăng ký vào MongoDB
    const client = new MongoClient(mongoUri);
    await client.connect();
    let chungcuName = '';
    try {
      const tenant = await client.db('admin').collection('tenants').findOne({ tenant_id: tenantId });
      if (tenant && tenant.name) chungcuName = tenant.name;
    } catch (err) { /* ignore */ }
    const registrationData = {
      tenant_id: tenantId,
      personal_info: {
        full_name: fullName,
        phone,
        email,
        apartment,
        role
      },
      content,
      location,
      ad_type: adType,
      from_date: fromDate,
      to_date: toDate,
      signature: signatureFileName,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    await client.db('utility_services').collection('advertising_registers').insertOne(registrationData);
    await client.close();
    res.json({ success: true, message: 'Đăng ký quảng cáo thành công!', chungcuName, createdAt: registrationData.created_at });
  } catch (error) {
    console.error('Error processing advertising register:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra khi xử lý đăng ký quảng cáo' });
  }
});

// API xử lý đăng ký yêu cầu kiểm tra camera
router.post('/api/camera-check-request', upload.none(), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'Không xác định được tenant' });
  }
  try {
    const { fullName, phone, email, apartment, role, cameraLocation, requestReason, fromDate, toDate, signature } = req.body;
    if (!fullName || !phone || !apartment || !role || !cameraLocation || !requestReason || !fromDate || !toDate || !signature) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin bắt buộc.' });
    }
    // Lưu chữ ký (base64) vào MinIO nếu có
    let signatureFileName = '';
    if (signature && minioClient) {
      const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const bucketName = 'camera-check-request';
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) await minioClient.makeBucket(bucketName);
      signatureFileName = `${tenantId}_${Date.now()}_camera_signature.png`;
      await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    }
    // Lưu thông tin đăng ký vào MongoDB
    const client = new MongoClient(mongoUri);
    await client.connect();
    let chungcuName = '';
    try {
      const tenant = await client.db('admin').collection('tenants').findOne({ tenant_id: tenantId });
      if (tenant && tenant.name) chungcuName = tenant.name;
    } catch (err) { /* ignore */ }
    const requestData = {
      tenant_id: tenantId,
      personal_info: {
        full_name: fullName,
        phone,
        email,
        apartment,
        role
      },
      camera_location: cameraLocation,
      request_reason: requestReason,
      from_date: fromDate,
      to_date: toDate,
      signature: signatureFileName,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    await client.db('utility_services').collection('camera_check_requests').insertOne(requestData);
    await client.close();
    res.json({ success: true, message: 'Gửi yêu cầu kiểm tra camera thành công!', chungcuName, createdAt: requestData.created_at });
  } catch (error) {
    console.error('Error processing camera check request:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra khi xử lý yêu cầu kiểm tra camera' });
  }
});

// API đăng ký & cam kết vật nuôi
router.post('/api/pets-commitment-register', upload.single('petImage'), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'Không xác định được tenant' });
  }
  try {
    // Lấy thông tin từ form
    const { fullName, phone, email, apartment, role, petType, petQuantity, petReason, signature } = req.body;
    if (!fullName || !phone || !apartment || !role || !petType || !petQuantity || !signature) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin bắt buộc.' });
    }
    // Lưu ảnh vật nuôi lên MinIO
    let petImageFileName = '';
    if (req.file && minioClient) {
      const bucketName = 'pets-commitment-register';
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) await minioClient.makeBucket(bucketName);
      petImageFileName = `${tenantId}_${Date.now()}_pet_${req.file.originalname}`;
      await minioClient.putObject(bucketName, petImageFileName, req.file.buffer);
    }
    // Lưu chữ ký (base64) lên MinIO
    let signatureFileName = '';
    if (signature && minioClient) {
      const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const bucketName = 'pets-commitment-register';
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) await minioClient.makeBucket(bucketName);
      signatureFileName = `${tenantId}_${Date.now()}_pet_signature.png`;
      await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    }
    // Lưu thông tin đăng ký vào MongoDB
    const client = new MongoClient(mongoUri);
    await client.connect();
    let chungcuName = '';
    try {
      const tenant = await client.db('admin').collection('tenants').findOne({ tenant_id: tenantId });
      if (tenant && tenant.name) chungcuName = tenant.name;
    } catch (err) { /* ignore */ }
    const requestData = {
      tenant_id: tenantId,
      personal_info: {
        full_name: fullName,
        phone,
        email,
        apartment,
        role
      },
      pet_info: {
        pet_type: petType,
        pet_quantity: petQuantity,
        pet_reason: petReason,
        pet_image: petImageFileName
      },
      signature: signatureFileName,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    await client.db('utility_services').collection('pets_commitment_register').insertOne(requestData);
    await client.close();
    res.json({ success: true, message: 'Gửi cam kết vật nuôi thành công!', chungcuName, createdAt: requestData.created_at });
  } catch (error) {
    console.error('Error processing pets commitment register:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra khi xử lý đăng ký vật nuôi' });
  }
});

// Đăng ký sử dụng phòng sinh hoạt cộng đồng
router.post('/api/community-room-register', upload.none(), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'Không xác định được tenant' });
  }
  try {
    const { fullName, phone, email, apartment, role, purpose, date, time, attendees, note, signature } = req.body;
    if (!fullName || !phone || !apartment || !role || !purpose || !date || !time || !attendees || !signature) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin bắt buộc.' });
    }
    // Lưu chữ ký (base64) vào MinIO nếu có
    let signatureFileName = '';
    if (signature && minioClient) {
      const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      signatureFileName = `${tenantId}_${Date.now()}_community_signature.png`;
      const bucketName = 'community-room-register';
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) await minioClient.makeBucket(bucketName);
      await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    }
    // Lưu thông tin đăng ký vào MongoDB
    const client = new MongoClient(mongoUri);
    await client.connect();
    let chungcuName = '';
    try {
      const tenant = await client.db('admin').collection('tenants').findOne({ tenant_id: tenantId });
      if (tenant && tenant.name) chungcuName = tenant.name;
    } catch (err) { /* ignore */ }
    const registrationData = {
      tenant_id: tenantId,
      personal_info: {
        full_name: fullName,
        phone,
        email,
        apartment,
        role
      },
      purpose,
      date,
      time,
      attendees,
      note,
      signature: signatureFileName,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    await client.db('utility_services').collection('community_room_registers').insertOne(registrationData);
    await client.close();
    res.json({ success: true, message: 'Đăng ký sử dụng phòng sinh hoạt cộng đồng thành công!', chungcuName, createdAt: registrationData.created_at });
  } catch (error) {
    console.error('Error processing community room register:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra khi xử lý đăng ký phòng sinh hoạt cộng đồng' });
  }
});

// API lưu thông tin đăng ký cư dân
router.post('/api/resident-info-register', upload.none(), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'Không xác định được tenant' });
  }
  try {
    const { ownerName, apartment, phone, email, role } = req.body;
    // Lấy danh sách thành viên (nếu có)
    let members = [];
    if (Array.isArray(req.body['memberName[]'])) {
      // Nhiều thành viên
      const names = req.body['memberName[]'];
      const dobs = req.body['memberDob[]'] || [];
      const relations = req.body['memberRelation[]'] || [];
      const ids = req.body['memberId[]'] || [];
      for (let i = 0; i < names.length; i++) {
        members.push({
          name: names[i] || '',
          dob: dobs[i] || '',
          relation: relations[i] || '',
          id: ids[i] || ''
        });
      }
    } else if (req.body['memberName[]']) {
      // Một thành viên
      members.push({
        name: req.body['memberName[]'] || '',
        dob: req.body['memberDob[]'] || '',
        relation: req.body['memberRelation[]'] || '',
        id: req.body['memberId[]'] || ''
      });
    }
    // Lưu vào MongoDB (DB riêng: resident_info)
    const client = new MongoClient(mongoUri);
    await client.connect();
    let chungcuName = '';
    try {
      const tenant = await client.db('admin').collection('tenants').findOne({ tenant_id: tenantId });
      if (tenant && tenant.name) chungcuName = tenant.name;
    } catch (err) { /* ignore */ }
    const registrationData = {
      tenant_id: tenantId,
      owner: { ownerName, apartment, phone, email, role },
      members,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    await client.db('resident_info').collection('resident_info_registers').insertOne(registrationData);
    await client.close();
    res.json({ success: true, message: 'Đăng ký thông tin cư dân thành công!', chungcuName, createdAt: registrationData.created_at });
  } catch (error) {
    console.error('Error processing resident info register:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra khi xử lý đăng ký thông tin cư dân' });
  }
});

module.exports = router;
