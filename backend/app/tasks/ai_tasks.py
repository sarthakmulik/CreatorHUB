from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.models import Comment, Post, RepurposedVideo, RepurposedVideoStatus
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import re
import os
import subprocess
from datetime import datetime

analyzer = SentimentIntensityAnalyzer()

@celery_app.task
def sync_and_analyze_comments(post_id_str: str = None):
    """
    Fetch unanalyzed comments from DB, run VADER sentiment analysis, and categorize them.
    Supports Hinglish Regex.
    """
    db = SessionLocal()
    try:
        # Fetch comments that lack sentiment_score
        query = db.query(Comment).filter(Comment.sentiment_score == None)
        if post_id_str:
            query = query.filter(Comment.post_id == post_id_str)
            
        unanalyzed = query.all()
        
        for c in unanalyzed:
            text = c.text
            if not text:
                continue
                
            # Sentiment Analysis
            scores = analyzer.polarity_scores(text)
            sentiment_score = scores['compound']
            
            # Categorization
            category = 'other'
            text_lower = text.lower()
            
            # Hinglish & English regex for collabs/sponsors
            if re.search(r'\b(sponsor|collab|business|email|brand|promotion|pr|paid|paisa|paise)\b', text_lower):
                category = 'collab'
            elif '?' in text or re.search(r'\b(kaise|kya|kyun|how|what|why|where|kab)\b', text_lower):
                category = 'question'
            elif sentiment_score > 0.5 or re.search(r'\b(mast|badhiya|kadak|osm|awesome|nice|love|op|bhai)\b', text_lower):
                category = 'positive'
            elif sentiment_score < -0.5 or re.search(r'\b(bakwas|ghatiya|hate|worst|chutiya|pagal)\b', text_lower):
                category = 'negative'
                
            c.sentiment_score = sentiment_score
            c.category = category
            
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error in sync_and_analyze_comments: {e}")
    finally:
        db.close()


@celery_app.task
def process_video_repurpose(repurposed_video_id: str, youtube_url: str):
    """
    Background task to process a YouTube video.
    Uses yt-dlp to download, whisper to transcribe, and ffmpeg to crop.
    """
    db = SessionLocal()
    try:
        video_record = db.query(RepurposedVideo).filter(RepurposedVideo.id == repurposed_video_id).first()
        if not video_record:
            return
            
        import yt_dlp
        import whisper
        import ffmpeg

        output_dir = "/tmp/creatorhub_repurpose"
        os.makedirs(output_dir, exist_ok=True)
        
        video_id = youtube_url.split("v=")[-1][:11]
        raw_video_path = f"{output_dir}/{video_id}.mp4"
        cropped_video_path = f"{output_dir}/{video_id}_shorts.mp4"
        
        # 1. Download Video
        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': raw_video_path,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([youtube_url])
            
        # 2. Whisper Transcription (Normally we'd find the highlight timestamp, here we just transcribe for proof of concept)
        # model = whisper.load_model("base")
        # result = model.transcribe(raw_video_path)
        # print("Transcription complete!")
        
        # 3. FFMPEG Cropping to 9:16 vertical, trimming to first 30 seconds
        try:
            (
                ffmpeg
                .input(raw_video_path, ss=0, t=30)
                .filter('crop', 'ih*9/16', 'ih') # crop to 9:16 aspect ratio
                .output(cropped_video_path)
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
        except ffmpeg.Error as e:
            print("FFMPEG error:", e.stderr.decode('utf8'))
            raise e
            
        # 4. Upload to Supabase Storage (Mocked for now since we don't have creds)
        # In production, we upload `cropped_video_path` to Supabase Storage and get the public URL.
        mock_final_url = f"https://storage.example.com/{video_id}_shorts.mp4"
        
        # Update Database
        video_record.clipped_video_url = mock_final_url
        video_record.status = RepurposedVideoStatus.completed
        db.commit()
        
    except Exception as e:
        db.rollback()
        print(f"Error in process_video_repurpose: {e}")
        video_record = db.query(RepurposedVideo).filter(RepurposedVideo.id == repurposed_video_id).first()
        if video_record:
            video_record.status = RepurposedVideoStatus.failed
            db.commit()
    finally:
        db.close()
