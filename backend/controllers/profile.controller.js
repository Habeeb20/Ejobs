import User, { ROLES } from "../models/User.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import { PLANS } from "../config/plans.js";
import mongoose from "mongoose";
import { Education, Work, Certificate } from "../models/ProfileSection.js";
import { blank } from "./proflleSection.controller.js";
const fail = (res, status, message, extra = {}) =>
  res.status(status).json({ success: false, message, ...extra });

/* ------------------------------------------------------------------ */
/* Which fields each role may edit (everything else is ignored)        */
/* ------------------------------------------------------------------ */
const PERSONAL = ["avatar", "firstName", "lastName", "gender", "phoneNumber", "whatsappNumber"];
const ADDRESS = ["address", "state", "localGovernment"];
const BANK = ["bankName", "bankAcctName", "bankAcctNum"];
const SEEKER = [
  "middleName", "dateOfBirth", "maritalStatus", "educationLevel", "job", "jobMode", "jobChoice",
  "minimumSalary", "availabilityForUrgentWork", "resume", "votersCard", "residentialCard",
  "scanningEvidence", "tenancyAgreement", "nextOfKin", "nextOfKinRelationship",
  "nextOfKinNumber", "nextOfKinAddress",
];
const EMPLOYER = [
  "avatar", "firstName", "lastName", "phoneNumber", "whatsappNumber", "companyPhone",
  "companyName", "employerType", "size", "yearOfEstablishment", "aboutUs", "certificate",
  ...ADDRESS,
];

const EDITABLE = {
  [ROLES.JOBSEEKER]: [...PERSONAL, ...ADDRESS, ...BANK, ...SEEKER],
  [ROLES.EMPLOYER]: EMPLOYER,
  [ROLES.AGENT]: [...PERSONAL, ...ADDRESS, ...BANK],
  [ROLES.ADMIN]: [...PERSONAL, ...ADDRESS],
  [ROLES.SUPERADMIN]: [...PERSONAL, ...ADDRESS],
};

/* ------------------------------------------------------------------ */
/* Completion: section keys match the frontend tab keys                */
/* ------------------------------------------------------------------ */
const STAFF_SECTIONS = {
  personal: ["avatar", "firstName", "lastName", "gender", "phoneNumber"],
  address: ADDRESS,
};
const SECTIONS = {
  [ROLES.JOBSEEKER]: {
    personal: ["avatar", "firstName", "lastName", "dateOfBirth", "gender", "phoneNumber"],
    address: ADDRESS,
    career: ["educationLevel", "job", "jobMode", "minimumSalary", "jobChoice", "resume"],
     education: ["education"],
  work: ["workExperience"],
  certificates: ["certificates"],
    documents: ["votersCard", "residentialCard", "scanningEvidence", "tenancyAgreement"],
    guarantors: ["guarantors"],
    nextOfKin: ["nextOfKin", "nextOfKinRelationship", "nextOfKinNumber", "nextOfKinAddress"],
    bank: BANK,
  },
  [ROLES.EMPLOYER]: {
    company: ["avatar", "companyName", "employerType", "size", "yearOfEstablishment", "aboutUs"],
    contact: ["firstName", "lastName", "phoneNumber", "companyPhone"],
    address: ADDRESS,
    documents: ["certificate"],
  },

  [ROLES.AGENT]: { ...STAFF_SECTIONS, bank: BANK },
  [ROLES.ADMIN]: STAFF_SECTIONS,
  [ROLES.SUPERADMIN]: STAFF_SECTIONS,
};

// Jobseekers get "none" written into unfilled fields by the model's pre-validate hook
const isFilled = (v) =>
  Array.isArray(v)
    ? v.length > 0
    : v !== undefined && v !== null && String(v).trim() !== "" && String(v).trim().toLowerCase() !== "none";

