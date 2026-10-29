import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

import crypto from "crypto";
export const ROLES = {
  JOBSEEKER: "jobseeker",
  EMPLOYER: "employer",
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  AGENT: "agent",
};

const isEmployer = function () {
  return this.role === ROLES.EMPLOYER;
};



// No 0/O/1/I so codes are easy to read out
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const generateReferralCode = () =>
  Array.from(crypto.randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join("");

// Everyone except job seekers must have a real password
// (job seekers created by admin/agent get "none" until they set one)
const needsPassword = function () {
  return this.role !== ROLES.JOBSEEKER;
};

// Fields shared by every identity-verification provider result
const providerFields = {
  sessionId: String,
  status: String,
  source: String,
  provider: String,
  matched_name: String,
  first_name: String,
  last_name: String,
  middle_name: String,
  date_of_birth: String,
  gender: String,
  phone_number: String,
  state_of_origin: String,
  photo: String,
  confidence: String,
  cost: String,
};

const userSchema = new Schema(
  {
    // ============ ROLE ============
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.JOBSEEKER,
      required: true,
      index: true,
    },

    // ============ COMMON ============
    email: { type: String, unique: true,  },
    password: { type: String, required: needsPassword },
    phoneNumber: { type: String, required: isEmployer },
    whatsappNumber: { type: String },
    avatar: { type: String, default: "" },
    address: { type: String, required: isEmployer },
    state: { type: String, required: isEmployer },
    localGovernment: { type: String, required: isEmployer },
    country: { type: String, required: isEmployer },
welcomeBonusGiven: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: true },
    isBlacklisted: { type: Boolean, default: false },
    lastLogin: { type: Date, default: Date.now },

    uniqueNumber: { type: String, unique: true, default: () => uuidv4() },

    // inside the schema, under COMMON
  loyaltyPoints: { type: Number, default: 0, min: 0 },
  referralCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
  referredBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  referralRewarded: { type: Boolean, default: false }, // stops double rewards
  referralCount: { type: Number, default: 0 },

    // auth / otp
    resetPasswordToken: String,
    resetPaswordExpiresAt: Date, // (typo kept so existing controllers keep working)
    emailOtp: String,
    otpExpiresAt: Date,
    pendingToken: String,

    // relations that exist on both sides
    // seeker -> employers they work for | employer -> seekers they employ
    employers: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    jobOffers: { type: [Schema.Types.ObjectId], ref: "offerModel", default: [] },
    notifications: { type: [Schema.Types.ObjectId], ref: "notificationModel", default: [] },

    // seeker -> jobSeekerReportModel / employer -> jobEmployerReport
    reportsMade: [{ type: Schema.Types.ObjectId, refPath: "reportsMadeModel" }],
    reportsMadeModel: { type: String, enum: ["jobSeekerReportModel", "jobEmployerReport"] },
    // seeker -> jobEmployerReport / employer -> jobSeekerReportModel
    reportsGotten: [{ type: Schema.Types.ObjectId, refPath: "reportsGottenModel" }],
    reportsGottenModel: { type: String, enum: ["jobSeekerReportModel", "jobEmployerReport"] },



    // ============ WHO CREATED THIS ACCOUNT ============
    registrationMethod: {
      type: String,
      enum: ["self", "admin", "superadmin", "agent", "marketer"],
      default: "self",
    },
    createdByAdmin: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdByAdminName: { type: String, default: null },
    createdByAdminEmail: { type: String, default: null },
    createdByMarketer: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdByMarketerName: { type: String, default: null },
    createdByMarketerEmail: { type: String, default: null },
    jobRequestsMade: [{ type: Schema.Types.ObjectId, ref: "JobRequest" }],

    // ============ JOBSEEKER ONLY ============
    firstName: { type: String },
    lastName: { type: String },
    middleName: { type: String },
    dateOfBirth: { type: String },
  
    race: { type: String },
    dissability: { type: String },
    gender: { type: String },
    maritalStatus: { type: String, default: "single" },
    educationLevel: { type: String, default: "none" },
    jobMode: { type: String },
    jobDecision: { type: String, default: "jobSeeker" },
    jobDecisionSalary: { type: String },
    job: { type: String },
    TIN: { type: String },

    liveAlone: { type: String },
    whoDoYouLiveWith: { type: String },
    rentFee: { type: String },
    landlordNumber: { type: String },
    scanningEvidence: { type: String },
    tenancyAgreement: { type: String },
    numberOfRooms: { type: String },
    numberOfPeople: { type: String },

    criminalRecord: { type: String },
    when: { type: Date },
    where: { type: String },
    incident: { type: String },
    natureOfOffence: { type: String },

    anyChild: { type: String },
    numberOfChildren: { type: String },
    workingMode: { type: String },
    minimumSalary: { type: String },
    leastSalary: { type: String },
    workOutside: { type: String },
    km: { type: String },

    facebookHandle: { type: String },
    instagramHandle: { type: String },
    tiktokHandle: { type: String },
    handworkSkill: { type: String },
    specifyHandworkSkill: { type: String },
    registeredEverify: { type: String },
    votersCard: { type: String },
    residentialCard: { type: String },

    bankName: { type: String },
    bankAcctName: { type: String },
    bankAcctNum: { type: String },
    accountBalance: { type: Number, default: 0 },

    isNINVerified: { type: Boolean, default: false },
    nextOfKin: { type: String },
    nextOfKinNumber: { type: Number },
    nextOfKinAddress: { type: String },
    nextOfKinRelationship: { type: String },

    appliedJobs: { type: [Schema.Types.ObjectId], ref: "applicationModel" },
    interestedJob: { type: [String] },
    availabilityForUrgentWork: { type: Boolean, default: false },
    availability: { type: Object, default: {} },
    resume: { type: [String] },
    jobChoice: { type: [String] },
    education: { type: [Schema.Types.ObjectId], ref: "educationModel" },
    workExperience: { type: [Schema.Types.ObjectId], ref: "workModel" },
    certificates: { type: [Schema.Types.ObjectId], ref: "certificateModel" },
    guarantors: { type: [Schema.Types.ObjectId], ref: "guarantorModel" },
    hiredHistory: { type: [Schema.Types.ObjectId], ref: "hiredModel" },
    benefits: { type: [Schema.Types.ObjectId], ref: "benefitSchema" },
    jobRequestsReceived: [{ type: Schema.Types.ObjectId, ref: "JobRequest" }],
    faceData: { type: String },

    isCertified: { type: Boolean, default: false },
    certifiedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    certificationDate: { type: Date, default: null },
    guarantorVerified: { type: Boolean, default: false },
    guarantorDate: { type: Date, default: null },

    // ============ EMPLOYER ONLY ============
    companyName: { type: String, required: isEmployer }, // unique index below
    size: { type: String, required: isEmployer },
    employerType: { type: String, required: isEmployer },
    contactPerson: { type: Schema.Types.ObjectId, ref: "contact" },
    proofOfCompany: { type: [Schema.Types.ObjectId], ref: "proofOfCompany", default: [] },
    listedJobs: { type: [Schema.Types.ObjectId], ref: "jobModel", default: [] },
    certificate: { type: String },
    aboutUs: { type: String },
    followers: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    followerCount: { type: Number, default: 0 },
    postHistory: [{ type: Schema.Types.ObjectId, ref: "ServicePost", default: [] }],
    applicationHistory: [{ type: Schema.Types.ObjectId, ref: "Application", default: [] }],
    addressVerified: { type: Boolean, default: false },
    businessVerified: { type: Boolean, default: false },
    verification: { type: Schema.Types.ObjectId, ref: "EmployerVerification", default: null },
       yearOfEstablishment: { type: Number },
   companyPhone: { type: String },



    identityVerification: {
      nin: {
        number: { type: String, select: false },
        last4: String,
        verified: { type: Boolean, default: false },
        matchedName: String,
        verifiedAt: Date,
        ...providerFields,
      },
      bvn: {
        number: { type: String, select: false },
        last4: String,
        verified: { type: Boolean, default: false },
        matchedName: String,
        verifiedAt: Date,
        ...providerFields,
      },
      votersCard: {
        vin: { type: String, select: false },
        last4: String,
        imageUrl: String,
        verified: { type: Boolean, default: false },
        matchedName: String,
        verifiedAt: Date,
        ...providerFields,
      },
      driverLicense: {
        number: { type: String, select: false },
        last4: String,
        verified: { type: Boolean, default: false },
        matchedName: String,
        expiryDate: Date,
        verifiedAt: Date,
        ...providerFields,
      },
      passport: {
        number: { type: String, select: false },
        last4: String,
        verified: { type: Boolean, default: false },
        matchedName: String,
        expiryDate: Date,
        verifiedAt: Date,
        sessionId: String,
      },
      cac: {
        rcNumber: { type: String, select: false },
        last4: String,
        verified: { type: Boolean, default: false },
        matchedBusinessName: String,
        registrationDate: Date,
        verifiedAt: Date,
        ...providerFields,
      },
      approved: { type: Boolean, default: false, index: true },
      lastAttemptAt: Date,
    },
  },
  { timestamps: true }
);

