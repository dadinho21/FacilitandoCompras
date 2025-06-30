from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
from typing import List, Optional
import json
import os
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
import time

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Controle de Orçamentos API", version="1.0.0")

# Servir arquivos estáticos (frontend) a partir da raiz do projeto
app.mount("/", StaticFiles(directory=".", html=True), name="static")

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar domínios específicos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuração do banco de dados PostgreSQL
DATABASE_CONFIG = {
    "host": os.getenv("PGHOST"),
    "database": os.getenv("PGDATABASE"),
    "user": os.getenv("PGUSER"),
    "password": os.getenv("PGPASSWORD"),
    "port": os.getenv("PGPORT", "5432")
}

# Configuração para Railway
PORT = int(os.getenv("PORT", 8000))

# Log das configurações para debug
logger.info(f"Configuração do banco: {DATABASE_CONFIG}")
logger.info(f"Porta da aplicação: {PORT}")

DATABASE_URL = os.getenv("DATABASE_URL")
conn = psycopg2.connect(DATABASE_URL)

def get_db_connection():
    """Cria conexão com o banco de dados PostgreSQL"""
    max_retries = 3
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Tentativa {attempt + 1} de conexão com banco de dados...")
            conn = psycopg2.connect(**DATABASE_CONFIG)
            logger.info("Conexão com banco de dados estabelecida com sucesso!")
            return conn
        except Exception as e:
            logger.error(f"Erro na tentativa {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                logger.info(f"Aguardando {retry_delay} segundos antes da próxima tentativa...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Backoff exponencial
            else:
                logger.error("Todas as tentativas de conexão falharam")
                raise HTTPException(status_code=500, detail="Erro de conexão com banco de dados")

def init_database():
    """Inicializa as tabelas do banco de dados"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Tabela de orçamentos
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS orcamentos (
                id SERIAL PRIMARY KEY,
                numero INTEGER UNIQUE NOT NULL,
                data DATE NOT NULL,
                validade INTEGER NOT NULL,
                tags TEXT,
                forma_pagamento VARCHAR(50),
                status VARCHAR(50) DEFAULT 'Pendente',
                observacoes TEXT,
                decisao TEXT,
                total_geral DECIMAL(10,2) DEFAULT 0,
                economia_total DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Tabela de itens
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS itens (
                id SERIAL PRIMARY KEY,
                orcamento_id INTEGER REFERENCES orcamentos(id) ON DELETE CASCADE,
                descricao TEXT NOT NULL,
                categoria VARCHAR(100) NOT NULL,
                quantidade DECIMAL(10,2) NOT NULL,
                unidade VARCHAR(20) NOT NULL,
                ordem INTEGER DEFAULT 0
            )
        """)
        
        # Tabela de fornecedores
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fornecedores (
                id SERIAL PRIMARY KEY,
                item_id INTEGER REFERENCES itens(id) ON DELETE CASCADE,
                nome VARCHAR(200) NOT NULL,
                preco DECIMAL(10,2) NOT NULL,
                frete DECIMAL(10,2) DEFAULT 0,
                total DECIMAL(10,2) DEFAULT 0,
                is_melhor BOOLEAN DEFAULT FALSE,
                ordem INTEGER DEFAULT 0
            )
        """)
        
        # Tabela de anexos
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS anexos (
                id SERIAL PRIMARY KEY,
                orcamento_id INTEGER REFERENCES orcamentos(id) ON DELETE CASCADE,
                nome_arquivo VARCHAR(255) NOT NULL,
                caminho_arquivo VARCHAR(500) NOT NULL,
                tipo_arquivo VARCHAR(50),
                tamanho INTEGER,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Tabela de categorias
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS categorias (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Inserir categorias padrão
        categorias_padrao = [
            'Material de Escritório', 'Limpeza', 'Insumos', 'Outros'
        ]
        
        for categoria in categorias_padrao:
            cursor.execute("""
                INSERT INTO categorias (nome) VALUES (%s)
                ON CONFLICT (nome) DO NOTHING
            """, (categoria,))
        
        conn.commit()
        logger.info("Banco de dados inicializado com sucesso")
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Erro ao inicializar banco de dados: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

# Inicializar banco na startup
@app.on_event("startup")
async def startup_event():
    init_database()

# Endpoints para orçamentos
@app.get("/api/orcamentos")
async def listar_orcamentos():
    """Lista todos os orçamentos"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT o.*, 
                   COUNT(DISTINCT i.id) as total_itens,
                   COUNT(DISTINCT f.id) as total_fornecedores
            FROM orcamentos o
            LEFT JOIN itens i ON o.id = i.orcamento_id
            LEFT JOIN fornecedores f ON i.id = f.item_id
            GROUP BY o.id
            ORDER BY o.created_at DESC
        """)
        
        orcamentos = cursor.fetchall()
        return {"orcamentos": orcamentos}
        
    except Exception as e:
        logger.error(f"Erro ao listar orçamentos: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
    finally:
        cursor.close()
        conn.close()

@app.get("/api/orcamentos/{orcamento_id}")
async def obter_orcamento(orcamento_id: int):
    """Obtém um orçamento específico com todos os detalhes"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Buscar orçamento
        cursor.execute("SELECT * FROM orcamentos WHERE id = %s", (orcamento_id,))
        orcamento = cursor.fetchone()
        
        if not orcamento:
            raise HTTPException(status_code=404, detail="Orçamento não encontrado")
        
        # Buscar itens
        cursor.execute("""
            SELECT * FROM itens 
            WHERE orcamento_id = %s 
            ORDER BY ordem
        """, (orcamento_id,))
        itens = cursor.fetchall()
        
        # Buscar fornecedores para cada item
        for item in itens:
            cursor.execute("""
                SELECT * FROM fornecedores 
                WHERE item_id = %s 
                ORDER BY ordem
            """, (item['id'],))
            item['fornecedores'] = cursor.fetchall()
        
        # Buscar anexos
        cursor.execute("""
            SELECT * FROM anexos 
            WHERE orcamento_id = %s 
            ORDER BY uploaded_at
        """, (orcamento_id,))
        anexos = cursor.fetchall()
        
        orcamento['itens'] = itens
        orcamento['anexos'] = anexos
        
        return orcamento
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter orçamento: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
    finally:
        cursor.close()
        conn.close()

