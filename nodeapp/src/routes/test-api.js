const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

// Test API để debug file upload
router.post('/api/test-car-upload', upload.fields([
  { name: 'cccdFiles', maxCount: 10 },
  { name: 'cavetFiles', maxCount: 10 }
]), async (req, res) => {
  console.log('\n=== TEST CAR UPLOAD DEBUG ===');
  console.log('Request body keys:', Object.keys(req.body));
  console.log('Request files keys:', Object.keys(req.files || {}));
  
  const cccdFiles = req.files && req.files.cccdFiles ? req.files.cccdFiles : [];
  const cavetFiles = req.files && req.files.cavetFiles ? req.files.cavetFiles : [];
  
  console.log(`CCCD files count: ${cccdFiles.length}`);
  cccdFiles.forEach((file, index) => {
    console.log(`  CCCD File ${index + 1}:`, {
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    });
  });
  
  console.log(`Cavet files count: ${cavetFiles.length}`);
  cavetFiles.forEach((file, index) => {
    console.log(`  Cavet File ${index + 1}:`, {
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    });
  });
  
  console.log('Body data:');
  Object.keys(req.body).forEach(key => {
    if (key === 'signature') {
      console.log(`  ${key}: [signature data - ${req.body[key].length} chars]`);
    } else {
      console.log(`  ${key}:`, req.body[key]);
    }
  });
  
  console.log('=== END DEBUG ===\n');
  
  res.json({
    success: true,
    message: 'Test upload received successfully',
    debug: {
      cccdCount: cccdFiles.length,
      cavetCount: cavetFiles.length,
      bodyKeys: Object.keys(req.body),
      filesKeys: Object.keys(req.files || {})
    }
  });
});

module.exports = router;
