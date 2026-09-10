# Civic Watch

i want to make a website according to my prompt    # MASTER SYSTEM PROMPT: Complete Production Build of "Sanket" - Intelligent Civic Grievance & Resolution Platform

## 1. System Role & Architecture Overview

You are a Principal Full-Stack Engineer, AI Vision Architect, and UI/UX Designer. Build **"Sanket"**, an enterprise-grade, crowdsourced civic issue reporting and resolution platform. The system enforces an auditable, closed-loop lifecycle: **Citizen Ingestion → AI Evidence Integrity & Deduplication → Priority Queueing → Worker Execution → AI Before/After Validation → Citizen Community Audit.**

### Core Tech Stack

- **Frontend:** Next.js (App Router), React 19, TypeScript, Tailwind CSS, Shadcn/UI, Lucide Icons, Framer Motion.

- **GIS & Mapping:** Mapbox GL JS / React-Leaflet with custom vector pins and dynamic cluster layers.

- **Backend & Database:** Next.js Server Actions / API Routes, PostgreSQL with PostGIS extension (`ST_DWithin`), Prisma ORM, Redis (rate limiting & clustering cache).

- **AI & Vision Pipeline:** Multimodal Vision Engine (GPT-4o Vision / Gemini Vision API), Perceptual Hashing (`pHash`), EXIF metadata parser, Structural Similarity / Visual Difference heuristics.

---

## 2. Role-Based Access Control (RBAC) & Security Gateways

Build an isolated authentication and onboarding flow (`/auth/login`, `/auth/register`) supporting three distinct access tiers with hardcoded security passkey validation:### 1. Citizen Portal (`/dashboard/citizen`)
- **Access:** Public registration and login.
- **Capabilities:**
  - Submit complaints with auto-GPS capture, category selector, and photo upload.
  - Track complaint status across a multi-stage timeline.
  - Explore interactive municipal GIS heatmaps showing active vs. resolved issues.
  - Inspect the transparent priority score breakdown for every ticket.
  - Participate in the community verification loop (voting on resolved tasks).

### 2. Field Worker Portal (`/worker/dashboard`)
- **Access Gate:** Requires role elevation passkey: `India123`.
- **Dedicated Minimalist UI:**
  - Completely stripped of administrative clutter, citizen personal data, and public comment feeds.
  - Displays a high-contrast, mobile-first task list sorted strictly by priority.
  - Each task card shows: Damaged area photo, category badge, exact location/address, and a one-tap navigation button (`Google Maps / Mapbox Intent`).
  - **Resolution Submission:** Camera-only upload for "After Work" proof, requiring live GPS match and mandatory completion notes.

### 3. Department Official & Admin Portal (`/admin/dashboard`)
- **Access Gate:** Requires master administrative passkey: `INDIA123`.
- **Command Center Capabilities:**
  - Live ward-wise GIS issue clusters and real-time status breakdowns.
  - Telemetry metrics: Work completion rates, average turnaround time (SLA tracking), worker performance, and department throughput.
  - AI Anomaly Dashboard: Flagged fraudulent/reused media, duplicate clusters, and tickets auto-escalated by citizen rejections.

---

## 3. Core Functional Modules & Technical Specifications

### Module A: AI Evidence Understanding & Integrity Guard
- **Metadata Validation:** Extract client EXIF tags on upload; flag mismatches between device GPS and EXIF coordinates.
- **Perceptual Hashing (pHash):** Compute image hash to detect recycled or reused photos across different locations and timestamps.
- **AI Categorization & Severity:** Vision API classifies the issue type (Pothole, Sewage Leak, Streetlight Outage, Garbage Dump, Water Pipeline Burst) and outputs a severity score from 1.0 to 10.0.

### Module B: Spatial Deduplication & Community Aggregation
- **Radius Search:** On report submission, run a PostGIS radial query (`ST_DWithin`, 50-meter threshold) matching category and visual/text embeddings.
- **Automatic Merging:** Link secondary reports to the parent `CivicIssue` rather than creating duplicate tickets.
- **Community Evidence Count:** Increment `evidenceCount`, append new photos to the master evidence gallery, and auto-subscribe users to notification updates.

### Module C: Transparent Dynamic Priority Engine
- Deterministic formula computed server-side and visible on public issue cards:
  $$\text{Priority Score} = (S \times 0.35) + (\min(R, 20) \times 0.25) + (T_{\text{hours}} \times 0.20) + (E_{\text{verified}} \times 0.20)$$
  - $S$: AI Base Severity Score ($1 - 10$).
  - $R$: Unique Citizen Report / Upvote Count.
  - $T_{\text{hours}}$: Pending Duration in hours (aging multiplier).
  - $E_{\text{verified}}$: Verified integrity evidence count.

