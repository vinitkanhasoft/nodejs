import { v2 as cloudinary } from 'cloudinary';
import { logger } from './logger';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const cloudinaryConfig = {
  upload: async (file: string, folder?: string): Promise<any> => {
    try {
      const result = await cloudinary.uploader.upload(file, {
        folder: folder || 'nodejs-api',
        resource_type: 'auto',
      });
      
      logger.info('File uploaded to cloudinary successfully');
      return result;
    } catch (error) {
      logger.error('Error uploading file to cloudinary:', error);
      throw error;
    }
  },

  delete: async (publicId: string): Promise<any> => {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      logger.info('File deleted from cloudinary successfully');
      return result;
    } catch (error) {
      logger.error('Error deleting file from cloudinary:', error);
      throw error;
    }
  },

  deleteMultiple: async (publicIds: string[]): Promise<any> => {
    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      logger.info('Multiple files deleted from cloudinary successfully');
      return result;
    } catch (error) {
      logger.error('Error deleting multiple files from cloudinary:', error);
      throw error;
    }
  },

  getFileInfo: async (publicId: string): Promise<any> => {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      logger.error('Error getting file info from cloudinary:', error);
      throw error;
    }
  },
};

export { cloudinary };
