import mongoose from "mongoose";
import Ad from "../models/Ads.js";
import AdPayment from "../models/AdPayment.js";
import User, { ROLES } from "../models/User.js";
import { getAdPackage, publicAdPackages, AD_PLACEMENTS } from "../config/adPackages.js";
import { initTransaction } from "../utils/paystack.js";
import { settleAdPayment } from "../utils/settleAdPayment.js";
import { notifyReviewers } from "../utils/adReview.js";
import { isCloudinaryUrl, isHttpUrl } from "../utils/cloudinary.js";
import { emitToUser, emailUser, esc } from "../utils/notify.js";

/**
 * @swagger
 * tags:
 *   - name: Ads
 *     description: Banner ads. Admins post for free; job seekers, employers and agents pay with Paystack and an admin approves or rejects (with a reason).
 *
 * components:
 *   schemas:
 *     AdPackage:
 *       type: object
 *       properties:
 *         key: { type: string, enum: [week, fortnight, month] }
 *         name: { type: string, example: 1 week }
 *         days: { type: integer, example: 7 }
 *         price: { type: integer, description: Naira, example: 3000 }
 *     AdInput:
 *       type: object
 *       required: [title, mediaType, mediaUrl, linkUrl]
 *       properties:
 *         title: { type: string, minLength: 3, maxLength: 80, example: Learn to code in 12 weeks }
 *         description: { type: string, maxLength: 300 }
 *         mediaType: { type: string, enum: [image, video] }
 *         mediaUrl: { type: string, description: The Cloudinary URL the frontend got after uploading. Must belong to our Cloudinary account. }
 *         mediaPublicId: { type: string }
 *         linkUrl: { type: string, description: Where the ad button goes (http or https), example: "https://example.com/offer" }
 *         ctaLabel: { type: string, maxLength: 24, example: Learn more }
 *         placements:
 *           type: array
 *           items: { type: string, enum: [dashboard, public] }
 *         packageKey: { type: string, enum: [week, fortnight, month], description: Job seekers, employers and agents only }
 *         durationDays: { type: integer, minimum: 1, maximum: 365, description: Admins and super admins only }
 *         startsAt: { type: string, format: date, description: Admins and super admins only. Defaults to now. }
 *     Ad:
 *       allOf:
 *         - $ref: '#/components/schemas/AdInput'
 *         - type: object
 *           properties:
 *             _id: { type: string }
 *             status: { type: string, enum: [Draft, Pending, Approved, Rejected, Paused, Expired] }
 *             isLive: { type: boolean }
 *             isScheduled: { type: boolean }
 *             paymentStatus: { type: string, enum: [Free, Pending, Paid] }
 *             amount: { type: integer }
 *             rejectionReason: { type: string }
 *             startsAt: { type: string, format: date-time }
 *             endsAt: { type: string, format: date-time }
 *             impressions: { type: integer }
 *             clicks: { type: integer }
 *     PublicAd:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         title: { type: string }
 *         description: { type: string }
 *         mediaType: { type: string, enum: [image, video] }
 *         mediaUrl: { type: string }
 *         linkUrl: { type: string }
 *         ctaLabel: { type: string }
 */

const CLIENT = process.env.CLIENT_URL || "http://localhost:5173";
const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const handle = (res, err, label) => {
  if (err.name === "ValidationError") return fail(res, 400, Object.values(err.errors)[0].message);
  console.error(`${label}:`, err);
  return fail(res, 500, "Something went wrong. Please try again.");
};
const isStaff = (user) => [ROLES.ADMIN, ROLES.SUPERADMIN].includes(user.role);
const validId = (id) => mongoose.isValidObjectId(id);

// An approved ad whose time is up is reported as Expired even before the cleanup task runs
const presentAd = (ad) => {
  const o = ad.toObject ? ad.toObject() : ad;
  const now = new Date();
  const status = o.status === "Approved" && o.endsAt && new Date(o.endsAt) <= now ? "Expired" : o.status;
  const approved = status === "Approved";
  return {
    ...o, status,
    isLive: approved && new Date(o.startsAt) <= now,
    isScheduled: approved && new Date(o.startsAt) > now,
  };
};

