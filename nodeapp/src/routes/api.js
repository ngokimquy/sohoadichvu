const Jimp = require('jimp');

// API tra cứu thông tin đăng ký dịch vụ đã đăng ký (GET /api/registration-lookup)


const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const Minio = require('minio');
const multer = require('multer');
const crypto = require('crypto');
const { sendNewRegistrationNotification } = require('../utils/notification');
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, fieldSize: 50 * 1024 * 1024 }
});

const mongoUri = process.env.MONGO_URI;

// Cache để tránh duplicate requests
const requestCache = new Map();
const CACHE_EXPIRY = 30000; // 30 seconds

// Helper function để tạo request hash
function createRequestHash(tenantId, body) {
  const key = `${tenantId}_${body.fullName}_${body.phone}_${body.apartment}_${JSON.stringify(body.vehicleType || [])}`;
  return crypto.createHash('md5').update(key).digest('hex');
}

// Helper function Ä‘á»ƒ táº¡o unique filename
function generateUniqueFileName(tenantId, prefix, originalName) {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8); // 6 kÃ½ tá»± random
  const fileExtension = path.extname(originalName);
  const baseName = path.basename(originalName, fileExtension);
  const fileName = `${tenantId}_${timestamp}_${randomSuffix}_${prefix}_${baseName}${fileExtension}`;
  console.log(`Generated unique filename: ${fileName}`); // Debug log
  return fileName;
}

// Khá»Ÿi táº¡o MinIO client
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

// Khi truy cáº­p subdomain, chuyá»ƒn hÆ°á»›ng vá» trang Ä‘Äƒng kÃ½ dá»‹ch vá»¥
router.get('/', (req, res) => {
  res.redirect('/tenants');
});



// Route Ä‘á»ƒ serve file tá»« MinIO - PHáº¢I Äáº¶T TRÆ¯á»šC route /tenants Ä‘á»ƒ trÃ¡nh conflict
router.get('/minio/:bucket/:filename', async (req, res) => {
  try {
    if (!minioClient) {
      return res.status(500).send('MinIO client not configured');
    }
    
    const { bucket, filename } = req.params;
    
    // Kiá»ƒm tra xem bucket cÃ³ tá»“n táº¡i khÃ´ng
    const bucketExists = await minioClient.bucketExists(bucket);
    if (!bucketExists) {
      return res.status(404).send('Bucket not found');
    }
    
    // Láº¥y metadata cá»§a file Ä‘á»ƒ set content type
    const stat = await minioClient.statObject(bucket, filename);
    
    // Set content type dá»±a trÃªn extension
    const ext = filename.split('.').pop().toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'bmp':
        contentType = 'image/bmp';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
      case 'pdf':
        contentType = 'application/pdf';
        break;
      case 'doc':
        contentType = 'application/msword';
        break;
      case 'docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case 'xls':
        contentType = 'application/vnd.ms-excel';
        break;
      case 'xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'ppt':
        contentType = 'application/vnd.ms-powerpoint';
        break;
      case 'pptx':
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        break;
      case 'txt':
        contentType = 'text/plain; charset=utf-8';
        break;
      default:
        contentType = 'application/octet-stream';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 1 ngÃ y
    
    // Stream file tá»« MinIO
    const dataStream = await minioClient.getObject(bucket, filename);
    dataStream.pipe(res);
    
  } catch (err) {
    console.error('Error serving file from MinIO:', err);
    if (err.code === 'NoSuchKey') {
      return res.status(404).send('File not found');
    }
    res.status(500).send('Error retrieving file');
  }
});

// Route Ä‘á»ƒ serve file vá»›i path phá»©c táº¡p hÆ¡n (cÃ³ thÆ° má»¥c con)
router.get('/minio/:bucket/*', async (req, res) => {
  try {
    if (!minioClient) {
      return res.status(500).send('MinIO client not configured');
    }
    
    const bucket = req.params.bucket;
    const filename = req.params[0]; // Láº¥y path sau bucket
    
    // Kiá»ƒm tra xem bucket cÃ³ tá»“n táº¡i khÃ´ng
    const bucketExists = await minioClient.bucketExists(bucket);
    if (!bucketExists) {
      return res.status(404).send('Bucket not found');
    }
    
    // Láº¥y metadata cá»§a file Ä‘á»ƒ set content type
    const stat = await minioClient.statObject(bucket, filename);
    
    // Set content type dá»±a trÃªn extension
    const ext = filename.split('.').pop().toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'bmp':
        contentType = 'image/bmp';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
      case 'pdf':
        contentType = 'application/pdf';
        break;
      case 'doc':
        contentType = 'application/msword';
        break;
      case 'docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case 'xls':
        contentType = 'application/vnd.ms-excel';
        break;
      case 'xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'ppt':
        contentType = 'application/vnd.ms-powerpoint';
        break;
      case 'pptx':
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        break;
      case 'txt':
        contentType = 'text/plain; charset=utf-8';
        break;
      default:
        contentType = 'application/octet-stream';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename.split('/').pop()}"`);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 1 ngÃ y
    
    // Stream file tá»« MinIO
    const dataStream = await minioClient.getObject(bucket, filename);
    dataStream.pipe(res);
    
  } catch (err) {
    console.error('Error serving file from MinIO:', err);
    if (err.code === 'NoSuchKey') {
      return res.status(404).send('File not found');
    }
    res.status(500).send('Error retrieving file');
  }
});

