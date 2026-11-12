// backend/routes/careerProfile.routes.js
import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { getCareerOptions, getCareerProfile, updateCareerProfile } from "../controllers/careerProfile.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Career profile
 *   description: Work status, skills and job preferences of the logged-in user
 *
 * components:
 *   schemas:
 *     Option:
 *       type: object
 *       properties:
 *         value: { type: string, example: single_parent }
 *         label: { type: string, example: Single parent }
 *     CareerProfile:
 *       type: object
 *       properties:
 *         dissability:
 *           type: array
 *           description: Optional. Any that apply.
 *           items:
 *             type: string
 *             enum: [widower, widow, single_parent, orphan, person_with_disability, less_privileged]
 *         jobMode:
 *           type: array
 *           description: A user can be a professional, an artisan, or both.
 *           items: { type: string, enum: [professional, artisan] }
 *         artisanTrades:
 *           type: array
 *           description: Required when jobMode includes artisan. Values come from GET /api/users/career-options.
 *           items: { type: string, example: Plumber }
 *         jobDecision:
 *           type: string
 *           enum: [jobseeker, jobchanger, ""]
 *         jobChangeFrom:
 *           type: string
 *           description: Current job. Required when jobDecision is jobchanger.
 *           example: Accountant
 *         jobChangeTo:
 *           type: string
 *           description: Job the user wants to move to. Required when jobDecision is jobchanger.
 *           example: Project manager
 *         jobDecisionSalary:
 *           type: string
 *           description: Salary expectation for the new job, digits only (naira).
 *           example: "350000"
 *         privateStaff: { type: boolean }
 *         privateStaffType:
 *           type: string
 *           description: Required when privateStaff is true.
 *           enum: [in_house_cook, private_driver, professional_security, nanny, housekeeper, steward, gardener, personal_assistant, elderly_caregiver, laundry_attendant, other, ""]
 *         TIN:
 *           type: string
 *           description: Tax identification number. Required when privateStaff is true. 8 to 15 letters, numbers or dashes.
 *           example: "1234567890"
 *     ValidationError:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: false }
 *         message: { type: string, example: Pick at least one trade }
 *         errors:
 *           type: object
 *           additionalProperties: { type: string }
 */

/**
 * @swagger
 * /api/users/career-options:
 *   get:
 *     summary: Lists every choice the career profile form offers
 *     description: Disability options, job modes, job decisions, artisan trades and private staff types. Use this to build the form so the lists stay in one place.
 *     tags: [Career profile]
 *     responses:
 *       200:
 *         description: The option lists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 options:
 *                   type: object
 *                   properties:
 *                     disability: { type: array, items: { $ref: "#/components/schemas/Option" } }
 *                     jobModes: { type: array, items: { $ref: "#/components/schemas/Option" } }
 *                     jobDecisions: { type: array, items: { $ref: "#/components/schemas/Option" } }
 *                     artisanTrades: { type: array, items: { type: string } }
 *                     privateStaffTypes: { type: array, items: { $ref: "#/components/schemas/Option" } }
 */
router.get("/career-options", getCareerOptions);

/**
 * @swagger
 * /api/users/career-profile:
 *   get:
 *     summary: Gets the logged-in user's career profile
 *     tags: [Career profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The saved career profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 profile: { $ref: "#/components/schemas/CareerProfile" }
 *       401: { description: Not logged in }
 *       404: { description: User not found }
 *   put:
 *     summary: Saves the logged-in user's career profile
 *     description: |
 *       Fields that are not sent keep their saved value.
 *       Rules: artisan needs at least one trade; jobchanger needs jobChangeFrom and jobChangeTo;
 *       privateStaff needs privateStaffType and a TIN. Fields that no longer apply are cleared
 *       (trades when artisan is removed, job change fields when the user is a jobseeker, staff type when privateStaff is false).
 *     tags: [Career profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CareerProfile"
 *           example:
 *             dissability: [single_parent]
 *             jobMode: [professional, artisan]
 *             artisanTrades: [Plumber, Welder]
 *             jobDecision: jobchanger
 *             jobChangeFrom: Accountant
 *             jobChangeTo: Project manager
 *             jobDecisionSalary: "350000"
 *             privateStaff: true
 *             privateStaffType: private_driver
 *             TIN: "1234567890"
 *     responses:
 *       200:
 *         description: Saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Career profile saved }
 *                 profile: { $ref: "#/components/schemas/CareerProfile" }
 *       401: { description: Not logged in }
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ValidationError" }
 */
router.get("/career-profile", protect, getCareerProfile);
router.put("/career-profile", protect, updateCareerProfile);

export default router;