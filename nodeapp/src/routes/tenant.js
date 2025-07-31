const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
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

// Test page cho car upload debug
router.get('/test-car-upload', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/test-car-upload.html'));
});

// API trả về danh sách đăng ký dịch vụ của tenant hiện tại với pagination
router.get('/api/registrations', requireTenantLogin, async (req, res) => {
  try {
    console.log('API /api/registrations - tenant_id:', req.tenant_id); // debug
    
    // Lấy parameters cho pagination và filtering
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // 20 records per page
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const serviceType = req.query.serviceType || '';
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    const client = new MongoClient(mongoUri);
    await client.connect();
    
    // Lấy dữ liệu từ tất cả các collection và database
    const allRegistrations = [];
    let totalCount = 0;
    
    // Helper function để lấy dữ liệu từ collection với filter
    async function fetchFromCollection(dbName, collectionName, serviceName, bucketName) {
      try {
        // Build query filter
        let query = { tenant_id: req.tenant_id };
        
        // Add search filter
        if (search) {
          query.$or = [
            { user_name: { $regex: search, $options: 'i' } },
            { fullName: { $regex: search, $options: 'i' } },
            { full_name: { $regex: search, $options: 'i' } },
            { apartment: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { user_phone: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ];
        }
        
        // Add status filter
        if (status) {
          query.status = status;
        }
        
        // Count total records for this collection
        const count = await client
          .db(dbName)
          .collection(collectionName)
          .countDocuments(query);
        
        totalCount += count;
        
        // Get records with pagination
        const records = await client
          .db(dbName)
          .collection(collectionName)
          .find(query)
          .sort({ [sortBy]: sortOrder })
          .toArray(); // Get all first, then we'll sort globally
        
        records.forEach(r => {
          r.service_name = serviceName;
          r.bucket_name = bucketName;
          allRegistrations.push(r);
        });
      } catch (err) {
        console.error(`Error fetching from ${dbName}.${collectionName}:`, err);
      }
    }
    
    // Filter by service type if specified
    const servicesToFetch = [];
    
    if (!serviceType || serviceType === 'car') {
      servicesToFetch.push(
        ['car_registrations', 'registrations', 'Thẻ Xe - Đăng ký mới', 'car-registrations'],
        ['car_registrations', 'remake_requests', 'Thẻ Xe - Làm lại thẻ', 'car-registrations'],
        ['car_registrations', 'cancel_requests', 'Thẻ Xe - Hủy thẻ', 'car-cancel'],
        ['car_registrations', 'update_requests', 'Thẻ Xe - Cập nhật thông tin', 'car-update']
      );
    }
    
    if (!serviceType || serviceType === 'utility') {
      servicesToFetch.push(
        ['admin', 'utility_cards', 'Thẻ tiện ích', 'utility-cards'],
        ['utility_card', 'elevator_cards', 'Thẻ thang máy', 'elevator-cards'],
        ['utility_card', 'elevator_cancel_requests', 'Thẻ thang máy - Hủy', 'elevator-cancel'],
        ['utility_card', 'pool_registers', 'Thẻ hồ bơi', 'pool-registers']
      );
    }
    
    if (!serviceType || serviceType === 'services') {
      servicesToFetch.push(
        ['utility_services', 'advertising_registers', 'Đăng ký quảng cáo', 'advertising-register'],
        ['utility_services', 'camera_check_requests', 'Yêu cầu kiểm tra camera', 'camera-check-request'],
        ['utility_services', 'pets_commitment_register', 'Cam kết nuôi vật nuôi', 'pets-commitment-register'],
        ['utility_services', 'community_room_registers', 'Đăng ký phòng cộng đồng', 'community-room-register']
      );
    }
    
    if (!serviceType || serviceType === 'others') {
      servicesToFetch.push(
        ['resident_info', 'resident_info_registers', 'Đăng ký thông tin cư dân', 'resident-info'],
        ['moving_service', 'moving_service_registers', 'Dịch vụ vận chuyển', 'moving-service'],
        ['construction_service', 'construction_registers', 'Dịch vụ thi công', 'construction-service']
      );
    }
    
    // Fetch data from all relevant collections
    for (const [dbName, collectionName, serviceName, bucketName] of servicesToFetch) {
      await fetchFromCollection(dbName, collectionName, serviceName, bucketName);
    }
    
    await client.close();
    
    // Sort all records globally
    allRegistrations.sort((a, b) => {
      if (sortBy === 'created_at') {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return sortOrder === 1 ? dateA - dateB : dateB - dateA;
      }
      // Add other sorting options as needed
      return 0;
    });
    
    // Apply pagination to sorted results
    const paginatedResults = allRegistrations.slice(skip, skip + limit);
    
    console.log(`Tổng số bản ghi: ${allRegistrations.length}, Trang ${page}, Hiển thị: ${paginatedResults.length}`); // debug
    
    // Convert file names thành full URLs
    const result = paginatedResults.map(r => {
      const formattedReg = { ...r };
      
      // Convert các file fields thành full URLs
      const bucketName = formattedReg.bucket_name || 'general';
      
      // Helper function để convert file name thành URL
      const convertToUrl = (filename) => filename ? `/minio/${bucketName}/${filename}` : filename;
      
      // Convert tất cả các loại file fields có thể có
      if (formattedReg.cccd_files && Array.isArray(formattedReg.cccd_files)) {
        formattedReg.cccd_files = formattedReg.cccd_files.map(convertToUrl);
      }
      if (formattedReg.cavet_files && Array.isArray(formattedReg.cavet_files)) {
        formattedReg.cavet_files = formattedReg.cavet_files.map(convertToUrl);
      }
      if (formattedReg.files && Array.isArray(formattedReg.files)) {
        formattedReg.files = formattedReg.files.map(convertToUrl);
      }
      if (formattedReg.attachments && Array.isArray(formattedReg.attachments)) {
        formattedReg.attachments = formattedReg.attachments.map(convertToUrl);
      }
      if (formattedReg.documents && Array.isArray(formattedReg.documents)) {
        formattedReg.documents = formattedReg.documents.map(convertToUrl);
      }
      
      // Convert single file fields
      if (formattedReg.signature) {
        formattedReg.signature = convertToUrl(formattedReg.signature);
      }
      if (formattedReg.signature_file) {
        formattedReg.signature_file = convertToUrl(formattedReg.signature_file);
      }
      if (formattedReg.photo_file) {
        formattedReg.photo_file = convertToUrl(formattedReg.photo_file);
      }
      if (formattedReg.document_file) {
        formattedReg.document_file = convertToUrl(formattedReg.document_file);
      }
      if (formattedReg.pet_image) {
        formattedReg.pet_image = convertToUrl(formattedReg.pet_image);
      }
      
      // Handle nested file fields (như pet_info.pet_image)
      if (formattedReg.pet_info && formattedReg.pet_info.pet_image) {
        formattedReg.pet_info.pet_image = convertToUrl(formattedReg.pet_info.pet_image);
      }
      
      // Remove bucket_name khỏi response (chỉ dùng internal)
      delete formattedReg.bucket_name;
      
      return formattedReg;
    });
    
    // Return paginated response
    res.json({
      data: result,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(allRegistrations.length / limit),
        totalRecords: allRegistrations.length,
        recordsPerPage: limit,
        hasNextPage: page < Math.ceil(allRegistrations.length / limit),
        hasPrevPage: page > 1
      },
      filters: {
        search,
        status,
        serviceType,
        sortBy,
        sortOrder: sortOrder === 1 ? 'asc' : 'desc'
      }
    });
  } catch (err) {
    console.error('Lỗi API /api/registrations:', err); // debug
    res.status(500).json({ error: 'Lỗi truy vấn dữ liệu' });
  }
});

// API lấy thống kê tổng quan cho dashboard
router.get('/api/dashboard-stats', requireTenantLogin, async (req, res) => {
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      completed: 0,
      rejected: 0,
      today: 0,
      thisWeek: 0,
      byService: {}
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    // Helper function để đếm statistics từ collection
    async function countStats(dbName, collectionName, serviceName) {
      try {
        const query = { tenant_id: req.tenant_id };
        const total = await client.db(dbName).collection(collectionName).countDocuments(query);
        
        const pending = await client.db(dbName).collection(collectionName).countDocuments({
          ...query,
          $or: [{ status: 'pending' }, { status: { $exists: false } }]
        });
        
        const approved = await client.db(dbName).collection(collectionName).countDocuments({
          ...query,
          status: 'approved'
        });
        
        const completed = await client.db(dbName).collection(collectionName).countDocuments({
          ...query,
          status: 'completed'
        });
        
        const rejected = await client.db(dbName).collection(collectionName).countDocuments({
          ...query,
          status: 'rejected'
        });
        
        const todayCount = await client.db(dbName).collection(collectionName).countDocuments({
          ...query,
          created_at: { $gte: today }
        });
        
        const weekCount = await client.db(dbName).collection(collectionName).countDocuments({
          ...query,
          created_at: { $gte: weekAgo }
        });
        
        stats.total += total;
        stats.pending += pending;
        stats.approved += approved;
        stats.completed += completed;
        stats.rejected += rejected;
        stats.today += todayCount;
        stats.thisWeek += weekCount;
        stats.byService[serviceName] = {
          total,
          pending,
          approved,
          completed,
          rejected
        };
      } catch (err) {
        console.error(`Error counting stats from ${dbName}.${collectionName}:`, err);
      }
    }
    
    // Count from all collections
    await countStats('car_registrations', 'registrations', 'Thẻ Xe');
    await countStats('car_registrations', 'remake_requests', 'Thẻ Xe - Làm lại');
    await countStats('car_registrations', 'cancel_requests', 'Thẻ Xe - Hủy');
    await countStats('car_registrations', 'update_requests', 'Thẻ Xe - Cập nhật');
    await countStats('admin', 'utility_cards', 'Thẻ tiện ích');
    await countStats('utility_card', 'elevator_cards', 'Thẻ thang máy');
    await countStats('utility_card', 'pool_registers', 'Thẻ hồ bơi');
    await countStats('utility_services', 'advertising_registers', 'Đăng ký quảng cáo');
    await countStats('utility_services', 'camera_check_requests', 'Kiểm tra camera');
    await countStats('utility_services', 'pets_commitment_register', 'Cam kết vật nuôi');
    await countStats('utility_services', 'community_room_registers', 'Phòng cộng đồng');
    await countStats('resident_info', 'resident_info_registers', 'Thông tin cư dân');
    await countStats('moving_service', 'moving_service_registers', 'Vận chuyển');
    await countStats('construction_service', 'construction_registers', 'Thi công');
    
    await client.close();
    res.json(stats);
  } catch (err) {
    console.error('Lỗi API dashboard-stats:', err);
    res.status(500).json({ error: 'Lỗi truy vấn thống kê' });
  }
});