// Route trang Ä‘Äƒng kÃ½ dá»‹ch vá»¥ cho táº¥t cáº£ subdomain
router.get('/tenants/:service?/:subservice?', async (req, res) => {
// API tra cứu thông tin đăng ký dịch vụ cho cư dân (theo tenant)

  // Trang tra cứu dịch vụ đã đăng ký

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
      // Bá» qua lá»—i, chá»‰ khÃ´ng hiá»‡n tÃªn
    }
  }

  if (service === 'registration-lookup') {
    const htmlPath = path.join(__dirname, '..', 'views', 'registration-lookup.html');
    fs.readFile(htmlPath, 'utf8', (err, html) => {
      if (err) return res.status(500).send('Lỗi đọc feffefgiao diện tra cứu');
      res.send(html);
    });
    return;
  }



  if (service === 'resident-info-register') {
    const htmlPath = path.join(__dirname, '..', 'views', 'resident-info-register.html');
    fs.readFile(htmlPath, 'utf8', (err, html) => {
      if (err) return res.status(500).send('Lỗi đọc giao diện');
      res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
    });
    return;
  }



  
 
  
  // Náº¿u service lÃ  car-registration, hiá»ƒn thá»‹ trang dá»‹ch vá»¥ tháº» xe
  if (service === 'car-registration') {
    // Náº¿u cÃ³ subservice lÃ  monthly, hiá»ƒn thá»‹ form Ä‘Äƒng kÃ½
    if (subservice === 'monthly') {
      const htmlPath = path.join(__dirname, '..', 'views', 'car-registration-form.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lá»—i Ä‘á»c giao diá»‡n');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    
    // Náº¿u cÃ³ subservice lÃ  remake, hiá»ƒn thá»‹ form lÃ m láº¡i tháº»
    if (subservice === 'remake') {
      const htmlPath = path.join(__dirname, '..', 'views', 'car-remake-form.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lá»—i Ä‘á»c giao diá»‡n');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    
    // Náº¿u cÃ³ subservice lÃ  update, hiá»ƒn thá»‹ form thay Ä‘á»•i thÃ´ng tin
    if (subservice === 'update') {
      const htmlPath = path.join(__dirname, '..', 'views', 'car-update-form.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lá»—i Ä‘á»c giao diá»‡n');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    
    // Náº¿u cÃ³ subservice lÃ  cancel, hiá»ƒn thá»‹ form há»§y tháº»
    if (subservice === 'cancel') {
      const htmlPath = path.join(__dirname, '..', 'views', 'car-cancel-form.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lá»—i Ä‘á»c giao diá»‡n');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    
    // Máº·c Ä‘á»‹nh hiá»ƒn thá»‹ trang dá»‹ch vá»¥ tháº» xe
    const htmlPath = path.join(__dirname, '..', 'views', 'car-service.html');
    fs.readFile(htmlPath, 'utf8', (err, html) => {
      if (err) return res.status(500).send('Lá»—i Ä‘á»c giao diá»‡n');
      res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
    });
    return;
  }

  
  
  // Náº¿u service lÃ  utility-services, hiá»ƒn thá»‹ trang dá»‹ch vá»¥ tiá»‡n Ã­ch vÃ  cÃ¡c subservice con
  if (service === 'utility-services') {
    // Subservice: advertising-register
    if (subservice === 'advertising-register') {
      const htmlPath = path.join(__dirname, '..', 'views', 'advertising-register.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lá»—i Ä‘á»c giao diá»‡n');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    // Subservice: camera-check-request
    if (subservice === 'camera-check-request') {
      const htmlPath = path.join(__dirname, '..', 'views', 'camera-check-request.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lá»—i Ä‘á»c giao diá»‡n');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    // Subservice: pet-commitment-register
    if (subservice === 'pets-commitment-register') {
      const htmlPath = path.join(__dirname, '..', 'views', 'pets-commitment-register.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lá»—i Ä‘á»c giao diá»‡n');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
       if (subservice === 'community-room-register') {
      const htmlPath = path.join(__dirname, '..', 'views', 'community-room-register.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lá»—i Ä‘á»c giao diá»‡n');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    // Subservice: resident-info-register
  
    // Náº¿u khÃ´ng cÃ³ subservice hoáº·c subservice khÃ´ng khá»›p, tráº£ vá» trang máº¹ utility-services
    const htmlPath = path.join(__dirname, '..', 'views', 'utility-services.html');
    fs.readFile(htmlPath, 'utf8', (err, html) => {
      if (err) return res.status(500).send('Lá»—i Ä‘á»c giao diá»‡n');
      res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
    });
    return;
  }
  
  // Náº¿u service lÃ  utility-card, kiá»ƒm tra tá»«ng subservice cá»¥ thá»ƒ
  if (service === 'utility-card') {
    // Subservice: elevator-register
    if (subservice === 'elevator-register') {
      const htmlPath = path.join(__dirname, '..', 'views', 'elevator-register.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lá»—i Ä‘á»c giao diá»‡n');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    // Subservice: elevator-cancel (chÆ°a cÃ³ form, Ä‘á»ƒ sáºµn route)
    if (subservice === 'elevator-cancel') {
      const htmlPath = path.join(__dirname, '..', 'views', 'elevator-cancel.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lá»—i Ä‘á»c giao diá»‡n');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    // Subservice: pool-register (chÆ°a cÃ³ form, Ä‘á»ƒ sáºµn route)
    if (subservice === 'pool-register') {
      const htmlPath = path.join(__dirname, '..', 'views', 'pool-register-form.html');
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('Lá»—i Ä‘á»c giao diá»‡n');
        res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
      });
      return;
    }
    // Subservice: community-room-register
 
    // ...cÃ³ thá»ƒ bá»• sung thÃªm cÃ¡c subservice khÃ¡c á»Ÿ Ä‘Ã¢y...
    // Náº¿u khÃ´ng cÃ³ subservice hoáº·c subservice khÃ´ng khá»›p, tráº£ vá» trang máº¹ utility-card
    const htmlPath = path.join(__dirname, '..', 'views', 'utility-card.html');
    fs.readFile(htmlPath, 'utf8', (err, html) => {
      if (err) return res.status(500).send('Lá»—i Ä‘á»c giao diá»‡n');
      res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
    });
    return;
  }

  // Náº¿u service lÃ  moving-service, hiá»ƒn thá»‹ trang Ä‘Äƒng kÃ½ dá»‹ch vá»¥ chuyá»ƒn nhÃ 
  if (service === 'moving-service') {
    const htmlPath = path.join(__dirname, '..', 'views', 'moving-service-register.html');
    fs.readFile(htmlPath, 'utf8', (err, html) => {
      if (err) return res.status(500).send('Lá»—i Ä‘á»c giao diá»‡n');
      res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
    });
    return;
  }

  // Náº¿u service lÃ  construction, hiá»ƒn thá»‹ trang Ä‘Äƒng kÃ½ dá»‹ch vá»¥ xÃ¢y dá»±ng
  if (service === 'construction') {
    const htmlPath = path.join(__dirname, '..', 'views', 'construction-register.html');
    fs.readFile(htmlPath, 'utf8', (err, html) => {
      if (err) return res.status(500).send('Lá»—i Ä‘á»c giao diá»‡n');
      res.send(html.replace('{{chungcuName}}', chungcuName ? chungcuName : ''));
    });
    return;
  }

  // Máº·c Ä‘á»‹nh hiá»ƒn thá»‹ trang chÃ­nh
  const htmlPath = path.join(__dirname, '..', 'views', 'tenant-register.html');
  fs.readFile(htmlPath, 'utf8', (err, html) => {
    if (err) return res.status(500).send('Lá»—i Ä‘á»c giao diá»‡n');
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

// API kiá»ƒm tra káº¿t ná»‘i MongoDB vÃ  MinIO
router.get('/api/healthcheck', async (req, res) => {
  // Kiá»ƒm tra MongoDB
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

  // Kiá»ƒm tra MinIO
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

// API xá»­ lÃ½ Ä‘Äƒng kÃ½ tháº» xe
router.post('/api/car-registration', upload.fields([
  { name: 'cccdFiles', maxCount: 10 },
  { name: 'cavetFiles', maxCount: 10 }
]), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c tenant' });
  }
  try {
    // Láº¥y thÃ´ng tin cÃ¡ nhÃ¢n
    const { fullName, phone, email, apartment, role, signature, registrationDate } = req.body;
    if (!fullName || !phone || !apartment || !role || !registrationDate) {
      return res.status(400).json({ error: 'Thiáº¿u thÃ´ng tin cÃ¡ nhÃ¢n hoáº·c ngÃ y Ä‘Äƒng kÃ½ xe' });
    }
    // Láº¥y thÃ´ng tin xe (máº£ng)
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
      return res.status(400).json({ error: 'Thiáº¿u hoáº·c sai thÃ´ng tin xe' });
    }
    const vehicles = vehicleTypes.map((type, i) => ({
      type,
      license_plate: licensePlates[i] || '',
      owner_name: ownerNames[i] || ''
    }));
    // Kiá»ƒm tra file há»“ sÆ¡
    const cccdFiles = req.files && req.files.cccdFiles ? req.files.cccdFiles : [];
    const cavetFiles = req.files && req.files.cavetFiles ? req.files.cavetFiles : [];
    if (cccdFiles.length === 0) {
      return res.status(400).json({ error: 'Thiáº¿u file CCCD máº·t trÆ°á»›c' });
    }
    if (cavetFiles.length === 0) {
      return res.status(400).json({ error: 'Thiáº¿u file Cavet xe máº·t trÆ°á»›c' });
    }
    // Kiá»ƒm tra signature há»£p lá»‡
    if (
      !signature ||
      typeof signature !== 'string' ||
      !signature.startsWith('data:image/') ||
      !signature.includes('base64,') ||
      signature.split('base64,')[1].trim().length < 100
    ) {
      return res.status(400).json({ error: 'Vui lÃ²ng kÃ½ tÃªn xÃ¡c nháº­n' });
    }
    // LÆ°u file lÃªn MinIO
    const bucketName = 'car-registrations';
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) await minioClient.makeBucket(bucketName);
    const cccdFileUrls = [];
    for (const file of cccdFiles) {
      const fileName = generateUniqueFileName(tenantId, 'cccd', file.originalname);
      // Xử lý nén và giảm độ phân giải bằng Jimp
      const image = await Jimp.read(file.buffer);
      image.resize(1024, Jimp.AUTO); // Resize về max width 1024px
      const mime = image.getMIME();
  let quality = 30;
      let buffer;
      if (mime === Jimp.MIME_JPEG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_JPEG);
      } else if (mime === Jimp.MIME_PNG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_PNG);
      } else {
        buffer = await image.getBufferAsync(mime);
      }
      await minioClient.putObject(bucketName, fileName, buffer, buffer.length);
      cccdFileUrls.push(fileName);
    }
    const cavetFileUrls = [];
    for (const file of cavetFiles) {
      const fileName = generateUniqueFileName(tenantId, 'cavet', file.originalname);
      // Xử lý nén và giảm độ phân giải bằng Jimp
      const image = await Jimp.read(file.buffer);
      image.resize(1024, Jimp.AUTO);
      const mime = image.getMIME();
  let quality = 30;
      let buffer;
      if (mime === Jimp.MIME_JPEG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_JPEG);
      } else if (mime === Jimp.MIME_PNG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_PNG);
      } else {
        buffer = await image.getBufferAsync(mime);
      }
      await minioClient.putObject(bucketName, fileName, buffer, buffer.length);
      cavetFileUrls.push(fileName);
    }
    // LÆ°u chá»¯ kÃ½
    const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const signatureFileName = generateUniqueFileName(tenantId, 'signature', 'signature.png');
    await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    // LÆ°u thÃ´ng tin Ä‘Äƒng kÃ½ vÃ o MongoDB
    const client = new MongoClient(mongoUri);
    await client.connect();
    // Láº¥y tÃªn chung cÆ°
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
    
    // Gửi notification cho admin
    try {
      const io = req.app.get('io');
      if (io) {
        // Add required fields for notification
        const notificationData = {
          ...registrationData,
          _id: registrationData._id,
          user_name: fullName,
          fullName: fullName,
          user_phone: phone,
          phone: phone,
          service_name: 'Thẻ Xe - Đăng ký mới'
        };
        sendNewRegistrationNotification(io, tenantId, notificationData);
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the registration if notification fails
    }
    
    await client.close();
    res.json({ success: true, message: 'ÄÄƒng kÃ½ thÃ nh cÃ´ng!', chungcuName, createdAt: registrationData.created_at });
  } catch (error) {
    console.error('Error processing car registration:', error);
    res.status(500).json({ error: 'CÃ³ lá»—i xáº£y ra khi xá»­ lÃ½ Ä‘Äƒng kÃ½' });
  }
});

// API xá»­ lÃ½ lÃ m láº¡i tháº» xe
router.post('/api/car-remake', upload.fields([
  { name: 'cccdFiles', maxCount: 10 },
  { name: 'cavetFiles', maxCount: 10 }
]), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c tenant' });
  }
  try {
    // Láº¥y thÃ´ng tin cÃ¡ nhÃ¢n
    const { fullName, phone, email, apartment, role, signature, remakeReason, oldCardNumber } = req.body;
    if (!fullName || !phone || !apartment || !role || !remakeReason) {
      return res.status(400).json({ error: 'Thiáº¿u thÃ´ng tin cÃ¡ nhÃ¢n hoáº·c lÃ½ do lÃ m láº¡i tháº»' });
    }
    // Láº¥y thÃ´ng tin xe (máº£ng)
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
      return res.status(400).json({ error: 'Thiáº¿u hoáº·c sai thÃ´ng tin xe' });
    }
    const vehicles = vehicleTypes.map((type, i) => ({
      type,
      license_plate: licensePlates[i] || '',
      brand: brands[i] || '',
      color: colors[i] || ''
    }));
    // Kiá»ƒm tra file há»“ sÆ¡
    const cccdFiles = req.files && req.files.cccdFiles ? req.files.cccdFiles : [];
    const cavetFiles = req.files && req.files.cavetFiles ? req.files.cavetFiles : [];
    if (cccdFiles.length === 0) {
      return res.status(400).json({ error: 'Thiáº¿u file CCCD máº·t trÆ°á»›c' });
    }
    if (cavetFiles.length === 0) {
      return res.status(400).json({ error: 'Thiáº¿u file Cavet xe máº·t trÆ°á»›c' });
    }
    // Kiá»ƒm tra signature há»£p lá»‡
    if (
      !signature ||
      typeof signature !== 'string' ||
      !signature.startsWith('data:image/') ||
      !signature.includes('base64,') ||
      signature.split('base64,')[1].trim().length < 100
    ) {
      return res.status(400).json({ error: 'Vui lÃ²ng kÃ½ tÃªn xÃ¡c nháº­n' });
    }
    // LÆ°u file lÃªn MinIO
    const bucketName = 'car-registrations';
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) await minioClient.makeBucket(bucketName);
    const cccdFileUrls = [];
    for (const file of cccdFiles) {
      const fileName = generateUniqueFileName(tenantId, 'cccd', file.originalname);
      const image = await Jimp.read(file.buffer);
      image.resize(1024, Jimp.AUTO);
      const mime = image.getMIME();
  let quality = 30;
      let buffer;
      if (mime === Jimp.MIME_JPEG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_JPEG);
      } else if (mime === Jimp.MIME_PNG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_PNG);
      } else {
        buffer = await image.getBufferAsync(mime);
      }
      await minioClient.putObject(bucketName, fileName, buffer, buffer.length);
      cccdFileUrls.push(fileName);
    }
    const cavetFileUrls = [];
    for (const file of cavetFiles) {
      const fileName = generateUniqueFileName(tenantId, 'cavet', file.originalname);
      const image = await Jimp.read(file.buffer);
      image.resize(1024, Jimp.AUTO);
      const mime = image.getMIME();
  let quality = 30;
      let buffer;
      if (mime === Jimp.MIME_JPEG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_JPEG);
      } else if (mime === Jimp.MIME_PNG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_PNG);
      } else {
        buffer = await image.getBufferAsync(mime);
      }
      await minioClient.putObject(bucketName, fileName, buffer, buffer.length);
      cavetFileUrls.push(fileName);
    }
    // LÆ°u chá»¯ kÃ½
    const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const signatureFileName = generateUniqueFileName(tenantId, 'signature', 'signature.png');
    await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    // LÆ°u thÃ´ng tin lÃ m láº¡i tháº» vÃ o MongoDB
    const client = new MongoClient(mongoUri);
    await client.connect();
    // Láº¥y tÃªn chung cÆ°
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
    res.json({ success: true, message: 'Gá»­i yÃªu cáº§u lÃ m láº¡i tháº» thÃ nh cÃ´ng!', chungcuName, createdAt: remakeData.created_at });
  } catch (error) {
    console.error('Error processing car remake:', error);
    res.status(500).json({ error: 'CÃ³ lá»—i xáº£y ra khi xá»­ lÃ½ yÃªu cáº§u lÃ m láº¡i tháº»' });
  }
});