@app.post("/api/orcamentos")
async def criar_orcamento(
    data: str = Form(...),
    validade: int = Form(...),
    tags: Optional[str] = Form(None),
    forma_pagamento: str = Form(...),
    status: str = Form("Pendente"),
    observacoes: Optional[str] = Form(None),
    decisao: Optional[str] = Form(None),
    itens: str = Form(...)
):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("SELECT COALESCE(MAX(numero), 0) + 1 FROM orcamentos")
        numero = cursor.fetchone()[0]
        cursor.execute("""
            INSERT INTO orcamentos (numero, data, validade, tags, forma_pagamento, status, observacoes, decisao)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
        """, (numero, data, validade, tags, forma_pagamento, status, observacoes, decisao))
        orcamento_id = cursor.fetchone()[0]
        itens_list = json.loads(itens)
        for idx, item in enumerate(itens_list):
            cursor.execute("""
                INSERT INTO itens (orcamento_id, descricao, categoria, quantidade, unidade, ordem)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
            """, (orcamento_id, item['descricao'], item['categoria'], item['quantidade'], item['unidade'], idx))
            item_id = cursor.fetchone()[0]
            for fidx, fornecedor in enumerate(item.get('fornecedores', [])):
                cursor.execute("""
                    INSERT INTO fornecedores (item_id, nome, preco, frete, total, is_melhor, ordem)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (item_id, fornecedor['nome'], fornecedor['preco'], fornecedor.get('frete', 0), fornecedor.get('total', 0), fornecedor.get('is_melhor', False), fidx))
        conn.commit()
        return {"id": orcamento_id, "numero": numero}
    except Exception as e:
        conn.rollback()
        logger.error(f"Erro ao criar orçamento: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar orçamento")
    finally:
        cursor.close()
        conn.close()

@app.put("/api/orcamentos/{orcamento_id}")
async def atualizar_orcamento(
    orcamento_id: int,
    data: str = Form(...),
    validade: int = Form(...),
    tags: Optional[str] = Form(None),
    forma_pagamento: str = Form(...),
    status: str = Form(...),
    observacoes: Optional[str] = Form(None),
    decisao: Optional[str] = Form(None),
    itens: str = Form(...)
):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            UPDATE orcamentos SET data=%s, validade=%s, tags=%s, forma_pagamento=%s, status=%s, observacoes=%s, decisao=%s, updated_at=NOW()
            WHERE id=%s
        """, (data, validade, tags, forma_pagamento, status, observacoes, decisao, orcamento_id))
        cursor.execute("DELETE FROM itens WHERE orcamento_id=%s", (orcamento_id,))
        itens_list = json.loads(itens)
        for idx, item in enumerate(itens_list):
            cursor.execute("""
                INSERT INTO itens (orcamento_id, descricao, categoria, quantidade, unidade, ordem)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
            """, (orcamento_id, item['descricao'], item['categoria'], item['quantidade'], item['unidade'], idx))
            item_id = cursor.fetchone()[0]
            for fidx, fornecedor in enumerate(item.get('fornecedores', [])):
                cursor.execute("""
                    INSERT INTO fornecedores (item_id, nome, preco, frete, total, is_melhor, ordem)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (item_id, fornecedor['nome'], fornecedor['preco'], fornecedor.get('frete', 0), fornecedor.get('total', 0), fornecedor.get('is_melhor', False), fidx))
        conn.commit()
        return {"id": orcamento_id}
    except Exception as e:
        conn.rollback()
        logger.error(f"Erro ao atualizar orçamento: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar orçamento")
    finally:
        cursor.close()
        conn.close()

@app.delete("/api/orcamentos/{orcamento_id}")
async def excluir_orcamento(orcamento_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("DELETE FROM orcamentos WHERE id=%s", (orcamento_id,))
        conn.commit()
        return {"message": "Orçamento excluído"}
    except Exception as e:
        conn.rollback()
        logger.error(f"Erro ao excluir orçamento: {e}")
        raise HTTPException(status_code=500, detail="Erro ao excluir orçamento")
    finally:
        cursor.close()
        conn.close()

# Endpoints para categorias
@app.get("/api/categorias")
async def listar_categorias():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("SELECT * FROM categorias ORDER BY nome")
        categorias = cursor.fetchall()
        return {"categorias": [cat['nome'] for cat in categorias]}
    except Exception as e:
        logger.error(f"Erro ao listar categorias: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
    finally:
        cursor.close()
        conn.close()

@app.post("/api/categorias")
async def criar_categoria(nome: str = Form(...)):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("INSERT INTO categorias (nome) VALUES (%s) ON CONFLICT (nome) DO NOTHING RETURNING id", (nome,))
        conn.commit()
        return {"message": "Categoria criada"}
    except Exception as e:
        conn.rollback()
        logger.error(f"Erro ao criar categoria: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar categoria")
    finally:
        cursor.close()
        conn.close()

# Upload de anexos
@app.post("/api/upload")
async def upload_arquivo(file: UploadFile = File(...)):
    upload_dir = os.getenv("UPLOAD_DIR", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_location = os.path.join(upload_dir, file.filename)
    with open(file_location, "wb") as f:
        f.write(await file.read())
    return {"file_path": file_location}

# Dashboard
@app.get("/api/dashboard")
async def obter_dashboard():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("SELECT COUNT(*) as total_orcamentos, COALESCE(SUM(total_geral),0) as total_geral, COALESCE(SUM(economia_total),0) as economia_total FROM orcamentos")
        indicadores = cursor.fetchone()
        cursor.execute("SELECT categoria, COUNT(*) as quantidade FROM itens GROUP BY categoria ORDER BY quantidade DESC")
        categorias = cursor.fetchall()
        cursor.execute("SELECT status, COUNT(*) as quantidade FROM orcamentos GROUP BY status")
        status = cursor.fetchall()
        return {
            "indicadores": indicadores,
            "graficos": {
                "categorias": categorias,
                "status": status
            }
        }
    except Exception as e:
        logger.error(f"Erro ao obter dashboard: {e}")
        raise HTTPException(status_code=500, detail="Erro ao obter dashboard")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False) 
