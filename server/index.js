const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');

dotenv.config();

// Import Routes
const authRoutes = require('./routes/auth');
const streamRoutes = require('./routes/streams');
const bidRoutes = require('./routes/bids');
const commentRoutes = require('./routes/comments');
const reactionRoutes = require('./routes/reactions');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const messageRoutes = require('./routes/messages');
const trendingRoutes = require('./routes/trending');
const paymentRoutes = require('./routes/payments');
const categoryRoutes = require('./routes/categories');
const variationRoutes = require('./routes/variations');
const shippingRoutes = require('./routes/shipping');
const adminRoutes = require('./routes/admin');
const analyticsService = require('./services/analyticsService');
const streamModerationRoutes = require('./routes/streamModeration');
const socialRoutes = require('./routes/social');
const trainingRoutes = require('./routes/training');
const sellerAnalyticsRoutes = require('./routes/sellerAnalytics');
const bulkOperationsRoutes = require('./routes/bulkOperations');


const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Make io available in controllers
app.set('io', io);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.log('MongoDB connection error:', err));

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/streams', streamRoutes);
app.use('/api/v1/bids', bidRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/reactions', reactionRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/trending', trendingRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', variationRoutes);
app.use('/api/v1/shipping', shippingRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/stream-moderation', streamModerationRoutes);
app.use('/api/v1/social', socialRoutes);
app.use('/api/v1/training', trainingRoutes);
app.use('/api/v1/seller-analytics', sellerAnalyticsRoutes);
app.use('/api/v1/bulk', bulkOperationsRoutes);


if (process.env.NODE_ENV === 'production') {
  analyticsService.startScheduledJobs();
}

process.on('SIGTERM', () => {
  analyticsService.stopScheduledJobs();
  process.exit(0);
});
// Socket.io connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User authentication
  socket.on('authenticate', (userId) => {
    socket.join(`user_${userId}`);
    socket.join('logged_in_users');
    console.log(`User ${userId} authenticated`);
  });

  // Stream rooms
  socket.on('join-stream', (streamId) => {
    socket.join(streamId);
    socket.join(`stream_${streamId}_viewers`);
    console.log(`User joined stream ${streamId}`);
    
    // Notify others about new viewer
    socket.to(streamId).emit('viewer-joined', {
      userId: socket.userId,
      timestamp: new Date()
    });
  });

  socket.on('leave-stream', (streamId) => {
    socket.leave(streamId);
    socket.leave(`stream_${streamId}_viewers`);
    console.log(`User left stream ${streamId}`);
  });

  // Moderation events
  socket.on('moderation-action', (data) => {
    const { streamId, action, targetUserId, reason } = data;
    
    // Broadcast to moderators and stream owner
    socket.to(`stream_${streamId}_moderators`).emit('moderation-update', {
      action,
      targetUserId,
      reason,
      moderatorId: socket.userId,
      timestamp: new Date()
    });
  });

  // Interactive features
  socket.on('poll-vote', (data) => {
    const { streamId, pollId, optionIndex } = data;
    
    // Broadcast vote to all viewers
    socket.to(streamId).emit('poll-vote-update', {
      pollId,
      optionIndex,
      voterId: socket.userId
    });
  });

  // Q&A events
  socket.on('question-submit', (data) => {
    const { streamId, question } = data;
    
    // Broadcast to stream owner and moderators
    socket.to(`stream_${streamId}_moderators`).emit('new-question', {
      question,
      userId: socket.userId,
      timestamp: new Date()
    });
  });

  socket.on('authenticate', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  socket.on('join-stream', (streamId) => {
    socket.join(streamId);
    console.log(`User ${socket.id} joined stream ${streamId}`);
  });

  socket.on('leave-stream', (streamId) => {
    socket.leave(streamId);
    console.log(`User ${socket.id} left stream ${streamId}`);
  });

  socket.on('new-comment', (data) => {
    socket.to(data.streamId).emit('comment-received', data);
  });

  socket.on('new-bid', (data) => {
    socket.to(data.streamId).emit('bid-received', data);
  });

  socket.on('new-reaction', (data) => {
    socket.to(data.streamId).emit('reaction-received', data);
  });

  socket.on('viewer-update', (data) => {
    socket.to(data.streamId).emit('viewer-updated', data);
  });

  socket.on('product-change', (data) => {
    socket.to(data.streamId).emit('product-changed', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
