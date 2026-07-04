import os
import tempfile
import uuid
import httpx
import ffmpeg
from PIL import Image, ImageDraw, ImageFont
from supabase import create_client

def get_supabase_client():
    url = os.environ.get("SUPABASE_URL", "").replace("/rest/v1/", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    return create_client(url, key)

async def upload_local_file_to_supabase(local_path: str, bucket: str = "scheduled_posts") -> str:
    """Uploads a local file to Supabase and returns the public URL."""
    supabase = get_supabase_client()
    filename = os.path.basename(local_path)
    remote_path = f"processed/{filename}"
    
    with open(local_path, 'rb') as f:
        supabase.storage.from_(bucket).upload(
            path=remote_path,
            file=f,
            file_options={"content-type": "video/mp4" if filename.endswith(".mp4") else "image/jpeg"}
        )
        
    res = supabase.storage.from_(bucket).get_public_url(remote_path)
    return res

async def download_file(url: str, suffix: str = ".tmp") -> str:
    """Downloads a file from a URL to a temporary local file and returns the path."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        resp.raise_for_status()
        
        fd, temp_path = tempfile.mkstemp(suffix=suffix)
        with os.fdopen(fd, 'wb') as f:
            f.write(resp.content)
            
        return temp_path

async def mix_audio_with_video(video_url: str, audio_url: str) -> str:
    """
    Downloads a video and an audio file, mixes them using FFmpeg,
    and returns the local path to the newly created video file.
    """
    video_path = await download_file(video_url, suffix=".mp4")
    audio_path = await download_file(audio_url, suffix=".mp3")
    
    out_path = os.path.join(tempfile.gettempdir(), f"mixed_{uuid.uuid4().hex}.mp4")
    
    try:
        def run_ffmpeg():
            in_video = ffmpeg.input(video_path)
            in_audio = ffmpeg.input(audio_path)
            out = ffmpeg.output(
                in_video.video,
                in_audio.audio,
                out_path,
                vcodec="copy",
                acodec="aac",
                strict="experimental",
                shortest=None
            )
            out.run(overwrite_output=True, quiet=True)
            
        import asyncio
        await asyncio.to_thread(run_ffmpeg)
    finally:
        # Cleanup original downloads
        if os.path.exists(video_path):
            os.remove(video_path)
        if os.path.exists(audio_path):
            os.remove(audio_path)
            
    return out_path

async def overlay_mentions_on_image(image_url: str, mentions: list[str]) -> str:
    """
    Downloads an image, overlays the mentions text using Pillow,
    and returns the local path to the modified image.
    """
    image_path = await download_file(image_url, suffix=".jpg")
    out_path = os.path.join(tempfile.gettempdir(), f"overlay_{uuid.uuid4().hex}.jpg")
    
    try:
        def run_pillow():
            with Image.open(image_path) as img:
                draw = ImageDraw.Draw(img)
                try:
                    font = ImageFont.truetype("arial.ttf", size=max(32, int(img.width * 0.04)))
                except IOError:
                    font = ImageFont.load_default()
                    
                text = " ".join(mentions)
                bbox = draw.textbbox((0, 0), text, font=font)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]
                
                x = (img.width - text_width) // 2
                y = int(img.height * 0.1)
                
                padding = 10
                draw.rectangle(
                    [x - padding, y - padding, x + text_width + padding, y + text_height + padding],
                    fill=(0, 0, 0, 128)
                )
                
                draw.text((x, y), text, font=font, fill=(255, 255, 255))
                img.convert("RGB").save(out_path, "JPEG", quality=90)
                
        import asyncio
        await asyncio.to_thread(run_pillow)
            
    finally:
        if os.path.exists(image_path):
            os.remove(image_path)
            
    return out_path
