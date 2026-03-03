import { Request, Response } from 'express';
import { userService } from '../services/userService';
import { cloudService } from '../services/cloudService';
import { notificationService } from '../services/notificationService';
import { IAuthenticatedRequest } from '../types/auth';
import { asyncHandler } from '../middlewares/errorMiddleware';
import { HTTP_STATUS } from '../constants/status';
import { SUCCESS_MESSAGES } from '../constants/messages';
import { logger } from '../config/logger';

export class UserController {
  createUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = await userService.createUser(req.body);
    
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: SUCCESS_MESSAGES.USER_CREATED,
      data: user.toSafeObject(),
      statusCode: HTTP_STATUS.CREATED,
      timestamp: new Date().toISOString(),
    });
  });

  getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    
    const user = await userService.getUserById(id);
    if (!user) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found',
        statusCode: HTTP_STATUS.NOT_FOUND,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User retrieved successfully',
      data: user.toSafeObject(),
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  updateUser = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const currentUserId = req.user!.id;
    const currentUserRole = req.user!.role;
    
    // Check if user is updating their own profile or is admin
    if (id !== currentUserId && currentUserRole !== 'admin') {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Access denied',
        statusCode: HTTP_STATUS.FORBIDDEN,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const updatedUser = await userService.updateUser(id, req.body);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.USER_UPDATED,
      data: updatedUser.toSafeObject(),
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    
    await userService.deleteUser(id);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.USER_DELETED,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  listUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await userService.listUsers(req.query);
    
    // Transform user data to safe objects
    const safeUsers = result.users.map(user => user.toSafeObject());
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        ...result,
        users: safeUsers,
      },
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  searchUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { query, ...filters } = req.query;
    
    if (!query || typeof query !== 'string') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Search query is required',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const users = await userService.searchUsers(query, filters);
    const safeUsers = users.map(user => user.toSafeObject());
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Users search completed',
      data: safeUsers,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  updateUserRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { role } = req.body;
    
    const updatedUser = await userService.updateUserRole(id, role);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User role updated successfully',
      data: updatedUser.toSafeObject(),
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  updateUserStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;
    
    const updatedUser = await userService.updateUserStatus(id, status);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User status updated successfully',
      data: updatedUser.toSafeObject(),
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  bulkUserOperation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userIds, action, reason } = req.body;
    
    const result = await userService.bulkUserOperation(userIds, action, reason);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Bulk operation completed: ${result.successful} successful, ${result.failed.length} failed`,
      data: result,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  getUserStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    
    const stats = await userService.getUserStats(userId);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: stats,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  getUserActivity = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const options = req.query;
    
    const activity = await userService.getUserActivity(userId, options);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User activity retrieved successfully',
      data: activity,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  exportUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { format = 'csv', ...filters } = req.query;
    
    const buffer = await userService.exportUsers(format as string, filters);
    
    const contentType = format === 'csv' ? 'text/csv' : 
                       format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
                       'application/json';
    
    const filename = `users_export.${format}`;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  });

  uploadAvatar = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    
    if (!req.file) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'No file uploaded',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Upload to cloud storage
    const cloudFile = await cloudService.uploadAvatar(req.file.buffer, userId);
    
    // Update user avatar in database
    const { userService } = require('../services/userService');
    const updatedUser = await userService.updateUser(userId, { avatar: cloudFile.secure_url });
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.FILE_UPLOADED,
      data: {
        avatar: cloudFile.secure_url,
        user: updatedUser.toSafeObject(),
      },
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  uploadBanner = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    
    if (!req.file) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'No file uploaded',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Upload to cloud storage
    const cloudFile = await cloudService.uploadBanner(req.file.buffer, userId);
    
    // Update user banner in database
    const { userService } = require('../services/userService');
    const updatedUser = await userService.updateUser(userId, { 
      // Add banner field to user model if needed
      // banner: cloudFile.secure_url 
    });
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.FILE_UPLOADED,
      data: {
        banner: cloudFile.secure_url,
        user: updatedUser.toSafeObject(),
      },
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  followUser = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const currentUserId = req.user!.id;
    const { userId } = req.params;
    
    if (currentUserId === userId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'You cannot follow yourself',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // This would implement follow logic
    // For now, returning a placeholder response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User followed successfully',
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  unfollowUser = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const currentUserId = req.user!.id;
    const { userId } = req.params;
    
    // This would implement unfollow logic
    // For now, returning a placeholder response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User unfollowed successfully',
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  getFollowers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // This would return followers list
    // For now, returning a placeholder response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Followers retrieved successfully',
      data: {
        followers: [],
        total: 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: 0,
      },
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  getFollowing = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // This would return following list
    // For now, returning a placeholder response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Following retrieved successfully',
      data: {
        following: [],
        total: 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: 0,
      },
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  blockUser = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const currentUserId = req.user!.id;
    const { userId } = req.params;
    
    // This would implement block logic
    // For now, returning a placeholder response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User blocked successfully',
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  unblockUser = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const currentUserId = req.user!.id;
    const { userId } = req.params;
    
    // This would implement unblock logic
    // For now, returning a placeholder response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User unblocked successfully',
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  getBlockedUsers = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;
    
    // This would return blocked users list
    // For now, returning a placeholder response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Blocked users retrieved successfully',
      data: {
        blockedUsers: [],
        total: 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: 0,
      },
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  reportUser = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const currentUserId = req.user!.id;
    const { userId } = req.params;
    const { reason, description } = req.body;
    
    // This would implement user reporting logic
    // For now, returning a placeholder response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User reported successfully',
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });
}

export const userController = new UserController();
