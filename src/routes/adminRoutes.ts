import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole('admin'));

// Dashboard and overview
router.get('/dashboard', adminController.getDashboardStats);
router.get('/system/health', adminController.getSystemHealth);
router.get('/system/logs', adminController.getSystemLogs);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.post('/users/:id/suspend', adminController.suspendUser);
router.post('/users/:id/unsuspend', adminController.unsuspendUser);
router.delete('/users/:id', adminController.deleteUserByAdmin);

// Analytics and reports
router.get('/analytics', adminController.getAnalyticsReport);
router.get('/analytics/realtime', adminController.getRealTimeAnalytics);
router.get('/analytics/export', adminController.exportAnalytics);

// Cron job management
router.get('/cron-jobs', adminController.getCronJobs);
router.post('/cron-jobs/:jobName/start', adminController.startCronJob);
router.post('/cron-jobs/:jobName/stop', adminController.stopCronJob);

// Email management
router.post('/emails/bulk', adminController.sendBulkEmail);
router.get('/emails/stats', adminController.getEmailStats);

// Cloud storage management
router.get('/cloud/stats', adminController.getCloudStorageStats);
router.post('/cloud/cleanup', adminController.cleanupCloudFiles);

// System settings
router.get('/settings', adminController.getSystemSettings);
router.put('/settings', adminController.updateSystemSettings);

export { router as adminRoutes };
