import { IAuthResponse } from '../types/auth';

export interface ILoginResponse {
  user: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface IRefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthSerializer {
  static toLoginResponse(data: IAuthResponse): ILoginResponse {
    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        permissions: data.user.permissions,
      },
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    };
  }

  static toRefreshTokenResponse(data: { accessToken: string; refreshToken: string; expiresIn: number }): IRefreshTokenResponse {
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    };
  }
}