// Checks everything the advertiser controls. Media must be a Cloudinary URL of ours.
const validateAd = (b) => {
  const title = String(b.title || "").trim();
  if (title.length < 3 || title.length > 80) return { error: "Title must be 3 to 80 characters" };
  const description = String(b.description || "").trim();
  if (description.length > 300) return { error: "Description can be at most 300 characters" };
  if (!["image", "video"].includes(b.mediaType)) return { error: "Upload an image or a video" };
  if (!isCloudinaryUrl(b.mediaUrl, b.mediaType)) return { error: "Upload the media with the uploader so it is stored on Cloudinary" };
  const linkUrl = String(b.linkUrl || "").trim();
  if (!isHttpUrl(linkUrl)) return { error: "Enter a valid link that starts with http:// or https://" };
  const placements = Array.isArray(b.placements)
    ? [...new Set(b.placements.filter((p) => AD_PLACEMENTS.includes(p)))]
    : AD_PLACEMENTS;
  if (!placements.length) return { error: "Choose where the ad should appear" };
  return {
    data: {
      title, description, mediaType: b.mediaType, mediaUrl: String(b.mediaUrl),
      mediaPublicId: String(b.mediaPublicId || "").slice(0, 200), linkUrl,
      ctaLabel: String(b.ctaLabel || "").trim().slice(0, 24) || "Learn more", placements,
    },
  };
};

const staffSchedule = (b) => {
  const days = b.durationDays === undefined ? 7 : Number(b.durationDays);
  if (!Number.isInteger(days) || days < 1 || days > 365) return { error: "Run length must be 1 to 365 days" };
  let startsAt = b.startsAt ? new Date(b.startsAt) : new Date();
  if (isNaN(startsAt)) return { error: "Enter a valid start date" };
  if (startsAt < new Date()) startsAt = new Date();
  return { days, startsAt, endsAt: new Date(startsAt.getTime() + days * 864e5) };
};

/* ================= PUBLIC ================= */

/**
 * @swagger
 * /ads/packages:
 *   get:
 *     tags: [Ads]
 *     summary: Ad prices and run lengths
 *     description: Public. The frontend builds its package picker from this.
 *     responses:
 *       200:
 *         description: Packages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 packages:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/AdPackage' }
 */
export const listPackages = (req, res) => res.json({ success: true, packages: publicAdPackages() });

/**
 * @swagger
 * /ads/active:
 *   get:
 *     tags: [Ads]
 *     summary: Ads to show right now
 *     description: >
 *       Public. Returns a random sample of live ads for a placement. An ad is live when it is Approved and
 *       the current time is between its start and end. Each returned ad counts one impression.
 *     parameters:
 *       - in: query
 *         name: placement
 *         schema: { type: string, enum: [dashboard, public], default: public }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 10, default: 5 }
 *     responses:
 *       200:
 *         description: Live ads (can be empty)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 ads:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/PublicAd' }
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const activeAds = async (req, res) => {
  try {
    const placement = AD_PLACEMENTS.includes(req.query.placement) ? req.query.placement : "public";
    const limit = Math.min(10, Math.max(1, parseInt(req.query.limit) || 5));
    const now = new Date();
    const ads = await Ad.aggregate([
      { $match: { status: "Approved", startsAt: { $lte: now }, endsAt: { $gt: now }, placements: placement } },
      { $sample: { size: limit } },
      { $project: { title: 1, description: 1, mediaType: 1, mediaUrl: 1, linkUrl: 1, ctaLabel: 1 } },
    ]);
    if (ads.length)
      Ad.updateMany({ _id: { $in: ads.map((a) => a._id) } }, { $inc: { impressions: 1 } }).catch((e) => console.error("impressions:", e));
    res.set("Cache-Control", "no-store");
    res.json({ success: true, ads });
  } catch (err) { handle(res, err, "activeAds"); }
};

/**
 * @swagger
 * /ads/{id}/click:
 *   post:
 *     tags: [Ads]
 *     summary: Count a click on an ad
 *     description: Public. Only live ads count clicks.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Counted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 */
