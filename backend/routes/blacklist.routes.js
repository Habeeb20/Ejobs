import { Router } from "express";

import { protect, authorize } from "../middleware/auth.js";
import {
  blacklistUser,
  getHistory,
  getStats,
  liftBlacklist,
  listBlacklisted,
  searchEligible,
} from "../controllers/blacklist.controller.js";

const router = Router();

// Everything here is for superadmins only
router.use(protect, authorize("superadmin"));

/**
 * @swagger
 * tags:
 *   name: Blacklist
 *   description: Superadmin-only blacklisting of job seekers, employers, admins and agents
 *
 * components:
 *   schemas:
 *     BlacklistRequest:
 *       type: object
 *       required: [reason]
 *       properties:
 *         reason:
 *           type: string
 *           minLength: 10
 *           maxLength: 1000
 *           description: Why this user is being blacklisted (required)
 *           example: Posted fake jobs and asked applicants to pay money
 *         category:
 *           type: string
 *           enum: [fraud, fake_documents, impersonation, harassment, spam, non_payment, inappropriate_content, policy_violation, other]
 *           default: other
 *         notify:
 *           type: boolean
 *           default: true
 *           description: Email the user about this decision
 *     LiftRequest:
 *       type: object
 *       required: [reason]
 *       properties:
 *         reason:
 *           type: string
 *           minLength: 10
 *           maxLength: 1000
 *           description: Why the blacklist is being lifted (required)
 *           example: Appeal reviewed and documents verified
 *         notify:
 *           type: boolean
 *           default: true
 *     BlacklistedUser:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         firstName: { type: string }
 *         lastName: { type: string }
 *         companyName: { type: string }
 *         email: { type: string }
 *         phoneNumber: { type: string }
 *         role: { type: string, enum: [jobseeker, employer, admin, agent] }
 *         isBlacklisted: { type: boolean }
 *         blacklistedAt: { type: string, format: date-time }
 *         blacklistReason: { type: string }
 *         blacklistCategory: { type: string }
 *         blacklistedBy:
 *           type: object
 *           properties:
 *             firstName: { type: string }
 *             lastName: { type: string }
 *             email: { type: string }
 *     BlacklistRecord:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         action: { type: string, enum: [blacklist, unblacklist] }
 *         reason: { type: string }
 *         category: { type: string }
 *         performedByName: { type: string }
 *         createdAt: { type: string, format: date-time }
 *         userSnapshot:
 *           type: object
 *           properties:
 *             name: { type: string }
 *             email: { type: string }
 *             role: { type: string }
 *     BlacklistError:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: false }
 *         message: { type: string }
 */

/**
 * @swagger
 * /blacklist/stats:
 *   get:
 *     summary: Blacklist numbers for the dashboard cards
 *     tags: [Blacklist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Totals, a count per role and the last 30 days of activity
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     byRole:
 *                       type: object
 *                       properties:
 *                         jobseeker: { type: integer }
 *                         employer: { type: integer }
 *                         admin: { type: integer }
 *                         agent: { type: integer }
 *                     blacklistedLast30Days: { type: integer }
 *                     liftedLast30Days: { type: integer }
 *       401: { description: Not logged in }
 *       403: { description: Superadmin only }
 */
router.get("/stats", getStats);

/**
 * @swagger
 * /blacklist/eligible:
 *   get:
 *     summary: Search users that can still be blacklisted
 *     description: Matches name, email, phone number or company name. Needs at least 2 characters. Returns up to 8 users.
 *     tags: [Blacklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: true
 *         schema: { type: string, minLength: 2 }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [jobseeker, employer, admin, agent] }
 *     responses:
 *       200:
 *         description: Matching users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 users:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/BlacklistedUser' }
 */
router.get("/eligible", searchEligible);

/**
 * @swagger
 * /blacklist:
 *   get:
 *     summary: List blacklisted users
 *     tags: [Blacklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10, maximum: 50 } }
 *       - { in: query, name: search, schema: { type: string }, description: Name / email / phone / company }
 *       - { in: query, name: role, schema: { type: string, enum: [jobseeker, employer, admin, agent] } }
 *       - { in: query, name: category, schema: { type: string } }
 *     responses:
 *       200:
 *         description: A page of blacklisted users, newest first
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 pages: { type: integer }
 *                 users:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/BlacklistedUser' }
 */
router.get("/", listBlacklisted);

/**
 * @swagger
 * /blacklist/{userId}/history:
 *   get:
 *     summary: Every blacklist and reinstate action for one user
 *     tags: [Blacklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Records, newest first
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 records:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/BlacklistRecord' }
 *       400: { description: Invalid user id }
 */
router.get("/:userId/history", getHistory);

/**
 * @swagger
 * /blacklist/{userId}/lift:
 *   post:
 *     summary: Lift a blacklist (reinstate the user)
 *     tags: [Blacklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LiftRequest' }
 *     responses:
 *       200: { description: User reinstated }
 *       400: { description: Missing or too short note }
 *       404: { description: User not found }
 *       409: { description: The user is not blacklisted }
 */
router.post("/:userId/lift", liftBlacklist);

/**
 * @swagger
 * /blacklist/{userId}:
 *   post:
 *     summary: Blacklist a user
 *     description: |
 *       Allowed targets are job seekers, employers, admins and agents.
 *       Superadmins and your own account cannot be blacklisted.
 *       The user is blocked immediately, even if they are logged in.
 *     tags: [Blacklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/BlacklistRequest' }
 *     responses:
 *       201: { description: User blacklisted }
 *       400: { description: Missing reason, invalid category or trying to blacklist yourself }
 *       403: { description: Superadmin only, or this role cannot be blacklisted }
 *       404: { description: User not found }
 *       409: { description: Already blacklisted }
 */
router.post("/:userId", blacklistUser);

export default router;
