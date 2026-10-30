import mongoose from "mongoose";
import User, { ROLES } from "../models/User.js";
import { Education, Work, Certificate, Guarantor } from "../models/ProfileSection.js";
import { getCompletion } from "./profile.controller.js";
import Application from "../models/Application.js";
import Job from "../models/Job.js"
import { PLANS } from "../config/plans.js";
const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });

export const jobseekerOnly = (req, res, next) =>
  req.user?.role === ROLES.JOBSEEKER ? next() : fail(res, 403, "Only job seekers can use this section");

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */
// Media fields are Cloudinary URLs uploaded by the frontend, never files
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

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

const V = {
  text: (v, r) => {
    if (typeof v !== "string") return { error: "Must be text" };
    const s = v.trim();
    return s.length > r.max ? { error: `Maximum ${r.max} characters` } : { value: s };
  },
  month: (v) => (typeof v === "string" && MONTH.test(v) ? { value: v } : { error: "Use the format YYYY-MM" }),
  bool: (v) => (typeof v === "boolean" ? { value: v } : { error: "Must be true or false" }),
  int: (v, r) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= r.min && n <= r.max ? { value: n } : { error: `Enter a number from ${r.min} to ${r.max}` };
  },
  phone: (v) => {
    const s = String(v).replace(/[\s()-]/g, "");
    return /^\+?\d{10,15}$/.test(s) ? { value: s } : { error: "Enter a valid phone number" };
  },
  email: (v) => {
    const s = String(v).trim().toLowerCase();
    return /^\S+@\S+\.\S+$/.test(s) && s.length <= 120 ? { value: s } : { error: "Enter a valid email address" };
  },
  url: (v) => {
    try {
      const u = new URL(String(v).trim());
      return ["http:", "https:"].includes(u.protocol) && u.href.length <= 300 ? { value: u.href } : { error: "Enter a valid link" };
    } catch {
      return { error: "Enter a valid link (https://…)" };
    }
  },
  media: (v) =>
    typeof v === "string" && isCloudinaryUrl(v)
      ? { value: v }
      : { error: "Upload the file to Cloudinary first, then send its URL" },
};

const t = (max, required = false) => ({ kind: "text", max, required });
const month = (required = false) => ({ kind: "month", required });
const media = { kind: "media" };

const SECTIONS = {
  education: {
    Model: Education, userField: "education", limit: 10, noun: "education",
    sort: { isCurrent: -1, startDate: -1, createdAt: -1 },
    rules: {
      institution: t(150, true), qualification: t(100, true), fieldOfStudy: t(100), grade: t(60),
      startDate: month(), endDate: month(), isCurrent: { kind: "bool" }, certificateUrl: media,
    },
  },
  work: {
    Model: Work, userField: "workExperience", limit: 20, noun: "work experience",
    sort: { isCurrent: -1, startDate: -1, createdAt: -1 },
    rules: {
      company: t(120, true), jobTitle: t(100, true), employmentType: t(40), location: t(100),
      startDate: month(true), endDate: month(), isCurrent: { kind: "bool" },
      description: t(2000), referenceLetter: media,
    },
  },
  certificates: {
    Model: Certificate, userField: "certificates", limit: 20, noun: "certificate",
    sort: { issueDate: -1, createdAt: -1 },
    rules: {
      name: t(150, true), issuer: t(150, true), issueDate: month(), expiryDate: month(),
      credentialId: t(80), credentialUrl: { kind: "url" }, file: media,
    },
  },
  guarantors: {
    Model: Guarantor, userField: "guarantors", limit: 3, noun: "guarantor",
    sort: { createdAt: 1 },
    rules: {
      fullName: t(100, true), relationship: t(50, true), phoneNumber: { kind: "phone", required: true },
      email: { kind: "email" }, occupation: t(100), address: t(200),
      yearsKnown: { kind: "int", min: 0, max: 80 }, idType: t(40), idCard: media, photo: media,
    },
  },
};

