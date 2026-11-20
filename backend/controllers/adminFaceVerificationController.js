import mongoose from "mongoose";
import FaceVerification, { FACE_STATUSES } from "../models/FaceVerification.js";
import User from "../models/User.js";

// Never select password, tokens, or the select:false identity numbers.
const USER_LIST_FIELDS = "firstName lastName username email phoneNumber profilePicture role";
const USER_DETAIL_FIELDS =
  "firstName lastName username email phoneNumber alternateContact profilePicture role state lga dateOfBirth isBlocked isBlacklisted isRider isSeller isEmployer identityVerification.approved createdAt";
const REVIEWER_FIELDS = "firstName lastName email";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Outside production the message shows what was received, to make bad URLs easy to spot.
const invalidId = (res, id) =>
  res.status(400).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Invalid face verification ID"
        : `Invalid face verification ID: received "${id}". Use the "_id" of a record from GET /api/admin/face-verifications (24 characters).`,
  });

/**
 * @swagger
 * /api/admin/face-verifications:
 *   get:
 *     summary: List all face verifications
 *     description: >
 *       Admin only. Returns a paginated list of every user's face verification with a summary of the user,
 *       newest submission first. Also returns a count of records per status for the whole collection.
 *     tags: [Admin - Face Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Only return records with this status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Match against the user's first name, last name, username, email or phone number
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated face verifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FaceVerification'
 *                 counts:
 *                   type: object
 *                   properties:
 *                     all:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     approved:
 *                       type: integer
 *                     rejected:
 *                       type: integer
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       400:
 *         description: Invalid status filter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const listFaceVerifications = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const { status, search } = req.query;

    const filter = {};
    if (status) {
      if (!FACE_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `status must be one of: ${FACE_STATUSES.join(", ")}`,
        });
      }
      filter.status = status;
    }

    if (search && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), "i");
      const users = await User.find({
        $or: [{ firstName: rx }, { lastName: rx }, { username: rx }, { email: rx }, { phoneNumber: rx }],
      })
        .select("_id")
        .limit(500)
        .lean();
      filter.user = { $in: users.map((u) => u._id) };
    }

    const [items, total, grouped] = await Promise.all([
      FaceVerification.find(filter)
        .sort({ submittedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("user", USER_LIST_FIELDS)
        .lean(),
      FaceVerification.countDocuments(filter),
      FaceVerification.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const counts = { all: 0, pending: 0, approved: 0, rejected: 0 };
    grouped.forEach((g) => {
      counts[g._id] = g.count;
      counts.all += g.count;
    });

    return res.status(200).json({
      success: true,
      data: items,
      counts,
      pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
    });
  } catch (error) {
    console.error("listFaceVerifications error:", error);
    return res.status(500).json({ success: false, message: "Could not load face verifications" });
  }
};

/**
 * @swagger
 * /api/admin/face-verifications/{id}:
 *   get:
 *     summary: Get one face verification with full user details
 *     description: Admin only. Returns the four captured images, the review status, and the user's details.
 *     tags: [Admin - Face Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 65f1c2a9e4b0a1b2c3d4e5f7
 *         description: Face verification ID (not the user ID)
 *     responses:
 *       200:
 *         description: Face verification with populated user and reviewer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/FaceVerification'
 *       400:
 *         description: Invalid ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Face verification not found
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
export const getFaceVerificationById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return invalidId(res, id);
    }

    const record = await FaceVerification.findById(id)
      .populate("user", USER_DETAIL_FIELDS)
      .populate("reviewedBy", REVIEWER_FIELDS)
      .lean();

    if (!record) {
      return res.status(404).json({ success: false, message: "Face verification not found" });
    }

    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    console.error("getFaceVerificationById error:", error);
    return res.status(500).json({ success: false, message: "Could not load face verification" });
  }
};

/**
 * @swagger
 * /api/admin/face-verifications/{id}/review:
 *   patch:
 *     summary: Approve or reject a face verification
 *     description: >
 *       Admin only. Sets the status to `approved` or `rejected` and records who reviewed it and when.
 *       A reason is required when rejecting; it is shown to the user. A decision can be changed later by
 *       reviewing again.
 *     tags: [Admin - Face Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 65f1c2a9e4b0a1b2c3d4e5f7
 *         description: Face verification ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Required when status is `rejected`
 *                 example: Face is not clearly visible in the "left" capture
 *     responses:
 *       200:
 *         description: Review saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Face verification approved
 *                 data:
 *                   $ref: '#/components/schemas/FaceVerification'
 *       400:
 *         description: Invalid ID, invalid status, or missing/too-long rejection reason
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Face verification not found
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
export const reviewFaceVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return invalidId(res, id);
    }
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be 'approved' or 'rejected'" });
    }

    const trimmed = typeof reason === "string" ? reason.trim() : "";
    if (status === "rejected") {
      if (!trimmed) {
        return res.status(400).json({ success: false, message: "A reason is required when rejecting" });
      }
      if (trimmed.length > 500) {
        return res.status(400).json({ success: false, message: "Reason must be 500 characters or fewer" });
      }
    }

    const update =
      status === "approved"
        ? {
            $set: { status, reviewedBy: req.user._id, reviewedAt: new Date() },
            $unset: { rejectionReason: "" },
          }
        : {
            $set: { status, reviewedBy: req.user._id, reviewedAt: new Date(), rejectionReason: trimmed },
          };

    const record = await FaceVerification.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate("user", USER_DETAIL_FIELDS)
      .populate("reviewedBy", REVIEWER_FIELDS)
      .lean();

    if (!record) {
      return res.status(404).json({ success: false, message: "Face verification not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Face verification ${status}`,
      data: record,
    });
  } catch (error) {
    console.error("reviewFaceVerification error:", error);
    return res.status(500).json({ success: false, message: "Could not save the review" });
  }
};