import User, { ROLES } from "../models/User.js";
import { emitToUser, emailUser } from "./notify.js";
import { esc } from "./notify.js";

const CLIENT = process.env.CLIENT_URL || "http://localhost:5173";

// Tells every admin and super admin that an ad is waiting for review
export const notifyReviewers = async (ad) => {
  const reviewers = await User.find({ role: { $in: [ROLES.ADMIN, ROLES.SUPERADMIN] } }).select("email");
  for (const r of reviewers) {
    emitToUser(r._id, "ad:pending", { adId: ad._id, title: ad.title });
    emailUser(
      r.email,
      "An ad is waiting for review",
      "New ad to review",
      `<p>The ad <strong>${esc(ad.title)}</strong> has been paid for and is waiting for your approval.</p>`,
      { url: `${CLIENT}/dashboard?tab=ads`, label: "Review ads" }
    );
  }
};