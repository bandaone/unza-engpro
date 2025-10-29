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
const logbookRoutes = require('./routes/logbook.routes.js');
const notificationRoutes = require('./routes/notification.routes.js');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/supervisors', supervisorRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/logbook', logbookRoutes);
app.use('/api/notifications', notificationRoutes);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