// "" / null clears an optional field; required fields can't be blank
const clean = (rules, body, partial) => {
  const values = {};
  const errors = {};
  for (const [field, rule] of Object.entries(rules)) {
    if (partial && !(field in body)) continue;
    const raw = body[field];
    if (raw === undefined || raw === null || raw === "") {
      if (rule.required) errors[field] = "This field is required";
      else values[field] = rule.kind === "int" ? null : rule.kind === "bool" ? false : "";
      continue;
    }
    const res = V[rule.kind](raw, rule);
    if (res.error) errors[field] = res.error;
    else values[field] = res.value;
  }
  return { values, errors };
};

// `m` is the full record (merged with the update); `values` is what gets written
const crossCheck = (key, m, errors, values) => {
  if (key === "education" || key === "work") {
    if (m.isCurrent) values.endDate = "";
    else if (m.startDate && m.endDate && m.endDate < m.startDate) errors.endDate = "End date can't be before the start date";
  }
  if (key === "certificates" && m.issueDate && m.expiryDate && m.expiryDate < m.issueDate)
    errors.expiryDate = "Expiry can't be before the issue date";
};

const oops = (res, err, where) => {
  if (err.name === "ValidationError") {
    const errors = Object.fromEntries(Object.entries(err.errors).map(([k, e]) => [k, e.message]));
    return fail(res, 400, Object.values(errors)[0], { errors });
  }
  console.error(`${where}:`, err);
  fail(res, 500, "Something went wrong. Please try again.");
};

const completionFor = async (uid) => getCompletion(await User.findById(uid));

/* ------------------------------------------------------------------ */
/* CRUD for the four sections                                          */
/* ------------------------------------------------------------------ */
const makeHandlers = (key) => {
  const cfg = SECTIONS[key];
  const owned = (req) => ({ _id: req.params.id, user: req.user._id });

  return {
    list: async (req, res) => {
      try {
        const items = await cfg.Model.find({ user: req.user._id }).sort(cfg.sort).lean();
        res.json({ success: true, items, limit: cfg.limit });
      } catch (err) {
        oops(res, err, `${key}.list`);
      }
    },

    create: async (req, res) => {
      try {
        const uid = req.user._id;
        if ((await cfg.Model.countDocuments({ user: uid })) >= cfg.limit)
          return fail(res, 409, `You can add up to ${cfg.limit} ${cfg.noun} entries`);

        const { values, errors } = clean(cfg.rules, req.body || {}, false);
        crossCheck(key, values, errors, values);
        if (Object.keys(errors).length) return fail(res, 400, "Please fix the highlighted fields", { errors });

        const item = await cfg.Model.create({ ...values, user: uid });
        await User.updateOne({ _id: uid }, { $addToSet: { [cfg.userField]: item._id } });
        res.status(201).json({ success: true, item, completion: await completionFor(uid) });
      } catch (err) {
        oops(res, err, `${key}.create`);
      }
    },

    update: async (req, res) => {
      try {
        if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "Not found");
        const doc = await cfg.Model.findOne(owned(req));
        if (!doc) return fail(res, 404, "Not found");

        const { values, errors } = clean(cfg.rules, req.body || {}, true);
        crossCheck(key, { ...doc.toObject(), ...values }, errors, values);
        if (Object.keys(errors).length) return fail(res, 400, "Please fix the highlighted fields", { errors });

        doc.set(values);
        if (doc.isModified() && doc.verified) doc.verified = false; // edited records need re-verifying
        await doc.save();
        res.json({ success: true, item: doc, completion: await completionFor(req.user._id) });
      } catch (err) {
        oops(res, err, `${key}.update`);
      }
    },

    remove: async (req, res) => {
      try {
        if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "Not found");
        const { deletedCount } = await cfg.Model.deleteOne(owned(req));
        if (!deletedCount) return fail(res, 404, "Not found");
        await User.updateOne({ _id: req.user._id }, { $pull: { [cfg.userField]: req.params.id } });
        res.json({ success: true, completion: await completionFor(req.user._id) });
      } catch (err) {
        oops(res, err, `${key}.remove`);
      }
    },
  };
};

export const sectionHandlers = Object.fromEntries(Object.keys(SECTIONS).map((k) => [k, makeHandlers(k)]));

