import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    videoUrl: { type: String, required: true }, // Cloudinary secure_url
    publicId: { type: String, default: "" }, // Cloudinary public_id (needed for deleting later)
    duration: { type: Number, default: 0 }, // seconds
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Video = mongoose.model("Video", videoSchema);

export default Video;