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
  
  // Nếu service là utility-services, hiển thị trang dịch vụ tiện ích
  if (service === 'utility-services') {
    // Nếu có subservice là contact-management, hiển thị form liên hệ
    if (subservice === 'contact-management') {
      const htmlPath = path.join(__dirname, '..', 'views', 'contact-management-form.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lỗi đọc giao diện');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    
    // Mặc định hiển thị trang dịch vụ tiện ích
    const htmlPath = path.join(__dirname, '..', 'views', 'utility-services.html');
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
    if (!fullName || !phone || !email || !apartment || !role || !registrationDate) {
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
    if (!fullName || !phone || !email || !apartment || !role || !remakeReason) {
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
    if (!fullName || !phone || !email || !apartment || !role || !cancelDate) {
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
    if (!fullName || !phone || !email || !apartment || !role || !changeDate || !changeReason) {
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

module.exports = router;
