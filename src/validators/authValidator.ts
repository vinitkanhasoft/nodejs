import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, 
           'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters'),
  phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, 
           'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, 
           'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const twoFactorSetupSchema = z.object({
  secret: z.string().min(1, '2FA secret is required'),
  token: z.string().min(6, '2FA token must be 6 characters').max(6, '2FA token must be 6 characters'),
});

export const twoFactorVerifySchema = z.object({
  token: z.string().min(6, '2FA token must be 6 characters').max(6, '2FA token must be 6 characters'),
});

export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters').optional(),
  phone: z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional(),
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

export const updatePreferencesSchema = z.object({
  language: z.string().min(2, 'Language code must be at least 2 characters').max(5, 'Language code must be less than 5 characters').optional(),
  timezone: z.string().min(1, 'Timezone is required').optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  notifications: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
    marketing: z.boolean().optional(),
    security: z.boolean().optional(),
    updates: z.boolean().optional(),
  }).optional(),
  privacy: z.object({
    profileVisibility: z.enum(['public', 'friends_only', 'private']),
    showEmail: z.boolean(),
    showPhone: z.boolean(),
    allowFriendRequests: z.boolean(),
  }).optional(),
});

export const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required').max(200, 'Street address must be less than 200 characters'),
  city: z.string().min(1, 'City is required').max(100, 'City must be less than 100 characters'),
  state: z.string().min(1, 'State is required').max(100, 'State must be less than 100 characters'),
  zipCode: z.string().min(1, 'Zip code is required').max(20, 'Zip code must be less than 20 characters'),
  country: z.string().min(1, 'Country is required').max(100, 'Country must be less than 100 characters'),
  isDefault: z.boolean().optional().default(false),
});

export const addAddressSchema = addressSchema;
export const updateAddressSchema = addressSchema.partial();
