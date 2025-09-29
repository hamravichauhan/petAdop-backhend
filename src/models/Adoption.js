import mongoose from "mongoose";

const adoptionSchema = new mongoose.Schema(
  {
    pet: {
         type: mongoose.Schema.Types.ObjectId,
          ref: "Pet",
          required: true 
        },
    applicant: { 
        type: mongoose.Schema.Types.ObjectId,
         ref: "User",
          required: true
         },
    message: { type: String },
    status: {
         type: String,
         enum: ["pending", "approved", "rejected", "withdrawn"],
         default: "pending" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Adoption", adoptionSchema);
