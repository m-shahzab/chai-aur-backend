import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import mongoose from "mongoose";

const getAllVideos = asyncHandler(async (req, res) => {
  //TODO: get all videos based on query, sort, pagination
  const {
    page = 1,
    limit = 3,
    query,
    sortBy,
    sortType = "desc",
    username,
  } = req.query;

  const pipeline = [
    {
      $match: query ? { title: { $regex: query, $options: "i" } } : {}, //if query is provided, filter by query else return all documents
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $sort: sortBy
        ? { [sortBy]: sortType === "desc" ? -1 : 1 }
        : { createdAt: 1 },
    },
    {
      $match: username ? { "owner.username": username } : {},
    },
  ];
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const allVideo = await Video.aggregatePaginate(
    Video.aggregate(pipeline),
    options
  );

  if (!allVideo) {
    throw new ApiError(404, "No videos found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "All videos fetched.", allVideo));
});

const publishAVideo = asyncHandler(async (req, res) => {
  // TODO: get video, upload to cloudinary, create video
  const { title, description } = req.body;

  if ([title, description].some((field) => !field || field?.trim() === "")) {
    throw new ApiError(400, "Please provide a title and description.");
  }
  if (!req.files || !req.files.videoFile || !req.files.thumbnail) {
    throw new ApiError(400, "Please provide a video file and a thumbnail.");
  }
  const videoFileLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  // upload video and thumbnail to cloudinary
  const videoFileUrl = await uploadOnCloudinary(videoFileLocalPath, "videos");
  const thumbnailUrl = await uploadOnCloudinary(
    thumbnailLocalPath,
    "thumbnails"
  );

  if (!videoFileUrl || !thumbnailUrl) {
    throw new ApiError(500, "Failed to upload video or thumbnail.");
  }

  //create video in db
  const video = await Video.create({
    title,
    description,
    videoFile: videoFileUrl.url,
    thumbnail: thumbnailUrl.url,
    duration: videoFileUrl.duration, // get duration from third-party service
    owner: req.user?._id,
  });

  const populatedVideo = await Video.findById(video._id)
    .populate("owner", "_id fullName username avatar")
    .exec();

  if (!populatedVideo) {
    throw new ApiError(500, "Failed to create video.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Video published successfully.", populatedVideo)
    );
});

const getVideoById = asyncHandler(async (req, res) => {
  //TODO: get video by id
  const { videoId } = req.params;

  if (videoId === "videoId" || videoId === ":videoId") {
    throw new ApiError(400, "Please provide a videoId.");
  }

  const video = await Video.findById(videoId)
    .populate("owner", "_id fullName username avatar")
    .exec();

  if (!video) {
    throw new ApiError(404, "Video not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Single video fetched.", video));
});

const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (videoId === "videoId" || videoId === ":videoId") {
    throw new ApiError(400, "Please provide a videoId.");
  }

  const thumbnailPath = req.file?.path;
  if (!title && !description && !thumbnailPath) {
    throw new ApiError(
      400,
      "Please provide a title, description or thumbnails."
    );
  }

  const mongoId = new mongoose.Types.ObjectId(videoId);
  // const cloudinaryRes =
  //   thumbnailPath && (await uploadOnCloudinary(thumbnailPath, "thumbnails"));
  const cloudinaryRes = await uploadOnCloudinary(thumbnailPath, "thumbnails");

  const findedVideo = await Video.findById({ _id: mongoId });
  if (thumbnailPath) {
    await deleteFromCloudinary(findedVideo.thumbnail);
  }
  if (!findedVideo) {
    throw new ApiError(404, "Video not found.");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    { _id: mongoId },
    {
      $set: {
        title: title || findedVideo.title,
        description: description || findedVideo.description,
        thumbnail: cloudinaryRes?.url || findedVideo.thumbnail,
      },
    },
    { new: true }
  ).select("title description thumbnail");

  if (!updatedVideo) {
    throw new ApiError(404, "Failed to update video.");
  }
  res
    .status(200)
    .json(new ApiResponse(200, "Video updated successfully.", updatedVideo));
});

const deleteVideo = asyncHandler(async (req, res) => {
  //TODO: delete video
  const { videoId } = req.params;
  if (videoId === "videoId" || videoId === ":videoId") {
    throw new ApiError(400, "Please provide a videoId.");
  }

  const mongoId = new mongoose.Types.ObjectId(videoId);

  try {
    const videoUrl = await Video.findById(mongoId).select("videoFile").exec();
    if (!videoUrl) {
      throw new ApiError(404, "Video not found.");
    }
    await Video.deleteOne(mongoId);
    await deleteFromCloudinary(videoUrl.videoFile || null, "video");
    return res
      .status(200)
      .json(new ApiResponse(200, "Video deleted successfully"));
  } catch (error) {
    // Handle specific error types for better error messages
    if (error.name === "ValidationError") {
      throw new ApiError(400, "Invalid video data");
    } else if (error.name === "CastError") {
      throw new ApiError(404, "Video not found");
    } else {
      throw error; // Re-throw unexpected errors
    }
  }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (videoId === "videoId" || videoId === ":videoId") {
    throw new ApiError(400, "Please provide a videoId.");
  }
  const mongoId = new mongoose.Types.ObjectId(videoId);
  try {
    const isToggled = await Video.findOneAndUpdate(
      { _id: mongoId },
      [{ $set: { isPublished: { $not: "$isPublished" } } }],
      { new: true }
    ).select("isPublished");

    if (!isToggled) {
      throw new ApiError(404, "Failed to update video status.");
    }
    res
      .status(200)
      .json(
        new ApiResponse(200, "Video status updated successfully.", isToggled)
      );
  } catch (error) {
    // Handle specific error types for better error messages
    if (error.name === "ValidationError") {
      throw new ApiError(400, "Invalid video data");
    } else if (error.name === "CastError") {
      throw new ApiError(404, "Video not found");
    } else {
      throw error; // Re-throw unexpected errors
    }
  }
});

export {
  publishAVideo,
  getAllVideos,
  getVideoById,
  deleteVideo,
  togglePublishStatus,
  updateVideo,
};
