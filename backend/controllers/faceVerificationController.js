import FaceVerification, { FACE_STEPS } from "../models/FaceVerification.js";

/**
 * @swagger
 * tags:
 *   - name: Face Verification
 *     description: Liveness-check submissions made by the logged-in user
 *   - name: Admin - Face Verification
 *     description: Admin review of face verification submissions
 *
 * components:
 *   schemas:
 *     FaceVerificationAction:
 *       type: object
 *       required: [step, url, publicId]
 *       properties:
 *         step:
 *           type: string
 *           enum: [blink, mouth, right, left]
 *           example: blink
 *         url:
 *           type: string
 *           description: Cloudinary secure URL of the captured frame
 *           example: https://res.cloudinary.com/your-cloud/image/upload/v1700000000/abc123.jpg
 *         publicId:
 *           type: string
 *           description: Cloudinary public_id of the captured frame
 *           example: abc123
 *     FaceVerificationUser:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 65f1c2a9e4b0a1b2c3d4e5f6
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         phoneNumber:
 *           type: string
 *         alternateContact:
 *           type: string
 *         profilePicture:
 *           type: string
 *         role:
 *           type: string
 *           enum: [user, entity, admin, agent]
 *         state:
 *           type: string
 *         lga:
 *           type: string
 *         dateOfBirth:
 *           type: string
 *           format: date-time
 *         isBlocked:
 *           type: string
 *         isBlacklisted:
 *           type: boolean
 *         isRider:
 *           type: boolean
 *         isSeller:
 *           type: boolean
 *         isEmployer:
 *           type: boolean
 *         identityVerification:
 *           type: object
 *           properties:
 *             approved:
 *               type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *     FaceVerification:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 65f1c2a9e4b0a1b2c3d4e5f7
 *         user:
 *           oneOf:
 *             - type: string
 *             - $ref: '#/components/schemas/FaceVerificationUser'
 *         actions:
 *           type: array
 *           minItems: 4
 *           maxItems: 4
 *           items:
 *             $ref: '#/components/schemas/FaceVerificationAction'
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         submittedAt:
 *           type: string
 *           format: date-time
 *         reviewedBy:
 *           oneOf:
 *             - type: string
 *             - type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 email:
 *                   type: string
 *         reviewedAt:
 *           type: string
 *           format: date-time
 *         rejectionReason:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 */

// Returns null if the asset is OK, otherwise a short reason string.
// Only accepts images that live in YOUR Cloudinary account.
const checkAsset = ({ url, publicId } = {}) => {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud) return "CLOUDINARY_CLOUD_NAME is not set on the server";
  if (typeof url !== "string" || typeof publicId !== "string") return "missing url or publicId";

  const prefix = `https://res.cloudinary.com/${cloud}/image/`;
  if (!url.startsWith(prefix)) return `url must start with ${prefix} (got ${url.slice(0, 60)})`;
  if (!url.includes(publicId)) return "url does not match its publicId";
  return null;
};

/**
 * @swagger
 * /api/face-verification:
 *   post:
 *     summary: Submit face verification
 *     description: >
 *       Saves the four liveness captures (already uploaded to Cloudinary by the frontend) for the
 *       logged-in user. Each user has one record; submitting again replaces the previous record,
 *       resets its status to `pending` and clears any previous review.
 *     tags: [Face Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [actions]
 *             properties:
 *               actions:
 *                 type: array
 *                 minItems: 4
 *                 maxItems: 4
 *                 description: Exactly one entry for each of blink, mouth, right and left
 *                 items:
 *                   $ref: '#/components/schemas/FaceVerificationAction'
 *     responses:
 *       201:
 *         description: Face verification submitted
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
 *                   example: Face verification submitted
 *                 data:
 *                   $ref: '#/components/schemas/FaceVerification'
 *       400:
 *         description: Missing/duplicate steps or an image that is not from the configured Cloudinary account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const submitFaceVerification = async (req, res) => {
  try {
    const { actions } = req.body;

    if (!Array.isArray(actions) || actions.length !== FACE_STEPS.length) {
      return res.status(400).json({
        success: false,
        message: `Exactly ${FACE_STEPS.length} actions are required`,
      });
    }

    const steps = actions.map((a) => a?.step);
    const hasAllSteps =
      new Set(steps).size === FACE_STEPS.length && FACE_STEPS.every((s) => steps.includes(s));
    if (!hasAllSteps) {
      return res.status(400).json({
        success: false,
        message: `Actions must include each of: ${FACE_STEPS.join(", ")}`,
      });
    }

    for (const action of actions) {
      const reason = checkAsset(action);
      if (reason) {
        console.warn(`Face verification rejected (${action?.step}): ${reason}`);
        return res.status(400).json({
          success: false,
          message:
            process.env.NODE_ENV === "production"
              ? "One or more images are not valid verification uploads"
              : `Invalid image for "${action?.step}": ${reason}`,
        });
      }
    }

    const clean = actions.map(({ step, url, publicId }) => ({ step, url, publicId }));

    const record = await FaceVerification.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: { actions: clean, status: "pending", submittedAt: new Date() },
        // A new submission wipes the previous admin decision
        $unset: { reviewedBy: "", reviewedAt: "", rejectionReason: "" },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      success: true,
      message: "Face verification submitted",
      data: record,
    });
  } catch (error) {
    console.error("submitFaceVerification error:", error);
    return res.status(500).json({ success: false, message: "Could not save face verification" });
  }
};

/**
 * @swagger
 * /api/face-verification/me:
 *   get:
 *     summary: Get my face verification
 *     description: Returns the logged-in user's face verification record, including its review status and rejection reason (if any).
 *     tags: [Face Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Face verification record
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
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: The user has not submitted a face verification
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
export const getMyFaceVerification = async (req, res) => {
  try {
    const record = await FaceVerification.findOne({ user: req.user._id });
    if (!record) {
      return res.status(404).json({ success: false, message: "No face verification found" });
    }
    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    console.error("getMyFaceVerification error:", error);
    return res.status(500).json({ success: false, message: "Could not load face verification" });
  }
};