// API xá»­ lÃ½ há»§y tháº» xe
router.post('/api/car-cancel', upload.fields([
  { name: 'cccdFiles', maxCount: 10 },
  { name: 'cavetFiles', maxCount: 10 }
]), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c tenant' });
  }
  try {
    // Láº¥y thÃ´ng tin cÃ¡ nhÃ¢n
    const { fullName, phone, email, apartment, role, signature, oldCardNumber, cancelDate } = req.body;
    if (!fullName || !phone || !apartment || !role || !cancelDate) {
      return res.status(400).json({ error: 'Thiáº¿u thÃ´ng tin cÃ¡ nhÃ¢n hoáº·c ngÃ y há»§y tháº»' });
    }
    // Láº¥y thÃ´ng tin xe (máº£ng)
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
      return res.status(400).json({ error: 'Thiáº¿u hoáº·c sai thÃ´ng tin xe' });
    }
    const vehicles = vehicleTypes.map((type, i) => ({
      type,
      license_plate: licensePlates[i] || '',
      brand: brands[i] || '',
      color: colors[i] || ''
    }));
    // Kiá»ƒm tra file há»“ sÆ¡
    const cccdFiles = req.files && req.files.cccdFiles ? req.files.cccdFiles : [];
    const cavetFiles = req.files && req.files.cavetFiles ? req.files.cavetFiles : [];
    if (cccdFiles.length === 0) {
      return res.status(400).json({ error: 'Thiáº¿u file CCCD máº·t trÆ°á»›c' });
    }
    if (cavetFiles.length === 0) {
      return res.status(400).json({ error: 'Thiáº¿u file Cavet xe máº·t trÆ°á»›c' });
    }
    // Kiá»ƒm tra signature há»£p lá»‡
    if (
      !signature ||
      typeof signature !== 'string' ||
      !signature.startsWith('data:image/') ||
      !signature.includes('base64,') ||
      signature.split('base64,')[1].trim().length < 100
    ) {
      return res.status(400).json({ error: 'Vui lÃ²ng kÃ½ tÃªn xÃ¡c nháº­n' });
    }
    // LÆ°u file lÃªn MinIO
    const bucketName = 'car-cancel'; // Äá»•i sang bucket riÃªng cho tháº» há»§y
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) await minioClient.makeBucket(bucketName);
    const cccdFileUrls = [];
    for (const file of cccdFiles) {
      const fileName = generateUniqueFileName(tenantId, 'cccd', file.originalname);
      const image = await Jimp.read(file.buffer);
      image.resize(1024, Jimp.AUTO);
      const mime = image.getMIME();
  let quality = 30;
      let buffer;
      if (mime === Jimp.MIME_JPEG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_JPEG);
      } else if (mime === Jimp.MIME_PNG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_PNG);
      } else {
        buffer = await image.getBufferAsync(mime);
      }
      await minioClient.putObject(bucketName, fileName, buffer, buffer.length);
      cccdFileUrls.push(fileName);
    }
    const cavetFileUrls = [];
    for (const file of cavetFiles) {
      const fileName = generateUniqueFileName(tenantId, 'cavet', file.originalname);
      const image = await Jimp.read(file.buffer);
      image.resize(1024, Jimp.AUTO);
      const mime = image.getMIME();
  let quality = 30;
      let buffer;
      if (mime === Jimp.MIME_JPEG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_JPEG);
      } else if (mime === Jimp.MIME_PNG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_PNG);
      } else {
        buffer = await image.getBufferAsync(mime);
      }
      await minioClient.putObject(bucketName, fileName, buffer, buffer.length);
      cavetFileUrls.push(fileName);
    }
    // LÆ°u chá»¯ kÃ½
    const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const signatureFileName = generateUniqueFileName(tenantId, 'signature', 'signature.png');
    await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    // LÆ°u thÃ´ng tin há»§y tháº» vÃ o MongoDB (collection cancel_requests)
    const client = new MongoClient(mongoUri);
    await client.connect();
    // Láº¥y tÃªn chung cÆ°
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
    res.json({ success: true, message: 'Gá»­i yÃªu cáº§u há»§y tháº» thÃ nh cÃ´ng!', chungcuName, createdAt: cancelData.created_at });
  } catch (error) {
    console.error('Error processing car cancel:', error);
    res.status(500).json({ error: 'CÃ³ lá»—i xáº£y ra khi xá»­ lÃ½ yÃªu cáº§u há»§y tháº»' });
  }
});

