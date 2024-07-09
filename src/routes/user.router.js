import { Router } from "express";
import {
  register,
  loginUser,
  refreshAccessToken,
  updateUserAvatarOrCoverImage,
  getCurrentUser,
  updateAccountDetails,
  getUserChannelProfile,
  changeCurrentPassword,
  getWatchHistory,
} from "../controllers/user.controllers.js";
import { multerUploader } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { logoutUser } from "../controllers/user.controllers.js";
const router = Router();

router.route("/register").post(
  multerUploader.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  register
);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/get-currentUser").post(verifyJWT, getCurrentUser);
router.route("/refreshToken").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/updateUser").patch(verifyJWT, updateAccountDetails);
router.route("/update-avatar-cover-image").patch(
  verifyJWT,
  multerUploader.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  updateUserAvatarOrCoverImage
);
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/history").get(verifyJWT, getWatchHistory);

//make complete request url with this params "c/:username"
//http://localhost:5000/api/user/c/:username

export default router;
