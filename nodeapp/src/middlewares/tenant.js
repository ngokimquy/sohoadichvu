// Middleware lấy tenant_id từ subdomain
function tenantMiddleware(req, res, next) {
  const host = req.headers.host || '';
  const parts = host.split('.');
  if (parts.length > 2) {
    req.tenant_id = parts.slice(0, parts.length - 2).join('.');
  } else {
    req.tenant_id = null;
  }
  next();
}

module.exports = { tenantMiddleware };
