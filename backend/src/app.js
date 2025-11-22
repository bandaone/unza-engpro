const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/auth.js');
const userRoutes = require('./routes/user.routes.js');
const studentRoutes = require('./routes/student.routes.js');
const supervisorRoutes = require('./routes/supervisor.routes.js');
const projectRoutes = require('./routes/project.routes.js');
const groupRoutes = require('./routes/group.routes.js');
const allocationRoutes = require('./routes/allocation.routes.js');
const notificationRoutes = require('./routes/notification.routes.js');
const healthRoutes = require('./routes/health.routes.js');

const app = express();

// Simple health check (must be before other middleware)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Mount health check route first
app.use('/api', healthRoutes);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/supervisors', supervisorRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/notifications', notificationRoutes);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