// API cập nhật trạng thái đăng ký
router.post('/api/update-status', requireTenantLogin, express.json(), async (req, res) => {
  try {
    const { id, status, service_name } = req.body;
    
    if (!id || !status || !service_name) {
      return res.status(400).json({ error: 'Thiếu thông tin cần thiết' });
    }

    console.log('Updating status:', { id, status, service_name }); // debug

    const client = new MongoClient(mongoUri);
    await client.connect();
    
    let dbName, collectionName;
    
    // Xác định database và collection dựa trên service_name
    switch (service_name) {
      case 'Thẻ Xe - Đăng ký mới':
        dbName = 'car_registrations';
        collectionName = 'registrations';
        break;
      case 'Thẻ Xe - Làm lại thẻ':
        dbName = 'car_registrations';
        collectionName = 'remake_requests';
        break;
      case 'Thẻ Xe - Hủy thẻ':
        dbName = 'car_registrations';
        collectionName = 'cancel_requests';
        break;
      case 'Thẻ Xe - Cập nhật thông tin':
        dbName = 'car_registrations';
        collectionName = 'update_requests';
        break;
      case 'Thẻ tiện ích':
        dbName = 'admin';
        collectionName = 'utility_cards';
        break;
      case 'Thẻ thang máy':
        dbName = 'utility_card';
        collectionName = 'elevator_cards';
        break;
      case 'Thẻ thang máy - Hủy':
        dbName = 'utility_card';
        collectionName = 'elevator_cancel_requests';
        break;
      case 'Thẻ hồ bơi':
        dbName = 'utility_card';
        collectionName = 'pool_registers';
        break;
      case 'Đăng ký quảng cáo':
        dbName = 'utility_services';
        collectionName = 'advertising_registers';
        break;
      case 'Yêu cầu kiểm tra camera':
        dbName = 'utility_services';
        collectionName = 'camera_check_requests';
        break;
      case 'Cam kết nuôi vật nuôi':
        dbName = 'utility_services';
        collectionName = 'pets_commitment_register';
        break;
      case 'Đăng ký phòng cộng đồng':
        dbName = 'utility_services';
        collectionName = 'community_room_registers';
        break;
      case 'Đăng ký thông tin cư dân':
        dbName = 'resident_info';
        collectionName = 'resident_info_registers';
        break;
      case 'Dịch vụ vận chuyển':
        dbName = 'moving_service';
        collectionName = 'moving_service_registers';
        break;
      case 'Dịch vụ thi công':
        dbName = 'construction_service';
        collectionName = 'construction_registers';
        break;
      default:
        await client.close();
        return res.status(400).json({ error: 'Loại dịch vụ không hợp lệ' });
    }

    // Cập nhật trạng thái
    const result = await client
      .db(dbName)
      .collection(collectionName)
      .updateOne(
        { _id: new ObjectId(id), tenant_id: req.tenant_id },
        { 
          $set: { 
            status: status,
            updated_at: new Date()
          }
        }
      );

    await client.close();

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bản ghi' });
    }

    if (result.modifiedCount === 0) {
      return res.json({ message: 'Trạng thái không thay đổi' });
    }

    res.json({ message: 'Cập nhật trạng thái thành công' });
  } catch (err) {
    console.error('Lỗi cập nhật trạng thái:', err);
    res.status(500).json({ error: 'Lỗi server' });
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
