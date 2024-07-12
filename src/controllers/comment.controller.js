import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comments.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const comments = await Comment.find({ videoId });
  // .limit(limit * 1)
  // .skip((page - 1) * limit)
  // .exec();

  if (!comments) {
    throw new ApiError(404, "No comments found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, "Comments retrieved successfully", { comments })
    );
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const { content } = req.body;
});

export { getVideoComments, addComment };
