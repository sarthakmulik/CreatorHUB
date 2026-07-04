/**
 * Mock data for CreatorHub — used when NEXT_PUBLIC_MOCK_MODE=true
 * or when the backend is not reachable.
 * All numbers are realistic for a mid-tier YouTube creator.
 */

export const MOCK_USER = {
  id: "mock-user-001",
  email: "alex@techwithalex.com",
  display_name: "TechWithAlex",
  avatar_url: "https://ui-avatars.com/api/?name=Tech+Alex&background=7c3aed&color=fff&size=128",
};

export const MOCK_CHANNEL = {
  channel_id: "UCmock1234567890",
  channel_name: "TechWithAlex",
  avatar_url: "https://ui-avatars.com/api/?name=TechWithAlex&background=7c3aed&color=fff&size=128",
  subscribers: 847_300,
  total_views: 42_180_900,
  video_count: 183,
  engagement_rate: 4.2,
  connected_account_id: "mock-account-001",
};

export const MOCK_VIDEOS = [
  { id: "v001", platform_post_id: "dQw4w9WgXcQ", title: "I Tried Every AI Coding Tool for 30 Days", thumbnail_url: "https://picsum.photos/seed/yt1/320/180", published_at: "2025-06-15T14:00:00Z", views: 2_340_000, likes: 98_280, comments: 18_720, shares: 7_020, duration_seconds: 1247 },
  { id: "v002", platform_post_id: "xvFZjo5PgG0", title: "The React Pattern No One Talks About", thumbnail_url: "https://picsum.photos/seed/yt2/320/180", published_at: "2025-06-10T14:00:00Z", views: 1_820_500, likes: 76_461, comments: 14_564, shares: 5_462, duration_seconds: 892 },
  { id: "v003", platform_post_id: "abc123def456", title: "Building a SaaS in 24 Hours (Full Process)", thumbnail_url: "https://picsum.photos/seed/yt3/320/180", published_at: "2025-06-05T14:00:00Z", views: 1_650_200, likes: 69_308, comments: 13_202, shares: 4_951, duration_seconds: 3412 },
  { id: "v004", platform_post_id: "ghi789jkl012", title: "Why Most Developers Quit Python", thumbnail_url: "https://picsum.photos/seed/yt4/320/180", published_at: "2025-05-30T14:00:00Z", views: 1_430_000, likes: 60_060, comments: 11_440, shares: 4_290, duration_seconds: 743 },
  { id: "v005", platform_post_id: "mno345pqr678", title: "Next.js 14 Deep Dive — Everything Changed", thumbnail_url: "https://picsum.photos/seed/yt5/320/180", published_at: "2025-05-25T14:00:00Z", views: 1_210_000, likes: 50_820, comments: 9_680, shares: 3_630, duration_seconds: 2134 },
  { id: "v006", platform_post_id: "stu901vwx234", title: "5 APIs Every Developer Should Know", thumbnail_url: "https://picsum.photos/seed/yt6/320/180", published_at: "2025-05-20T14:00:00Z", views: 980_400, likes: 41_177, comments: 7_843, shares: 2_941, duration_seconds: 634 },
  { id: "v007", platform_post_id: "yza567bcd890", title: "FastAPI vs Django: The Honest Truth", thumbnail_url: "https://picsum.photos/seed/yt7/320/180", published_at: "2025-05-15T14:00:00Z", views: 876_300, likes: 36_804, comments: 7_010, shares: 2_629, duration_seconds: 1089 },
  { id: "v008", platform_post_id: "efa123ghb456", title: "I Built a $0 SaaS and It Made $8,000", thumbnail_url: "https://picsum.photos/seed/yt8/320/180", published_at: "2025-05-10T14:00:00Z", views: 3_100_000, likes: 130_200, comments: 24_800, shares: 9_300, duration_seconds: 2891 },
  { id: "v009", platform_post_id: "ijc789kbd012", title: "Docker for Beginners (The Right Way)", thumbnail_url: "https://picsum.photos/seed/yt9/320/180", published_at: "2025-05-05T14:00:00Z", views: 754_200, likes: 31_676, comments: 6_034, shares: 2_263, duration_seconds: 1654 },
  { id: "v010", platform_post_id: "lme345nof678", title: "OpenAI API Tutorial — Build a Chatbot", thumbnail_url: "https://picsum.photos/seed/yt10/320/180", published_at: "2025-04-30T14:00:00Z", views: 934_100, likes: 39_232, comments: 7_473, shares: 2_802, duration_seconds: 1432 },
  { id: "v011", platform_post_id: "opg901qrh234", title: "Supabase is Replacing Firebase", thumbnail_url: "https://picsum.photos/seed/yt11/320/180", published_at: "2025-04-25T14:00:00Z", views: 689_700, likes: 28_967, comments: 5_518, shares: 2_069, duration_seconds: 987 },
  { id: "v012", platform_post_id: "sti567uvj890", title: "TypeScript Generics Explained Simply", thumbnail_url: "https://picsum.photos/seed/yt12/320/180", published_at: "2025-04-20T14:00:00Z", views: 543_200, likes: 22_814, comments: 4_346, shares: 1_630, duration_seconds: 763 },
  { id: "v013", platform_post_id: "wkl123xym456", title: "The Best VS Code Extensions 2025", thumbnail_url: "https://picsum.photos/seed/yt13/320/180", published_at: "2025-04-15T14:00:00Z", views: 612_400, likes: 25_721, comments: 4_899, shares: 1_837, duration_seconds: 421 },
  { id: "v014", platform_post_id: "znb789ocp012", title: "How I Learned 3 Languages in 1 Year", thumbnail_url: "https://picsum.photos/seed/yt14/320/180", published_at: "2025-04-10T14:00:00Z", views: 2_780_000, likes: 116_760, comments: 22_240, shares: 8_340, duration_seconds: 1876 },
  { id: "v015", platform_post_id: "dqe345frg678", title: "PostgreSQL vs MongoDB: Which Is Better?", thumbnail_url: "https://picsum.photos/seed/yt15/320/180", published_at: "2025-04-05T14:00:00Z", views: 489_300, likes: 20_551, comments: 3_914, shares: 1_468, duration_seconds: 843 },
  { id: "v016", platform_post_id: "hsi901jtj234", title: "Build a Dashboard in 1 Hour", thumbnail_url: "https://picsum.photos/seed/yt16/320/180", published_at: "2025-03-30T14:00:00Z", views: 1_023_000, likes: 42_966, comments: 8_184, shares: 3_069, duration_seconds: 2341 },
  { id: "v017", platform_post_id: "kuk567lvl890", title: "Git Workflows for Solo Developers", thumbnail_url: "https://picsum.photos/seed/yt17/320/180", published_at: "2025-03-25T14:00:00Z", views: 378_900, likes: 15_914, comments: 3_031, shares: 1_137, duration_seconds: 534 },
  { id: "v018", platform_post_id: "mxm123nyn456", title: "System Design Interview Prep (2025)", thumbnail_url: "https://picsum.photos/seed/yt18/320/180", published_at: "2025-03-20T14:00:00Z", views: 834_500, likes: 35_049, comments: 6_676, shares: 2_504, duration_seconds: 1987 },
  { id: "v019", platform_post_id: "ozo789pap012", title: "How I Got My First Dev Job (No Degree)", thumbnail_url: "https://picsum.photos/seed/yt19/320/180", published_at: "2025-03-15T14:00:00Z", views: 1_940_000, likes: 81_480, comments: 15_520, shares: 5_820, duration_seconds: 2134 },
  { id: "v020", platform_post_id: "qbq345rcr678", title: "Async Python — The Complete Guide", thumbnail_url: "https://picsum.photos/seed/yt20/320/180", published_at: "2025-03-10T14:00:00Z", views: 421_300, likes: 17_695, comments: 3_370, shares: 1_264, duration_seconds: 1124 },
];

