# REQUIREMENTS.md — CreatorHub

## 1. Product Overview
CreatorHub is a web platform for content creators to connect all their social media accounts (YouTube, Instagram, TikTok, Twitter/X, Facebook, LinkedIn, Snapchat) in one place, view unified analytics, schedule/manage content uploads, and get AI-generated insights on their reach, growth, and audience behavior.

## 2. Target Users
- Individual content creators managing 2+ social platforms
- Small creator teams (creator + editor/manager)
- Agencies managing multiple creators under one login

## 3. Problem Statement
Creators currently check YouTube Studio, Instagram Insights, TikTok Analytics, etc. separately — no single place to see combined growth, compare platform performance, or get a recommendation on what to post next and when. CreatorHub solves this by centralizing data and adding an AI insight layer on top.

## 4. Functional Requirements

### 4.1 Authentication & Accounts
- Users can sign up/log in via email+password or Google OAuth
- Each user has one workspace (agencies can have multiple sub-accounts later — not MVP)
- Users can connect/disconnect social accounts via OAuth per platform

### 4.2 Platform Integrations (MVP scope: YouTube first, then Instagram, then TikTok)
- Connect via each platform's official API (YouTube Data API v3, Instagram Graph API, TikTok for Developers API)
- Pull: follower/subscriber count, views, likes, comments, shares, post list with per-post stats
- Store historical snapshots daily so growth-over-time charts are possible

### 4.3 Dashboard
- Combined view: total followers, total views, engagement rate across all connected platforms
- Per-platform breakdown view
- Growth charts (line graphs) — followers/views over time, selectable date range
- Post performance table — sortable by views, likes, comments, date, platform

### 4.4 Content Scheduling
- Create a draft post (caption/title, media placeholder, target platform(s), scheduled date/time)
- Calendar view (month/week) showing scheduled and published posts
- Queue system that respects each platform's publishing API limitations (read-only fallback where publishing isn't API-approved yet)

### 4.5 AI Insights
- Natural-language summary generated from the user's own historical data, e.g. best time to post, best-performing content type/length
- Refreshed periodically (e.g., weekly) as more data accumulates

### 4.6 Non-goals for MVP (explicitly out of scope)
- Revenue/monetization tracking
- Comment sentiment analysis
- Competitor benchmarking
- Team roles/permissions
- Mobile app

## 5. Non-Functional Requirements
- OAuth tokens encrypted at rest
- Data sync jobs run on a schedule (not real-time) to respect API rate limits
- Dashboard must load in under 2 seconds for a workspace with 3 connected platforms
- Must comply with each platform's developer policy (no scraping, no unauthorized data storage beyond API terms)

## 6. Success Criteria for MVP
- A creator can connect their YouTube account and see accurate, up-to-date subscriber/view stats within 5 minutes of signup
- A creator can view a 30-day growth chart for a connected platform
- A creator can draft and see a scheduled post appear on the content calendar
