import { z } from 'zod';
import { UserRole, UserStatus, AccountType } from '../enums/userEnums';

export const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, 
           'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional(),
  role: z.nativeEnum(UserRole).optional().default(UserRole.USER),
  accountType: z.nativeEnum(AccountType).optional().default(AccountType.PERSONAL),
  dateOfBirth: z.string().datetime('Invalid date format').optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  headline: z.string().max(100, 'Headline must be less than 100 characters').optional(),
  company: z.string().max(100, 'Company must be less than 100 characters').optional(),
  jobTitle: z.string().max(100, 'Job title must be less than 100 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  website: z.string().url('Invalid website URL').optional(),
  socialLinks: z.object({
    website: z.string().url('Invalid website URL').optional(),
    linkedin: z.string().url('Invalid LinkedIn URL').optional(),
    twitter: z.string().url('Invalid Twitter URL').optional(),
    facebook: z.string().url('Invalid Facebook URL').optional(),
    instagram: z.string().url('Invalid Instagram URL').optional(),
    github: z.string().url('Invalid GitHub URL').optional(),
  }).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters').optional(),
  phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  dateOfBirth: z.string().datetime('Invalid date format').optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  headline: z.string().max(100, 'Headline must be less than 100 characters').optional(),
  company: z.string().max(100, 'Company must be less than 100 characters').optional(),
  jobTitle: z.string().max(100, 'Job title must be less than 100 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  website: z.string().url('Invalid website URL').optional(),
  socialLinks: z.object({
    website: z.string().url('Invalid website URL').optional(),
    linkedin: z.string().url('Invalid LinkedIn URL').optional(),
    twitter: z.string().url('Invalid Twitter URL').optional(),
    facebook: z.string().url('Invalid Facebook URL').optional(),
    instagram: z.string().url('Invalid Instagram URL').optional(),
    github: z.string().url('Invalid GitHub URL').optional(),
  }).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole, { required_error: 'Role is required' }),
});

export const updateUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus, { required_error: 'Status is required' }),
});

export const userListQuerySchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').transform(Number).optional().default('10'),
  search: z.string().min(1, 'Search term must be at least 1 character').max(100, 'Search term must be less than 100 characters').optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  accountType: z.nativeEnum(AccountType).optional(),
  sortBy: z.enum(['firstName', 'lastName', 'email', 'createdAt', 'updatedAt', 'lastActiveAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  createdAfter: z.string().datetime('Invalid date format').optional(),
  createdBefore: z.string().datetime('Invalid date format').optional(),
  lastActiveAfter: z.string().datetime('Invalid date format').optional(),
  lastActiveBefore: z.string().datetime('Invalid date format').optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
});

export const bulkUserOperationSchema = z.object({
  userIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')).min(1, 'At least one user ID is required'),
  action: z.enum(['activate', 'deactivate', 'suspend', 'delete', 'verify', 'unverify']),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be less than 500 characters').optional(),
});

export const userSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Search query must be less than 100 characters'),
  filters: z.object({
    role: z.nativeEnum(UserRole).optional(),
    status: z.nativeEnum(UserStatus).optional(),
    accountType: z.nativeEnum(AccountType).optional(),
    location: z.string().optional(),
    company: z.string().optional(),
    skills: z.array(z.string()).optional(),
  }).optional(),
  page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').transform(Number).optional().default('10'),
});

export const exportUsersSchema = z.object({
  format: z.enum(['csv', 'excel', 'json']).optional().default('csv'),
  filters: z.object({
    role: z.nativeEnum(UserRole).optional(),
    status: z.nativeEnum(UserStatus).optional(),
    accountType: z.nativeEnum(AccountType).optional(),
    createdAfter: z.string().datetime('Invalid date format').optional(),
    createdBefore: z.string().datetime('Invalid date format').optional(),
    lastActiveAfter: z.string().datetime('Invalid date format').optional(),
    lastActiveBefore: z.string().datetime('Invalid date format').optional(),
  }).optional(),
  fields: z.array(z.string()).optional(),
});

export const userActivitySchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
  page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').transform(Number).optional().default('20'),
  activityType: z.enum(['login', 'logout', 'profile_update', 'password_change', 'email_verification', 'password_reset']).optional(),
  dateFrom: z.string().datetime('Invalid date format').optional(),
  dateTo: z.string().datetime('Invalid date format').optional(),
});

export const userStatsSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format').optional(),
  period: z.enum(['day', 'week', 'month', 'year']).optional().default('month'),
  dateFrom: z.string().datetime('Invalid date format').optional(),
  dateTo: z.string().datetime('Invalid date format').optional(),
});
