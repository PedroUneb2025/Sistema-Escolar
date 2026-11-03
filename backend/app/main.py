from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.academico import router as academico_router
from app.api.routes.auth import router as auth_router
from app.api.routes.curriculo import router as curriculo_router
from app.api.routes.matriculas import router as matriculas_router
from app.api.routes.prerequisitos import router as prerequisitos_router
from app.api.routes.relatorios import router as relatorios_router
from app.api.routes.usuarios import router as usuarios_router
from app.core.config import settings

app = FastAPI(title="SGA-Edu API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(curriculo_router)
app.include_router(prerequisitos_router)
app.include_router(matriculas_router)
app.include_router(academico_router)
app.include_router(relatorios_router)
app.include_router(usuarios_router)


@app.get("/health")
def health():
    return {"status": "ok"}