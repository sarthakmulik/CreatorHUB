"use client";
import { API_URL } from "@/lib/utils";

import { useState, useEffect } from "react";
import { X, Tv, Camera, UploadCloud, Clock, Check, Scissors, Sparkles, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ImageCropperModal from "./ImageCropperModal";
import StoryEditorModal from "./StoryEditorModal";

interface CreatePostModalProps {
  initialDate: Date;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePostModal({ initialDate, onClose, onSuccess }: CreatePostModalProps) {
  const supabase = createClient();
  const [sessionUser, setSessionUser] = useState<any>(null);
  
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [time, setTime] = useState("12:00");
  
  const [youtubeMeta, setYoutubeMeta] = useState({
    title: "",
    description: "",
    privacyStatus: "private",
    madeForKids: false,
    tags: ""
  });

  const [instagramMeta, setInstagramMeta] = useState({
    postType: "reel",
    shareToFeed: true,
    collaborators: "",
    mentions: ""
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [croppingFileIndex, setCroppingFileIndex] = useState<number | null>(null);
  const [editingStoryFileIndex, setEditingStoryFileIndex] = useState<number | null>(null);
  const [bestTimeSlots, setBestTimeSlots] = useState<any[]>([]);

  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [captionLanguage, setCaptionLanguage] = useState("english");
  const [captionTopic, setCaptionTopic] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSessionUser(user);
    });
  }, []);

  useEffect(() => {
    if (sessionUser?.id) {
      fetch(`${API_URL}/api/instagram/best-time-by-user/${sessionUser.id}`)
        .then(r => r.json())
        .then(d => {
          if (d.top_slots) setBestTimeSlots(d.top_slots);
        })
        .catch(console.error);
    }
  }, [sessionUser?.id]);

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const generateThumbnail = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 150;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxSize) { height = height * (maxSize / width); width = maxSize; }
          } else {
            if (height > maxSize) { width = width * (maxSize / height); height = maxSize; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject("Failed");
          }, 'image/jpeg', 0.6);
        };
        img.src = URL.createObjectURL(file);
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.onloadeddata = () => { video.currentTime = 1; };
        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 150;
          let width = video.videoWidth;
          let height = video.videoHeight;
          if (width > height) {
            if (width > maxSize) { height = height * (maxSize / width); width = maxSize; }
          } else {
            if (height > maxSize) { width = width * (maxSize / height); height = maxSize; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject("Failed");
          }, 'image/jpeg', 0.6);
        };
        video.onerror = () => reject("Failed");
        video.src = URL.createObjectURL(file);
        video.load();
      } else {
        reject("Unsupported file type");
      }
    });
  };

  // High-Quality Image Compressor for Instagram
  const optimizeImageForInstagram = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file); // Only optimize images
        return;
      }
      
      // Bypass padding for manually cropped images
      if (file.name.includes('__cropped')) {
        resolve(file);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Instagram Carousel strictly requires ALL media to have the EXACT SAME aspect ratio.
        // It also strictly rejects any aspect ratio outside 4:5 to 1.91:1.
        // To guarantee 100% compliance for multiple images, we pad all images into a perfect 1080x1080 Square (1:1).
        const CANVAS_SIZE = 1080;
        
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // White background for padding
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          let drawWidth = img.width;
          let drawHeight = img.height;
          
          // Fit image within CANVAS_SIZE x CANVAS_SIZE while maintaining aspect ratio
          const scale = Math.min(CANVAS_SIZE / drawWidth, CANVAS_SIZE / drawHeight);
          drawWidth = drawWidth * scale;
          drawHeight = drawHeight * scale;
          
          const offsetX = (CANVAS_SIZE - drawWidth) / 2;
          const offsetY = (CANVAS_SIZE - drawHeight) / 2;
          
          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        }

        // Export as 95% quality JPEG to bypass Meta's aggressive re-compression
        canvas.toBlob((blob) => {
          if (blob) {
            const newName = file.name.replace(/\.[^/.]+$/, "") + "_ig_hq.jpg";
            const optimizedFile = new File([blob], newName, { type: 'image/jpeg' });
            resolve(optimizedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.95);
      };
      
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSubmit = async () => {
    if (platforms.length === 0) { setError("Please select at least one platform."); return; }
    if (!caption) { setError("Please enter a caption."); return; }
    if (files.length === 0) { setError("Please select at least one media file to upload."); return; }
    
    setIsSubmitting(true);
    setError("");

    try {
      const [hours, minutes] = time.split(":").map(Number);
      const scheduledTime = new Date(initialDate);
      scheduledTime.setHours(hours, minutes, 0, 0);

      if (scheduledTime < new Date()) {
        setError("You cannot schedule a post in the past. Please choose a future date/time.");
        setIsSubmitting(false);
        return;
      }

      // Pre-optimize all image files for Instagram
      const optimizedFiles = await Promise.all(files.map(optimizeImageForInstagram));

      // Upload Audio if selected
      let uploadedAudioUrl = "";
      if (audioFile && platforms.includes("instagram")) {
        const fileExt = audioFile.name.split('.').pop();
        const fileName = `${sessionUser.id}/audio_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('scheduled_posts')
          .upload(fileName, audioFile);

        if (!uploadError) {
          const { data: { publicUrl: mUrl } } = supabase.storage
            .from('scheduled_posts')
            .getPublicUrl(fileName);
          uploadedAudioUrl = mUrl;
        }
      }

      // Upload files to Supabase Storage
      const uploadedUrls: string[] = [];
      for (const file of optimizedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${sessionUser.id}/${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('scheduled_posts')
          .upload(fileName, file);

        if (uploadError) throw new Error("File upload failed: " + uploadError.message);

        const { data: { publicUrl: mUrl } } = supabase.storage
          .from('scheduled_posts')
          .getPublicUrl(fileName);
        uploadedUrls.push(mUrl);
      }
      const mediaUrl = uploadedUrls.join(",");

      // Generate and upload thumbnail (just for the first file)
      let thumbnailUrl = null;
      try {
        const thumbBlob = await generateThumbnail(files[0]);
        const thumbName = `${sessionUser.id}/thumb_${Math.random().toString(36).substring(2, 15)}.jpg`;
        const { error: thumbError } = await supabase.storage
          .from('scheduled_posts')
          .upload(thumbName, thumbBlob);
        
        if (!thumbError) {
          const { data: { publicUrl: tUrl } } = supabase.storage
            .from('scheduled_posts')
            .getPublicUrl(thumbName);
          thumbnailUrl = tUrl;
        }
      } catch (err) {
        console.warn("Could not generate thumbnail:", err);
      }

      const res = await fetch(`${API_URL}/api/calendar/posts?user_id=${sessionUser.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_platforms: platforms,
          caption,
          media_url: mediaUrl,
          thumbnail_url: thumbnailUrl,
          platform_metadata: {
            youtube: youtubeMeta,
            instagram: {
              ...instagramMeta,
              collaborators: (instagramMeta.collaborators || "").split(",").map(s => s.trim()).filter(Boolean),
              mentions: (instagramMeta.mentions || "").split(",").map(s => s.trim()).filter(Boolean),
              customAudioUrl: uploadedAudioUrl || undefined
            }
          },
          scheduled_time: scheduledTime.toISOString()
        })
      });

      if (!res.ok) throw new Error(await res.text());
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to schedule post");
      setIsSubmitting(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(4px)",
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      animation: "fade-in 0.2s ease"
    }}>
      <div className="glass-bright" style={{
        width: "100%",
        maxWidth: 500,
        borderRadius: 20,
        padding: "32px",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        maxHeight: "90vh",
        overflowY: "auto"
      }}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: "absolute",
            top: 24, right: 24,
            background: "rgba(255,255,255,0.05)",
            border: "none",
            borderRadius: "50%",
            width: 32, height: 32,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-muted)",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "var(--text-muted)"; }}
        >
          <X size={18} />
        </button>

        <div>
          <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
            Schedule a Post
          </h3>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            For {initialDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", padding: 12, borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Target Platforms
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <PlatformToggle id="youtube" icon={<Tv size={18} />} label="YouTube" active={platforms.includes("youtube")} onClick={() => togglePlatform("youtube")} />
            <PlatformToggle id="instagram" icon={<Camera size={18} />} label="Instagram" active={platforms.includes("instagram")} onClick={() => togglePlatform("instagram")} />
            <PlatformToggle id="tiktok" icon={<span style={{ fontWeight: 'bold' }}>tik</span>} label="TikTok" active={platforms.includes("tiktok")} onClick={() => togglePlatform("tiktok")} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Time
            </label>
            <div style={{ position: "relative" }}>
              <Clock size={16} style={{ position: "absolute", left: 12, top: 14, color: "var(--text-muted)" }} />
              <input 
                type="time" 
                className="input-field" 
                value={time}
                onChange={e => setTime(e.target.value)}
                style={{ paddingLeft: 38, width: "100%" }}
              />
            </div>
            {bestTimeSlots.length > 0 && platforms.includes("instagram") && (
              <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center", display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={10} className="text-yellow-400"/> Best Times (IST):</span>
                {bestTimeSlots.map(slot => {
                  const hr = slot.hour_ist.toString().padStart(2, '0');
                  const t = `${hr}:00`;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTime(t)}
                      style={{
                        background: "rgba(168, 85, 247, 0.1)",
                        border: "1px solid rgba(168, 85, 247, 0.3)",
                        color: "#a855f7",
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 12,
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(168, 85, 247, 0.2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(168, 85, 247, 0.1)"}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Media Files (Images or Video)
          </label>
          <input 
            type="file" 
            accept="image/*,video/*"
            multiple
            className="input-field" 
            onChange={e => {
              if (e.target.files) {
                const selected = Array.from(e.target.files);
                if (selected.length > 10) {
                  setError("Instagram allows a maximum of 10 items in a carousel. Only the first 10 files were kept.");
                  setFiles(selected.slice(0, 10));
                } else {
                  setFiles(selected);
                }
              }
            }}
            style={{ padding: "8px" }}
          />
          {files.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginTop: 12 }}>
              {files.map((file, index) => {
                const isImage = file.type.startsWith('image/');
                const url = URL.createObjectURL(file);
                return (
                  <div key={index} className="relative group rounded-lg overflow-hidden border border-white/10 bg-black aspect-video flex items-center justify-center">
                    {isImage ? (
                      <>
                        <img src={url} alt="upload" className="w-full h-full object-cover" />
                        
                        {platforms.includes("instagram") && instagramMeta.postType === "story" && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingStoryFileIndex(index); }}
                            className="absolute top-2 left-2 p-1.5 bg-purple-600/90 hover:bg-purple-500 rounded-lg opacity-100 transition-all text-white border border-white/20 shadow-lg text-xs font-bold flex items-center gap-1"
                            title="Edit Story Visually"
                          >
                            <span>🎨 Edit</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setCroppingFileIndex(index)}
                          className="absolute bottom-2 right-2 p-1.5 bg-black/70 hover:bg-blue-600 rounded-lg opacity-100 transition-all text-white border border-white/20 shadow-lg"
                          title="Crop Image"
                        >
                          <Scissors className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <video src={url} className="w-full h-full object-cover" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {files.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
              {files.length} file(s) selected
            </div>
          )}
        </div>

        {/* YouTube Settings */}
        {platforms.includes("youtube") && (
          <div style={{ padding: "12px", background: "rgba(255, 0, 0, 0.05)", border: "1px solid rgba(255,0,0,0.2)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 12 }}>
            <h4 style={{ margin: 0, fontSize: 14, color: "#ff0000", display: "flex", alignItems: "center", gap: 6 }}>
              <Tv size={16} /> YouTube Settings
            </h4>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Title</label>
              <input 
                type="text" 
                className="input-field" 
                value={youtubeMeta.title}
                onChange={e => setYoutubeMeta({...youtubeMeta, title: e.target.value})}
                placeholder="Video Title"
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Privacy Status</label>
              <select 
                className="input-field"
                value={youtubeMeta.privacyStatus}
                onChange={e => setYoutubeMeta({...youtubeMeta, privacyStatus: e.target.value})}
              >
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Tags (comma-separated)</label>
              <input 
                type="text" 
                className="input-field" 
                value={youtubeMeta.tags}
                onChange={e => setYoutubeMeta({...youtubeMeta, tags: e.target.value})}
                placeholder="vlog, coding, tutorial"
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input 
                type="checkbox" 
                checked={youtubeMeta.madeForKids}
                onChange={e => setYoutubeMeta({...youtubeMeta, madeForKids: e.target.checked})}
              />
              Made for Kids (COPPA)
            </label>
          </div>
        )}

        {/* Instagram Settings */}
        {platforms.includes("instagram") && (
          <div style={{ padding: "12px", background: "rgba(225, 48, 108, 0.05)", border: "1px solid rgba(225, 48, 108, 0.2)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 12 }}>
            <h4 style={{ margin: 0, fontSize: 14, color: "#e1306c", display: "flex", alignItems: "center", gap: 6 }}>
              <Camera size={16} /> Instagram Settings
            </h4>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Post Type</label>
              <select 
                className="input-field"
                value={instagramMeta.postType}
                onChange={e => setInstagramMeta({...instagramMeta, postType: e.target.value})}
              >
                <option value="reel">Reel (Video)</option>
                <option value="story">Story</option>
                <option value="image">Image Post</option>
                <option value="carousel">Carousel (Multiple)</option>
              </select>
            </div>

            {instagramMeta.postType === "reel" && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input 
                  type="checkbox" 
                  checked={instagramMeta.shareToFeed}
                  onChange={e => setInstagramMeta({...instagramMeta, shareToFeed: e.target.checked})}
                />
                Share to Feed
              </label>
            )}

            {(instagramMeta.postType === "reel" || instagramMeta.postType === "story") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Custom Audio (MP3/WAV)</label>
                <input 
                  type="file" 
                  accept="audio/*"
                  className="input-field" 
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setAudioFile(e.target.files[0]);
                    } else {
                      setAudioFile(null);
                    }
                  }}
                  style={{ padding: "8px" }}
                />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>We will automatically merge this audio with your video.</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Mentions (comma-separated @usernames)</label>
              <input 
                type="text" 
                className="input-field" 
                value={instagramMeta.mentions}
                onChange={e => setInstagramMeta({...instagramMeta, mentions: e.target.value})}
                placeholder="@username1, @username2"
              />
              {instagramMeta.postType === "story" && (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>For Stories, mentions will be visually stamped onto the media.</span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Collaborators (comma-separated, max 3)</label>
              <input 
                type="text" 
                className="input-field" 
                value={instagramMeta.collaborators}
                onChange={e => {
                  const val = e.target.value;
                  const parts = val.split(',').map(s => s.trim()).filter(Boolean);
                  if (parts.length > 3) {
                    setError("Instagram allows a maximum of 3 collaborators.");
                  } else if (error.includes("collaborator")) {
                    setError("");
                  }
                  setInstagramMeta({...instagramMeta, collaborators: val});
                }}
                placeholder="username1, username2"
              />
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Caption
            </label>
          </div>
          
          <div style={{ background: "rgba(168, 85, 247, 0.05)", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input 
                type="text" 
                placeholder="What is this post about? (e.g., new vlog)" 
                className="input-field" 
                style={{ flex: 1, padding: "6px 10px", fontSize: 12, minHeight: 32 }}
                value={captionTopic}
                onChange={e => setCaptionTopic(e.target.value)}
              />
              <select 
                className="input-field" 
                style={{ padding: "6px 10px", fontSize: 12, width: 100, minHeight: 32 }}
                value={captionLanguage}
                onChange={e => setCaptionLanguage(e.target.value)}
              >
                <option value="english">English</option>
                <option value="hindi">Hindi</option>
                <option value="hinglish">Hinglish</option>
              </select>
              <button 
                type="button"
                onClick={async () => {
                  if (!captionTopic) return setError("Please enter a topic to generate a caption.");
                  setIsGeneratingCaption(true);
                  try {
                    const res = await fetch(`${API_URL}/api/ai/caption`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ topic: captionTopic, language: captionLanguage })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setCaption(data.caption);
                    }
                  } catch (err) {}
                  setIsGeneratingCaption(false);
                }}
                disabled={isGeneratingCaption}
                className="bg-purple-600 hover:bg-purple-500 text-white rounded flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                style={{ height: 32, padding: "0 12px", fontSize: 12, fontWeight: 700 }}
              >
                {isGeneratingCaption ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />} Generate
              </button>
            </div>
          </div>

          <textarea 
            className="input-field" 
            placeholder="Write your engaging caption here..."
            value={caption}
            onChange={e => setCaption(e.target.value)}
            style={{ minHeight: 100, resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        <button 
          className="btn-primary" 
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{ marginTop: 8, height: 48, justifyContent: "center" }}
        >
          {isSubmitting ? "Scheduling..." : "Schedule Post"}
        </button>
      </div>

      {croppingFileIndex !== null && (
        <ImageCropperModal
          file={files[croppingFileIndex]}
          onClose={() => setCroppingFileIndex(null)}
          onCropApply={(croppedFile) => {
            const newFiles = [...files];
            newFiles[croppingFileIndex] = croppedFile;
            setFiles(newFiles);
            setCroppingFileIndex(null);
          }}
        />
      )}

      {editingStoryFileIndex !== null && (
        <StoryEditorModal
          file={files[editingStoryFileIndex]}
          onClose={() => setEditingStoryFileIndex(null)}
          onSave={(newFile) => {
            const newFiles = [...files];
            newFiles[editingStoryFileIndex] = newFile;
            setFiles(newFiles);
            setEditingStoryFileIndex(null);
          }}
        />
      )}
    </div>
  );
}

function PlatformToggle({ id, icon, label, active, onClick }: { id: string, icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      style={{
        flex: 1,
        padding: "12px",
        borderRadius: 12,
        background: active ? "rgba(124, 58, 237, 0.15)" : "rgba(255,255,255,0.02)",
        border: active ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        transition: "all 0.2s ease",
        position: "relative",
      }}
    >
      <div style={{ color: active ? "var(--accent-primary)" : "var(--text-secondary)" }}>
        {icon}
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: active ? "#fff" : "var(--text-secondary)" }}>{label}</span>
      
      {active && (
        <div style={{ position: "absolute", top: -6, right: -6, background: "var(--accent-primary)", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Check size={10} color="#fff" strokeWidth={4} />
        </div>
      )}
    </div>
  )
}
