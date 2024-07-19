import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../models/tweet.model.js";
import mongoose, { isValidObjectId } from "mongoose";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { text } = req.body;
  if (!text) {
    throw new ApiError(400, "Text is required");
  }

  const results = await Tweet.create({
    content: text,
    owner: req.user._id,
  });

  const tweet = await Tweet.findById(results._id);
  if (!tweet) {
    throw new ApiError(500, "Failed to create tweet");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "Tweet created successfully", tweet));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { page = 1, limit = 5 } = req.query;
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const pipeline = [
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
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
            },
          },
        ],
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $sort: { createdAt: -1 },
    },
  ];
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };
  const tweet = await Tweet.aggregatePaginate(
    Tweet.aggregate(pipeline),
    options
  );
  if (!tweet) {
    throw new ApiError(404, "No tweets found for this user");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "Tweets retrieved successfully", tweet));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;
  const { text } = req.body;
  const userId = req.user?._id;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }
  if (!text) {
    throw new ApiError(400, "Text is required");
  }
  const tweet = await Tweet.findById({ _id: tweetId });
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }
  if (!tweet.owner.equals(userId)) {
    throw new ApiError(403, "You are not authorized to update this tweet");
  }
  tweet.content = text;
  await tweet.save();
  return res
    .status(200)
    .json(new ApiResponse(200, "Tweet updated successfully", tweet));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;
  const userId = req.user?._id;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }
  const tweet = await Tweet.findById({ _id: tweetId });
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }
  if (!tweet.owner.equals(userId)) {
    throw new ApiError(403, "You are not authorized to delete this tweet");
  }
  await Tweet.deleteOne({ _id: tweetId });
  return res
    .status(200)
    .json(new ApiResponse(200, "Tweet deleted successfully"));
});
export { createTweet, getUserTweets, updateTweet, deleteTweet };
