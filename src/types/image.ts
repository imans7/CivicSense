export type ImageKind = "REPORT" | "VERIFICATION" | "RESOLUTION" | "AVATAR";

export type UploadedImage = {
  publicId: string;
  imageUrl: string;
  mimeType: string;
  sizeBytes: number;
};
