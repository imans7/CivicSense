import { z } from "zod";
export const registerSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(191).transform(x=>x.toLowerCase()), password: z.string().min(10).max(100) });
export const loginSchema = z.object({ email: z.string().trim().email().transform(x=>x.toLowerCase()), password: z.string().min(1) });
export const reportSchema = z.object({
 title: z.string().trim().min(8).max(150), description: z.string().trim().min(20).max(5000), categoryId: z.string().min(1),
 latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180), address: z.string().trim().max(255).optional(),
 severity: z.coerce.number().int().min(1).max(5), safetyRisk: z.coerce.number().int().min(1).max(5), affectedPeople: z.coerce.number().int().min(1).max(5), durationDays: z.coerce.number().int().min(0).max(3650),
 images: z.array(z.object({ publicId: z.string().min(1).max(255) })).min(1).max(5)
});
export const transitionSchema = z.object({ status: z.enum(["VERIFIED", "REJECTED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"]), note: z.string().trim().max(500).optional(), assignedToId: z.string().optional(), images: z.array(z.object({publicId:z.string()})).max(5).optional() });
