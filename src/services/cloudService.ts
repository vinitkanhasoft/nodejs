import { cloudinaryConfig, cloudinary } from '../config/cloud';
import { logger } from '../config/logger';
import { ICloudinaryFile } from '../types';
import { serverConfig } from '../config/server';
import { AppError } from '../middlewares/errorMiddleware';
import { ERROR_MESSAGES } from '../constants/messages';
import { HTTP_STATUS } from '../constants/status';

export class CloudService {
  async uploadImage(file: string | Buffer, folder?: string): Promise<ICloudinaryFile> {
    try {
      let uploadResult: any;

      if (typeof file === 'string') {
        uploadResult = await cloudinaryConfig.upload(file, folder || 'images');
      } else {
        // For buffer uploads, we need to use a different approach
        uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              folder: folder || 'images',
              resource_type: 'image',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(file);
        });
      }

      const cloudinaryFile: ICloudinaryFile = {
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
        url: uploadResult.url,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        resource_type: uploadResult.resource_type,
        created_at: uploadResult.created_at,
      };

      logger.info(`Image uploaded successfully: ${cloudinaryFile.public_id}`);
      return cloudinaryFile;
    } catch (error) {
      logger.error('Image upload failed:', error);
      throw new AppError(ERROR_MESSAGES.FILE_UPLOAD_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'UPLOAD_FAILED');
    }
  }

  async uploadMultipleImages(files: Array<string | Buffer>, folder?: string): Promise<ICloudinaryFile[]> {
    try {
      const uploadPromises = files.map(file => this.uploadImage(file, folder));
      const results = await Promise.all(uploadPromises);

      logger.info(`Multiple images uploaded successfully: ${results.length} files`);
      return results;
    } catch (error) {
      logger.error('Multiple images upload failed:', error);
      throw error;
    }
  }

  async uploadDocument(file: string | Buffer, folder?: string): Promise<ICloudinaryFile> {
    try {
      let uploadResult: any;

      if (typeof file === 'string') {
        uploadResult = await cloudinaryConfig.upload(file, folder || 'documents');
      } else {
        uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              folder: folder || 'documents',
              resource_type: 'auto',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(file);
        });
      }

      const cloudinaryFile: ICloudinaryFile = {
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
        url: uploadResult.url,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        resource_type: uploadResult.resource_type,
        created_at: uploadResult.created_at,
      };

      logger.info(`Document uploaded successfully: ${cloudinaryFile.public_id}`);
      return cloudinaryFile;
    } catch (error) {
      logger.error('Document upload failed:', error);
      throw new AppError(ERROR_MESSAGES.FILE_UPLOAD_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'UPLOAD_FAILED');
    }
  }

  async uploadVideo(file: string | Buffer, folder?: string): Promise<ICloudinaryFile> {
    try {
      let uploadResult: any;

      if (typeof file === 'string') {
        uploadResult = await cloudinaryConfig.upload(file, folder || 'videos');
      } else {
        uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              folder: folder || 'videos',
              resource_type: 'video',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(file);
        });
      }

      const cloudinaryFile: ICloudinaryFile = {
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
        url: uploadResult.url,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        resource_type: uploadResult.resource_type,
        created_at: uploadResult.created_at,
      };

      logger.info(`Video uploaded successfully: ${cloudinaryFile.public_id}`);
      return cloudinaryFile;
    } catch (error) {
      logger.error('Video upload failed:', error);
      throw new AppError(ERROR_MESSAGES.FILE_UPLOAD_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'UPLOAD_FAILED');
    }
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinaryConfig.delete(publicId);
      logger.info(`File deleted successfully: ${publicId}`);
    } catch (error) {
      logger.error('File deletion failed:', error);
      throw new AppError(ERROR_MESSAGES.FILE_UPLOAD_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'DELETE_FAILED');
    }
  }

  async deleteMultipleFiles(publicIds: string[]): Promise<void> {
    try {
      await cloudinaryConfig.deleteMultiple(publicIds);
      logger.info(`Multiple files deleted successfully: ${publicIds.length} files`);
    } catch (error) {
      logger.error('Multiple files deletion failed:', error);
      throw error;
    }
  }

  async getFileInfo(publicId: string): Promise<any> {
    try {
      const fileInfo = await cloudinaryConfig.getFileInfo(publicId);
      return fileInfo;
    } catch (error) {
      logger.error('Get file info failed:', error);
      throw error;
    }
  }

  async updateFile(publicId: string, updateOptions: any): Promise<any> {
    try {
      const result = await cloudinary.uploader.explicit(publicId, updateOptions);
      logger.info(`File updated successfully: ${publicId}`);
      return result;
    } catch (error) {
      logger.error('File update failed:', error);
      throw error;
    }
  }

  async createImageTransformation(publicId: string, transformations: any): Promise<string> {
    try {
      const transformedUrl = cloudinary.url(publicId, transformations);
      logger.info(`Image transformation created for: ${publicId}`);
      return transformedUrl;
    } catch (error) {
      logger.error('Image transformation failed:', error);
      throw error;
    }
  }

  async generateImageThumbnail(publicId: string, width: number = 150, height: number = 150): Promise<string> {
    try {
      const thumbnailUrl = cloudinary.url(publicId, {
        width,
        height,
        crop: 'fill',
        gravity: 'auto',
        quality: 'auto',
        format: 'auto',
      });

      logger.info(`Thumbnail generated for: ${publicId}`);
      return thumbnailUrl;
    } catch (error) {
      logger.error('Thumbnail generation failed:', error);
      throw error;
    }
  }

  async optimizeImage(publicId: string, quality: string = 'auto'): Promise<string> {
    try {
      const optimizedUrl = cloudinary.url(publicId, {
        quality,
        fetch_format: 'auto',
      });

      logger.info(`Image optimized for: ${publicId}`);
      return optimizedUrl;
    } catch (error) {
      logger.error('Image optimization failed:', error);
      throw error;
    }
  }

  async validateFileType(mimeType: string): Promise<boolean> {
    return serverConfig.fileUpload.allowedTypes.includes(mimeType);
  }

  async validateFileSize(size: number): Promise<boolean> {
    return size <= serverConfig.fileUpload.maxSize;
  }

  async uploadAvatar(file: string | Buffer, userId: string): Promise<ICloudinaryFile> {
    try {
      const result = await this.uploadImage(file, `avatars/${userId}`);
      
      // Generate avatar-specific transformations
      const avatarUrl = await this.createImageTransformation(result.public_id, {
        width: 200,
        height: 200,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        format: 'auto',
      });

      // Update the result with the avatar URL
      result.secure_url = avatarUrl;
      result.url = avatarUrl;

      logger.info(`Avatar uploaded for user: ${userId}`);
      return result;
    } catch (error) {
      logger.error('Avatar upload failed:', error);
      throw error;
    }
  }

  async uploadBanner(file: string | Buffer, userId: string): Promise<ICloudinaryFile> {
    try {
      const result = await this.uploadImage(file, `banners/${userId}`);
      
      // Generate banner-specific transformations
      const bannerUrl = await this.createImageTransformation(result.public_id, {
        width: 1200,
        height: 400,
        crop: 'fill',
        quality: 'auto',
        format: 'auto',
      });

      // Update the result with the banner URL
      result.secure_url = bannerUrl;
      result.url = bannerUrl;

      logger.info(`Banner uploaded for user: ${userId}`);
      return result;
    } catch (error) {
      logger.error('Banner upload failed:', error);
      throw error;
    }
  }

  async getCloudUsageStats(): Promise<any> {
    try {
      // This would typically use Cloudinary's admin API
      // For now, returning a placeholder
      return {
        totalImages: 0,
        totalStorage: 0,
        totalBandwidth: 0,
        transformations: 0,
      };
    } catch (error) {
      logger.error('Get cloud usage stats failed:', error);
      throw error;
    }
  }

  async cleanupUnusedFiles(olderThanDays: number = 30): Promise<{ deleted: number; errors: string[] }> {
    try {
      // This would implement cleanup logic for unused files
      // For now, returning a placeholder
      logger.info(`Cleanup initiated for files older than ${olderThanDays} days`);
      return {
        deleted: 0,
        errors: [],
      };
    } catch (error) {
      logger.error('Cleanup failed:', error);
      throw error;
    }
  }
}

export const cloudService = new CloudService();
