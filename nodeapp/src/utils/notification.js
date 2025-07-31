// Notification helper for sending real-time notifications to admin

/**
 * Send notification to admin when new registration is created
 * @param {Object} io - Socket.IO instance
 * @param {string} tenant_id - Tenant ID
 * @param {Object} registrationData - Registration data
 */
function sendNewRegistrationNotification(io, tenant_id, registrationData) {
  try {
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'new_registration',
      title: '🔔 Đăng ký mới!',
      message: `Có đăng ký ${registrationData.service_name} mới từ ${registrationData.user_name || registrationData.fullName || 'Cư dân'}`,
      data: {
        service_name: registrationData.service_name,
        user_name: registrationData.user_name || registrationData.fullName || registrationData.full_name,
        apartment: registrationData.apartment || registrationData.owner?.apartment,
        phone: registrationData.user_phone || registrationData.phone,
        registration_id: registrationData._id,
        created_at: registrationData.created_at || new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      read: false,
      priority: 'high'
    };

    // Send to specific tenant admin room
    io.to(`tenant-${tenant_id}`).emit('new-registration', notification);
    
    console.log(`📢 Notification sent to tenant ${tenant_id}:`, notification.message);
    
    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
}

/**
 * Send status update notification to admin
 * @param {Object} io - Socket.IO instance
 * @param {string} tenant_id - Tenant ID
 * @param {Object} updateData - Update data
 */
function sendStatusUpdateNotification(io, tenant_id, updateData) {
  try {
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'status_update',
      title: '📝 Cập nhật trạng thái',
      message: `Đăng ký ${updateData.service_name} đã được cập nhật thành "${updateData.status}"`,
      data: updateData,
      timestamp: new Date().toISOString(),
      read: false,
      priority: 'medium'
    };

    // Send to specific tenant admin room
    io.to(`tenant-${tenant_id}`).emit('status-update', notification);
    
    console.log(`📝 Status update notification sent to tenant ${tenant_id}:`, notification.message);
    
    return notification;
  } catch (error) {
    console.error('Error sending status update notification:', error);
    return null;
  }
}

/**
 * Send general notification to admin
 * @param {Object} io - Socket.IO instance
 * @param {string} tenant_id - Tenant ID
 * @param {Object} notificationData - Notification data
 */
function sendGeneralNotification(io, tenant_id, notificationData) {
  try {
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...notificationData,
      timestamp: new Date().toISOString(),
      read: false
    };

    // Send to specific tenant admin room
    io.to(`tenant-${tenant_id}`).emit('general-notification', notification);
    
    console.log(`📢 General notification sent to tenant ${tenant_id}:`, notification.message);
    
    return notification;
  } catch (error) {
    console.error('Error sending general notification:', error);
    return null;
  }
}

module.exports = {
  sendNewRegistrationNotification,
  sendStatusUpdateNotification,
  sendGeneralNotification
};
