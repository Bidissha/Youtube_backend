import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

cloudinary.v2.uploader.upload(
  "https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg",
  {
    public_id: "shoes",
  }
);
