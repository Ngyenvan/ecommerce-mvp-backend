import { Schema } from 'mongoose';

export const COUNTER_MODEL_NAME = 'Counter';

export interface CounterRecord {
  _id: string;
  sequence: number;
}

export const CounterSchema = new Schema<CounterRecord>(
  {
    _id: {
      type: String,
      required: true,
    },
    sequence: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    collection: 'counters',
    versionKey: false,
  },
);
