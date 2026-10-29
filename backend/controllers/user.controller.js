

import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User, { ROLES } from "../models/User.js";
import { sendEmail, otpEmailHtml } from "../utils/sendEmail.js";

const SIGNUP_ROLES = [ROLES.JOBSEEKER, ROLES.EMPLOYER, ROLES.AGENT];
const OTP_MINUTES = 10;
const RESEND_SECONDS = 60;
const HIDDEN_FIELDS =
  "-password -emailOtp -otpExpiresAt -resetPasswordToken -resetPaswordExpiresAt -pendingToken -faceData";

const ONBOARDING_ROLES = [ROLES.JOBSEEKER, ROLES.EMPLOYER, ROLES.AGENT];
const WELCOME_BONUS_POINTS = 10; // change to whatever you like



const REFERRAL_REWARD_POINTS = 20;

// Call once the new user's email is verified
const rewardReferrer = async (user) => {
  if (!user.referredBy) return;
  // The flag flip is atomic, so a user can never trigger the reward twice
  const claimed = await User.findOneAndUpdate(
    { _id: user._id, referralRewarded: false },
    { $set: { referralRewarded: true } }
  );
  if (!claimed) return;
  await User.updateOne(
    { _id: user.referredBy },
    { $inc: { loyaltyPoints: REFERRAL_REWARD_POINTS, referralCount: 1 } }
  );
};


const grantWelcomeBonus = (user) =>
  // One atomic update: the flag check and the +points happen together,
  // so the bonus can never be paid twice
  User.updateOne(
    { _id: user._id, welcomeBonusGiven: false },
    { $set: { welcomeBonusGiven: true }, $inc: { loyaltyPoints: WELCOME_BONUS_POINTS } }
  );
// const REDIRECTS = {
//   [ROLES.AGENT]: "/dashboard",
//   [ROLES.JOBSEEKER]: "/dashboard",
//   [ROLES.EMPLOYER]: "/dashboard",
// };
const REDIRECTS = {
  [ROLES.AGENT]: "/agent",
  [ROLES.JOBSEEKER]: "/jobseeker",
  [ROLES.EMPLOYER]: "/employer",
};

const makeOtp = () => String(crypto.randomInt(0, 10000)).padStart(4, "0");
const hashOtp = (code) => crypto.createHash("sha256").update(code).digest("hex");
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

const isStrongPassword = (p = "") =>
  p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p);

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// Same cost factor as register, so login timing doesn't reveal whether an account exists
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);
const INVALID_LOGIN = "Incorrect email/phone number or password";

// Nigerian numbers may be stored as 0801..., 234801... or +234801...
// Match all three so login works however the number was entered at signup.
const phoneVariants = (raw) => {
  const digits = String(raw).replace(/\D/g, "");
  let local = null;
  if (digits.startsWith("234") && digits.length === 13) local = digits.slice(3);
  else if (digits.startsWith("0") && digits.length === 11) local = digits.slice(1);
  else if (digits.length === 10) local = digits;
  return local ? [`0${local}`, `234${local}`, `+234${local}`] : [String(raw).trim()];
};

const issueOtp = async (user) => {
  const code = makeOtp();
  user.emailOtp = hashOtp(code);
  user.otpExpiresAt = new Date(Date.now() + OTP_MINUTES * 60 * 1000);
  await user.save({ validateBeforeSave: false });
  await sendEmail({
    to: user.email,
    subject: `${code} is your EJob verification code`,
    html: otpEmailHtml(user.firstName, code, OTP_MINUTES),
  });
};