// API xá»­ lÃ½ thay Ä‘á»•i thÃ´ng tin xe
router.post('/api/car-update', upload.fields([
  { name: 'cccdFiles', maxCount: 10 },
  { name: 'cavetFiles', maxCount: 10 }
]), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c tenant' });
  }
  try {
    // Láº¥y thÃ´ng tin cÃ¡ nhÃ¢n
    const { fullName, phone, email, apartment, role, changeDate, changeReason, signature } = req.body;
    if (!fullName || !phone || !apartment || !role || !changeDate || !changeReason) {
      return res.status(400).json({ error: 'Thiáº¿u thÃ´ng tin báº¯t buá»™c' });
    }
    // Láº¥y thÃ´ng tin xe (máº£ng)
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
      return res.status(400).json({ error: 'Thiáº¿u hoáº·c sai thÃ´ng tin xe' });
    }
    const vehicles = vehicleTypes.map((type, i) => ({
      type,
      license_plate: licensePlates[i] || '',
      owner_name: ownerNames[i] || ''
    }));
    // Kiá»ƒm tra file há»“ sÆ¡
    const cccdFiles = req.files && req.files.cccdFiles ? req.files.cccdFiles : [];
    const cavetFiles = req.files && req.files.cavetFiles ? req.files.cavetFiles : [];
    if (cccdFiles.length === 0) {
      return res.status(400).json({ error: 'Thiáº¿u file CCCD máº·t trÆ°á»›c' });
    }
    if (cavetFiles.length === 0) {
      return res.status(400).json({ error: 'Thiáº¿u file Cavet xe máº·t trÆ°á»›c' });
    }
    // Kiá»ƒm tra signature há»£p lá»‡
    if (
      !signature ||
      typeof signature !== 'string' ||
      !signature.startsWith('data:image/') ||
      !signature.includes('base64,') ||
      signature.split('base64,')[1].trim().length < 100
    ) {
      return res.status(400).json({ error: 'Vui lÃ²ng kÃ½ tÃªn xÃ¡c nháº­n' });
    }
    // LÆ°u file lÃªn MinIO
    const bucketName = 'car-update';
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) await minioClient.makeBucket(bucketName);
    const cccdFileUrls = [];
    for (const file of cccdFiles) {
      const fileName = generateUniqueFileName(tenantId, 'cccd', file.originalname);
      const image = await Jimp.read(file.buffer);
      image.resize(1024, Jimp.AUTO);
      const mime = image.getMIME();
  let quality = 30;
      let buffer;
      if (mime === Jimp.MIME_JPEG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_JPEG);
      } else if (mime === Jimp.MIME_PNG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_PNG);
      } else {
        buffer = await image.getBufferAsync(mime);
      }
      await minioClient.putObject(bucketName, fileName, buffer, buffer.length);
      cccdFileUrls.push(fileName);
    }
    const cavetFileUrls = [];
    for (const file of cavetFiles) {
      const fileName = generateUniqueFileName(tenantId, 'cavet', file.originalname);
      const image = await Jimp.read(file.buffer);
      image.resize(1024, Jimp.AUTO);
      const mime = image.getMIME();
  let quality = 30;
      let buffer;
      if (mime === Jimp.MIME_JPEG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_JPEG);
      } else if (mime === Jimp.MIME_PNG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_PNG);
      } else {
        buffer = await image.getBufferAsync(mime);
      }
      await minioClient.putObject(bucketName, fileName, buffer, buffer.length);
      cavetFileUrls.push(fileName);
    }
    // LÆ°u chá»¯ kÃ½
    const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const signatureFileName = generateUniqueFileName(tenantId, 'signature', 'signature.png');
    await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    // LÆ°u thÃ´ng tin thay Ä‘á»•i vÃ o MongoDB
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
    res.json({ success: true, message: 'Gá»­i yÃªu cáº§u thay Ä‘á»•i thÃ´ng tin xe thÃ nh cÃ´ng!', chungcuName, createdAt: updateData.created_at });
  } catch (error) {
    console.error('Error processing car update:', error);
    res.status(500).json({ error: 'CÃ³ lá»—i xáº£y ra khi xá»­ lÃ½ yÃªu cáº§u thay Ä‘á»•i thÃ´ng tin xe' });
  }
});

// Xá»­ lÃ½ Ä‘Äƒng kÃ½ tháº» tiá»‡n Ã­ch khÃ¡c
router.post('/api/utility-card', express.urlencoded({ extended: true }), async (req, res) => {
  const { fullName, apartment, cardType, phone, email, note } = req.body;
  if (!fullName || !apartment || !cardType || !phone) {
    return res.status(400).json({ success: false, error: 'Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin báº¯t buá»™c.' });
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
    res.status(500).json({ success: false, error: 'KhÃ´ng thá»ƒ lÆ°u Ä‘Äƒng kÃ½. Vui lÃ²ng thá»­ láº¡i sau.' });
  }
});

// ÄÄƒng kÃ½ tháº» thang mÃ¡y (cÃ³ sá»‘ lÆ°á»£ng tháº», ghi chÃº, file CCCD)
router.post('/api/elevator-card-register', upload.fields([
  { name: 'cccdFiles', maxCount: 10 }
]), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c tenant' });
  }
  try {
    const { fullName, apartment, phone, email, role, cardQuantity, note, signature } = req.body;
    if (!fullName || !apartment || !phone || !role || !cardQuantity) {
      return res.status(400).json({ success: false, error: 'Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin báº¯t buá»™c.' });
    }
    // Kiá»ƒm tra file CCCD
    const cccdFiles = req.files && req.files.cccdFiles ? req.files.cccdFiles : [];
    if (cccdFiles.length === 0) {
      return res.status(400).json({ success: false, error: 'Vui lÃ²ng táº£i lÃªn file CCCD máº·t trÆ°á»›c.' });
    }
    // Kiá»ƒm tra signature há»£p lá»‡
    if (
      !signature ||
      typeof signature !== 'string' ||
      !signature.startsWith('data:image/') ||
      !signature.includes('base64,') ||
      signature.split('base64,')[1].trim().length < 100
    ) {
      return res.status(400).json({ success: false, error: 'Vui lÃ²ng kÃ½ tÃªn xÃ¡c nháº­n.' });
    }
    // LÆ°u file lÃªn MinIO
    const bucketName = 'elevator-cards';
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) await minioClient.makeBucket(bucketName);
    const cccdFileUrls = [];
    for (const file of cccdFiles) {
      const fileName = generateUniqueFileName(tenantId, 'cccd', file.originalname);
      const image = await Jimp.read(file.buffer);
      image.resize(1024, Jimp.AUTO);
      const mime = image.getMIME();
      let quality = 60;
      let buffer;
      if (mime === Jimp.MIME_JPEG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_JPEG);
      } else if (mime === Jimp.MIME_PNG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_PNG);
      } else {
        buffer = await image.getBufferAsync(mime);
      }
      await minioClient.putObject(bucketName, fileName, buffer, buffer.length);
      cccdFileUrls.push(fileName);
    }
    // LÆ°u chá»¯ kÃ½ lÃªn MinIO
    const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const signatureFileName = generateUniqueFileName(tenantId, 'signature', 'signature.png');
    await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    // LÆ°u thÃ´ng tin Ä‘Äƒng kÃ½ vÃ o MongoDB (db: utility_card, collection: elevator_cards)
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
    
    // Send push notification to admin
    try {
      await sendNewRegistrationNotification(tenantId, {
        type: 'elevator_card_register',
        title: 'Đăng ký thẻ thang máy mới',
        message: `${fullName} đã đăng ký ${cardQuantity} thẻ thang máy`,
        data: {
          phone: phone,
          apartment: apartment,
          cardQuantity: cardQuantity
        }
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
    }
    
    res.json({ success: true, message: 'ÄÄƒng kÃ½ tháº» thang mÃ¡y thÃ nh cÃ´ng!', chungcuName, createdAt: registrationData.created_at });
  } catch (err) {
    res.status(500).json({ success: false, error: 'KhÃ´ng thá»ƒ lÆ°u Ä‘Äƒng kÃ½. Vui lÃ²ng thá»­ láº¡i sau.' });
  }
});

