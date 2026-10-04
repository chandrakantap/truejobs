# truejobs.tech

## Project Overview

**truejobs.tech** is a high-signal **job intelligence platform for software engineers**.

It discovers technology jobs directly from company career sites and public ATS platforms such as **Greenhouse, Lever, Ashby, Workday, and SmartRecruiters** — avoiding third-party recruitment agencies, consultancy spam, duplicated listings, and stale job-board data.

**truejobs.tech helps engineers discover fresh opportunities and understand the history and reliability of each job before applying.**

### Core Product Promise

> **Know where a job came from, how fresh it is, and what happened to it before you apply.**

Every job will provide transparent signals such as:

- Direct company career-site source
- Direct ATS application URL
- First-seen timestamp
- Last-verified timestamp
- Job age
- Active/closed status
- Repost history
- Job-description changes
- Duplicate detection
- Salary/location history where available

We do **not** claim that every company-sourced job is automatically legitimate or free of ghost hiring. Instead, truejobs.tech provides **evidence and hiring signals** so users can make better decisions.

---

## Target Market

### Primary Users

Software engineers actively looking for jobs, initially focusing on:

- Backend Engineers
- Full Stack Engineers
- Frontend Engineers
- Java Engineers
- Node.js Engineers
- AI/ML Engineers
- DevOps / Platform Engineers
- SRE Engineers
- Staff / Principal Engineers
- Engineering Managers

### Initial Geography

- Global Remote
- United States
- Europe
- India

---

## Product Differentiation

The market already has many job aggregators.

truejobs.tech differentiates through **job intelligence rather than job volume**.

### Traditional Job Board

```text
Company → Job Board → Job Seeker
```

The user sees a job listing.

### truejobs.tech

```text
Company Career Site / ATS
          ↓
      Discovery
          ↓
     Normalization
          ↓
    Deduplication
          ↓
   Job History Engine
          ↓
 Freshness & Hiring Signals
          ↓
      truejobs.tech
          ↓
 Direct Application
```

The platform maintains the lifecycle of a job rather than storing only its current state.

---

## Job Intelligence

Each job maintains historical information.

Example:

```text
Senior Backend Engineer
Company: Example Inc.
Location: Remote
Salary: $150K–$190K

Source:
  Example Careers
  Greenhouse

First detected:
  Oct 2, 2026

Last verified:
  14 minutes ago

Current status:
  Active

Job age:
  2 days

Reposts:
  0

Description changes:
  0
```

Over time:

```text
Oct 02
🟢 First detected

Oct 03
🟢 Still active

Oct 08
🟡 Job description changed

Oct 21
🟡 Position reposted

Nov 04
🔴 Position closed
```

This historical dataset becomes a core product asset.

---

## Job Signals

truejobs.tech should eventually expose transparent signals including:

### Source Verification

- Official company domain
- Recognized ATS
- Direct application URL
- No third-party application redirect

### Freshness

- First seen
- Last seen
- Last verified
- Current job age

### Reposting

- Previous versions
- Repost count
- Time between postings

### Content Changes

- Job description changes
- Salary changes
- Location changes
- Requirement changes

### Status

- Active
- Recently closed
- Stale
- Potentially reposted

These signals should be based on observable data rather than an opaque "real/fake" AI score.

---

## Initial Product Experience

### Job Discovery

Users can discover:

- Jobs posted in the last 24 hours
- Jobs posted in the last 7 days
- Remote jobs
- Jobs by technology
- Jobs by company
- Jobs by location
- Jobs by seniority
- Jobs by salary

Example:

> **127 new Java engineering jobs detected in the last 24 hours**

The user should always be able to apply through the company's original ATS/application URL.