export const clickAd = async (req, res) => {
  try {
    if (validId(req.params.id))
      await Ad.updateOne({ _id: req.params.id, status: "Approved", endsAt: { $gt: new Date() } }, { $inc: { clicks: 1 } });
    res.json({ success: true });
  } catch (err) { handle(res, err, "clickAd"); }
};

/* ================= ADVERTISER (any logged-in role) ================= */

/**
 * @swagger
 * /ads:
 *   post:
 *     tags: [Ads]
 *     summary: Create an ad
 *     description: >
 *       Admins and super admins: the ad is published straight away (free) for `durationDays`, starting at
 *       `startsAt` or now. Job seekers, employers and agents: the ad is saved as a Draft with the chosen
 *       `packageKey`; pay with POST /ads/{id}/payment and it then waits for an admin to approve or reject it.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdInput'
 *     responses:
 *       201:
 *         description: Ad created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 ad: { $ref: '#/components/schemas/Ad' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const createAd = async (req, res) => {
  try {
    const { error, data } = validateAd(req.body);
    if (error) return fail(res, 400, error);
    const base = { ...data, owner: req.user._id, ownerRole: req.user.role };

    let ad;
    if (isStaff(req.user)) {
      const s = staffSchedule(req.body);
      if (s.error) return fail(res, 400, s.error);
      ad = await Ad.create({
        ...base, status: "Approved", packageKey: "admin", paymentStatus: "Free", amount: 0,
        durationDays: s.days, startsAt: s.startsAt, endsAt: s.endsAt, reviewedBy: req.user._id, reviewedAt: new Date(),
      });
    } else {
      const pkg = getAdPackage(req.body.packageKey);
      if (!pkg) return fail(res, 400, "Choose how long the ad should run");
      ad = await Ad.create({
        ...base, status: "Draft", packageKey: pkg.key, durationDays: pkg.days, amount: pkg.price, paymentStatus: "Pending",
      });
    }
    res.status(201).json({ success: true, ad: presentAd(ad) });
  } catch (err) { handle(res, err, "createAd"); }
};

/**
 * @swagger
 * /ads/{id}:
 *   put:
 *     tags: [Ads]
 *     summary: Edit your own ad
 *     description: >
 *       Job seekers, employers and agents can edit Draft and Rejected ads (a rejected ad goes back to Draft
 *       and keeps its payment). The package can be changed only while unpaid. Admins can edit their own ads any time.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdInput'
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 ad: { $ref: '#/components/schemas/Ad' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const updateAd = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, "Ad not found");
    const ad = await Ad.findOne({ _id: req.params.id, owner: req.user._id });
    if (!ad) return fail(res, 404, "Ad not found");
    const staff = isStaff(req.user);
    if (!staff && !["Draft", "Rejected"].includes(ad.status)) return fail(res, 400, "This ad can't be edited right now");

    const { error, data } = validateAd(req.body);
    if (error) return fail(res, 400, error);
    Object.assign(ad, data);

    if (staff) {
      if (req.body.durationDays !== undefined || req.body.startsAt) {
        const s = staffSchedule({ durationDays: req.body.durationDays ?? ad.durationDays, startsAt: req.body.startsAt ?? ad.startsAt });
        if (s.error) return fail(res, 400, s.error);
        ad.durationDays = s.days; ad.startsAt = s.startsAt; ad.endsAt = s.endsAt;
      }
    } else {
      if (req.body.packageKey && req.body.packageKey !== ad.packageKey) {
        if (ad.paymentStatus === "Paid") return fail(res, 400, "You've already paid for this package");
        const pkg = getAdPackage(req.body.packageKey);
        if (!pkg) return fail(res, 400, "Choose how long the ad should run");
        ad.packageKey = pkg.key; ad.durationDays = pkg.days; ad.amount = pkg.price;
      }
      if (ad.status === "Rejected") { ad.status = "Draft"; ad.rejectionReason = ""; }
    }
    await ad.save();
    res.json({ success: true, ad: presentAd(ad) });
  } catch (err) { handle(res, err, "updateAd"); }
};

/**
 * @swagger
 * /ads/mine:
 *   get:
 *     tags: [Ads]
 *     summary: Your own ads with their status, rejection reason and stats
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Your ads, newest first
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 ads:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Ad' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const myAds = async (req, res) => {
  try {
    const ads = await Ad.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, ads: ads.map(presentAd) });
  } catch (err) { handle(res, err, "myAds"); }
};

/**
 * @swagger
 * /ads/{id}:
 *   delete:
 *     tags: [Ads]
 *     summary: Delete an ad
 *     description: >
 *       Job seekers, employers and agents can delete their own Draft, Rejected and Expired ads. Ads that are
 *       waiting for review or running can't be deleted by their owner. Admins can delete any ad.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const deleteAd = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, "Ad not found");
    const staff = isStaff(req.user);
    const ad = await Ad.findOne(staff ? { _id: req.params.id } : { _id: req.params.id, owner: req.user._id });
    if (!ad) return fail(res, 404, "Ad not found");
    if (!staff && !["Draft", "Rejected", "Expired"].includes(presentAd(ad).status))
      return fail(res, 400, "You can't delete an ad that is under review or running");
    await ad.deleteOne();
    res.json({ success: true });
  } catch (err) { handle(res, err, "deleteAd"); }
};

/**
 * @swagger
 * /ads/{id}/payment:
 *   post:
 *     tags: [Ads]
 *     summary: Start a Paystack payment for an ad
 *     description: >
 *       For Draft or Rejected ads that haven't been paid. The amount always comes from the ad's package on
 *       the server. Open the Paystack popup with the returned accessCode, then call POST /ads/{id}/confirm.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 accessCode: { type: string }
 *                 reference: { type: string }
 *                 amount: { type: integer }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const initAdPayment = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, "Ad not found");
    const ad = await Ad.findOne({ _id: req.params.id, owner: req.user._id });
    if (!ad) return fail(res, 404, "Ad not found");
    if (isStaff(req.user)) return fail(res, 400, "Admin ads are free. Nothing to pay.");
    if (!["Draft", "Rejected"].includes(ad.status)) return fail(res, 400, "This ad has already been submitted");
    if (ad.paymentStatus === "Paid") return fail(res, 400, "Already paid. Submit it for review.");

    const pkg = getAdPackage(ad.packageKey);
    if (!pkg) return fail(res, 400, "Choose how long the ad should run");

    const reference = `AD-${ad._id}-${Date.now()}`;
    const tx = await initTransaction({
      email: req.user.email, amount: pkg.price, reference,
      metadata: { adId: String(ad._id), kind: "ad" },
    });
    await AdPayment.create({ reference, ad: ad._id, owner: req.user._id, packageKey: pkg.key, amount: pkg.price });
    res.json({ success: true, accessCode: tx.access_code, reference, amount: pkg.price });
  } catch (err) { handle(res, err, "initAdPayment"); }
};

/**
 * @swagger
 * /ads/{id}/confirm:
 *   post:
 *     tags: [Ads]
 *     summary: Verify the Paystack payment and send the ad for review
 *     description: >
 *       Safe to call more than once. A verified payment marks the ad Paid and moves it to Pending, and admins
 *       are notified. The Paystack webhook runs the same logic, so a payment is never lost if the user closes the page.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reference]
 *             properties:
 *               reference: { type: string }
 *     responses:
 *       200:
 *         description: Payment applied
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 ad: { $ref: '#/components/schemas/Ad' }
 *       400:
 *         description: Payment could not be confirmed yet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const confirmAdPayment = async (req, res) => {
  try {
    const ad = await settleAdPayment(String(req.body.reference || ""), req.user._id);
    res.json({ success: true, ad: presentAd(ad) });
  } catch (err) {
    if (err.status) return fail(res, err.status, err.message);
    handle(res, err, "confirmAdPayment");
  }
};

/**
 * @swagger
 * /ads/{id}/submit:
 *   post:
 *     tags: [Ads]
 *     summary: Send an already-paid ad for review again
 *     description: For a paid ad that was rejected and then edited. Payment is not taken twice. Unpaid ads get 402.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The ad is Pending
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 ad: { $ref: '#/components/schemas/Ad' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       402:
 *         description: Payment is required first
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const submitAd = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, "Ad not found");
    const ad = await Ad.findOne({ _id: req.params.id, owner: req.user._id });
    if (!ad) return fail(res, 404, "Ad not found");
    if (!["Draft", "Rejected"].includes(ad.status)) return fail(res, 400, "This ad has already been submitted");
    if (ad.paymentStatus !== "Paid") return fail(res, 402, "Payment is required first");

    ad.status = "Pending";
    ad.submittedAt = new Date();
    ad.rejectionReason = "";
    await ad.save();
    notifyReviewers(ad).catch((e) => console.error("notifyReviewers:", e));
    res.json({ success: true, ad: presentAd(ad) });
  } catch (err) { handle(res, err, "submitAd"); }
};

/* ================= ADMIN / SUPER ADMIN: REVIEW ================= */

