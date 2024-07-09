import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model("Comment", commentSchema);
// In the above snippet, we have created a new Mongoose model called Comment. The Comment model has three fields: content, video, and owner. The content field is a required string that stores the comment content. The video field is a reference to the Video model, and the owner field is a reference to the User model. We have also added the mongooseAggregatePaginate plugin to the commentSchema to enable pagination support for the Comment model.
