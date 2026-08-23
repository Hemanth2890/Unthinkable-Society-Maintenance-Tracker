/**
 * Thin abstraction over the storage provider so API routes never talk to
 * Cloudinary/Uploadthing directly. Swap the implementation body without
 * touching callers.
 */
export async function uploadComplaintPhoto(file: File): Promise<string> {
  if (!process.env.CLOUDINARY_URL) {
    // Local/dev fallback: no external call, deterministic mock URL.
    return `/uploads/mock/${encodeURIComponent(file.name)}`;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", process.env.CLOUDINARY_UPLOAD_PRESET!);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) throw new Error("Photo upload failed");
  const data = await res.json();
  return data.secure_url as string;
}