/**
 * @swagger
 * /ads/admin/list:
 *   get:
 *     tags: [Ads]
 *     summary: All ads for review (admin and super admin)
 *     description: Filter by status. `counts` gives the number of ads in each status for the tabs.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Pending, Approved, Paused, Rejected, Expired, Draft, all], default: Pending }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: A page of ads with their owners
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 total: { type: integer }
 *                 hasMore: { type: boolean }
 *                 counts:
 *                   type: object
 *                   additionalProperties: { type: integer }
 *                 ads:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Ad' }
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const adminList = async (req, res) => {
  try {
    const status = String(req.query.status || "Pending");
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const now = new Date();
    const filter =
      status === "all" ? {}
      : status === "Approved" ? { status: "Approved", endsAt: { $gt: now } }
      : status === "Expired" ? { $or: [{ status: "Expired" }, { status: "Approved", endsAt: { $lte: now } }] }
      : { status };

    const [ads, total, grouped] = await Promise.all([
      Ad.find(filter).sort(status === "Pending" ? { submittedAt: 1 } : { createdAt: -1 })
        .skip((page - 1) * limit).limit(limit)
        .populate("owner", "firstName lastName email role companyName avatar").lean(),
      Ad.countDocuments(filter),
      Ad.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);
    const counts = Object.fromEntries(grouped.map((g) => [g._id, g.count]));
    counts.all = grouped.reduce((n, g) => n + g.count, 0);
    res.json({ success: true, ads: ads.map(presentAd), total, hasMore: page * limit < total, counts });
  } catch (err) { handle(res, err, "adminList"); }
};

const tellOwner = async (ad, event, subject, title, bodyHtml) => {
  const owner = await User.findById(ad.owner).select("email");
  emitToUser(ad.owner, event, { adId: ad._id, title: ad.title, reason: ad.rejectionReason || undefined });
  emailUser(owner?.email, subject, title, bodyHtml, { url: `${CLIENT}/dashboard?tab=myAds`, label: "Open my ads" });
};

/**
 * @swagger
 * /ads/admin/{id}/approve:
 *   post:
 *     tags: [Ads]
 *     summary: Grant an ad (admin and super admin)
 *     description: >
 *       Approves a Pending ad. It goes live now and runs for its package length. The owner is notified in real
 *       time and by email. Approval is atomic, so two admins can't approve the same ad.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The ad is live
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 ad: { $ref: '#/components/schemas/Ad' }
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: The ad isn't waiting for review
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const approveAd = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, "Ad not found");
    const found = await Ad.findById(req.params.id).select("durationDays");
    if (!found) return fail(res, 404, "Ad not found");

    const now = new Date();
    const ad = await Ad.findOneAndUpdate(
      { _id: found._id, status: "Pending" },
      { $set: {
          status: "Approved", startsAt: now, endsAt: new Date(now.getTime() + found.durationDays * 864e5),
          reviewedBy: req.user._id, reviewedAt: now, rejectionReason: "",
      } },
      { new: true }
    );
    if (!ad) return fail(res, 409, "This ad isn't waiting for review");

    await tellOwner(ad, "ad:approved", "Your ad is live", "Your ad is live",
      `<p>Your ad <strong>${esc(ad.title)}</strong> was approved and is now showing until ${ad.endsAt.toDateString()}.</p>`);
    res.json({ success: true, ad: presentAd(ad) });
  } catch (err) { handle(res, err, "approveAd"); }
};

/**
 * @swagger
 * /ads/admin/{id}/reject:
 *   post:
 *     tags: [Ads]
 *     summary: Reject an ad with a reason (admin and super admin)
 *     description: >
 *       Works on Pending ads, and on live ads that must be taken down. The owner is notified with the reason,
 *       can edit the ad and send it again without paying again.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string, minLength: 5, example: The image contains a phone number. Please remove it. }
 *     responses:
 *       200:
 *         description: The ad is Rejected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 ad: { $ref: '#/components/schemas/Ad' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: The ad can't be rejected in its current state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const rejectAd = async (req, res) => {
  try {
    const reason = String(req.body.reason || "").trim();
    if (reason.length < 5) return fail(res, 400, "Give the advertiser a reason (at least 5 characters)");
    if (!validId(req.params.id)) return fail(res, 404, "Ad not found");

    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ["Pending", "Approved", "Paused"] } },
      { $set: { status: "Rejected", rejectionReason: reason, reviewedBy: req.user._id, reviewedAt: new Date() } },
      { new: true }
    );
    if (!ad) return fail(res, 409, "This ad can't be rejected right now");

    await tellOwner(ad, "ad:rejected", "Your ad needs changes", "Your ad wasn't approved",
      `<p>Your ad <strong>${esc(ad.title)}</strong> needs changes.</p><p><em>${esc(reason)}</em></p>
       <p>You can edit it and send it again without paying again.</p>`);
    res.json({ success: true, ad: presentAd(ad) });
  } catch (err) { handle(res, err, "rejectAd"); }
};

/**
 * @swagger
 * /ads/admin/{id}/state:
 *   patch:
 *     tags: [Ads]
 *     summary: Pause or resume a running ad (admin and super admin)
 *     description: A paused ad stops showing but its end date does not move.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [pause, resume] }
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 ad: { $ref: '#/components/schemas/Ad' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: Not possible in the ad's current state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const setAdState = async (req, res) => {
  try {
    const { action } = req.body;
    if (!["pause", "resume"].includes(action)) return fail(res, 400, "Action must be pause or resume");
    if (!validId(req.params.id)) return fail(res, 404, "Ad not found");

    const ad = await Ad.findOne({ _id: req.params.id, status: action === "pause" ? "Approved" : "Paused" });
    if (!ad) return fail(res, 409, action === "pause" ? "Only a running ad can be paused" : "This ad isn't paused");
    ad.status = action === "pause" ? "Paused" : ad.endsAt > new Date() ? "Approved" : "Expired";
    await ad.save();
    res.json({ success: true, ad: presentAd(ad) });
  } catch (err) { handle(res, err, "setAdState"); }
};