import mongoose, { Schema, model, models } from 'mongoose';

export interface IBrand {
  name: string;
  image?: string;
  bannerImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaImage?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>(
  {
    name: {
      type: String,
      required: [true, 'Brand name is required'],
      trim: true,
      unique: true,
    },
    image: {
      type: String,
      trim: true,
    },
    bannerImage: {
      type: String,
      trim: true,
    },
    metaTitle: {
      type: String,
      trim: true,
    },
    metaDescription: {
      type: String,
      trim: true,
    },
    metaImage: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

const Brand = models.Brand || model<IBrand>('Brand', BrandSchema);

export default Brand;