/**
 * @swagger
 * /users/register:
 *   post:
 *     tags: [Onboarding]
 *     summary: Step 1a - Create an unverified account and email a 4-digit code
 *     description: >
 *       Creates the account (or reuses an existing unverified one with the same email)
 *       and sends a 4-digit verification code that expires in 10 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role, firstName, lastName, phoneNumber, email, password]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [jobseeker, employer, agent]
 *               firstName:
 *                 type: string
 *                 example: Adaeze
 *               lastName:
 *                 type: string
 *                 example: Okafor
 *               phoneNumber:
 *                 type: string
 *                 example: "08012345678"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: adaeze@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Minimum 8 characters with upper-case, lower-case and a number
 *                 example: Passw0rdOk
 *     responses:
 *       201:
 *         description: Account created and verification code sent
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
 *                   example: Verification code sent
 *                 email:
 *                   type: string
 *                   format: email
 *       400:
 *         description: Missing fields, invalid role or weak password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: A verified account with this email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error (including failure to send the email)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// STEP 1a — create the account (unverified) and email a 4-digit code
export const register = async (req, res) => {
  try {
    const { role, firstName, lastName, phoneNumber, email, password, referralCode } = req.body;

    if (!SIGNUP_ROLES.includes(role)) return fail(res, 400, "Choose jobseeker, employer or agent");
    if (![firstName, lastName, phoneNumber, email, password].every((v) => v?.toString().trim()))
      return fail(res, 400, "All fields are required");
    if (!isStrongPassword(password))
      return fail(res, 400, "Password needs 8+ characters with upper-case, lower-case and a number");

    const cleanEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: cleanEmail });

    if (user && user.isVerified) return fail(res, 409, "An account with this email already exists");

    // Re-use an unverified signup so people can retry with corrected details
    if (!user) user = new User({ email: cleanEmail });

    user.role = role;
    user.firstName = firstName.trim();
    user.lastName = lastName.trim();
    user.phoneNumber = phoneNumber.trim();
    user.password = await bcrypt.hash(password, 12);
    user.isVerified = false;
    user.registrationMethod = "self";

    // Employers have required company fields that arrive in step 2,
    // so skip full validation here. It runs in completeProfile.
    await user.save({ validateBeforeSave: false });
    if (referralCode?.trim() && !user.referredBy) {
  const referrer = await User.findOne({ referralCode: referralCode.trim().toUpperCase(), isVerified: true });
  if (!referrer || referrer.email === cleanEmail) return fail(res, 400, "That referral code isn't valid");
  user.referredBy = referrer._id;
}
    await issueOtp(user);

    res.status(201).json({ success: true, message: "Verification code sent", email: cleanEmail });
  } catch (err) {
    console.error("register:", err);
    fail(res, 500, "Could not create your account. Please try again.");
  }
};

/**
 * @swagger
 * /users/verify-otp:
 *   post:
 *     tags: [Onboarding]
 *     summary: Step 1b - Confirm the 4-digit email code
 *     description: Marks the account as verified and returns a JWT used for the next step.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: adaeze@example.com
 *               code:
 *                 type: string
 *                 pattern: '^\d{4}$'
 *                 example: "4821"
 *     responses:
 *       200:
 *         description: Email verified
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
 *                   example: Email verified
 *                 token:
 *                   type: string
 *                   description: JWT, valid for 7 days
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [jobseeker, employer, agent]
 *                     firstName:
 *                       type: string
 *       400:
 *         description: Invalid, incorrect or expired code
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
// STEP 1b — confirm the 4-digit code
export const verifyOtp = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !/^\d{4}$/.test(code || "")) return fail(res, 400, "Enter the 4-digit code");

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !user.emailOtp) return fail(res, 400, "Invalid or expired code");
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) return fail(res, 400, "This code has expired. Request a new one.");
    if (user.emailOtp !== hashOtp(code)) return fail(res, 400, "Incorrect code");

    user.isVerified = true;
    user.emailOtp = undefined;
    user.otpExpiresAt = undefined;
    await user.save({ validateBeforeSave: false });
    await rewardReferrer(user).catch((e) => console.error("referral:", e));
   
await Promise.all([
  grantWelcomeBonus(user),
  rewardReferrer(user),
]).catch((e) => console.error("rewards:", e));

    res.json({
      success: true,
      message: "Email verified",
      token: signToken(user),
      user: { id: user._id, role: user.role, firstName: user.firstName },
    });
  } catch (err) {
    console.error("verifyOtp:", err);
    fail(res, 500, "Could not verify your code. Please try again.");
  }
};

/**
 * @swagger
 * /users/resend-otp:
 *   post:
 *     tags: [Onboarding]
 *     summary: Send a new verification code
 *     description: Only available for unverified accounts, and no more than once every 60 seconds.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: adaeze@example.com
 *     responses:
 *       200:
 *         description: A new code has been sent
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
 *                   example: A new code has been sent
 *       400:
 *         description: Unknown email or account already verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Requested again before the 60-second cooldown ended
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
export const resendOtp = async (req, res) => {
  try {
    const user = await User.findOne({ email: (req.body.email || "").trim().toLowerCase() });
    if (!user || user.isVerified) return fail(res, 400, "Nothing to verify for this email");

    if (user.otpExpiresAt) {
      const sentAt = user.otpExpiresAt.getTime() - OTP_MINUTES * 60 * 1000;
      const wait = Math.ceil((sentAt + RESEND_SECONDS * 1000 - Date.now()) / 1000);
      if (wait > 0) return fail(res, 429, `Wait ${wait}s before requesting another code`);
    }

    await issueOtp(user);
    res.json({ success: true, message: "A new code has been sent" });
  } catch (err) {
    console.error("resendOtp:", err);
    fail(res, 500, "Could not resend the code");
  }
};

/**
 * @swagger
 * /users/complete-profile:
 *   put:
 *     tags: [Onboarding]
 *     summary: Step 2 - Complete the role-specific profile
 *     description: >
 *       Requires the JWT from verify-otp or login. Employers send company details;
 *       job seekers and agents send personal details. Job seekers must also send
 *       educationLevel and exactly 3 different jobChoice values.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *                 description: Employer only
 *                 example: Acme Logistics Ltd
 *               companyPhone:
 *                 type: string
 *                 description: Employer only
 *                 example: "08098765432"
 *               yearOfEstablishment:
 *                 type: integer
 *                 description: Employer only (1800 to current year)
 *                 example: 2015
 *               size:
 *                 type: string
 *                 description: Employer only (company size band)
 *               gender:
 *                 type: string
 *                 description: Job seeker and agent
 *               maritalStatus:
 *                 type: string
 *                 description: Job seeker and agent
 *               educationLevel:
 *                 type: string
 *                 description: Job seeker only
 *               jobChoice:
 *                 type: array
 *                 description: Job seeker only, exactly 3 different values
 *                 minItems: 3
 *                 maxItems: 3
 *                 items:
 *                   type: string
 *               state:
 *                 type: string
 *                 description: All roles
 *                 example: Lagos
 *               localGovernment:
 *                 type: string
 *                 description: All roles
 *                 example: Ikeja
 *               address:
 *                 type: string
 *                 description: All roles
 *                 example: 12 Allen Avenue
 *     responses:
 *       200:
 *         description: Profile saved
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
 *                   example: Profile completed
 *                 redirectTo:
 *                   type: string
 *                   example: /jobseeker
 *       400:
 *         description: Missing or invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Email not verified, or this account type has no onboarding
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: A company with this name is already registered
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
// STEP 2 — role-specific profile (requires the token from verifyOtp)
export const completeProfile = async (req, res) => {
  try {
    const user = req.user;
    const b = req.body;

    if (!user.isVerified) return fail(res, 403, "Verify your email first");
    if (!SIGNUP_ROLES.includes(user.role)) return fail(res, 403, "This account type has no onboarding");

    if (user.role === ROLES.EMPLOYER) {
      const required = ["companyName", "address", "yearOfEstablishment", "size", "state", "localGovernment", "companyPhone"];
      if (required.some((k) => !b[k]?.toString().trim())) return fail(res, 400, "Fill in all company details");

      const year = Number(b.yearOfEstablishment);
      if (!Number.isInteger(year) || year < 1800 || year > new Date().getFullYear())
        return fail(res, 400, "Enter a valid year of establishment");

      Object.assign(user, {
        companyName: b.companyName.trim(),
        address: b.address.trim(),
        yearOfEstablishment: year,
        size: b.size,
        state: b.state,
        localGovernment: b.localGovernment,
        companyPhone: b.companyPhone.trim(),
        employerType: user.employerType || "company",
        country: "Nigeria",
      });
    } else {
      const required = ["state", "localGovernment", "gender", "maritalStatus", "address"];
      if (user.role === ROLES.JOBSEEKER) required.push("educationLevel");
      if (required.some((k) => !b[k]?.toString().trim())) return fail(res, 400, "Fill in all required fields");

      Object.assign(user, {
        state: b.state,
        localGovernment: b.localGovernment,
        gender: b.gender,
        maritalStatus: b.maritalStatus,
        address: b.address.trim(),
        country: "Nigeria",
      });

      if (user.role === ROLES.JOBSEEKER) {
        const choices = Array.isArray(b.jobChoice) ? b.jobChoice.filter(Boolean) : [];
        if (choices.length !== 3 || new Set(choices).size !== 3)
          return fail(res, 400, "Pick 3 different job choices");
        user.educationLevel = b.educationLevel;
        user.jobChoice = choices;
      }
    }

    await user.save(); // full schema validation runs here

    res.json({ success: true, message: "Profile completed", redirectTo: REDIRECTS[user.role] });
  } catch (err) {
    if (err.code === 11000) return fail(res, 409, "A company with this name is already registered");
    if (err.name === "ValidationError") return fail(res, 400, Object.values(err.errors)[0].message);
    console.error("completeProfile:", err);
    fail(res, 500, "Could not save your profile. Please try again.");
  }
};

/**
 * @swagger
 * /users/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email or phone number
 *     description: >
 *       The identifier can be an email address or a phone number. Phone numbers are
 *       matched in 0801..., 234801... and +234801... formats. Unverified accounts
 *       are rejected with needsVerification set to true.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email address or phone number
 *                 example: adaeze@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Passw0rdOk
 *     responses:
 *       200:
 *         description: Logged in
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
 *                   example: Logged in
 *                 token:
 *                   type: string
 *                   description: JWT, valid for 7 days
 *                 user:
 *                   $ref: '#/components/schemas/UserSummary'
 *                 redirectTo:
 *                   type: string
 *                   example: /jobseeker
 *                 profileCompleted:
 *                   type: boolean
 *                   description: False if the user verified but never finished step 2
 *       400:
 *         description: Identifier or password missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Incorrect credentials (same message whether or not the account exists)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Account exists but email is not verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 needsVerification:
 *                   type: boolean
 *                   example: true
 *                 email:
 *                   type: string
 *                   format: email
 *       429:
 *         description: Too many attempts (when the login rate limiter is enabled)
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
// LOGIN — email or phone number + password
export const login = async (req, res) => {
  try {
    const identifier = String(req.body.identifier ?? "").trim();
    const password = String(req.body.password ?? "");

    if (!identifier || !password)
      return fail(res, 400, "Email or phone number and password are required");

    const query = identifier.includes("@")
      ? { email: identifier.toLowerCase() }
      : { phoneNumber: { $in: phoneVariants(identifier) } };

    // Phone numbers aren't unique in the schema, so check every match and
    // prefer verified accounts rather than trusting findOne to pick the right one.
    const candidates = await User.find(query)
      .select("+password")
      .sort({ isVerified: -1 })
      .limit(5);

    let user = null;
    for (const candidate of candidates) {
      if (candidate.password && (await bcrypt.compare(password, candidate.password))) {
        user = candidate;
        break;
      }
    }
    // Burn the same time as a real check when nothing matched the identifier
    if (!candidates.length) await bcrypt.compare(password, DUMMY_HASH);

    if (!user) return fail(res, 401, INVALID_LOGIN);

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Your account isn't verified yet. Please verify to continue.",
        needsVerification: true,
        email: user.email,
      });
    }

    res.json({
      success: true,
      message: "Logged in",
      token: signToken(user),
      user: {
        id: user._id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
      redirectTo: REDIRECTS[user.role] || "/",
      // Both onboarding branches set these in completeProfile
      profileCompleted: Boolean(user.state && user.localGovernment),
    });
  } catch (err) {
    console.error("login:", err);
    fail(res, 500, "Could not log you in. Please try again.");
  }
};


export const adminLogin = async (req, res) => {
  try {
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "");

    if (!email || !password)
      return fail(res, 400, "Email and password are required");

    const user = await User.findOne({ email }).select("+password");

    if (!user || user.password !== password)
      return fail(res, 401, INVALID_LOGIN);

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Your account isn't verified yet. Please verify to continue.",
        needsVerification: true,
        email: user.email,
      });
    }

    res.json({
      success: true,
      message: "Logged in",
      token: signToken(user),
      user: {
        id: user._id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
      redirectTo: REDIRECTS[user.role] || "/",
      profileCompleted: Boolean(user.state && user.localGovernment),
    });
  } catch (err) {
    console.error("login:", err);
    fail(res, 500, "Could not log you in. Please try again.");
  }
};













/**
 * @swagger
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get the logged-in user's details
 *     description: >
 *       Returns the account that owns the JWT in the Authorization header, including
 *       the role the dashboard uses to decide which sidebar items to show.
 *       Passwords, OTP codes, reset tokens and ID numbers are never returned.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The current user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 profileCompleted:
 *                   type: boolean
 *                   description: False when a job seeker, employer or agent has not finished onboarding step 2
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [superadmin, admin, jobseeker, employer, agent]
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     phoneNumber:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                     companyName:
 *                       type: string
 *                       description: Employers only
 *                     state:
 *                       type: string
 *                     localGovernment:
 *                       type: string
 *                     isVerified:
 *                       type: boolean
 *                     isStaff:
 *                       type: boolean
 *                     lastLogin:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Missing, invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Account has been blacklisted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: The account no longer exists
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
// export const getMe = async (req, res) => {
//   try {
//     // Re-read from the database so role changes and blacklisting apply immediately
//     const user = await User.findById(req.user._id).select(HIDDEN_FIELDS);

//     if (!user) return fail(res, 404, "Account not found");
//     if (user.isBlacklisted) return fail(res, 403, "This account has been suspended");

//     const needsOnboarding = ONBOARDING_ROLES.includes(user.role);

//     res.json({
//       success: true,
//       profileCompleted: !needsOnboarding || Boolean(user.state && user.localGovernment),
//       user, // toJSON already includes virtuals such as isStaff
//     });
//   } catch (err) {
//     console.error("getMe:", err);
//     fail(res, 500, "Could not load your account. Please try again.");
//   }
// };


export const getMe = async (req, res) => {
  try {
    // Re-read from the database so role changes and blacklisting apply immediately
    const user = await User.findById(req.user._id).select(HIDDEN_FIELDS);

    if (!user) return fail(res, 404, "Account not found");
    if (user.isBlacklisted) return fail(res, 403, "This account has been suspended");

    // Accounts created before referrals existed get their code the first time they load
    if (!user.referralCode) await user.save({ validateBeforeSave: false });

    const needsOnboarding = ONBOARDING_ROLES.includes(user.role);

    res.json({
      success: true,
      profileCompleted: !needsOnboarding || Boolean(user.state && user.localGovernment),
      user, // toJSON already includes virtuals such as isStaff
    });
  } catch (err) {
    console.error("getMe:", err);
    fail(res, 500, "Could not load your account. Please try again.");
  }
};









