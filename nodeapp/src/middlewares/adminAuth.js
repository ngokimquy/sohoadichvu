const basicAuth = require('basic-auth');

const ADMIN_USER = 'ngokimquy';
const ADMIN_PASS = 'vienspkT1!';

function adminAuth(req, res, next) {
  const user = basicAuth(req);
  if (!user || user.name !== ADMIN_USER || user.pass !== ADMIN_PASS) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication required.');
  }
  next();
}

module.exports = { adminAuth };
