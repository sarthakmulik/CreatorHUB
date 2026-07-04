"use client";

import { useState, useEffect } from "react";
import { X, Tv, Camera, Trash2, Clock, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ScheduledPost {
  id: string;
  target_platforms: string[];
  caption: string;
  media_url: string | null;
  scheduled_time: string;
  status: string;
}

interface EditPostModalProps {
  post: ScheduledPost;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPostModal({ post, onClose, onSuccess }: EditPostModalProps) {
  const supabase = createClient();
  const [sessionUser, setSessionUser] = useState<any>(null);
  
  const [platforms, setPlatforms] = useState<string[]>(post.target_platforms);
  const [caption, setCaption] = useState(post.caption || "");
  const [file, setFile] = useState<File | null>(null);

  const initialYoutubeMeta = (post as any).platform_metadata?.youtube || {
    title: "",
    description: "",
    privacyStatus: "private",
    madeForKids: false,
    tags: ""
  };
  const [youtubeMeta, setYoutubeMeta] = useState(initialYoutubeMeta);

  const initialInstagramMeta = (post as any).platform_metadata?.instagram || {
    postType: "reel",
    shareToFeed: true
  };
  const [instagramMeta, setInstagramMeta] = useState(initialInstagramMeta);
  
  // Convert UTC string to local Date object for the time picker
  const postDate = new Date(post.scheduled_time.endsWith('Z') ? post.scheduled_time : post.scheduled_time + 'Z');
  
  const [time, setTime] = useState(
    postDate.getHours().toString().padStart(2, '0') + ':' + 
    postDate.getMinutes().toString().padStart(2, '0')
  );
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSessionUser(user);
    });
  }, []);

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

  const handleUpdate = async () => {
    if (platforms.length === 0) { setError("Please select at least one platform."); return; }
    if (!caption) { setError("Please enter a caption."); return; }
    
    setIsSubmitting(true);
    setError("");

    try {
      const [hours, minutes] = time.split(":").map(Number);
      const scheduledTime = new Date(postDate);
      scheduledTime.setHours(hours, minutes, 0, 0);

      if (scheduledTime < new Date()) {
        setError("You cannot reschedule a post to the past. Please choose a future time.");
        setIsSubmitting(false);
        return;
      }

      let mediaUrl = post.media_url;
      let thumbnailUrl = (post as any).thumbnail_url;

      if (file) {
        // Upload new file
        const fileExt = file.name.split('.').pop();
        const fileName = `${sessionUser.id}/${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('scheduled_posts')
          .upload(fileName, file);

        if (uploadError) throw new Error("File upload failed: " + uploadError.message);

        const { data: { publicUrl: mUrl } } = supabase.storage
          .from('scheduled_posts')
          .getPublicUrl(fileName);
        mediaUrl = mUrl;

        // Generate new thumbnail
        try {
          const thumbBlob = await generateThumbnail(file);
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
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
      const res = await fetch(`${API_URL}/api/calendar/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_platforms: platforms,
          caption,
          media_url: mediaUrl,
          thumbnail_url: thumbnailUrl,
          platform_metadata: {
            youtube: youtubeMeta,
            instagram: instagramMeta
          },
          scheduled_time: scheduledTime.toISOString()
        })
      });

      if (!res.ok) throw new Error(await res.text());
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to update post");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this scheduled post?")) return;
    
    setIsDeleting(true);
    setError("");
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
      const res = await fetch(`${API_URL}/api/calendar/posts/${post.id}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error(await res.text());
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to delete post");
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, animation: "fade-in 0.2s ease"
    }}>
      <div className="glass-bright" style={{
        width: "100%", maxWidth: 500, borderRadius: 20, padding: "32px",
        position: "relative", display: "flex", flexDirection: "column", gap: 24,
        maxHeight: "90vh", overflowY: "auto"
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 24, right: 24, background: "rgba(255,255,255,0.05)",
          border: "none", borderRadius: "50%", width: 32, height: 32,
          display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer",
        }}>
          <X size={18} />
        </button>

        <div>
          <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
            Edit Scheduled Post
          </h3>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            {postDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", padding: 12, borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Target Platforms</label>
          <div style={{ display: "flex", gap: 12 }}>
            <PlatformToggle icon={<Tv size={18} />} label="YouTube" active={platforms.includes("youtube")} onClick={() => togglePlatform("youtube")} />
            <PlatformToggle icon={<Camera size={18} />} label="Instagram" active={platforms.includes("instagram")} onClick={() => togglePlatform("instagram")} />
            <PlatformToggle icon={<span style={{ fontWeight: 'bold' }}>tik</span>} label="TikTok" active={platforms.includes("tiktok")} onClick={() => togglePlatform("tiktok")} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Time</label>
            <div style={{ position: "relative" }}>
              <Clock size={16} style={{ position: "absolute", left: 12, top: 14, color: "var(--text-muted)" }} />
              <input type="time" className="input-field" value={time} onChange={e => setTime(e.target.value)} style={{ paddingLeft: 38, width: "100%" }} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Media File (Image or Video)
          </label>
          <input 
            type="file" 
            accept="image/*,video/*"
            className="input-field" 
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                setFile(e.target.files[0]);
              }
            }}
            style={{ padding: "8px" }}
          />
          {post.media_url && !file && (
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Current media will be kept if no new file is uploaded.</p>
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
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Caption</label>
          <textarea className="input-field" value={caption} onChange={e => setCaption(e.target.value)} style={{ minHeight: 100, resize: "vertical", lineHeight: 1.5 }} />
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button className="btn-secondary" onClick={handleDelete} disabled={isDeleting} style={{ flex: 1, height: 48, justifyContent: "center", color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }}>
            {isDeleting ? "Deleting..." : <><Trash2 size={16} /> Delete</>}
          </button>
          <button className="btn-primary" onClick={handleUpdate} disabled={isSubmitting} style={{ flex: 2, height: 48, justifyContent: "center" }}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlatformToggle({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ flex: 1, padding: "12px", borderRadius: 12, background: active ? "rgba(124, 58, 237, 0.15)" : "rgba(255,255,255,0.02)", border: active ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", position: "relative" }}>
      <div style={{ color: active ? "var(--accent-primary)" : "var(--text-secondary)" }}>{icon}</div>
      <span style={{ fontSize: 12, fontWeight: 600, color: active ? "#fff" : "var(--text-secondary)" }}>{label}</span>
      {active && <div style={{ position: "absolute", top: -6, right: -6, background: "var(--accent-primary)", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={10} color="#fff" strokeWidth={4} /></div>}
    </div>
  )
}
