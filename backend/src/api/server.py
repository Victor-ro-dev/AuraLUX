from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import auth_routes, user_routes, light_routes, calendar_routes
from src.api.routes import outlook_routes
from src.core.settings.database import engine, Base
from src.services.mqtt_publisher import mqtt_publisher_service

# Cria as tabelas no banco ao iniciar
Base.metadata.create_all(bind=engine)

# Conecta ao broker MQTT ao iniciar
mqtt_publisher_service.connect()

app = FastAPI(
    title="AuraLUX API",
    version="1.0.0",
    description="Smart Luminary — Ciclo Circadiano & Produtividade",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api/auth", tags=["Auth"])
app.include_router(user_routes.router, prefix="/api/users", tags=["Users"])
app.include_router(light_routes.router, prefix="/api/light", tags=["Light"])
app.include_router(calendar_routes.router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(outlook_routes.router, prefix="/api/auth/outlook", tags=["Outlook OAuth"])


@app.get("/")
def root():
    return {"message": "AuraLUX API v1.0", "status": "online"}
