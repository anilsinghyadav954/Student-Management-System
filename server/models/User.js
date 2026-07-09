import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // never returned by default in queries
    },
    role: {
      type: String,
      enum: {
        values: ["admin", "student"],
        message: "Role must be either 'admin' or 'student'",
      },
      default: "student",
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, "Phone number must be 10 digits"],
    },
    profileImage: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" }, // Cloudinary public_id, for deletion/replacement
    },
    isActive: {
      type: Boolean,
      default: true, // admins can deactivate accounts instead of deleting them
    },
    lastLogin: {
      type: Date,
    },

    // ---- Forgot Password OTP flow ----
    resetOTP: {
      type: String,
      select: false, // stored as a SHA-256 hash, never the raw OTP
    },
    resetOTPExpiry: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

// Hash password before saving, but only if it was modified (avoids
// re-hashing an already-hashed password on unrelated profile updates)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

// Instance method to compare a plaintext password against the stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Hide sensitive fields whenever a user document is serialized to JSON
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetOTP;
  delete obj.resetOTPExpiry;
  delete obj.__v;
  return obj;
};

userSchema.index({ role: 1 });

const User = mongoose.model("User", userSchema);
export default User;
