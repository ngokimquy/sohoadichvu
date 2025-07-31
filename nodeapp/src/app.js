const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const app = express();
const { tenantMiddleware } = require('./middlewares/tenant');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const testApiRoutes = require('./routes/test-api');
const khoiTaoThongSo = require('./utils/khoitaothongso');
const tenantRoutes = require('./routes/tenant');
const path = require('path');

app.use(express.json());
app.use(cookieParser());
app.use(session({ secret: 'your-secret', resave: false, saveUninitialized: true }));
app.use(tenantMiddleware);

app.use('/static', express.static(path.join(__dirname, '..', 'static')));
app.use('/admin', adminRoutes);
app.use('/tenant', tenantRoutes);
app.use('/khoitaothongso', khoiTaoThongSo);
app.use('/', testApiRoutes);
app.use('/', apiRoutes);

module.exports = app;