export const getCompletion = (user) => {
  const sections = {};
  const missing = [];
  let filled = 0;
  let total = 0;

  for (const [name, fields] of Object.entries(SECTIONS[user.role] || {})) {
    const done = fields.filter((f) => isFilled(user[f]));
    fields.filter((f) => !isFilled(user[f])).forEach((f) => missing.push(f));
    filled += done.length;
    total += fields.length;
    sections[name] = {
      filled: done.length,
      total: fields.length,
      percent: Math.round((done.length / fields.length) * 100),
    };
  }
  return { percent: total ? Math.round((filled / total) * 100) : 100, filled, total, sections, missing };
};

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */
// Media fields are Cloudinary URLs uploaded by the frontend, never files.
const isCloudinaryUrl = (v) => {
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" || u.hostname !== "res.cloudinary.com") return false;
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    return !cloud || u.pathname.startsWith(`/${cloud}/`);
  } catch {
    return false;
  }
};

const str = (max = 100) => ({ kind: "string", max });
const phone = { kind: "phone" };
const media = { kind: "media" };

const RULES = {
  avatar: media, votersCard: media, residentialCard: media,
  scanningEvidence: media, tenancyAgreement: media, certificate: media,
  resume: { kind: "mediaList", max: 3 },

  firstName: str(50), middleName: str(50), lastName: str(50),
  gender: str(30), maritalStatus: str(30), educationLevel: str(60),
  jobMode: str(40), job: str(100),
  dateOfBirth: { kind: "date" },

  phoneNumber: phone, whatsappNumber: phone, companyPhone: phone, nextOfKinNumber: phone,
  address: str(200), state: str(60), localGovernment: str(80),
  nextOfKin: str(100), nextOfKinRelationship: str(50), nextOfKinAddress: str(200),

  minimumSalary: { kind: "money" },
  jobChoice: { kind: "choices", max: 3 },
  availabilityForUrgentWork: { kind: "boolean" },

  companyName: str(120), employerType: str(40), size: str(30),
  yearOfEstablishment: { kind: "year" }, aboutUs: str(1000),

  bankName: str(60), bankAcctName: str(100), bankAcctNum: { kind: "nuban" },
};

