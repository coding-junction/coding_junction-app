import asyncio
import cloudinary
import cloudinary.uploader
from fastapi import UploadFile
from core.config import settings

# Initialize Cloudinary configuration
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

async def upload_profile_image(file: UploadFile) -> str:
    """
    Uploads a profile image to Cloudinary in 'coding_junction/profiles' folder.
    Applies auto-format optimization (converting to WebP) and quality compression.
    """
    # Cloudinary upload call is blocking, so run it in a separate thread to keep it async-compatible
    def _upload():
        response = cloudinary.uploader.upload(
            file.file,
            folder="coding_junction/profiles",
            resource_type="image",
            fetch_format="auto",
            quality="auto"
        )
        return response.get("secure_url")

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _upload)

async def upload_verification_doc(file: UploadFile) -> str:
    """
    Uploads a verification document (ID card or fee receipt) to Cloudinary in 'coding_junction/documents' folder.
    Uses 'auto' resource type to handle PDF or images.
    """
    def _upload():
        response = cloudinary.uploader.upload(
            file.file,
            folder="coding_junction/documents",
            resource_type="auto"
        )
        return response.get("secure_url")

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _upload)
