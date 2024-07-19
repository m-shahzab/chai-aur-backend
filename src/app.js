import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

//import routes
import userRouter from "./routes/user.router.js";
import videoRouter from "./routes/video.router.js";
import commentsRouter from "./routes/comments.router.js";
import tweetRouter from "./routes/tweet.route.js";
import likeRouter from "./routes/like.router.js";

//use routes
app.use("/api/users", userRouter);
app.use("/api/videos", videoRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/tweets", tweetRouter);
app.use("/api/likes", likeRouter);

export default app;
