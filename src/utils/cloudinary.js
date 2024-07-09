import { v2 as cloudinary } from "cloudinary";
import { extractPublicId } from "cloudinary-build-url";
import { ApiError } from "./ApiError.js";

import fs from "fs";

cloudinary.config({
  cloud_name: "dnszyn8qw",
  api_key: process.env.CLOUDINARY_APIKEY,
  api_secret: process.env.CLOUDINARY_APIKEY_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: "avatars",
    });
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    throw new ApiError(400, error.message || "Image not uploaded successfully");
  }
};

const deleteFromCloudinary = async (previousImgUrl) => {
  try {
    if (!previousImgUrl) return null;
    const publicId = extractPublicId(previousImgUrl);
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new ApiError(400, error.message || "Image not deleted successfully");
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
