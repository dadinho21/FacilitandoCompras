from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Controle de Orçamentos API", version="1.0.0")

# Servir arquivos estáticos (frontend) a partir da raiz do projeto
app.mount("/", StaticFiles(directory=".", html=True), name="static") 