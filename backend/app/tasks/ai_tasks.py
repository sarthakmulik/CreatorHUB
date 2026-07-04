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
def sync_and_analyze_comments(post_id_str: str):
    """
    Mock task to simulate fetching comments from a social platform,
    running VADER sentiment analysis, and categorizing them.
    """
    db = SessionLocal()
    try:
        # In a real scenario, we'd fetch from YouTube/Instagram API using the post ID.
        # Here we just generate some mock comments for demonstration.
        mock_comments = [
            {"author": "Brand Deals Co", "text": "Love your content! Are you open for a sponsor or collab?", "url": ""},
            {"author": "Curious Viewer", "text": "How did you edit the second part? What software do you use?", "url": ""},
            {"author": "Troll123", "text": "This is the worst video ever. Unsubscribed.", "url": ""},
            {"author": "Superfan 99", "text": "You are literally the best creator on this app!!!", "url": ""},
        ]
        
        for mc in mock_comments:
            text = mc["text"]
            
            # Sentiment Analysis
            scores = analyzer.polarity_scores(text)
            sentiment_score = scores['compound']
            
            # Categorization
            category = 'other'
            text_lower = text.lower()
            if re.search(r'\b(sponsor|collab|business|email|brand)\b', text_lower):
                category = 'collab'
            elif '?' in text:
                category = 'question'
            elif sentiment_score > 0.5:
                category = 'positive'
            elif sentiment_score < -0.5:
                category = 'negative'
                
            new_comment = Comment(
                post_id=post_id_str,
                author_name=mc["author"],
                author_profile_url=mc["url"],
                text=text,
                sentiment_score=sentiment_score,
                category=category
            )
            db.add(new_comment)
        
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
