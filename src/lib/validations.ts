 import { z } from "zod";
 
 // Constants for validation limits
 export const VALIDATION_LIMITS = {
   NAME_MAX_LENGTH: 200,
   DESCRIPTION_MAX_LENGTH: 5000,
   SKU_MAX_LENGTH: 100,
   PRICE_MAX: 999999999,
   DIMENSION_MAX: 99999,
   FILE_SIZE_LIMITS: {
     IMAGE: 10 * 1024 * 1024, // 10MB
     VIDEO: 100 * 1024 * 1024, // 100MB
     MODEL_3D: 50 * 1024 * 1024, // 50MB
   },
   ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
   ALLOWED_VIDEO_TYPES: ["video/mp4", "video/webm", "video/quicktime"],
   ALLOWED_3D_EXTENSIONS: [".obj", ".gltf", ".glb"],
 } as const;
 
 // Product form validation schema
 export const productFormSchema = z.object({
   name: z
     .string()
     .trim()
     .min(1, "Product name is required")
     .max(VALIDATION_LIMITS.NAME_MAX_LENGTH, `Name must be less than ${VALIDATION_LIMITS.NAME_MAX_LENGTH} characters`),
   category: z.string().min(1, "Category is required"),
   actualPrice: z
     .string()
     .trim()
     .min(1, "Actual price is required")
     .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Must be a valid positive number")
     .refine((val) => parseFloat(val) <= VALIDATION_LIMITS.PRICE_MAX, `Price cannot exceed ${VALIDATION_LIMITS.PRICE_MAX}`),
   sellingPrice: z
     .string()
     .trim()
     .min(1, "Selling price is required")
     .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Must be a valid positive number")
     .refine((val) => parseFloat(val) <= VALIDATION_LIMITS.PRICE_MAX, `Price cannot exceed ${VALIDATION_LIMITS.PRICE_MAX}`),
   sku: z
     .string()
     .trim()
     .min(1, "SKU is required")
     .max(VALIDATION_LIMITS.SKU_MAX_LENGTH, `SKU must be less than ${VALIDATION_LIMITS.SKU_MAX_LENGTH} characters`)
     .regex(/^[a-zA-Z0-9-_]+$/, "SKU can only contain letters, numbers, hyphens, and underscores"),
   length: z
     .string()
     .trim()
     .min(1, "Length is required")
     .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Must be a positive number")
     .refine((val) => parseFloat(val) <= VALIDATION_LIMITS.DIMENSION_MAX, `Length cannot exceed ${VALIDATION_LIMITS.DIMENSION_MAX}`),
   width: z
     .string()
     .trim()
     .min(1, "Width is required")
     .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Must be a positive number")
     .refine((val) => parseFloat(val) <= VALIDATION_LIMITS.DIMENSION_MAX, `Width cannot exceed ${VALIDATION_LIMITS.DIMENSION_MAX}`),
   height: z
     .string()
     .trim()
     .min(1, "Height is required")
     .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Must be a positive number")
     .refine((val) => parseFloat(val) <= VALIDATION_LIMITS.DIMENSION_MAX, `Height cannot exceed ${VALIDATION_LIMITS.DIMENSION_MAX}`),
   weight: z
     .string()
     .trim()
     .min(1, "Weight is required")
     .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Must be a positive number")
     .refine((val) => parseFloat(val) <= VALIDATION_LIMITS.DIMENSION_MAX, `Weight cannot exceed ${VALIDATION_LIMITS.DIMENSION_MAX}`),
 });
 
 // Partial schema for products with variants (fewer required fields)
 export const productWithVariantsSchema = z.object({
   name: z
     .string()
     .trim()
     .min(1, "Product name is required")
     .max(VALIDATION_LIMITS.NAME_MAX_LENGTH, `Name must be less than ${VALIDATION_LIMITS.NAME_MAX_LENGTH} characters`),
   category: z.string().min(1, "Category is required"),
 });

 // Digital product schema - no shipping/package details required
 export const digitalProductFormSchema = z.object({
   name: z
     .string()
     .trim()
     .min(1, "Product name is required")
     .max(VALIDATION_LIMITS.NAME_MAX_LENGTH, `Name must be less than ${VALIDATION_LIMITS.NAME_MAX_LENGTH} characters`),
   category: z.string().min(1, "Category is required"),
   actualPrice: z
     .string()
     .trim()
     .min(1, "Actual price is required")
     .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Must be a valid positive number")
     .refine((val) => parseFloat(val) <= VALIDATION_LIMITS.PRICE_MAX, `Price cannot exceed ${VALIDATION_LIMITS.PRICE_MAX}`),
   sellingPrice: z
     .string()
     .trim()
     .min(1, "Selling price is required")
     .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Must be a valid positive number")
     .refine((val) => parseFloat(val) <= VALIDATION_LIMITS.PRICE_MAX, `Price cannot exceed ${VALIDATION_LIMITS.PRICE_MAX}`),
   sku: z
     .string()
     .trim()
     .min(1, "SKU is required")
     .max(VALIDATION_LIMITS.SKU_MAX_LENGTH, `SKU must be less than ${VALIDATION_LIMITS.SKU_MAX_LENGTH} characters`)
     .regex(/^[a-zA-Z0-9-_]+$/, "SKU can only contain letters, numbers, hyphens, and underscores"),
 });
 
 // Category form validation schema
 export const categoryFormSchema = z.object({
   name: z
     .string()
     .trim()
     .min(1, "Category name is required")
     .max(VALIDATION_LIMITS.NAME_MAX_LENGTH, `Name must be less than ${VALIDATION_LIMITS.NAME_MAX_LENGTH} characters`),
   description: z
     .string()
     .max(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH, `Description must be less than ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters`)
     .optional(),
 });
 
 // Attribute form validation schema
 export const attributeFormSchema = z.object({
   name: z
     .string()
     .trim()
     .min(1, "Attribute name is required")
     .max(VALIDATION_LIMITS.NAME_MAX_LENGTH, `Name must be less than ${VALIDATION_LIMITS.NAME_MAX_LENGTH} characters`),
   dataType: z.string().min(1, "Data type is required"),
 });
 
 // YouTube URL validation
 export const youtubeUrlSchema = z
   .string()
   .trim()
   .refine((url) => {
     const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})$/;
     return regex.test(url);
   }, "Please enter a valid YouTube URL");
 
 // File validation utilities
 export function validateImageFile(file: File): { valid: boolean; error?: string } {
   if (!VALIDATION_LIMITS.ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
     return { valid: false, error: "Invalid image type. Allowed: JPG, PNG, WEBP, GIF" };
   }
   if (file.size > VALIDATION_LIMITS.FILE_SIZE_LIMITS.IMAGE) {
     return { valid: false, error: "Image size must be less than 10MB" };
   }
   return { valid: true };
 }
 
 export function validateVideoFile(file: File): { valid: boolean; error?: string } {
   if (!VALIDATION_LIMITS.ALLOWED_VIDEO_TYPES.includes(file.type as any)) {
     return { valid: false, error: "Invalid video type. Allowed: MP4, WEBM, MOV" };
   }
   if (file.size > VALIDATION_LIMITS.FILE_SIZE_LIMITS.VIDEO) {
     return { valid: false, error: "Video size must be less than 100MB" };
   }
   return { valid: true };
 }
 
 export function validate3DModelFile(file: File): { valid: boolean; error?: string } {
   const extension = "." + file.name.split(".").pop()?.toLowerCase();
   if (!VALIDATION_LIMITS.ALLOWED_3D_EXTENSIONS.includes(extension as any)) {
     return { valid: false, error: "Invalid 3D model type. Allowed: OBJ, GLTF, GLB" };
   }
   if (file.size > VALIDATION_LIMITS.FILE_SIZE_LIMITS.MODEL_3D) {
     return { valid: false, error: "3D model size must be less than 50MB" };
   }
   return { valid: true };
 }
 
 // Sanitize text input - basic XSS prevention
 export function sanitizeText(input: string): string {
   return input
     .replace(/</g, "&lt;")
     .replace(/>/g, "&gt;")
     .replace(/"/g, "&quot;")
     .replace(/'/g, "&#x27;");
 }
 
 // Format validation errors from Zod for display
 export function formatZodErrors(error: z.ZodError): Record<string, string> {
   const errors: Record<string, string> = {};
   error.errors.forEach((err) => {
     const path = err.path.join(".");
     if (!errors[path]) {
       errors[path] = err.message;
     }
   });
   return errors;
 }