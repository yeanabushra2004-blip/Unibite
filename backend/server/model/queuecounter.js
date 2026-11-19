import mongoose from "mongoose";

const queueCounterSchema = new mongoose.Schema({
	day: { type: String, required: true, unique: true },
	value: { type: Number, required: true, default: 0 },
});

const QueueCounter = mongoose.model("QueueCounter", queueCounterSchema);

export default QueueCounter;
