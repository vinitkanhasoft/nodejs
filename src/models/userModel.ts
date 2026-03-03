import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serverConfig } from '../config/server';
import { UserRole, UserStatus, Gender, AccountType, LoginMethod } from '../enums/userEnums';
import { IUserAddress, IUserPreferences, IUserStats, IUserSocialLinks } from '../types/user';

// Interface for User document
export interface IUser extends Document {
  // Basic Information (5 fields)
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;

  // Profile Information (5 fields)
  avatar?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  bio?: string;
  headline?: string;

  // Professional Information (5 fields)
  company?: string;
  jobTitle?: string;
  location?: string;
  website?: string;
  socialLinks: IUserSocialLinks;

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

  // Address and Preferences
  addresses: IUserAddress[];
  preferences: IUserPreferences;
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

// User Schema
const userAddressSchema = new Schema<IUserAddress>({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
}, { _id: false });

const userSocialLinksSchema = new Schema<IUserSocialLinks>({
  website: { type: String },
  linkedin: { type: String },
  twitter: { type: String },
  facebook: { type: String },
  instagram: { type: String },
  github: { type: String },
}, { _id: false });

const userStatsSchema = new Schema<IUserStats>({
  loginCount: { type: Number, default: 0 },
  lastLoginAt: { type: Date },
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: { type: Date },
  passwordChangedAt: { type: Date },
  emailVerifiedAt: { type: Date },
  phoneVerifiedAt: { type: Date },
}, { _id: false });

const userPreferencesSchema = new Schema<IUserPreferences>({
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'UTC' },
  theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false },
    security: { type: Boolean, default: true },
    updates: { type: Boolean, default: true },
  },
  privacy: {
    profileVisibility: { type: String, enum: ['public', 'friends_only', 'private'], default: 'public' },
    showEmail: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
    allowFriendRequests: { type: Boolean, default: true },
  },
}, { _id: false });

const userSchema = new Schema<IUser>({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters'],
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: function() {
      return this.loginMethod === LoginMethod.EMAIL_PASSWORD;
    },
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false, // Don't include password in queries by default
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[+]?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'],
  },

  // Profile Information
  avatar: {
    type: String,
    default: null,
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(value: Date) {
        return !value || value < new Date();
      },
      message: 'Date of birth cannot be in the future',
    },
  },
  gender: {
    type: String,
    enum: Object.values(Gender),
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    trim: true,
  },
  headline: {
    type: String,
    maxlength: [100, 'Headline cannot exceed 100 characters'],
    trim: true,
  },

  // Professional Information
  company: {
    type: String,
    maxlength: [100, 'Company cannot exceed 100 characters'],
    trim: true,
  },
  jobTitle: {
    type: String,
    maxlength: [100, 'Job title cannot exceed 100 characters'],
    trim: true,
  },
  location: {
    type: String,
    maxlength: [100, 'Location cannot exceed 100 characters'],
    trim: true,
  },
  website: {
    type: String,
    validate: {
      validator: function(value: string) {
        return !value || /^https?:\/\/.+/.test(value);
      },
      message: 'Please enter a valid website URL',
    },
  },
  socialLinks: {
    type: userSocialLinksSchema,
    default: {},
  },

  // Account Information
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER,
  },
  status: {
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE,
  },
  accountType: {
    type: String,
    enum: Object.values(AccountType),
    default: AccountType.PERSONAL,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  phoneVerified: {
    type: Boolean,
    default: false,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: {
    type: String,
    select: false, // Never include in queries
  },

  // Authentication
  loginMethod: {
    type: String,
    enum: Object.values(LoginMethod),
    default: LoginMethod.EMAIL_PASSWORD,
  },
  refreshTokens: [{
    type: String,
  }],
  passwordResetToken: {
    type: String,
    select: false,
  },
  passwordResetExpires: {
    type: Date,
    select: false,
  },
  emailVerificationToken: {
    type: String,
    select: false,
  },
  emailVerificationExpires: {
    type: Date,
    select: false,
  },

  // Address and Preferences
  addresses: [userAddressSchema],
  preferences: {
    type: userPreferencesSchema,
    default: () => ({}),
  },
  stats: {
    type: userStatsSchema,
    default: () => ({}),
  },

  // Timestamps
  lastActiveAt: {
    type: Date,
  },
  deletedAt: {
    type: Date,
    select: false, // Don't include deleted records in normal queries
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastActiveAt: -1 });
userSchema.index({ 'preferences.privacy.profileVisibility': 1 });
userSchema.index({ deletedAt: 1 }, { sparse: true });

// Virtuals
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Hash password if it's modified
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, serverConfig.security.bcryptRounds);
  }

  // Update lastActiveAt on save
  if (this.isNew || this.isModified()) {
    this.lastActiveAt = new Date();
  }

  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generatePasswordResetToken = function(): string {
  const resetToken = jwt.sign(
    { id: this._id, type: 'password_reset' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
  
  this.passwordResetToken = resetToken;
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  return resetToken;
};

userSchema.methods.generateEmailVerificationToken = function(): string {
  const verificationToken = jwt.sign(
    { id: this._id, type: 'email_verification' },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
  
  this.emailVerificationToken = verificationToken;
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  return verificationToken;
};

userSchema.methods.generateAuthToken = function(): string {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

userSchema.methods.toSafeObject = function() {
  const userObject = this.toObject();
  
  // Remove sensitive fields
  delete userObject.password;
  delete userObject.refreshTokens;
  delete userObject.twoFactorSecret;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpires;
  delete userObject.deletedAt;
  
  return userObject;
};

// Static methods
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email, status: { $ne: UserStatus.DELETED } });
};

userSchema.statics.findByVerificationToken = function(token: string) {
  return this.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
    status: { $ne: UserStatus.DELETED },
  });
};

userSchema.statics.findByPasswordResetToken = function(token: string) {
  return this.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
    status: { $ne: UserStatus.DELETED },
  });
};

// Create and export the model
const User = mongoose.model<IUser>('User', userSchema);

export { User };
