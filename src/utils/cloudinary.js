import { v2 as cloudinary } from "cloudinary";
import { extractPublicId } from "cloudinary-build-url";
import { ApiError } from "./ApiError.js";

import fs from "fs";

cloudinary.config({
  cloud_name: "dnszyn8qw",
  api_key: process.env.CLOUDINARY_APIKEY,
  api_secret: process.env.CLOUDINARY_APIKEY_SECRET,
});

const uploadOnCloudinary = async (localFilePath, folderName = "avatars") => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: folderName,
    });
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    throw new ApiError(400, error.message || "Image not uploaded successfully");
  }
};

const deleteFromCloudinary = async (fileUrl, resType = "image") => {
  try {
    if (!fileUrl) return null;
    const publicId = extractPublicId(fileUrl);
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resType,
    });
  } catch (error) {
    throw new ApiError(
      400,
      error.message || "Image or Video not deleted successfully"
    );
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
