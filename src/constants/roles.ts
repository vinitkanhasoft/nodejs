export const USER_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest',
} as const;

export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    'read:all',
    'write:all',
    'delete:all',
    'manage:users',
    'manage:roles',
    'manage:system',
  ],
  [USER_ROLES.MODERATOR]: [
    'read:all',
    'write:moderate',
    'delete:moderate',
    'manage:content',
  ],
  [USER_ROLES.USER]: [
    'read:own',
    'write:own',
    'delete:own',
  ],
  [USER_ROLES.GUEST]: [
    'read:public',
  ],
} as const;

export const ROLE_HIERARCHY = {
  [USER_ROLES.ADMIN]: 4,
  [USER_ROLES.MODERATOR]: 3,
  [USER_ROLES.USER]: 2,
  [USER_ROLES.GUEST]: 1,
} as const;
