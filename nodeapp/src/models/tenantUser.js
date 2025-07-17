// Model schema cho tenant user (dùng cho MongoDB, không cần mongoose)
// Collection: tenant_users
// Các trường: username, name, email, tenant_id, status, created_at, updated_at

// Ví dụ sử dụng với native MongoDB driver

/**
 * Tenant User structure:
 * {
 *   _id: ObjectId,
 *   username: String,
 *   name: String,
 *   email: String,
 *   tenant_id: String, // mã tenant (chung cư)
 *   status: String, // 'active' | 'inactive' | 'locked'
 *   password: String, // hash hoặc plain (tạm thời)
 *   created_at: Date,
 *   updated_at: Date
 * }
 */

// Hàm tiện ích tạo user mới
function createTenantUser({ username, name, email, tenant_id, password, status = 'active' }) {
  return {
    username,
    name,
    email,
    tenant_id,
    password,
    status,
    created_at: new Date(),
    updated_at: new Date()
  };
}

module.exports = {
  createTenantUser
};
