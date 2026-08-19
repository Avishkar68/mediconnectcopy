import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const mockGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

console.log('Attempting Cloudinary stream upload (secure)...');
const stream = cloudinary.uploader.upload_stream(
  { folder: 'mediconnect_records_test' },
  (error, result) => {
    if (error) {
      console.error('Test upload failed!');
      console.error('Full Error Object:', JSON.stringify(error, null, 2));
      process.exit(1);
    } else {
      console.log('Test upload succeeded! URL:', result.secure_url);
      process.exit(0);
    }
  }
);

stream.end(mockGif);
