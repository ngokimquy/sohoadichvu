const fs = require('fs');
const path = require('path');

// Script to add notifications to all API endpoints
function addNotificationsToApi() {
  const apiFilePath = path.join(__dirname, '../routes/api.js');
  let content = fs.readFileSync(apiFilePath, 'utf8');
  
  // Add notification code for elevator card register
  const elevatorCardRegex = /(await client\.db\('utility_card'\)\.collection\('elevator_cards'\)\.insertOne\(registrationData\);[\s\S]*?await client\.close\(\);)([\s\S]*?res\.json\(\{[^}]+\}\);)/;
  if (elevatorCardRegex.test(content) && !content.includes('elevator_card_register')) {
    content = content.replace(elevatorCardRegex, `$1
    
    // Send push notification to admin
    try {
      await sendNewRegistrationNotification(tenantId, {
        type: 'elevator_card_register',
        title: 'Đăng ký thẻ thang máy mới',
        message: \`\${fullName} đã đăng ký \${cardQuantity} thẻ thang máy\`,
        data: {
          phone: phone,
          apartment: apartment,
          cardQuantity: cardQuantity
        }
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
    }
    $2`);
  }
  
  // Add notification code for pool register
  const poolRegex = /(await client\.db\('utility_services'\)\.collection\('pool_registrations'\)\.insertOne\(registrationData\);[\s\S]*?await client\.close\(\);)([\s\S]*?res\.json\(\{[^}]+\}\);)/;
  if (poolRegex.test(content) && !content.includes('pool_register')) {
    content = content.replace(poolRegex, `$1
    
    // Send push notification to admin
    try {
      await sendNewRegistrationNotification(tenantId, {
        type: 'pool_register',
        title: 'Đăng ký sử dụng hồ bơi mới',
        message: \`\${fullName} đã đăng ký sử dụng hồ bơi\`,
        data: {
          phone: phone,
          apartment: apartment,
          memberCount: memberCount
        }
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
    }
    $2`);
  }
  
  // Add notification code for pets commitment
  const petsRegex = /(await client\.db\('utility_services'\)\.collection\('pets_commitments'\)\.insertOne\(registrationData\);[\s\S]*?await client\.close\(\);)([\s\S]*?res\.json\(\{[^}]+\}\);)/;
  if (petsRegex.test(content) && !content.includes('pets_commitment')) {
    content = content.replace(petsRegex, `$1
    
    // Send push notification to admin
    try {
      await sendNewRegistrationNotification(tenantId, {
        type: 'pets_commitment',
        title: 'Cam kết nuôi vật nuôi mới',
        message: \`\${fullName} đã đăng ký cam kết nuôi \${petType}\`,
        data: {
          phone: phone,
          apartment: apartment,
          petType: petType
        }
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
    }
    $2`);
  }
  
  // Add notification code for advertising register
  const adsRegex = /(await client\.db\('utility_services'\)\.collection\('advertising_registrations'\)\.insertOne\(registrationData\);[\s\S]*?await client\.close\(\);)([\s\S]*?res\.json\(\{[^}]+\}\);)/;
  if (adsRegex.test(content) && !content.includes('advertising_register')) {
    content = content.replace(adsRegex, `$1
    
    // Send push notification to admin
    try {
      await sendNewRegistrationNotification(tenantId, {
        type: 'advertising_register',
        title: 'Đăng ký quảng cáo mới',
        message: \`\${fullName} đã đăng ký quảng cáo tại \${location}\`,
        data: {
          phone: phone,
          apartment: apartment,
          location: location
        }
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
    }
    $2`);
  }
  
  // Add notification code for camera check request
  const cameraRegex = /(await client\.db\('utility_services'\)\.collection\('camera_check_requests'\)\.insertOne\(registrationData\);[\s\S]*?await client\.close\(\);)([\s\S]*?res\.json\(\{[^}]+\}\);)/;
  if (cameraRegex.test(content) && !content.includes('camera_check_request')) {
    content = content.replace(cameraRegex, `$1
    
    // Send push notification to admin
    try {
      await sendNewRegistrationNotification(tenantId, {
        type: 'camera_check_request',
        title: 'Yêu cầu kiểm tra camera mới',
        message: \`\${fullName} đã yêu cầu kiểm tra camera tại \${location}\`,
        data: {
          phone: phone,
          apartment: apartment,
          location: location
        }
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
    }
    $2`);
  }
  
  // Add notification code for community room register
  const communityRegex = /(await client\.db\('utility_services'\)\.collection\('community_room_registrations'\)\.insertOne\(registrationData\);[\s\S]*?await client\.close\(\);)([\s\S]*?res\.json\(\{[^}]+\}\);)/;
  if (communityRegex.test(content) && !content.includes('community_room_register')) {
    content = content.replace(communityRegex, `$1
    
    // Send push notification to admin
    try {
      await sendNewRegistrationNotification(tenantId, {
        type: 'community_room_register',
        title: 'Đăng ký phòng cộng đồng mới',
        message: \`\${fullName} đã đăng ký sử dụng phòng cộng đồng\`,
        data: {
          phone: phone,
          apartment: apartment,
          eventDate: eventDate
        }
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
    }
    $2`);
  }
  
  // Add notification code for resident info register
  const residentRegex = /(await client\.db\('utility_services'\)\.collection\('resident_info_registrations'\)\.insertOne\(registrationData\);[\s\S]*?await client\.close\(\);)([\s\S]*?res\.json\(\{[^}]+\}\);)/;
  if (residentRegex.test(content) && !content.includes('resident_info_register')) {
    content = content.replace(residentRegex, `$1
    
    // Send push notification to admin
    try {
      await sendNewRegistrationNotification(tenantId, {
        type: 'resident_info_register',
        title: 'Cập nhật thông tin cư dân mới',
        message: \`\${fullName} đã cập nhật thông tin cư dân\`,
        data: {
          phone: phone,
          apartment: apartment,
          memberCount: memberCount
        }
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
    }
    $2`);
  }
  
  // Add notification code for construction register
  const constructionRegex = /(await client\.db\('utility_services'\)\.collection\('construction_registrations'\)\.insertOne\(registrationData\);[\s\S]*?await client\.close\(\);)([\s\S]*?res\.json\(\{[^}]+\}\);)/;
  if (constructionRegex.test(content) && !content.includes('construction_register')) {
    content = content.replace(constructionRegex, `$1
    
    // Send push notification to admin
    try {
      await sendNewRegistrationNotification(tenantId, {
        type: 'construction_register',
        title: 'Đăng ký thi công mới',
        message: \`\${fullName} đã đăng ký thi công \${constructionType}\`,
        data: {
          phone: phone,
          apartment: apartment,
          constructionType: constructionType
        }
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
    }
    $2`);
  }
  
  // Write back to file
  fs.writeFileSync(apiFilePath, content, 'utf8');
  console.log('Added notifications to all API endpoints successfully!');
}

// Run the script
addNotificationsToApi();