// Há»§y tháº» thang mÃ¡y
router.post('/api/elevator-card-cancel', upload.fields([
  { name: 'cccdFiles', maxCount: 10 }
]), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c tenant' });
  }
  try {
    const { fullName, apartment, phone, email, role, cardNumber, signature } = req.body;
    if (!fullName || !apartment || !phone || !role || !cardNumber) {
      return res.status(400).json({ success: false, error: 'Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin báº¯t buá»™c.' });
    }
    // Kiá»ƒm tra file CCCD
    const cccdFiles = req.files && req.files.cccdFiles ? req.files.cccdFiles : [];
    if (cccdFiles.length === 0) {
      return res.status(400).json({ success: false, error: 'Vui lÃ²ng táº£i lÃªn file CCCD máº·t trÆ°á»›c.' });
    }
    // Kiá»ƒm tra signature há»£p lá»‡
    if (
      !signature ||
      typeof signature !== 'string' ||
      !signature.startsWith('data:image/') ||
      !signature.includes('base64,') ||
      signature.split('base64,')[1].trim().length < 100
    ) {
      return res.status(400).json({ success: false, error: 'Vui lÃ²ng kÃ½ tÃªn xÃ¡c nháº­n.' });
    }
    // LÆ°u file lÃªn MinIO
    const bucketName = 'elevator-cancel';
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) await minioClient.makeBucket(bucketName);
    const cccdFileUrls = [];
    for (const file of cccdFiles) {
      const fileName = generateUniqueFileName(tenantId, 'cccd', file.originalname);
      const image = await Jimp.read(file.buffer);
      image.resize(1024, Jimp.AUTO);
      const mime = image.getMIME();
      let quality = 60;
      let buffer;
      if (mime === Jimp.MIME_JPEG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_JPEG);
      } else if (mime === Jimp.MIME_PNG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_PNG);
      } else {
        buffer = await image.getBufferAsync(mime);
      }
      await minioClient.putObject(bucketName, fileName, buffer, buffer.length);
      cccdFileUrls.push(fileName);
    }
    // LÆ°u chá»¯ kÃ½ lÃªn MinIO
    const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const signatureFileName = generateUniqueFileName(tenantId, 'signature', 'signature.png');
    await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    // LÆ°u thÃ´ng tin há»§y tháº» vÃ o MongoDB (db: utility_card, collection: elevator_cancel_requests)
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
    res.json({ success: true, message: 'YÃªu cáº§u há»§y tháº» thang mÃ¡y thÃ nh cÃ´ng!', chungcuName, createdAt: cancelData.created_at });
  } catch (err) {
    res.status(500).json({ success: false, error: 'KhÃ´ng thá»ƒ gá»­i yÃªu cáº§u. Vui lÃ²ng thá»­ láº¡i sau.' });
  }
});

// ÄÄƒng kÃ½ vÃ²ng bÆ¡i
router.post('/api/pool-register', upload.fields([
  { name: 'cccdFiles', maxCount: 10 }
]), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c tenant' });
  }
  try {
    const { fullName, phone, email, apartment, role, swimQuantity, signature } = req.body;
    if (!fullName || !apartment || !phone || !role || !swimQuantity) {
      return res.status(400).json({ success: false, error: 'Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin báº¯t buá»™c.' });
    }
    // Kiá»ƒm tra file CCCD
    const cccdFiles = req.files && req.files.cccdFiles ? req.files.cccdFiles : [];
    if (cccdFiles.length === 0) {
      return res.status(400).json({ success: false, error: 'Vui lÃ²ng táº£i lÃªn file CCCD máº·t trÆ°á»›c.' });
    }
    // Kiá»ƒm tra signature há»£p lá»‡
    if (
      !signature ||
      typeof signature !== 'string' ||
      !signature.startsWith('data:image/') ||
      !signature.includes('base64,') ||
      signature.split('base64,')[1].trim().length < 100
    ) {
      return res.status(400).json({ success: false, error: 'Vui lÃ²ng kÃ½ tÃªn xÃ¡c nháº­n.' });
    }
    // LÆ°u file lÃªn MinIO
    const bucketName = 'pool-registers';
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) await minioClient.makeBucket(bucketName);
    const cccdFileUrls = [];
    for (const file of cccdFiles) {
      const fileName = generateUniqueFileName(tenantId, 'cccd', file.originalname);
      const image = await Jimp.read(file.buffer);
      image.resize(1024, Jimp.AUTO);
      const mime = image.getMIME();
      let quality = 60;
      let buffer;
      if (mime === Jimp.MIME_JPEG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_JPEG);
      } else if (mime === Jimp.MIME_PNG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_PNG);
      } else {
        buffer = await image.getBufferAsync(mime);
      }
      await minioClient.putObject(bucketName, fileName, buffer, buffer.length);
      cccdFileUrls.push(fileName);
    }
    // LÆ°u chá»¯ kÃ½ lÃªn MinIO
    const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const signatureFileName = generateUniqueFileName(tenantId, 'signature', 'signature.png');
    await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    // LÆ°u thÃ´ng tin Ä‘Äƒng kÃ½ vÃ o MongoDB (db: utility_card, collection: pool_registers)
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
    res.json({ success: true, message: 'ÄÄƒng kÃ½ vÃ²ng bÆ¡i thÃ nh cÃ´ng!', chungcuName, createdAt: registrationData.created_at });
  } catch (err) {
    res.status(500).json({ success: false, error: 'KhÃ´ng thá»ƒ lÆ°u Ä‘Äƒng kÃ½. Vui lÃ²ng thá»­ láº¡i sau.' });
  }
});

// API xá»­ lÃ½ Ä‘Äƒng kÃ½ quáº£ng cÃ¡o
router.post('/api/advertising-register', upload.none(), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c tenant' });
  }
  try {
    const { fullName, phone, email, apartment, role, content, location, adType, fromDate, toDate, signature } = req.body;
    if (!fullName || !phone || !apartment || !role || !content || !location || !adType || !fromDate || !toDate || !signature) {
      return res.status(400).json({ error: 'Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin báº¯t buá»™c.' });
    }
    // LÆ°u chá»¯ kÃ½ (base64) vÃ o MinIO náº¿u cÃ³
    let signatureFileName = '';
    if (signature && minioClient) {
      const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      signatureFileName = generateUniqueFileName(tenantId, 'ad_signature', 'signature.png');
      const bucketName = 'advertising-register';
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) await minioClient.makeBucket(bucketName);
      await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    }
    // LÆ°u thÃ´ng tin Ä‘Äƒng kÃ½ vÃ o MongoDB
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
    res.json({ success: true, message: 'ÄÄƒng kÃ½ quáº£ng cÃ¡o thÃ nh cÃ´ng!', chungcuName, createdAt: registrationData.created_at });
  } catch (error) {
    console.error('Error processing advertising register:', error);
    res.status(500).json({ error: 'CÃ³ lá»—i xáº£y ra khi xá»­ lÃ½ Ä‘Äƒng kÃ½ quáº£ng cÃ¡o' });
  }
});

// API xá»­ lÃ½ Ä‘Äƒng kÃ½ yÃªu cáº§u kiá»ƒm tra camera
router.post('/api/camera-check-request', upload.none(), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c tenant' });
  }
  try {
    const { fullName, phone, email, apartment, role, cameraLocation, requestReason, fromDate, toDate, signature } = req.body;
    if (!fullName || !phone || !apartment || !role || !cameraLocation || !requestReason || !fromDate || !toDate || !signature) {
      return res.status(400).json({ error: 'Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin báº¯t buá»™c.' });
    }
    // LÆ°u chá»¯ kÃ½ (base64) vÃ o MinIO náº¿u cÃ³
    let signatureFileName = '';
    if (signature && minioClient) {
      const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const bucketName = 'camera-check-request';
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) await minioClient.makeBucket(bucketName);
      signatureFileName = generateUniqueFileName(tenantId, 'camera_signature', 'signature.png');
      await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    }
    // LÆ°u thÃ´ng tin Ä‘Äƒng kÃ½ vÃ o MongoDB
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
    res.json({ success: true, message: 'Gá»­i yÃªu cáº§u kiá»ƒm tra camera thÃ nh cÃ´ng!', chungcuName, createdAt: requestData.created_at });
  } catch (error) {
    console.error('Error processing camera check request:', error);
    res.status(500).json({ error: 'CÃ³ lá»—i xáº£y ra khi xá»­ lÃ½ yÃªu cáº§u kiá»ƒm tra camera' });
  }
});

