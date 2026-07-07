from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
import io
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/editor", tags=["editor"])

@router.post("/remove-bg")
async def remove_background(file: UploadFile = File(...)):
    """
    Takes an uploaded image and removes its background using rembg (U^2-Net model).
    Returns the processed image as a PNG.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    try:
        # Import inside the function so it doesn't crash the server if rembg isn't installed
        from rembg import remove
        from PIL import Image

        image_data = await file.read()
        
        # We need to process it
        input_image = Image.open(io.BytesIO(image_data))
        
        # rembg automatically handles the extraction and returns a PIL Image or bytes.
        # We'll use the byte-level processing for speed and simplicity.
        output_data = remove(image_data)
        
        return Response(content=output_data, media_type="image/png")

    except ImportError:
        logger.error("rembg is not installed. Run: pip install rembg")
        raise HTTPException(status_code=500, detail="AI engine not installed on server.")
    except Exception as e:
        logger.error(f"Error removing background: {e}")
        raise HTTPException(status_code=500, detail=str(e))
