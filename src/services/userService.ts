import { IUser, IUserCreateInput, IUserUpdateInput, IUserListQuery, IUserListResponse } from '../types/user';
import { UserRole, UserStatus, AccountType } from '../enums/userEnums';
import { logger } from '../config/logger';
import { AppError } from '../middlewares/errorMiddleware';
import { ERROR_MESSAGES } from '../constants/messages';
import { HTTP_STATUS } from '../constants/status';

export class UserService {
  async createUser(userData: IUserCreateInput): Promise<IUser> {
    try {
      // Check if user already exists
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        throw new AppError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT, 'EMAIL_EXISTS');
      }

      const { User } = require('../models/userModel');
      const user = new User(userData);
      await user.save();

      logger.info(`User created: ${userData.email}`);
      return user;
    } catch (error) {
      logger.error('Create user failed:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<IUser | null> {
    try {
      const { User } = require('../models/userModel');
      return User.findOne({ _id: id, status: { $ne: UserStatus.DELETED } });
    } catch (error) {
      logger.error('Get user by ID failed:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    try {
      const { User } = require('../models/userModel');
      return User.findOne({ email, status: { $ne: UserStatus.DELETED } });
    } catch (error) {
      logger.error('Get user by email failed:', error);
      throw error;
    }
  }

  async updateUser(id: string, updateData: IUserUpdateInput): Promise<IUser> {
    try {
      const { User } = require('../models/userModel');
      const user = await User.findOne({ _id: id, status: { $ne: UserStatus.DELETED } });
      
      if (!user) {
        throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
      }

      Object.assign(user, updateData);
      await user.save();

      logger.info(`User updated: ${user.email}`);
      return user;
    } catch (error) {
      logger.error('Update user failed:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const { User } = require('../models/userModel');
      const user = await User.findOne({ _id: id, status: { $ne: UserStatus.DELETED } });
      
      if (!user) {
        throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
      }

      // Soft delete
      user.status = UserStatus.DELETED;
      user.deletedAt = new Date();
      user.emailVerified = false;
      user.refreshTokens = [];
      await user.save();

      logger.info(`User deleted: ${user.email}`);
    } catch (error) {
      logger.error('Delete user failed:', error);
      throw error;
    }
  }

  async listUsers(query: IUserListQuery): Promise<IUserListResponse> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        role,
        status,
        accountType,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        createdAfter,
        createdBefore,
        lastActiveAfter,
        lastActiveBefore,
      } = query;

      const { User } = require('../models/userModel');
      
      // Build filter
      const filter: any = { status: { $ne: UserStatus.DELETED } };

      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      if (role) filter.role = role;
      if (status) filter.status = status;
      if (accountType) filter.accountType = accountType;

      if (createdAfter || createdBefore) {
        filter.createdAt = {};
        if (createdAfter) filter.createdAt.$gte = new Date(createdAfter);
        if (createdBefore) filter.createdAt.$lte = new Date(createdBefore);
      }

      if (lastActiveAfter || lastActiveBefore) {
        filter.lastActiveAt = {};
        if (lastActiveAfter) filter.lastActiveAt.$gte = new Date(lastActiveAfter);
        if (lastActiveBefore) filter.lastActiveAt.$lte = new Date(lastActiveBefore);
      }

      // Build sort
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        User.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .select('-password -refreshTokens -twoFactorSecret'),
        User.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        users,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    } catch (error) {
      logger.error('List users failed:', error);
      throw error;
    }
  }

  async updateUserRole(id: string, role: UserRole): Promise<IUser> {
    try {
      const { User } = require('../models/userModel');
      const user = await User.findOne({ _id: id, status: { $ne: UserStatus.DELETED } });
      
      if (!user) {
        throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
      }

      user.role = role;
      await user.save();

      logger.info(`User role updated: ${user.email} -> ${role}`);
      return user;
    } catch (error) {
      logger.error('Update user role failed:', error);
      throw error;
    }
  }

  async updateUserStatus(id: string, status: UserStatus): Promise<IUser> {
    try {
      const { User } = require('../models/userModel');
      const user = await User.findOne({ _id: id, status: { $ne: UserStatus.DELETED } });
      
      if (!user) {
        throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
      }

      const previousStatus = user.status;
      user.status = status;

      // If deactivating, clear refresh tokens
      if (status === UserStatus.INACTIVE || status === UserStatus.SUSPENDED) {
        user.refreshTokens = [];
      }

      await user.save();

      logger.info(`User status updated: ${user.email} ${previousStatus} -> ${status}`);
      return user;
    } catch (error) {
      logger.error('Update user status failed:', error);
      throw error;
    }
  }

  async searchUsers(query: string, filters?: any): Promise<IUser[]> {
    try {
      const { User } = require('../models/userModel');
      
      const searchFilter: any = {
        status: { $ne: UserStatus.DELETED },
        $or: [
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { bio: { $regex: query, $options: 'i' } },
          { headline: { $regex: query, $options: 'i' } },
        ],
      };

      if (filters) {
        if (filters.role) searchFilter.role = filters.role;
        if (filters.status) searchFilter.status = filters.status;
        if (filters.accountType) searchFilter.accountType = filters.accountType;
        if (filters.location) searchFilter.location = { $regex: filters.location, $options: 'i' };
        if (filters.company) searchFilter.company = { $regex: filters.company, $options: 'i' };
      }

      const users = await User.find(searchFilter)
        .select('-password -refreshTokens -twoFactorSecret')
        .limit(50);

      return users;
    } catch (error) {
      logger.error('Search users failed:', error);
      throw error;
    }
  }

  async getUserStats(userId?: string): Promise<any> {
    try {
      const { User } = require('../models/userModel');
      
      const baseFilter = { status: { $ne: UserStatus.DELETED } };
      const filter = userId ? { ...baseFilter, _id: userId } : baseFilter;

      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        suspendedUsers,
        pendingUsers,
        emailVerifiedUsers,
        twoFactorEnabledUsers,
      ] = await Promise.all([
        User.countDocuments(filter),
        User.countDocuments({ ...filter, status: UserStatus.ACTIVE }),
        User.countDocuments({ ...filter, status: UserStatus.INACTIVE }),
        User.countDocuments({ ...filter, status: UserStatus.SUSPENDED }),
        User.countDocuments({ ...filter, status: UserStatus.PENDING }),
        User.countDocuments({ ...filter, emailVerified: true }),
        User.countDocuments({ ...filter, twoFactorEnabled: true }),
      ]);

      return {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        suspended: suspendedUsers,
        pending: pendingUsers,
        emailVerified: emailVerifiedUsers,
        twoFactorEnabled: twoFactorEnabledUsers,
        verificationRate: totalUsers > 0 ? (emailVerifiedUsers / totalUsers) * 100 : 0,
        twoFactorRate: totalUsers > 0 ? (twoFactorEnabledUsers / totalUsers) * 100 : 0,
      };
    } catch (error) {
      logger.error('Get user stats failed:', error);
      throw error;
    }
  }

  async bulkUserOperation(userIds: string[], operation: string, reason?: string): Promise<{ successful: string[]; failed: Array<{ id: string; error: string }> }> {
    try {
      const { User } = require('../models/userModel');
      
      const successful: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];

      for (const userId of userIds) {
        try {
          const user = await User.findOne({ _id: userId, status: { $ne: UserStatus.DELETED } });
          
          if (!user) {
            failed.push({ id: userId, error: 'User not found' });
            continue;
          }

          switch (operation) {
            case 'activate':
              user.status = UserStatus.ACTIVE;
              break;
            case 'deactivate':
              user.status = UserStatus.INACTIVE;
              user.refreshTokens = [];
              break;
            case 'suspend':
              user.status = UserStatus.SUSPENDED;
              user.refreshTokens = [];
              break;
            case 'delete':
              user.status = UserStatus.DELETED;
              user.deletedAt = new Date();
              user.refreshTokens = [];
              break;
            case 'verify':
              user.emailVerified = true;
              break;
            case 'unverify':
              user.emailVerified = false;
              break;
            default:
              failed.push({ id: userId, error: 'Invalid operation' });
              continue;
          }

          await user.save();
          successful.push(userId);
          
          logger.info(`Bulk operation "${operation}" completed for user: ${user.email}`);
        } catch (error) {
          failed.push({ id: userId, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      return { successful, failed };
    } catch (error) {
      logger.error('Bulk user operation failed:', error);
      throw error;
    }
  }

  async getUserActivity(userId: string, options: any = {}): Promise<any> {
    try {
      // This would integrate with an activity logging system
      // For now, returning a placeholder
      return {
        userId,
        activities: [],
        total: 0,
        page: options.page || 1,
        limit: options.limit || 20,
      };
    } catch (error) {
      logger.error('Get user activity failed:', error);
      throw error;
    }
  }

  async exportUsers(format: string = 'csv', filters?: any): Promise<Buffer> {
    try {
      const { User } = require('../models/userModel');
      
      const filter: any = { status: { $ne: UserStatus.DELETED } };
      
      if (filters) {
        if (filters.role) filter.role = filters.role;
        if (filters.status) filter.status = filters.status;
        if (filters.accountType) filter.accountType = filters.accountType;
        if (filters.createdAfter) filter.createdAt = { $gte: new Date(filters.createdAfter) };
        if (filters.createdBefore) filter.createdAt = { $lte: new Date(filters.createdBefore) };
      }

      const users = await User.find(filter)
        .select('-password -refreshTokens -twoFactorSecret -passwordResetToken -emailVerificationToken')
        .lean();

      // Convert to CSV/Excel/JSON based on format
      // This is a simplified implementation
      const csvHeader = 'ID,First Name,Last Name,Email,Role,Status,Account Type,Created At\n';
      const csvData = users.map((user: any) => 
        `${user._id},${user.firstName},${user.lastName},${user.email},${user.role},${user.status},${user.accountType},${user.createdAt}`
      ).join('\n');

      return Buffer.from(csvHeader + csvData, 'utf-8');
    } catch (error) {
      logger.error('Export users failed:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
