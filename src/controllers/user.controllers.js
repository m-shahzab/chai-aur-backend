import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import fs from "fs";
import mongoose from "mongoose";

const generateTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, error.message || "Token generation failed");
  }
};

const register = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return response

  const { fullName, email, username, password } = req.body;
  const fieldsArr = [fullName, email, username, password];
  if (fieldsArr.some((field) => field?.trim() === "" || !field)) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    req.files?.avatar && fs.unlinkSync(req.files?.avatar[0]?.path);
    throw new ApiError(409, "User with email or username already exists");
  }

  if (!req.files?.avatar) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar not uploaded successfully");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const userCreated = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!userCreated) {
    throw new ApiError(500, "user registration failed");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, "User registered successfully", userCreated));
});

const loginUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user exists: username, email
  // compare password
  // access and refresh token
  // send cookies
  const { email, password, username } = req.body;

  //validation
  //user can login with email or username
  if (!email && !username) {
    throw new ApiError(400, "Email or username is required");
  }
  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  //compare password
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Password is incorrect");
  }

  const { accessToken, refreshToken } = await generateTokenAndRefreshToken(
    user._id
  );

  user.password = undefined;
  user.refreshToken = undefined;

  //we can also make new db call for getting user details
  // const loggedInUser = await User.findById(user._id).select(
  //   "-password -refreshToken"
  // );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, "user logged in successfully", {
        user: user,
        accessToken,
        refreshToken,
      })
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // get user from req object (we set user to req object in verifyJWT middleware)
  // refresh token to null in db
  // clear cookies

  const user = req.user;
  await User.findByIdAndUpdate(
    user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // get refresh token from cookies
  // decode refresh token
  // find user by id (id come from decoded token)
  // compare refresh token in db with incoming refresh token
  // generate new access token and refresh token

  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized access");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken._id);

    if (!user || user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Invalid token");
    }

    const { accessToken, newRefreshToken } = await generateTokenAndRefreshToken(
      user._id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(200, "Access token refreshed successfully", {
          accessToken,
          refreshToken: newRefreshToken,
        })
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Unauthorized access");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  //get new and old password from req object
  //validation - not empty
  // check if old password is correct
  // update password and save user
  // return response
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old password and new password are required");
  }

  try {
    const user = await User.findById(req.user?._id);
    console.log("@@@ ", user);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      throw new ApiError(401, "Invalid Password");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res
      .status(200)
      .json(new ApiResponse(200, "Password changed successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Password change failed");
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  //get user from req object (we set user to req object in verifyJWT middleware)
  const user = req.user;
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return res.status(200).json(new ApiResponse(200, "User details", user));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email, bio, about } = req.body;

  if (!fullName && !email && !bio && !about) {
    throw new ApiError(400, "One of the fields is required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
        bio: bio,
        aboutMe: about,
      },
    },
    { new: true }
  ).select("-password");

  if (!user) {
    throw new ApiError(500, "Account details update failed");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "Account details updated successfully", user));
});

const updateUserAvatarOrCoverImage = asyncHandler(async (req, res) => {
  //get user from req object (we set user to req object in verifyJWT middleware)
  //get new avatar or cover image from req object
  //validation - not empty
  //upload to cloudinary
  //after upload new avatar or cover image to cloudinary than delete old avatar or cover image from cloudinary
  //update user with new avatar or cover image url in db

  if (!req.files) {
    throw new ApiError(400, "Avatar or Cover Image is required");
  }
  const type = req.files?.avatar ? "avatar" : "coverImage";
  const localPath = req.files[type][0].path;
  const uploadedImage = await uploadOnCloudinary(localPath);
  if (!uploadedImage.url) {
    throw new ApiError(400, `${type} image not uploaded successfully`);
  }
  const oldImageLink = req.user[type];
  await deleteFromCloudinary(oldImageLink || null);
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        [type]: uploadedImage.url,
      },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, `${type} updated successfully`, user));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username) {
    throw new ApiError(400, "Username is required");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers",
        },
        channelCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        subscriberCount: 1,
        channelCount: 1,
        isSubscribed: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Channel details", channel[0]));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  console.log("req.user?._id", req.user?._id);
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
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
        ],
      },
    },
  ]);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "Watch history", user[0].watchHistory));
});

export {
  register,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  updateUserAvatarOrCoverImage,
  getCurrentUser,
  updateAccountDetails,
};