// API Ä‘Äƒng kÃ½ & cam káº¿t váº­t nuÃ´i
router.post('/api/pets-commitment-register', upload.single('petImage'), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c tenant' });
  }
  try {
    // Láº¥y thÃ´ng tin tá»« form
    const { fullName, phone, email, apartment, role, petType, petQuantity, petReason, signature } = req.body;
    if (!fullName || !phone || !apartment || !role || !petType || !petQuantity || !signature) {
      return res.status(400).json({ error: 'Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin báº¯t buá»™c.' });
    }
    // LÆ°u áº£nh váº­t nuÃ´i lÃªn MinIO
    let petImageFileName = '';
    const bucketName = 'pets-commitment-register';
    if (req.file && minioClient) {
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) await minioClient.makeBucket(bucketName);
      petImageFileName = generateUniqueFileName(tenantId, 'pet', req.file.originalname);
      // Nén và resize ảnh vật nuôi
      const image = await Jimp.read(req.file.buffer);
      image.resize(1024, Jimp.AUTO);
      const mime = image.getMIME();
  let quality = 30;
      let buffer;
      if (mime === Jimp.MIME_JPEG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_JPEG);
      } else if (mime === Jimp.MIME_PNG) {
        buffer = await image.quality(quality).getBufferAsync(Jimp.MIME_PNG);
      } else {
        buffer = await image.getBufferAsync(mime);
      }
      await minioClient.putObject(bucketName, petImageFileName, buffer, buffer.length);
    }
    // LÆ°u chá»¯ kÃ½ (base64) lÃªn MinIO
    let signatureFileName = '';
    if (signature && minioClient) {
      const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) await minioClient.makeBucket(bucketName);
      signatureFileName = generateUniqueFileName(tenantId, 'pet_signature', 'signature.png');
      await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    }
    // LÆ°u thÃ´ng tin Ä‘Äƒng kÃ½ vÃ o MongoDB
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
    res.json({ success: true, message: 'Gá»­i cam káº¿t váº­t nuÃ´i thÃ nh cÃ´ng!', chungcuName, createdAt: requestData.created_at });
  } catch (error) {
    console.error('Error processing pets commitment register:', error);
    res.status(500).json({ error: 'CÃ³ lá»—i xáº£y ra khi xá»­ lÃ½ Ä‘Äƒng kÃ½ váº­t nuÃ´i' });
  }
});

// ÄÄƒng kÃ½ sá»­ dá»¥ng phÃ²ng sinh hoáº¡t cá»™ng Ä‘á»“ng
router.post('/api/community-room-register', upload.none(), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c tenant' });
  }
  try {
    const { fullName, phone, email, apartment, role, purpose, date, time, attendees, note, signature } = req.body;
    if (!fullName || !phone || !apartment || !role || !purpose || !date || !time || !attendees || !signature) {
      return res.status(400).json({ error: 'Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin báº¯t buá»™c.' });
    }
    // LÆ°u chá»¯ kÃ½ (base64) vÃ o MinIO náº¿u cÃ³
    let signatureFileName = '';
    if (signature && minioClient) {
      const signatureBuffer = Buffer.from(signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      signatureFileName = generateUniqueFileName(tenantId, 'community_signature', 'signature.png');
      const bucketName = 'community-room-register';
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) await minioClient.makeBucket(bucketName);
      await minioClient.putObject(bucketName, signatureFileName, signatureBuffer);
    }
    // LÆ°u thÃ´ng tin Ä‘Äƒng kÃ½ vÃ o MongoDB
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
    res.json({ success: true, message: 'ÄÄƒng kÃ½ sá»­ dá»¥ng phÃ²ng sinh hoáº¡t cá»™ng Ä‘á»“ng thÃ nh cÃ´ng!', chungcuName, createdAt: registrationData.created_at });
  } catch (error) {
    console.error('Error processing community room register:', error);
    res.status(500).json({ error: 'CÃ³ lá»—i xáº£y ra khi xá»­ lÃ½ Ä‘Äƒng kÃ½ phÃ²ng sinh hoáº¡t cá»™ng Ä‘á»“ng' });
  }
});

// API lÆ°u thÃ´ng tin Ä‘Äƒng kÃ½ cÆ° dÃ¢n
router.post('/api/resident-info-register', upload.none(), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c tenant' });
  }
  try {
    const { ownerName, apartment, phone, email, role } = req.body;
    // Láº¥y danh sÃ¡ch thÃ nh viÃªn (náº¿u cÃ³)
    let members = [];
    if (Array.isArray(req.body['memberName[]'])) {
      // Nhiá»u thÃ nh viÃªn
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
      // Má»™t thÃ nh viÃªn
      members.push({
        name: req.body['memberName[]'] || '',
        dob: req.body['memberDob[]'] || '',
        relation: req.body['memberRelation[]'] || '',
        id: req.body['memberId[]'] || ''
      });
    }
    // LÆ°u vÃ o MongoDB (DB riÃªng: resident_info)
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
    res.json({ success: true, message: 'ÄÄƒng kÃ½ thÃ´ng tin cÆ° dÃ¢n thÃ nh cÃ´ng!', chungcuName, createdAt: registrationData.created_at });
  } catch (error) {
    console.error('Error processing resident info register:', error);
    res.status(500).json({ error: 'CÃ³ lá»—i xáº£y ra khi xá»­ lÃ½ Ä‘Äƒng kÃ½ thÃ´ng tin cÆ° dÃ¢n' });
  }
});

// API xá»­ lÃ½ Ä‘Äƒng kÃ½ váº­n chuyá»ƒn hÃ ng hÃ³a vÃ o
router.post('/api/moving-service-register', express.json(), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c tenant' });
  }
  try {
    const { fullName, apartment, phone, email, role, movingType, moveDate, moveTime, goodsDesc, note } = req.body;
    if (!fullName || !apartment || !phone || !role || !movingType || !moveDate || !moveTime || !goodsDesc) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ thông tin bắt buộc.' });
    }
    // Lưu vào MongoDB (DB riêng: moving_service)
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
      apartment,
      phone,
      email,
      role,
      moving_type: movingType,
      move_date: moveDate,
      move_time: moveTime,
      goods_desc: goodsDesc,
      note,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    await client.db('moving_service').collection('moving_service_registers').insertOne(registrationData);
    await client.close();
    res.json({ success: true, message: 'Đăng ký vận chuyển thành công!', chungcuName, createdAt: registrationData.created_at });
  } catch (error) {
    console.error('Error processing moving service register:', error);
    res.status(500).json({ success: false, error: 'CÃ³ lá»—i xáº£y ra khi xá»­ lÃ½ Ä‘Äƒng kÃ½ váº­n chuyá»ƒn' });
  }
});

// API xá»­ lÃ½ Ä‘Äƒng kÃ½ thi cÃ´ng
router.post('/api/construction-register', upload.none(), async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c tenant' });
  }
  try {
    const { fullName, apartment, phone, email, role, constructionType, description, startDate, endDate, note } = req.body;
    if (!fullName || !apartment || !phone || !role || !constructionType || !description || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin báº¯t buá»™c.' });
    }
    // LÆ°u vÃ o MongoDB (DB riÃªng: construction_service)
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
      apartment,
      phone,
      email,
      role,
      construction_type: constructionType,
      description,
      start_date: startDate,
      end_date: endDate,
      note,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    await client.db('construction_service').collection('construction_registers').insertOne(registrationData);
    await client.close();
    res.json({ success: true, message: 'ÄÄƒng kÃ½ thi cÃ´ng thÃ nh cÃ´ng!', chungcuName, createdAt: registrationData.created_at });
  } catch (error) {
    console.error('Error processing construction register:', error);
    res.status(500).json({ success: false, error: 'CÃ³ lá»—i xáº£y ra khi xá»­ lÃ½ Ä‘Äƒng kÃ½ thi cÃ´ng' });
  }
});

