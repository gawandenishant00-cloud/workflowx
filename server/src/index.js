require('dotenv').config();
const approvalRoutes = require('./modules/approvals/approvals.routes');
const notificationRoutes = require('./modules/notifications/notifications.routes');
const express = require('express');
const cors = require('cors');
const verifyToken = require('./middleware/verifyToken');
const hrRoutes = require('./modules/hr/hr.routes');
const procurementRoutes = require('./modules/procurement/procurement.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/approvals', approvalRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'WorkFlowX server is running' });
});

app.get('/me', verifyToken, (req, res) => {
  res.json({ message: 'You are authenticated!', user: req.user });
});

app.use('/api/hr', hrRoutes);
app.use('/api/procurement', procurementRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});