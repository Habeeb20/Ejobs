






import User from '../models/User.js';
import { buildHostedVerificationUrl, buildReference,
  parseReference,
  verifyCallbackSignature,
  fetchVerificationSession,
  CHECK_TYPE_MAP, } from '../utils/verifyClient.js';


const FRONTEND_CALLBACK_URL = `${process.env.FRONTEND_URL}/verify/callback`;

const ALLOWED_TYPES = Object.keys(CHECK_TYPE_MAP);


export const initiateVerification = async (req, res) => {
  try {
    const { type } = req.body;

    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid verification type. Expected one of: ${ALLOWED_TYPES.join(', ')}`,
      });
    }

    const userId = req.user._id.toString();
    const reference = buildReference({ userId, type });

    const hostedUrl = buildHostedVerificationUrl({
      type,
      reference,
      redirectUrl: FRONTEND_CALLBACK_URL,
    });

    // Record that an attempt started, so the profile can show
    // "pending" state even if the user never completes the flow.
    await User.findByIdAndUpdate(userId, {
      $set: { 'identityVerification.lastAttemptAt': new Date() },
    });

    return res.status(200).json({ success: true, redirectUrl: hostedUrl });
  } catch (error) {
    console.error('[initiateVerification]', error);
    return res.status(500).json({ success: false, message: 'Could not start verification.' });
  }
};




export const confirmVerification = async (req, res) => {
  try {
    // Read from BOTH body and query params (safer for webhooks)
    const data = { ...req.query, ...req.body };
console.log(req.query)
console.log(req.body)
    const { 
      outcome, 
      reference, 
      session_id, 
      verified_at, 
      sig 
    } = data;

    console.log('[confirmVerification] Received Data:', data);

    if (!reference || !sig) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing reference or signature.' 
      });
    }

    // const isValid = verifyCallbackSignature({ reference, outcome, session_id, verified_at, sig });
    // if (!isValid) {
    //   return res.status(401).json({ 
    //     success: false, 
    //     message: 'Signature verification failed.' 
    //   });
    // }

    const { userId, type } = parseReference(reference);
    if (!userId || !ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Unrecognized reference.' 
      });
    }

    if (outcome !== 'success' && outcome !== 'verified' && outcome !== 'approved') {
      await User.findByIdAndUpdate(userId, {
        $set: { 'identityVerification.lastAttemptAt': new Date() },
      });
      return res.status(200).json({
        success: true,
        verified: false,
        type,
        message: 'Verification was not successful.',
      });
    }

    // Fetch session details
    const session = await fetchVerificationSession(session_id);

    const documentNumber = 
      session?.document?.number || 
      session?.data?.number || 
      session?.number || '';

    const matchedName = 
      session?.matchedName || 
      session?.data?.full_name || 
      session?.full_name || '';

    const verifiedAt = verified_at ? new Date(verified_at) : new Date();

    const fieldPathByType = {
      nin: 'identityVerification.nin',
      bvn: 'identityVerification.bvn',
      votersCard: 'identityVerification.votersCard',
      driverLicense: 'identityVerification.driverLicense',
      passport: 'identityVerification.passport',
      cac: 'identityVerification.cac',
    };

    const basePath = fieldPathByType[type];
    if (!basePath) {
      return res.status(400).json({ success: false, message: 'Invalid verification type.' });
    }

    const numberFieldByType = {
  nin: 'number',
  bvn: 'number',
  votersCard: 'vin',
  driverLicense: 'number',
  passport: 'number',
  cac: 'rcNumber',
};
const numberField = numberFieldByType[type];

  const update = {
  [`${basePath}.verified`]: true,
  [`${basePath}.matchedName`]: matchedName,
  [`${basePath}.verifiedAt`]: verifiedAt,
  [`${basePath}.sessionId`]: session_id,
  [`${basePath}.status`]: session?.status,
  [`${basePath}.source`]: session?.source,
  [`${basePath}.provider`]: session?.provider,
  [`${basePath}.first_name`]: session?.data?.first_name,
  [`${basePath}.last_name`]: session?.data?.last_name,
  [`${basePath}.middle_name`]: session?.data?.middle_name,
  [`${basePath}.date_of_birth`]: session?.data?.date_of_birth,
  [`${basePath}.gender`]: session?.data?.gender,
  [`${basePath}.phone_number`]: session?.data?.phone_number,
  [`${basePath}.state_of_origin`]: session?.data?.state_of_origin,
  [`${basePath}.photo`]: session?.data?.photo,
  [`${basePath}.confidence`]: session?.confidence,
  [`${basePath}.cost`]: session?.cost,
  'identityVerification.lastAttemptAt': new Date(),
};

if (documentNumber && numberField) {
  update[`${basePath}.last4`] = String(documentNumber).slice(-4);
  update[`${basePath}.${numberField}`] = documentNumber;
}
    const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      type,
      matchedName,
      last4: documentNumber ? String(documentNumber).slice(-4) : undefined,
      verifiedAt,
      approved: user.identityVerification?.approved,
    });

  } catch (error) {
    console.error('[confirmVerification] Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Could not confirm verification.' 
    });
  }
};

// export const confirmVerification = async (req, res) => {
//   try {
//     // Read from BOTH body and query params (safer for webhooks)
//     const data = { ...req.query, ...req.body };

//     const { 
//       outcome, 
//       reference, 
//       session_id, 
//       verified_at, 
//       sig 
//     } = data;

//     console.log('[confirmVerification] Received Data:', data);

//     if (!reference || !sig) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Missing reference or signature.' 
//       });
//     }

//     // const isValid = verifyCallbackSignature({ reference, outcome, session_id, verified_at, sig });
//     // if (!isValid) {
//     //   return res.status(401).json({ 
//     //     success: false, 
//     //     message: 'Signature verification failed.' 
//     //   });
//     // }

//     const { userId, type } = parseReference(reference);
//     if (!userId || !ALLOWED_TYPES.includes(type)) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Unrecognized reference.' 
//       });
//     }

//     if (outcome !== 'success' && outcome !== 'verified' && outcome !== 'approved') {
//       await User.findByIdAndUpdate(userId, {
//         $set: { 'identityVerification.lastAttemptAt': new Date() },
//       });
//       return res.status(200).json({
//         success: true,
//         verified: false,
//         type,
//         message: 'Verification was not successful.',
//       });
//     }

//     // Fetch session details
//     const session = await fetchVerificationSession(session_id);

//     const documentNumber = 
//       session?.document?.number || 
//       session?.data?.number || 
//       session?.number || '';

//     const matchedName = 
//       session?.matchedName || 
//       session?.data?.full_name || 
//       session?.full_name || '';

//     const verifiedAt = verified_at ? new Date(verified_at) : new Date();

//     const fieldPathByType = {
//       nin: 'identityVerification.nin',
//       bvn: 'identityVerification.bvn',
//       votersCard: 'identityVerification.votersCard',
//       driverLicense: 'identityVerification.driverLicense',
//       passport: 'identityVerification.passport',
//       cac: 'identityVerification.cac',
//     };

//     const basePath = fieldPathByType[type];
//     if (!basePath) {
//       return res.status(400).json({ success: false, message: 'Invalid verification type.' });
//     }

//     const update = {
//       [`${basePath}.verified`]: true,
//       [`${basePath}.matchedName`]: matchedName,
//       [`${basePath}.verifiedAt`]: verifiedAt,
//       [`${basePath}.sessionId`]: session_id,
//       'identityVerification.lastAttemptAt': new Date(),
//     };

//     if (documentNumber) {
//       update[`${basePath}.last4`] = String(documentNumber).slice(-4);
//       update[`${basePath}.number`] = documentNumber;
//     }

//     const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true });

//     if (!user) {
//       return res.status(404).json({ success: false, message: 'User not found.' });
//     }

//     return res.status(200).json({
//       success: true,
//       verified: true,
//       type,
//       matchedName,
//       last4: documentNumber ? String(documentNumber).slice(-4) : undefined,
//       verifiedAt,
//       approved: user.identityVerification?.approved,
//     });

//   } catch (error) {
//     console.error('[confirmVerification] Error:', error);
//     return res.status(500).json({ 
//       success: false, 
//       message: 'Could not confirm verification.' 
//     });
//   }
// };



export const getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('identityVerification');
    return res.status(200).json({ success: true, identityVerification: user?.identityVerification || {} });
  } catch (error) {
    console.error('[getVerificationStatus]', error);
    return res.status(500).json({ success: false, message: 'Could not load verification status.' });
  }
};

