router.get('/api/registration-lookup', async (req, res) => {
  console.log('Received registration lookup request with query:', req.query);
  const { phone, apartment } = req.query;
  if (!phone || !apartment) {
    return res.json({ success: false, error: 'Thiếu thông tin tra cứu', results: [] });
  }
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    let results = [];

    // Car registrations
    const carRegs = await client.db('car_registrations').collection('registrations').find({
      'personal_info.phone': phone,
      'personal_info.apartment': apartment
    }).toArray();
    results = results.concat(carRegs.map(r => ({
      service: 'Đăng ký thẻ xe',
      created_at: r.created_at ? r.created_at.toLocaleString('vi-VN') : '',
      status: r.status || '',
      note: r.note || '',
      apartment: r.personal_info?.apartment || '',
      phone: r.personal_info?.phone || '',
      fullName: r.personal_info?.full_name || '',
      email: r.personal_info?.email || '',
      role: r.personal_info?.role || '',
      licensePlate: r.vehicles?.[0]?.license_plate || '',
      vehicleType: r.vehicles?.[0]?.type || '',
      registrationDate: r.created_at ? r.created_at.toLocaleString('vi-VN') : ''
    })));

    // Car remake
    const carRemake = await client.db('car_registrations').collection('remake_requests').find({
      'personal_info.phone': phone,
      'personal_info.apartment': apartment
    }).toArray();
    results = results.concat(carRemake.map(r => ({
      service: 'Làm lại thẻ xe',
      created_at: r.created_at ? r.created_at.toLocaleString('vi-VN') : '',
      status: r.status || '',
      note: r.note || '',
      apartment: r.personal_info?.apartment || '',
      phone: r.personal_info?.phone || '',
      fullName: r.personal_info?.full_name || '',
      email: r.personal_info?.email || '',
      role: r.personal_info?.role || '',
      licensePlate: r.vehicles?.[0]?.license_plate || '',
      vehicleType: r.vehicles?.[0]?.type || '',
      registrationDate: r.created_at ? r.created_at.toLocaleString('vi-VN') : ''
    })));

    // Car cancel
    const carCancel = await client.db('car_registrations').collection('cancel_requests').find({
      'personal_info.phone': phone,
      'personal_info.apartment': apartment
    }).toArray();
    results = results.concat(carCancel.map(r => ({
      service: 'Hủy thẻ xe',
      created_at: r.created_at ? r.created_at.toLocaleString('vi-VN') : '',
      status: r.status || '',
      note: r.note || '',
      apartment: r.personal_info?.apartment || '',
      phone: r.personal_info?.phone || '',
      fullName: r.personal_info?.full_name || '',
      email: r.personal_info?.email || '',
      role: r.personal_info?.role || '',
      licensePlate: r.vehicles?.[0]?.license_plate || '',
      vehicleType: r.vehicles?.[0]?.type || '',
      registrationDate: r.created_at ? r.created_at.toLocaleString('vi-VN') : ''
    })));

    // Car update
    const carUpdate = await client.db('car_registrations').collection('update_requests').find({
      'personal_info.phone': phone,
      'personal_info.apartment': apartment
    }).toArray();
    results = results.concat(carUpdate.map(r => ({
      service: 'Thay đổi thông tin xe',
      created_at: r.created_at ? r.created_at.toLocaleString('vi-VN') : '',
      status: r.status || '',
      note: r.note || '',
      apartment: r.personal_info?.apartment || '',
      phone: r.personal_info?.phone || '',
      fullName: r.personal_info?.full_name || '',
      email: r.personal_info?.email || '',
      role: r.personal_info?.role || '',
      licensePlate: r.vehicles?.[0]?.license_plate || '',
      vehicleType: r.vehicles?.[0]?.type || '',
      registrationDate: r.created_at ? r.created_at.toLocaleString('vi-VN') : ''
    })));

    // Elevator card
    const elevatorRegs = await client.db('utility_card').collection('elevator_cards').find({
      phone,
      apartment
    }).toArray();
    results = results.concat(elevatorRegs.map(r => ({
      service: 'Đăng ký thẻ thang máy',
      created_at: r.created_at ? r.created_at.toLocaleString('vi-VN') : '',
      status: r.status || '',
      note: r.note || '',
      apartment: r.apartment || '',
      phone: r.phone || '',
      fullName: r.fullName || '',
      email: r.email || '',
      role: r.role || ''
    })));

    // Elevator cancel
    const elevatorCancel = await client.db('utility_card').collection('elevator_cancel_requests').find({
      phone,
      apartment
    }).toArray();
    results = results.concat(elevatorCancel.map(r => ({
      service: 'Hủy thẻ thang máy',
      created_at: r.created_at ? r.created_at.toLocaleString('vi-VN') : '',
      status: r.status || '',
      note: r.note || '',
      apartment: r.apartment || '',
      phone: r.phone || '',
      fullName: r.fullName || '',
      email: r.email || '',
      role: r.role || ''
    })));

    // Pool register
    const poolRegs = await client.db('utility_card').collection('pool_registers').find({
      phone,
      apartment
    }).toArray();
    results = results.concat(poolRegs.map(r => ({
      service: 'Đăng ký vòng bơi',
      created_at: r.created_at ? r.created_at.toLocaleString('vi-VN') : '',
      status: r.status || '',
      note: r.note || '',
      apartment: r.apartment || '',
      phone: r.phone || '',
      fullName: r.fullName || '',
      email: r.email || '',
      role: r.role || ''
    })));

    // Utility card (other types)
    const utilityCards = await client.db('utility_card').collection('utility_cards').find({
      phone,
      apartment
    }).toArray();
    results = results.concat(utilityCards.map(r => ({
      service: 'Đăng ký thẻ tiện ích',
      created_at: r.createdAt ? r.createdAt.toLocaleString('vi-VN') : '',
      status: r.status || '',
      note: r.note || '',
      apartment: r.apartment || '',
      phone: r.phone || '',
      fullName: r.fullName || '',
      email: r.email || '',
      role: r.role || '',
      cardType: r.cardType || ''
    })));

    // Advertising register
    const advertisingRegs = await client.db('utility_services').collection('advertising_registers').find({
      'personal_info.phone': phone,
      'personal_info.apartment': apartment
    }).toArray();
    results = results.concat(advertisingRegs.map(r => ({
      service: 'Đăng ký quảng cáo',
      created_at: r.created_at ? r.created_at.toLocaleString('vi-VN') : '',
      status: r.status || '',
      note: r.note || '',
      apartment: r.personal_info?.apartment || '',
      phone: r.personal_info?.phone || '',
      fullName: r.personal_info?.full_name || '',
      email: r.personal_info?.email || '',
      role: r.personal_info?.role || '',
      adType: r.ad_type || '',
      content: r.content || '',
      location: r.location || ''
    })));

    // Pets commitment register
    const petsRegs = await client.db('utility_services').collection('pets_commitment_register').find({
      'personal_info.phone': phone,
      'personal_info.apartment': apartment
    }).toArray();
    results = results.concat(petsRegs.map(r => ({
      service: 'Cam kết vật nuôi',
      created_at: r.created_at ? r.created_at.toLocaleString('vi-VN') : '',
      status: r.status || '',
      note: r.note || '',
      apartment: r.personal_info?.apartment || '',
      phone: r.personal_info?.phone || '',
      fullName: r.personal_info?.full_name || '',
      email: r.personal_info?.email || '',
      role: r.personal_info?.role || '',
      petType: r.pet_info?.pet_type || '',
      petQuantity: r.pet_info?.pet_quantity || '',
      petReason: r.pet_info?.pet_reason || ''
    })));

    // Community room register
    const communityRoomRegs = await client.db('utility_services').collection('community_room_registers').find({
      'personal_info.phone': phone,
      'personal_info.apartment': apartment
    }).toArray();
    results = results.concat(communityRoomRegs.map(r => ({
      service: 'Đăng ký phòng SHCĐ',
      created_at: r.created_at ? r.created_at.toLocaleString('vi-VN') : '',
      status: r.status || '',
      note: r.note || '',
      apartment: r.personal_info?.apartment || '',
      phone: r.personal_info?.phone || '',
      fullName: r.personal_info?.full_name || '',
      email: r.personal_info?.email || '',
      role: r.personal_info?.role || '',
      purpose: r.purpose || '',
      date: r.date || '',
      time: r.time || '',
      attendees: r.attendees || ''
    })));

    // Camera check request
    const cameraCheckRegs = await client.db('utility_services').collection('camera_check_requests').find({
      'personal_info.phone': phone,
      'personal_info.apartment': apartment
    }).toArray();
    results = results.concat(cameraCheckRegs.map(r => ({
      service: 'Yêu cầu kiểm tra camera',
      created_at: r.created_at ? r.created_at.toLocaleString('vi-VN') : '',
      status: r.status || '',
      note: r.note || '',
      apartment: r.personal_info?.apartment || '',
      phone: r.personal_info?.phone || '',
      fullName: r.personal_info?.full_name || '',
      email: r.personal_info?.email || '',
      role: r.personal_info?.role || '',
      cameraLocation: r.camera_location || '',
      requestReason: r.request_reason || ''
    })));

    // Moving service register
    const movingRegs = await client.db('moving_service').collection('moving_service_registers').find({
      phone,
      apartment
    }).toArray();
    results = results.concat(movingRegs.map(r => ({
      service: 'Đăng ký vận chuyển',
      created_at: r.created_at ? r.created_at.toLocaleString('vi-VN') : '',
      status: r.status || '',
      note: r.note || '',
      apartment: r.apartment || '',
      phone: r.phone || '',
      fullName: r.full_name || '',
      email: r.email || '',
      role: r.role || '',
      movingType: r.moving_type || '',
      moveDate: r.move_date || '',
      moveTime: r.move_time || '',
      goodsDesc: r.goods_desc || ''
    })));

    // Construction register
    const constructionRegs = await client.db('construction_service').collection('construction_registers').find({
      phone,
      apartment
    }).toArray();
    results = results.concat(constructionRegs.map(r => ({
      service: 'Đăng ký thi công',
      created_at: r.created_at ? r.created_at.toLocaleString('vi-VN') : '',
      status: r.status || '',
      note: r.note || '',
      apartment: r.apartment || '',
      phone: r.phone || '',
      fullName: r.full_name || '',
      email: r.email || '',
      role: r.role || '',
      constructionType: r.construction_type || '',
      description: r.description || '',
      startDate: r.start_date || '',
      endDate: r.end_date || ''
    })));

    // Resident info
    const residentRegs = await client.db('resident_info').collection('resident_info_registers').find({
      'owner.phone': phone,
      'owner.apartment': apartment
    }).toArray();
    results = results.concat(residentRegs.map(r => ({
      service: 'Đăng ký thông tin cư dân',
      created_at: r.created_at ? r.created_at.toLocaleString('vi-VN') : '',
      status: r.status || '',
      note: r.note || '',
      resident_name: r.owner?.ownerName || '',
      resident_phone: r.owner?.phone || '',
      resident_apartment: r.owner?.apartment || ''
    })));

    await client.close();
    // Sort strictly by created_at (newest first), regardless of service type
    results.sort((a, b) => {
      // Parse created_at as timestamp (prefer ISO, fallback to 0)
      const parseDate = (val) => {
        if (!val) return 0;
        // If already a Date, return timestamp
        if (val instanceof Date) return val.getTime();
        // If string, try parse (handle dd/mm/yyyy, dd-mm-yyyy, and ISO)
        // Try ISO first
        let d = new Date(val);
        if (!isNaN(d.getTime())) return d.getTime();
        // Try dd/mm/yyyy hh:mm:ss
        if (typeof val === 'string') {
          const parts = val.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[ ,T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
          if (parts) {
            const day = parseInt(parts[1], 10);
            const month = parseInt(parts[2], 10) - 1;
            const year = parseInt(parts[3], 10);
            const hour = parseInt(parts[4] || '0', 10);
            const min = parseInt(parts[5] || '0', 10);
            const sec = parseInt(parts[6] || '0', 10);
            d = new Date(year, month, day, hour, min, sec);
            if (!isNaN(d.getTime())) return d.getTime();
          }
        }
        return 0;
      };
      return parseDate(b.created_at) - parseDate(a.created_at);
    });
    res.json({ success: true, results });
  } catch (err) {
    console.error('Error in registration lookup:', err);
    res.json({ success: false, error: 'Lỗi tra cứu', results: [] });
  }
});




