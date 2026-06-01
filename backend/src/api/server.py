from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import auth_routes, user_routes, light_routes, calendar_routes
from src.api.routes import outlook_routes
from src.core.settings.database import engine, Base
from src.services.scheduler_service import get_scheduler
from src.core.config import settings

# Nota: Tabelas são criadas via Alembic migrations, não aqui
# Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description=settings.API_DESCRIPTION,
    debug=settings.DEBUG,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api/auth", tags=["Auth"])
app.include_router(user_routes.router, prefix="/api/users", tags=["Users"])
app.include_router(light_routes.router, prefix="/api/light", tags=["Light"])
app.include_router(calendar_routes.router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(outlook_routes.router, prefix="/api/auth/outlook", tags=["Outlook OAuth"])


@app.on_event("startup")
async def startup_event():
    """Inicia o scheduler de iluminação automática."""
    scheduler = get_scheduler()
    scheduler.start()


@app.on_event("shutdown")
async def shutdown_event():
    """Para o scheduler quando a aplicação encerra."""
    scheduler = get_scheduler()
    scheduler.stop()


@app.get("/")
def root():
    return {"message": "AuraLUX API v1.0", "status": "online"}