### Module D: AI Before/After Comparison & Citizen Verification Loop
- **Automated AI Inspection:** When a worker uploads the "After" image:
  1. Validate worker GPS location against original issue coordinates.
  2. Multimodal Vision API compares `Before` vs `After` images and returns:
     - `isSameScene`: Boolean
     - `issueResolved`: Boolean
     - `confidenceScore`: Number ($0 - 100$)
     - `visualChangesDetected`: String
     - `potentialAnomaly`: Boolean
  3. If `confidenceScore < 70` or `potentialAnomaly == true`, tag status as `RESOLUTION_ANOMALY` and route to Admin Review.
  4. If passed, update status to `RESOLVED_PENDING_AUDIT`.
- **Interactive Citizen Audit UI:**
  - Render an interactive split-screen / swipe slider comparing "Before" and "After" images.
  - Local citizens cast one-click audit votes:
    - **Resolved** (✅)
    - **Partially Resolved** (⚠️)
    - **Still Present** (❌)
- **Repeated Failure & Escalation Engine:**
  - If $\ge 30\%$ of verifying citizens vote "Still Present", transition status to `REOPENED_FAILED_RESOLUTION`.
  - Increment `failureCount` on the issue and trigger a high-priority `ADMIN_REVIEW_FLAG` on the Official Dashboard.

---

## 4. Prisma Database Schema Blueprint

```prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

enum Role {
  CITIZEN
  WORKER
  OFFICIAL_ADMIN
}

enum IssueStatus {
  REPORTED
  CLUSTERED_DUPLICATE
  ASSIGNED_TO_WORKER
  IN_PROGRESS
  RESOLVED_PENDING_AUDIT
  CLOSED_VERIFIED
  RESOLUTION_ANOMALY
  REOPENED_FAILED_RESOLUTION
  FLAGGED_ADMIN_REVIEW
}

enum VerificationVote {
  RESOLVED
  PARTIALLY_RESOLVED
  STILL_PRESENT
}

model User {
  id            String         @id @default(uuid())
  name          String
  email         String?        @unique
  phone         String?        @unique
  passwordHash  String
  role          Role           @default(CITIZEN)
  reports       Report[]
  assignedTasks CivicIssue[]   @relation("WorkerTasks")
  verifications Verification[]
  createdAt     DateTime       @default(now())
}

model CivicIssue {
  id                   String            @id @default(uuid())
  title                String
  category             String
  description          String
  status               IssueStatus       @default(REPORTED)
  latitude             Float
  longitude            Float
  address              String?
  priorityScore        Float             @default(0.0)
  severityScore        Float             @default(1.0)
  evidenceCount        Int               @default(1)
  failureCount         Int               @default(0)
  assignedWorkerId     String?
  assignedWorker       User?             @relation("WorkerTasks", fields: [assignedWorkerId], references: [id])
  reports              Report[]
  resolutionProof      ResolutionProof?
  verifications        Verification[]
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt

  @@index([latitude, longitude])
  @@index([status, priorityScore])
}

model Report {
  id             String      @id @default(uuid())
  civicIssueId   String
  civicIssue     CivicIssue  @relation(fields: [civicIssueId], references: [id], onDelete: Cascade)
  userId         String
  user           User        @relation(fields: [userId], references: [id])
  imageUrl       String
  pHash          String?
  exifTimestamp  DateTime?
  exifLat        Float?
  exifLng        Float?
  isFlaggedFraud Boolean     @default(false)
  fraudReason    String?
  createdAt      DateTime    @default(now())
}

model ResolutionProof {
  id                String      @id @default(uuid())
  civicIssueId      String      @unique
  civicIssue        CivicIssue  @relation(fields: [civicIssueId], references: [id], onDelete: Cascade)
  beforeImageUrl    String
  afterImageUrl     String
  workerNotes       String
  aiConfidenceScore Float
  aiAnalysisSummary String
  submittedAt       DateTime    @default(now())
}

model Verification {
  id           String           @id @default(uuid())
  civicIssueId String
  civicIssue   CivicIssue       @relation(fields: [civicIssueId], references: [id], onDelete: Cascade)
  userId       String
  user         User             @relation(fields: [userId], references: [id])
  vote         VerificationVote
  feedback     String?
  createdAt    DateTime         @default(now())

  @@unique([civicIssueId, userId])
}

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://urban-aid-loop.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/05ed6fef-50fc-48a5-a959-10d1664a11b4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
