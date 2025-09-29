// src/controllers/users.controller.js
import { User } from "../models/User.js";

export const getMe = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id).select("-password");
    return res.json({ success: true, data: me });
  } catch (e) { next(e); }
};

export const updateMe = async (req, res, next) => {
  try {
    const { fullname, avatar } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { ...(fullname && { fullname }), ...(avatar && { avatar }) },
      { new: true, runValidators: true, context: "query" }
    ).select("-password");
    if (!updated) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, data: updated });
  } catch (e) { next(e); }
};

export const changeMyPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const ok = await user.isPasswordCorrect(currentPassword);
    if (!ok) return res.status(400).json({ success: false, message: "Current password is incorrect" });
    user.password = newPassword; await user.save();
    return res.json({ success: true, message: "Password updated" });
  } catch (e) { next(e); }
};

/** Superadmin moderation */
export const listUsers = async (_req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.json({ success: true, data: users });
  } catch (e) { next(e); }
};
export const getUserById = async (req, res, next) => {
  try {
    const u = await User.findById(req.params.id).select("-password");
    if (!u) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, data: u });
  } catch (e) { next(e); }
};
export const deleteUserById = async (req, res, next) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, message: "User deleted" });
  } catch (e) { next(e); }
};
