import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: "Not authorised" });

    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id);
    if (!user) return res.status(401).json({ success: false, message: "Account not found" });
    if (user.isBlacklisted) return res.status(403).json({ success: false, message: "Account suspended" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Session expired. Please sign in again." });
  }
};



export const authorize =
  (...roles) =>
  (req, res, next) => {
    const allowed = roles.flat();

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Please log in to continue." });
    }

    if (!allowed.includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "You don't have permission to do this." });
    }

    next();
  };
