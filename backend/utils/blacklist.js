// Shared blacklist rules, used by the controller, middleware and login.

// The superadmin can blacklist these roles. Superadmins can never be blacklisted.
export const ELIGIBLE_ROLES = ["jobseeker", "employer", "admin", "agent"];

export const CATEGORIES = [
  "fraud",
  "fake_documents",
  "impersonation",
  "harassment",
  "spam",
  "non_payment",
  "inappropriate_content",
  "policy_violation",
  "other",
];

export const REASON_MIN = 10;
export const REASON_MAX = 1000;

export const displayName = (u) =>
  (u?.role === "employer" && u?.companyName) ||
  [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
  u?.email ||
  "Unknown user";

// Sent to a blacklisted user when they try to log in or use an old token.
// The frontend looks for `code === "ACCOUNT_BLACKLISTED"`.
export const blacklistedResponse = (user) => ({
  success: false,
  code: "ACCOUNT_BLACKLISTED",
  message: "Your account has been blacklisted and you can no longer use this platform.",
  reason: user?.blacklistReason || "",
  blacklistedAt: user?.blacklistedAt || null,
});

// ---- Optional side effects -------------------------------------------------
// Put anything that should happen when someone is blacklisted / reinstated here.
// Examples are commented out because they depend on your Job / Application models.

export const afterBlacklist = async (user) => {
  // if (user.role === "employer") {
  //   await Job.updateMany({ employer: user._id, status: "Open" }, { status: "Suspended" });
  // }
  // if (user.role === "jobseeker") {
  //   await Application.updateMany({ applicant: user._id, status: "Pending" }, { status: "Withdrawn" });
  // }
};

export const afterLift = async (user) => {
  // if (user.role === "employer") {
  //   await Job.updateMany({ employer: user._id, status: "Suspended" }, { status: "Open" });
  // }
};
