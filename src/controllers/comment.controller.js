import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comments.model.js";
import mongoose, { isValidObjectId } from "mongoose";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 3 } = req.query;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const pipeline = [
    // match comments for this video
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    // get newest comments first
    {
      $sort: { createdAt: -1 },
    },
    // lookup owner details from users collection
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          // add fields to owner object not get whole owner object
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
              isOwner: 1,
            },
          },
        ],
      },
    },
    // destructure owner array
    {
      $unwind: "$owner",
    },
    {
      $addFields: {
        isOwner: {
          $cond: {
            if: { $eq: ["$owner._id", req.user._id] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        content: 1,
        owner: 1,
        isOwner: 1,
      },
    },
  ];

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const comments = await Comment.aggregatePaginate(
    Comment.aggregate(pipeline),
    options
  );

  if (!comments) {
    throw new ApiError(404, "No comments found for this video");
  }
  res
    .status(200)
    .json(new ApiResponse(200, "Comments retrieved successfully", comments));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const { text } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  if (!text) {
    throw new ApiError(400, "Comment content is required");
  }
  const comment = await Comment.create({
    content: text,
    video: videoId,
    owner: req.user._id,
  });

  const createdComment = await Comment.findById(comment._id);
  if (!createdComment) {
    throw new ApiError(500, "Failed to add comment");
  }

  res
    .status(200)
    .json(new ApiResponse(200, "Comments added successfully", createdComment));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a video comment
  const { commentId } = req.params;
  const { text } = req.body;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const userId = req.user?._id;
  const comment = await Comment.findOne({ _id: commentId });

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (!comment.owner.equals(userId)) {
    throw new ApiError(403, "You are not allowed to update this comment");
  }

  comment.content = text;
  await comment.save();
  res
    .status(200)
    .json(new ApiResponse(200, "Comment updated successfully", comment));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }
  const userId = req.user?._id;
  const comment = await Comment.findById({ _id: commentId });
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  if (!comment.owner.equals(userId)) {
    throw new ApiError(403, "You are not allowed to delete this comment");
  }

  await Comment.deleteOne({ _id: commentId });
  res.status(200).json(new ApiResponse(200, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