/* ------------------------------------------------------------------ */
/* CV: data, editable settings, saved files                            */
/* ------------------------------------------------------------------ */
const CV_DEFAULTS = {
  summary: "", skills: [], languages: [], interests: [], template: "modern", accent: "#c2410c",
  showPhoto: true, showAddress: true, showPersonal: true, hidden: [], pdfUrl: "", wordUrl: "",
};
const cvOf = (user) => ({ ...CV_DEFAULTS, ...(user.toObject().cv || {}) });

const HIDEABLE = ["skills", "languages", "interests", "certificates"];
const list = (max, itemMax) => (v) => {
  if (!Array.isArray(v)) return { error: "Must be a list" };
  const out = [...new Set(v.map((x) => String(x ?? "").trim()).filter(Boolean))];
  return out.length > max || out.some((x) => x.length > itemMax)
    ? { error: `Up to ${max} items of ${itemMax} characters each` }
    : { value: out };
};
const flag = (v) => (typeof v === "boolean" ? { value: v } : { error: "Must be true or false" });

const CV_RULES = {
  summary: (v) => (typeof v === "string" && v.trim().length <= 1200 ? { value: v.trim() } : { error: "Maximum 1200 characters" }),
  skills: list(25, 40),
  languages: list(10, 40),
  interests: list(10, 40),
  template: (v) => (["modern", "classic"].includes(v) ? { value: v } : { error: "Unknown template" }),
  accent: (v) => (/^#[0-9a-fA-F]{6}$/.test(String(v)) ? { value: String(v).toLowerCase() } : { error: "Invalid colour" }),
  showPhoto: flag,
  showAddress: flag,
  showPersonal: flag,
  hidden: (v) =>
    Array.isArray(v) && v.every((x) => HIDEABLE.includes(x)) ? { value: [...new Set(v)] } : { error: "Unknown section" },
};

const PROFILE_FIELDS = [
  "firstName", "middleName", "lastName", "email", "phoneNumber", "whatsappNumber", "avatar",
  "address", "state", "localGovernment", "gender", "dateOfBirth", "maritalStatus",
  "educationLevel", "job", "jobMode",
];
export const blank = (v) => (v == null || String(v).trim().toLowerCase() === "none" ? "" : v);

// Everything the CV needs in one call
export const getCv = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 404, "Account not found");
    const q = { user: user._id };
    const [education, work, certificates] = await Promise.all([
      Education.find(q).sort(SECTIONS.education.sort).lean(),
      Work.find(q).sort(SECTIONS.work.sort).lean(),
      Certificate.find(q).sort(SECTIONS.certificates.sort).lean(),
    ]);
    const profile = Object.fromEntries(PROFILE_FIELDS.map((k) => [k, blank(user[k])]));
    profile.jobChoice = user.jobChoice || [];
    res.json({ success: true, cv: cvOf(user), profile, education, work, certificates });
  } catch (err) {
    oops(res, err, "getCv");
  }
};

export const saveCv = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 404, "Account not found");
    const errors = {};
    const body = req.body || {};
    for (const [k, check] of Object.entries(CV_RULES)) {
      if (!(k in body)) continue;
      const r = check(body[k]);
      if (r.error) errors[k] = r.error;
      else user.set(`cv.${k}`, r.value);
    }
    if (Object.keys(errors).length) return fail(res, 400, "Please fix the highlighted fields", { errors });
    await user.save({ validateModifiedOnly: true });
    res.json({ success: true, cv: cvOf(user) });
  } catch (err) {
    oops(res, err, "saveCv");
  }
};

// The frontend has already uploaded the PDF / Word file to Cloudinary and sends the strings here
export const attachCv = async (req, res) => {
  try {
    const { pdfUrl, wordUrl } = req.body || {};
    if (!pdfUrl && !wordUrl) return fail(res, 400, "Send a pdfUrl or a wordUrl");
    for (const [name, v] of [["pdfUrl", pdfUrl], ["wordUrl", wordUrl]])
      if (v && !isCloudinaryUrl(v)) return fail(res, 400, `${name} must be a Cloudinary URL`, { errors: { [name]: "Invalid file URL" } });

    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 404, "Account not found");

    let resumeAdded = false;
    if (pdfUrl) {
      // Make the PDF selectable on job applications (the apply form lists user.resume), max 3 résumés
      const previous = user.cv?.pdfUrl;
      const rest = (user.resume || []).filter((u) => u && u !== previous);
      if (rest.length < 3) {
        user.resume = [pdfUrl, ...rest];
        resumeAdded = true;
      }
      user.set("cv.pdfUrl", pdfUrl);
    }
    if (wordUrl) user.set("cv.wordUrl", wordUrl);
    user.set("cv.filesUpdatedAt", new Date());

    await user.save({ validateModifiedOnly: true });
    res.json({ success: true, cv: cvOf(user), resumeAdded });
  } catch (err) {
    oops(res, err, "attachCv");
  }
};

