from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth_router, rag_router, team_router, admin_router, operations_router

app = FastAPI(
    title="Campus Copilot - Smart Hackathon AI Operations & Matchmaking Platform API",
    description="Full-stack RESTful API for Hackathon Operations, Enterprise Auth, RAG Knowledge Base, and Team Matchmaking.",
    version="1.0.0"
)

# Enable CORS for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router.router)
app.include_router(rag_router.router)
app.include_router(team_router.router)
app.include_router(admin_router.router)
app.include_router(operations_router.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Campus Copilot Platform API",
        "docs": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
