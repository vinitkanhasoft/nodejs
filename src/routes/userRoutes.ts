import { Router } from 'express';
import { userController } from '../controllers/userController';
import { validateBody, validateParams, validateQuery } from '../middlewares/validationMiddleware';
import { authenticateToken, requireRole, requirePermission } from '../middlewares/authMiddleware';
import { 
  createUserSchema, 
  updateUserSchema, 
  userListQuerySchema, 
  userIdParamSchema,
  bulkUserOperationSchema,
  userSearchSchema
} from '../validators/userValidator';
import { uploadSingle } from '../middlewares/uploadMiddleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// User search (public for authenticated users)
router.get('/search', validateQuery(userSearchSchema), userController.searchUsers);

// User management routes
router.get('/', requirePermission('read:all'), validateQuery(userListQuerySchema), userController.listUsers);
router.post('/', requirePermission('write:all'), validateBody(createUserSchema), userController.createUser);
router.get('/:id', validateParams(userIdParamSchema), userController.getUserById);
router.put('/:id', validateParams(userIdParamSchema), validateBody(updateUserSchema), userController.updateUser);
router.delete('/:id', requirePermission('delete:all'), validateParams(userIdParamSchema), userController.deleteUser);

// Role and status management (admin only)
router.put('/:id/role', requireRole('admin'), validateParams(userIdParamSchema), userController.updateUserRole);
router.put('/:id/status', requireRole('admin'), validateParams(userIdParamSchema), userController.updateUserStatus);

// Bulk operations (admin only)
router.post('/bulk', requireRole('admin'), validateBody(bulkUserOperationSchema), userController.bulkUserOperation);

// User statistics and analytics
router.get('/:id/stats', validateParams(userIdParamSchema), userController.getUserStats);
router.get('/:id/activity', validateParams(userIdParamSchema), userController.getUserActivity);

// Export users (admin only)
router.get('/export/csv', requireRole('admin'), userController.exportUsers);

// File uploads
router.post('/avatar', uploadSingle('avatar'), userController.uploadAvatar);
router.post('/banner', uploadSingle('banner'), userController.uploadBanner);

// Social features
router.post('/:id/follow', validateParams(userIdParamSchema), userController.followUser);
router.delete('/:id/follow', validateParams(userIdParamSchema), userController.unfollowUser);
router.get('/:id/followers', validateParams(userIdParamSchema), userController.getFollowers);
router.get('/:id/following', validateParams(userIdParamSchema), userController.getFollowing);

// Blocking functionality
router.post('/:id/block', validateParams(userIdParamSchema), userController.blockUser);
router.delete('/:id/block', validateParams(userIdParamSchema), userController.unblockUser);
router.get('/blocked/list', userController.getBlockedUsers);

// Reporting
router.post('/:id/report', validateParams(userIdParamSchema), userController.reportUser);

export { router as userRoutes };
