import mongoose from 'mongoose';

/**
 * A tiny collection used to generate human-friendly sequential IDs
 * (student numbers, teacher numbers, receipt numbers) atomically.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

export default Counter;
