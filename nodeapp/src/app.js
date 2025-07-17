const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const app = express();
const { tenantMiddleware } = require('./middlewares/tenant');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const khoiTaoThongSo = require('./utils/khoitaothongso');
const tenantRoutes = require('./routes/tenant');

app.use(express.json());
app.use(cookieParser());
app.use(session({ secret: 'your-secret', resave: false, saveUninitialized: true }));
app.use(tenantMiddleware);

app.use('/', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/khoitaothongso', khoiTaoThongSo);
app.use('/tenant', tenantRoutes);

module.exports = app;