// API tá»•ng há»£p danh sÃ¡ch Ä‘Äƒng kÃ½ dá»‹ch vá»¥ cho tenant-dashboard (láº¥y táº¥t cáº£ collection liÃªn quan)
router.get('/tenant/api/registrations', async (req, res) => {
  const tenantId = req.tenant_id;
  if (!tenantId) return res.json([]);
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    // Car registrations
    const carRegs = await client.db('car_registrations').collection('registrations').find({ tenant_id: tenantId }).toArray();
    const carRemake = await client.db('car_registrations').collection('remake_requests').find({ tenant_id: tenantId }).toArray();
    const carCancel = await client.db('car_registrations').collection('cancel_requests').find({ tenant_id: tenantId }).toArray();
    const carUpdate = await client.db('car_registrations').collection('update_requests').find({ tenant_id: tenantId }).toArray();
    // Utility card
    const utilityCards = await client.db('utility_card').collection('utility_cards').find({ apartment: { $exists: true }, fullName: { $exists: true } }).toArray();
    const elevatorCards = await client.db('utility_card').collection('elevator_cards').find({ tenant_id: tenantId }).toArray();
    const elevatorCancel = await client.db('utility_card').collection('elevator_cancel_requests').find({ tenant_id: tenantId }).toArray();
    const poolRegisters = await client.db('utility_card').collection('pool_registers').find({ tenant_id: tenantId }).toArray();
    // Utility services
    const advertisingRegs = await client.db('utility_services').collection('advertising_registers').find({ tenant_id: tenantId }).toArray();
    const petsRegs = await client.db('utility_services').collection('pets_commitment_register').find({ tenant_id: tenantId }).toArray();
    const communityRoomRegs = await client.db('utility_services').collection('community_room_registers').find({ tenant_id: tenantId }).toArray();
    const cameraCheckRegs = await client.db('utility_services').collection('camera_check_requests').find({ tenant_id: tenantId }).toArray();
    // Moving service
    const movingRegs = await client.db('moving_service').collection('moving_service_registers').find({ tenant_id: tenantId }).toArray();
    // Construction
    const constructionRegs = await client.db('construction_service').collection('construction_registers').find({ tenant_id: tenantId }).toArray();
    // Resident info
    const residentRegs = await client.db('resident_info').collection('resident_info_registers').find({ tenant_id: tenantId }).toArray();
    // Gá»™p vÃ  chuáº©n hÃ³a dá»¯ liá»‡u
    const all = [
      ...carRegs.map(r => ({ ...r, service_name: 'Tháº» Xe', registration_type: 'ÄÄƒng kÃ½', file_url: (r.cccd_files && r.cccd_files[0]) ? `/minio/car-registrations/${r.cccd_files[0]}` : '' })),
      ...carRemake.map(r => ({ ...r, service_name: 'Tháº» Xe', registration_type: 'LÃ m láº¡i tháº»', file_url: (r.cccd_files && r.cccd_files[0]) ? `/minio/car-registrations/${r.cccd_files[0]}` : '' })),
      ...carCancel.map(r => ({ ...r, service_name: 'Tháº» Xe', registration_type: 'Há»§y tháº»', file_url: (r.cccd_files && r.cccd_files[0]) ? `/minio/car-cancel/${r.cccd_files[0]}` : '' })),
      ...carUpdate.map(r => ({ ...r, service_name: 'Tháº» Xe', registration_type: 'Thay Ä‘á»•i thÃ´ng tin', file_url: (r.cccd_files && r.cccd_files[0]) ? `/minio/car-update/${r.cccd_files[0]}` : '' })),
      ...utilityCards.filter(r => r.fullName && r.apartment).map(r => ({ ...r, service_name: 'Tháº» Tiá»‡n Ãch', registration_type: r.cardType || '', file_url: '' })),
      ...elevatorCards.map(r => ({ ...r, service_name: 'Tháº» Thang MÃ¡y', registration_type: 'ÄÄƒng kÃ½', file_url: (r.cccd_files && r.cccd_files[0]) ? `/minio/elevator-cards/${r.cccd_files[0]}` : '' })),
      ...elevatorCancel.map(r => ({ ...r, service_name: 'Tháº» Thang MÃ¡y', registration_type: 'Há»§y tháº»', file_url: (r.cccd_files && r.cccd_files[0]) ? `/minio/elevator-cancel/${r.cccd_files[0]}` : '' })),
      ...poolRegisters.map(r => ({ ...r, service_name: 'VÃ²ng BÆ¡i', registration_type: 'ÄÄƒng kÃ½', file_url: (r.cccd_files && r.cccd_files[0]) ? `/minio/pool-registers/${r.cccd_files[0]}` : '' })),
      ...advertisingRegs.map(r => ({ ...r, service_name: 'Quáº£ng CÃ¡o', registration_type: r.ad_type || '', file_url: '' })),
      ...petsRegs.map(r => ({ ...r, service_name: 'Váº­t NuÃ´i', registration_type: 'Cam káº¿t', file_url: r.pet_info?.pet_image ? `/minio/pets-commitment-register/${r.pet_info.pet_image}` : '' })),
      ...communityRoomRegs.map(r => ({ ...r, service_name: 'PhÃ²ng SHCÄ', registration_type: 'ÄÄƒng kÃ½', file_url: '' })),
      ...cameraCheckRegs.map(r => ({ ...r, service_name: 'Kiá»ƒm Tra Camera', registration_type: 'YÃªu cáº§u', file_url: '' })),
      ...movingRegs.map(r => ({ ...r, service_name: 'Váº­n Chuyá»ƒn', registration_type: 'ÄÄƒng kÃ½', file_url: '' })),
      ...constructionRegs.map(r => ({ ...r, service_name: 'Thi CÃ´ng Nháº¹', registration_type: r.construction_type || '', file_url: '' })),
      ...residentRegs.map(r => ({ ...r, service_name: 'ThÃ´ng Tin CÆ° DÃ¢n', registration_type: 'Cáº­p nháº­t', file_url: '' }))
    ];
    res.json(all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (err) {
    res.json([]);
  } finally {
    await client.close();
  }
});



module.exports = router;
