const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class FileUploadService {
  constructor() {
    // Configure multer for memory storage
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: this.fileFilter,
    });
  }

  fileFilter(req, file, cb) {
    // Allow images, documents, and other common file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and documents are allowed.'), false);
    }
  }

  async uploadFile(file, folder = 'collab-app') {
    try {
      let processedBuffer = file.buffer;

      // If it's an image, optimize it
      if (file.mimetype.startsWith('image/')) {
        processedBuffer = await this.optimizeImage(file.buffer, file.mimetype);
      }

      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folder,
            resource_type: 'auto',
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
            use_filename: true,
            unique_filename: true,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(processedBuffer);
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        originalName: file.originalname,
        size: result.bytes,
        format: result.format,
        resourceType: result.resource_type,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  async optimizeImage(buffer, mimetype) {
    try {
      let sharpInstance = sharp(buffer);

      // Get image metadata
      const metadata = await sharpInstance.metadata();

      // Resize if too large
      if (metadata.width > 1920 || metadata.height > 1080) {
        sharpInstance = sharpInstance.resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert to appropriate format and compress
      if (mimetype === 'image/png') {
        return await sharpInstance
          .png({ quality: 80, compressionLevel: 8 })
          .toBuffer();
      } else if (mimetype === 'image/webp') {
        return await sharpInstance
          .webp({ quality: 80 })
          .toBuffer();
      } else {
        // Default to JPEG
        return await sharpInstance
          .jpeg({ quality: 80, progressive: true })
          .toBuffer();
      }
    } catch (error) {
      console.error('Image optimization error:', error);
      return buffer; // Return original if optimization fails
    }
  }

  async deleteFile(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('File deletion error:', error);
      throw new Error('Failed to delete file');
    }
  }

  async generateThumbnail(publicId, width = 300, height = 200) {
    try {
      const thumbnailUrl = cloudinary.url(publicId, {
        width: width,
        height: height,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'auto',
      });

      return thumbnailUrl;
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }

  getFileTypeIcon(mimetype) {
    const iconMap = {
      'application/pdf': '📄',
      'application/msword': '📝',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
      'application/vnd.ms-excel': '📊',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
      'text/plain': '📄',
      'text/csv': '📊',
      'image/jpeg': '🖼️',
      'image/png': '🖼️',
      'image/gif': '🖼️',
      'image/webp': '🖼️',
    };

    return iconMap[mimetype] || '📎';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = new FileUploadService();