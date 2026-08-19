// import { v2 as cloudinary } from 'cloudinary';
// import dotenv from 'dotenv';

// dotenv.config();

// const isConfigured = 
//   process.env.CLOUDINARY_CLOUD_NAME && 
//   process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
//   process.env.CLOUDINARY_API_KEY &&
//   process.env.CLOUDINARY_API_KEY !== 'your_api_key' &&
//   process.env.CLOUDINARY_API_SECRET &&
//   process.env.CLOUDINARY_API_SECRET !== 'your_api_secret';

// if (isConfigured) {
//   cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET,
//   });
// } else {
//   console.warn('\n======================================================');
//   console.warn('[CLOUDINARY] Cloudinary is not configured in .env!');
//   console.warn('File uploads will return a high-quality mock medical record image.');
//   console.warn('======================================================\n');
// }

// export { cloudinary, isConfigured };
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET
} = process.env;

const isConfigured =
  !!CLOUDINARY_CLOUD_NAME &&
  !!CLOUDINARY_API_KEY &&
  !!CLOUDINARY_API_SECRET;

console.log("========== CLOUDINARY CONFIG ==========");
console.log("Cloud Name:", CLOUDINARY_CLOUD_NAME);
console.log("API Key:", CLOUDINARY_API_KEY ? "Present" : "Missing");
console.log("API Secret:", CLOUDINARY_API_SECRET ? "Present" : "Missing");
console.log("Configured:", isConfigured);
console.log("=======================================");

if (isConfigured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });
} else {
  console.warn("Cloudinary is NOT configured.");
}

export { cloudinary, isConfigured };