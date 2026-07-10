import { z } from "zod";

export const addressSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  line1: z.string().min(4).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
});

export const createOrderSchema = z.object({
  addressId: z.string().cuid().optional(),
  address: addressSchema.optional(),
  paymentMethod: z.enum(["RAZORPAY", "COD"]),
  couponCode: z.string().max(40).optional(),
  giftWrap: z.boolean().optional(),
  giftNote: z.string().max(300).optional(),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().cuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export const addToCartSchema = z.object({
  variantId: z.string().cuid(),
  quantity: z.number().int().min(1).max(10),
});

export const reviewSchema = z.object({
  productId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().max(2000).optional(),
});
