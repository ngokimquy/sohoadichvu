const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const { tenantMiddleware } = require('./middlewares/tenant');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const khoiTaoThongSo = require('./utils/khoitaothongso');

app.use(express.json());
app.use(cookieParser());
app.use(tenantMiddleware);

app.use('/', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/khoitaothongso', khoiTaoThongSo);

module.exports = app;
