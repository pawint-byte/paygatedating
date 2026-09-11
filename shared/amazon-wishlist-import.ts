import { z } from "zod";

/**
 * The Amazon importer is deliberately a preview-only contract.  Keeping these
 * schemas in shared code means that the browser and the server agree on the
 * exact shape and do not need to share any importer implementation details.
 */
export const amazonWishlistImportRequestSchema = z.object({
  url: z.string(),
}).strict();

export const amazonWishlistCandidateSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.string(),
  imageUrl: z.string(),
  productUrl: z.string(),
}).strict();

export const amazonWishlistPreviewSchema = z.object({
  sourceUrl: z.string(),
  candidates: z.array(amazonWishlistCandidateSchema),
  warnings: z.array(z.string()),
}).strict();

export type AmazonWishlistImportRequest = z.infer<typeof amazonWishlistImportRequestSchema>;
export type AmazonWishlistCandidate = z.infer<typeof amazonWishlistCandidateSchema>;
export type AmazonWishlistPreview = z.infer<typeof amazonWishlistPreviewSchema>;
