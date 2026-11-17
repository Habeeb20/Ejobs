import mongoose from "mongoose";
import Interview from "../models/Interview.js";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import { applyStatusChange, cleanLine } from "../utils/engagement.js";
import { emitToUser } from "../utils/notify.js";
import { authorizeInterview, getIceServers } from "../services/interviewRTC.js";

const CLIENT = process.env.CLIENT_URL || "http://localhost:5173";
const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const handle = (res, err, label) => {
  console.error(`${label}:`, err);
  return fail(res, 500, "Something went wrong. Please try again.");
};
const CLOSED = ["Declined", "Sacked", "Rejected", "Hired"];
const linkFor = (id) => `${CLIENT}/interview/${id}`;

// Employer schedules (or reschedules) a virtual interview for one application
export const scheduleInterview = async (req, res) => {
  try {
    const { applicationId, scheduledAt } = req.body;
    const note = String(req.body.note || "").trim().slice(0, 500);
    const duration = Math.min(Math.max(parseInt(req.body.duration) || 60, 15), 180);

    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 5 * 60 * 1000)
      return fail(res, 400, "Pick a time at least 5 minutes from now");
    if (!mongoose.isValidObjectId(applicationId)) return fail(res, 404, "Application not found");

    // Same ownership rule as updateApplicationStatus: the application belongs to this employer
    const app = await Application.findOne({ _id: applicationId, companyId: req.user._id });
    if (!app) return fail(res, 404, "Application not found");
    if (CLOSED.includes(app.status)) return fail(res, 400, `This application is closed (${app.status})`);

    const [job, employer] = await Promise.all([
      Job.findById(app.job).select("jobTitle jobType boost employer"),
      User.findById(req.user._id).select("companyName"),
    ]);
    if (!job) return fail(res, 404, "Job not found");

    // One active interview per application: reschedule if there is one
    let interview = await Interview.findOne({ application: app._id, status: "Scheduled" });
    const rescheduled = Boolean(interview);
    const fields = {
      job: job._id, application: app._id, employer: req.user._id, applicant: app.applicant,
      scheduledAt: when, duration, note, status: "Scheduled",
    };
    if (interview) Object.assign(interview, fields);
    else interview = new Interview(fields);
    await interview.save();
    await Application.updateOne({ _id: app._id }, { $addToSet: { interviews: interview._id } });

    const link = linkFor(interview._id);
    const whenText = when.toLocaleString("en-NG", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Lagos" });
    const message = [
      `Your virtual interview for ${job.jobTitle} ${rescheduled ? "has been rescheduled" : "is scheduled"}.`,
      "",
      `When: ${whenText} (Lagos time), about ${duration} minutes`,
      `Join link: ${link}`,
      "",
      "Log in, open the link and allow your camera and microphone. The room opens 15 minutes before the start time.",
      note ? `\nNote from the employer: ${note}` : "",
    ].join("\n");

    // Reuses your existing pipeline: sets the status to Scheduled, notifies the candidate
    // in real time, emails the message and saves it to the mail history.
    let warning;
    try {
      await applyStatusChange({
        app, job, employer, status: "Scheduled", reason: "", message,
        subject: cleanLine(rescheduled ? `Interview rescheduled: ${job.jobTitle}` : `Virtual interview: ${job.jobTitle}`),
      });
    } catch (e) {
      console.error("interview status change failed", e);
      warning = "Interview saved, but the candidate could not be notified. Send them the link.";
    }

    res.status(201).json({ success: true, interview, link, ...(warning && { warning }) });
  } catch (err) { handle(res, err, "scheduleInterview"); }
};

// Employer: all interviews for one of their jobs
export const listJobInterviews = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.jobId)) return fail(res, 404, "Job not found");
    const job = await Job.findOne({ _id: req.params.jobId, employer: req.user._id }).select("_id");
    if (!job) return fail(res, 404, "Job not found");

    const interviews = await Interview.find({ job: job._id })
      .populate("applicant", "firstName lastName email avatar")
      .sort({ scheduledAt: 1 })
      .lean();
    res.json({ success: true, interviews });
  } catch (err) { handle(res, err, "listJobInterviews"); }
};

// Jobseeker: upcoming interviews
export const myInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({
      applicant: req.user._id,
      status: "Scheduled",
      scheduledAt: { $gte: new Date(Date.now() - 4 * 3600 * 1000) }, // hide old ones
    })
      .populate("job", "jobTitle")
      .populate("employer", "companyName")
      .sort({ scheduledAt: 1 })
      .lean();
    res.json({ success: true, interviews });
  } catch (err) { handle(res, err, "myInterviews"); }
};

// Employer cancels
export const cancelInterview = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "Interview not found");
    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, employer: req.user._id, status: "Scheduled" },
      { $set: { status: "Cancelled" } },
      { new: true }
    );
    if (!interview) return fail(res, 404, "Interview not found");
    emitToUser(interview.applicant, "interview:cancelled", { interviewId: interview._id });
    res.json({ success: true });
  } catch (err) { handle(res, err, "cancelInterview"); }
};

// Either person: checks access and the time window, returns TURN/STUN servers
export const joinInterview = async (req, res) => {
  try {
    const { role } = await authorizeInterview(req.params.id, req.user._id);
    res.json({
      success: true,
      iceServers: await getIceServers(),
      role,
      peerLabel: role === "employer" ? "Candidate" : "Employer",
    });
  } catch (err) {
    if (err.status) return fail(res, err.status, err.message, { startsAt: err.startsAt });
    handle(res, err, "joinInterview");
  }
};