const VALIDATORS = {
  string: (v, { max }) => {
    if (typeof v !== "string") return { error: "Must be text" };
    const s = v.trim();
    return s.length > max ? { error: `Maximum ${max} characters` } : { value: s };
  },
  phone: (v) => {
    const s = String(v).replace(/[\s()-]/g, "");
    return /^\+?\d{10,15}$/.test(s) ? { value: s } : { error: "Enter a valid phone number" };
  },
  date: (v) => {
    if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: "Use the format YYYY-MM-DD" };
    const d = new Date(`${v}T00:00:00Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v || d.getUTCFullYear() < 1900)
      return { error: "Enter a valid date" };
    if (d > new Date()) return { error: "Date can't be in the future" };
    return { value: v };
  },
  money: (v) => {
    const s = String(v).replace(/[,\s₦]/g, "");
    return /^\d{1,10}$/.test(s) ? { value: s } : { error: "Enter an amount in numbers only" };
  },
  year: (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1800 && n <= new Date().getFullYear()
      ? { value: n }
      : { error: "Enter a valid year" };
  },
  nuban: (v) => (/^\d{10}$/.test(String(v).trim()) ? { value: String(v).trim() } : { error: "Account number must be 10 digits" }),
  boolean: (v) => (typeof v === "boolean" ? { value: v } : { error: "Must be true or false" }),
  media: (v) =>
    typeof v === "string" && isCloudinaryUrl(v)
      ? { value: v }
      : { error: "Upload the file to Cloudinary first, then send its URL" },
  mediaList: (v, { max }) => {
    if (!Array.isArray(v) || v.length > max) return { error: `Upload at most ${max} files` };
    return v.every((x) => typeof x === "string" && isCloudinaryUrl(x))
      ? { value: [...new Set(v)] }
      : { error: "Upload the files to Cloudinary first, then send their URLs" };
  },
  choices: (v, { max }) => {
    if (!Array.isArray(v)) return { error: "Must be a list" };
    const list = v.map((x) => String(x ?? "").trim()).filter(Boolean);
    if (list.some((x) => x.length > 60)) return { error: "Each choice can be at most 60 characters" };
    if (new Set(list.map((x) => x.toLowerCase())).size !== list.length)
      return { error: "Choices must be different from each other" };
    return list.length > max ? { error: `Pick at most ${max}` } : { value: list };
  },
};

// What "" / null means for each kind (clear the field)
const CLEARED = { mediaList: [], choices: [], year: null, boolean: false };

/* ------------------------------------------------------------------ */
/* Response shaping                                                    */
/* ------------------------------------------------------------------ */
const PRIVATE_FIELDS = [
  "password", "emailOtp", "otpExpiresAt", "resetPasswordToken", "resetPaswordExpiresAt",
  "pendingToken", "faceData", "identityVerification", "__v",
];

const toPublic = (user) => {
  const obj = user.toObject({ virtuals: false });
  PRIVATE_FIELDS.forEach((k) => delete obj[k]);
  return obj;
};

/**
 * @swagger
 * components:
 *   schemas:
 *     ProfileCompletion:
 *       type: object
 *       properties:
 *         percent: { type: integer, example: 62 }
 *         filled: { type: integer, example: 13 }
 *         total: { type: integer, example: 21 }
 *         missing:
 *           type: array
 *           items: { type: string }
 *           example: [bankName, votersCard]
 *         sections:
 *           type: object
 *           description: Completion per form section, keyed by section name
 *           additionalProperties:
 *             type: object
 *             properties:
 *               filled: { type: integer }
 *               total: { type: integer }
 *               percent: { type: integer }
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     tags: [Profile]
 *     summary: Get the logged-in user's profile and completion
 *     description: >
 *       Returns the profile used to prefill the profile forms, plus a completion
 *       breakdown. Secrets (password, OTP and reset tokens, identity verification
 *       data) are never returned. Unfilled jobseeker fields may come back as the
 *       placeholder "none".
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile loaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 user: { type: object, additionalProperties: true }
 *                 completion: { $ref: '#/components/schemas/ProfileCompletion' }
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getMe = async (req, res) => {
  try {
    // Re-fetch so the document always has every field, whatever the auth middleware selected
    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 404, "Account not found");
    res.json({ success: true, user: toPublic(user), completion: getCompletion(user) });
  } catch (err) {
    console.error("getMe:", err);
    fail(res, 500, "Could not load your profile. Please try again.");
  }
};

/**
 * @swagger
 * /users/profile:
 *   patch:
 *     tags: [Profile]
 *     summary: Update the logged-in user's profile (partial)
 *     description: >
 *       Send only the fields that changed. Allowed fields depend on the user's role;
 *       protected fields (role, email, password, balances and so on) and unknown fields
 *       are ignored. Send an empty string to clear a field.
 *
 *       **Media fields** (avatar, resume, votersCard, residentialCard, scanningEvidence,
 *       tenancyAgreement, certificate) must be Cloudinary strings. The frontend uploads
 *       the file to Cloudinary first and sends the resulting secure_url here, never the
 *       file itself.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               avatar: { type: string, format: uri, description: "Cloudinary secure_url", example: "https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg" }
 *               resume: { type: array, maxItems: 3, description: "Cloudinary secure_urls (jobseeker)", items: { type: string, format: uri } }
 *               votersCard: { type: string, format: uri, description: "Cloudinary secure_url (jobseeker)" }
 *               residentialCard: { type: string, format: uri, description: "Cloudinary secure_url (jobseeker)" }
 *               scanningEvidence: { type: string, format: uri, description: "Cloudinary secure_url (jobseeker)" }
 *               tenancyAgreement: { type: string, format: uri, description: "Cloudinary secure_url (jobseeker)" }
 *               certificate: { type: string, format: uri, description: "Cloudinary secure_url (employer)" }
 *               firstName: { type: string, example: Adaeze }
 *               middleName: { type: string, description: "Jobseeker only" }
 *               lastName: { type: string, example: Okafor }
 *               gender: { type: string, example: female }
 *               dateOfBirth: { type: string, example: "1998-04-21", description: "YYYY-MM-DD (jobseeker)" }
 *               maritalStatus: { type: string, description: "Jobseeker only" }
 *               phoneNumber: { type: string, example: "08012345678" }
 *               whatsappNumber: { type: string, example: "08012345678" }
 *               address: { type: string, example: 12 Allen Avenue }
 *               state: { type: string, example: Lagos }
 *               localGovernment: { type: string, example: Ikeja }
 *               educationLevel: { type: string, description: "Jobseeker only" }
 *               job: { type: string, description: "Current or most recent job (jobseeker)" }
 *               jobMode: { type: string, description: "Jobseeker only" }
 *               minimumSalary: { type: string, example: "150000", description: "Digits only (jobseeker)" }
 *               jobChoice: { type: array, maxItems: 3, description: "Up to 3 different choices (jobseeker)", items: { type: string } }
 *               availabilityForUrgentWork: { type: boolean, description: "Jobseeker only" }
 *               nextOfKin: { type: string, description: "Jobseeker only" }
 *               nextOfKinRelationship: { type: string, description: "Jobseeker only" }
 *               nextOfKinNumber: { type: string, description: "Jobseeker only" }
 *               nextOfKinAddress: { type: string, description: "Jobseeker only" }
 *               bankName: { type: string, description: "Jobseeker and agent" }
 *               bankAcctName: { type: string, description: "Jobseeker and agent" }
 *               bankAcctNum: { type: string, example: "0123456789", description: "10 digits (jobseeker and agent)" }
 *               companyName: { type: string, description: "Employer only" }
 *               employerType: { type: string, description: "Employer only" }
 *               size: { type: string, description: "Employer only" }
 *               yearOfEstablishment: { type: integer, example: 2015, description: "Employer only" }
 *               companyPhone: { type: string, description: "Employer only" }
 *               aboutUs: { type: string, description: "Employer only (max 1000 characters)" }
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Profile updated }
 *                 user: { type: object, additionalProperties: true }
 *                 completion: { $ref: '#/components/schemas/ProfileCompletion' }
 *       400:
 *         description: Validation failed. The errors object maps field names to messages.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string, example: Please fix the highlighted fields }
 *                 errors:
 *                   type: object
 *                   additionalProperties: { type: string }
 *                   example: { bankAcctNum: Account number must be 10 digits }
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: A company with this name is already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const updateProfile = async (req, res) => {
  try {
    // Re-fetch with every field: the jobseeker pre-validate hook would otherwise
    // write "none" over a password that wasn't selected
    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 404, "Account not found");

    const allowed = new Set(EDITABLE[user.role] || []);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const updates = {};
    const errors = {};

    for (const [field, raw] of Object.entries(body)) {
      if (!allowed.has(field)) continue; // protected, unknown or not for this role
      const rule = RULES[field];

      if (raw === "" || raw === null) {
        updates[field] = rule.kind in CLEARED ? CLEARED[rule.kind] : "";
        continue;
      }
      const result = VALIDATORS[rule.kind](raw, rule);
      if (result.error) errors[field] = result.error;
      else updates[field] = result.value;
    }

    if (Object.keys(errors).length) return fail(res, 400, "Please fix the highlighted fields", { errors });
    if (!Object.keys(updates).length) return fail(res, 400, "No valid fields to update");

    user.set(updates);
    // Only validate what changed, so an unfinished employer profile can still save one tab
    await user.save({ validateModifiedOnly: true });

    res.json({
      success: true,
      message: "Profile updated",
      user: toPublic(user),
      completion: getCompletion(user),
    });
  } catch (err) {
    if (err.code === 11000) return fail(res, 409, "A company with this name is already registered");
    if (err.name === "ValidationError") {
      const errors = Object.fromEntries(Object.entries(err.errors).map(([k, e]) => [k, e.message]));
      return fail(res, 400, Object.values(errors)[0], { errors });
    }
    console.error("updateProfile:", err);
    fail(res, 500, "Could not update your profile. Please try again.");
  }
};



























