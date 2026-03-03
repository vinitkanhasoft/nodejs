import { Router } from 'express';
import { authController } from '../controllers/authController';
import { validateBody } from '../middlewares/validationMiddleware';
import { authenticateToken, optionalAuth } from '../middlewares/authMiddleware';
import { 
  loginSchema, 
  registerSchema, 
  refreshTokenSchema, 
  passwordResetRequestSchema, 
  passwordResetConfirmSchema, 
  changePasswordSchema,
  updateProfileSchema
} from '../validators/authValidator';

const router = Router();

// Public routes
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/refresh-token', validateBody(refreshTokenSchema), authController.refreshToken);
router.post('/request-password-reset', validateBody(passwordResetRequestSchema), authController.requestPasswordReset);
router.post('/confirm-password-reset', validateBody(passwordResetConfirmSchema), authController.confirmPasswordReset);
router.post('/verify-email', authController.verifyEmail);

// Protected routes
router.use(authenticateToken); // All routes below this require authentication

router.post('/logout', authController.logout);
router.post('/logout-all', authController.logoutAll);
router.post('/change-password', validateBody(changePasswordSchema), authController.changePassword);
router.post('/resend-verification', authController.resendVerificationEmail);

router.get('/profile', authController.getProfile);
router.put('/profile', validateBody(updateProfileSchema), authController.updateProfile);

// Two-factor authentication
router.post('/2fa/setup', authController.enableTwoFactor);
router.post('/2fa/verify', authController.verifyTwoFactor);
router.post('/2fa/disable', authController.disableTwoFactor);

// Session management
router.get('/sessions', authController.getSessions);
router.delete('/sessions/:sessionId', authController.revokeSession);
router.get('/login-history', authController.getLoginHistory);

export { router as authRoutes };
