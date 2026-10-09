import mongoose from 'mongoose';
import { hashPassword, verifyPassword } from '../utils/password.js';

/**
 * Application users: administrators and teachers.
 * This is separate from the Teacher profile record (see Teacher model).
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 200,
    },
    // select:false = password hash is NOT returned unless explicitly asked for.
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['admin', 'teacher'],
      default: 'teacher',
      index: true,
    },
    // Optional link to the Teacher profile this account belongs to.
    teacherProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
    // Bumped whenever the password changes. Tokens carrying an older version
    // become invalid immediately, without relying on second-resolution timestamps.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.index({ createdAt: -1 });

/** Hashes and stores a new password. Call this, then save(). */
userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await hashPassword(plain);
  this.passwordChangedAt = new Date();
  this.tokenVersion = (this.tokenVersion || 0) + 1;
};

/** Compares a plain password with the stored hash. */
userSchema.methods.comparePassword = function comparePassword(plain) {
  return verifyPassword(plain, this.passwordHash);
};

/** Never send the password hash to the client. */
userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
