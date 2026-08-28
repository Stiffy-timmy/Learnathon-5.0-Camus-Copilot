#  Campus Copilot

### AI-Powered Hackathon Operations & Matchmaking Platform

Team - Chakravyuh · GIET University · Learnathon 5.0

Campus Copilot is a platform built to make running a hackathon easier for both participants and organizers.

During a hackathon, participants usually have a lot of questions about rules, schedules, venues, Wi-Fi, meals, judging, submissions, and team formation. Organizers, on the other hand, have to answer many of these questions repeatedly while also keeping track of teams, announcements, support requests, and event data.

Campus Copilot brings these tasks together in one place.

The main idea behind the project is simple:

> Let participants get quick answers and find teammates, while giving organizers the tools they need to manage the event efficiently.

---

## Table of Contents

- [Problem & Solution]
- [Key Features]
- [Tech Stack]
- [System Architecture]
- [Database Schema]
- [Feature Walkthrough]
- [AI Engines]
- [REST API Reference]
- [Getting Started]
- [Multi-Device / LAN Access]
- [Demo Accounts]
- [Testing]
- [Team]

---

# Problem & Solution

Managing a large hackathon manually can become difficult very quickly.

Participants need information, solo developers need teammates, organizers need to send urgent updates, and event data needs to stay consistent throughout the event.

Campus Copilot focuses on these common problems:

| Problem | Traditional Approach | Campus Copilot |
|---|---|---|
| Participant questions | Organizers repeatedly answer questions about rules, Wi-Fi, meals, venues, etc. | AI Concierge answers using the official event handbook |
| Team formation | Participants have to search manually for suitable teammates | TF-IDF and cosine similarity are used to find skill-based matches |
| Rule changes | Information may have to be manually updated in different places | Handbook changes are automatically picked up by the knowledge system |
| Emergency alerts | Important messages can get buried in group chats | Dashboard alerts and email notifications |
| Multi-device access | Demoing across devices can require additional network configuration | Vite acts as a reverse proxy so devices on the same network can access the application |
| Data cleanup | Removing users can leave related records behind | Cascading deletion keeps related data consistent |
| Reports | Organizers may have to manually prepare spreadsheets and reports | Excel and PDF reports can be generated when needed |

The platform is designed around three main types of users:

-  Participants / Developers
-  Organizers / Administrators
-  Mentors / Judges

---

#  Key Features

###  Grounded AI Concierge

Participants can ask questions about the hackathon and receive answers based on the official event handbook.

The assistant can handle questions related to:

- Rules
- Wi-Fi
- Meals
- Venue
- Tracks
- Judging
- Schedule
- Submission information

If the system is not confident about an answer, the question can be escalated to an organizer instead of giving an unreliable response.

---

### AI-Based Skill & Track Matchmaking

Participants who are looking for teammates can use the matchmaking system to find people with relevant skills.

The system represents participant skills using TF-IDF vectors and compares them using cosine similarity.

This produces a compatibility score that helps participants discover potential teammates.

---

### Team Formation

Participants can create or join teams.

Team creation includes:

- Team name
- Track
- Required skills
- Invite code
- Team leader

Teams are limited to 2–4 members.

A six-character invite code makes it easy for participants to join a team.

---

### GitHub Submission Portal

Team leaders can submit their GitHub repository through the platform.

The repository URL is validated before the submission is recorded.

Once submitted, the team is marked as **submitted** with a verified submission status.

---

### Live Hackathon Countdown

Participants can see the remaining hackathon time directly from the dashboard.

The timer is displayed in the format:

```text
Xd : XXh : XXm : XXs

Organizers can control the timer from the admin dashboard.

Available controls include:

- Start
- Pause
- Resume
- Stop
- Reset

~ Quick Reference

Participants can quickly access important event information without having to search through the complete handbook.

The reference section includes information such as:

- Wi-Fi access
- Meal timings
- Venue
- Tracks
- Judging criteria
- Rules

The information is pulled from the event handbook.

# Notifications & Announcements

Participants receive notifications about important event activity.

Organizers can also send announcements with different severity levels:

- INFO
- WARNING
- CRITICAL

Critical announcements can be displayed as modal alerts on participant dashboards.

# Authentication

The platform includes authentication using:

- JWT
- Bcrypt password hashing
- Email verification
- Six-digit OTP
- Password recovery
- Account deletion verification

This allows the system to separate participant and administrator access.

# Organizer Command Center

The admin dashboard gives organizers a central place to manage the hackathon.

Organizers can:

- View event metrics
- Manage support tickets
- Send announcements
- Manage teams
- Edit the handbook
- Control the event timer
- Manage participants
- Export event reports

# Live Handbook Synchronization

The handbook is treated as the main source of event information.

When an organizer edits the handbook, the system detects the change and updates the knowledge base.

This means organizers do not have to restart the application every time event information changes.

# Cascading Database Deletion

Deleting a participant should not leave unrelated records behind.

Campus Copilot handles related records when a user is deleted, including:

- Team membership
- Teams
- Support tickets
- Notifications
- Announcement references

The operation is handled as a database transaction to maintain consistency.

# Excel & PDF Reports

Organizers can generate event reports directly from the platform.

Supported formats include:

- Excel (.xlsx)
- PDF

The Excel export contains multiple sheets, while the PDF provides an executive-style summary.

# Tech Stack

Area	                           Technologies	                                        Purpose
Backend	                      Python, FastAPI, Uvicorn	                       REST API and backend services
Database	                       SQLite	                               Persistent event data
ORM	                            SQLAlchemy 2.0	                       Database interaction
Frontend	                   React 19, Vite	                       User interface
Styling	                            Vanilla CSS	                               UI styling and design
Icons	                            Lucide React	                       Interface icons
AI / NLP	                 Scikit-learn TF-IDF	                       Retrieval and matchmaking
Similarity	                   Cosine Similarity	                       Skill and question matching
LLM Fallback	            Groq Llama 3.3, GPT-4o-mini, Gemini	               Generative fallback responses
Authentication	                JWT, Bcrypt, Pydantic	                       Authentication and validation
Email	                              Python SMTP	                       OTPs and announcements
Excel	                               OpenPyXL	                               Report generation
PDF	                              ReportLab	                               PDF report generation


🏗️ System Architecture

The application follows a simple full-stack architecture.

                    
                           USER / ADMIN         
                    
                                │ 
                                ▼
                    
                         React 19 + Vite       
                                               
                     Participant Dashboard     
                     AI Concierge              
                     Team Matching             
                     Notifications             
                     Admin Command Center      
                    
                               │
                               ▼
                    
                           Vite Proxy          
                            /api/               
                    
                               │
                               ▼
                    
                        FastAPI Backend      
                                              
                     Authentication            
                     RAG Concierge              
                     Teams & Matchmaking       
                     Admin Operations           
                     Handbook & Timer           
                    
                                   │
             ┌                                                  ┐
             ▼                    ▼                            ▼
      ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
         JWT + Bcrypt                 RAG Engine                TF-IDF       
         Authentication                                       Matchmaking  
      └──────────────┘     └──────────────┘     └──────────────┘
                                  │
                                  ▼
                       
                          SQLite Database  
                           hackathon.db


## Database Schema

The main database entities are:

users:

teams
team_members
announcements
notifications
faq_escalations
knowledge_items
timer_state
Users

Stores participant and administrator information.

id
username
email
password_hash
role
skills
is_verified
team_id
looking_for_team
Teams

Stores team information.

id
name
track
needed_skills
invite_code
status
github_url
Team Members

Connects users with their teams.

id
team_id
user_id
is_leader
Announcements

Stores event announcements and their severity.

id
title
severity
affected_user_ids
Notifications

Stores participant notifications and AI question/answer history.

id
user_id
query
answer
is_read
FAQ Escalations

Stores questions that require organizer attention.

id
question
status
broadcasted
Knowledge Items

Stores sections extracted from the event handbook.

id
section_number
content
Timer State

Stores the current event countdown state.

id
status
remaining_seconds


## Feature Walkthrough
  
# Participant View:
AI Concierge

Participants can ask questions directly from the dashboard.

The assistant searches the event handbook and returns the most relevant information.

A confidence score is shown for retrieved answers. If confidence is too low, the participant is offered the option to escalate the question to an organizer.

Teams

Participants can:

- Create a team
- Join a team
- Generate an invite code
- View teammates
- See team skills
- Set their team-search status

Teams contain between 2 and 4 participants.

Matchmaking

Participants who are looking for teammates can browse recommended matches.

Matches are calculated using TF-IDF and cosine similarity and can be filtered by track.

Project Submission

Team leaders can submit their GitHub repository.

The system validates the repository URL before recording the submission.

Countdown

The dashboard displays the remaining hackathon time.

47h : 59m : 50s

The timer stays synchronized with the server-side timer state.

Quick Reference

Important event information is displayed in an easy-to-access format.

This includes:

- Wi-Fi
- Meals
- Venue
- Tracks
- Judging
- Rules
- Notifications

The notification bell keeps track of the five most recent participant Q&A interactions and other relevant updates.

Profile

Participants can manage information such as:

- Name
- Role
- Bio
- Skills
- Verification status   

# Admin View:

The organizer dashboard provides tools for managing the event.

Operations

Organizers can:

- Start the timer
- Pause the timer
- Resume the timer
- Reset the timer
- View participant metrics
- View team metrics
- Track submissions
- Monitor support requests
- Broadcasting

Organizers can send announcements with:

- INFO
- WARNING
- CRITICAL

Announcements can also include file attachments.

Support Tickets

Organizers can manage escalated questions.

Available actions include:

- View pending questions
- Resolve questions
- Reject questions
- Reply to participants
- Delete tickets
- Perform bulk actions
- Team Management

Organizers can monitor active teams and their submission status.

Possible statuses include:

SUBMITTED
NOT SUBMITTED
DISQUALIFIED

Organizers can also disqualify or reinstate teams.

Handbook Editing

Organizers can edit the live handbook directly.

Changes are automatically picked up by the knowledge system and reflected in relevant parts of the application.

Participant Directory

The admin dashboard includes a searchable participant directory.

Organizers can search and filter participant information and perform batch deletion when required.

Database Telemetry

Organizers can view information about the underlying database and active database connections.

Report Export

Organizers can generate:

Multi-sheet Excel reports
PDF executive summaries


## AI Engines
RAG Concierge

The AI Concierge uses the hackathon handbook as its main source of information.

The retrieval process works like this:

Hackathon Handbook
        ↓
Split into sections
        ↓
Create knowledge chunks
        ↓
TF-IDF Vectorization
        ↓
User Question
        ↓
Query Vector
        ↓
Cosine Similarity
        ↓
Find Best Matching Section
        ↓
Confidence Check
        ↓
Answer / Escalate

The confidence threshold is 0.25.

If the similarity score is above the threshold, the system returns a handbook-based answer.

If the score is below the threshold, the system treats the question as uncertain and offers escalation. 

# TF-IDF

The retrieval engine uses TF-IDF to represent text numerically.

Term Frequency
TF(t,d) = f(t,d) / Σ f(t',d)
Inverse Document Frequency
IDF(t,D) = ln((1 + |D|) / (1 + documents containing t)) + 1

The resulting vectors are compared using cosine similarity.

# Cosine Similarity

The similarity between two vectors is calculated as:

sim(q,d) = (q · d) / (||q|| ||d||)

The same idea is used in the matchmaking system to compare participant skills.

# TF-IDF Team Matchmaking

Participant skills are converted into TF-IDF vectors.

The system then compares the skill vectors using cosine similarity.

Participant A Skills
        ↓
TF-IDF Vector

Participant B Skills
        ↓
TF-IDF Vector
       ↓
Cosine Similarity
       ↓
Compatibility Score

The final value is displayed as a percentage between 0% and 100%.

# REST API Reference
Authentication API

Base path: /api/auth

Method	Endpoint	             Description
POST	/register	        Register a participant or organizer
POST	/verify-email	        Verify email using a six-digit OTP
POST	/login	                Login using username/email and password
POST	/forgot-password        Request password recovery OTP
POST	/reset-password	        Reset password using OTP
POST	/request-delete-otp	Request account deletion OTP
POST	/confirm-delete-account	Confirm account deletion
GET	/me	                Get current authenticated profile

# RAG API

Base path: /api/rag

Method	Endpoint	Description
POST	/query	        Ask the AI Concierge
POST	/escalate	Ask a question and escalate it
GET	/knowledge	Get extracted knowledge items

# Team API

Base path: /api/teams

Method	Endpoint	        Description
GET	/my-team	       Get current user's team
GET	/	               List teams
POST	/create	               Create a team
POST	/join	               Join a team using invite code
POST	/submit 	       Submit GitHub repository
PUT	/matchmaking-status    Toggle team-search status
GET	/matchmaking	       Get matchmaking results

# Handbook & Event API:

Method	Endpoint	                Description
GET	/api/handbook/quick-reference	Get quick-reference information
GET	/api/handbook/tracks	        Get available tracks
GET	/api/timer	                Get current timer state
GET	/api/notifications	        Get recent notifications
GET	/api/announcements	        Get event announcements

# Admin API

Base path: /api/admin

Admin authentication is required for these endpoints.

Method	        Endpoint	         Description
GET	       /metrics	                 Get operational metrics
GET	       /users	                 Get participant directory
DELETE	      /users/{id}	         Delete a user
POST	    /users/batch-delete	         Delete multiple users
GET/POST	/escalations	         Manage support escalations
POST	  /escalations/{id}/resolve	 Resolve an escalation
POST	  /escalations/{id}/reject	 Reject an escalation
POST	     /announcements	         Send an announcement
GET/POST	/handbook	         View or update handbook
DELETE/PATCH	/teams/{id}	         Manage teams
POST	/teams/disqualify-unsubmitted	 Disqualify teams that did not submit
POST	       /timer/start	         Start timer
POST	      /timer/pause	         Pause timer
POST	      /timer/stop	         Stop timer
POST	      /timer/reset	         Reset timer
GET	      /database/status	         Get database information
GET	      /export/excel	         Export Excel report
GET	      /export/pdf	         Export PDF report


## Getting Started
Prerequisites

Before running the project, make sure you have:

- Python 3.10+
- Node.js
- npm
A Gmail account with an App Password if email functionality is required

1. Start the Backend

Open a terminal and go to the backend folder:

cd backend

Create a virtual environment:

python -m venv .venv
Windows

Activate the environment:

.venv\Scripts\activate

Install the required Python packages:

pip install -r requirements.txt

Start the FastAPI server:

uvicorn app.main:app --host 0.0.0.0 --port 8000

The backend will be available at:

http://127.0.0.1:8000

FastAPI documentation:

http://127.0.0.1:8000/docs

 2. Start the Frontend

Open another terminal:

cd frontend

Install the frontend dependencies:

npm install

Start the Vite development server:

npm run dev

The frontend will normally be available at:

http://localhost:5173

 Multi-Device / LAN Access

Campus Copilot can also be demonstrated across devices connected to the same Wi-Fi network or hotspot.

The frontend uses Vite as a reverse proxy.

- Vite
- 0.0.0.0:5173
- FastAPI
- 0.0.0.0:8000

API requests from the frontend are forwarded through:

/api/
Configuration

In frontend/vite.config.js, configure the development server to listen on all network interfaces:

server: {
    host: "0.0.0.0",
    port: 5173,

    proxy: {
        "/api/": "http://127.0.0.1:8000"
    }
}

Start the backend with:

uvicorn app.main:app --host 0.0.0.0 --port 8000

Then other devices on the same network can open the host machine's IP address on port 5173.

Example:

http://192.168.x.x:5173

This makes it easier to demonstrate the complete application on multiple devices during a hackathon.


## Demo Accounts

The project includes demo/seed accounts for testing.

Account	Email	Access
Administrator	admin@hackathon.com	Full admin access
Participant	hacker@hackathon.com	Participant dashboard
Co-admin	OTP-verified account	Admin access

Passwords are intentionally not included in this README.

## Testing

The backend contains a system test file:

backend/test_system.py

Run it from the backend directory:

cd backend
python test_system.py

The test suite checks important database behavior, including:

- Cascading deletion
- Team membership cleanup
- Role promotion
- Related record cleanup
- Admin self-deletion protection

## Real-World Use Cases

Although Campus Copilot was designed around hackathons, the same approach can be useful for many other events.

# College & University Hackathons

Help participants get event information and find teammates while reducing repetitive work for organizers.

# Corporate Innovation Events

Employees can find collaborators based on skills and access event information from a central platform.

# Innovation Challenges

Participants can be matched with people who have complementary skills.

# Coding Competitions

Organizers can use centralized announcements, support tickets, submissions, and event information.

# Developer Events

The AI Concierge can act as an event-specific support assistant while organizers monitor the event from one dashboard.

## Why This Project Matters

The main goal of Campus Copilot is not simply to add AI to a hackathon website.

The goal is to solve the practical problems that organizers and participants actually face during an event.

Instead of:

Participant
     ↓
Find Organizer
     ↓
Ask Question
     ↓
Organizer Searches Information
     ↓
Organizer Responds

# Campus Copilot provides:

Participant
     ↓
AI Concierge
     ↓
Search Official Event Knowledge
     ↓
Quick Answer
     ↓
Human Escalation if Needed

At the same time, organizers get a single dashboard for:

- Participants
- Teams
- Support requests
- Announcements
- Handbook updates
- Timer controls
- Submissions
- Reports

This reduces repetitive work and gives organizers more time to focus on running the actual event.

## Future Scope

The current platform provides the core functionality required for hackathon operations, but it can be extended further.

Possible future improvements include:

- More advanced semantic embeddings
- Better team compatibility scoring
- Discord integration
- Slack integration
- WhatsApp integration
- Automated mentor matching
- Advanced organizer analytics
- Cloud deployment
- PostgreSQL for production environments
- More advanced event automation
- Real-time operational analytics

## Project Vision

The long-term vision of Campus Copilot is to make hackathons easier to participate in and easier to operate.

        AI Assistance
              +
      Smart Matchmaking
              +
       Live Event Data
              +
      Organizer Control
              ↓
     Smarter Hackathon
         Operations

Less repetitive work. Faster support. Better teams. Smoother hackathons.

## Team Name:

Team Chakravyuh

GIET University, Gunpur

Created for Learnathon 5.0.

The project was developed as part of the Agentic AI/ML track for the Autonomous Hackathon Concierge & Event Operations Agent challenge.

## Project Summary

Campus Copilot is an AI-powered hackathon operations and matchmaking platform that brings participant assistance, event knowledge, team formation, organizer operations, notifications, submissions, and reporting together in one system.

The platform combines traditional web application technologies with practical AI/NLP techniques such as RAG, TF-IDF, and cosine similarity to solve real problems faced during hackathons.





        
                       

