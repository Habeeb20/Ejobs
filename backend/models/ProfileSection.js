import mongoose, { Schema } from "mongoose";

const owner = { type: Schema.Types.ObjectId, ref: "User", required: true, index: true };
// "YYYY-MM" strings (what <input type="month"> returns). Empty is allowed.
const month = { type: String, default: "", match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Use the format YYYY-MM"] };
const str = (max) => ({ type: String, trim: true, maxlength: max, default: "" });
const media = { type: String, default: "" }; // Cloudinary secure_url sent by the frontend

const educationSchema = new Schema(
  {
    user: owner,
    institution: { type: String, required: true, trim: true, maxlength: 150 },
    qualification: { type: String, required: true, trim: true, maxlength: 100 },
    fieldOfStudy: str(100),
    grade: str(60),
    startDate: month,
    endDate: month,
    isCurrent: { type: Boolean, default: false },
    certificateUrl: media,
    verified: { type: Boolean, default: false }, // set by staff only
  },
  { timestamps: true }
);

const workSchema = new Schema(
  {
    user: owner,
    company: { type: String, required: true, trim: true, maxlength: 120 },
    jobTitle: { type: String, required: true, trim: true, maxlength: 100 },
    employmentType: str(40),
    location: str(100),
    startDate: { ...month, required: true },
    endDate: month,
    isCurrent: { type: Boolean, default: false },
    description: str(2000),
    referenceLetter: media,
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const certificateSchema = new Schema(
  {
    user: owner,
    name: { type: String, required: true, trim: true, maxlength: 150 },
    issuer: { type: String, required: true, trim: true, maxlength: 150 },
    issueDate: month,
    expiryDate: month,
    credentialId: str(80),
    credentialUrl: str(300), // external verification link
    file: media,
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const guarantorSchema = new Schema(
  {
    user: owner,
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    relationship: { type: String, required: true, trim: true, maxlength: 50 },
    phoneNumber: { type: String, required: true, trim: true },
    email: str(120),
    occupation: str(100),
    address: str(200),
    yearsKnown: { type: Number, min: 0, max: 80, default: null },
    idType: str(40),
    idCard: media,
    photo: media,
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Names match the refs already on your User schema
export const Education = mongoose.models.educationModel || mongoose.model("educationModel", educationSchema);
export const Work = mongoose.models.workModel || mongoose.model("workModel", workSchema);
export const Certificate = mongoose.models.certificateModel || mongoose.model("certificateModel", certificateSchema);
export const Guarantor = mongoose.models.guarantorModel || mongoose.model("guarantorModel", guarantorSchema);