export const removeCvFile = async (req, res) => {
  try {
    const { format } = req.params;
    if (!["pdf", "word"].includes(format)) return fail(res, 400, "Unknown format");
    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 404, "Account not found");

    if (format === "pdf") {
      const url = user.cv?.pdfUrl;
      user.set("cv.pdfUrl", "");
      if (url) user.resume = (user.resume || []).filter((u) => u !== url);
    } else {
      user.set("cv.wordUrl", "");
    }
    await user.save({ validateModifiedOnly: true });
    res.json({ success: true, cv: cvOf(user) });
  } catch (err) {
    oops(res, err, "removeCvFile");
  }
};






/* ------------------------------------------------------------------ */
/* Employer view of an applicant                                       */
/* ------------------------------------------------------------------ */
// Bank details, next of kin, ID documents, guarantor contacts, password and tokens are left out on purpose
const APPLICANT_FIELDS = [
  "firstName middleName lastName email phoneNumber whatsappNumber avatar gender dateOfBirth maritalStatus",
  "address state localGovernment country educationLevel job jobMode jobChoice minimumSalary",
  "availabilityForUrgentWork isCertified guarantorVerified isNINVerified createdAt cv",
].join(" ");

// Keep this in step with getApplicants: applicants hidden by the plan limit must stay hidden here too
const isVisibleApplicant = async (job, application) => {
  const plan = PLANS[job.jobType];
  if (!plan?.maxApplicants || plan.maxApplicants === Infinity) return true;
  const order = plan.matchScore ? { matchScore: -1, createdAt: 1 } : { createdAt: 1 };
  const open = await Application.find({ job: job._id }).sort(order).limit(plan.maxApplicants).select("_id").lean();
  return open.some((a) => String(a._id) === String(application._id));
};

// Same shape as getCv, so the frontend can render the applicant's CV with the same components
export const getApplicantProfile = async (req, res) => {
  try {
    const { appId } = req.params;
    if (!mongoose.isValidObjectId(appId)) return fail(res, 404, "Application not found");

    const isStaff = [ROLES.ADMIN, ROLES.SUPERADMIN].includes(req.user.role);
    if (!isStaff && req.user.role !== ROLES.EMPLOYER) return fail(res, 403, "Not allowed");

    const application = await Application.findById(appId).select("job applicant").lean();
    if (!application) return fail(res, 404, "Application not found");

    // 404 rather than 403 when the job isn't theirs, so ids can't be probed
    const job = await Job.findOne(isStaff ? { _id: application.job } : { _id: application.job, employer: req.user._id })
      .select("jobType employer")
      .lean();
    if (!job) return fail(res, 404, "Application not found");

    if (!isStaff && !(await isVisibleApplicant(job, application)))
      return fail(res, 403, "Post on a higher plan to open this applicant");

    const user = await User.findById(application.applicant).select(APPLICANT_FIELDS);
    if (!user) return fail(res, 404, "This applicant no longer exists");

    const q = { user: user._id };
    console.log(user._id)
    const [education, work, certificates] = await Promise.all([
      Education.find(q)?.sort(SECTIONS.education?.sort).lean(),
      Work.find(q)?.sort(SECTIONS.work?.sort).lean(),
      Certificate.find(q)?.sort(SECTIONS.certificates?.sort).lean(),
    ]);

    const obj = user.toObject();
    delete obj.cv;
    const profile = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Array.isArray(v) ? v : blank(v)]));

    res.json({ success: true, cv: cvOf(user), profile, education, work, certificates });
  } catch (err) {
    console.log( err.message, );
  }
};