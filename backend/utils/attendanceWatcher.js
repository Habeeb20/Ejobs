import User from "../models/User.js";
import Benefit, { BENEFIT_STATUS } from "../models/Benefit.js";

/**
 * Blacklists every beneficiary whose venue check-in is overdue.
 * Safe to run repeatedly: benefits already flagged are skipped.
 */
export const enforceAttendance = async () => {
  const now = new Date();

  const overdue = await Benefit.find({
    status: { $in: [BENEFIT_STATUS.APPROVED, BENEFIT_STATUS.PAID] },
    absenceFlagged: false,
    nextAttendanceDue: { $lt: now },
  }).select("_id user");

  if (!overdue.length) return { blacklisted: 0 };

  const userIds = [...new Set(overdue.map((b) => String(b.user)))];

  await User.updateMany({ _id: { $in: userIds } }, { $set: { isBlacklisted: true } });
  await Benefit.updateMany(
    { _id: { $in: overdue.map((b) => b._id) } },
    { $set: { absenceFlagged: true, absenceFlaggedAt: now } }
  );

  return { blacklisted: userIds.length };
};

/** Call once after the database connects. Runs immediately, then every hour. */
export const startAttendanceWatcher = (everyMs = 60 * 60 * 1000) => {
  const run = () =>
    enforceAttendance()
      .then((r) => r.blacklisted && console.log(`[benefits] blacklisted ${r.blacklisted} absent beneficiaries`))
      .catch((err) => console.error("[benefits] attendance check failed:", err));

  run();
  const timer = setInterval(run, everyMs);
  timer.unref?.();
  return timer;
};