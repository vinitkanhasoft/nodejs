import { Request } from 'express';
import { UserRole } from '../enums/userEnums';

export interface IAuthUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
}

export interface ILoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface IRegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface IAuthResponse {
  user: IAuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface IRefreshTokenRequest {
  refreshToken: string;
}

export interface IPasswordResetRequest {
  email: string;
}

export interface IPasswordResetConfirmRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface IChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface IJWTpayload {
  sub: string;
  email: string;
  role: UserRole;
  permissions: string[];
  iat: number;
  exp: number;
}

export interface IAuthenticatedRequest extends Request {
  user?: IAuthUser;
  headers: Request['headers'];
  params: Request['params'];
  query: Request['query'];
  body: Request['body'];
}

export interface ITwoFactorSetupRequest {
  secret: string;
  token: string;
}

export interface ITwoFactorVerifyRequest {
  token: string;
}

export interface ITwoFactorResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface ISession {
  id: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastAccessAt: Date;
}
