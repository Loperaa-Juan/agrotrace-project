from fastapi import FastAPI
from fastapi.responses import RedirectResponse

app = FastAPI(
    title="AI Service",
    description="Microservicio de clasificación de imágenes",
    version="1.0",
)


@app.get("/", include_in_schema=False)
async def root():
    """Redirect to the automatic documentation."""
    return RedirectResponse(url="/docs")