// companyName is only unique among documents that actually have one
userSchema.index(
  { companyName: 1 },
  { unique: true, partialFilterExpression: { companyName: { $type: "string" } } }
);

// Role-based defaults (done here so they can depend on `role`)
userSchema.pre("validate", function () {
  if (this.role === ROLES.JOBSEEKER) {
    for (const field of ["password", "address", "state", "localGovernment", "country", "phoneNumber", "jobMode"]) {
      if (!this[field]) this[field] = "none";
    }
  }

  if (this.role === ROLES.EMPLOYER) {
    this.reportsMadeModel = "jobEmployerReport";
    this.reportsGottenModel = "jobSeekerReportModel";
  } else {
    this.reportsMadeModel = "jobSeekerReportModel";
    this.reportsGottenModel = "jobEmployerReport";
  }
});

// Convenience helpers
userSchema.methods.hasRole = function (...roles) {
  return roles.includes(this.role);
};
userSchema.virtual("isStaff").get(function () {
  return [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.AGENT].includes(this.role);
});

userSchema.virtual("profileCompletion").get(function () {
  return 75; // placeholder - better to calculate in controller for flexibility
});

// every new account gets a code, even with validateBeforeSave: false
userSchema.pre("save", function () {
  if (!this.referralCode) this.referralCode = generateReferralCode();
});

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;