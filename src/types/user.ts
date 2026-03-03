import { Document, Types } from 'mongoose';
import { UserRole, UserStatus, Gender, AccountType, NotificationType, PrivacySetting, TwoFactorStatus, LoginMethod } from '../enums/userEnums';

export interface IUserAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export interface IUserPreferences {
  language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    [key: string]: boolean;
  };
  privacy: {
    profileVisibility: PrivacySetting;
    showEmail: boolean;
    showPhone: boolean;
    allowFriendRequests: boolean;
  };
}

export interface IUserStats {
  loginCount: number;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  accountLockedUntil?: Date;
  passwordChangedAt?: Date;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
}

export interface IUserSocialLinks {
  website?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  github?: string;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  
  // Basic Information
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  
  // Account Information
  role: UserRole;
  status: UserStatus;
  accountType: AccountType;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  
  // Authentication
  loginMethod: LoginMethod;
  refreshTokens: string[];
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  
  // Profile
  bio?: string;
  headline?: string;
  company?: string;
  jobTitle?: string;
  location?: string;
  website?: string;
  socialLinks: IUserSocialLinks;
  
  // Address
  addresses: IUserAddress[];
  
  // Preferences
  preferences: IUserPreferences;
  
  // Statistics
  stats: IUserStats;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
  deletedAt?: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generatePasswordResetToken(): string;
  generateEmailVerificationToken(): string;
  generateAuthToken(): string;
  toSafeObject(): any;
}

export interface IUserCreateInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
  accountType?: AccountType;
  loginMethod?: LoginMethod;
}

export interface IUserUpdateInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  bio?: string;
  headline?: string;
  company?: string;
  jobTitle?: string;
  location?: string;
  website?: string;
  socialLinks?: Partial<IUserSocialLinks>;
  preferences?: Partial<IUserPreferences>;
}

export interface IUserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  accountType?: AccountType;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  createdAfter?: Date;
  createdBefore?: Date;
  lastActiveAfter?: Date;
  lastActiveBefore?: Date;
}

export interface IUserListResponse {
  users: IUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
