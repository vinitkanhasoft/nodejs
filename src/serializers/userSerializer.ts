import { IUser } from '../models/userModel';

export interface IUserPublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  headline?: string;
  company?: string;
  jobTitle?: string;
  location?: string;
  website?: string;
  socialLinks: any;
  createdAt: Date;
}

export interface IUserPrivateProfile extends IUserPublicProfile {
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: string;
  role: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  preferences: any;
  stats: any;
  lastActiveAt?: Date;
}

export interface IUserAdminProfile extends IUserPrivateProfile {
  loginMethod: string;
  accountType: string;
  refreshTokens: string[];
  addresses: any[];
  deletedAt?: Date;
}

export class UserSerializer {
  static toPublicProfile(user: IUser): IUserPublicProfile {
    return {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      bio: user.bio,
      headline: user.headline,
      company: user.company,
      jobTitle: user.jobTitle,
      location: user.location,
      website: user.website,
      socialLinks: user.socialLinks,
      createdAt: user.createdAt,
    };
  }

  static toPrivateProfile(user: IUser): IUserPrivateProfile {
    return {
      ...this.toPublicProfile(user),
      email: user.email,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      preferences: user.preferences,
      stats: user.stats,
      lastActiveAt: user.lastActiveAt,
    };
  }

  static toAdminProfile(user: IUser): IUserAdminProfile {
    return {
      ...this.toPrivateProfile(user),
      loginMethod: user.loginMethod,
      accountType: user.accountType,
      refreshTokens: user.refreshTokens,
      addresses: user.addresses,
      deletedAt: user.deletedAt,
    };
  }

  static toList(users: IUser[], level: 'public' | 'private' | 'admin' = 'public'): any[] {
    const serializer = level === 'public' ? this.toPublicProfile :
                       level === 'private' ? this.toPrivateProfile :
                       this.toAdminProfile;
    
    return users.map(user => serializer.call(this, user));
  }
}
