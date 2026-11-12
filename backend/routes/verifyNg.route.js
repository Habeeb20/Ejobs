// // routes/verificationRoutes.js
// import express from 'express';
// import multer from 'multer';
// import { verifyToken } from '../middlewares/verifyToken.js';
// import { getVerificationStatus, verifyBVN, verifyNIN, verifyVotersCard } from '../controllers/verifyNgController.js';


// const router = express.Router();
// const upload = multer({ dest: 'tmp/' });

// router.get('/status', verifyToken, getVerificationStatus);
// router.post('/nin', verifyToken, verifyNIN);
// router.post('/bvn', verifyToken, verifyBVN);
// router.post('/voters-card', verifyToken, upload.single('image'), verifyVotersCard);

// export default router;






// routes/identityVerificationRoutes.js
import express from 'express';
import { initiateVerification,  confirmVerification,
  getVerificationStatus, } from '../controllers/verifyNg.controller.js';
import {protect} from '../middleware/auth.js';

const router = express.Router();

router.post('/initiate', protect, initiateVerification);
router.get('/status', protect, getVerificationStatus);

// No `protect` here on purpose — the browser arrives fresh from VerifyNG's
// redirect with no auth cookie/header. Identity is proven by the signed
// `reference`, verified inside confirmVerification itself.
router.get('/confirm', protect, confirmVerification);

export default router;

// In your main app file:
// import identityVerificationRoutes from './routes/identityVerificationRoutes.js';
// app.use('/api/identity-verification', identityVerificationRoutes);










