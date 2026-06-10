import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Uploads an image buffer to Cloudinary and returns the secure HTTPS URL.
 * 
 * @param fileBuffer The raw file Buffer to upload
 * @param folder The folder name in Cloudinary to store the image under
 */
export async function uploadToCloudinary(fileBuffer: Buffer, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload stream error:", error)
          return reject(error)
        }
        if (!result) {
          return reject(new Error("Cloudinary upload result is undefined"))
        }
        resolve(result.secure_url)
      }
    )
    uploadStream.end(fileBuffer)
  })
}
