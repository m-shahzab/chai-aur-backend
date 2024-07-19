import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Like } from "../models/likes.model.js";
import mongoose, { isValidObjectId } from "mongoose";

const toggleVideoLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on video
  const { videoId } = req.params;
  const userId = req.user?._id;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  const like = await Like.findOne({ video: videoId, likedBy: userId });

  if (!like) {
    await Like.create({ video: videoId, likedBy: userId });
  } else await Like.findByIdAndDelete(like._id);

  const Liked = await Like.findOne({ video: videoId, likedBy: userId });
  return res.status(200).json(new ApiResponse(200, `Liked: ${!!Liked}`));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on comment
  const { commentId } = req.params;
  const userId = req.user?._id;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }
  const like = await Like.findOne({ comment: commentId, likedBy: userId });
  console.log(like);
  if (!like) {
    await Like.create({ comment: commentId, likedBy: userId });
  } else await Like.findByIdAndDelete(like._id);

  const Liked = await Like.findOne({ comment: commentId, likedBy: userId });

  return res.status(200).json(new ApiResponse(200, `Liked: ${!!Liked}`));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on tweet
  const { tweetId } = req.params;
  const userId = req.user?._id;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }
  const like = await Like.findOne({ tweet: tweetId, likedBy: userId });
  if (!like) {
    await Like.create({ tweet: tweetId, likedBy: userId });
  } else await Like.findByIdAndDelete(like._id);

  const Liked = await Like.findOne({ tweet: tweetId, likedBy: userId });
  return res.status(200).json(new ApiResponse(200, `Liked: ${!!Liked}`));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const userId = req.user._id;
  const pipeline = [
    {
      $match: { likedBy: userId },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
      },
    },
    {
      $unwind: "$video",
    },
    // {
    //   $project: {
    //     _id: "$video._id",
    //     title: "$video.title",
    //     description: "$video.description",
    //     thumbnail: "$video.thumbnail",
    //     createdAt: "$video.createdAt",
    //   },
    // },
  ];
  const likedVideos = await Like.aggregate(pipeline);

  if (likedVideos.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, "you dont have any liked videos", null));
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "you liked these videos", likedVideos));
});
export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
