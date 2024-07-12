import { Router } from "express";
import {
  publishAVideo,
  getVideoById,
  deleteVideo,
  getAllVideos,
  togglePublishStatus,
  updateVideo,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { multerUploader } from "../middlewares/multer.middlewares.js";

const router = Router();
router.use(verifyJWT);

router
  .route("/")
  .get(getAllVideos)
  .post(
    multerUploader.fields([
      {
        name: "videoFile",
        maxCount: 1,
      },
      {
        name: "thumbnail",
        maxCount: 1,
      },
    ]),
    publishAVideo
  );

router
  .route("/:videoId")
  .get(getVideoById)
  .delete(deleteVideo)
  .patch(multerUploader.single("thumbnail"), updateVideo);

router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

export default router;
// In the above snippet, we have created a new Express router called videoRouter. We have imported the publishAVideo controller function, the verifyJWT middleware function, and the multerUploader middleware function. We have defined a POST route at the / endpoint that uses the multerUploader middleware to handle file uploads and the publishAVideo controller function to publish a video. We have also added the verifyJWT middleware to protect the / endpoint and ensure that only authenticated users can publish videos.