// Generate 30-day growth snapshots
const base = { followers: 820_000, views: 1_180_000 };
export const MOCK_SNAPSHOTS = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86_400_000).toISOString().split("T")[0],
  followers: base.followers + i * 950 + (i % 3) * 220,
  views: base.views + i * 44_000 + (i % 5) * 7_800,
}));

export const MOCK_DASHBOARD_STATS = {
  total_followers: MOCK_CHANNEL.subscribers,
  total_views: MOCK_CHANNEL.total_views,
  engagement_rate: MOCK_CHANNEL.engagement_rate,
  platforms: [
    {
      platform: "youtube",
      account_name: MOCK_CHANNEL.channel_name,
      account_avatar: MOCK_CHANNEL.avatar_url,
      subscribers: MOCK_CHANNEL.subscribers,
      total_views: MOCK_CHANNEL.total_views,
      engagement_rate: MOCK_CHANNEL.engagement_rate,
      connected_account_id: MOCK_CHANNEL.connected_account_id,
    },
  ],
};

export const MOCK_SCHEDULED_POSTS = [
  { id: "sp1", title: "React Server Components Deep Dive", platforms: ["youtube"], scheduled_time: new Date(Date.now() + 2 * 86400000).toISOString(), status: "queued" },
  { id: "sp2", title: "Building with Cursor AI", platforms: ["youtube"], scheduled_time: new Date(Date.now() + 5 * 86400000).toISOString(), status: "draft" },
  { id: "sp3", title: "My Dev Setup 2025", platforms: ["youtube"], scheduled_time: new Date(Date.now() + 9 * 86400000).toISOString(), status: "draft" },
];

export const MOCK_AI_INSIGHTS = [
  {
    id: "ai1",
    generated_at: new Date().toISOString(),
    title: "🚀 Best Time to Post",
    text: "Your videos published on Tuesdays and Thursdays between 2–4 PM UTC consistently get 34% more views in the first 48 hours. Consider aligning your upload schedule accordingly.",
    metric: "+34% views",
    color: "purple",
  },
  {
    id: "ai2",
    generated_at: new Date().toISOString(),
    title: "🎯 Top Content Type",
    text: "Tutorial-style videos (\"How I...\", \"Build X in Y hours\") average 2.1M views vs 680K for opinion videos. Your audience strongly prefers actionable, project-based content.",
    metric: "3.1× more views",
    color: "cyan",
  },
  {
    id: "ai3",
    generated_at: new Date().toISOString(),
    title: "⏱️ Ideal Video Length",
    text: "Videos between 15–25 minutes (900–1500 seconds) have your highest completion rate at 68%. Shorter videos under 10 minutes show only 41% completion.",
    metric: "68% completion",
    color: "green",
  },
];
