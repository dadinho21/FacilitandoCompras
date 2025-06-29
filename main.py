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
    "host": os.getenv("DB_HOST"),
    "database": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "port": os.getenv("DB_PORT", "5432")
}

# Configuração para Railway
PORT = int(os.getenv("PORT", 8000))

# Log das configurações para debug
logger.info(f"Configuração do banco: {DATABASE_CONFIG}")
logger.info(f"Porta da aplicação: {PORT}")

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
    itens: str = Form(...)  # JSON string
):
    """Cria um novo orçamento"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Gerar número do orçamento
        cursor.execute("SELECT COALESCE(MAX(numero), 0) + 1 FROM orcamentos")
        numero = cursor.fetchone()[0]
        
        # Inserir orçamento
        cursor.execute("""
            INSERT INTO orcamentos (numero, data, validade, tags, forma_pagamento, status, observacoes, decisao)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (numero, data, validade, tags, forma_pagamento, status, observacoes, decisao))
        
        orcamento_id = cursor.fetchone()[0]
        
        # Processar itens
        itens_data = json.loads(itens)
        total_geral = 0
        economia_total = 0
        
        for ordem, item_data in enumerate(itens_data):
            # Inserir item
            cursor.execute("""
                INSERT INTO itens (orcamento_id, descricao, categoria, quantidade, unidade, ordem)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (orcamento_id, item_data['descricao'], item_data['categoria'], 
                  item_data['quantidade'], item_data['unidade'], ordem))
            
            item_id = cursor.fetchone()[0]
            
            # Processar fornecedores
            fornecedores = item_data.get('fornecedores', [])
            if fornecedores:
                # Calcular totais e encontrar melhor preço
                totais = []
                for fornecedor in fornecedores:
                    total = (float(fornecedor['preco']) * float(item_data['quantidade'])) + float(fornecedor.get('frete', 0))
                    totais.append(total)
                    fornecedor['total'] = total
                
                # Encontrar melhor preço
                if len(totais) > 1:
                    totais_ordenados = sorted(totais)
                    economia_item = totais_ordenados[1] - totais_ordenados[0]  # Diferença entre 2º e 1º
                    economia_total += economia_item
                
                # Inserir fornecedores
                for ordem_forn, fornecedor in enumerate(fornecedores):
                    is_melhor = fornecedor['total'] == min(totais)
                    cursor.execute("""
                        INSERT INTO fornecedores (item_id, nome, preco, frete, total, is_melhor, ordem)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (item_id, fornecedor['nome'], fornecedor['preco'], 
                          fornecedor.get('frete', 0), fornecedor['total'], is_melhor, ordem_forn))
                
                total_geral += min(totais)
        
        # Atualizar totais do orçamento
        cursor.execute("""
            UPDATE orcamentos 
            SET total_geral = %s, economia_total = %s 
            WHERE id = %s
        """, (total_geral, economia_total, orcamento_id))
        
        conn.commit()
        
        return {"message": "Orçamento criado com sucesso", "id": orcamento_id, "numero": numero}
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Erro ao criar orçamento: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
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
    itens: str = Form(...)  # JSON string
):
    """Atualiza um orçamento existente"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Verificar se orçamento existe
        cursor.execute("SELECT id FROM orcamentos WHERE id = %s", (orcamento_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Orçamento não encontrado")
        
        # Atualizar dados básicos
        cursor.execute("""
            UPDATE orcamentos 
            SET data = %s, validade = %s, tags = %s, forma_pagamento = %s, 
                status = %s, observacoes = %s, decisao = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (data, validade, tags, forma_pagamento, status, observacoes, decisao, orcamento_id))
        
        # Remover itens e fornecedores existentes
        cursor.execute("DELETE FROM fornecedores WHERE item_id IN (SELECT id FROM itens WHERE orcamento_id = %s)", (orcamento_id,))
        cursor.execute("DELETE FROM itens WHERE orcamento_id = %s", (orcamento_id,))
        
        # Processar novos itens (mesmo código do criar)
        itens_data = json.loads(itens)
        total_geral = 0
        economia_total = 0
        
        for ordem, item_data in enumerate(itens_data):
            cursor.execute("""
                INSERT INTO itens (orcamento_id, descricao, categoria, quantidade, unidade, ordem)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (orcamento_id, item_data['descricao'], item_data['categoria'], 
                  item_data['quantidade'], item_data['unidade'], ordem))
            
            item_id = cursor.fetchone()[0]
            
            fornecedores = item_data.get('fornecedores', [])
            if fornecedores:
                totais = []
                for fornecedor in fornecedores:
                    total = (float(fornecedor['preco']) * float(item_data['quantidade'])) + float(fornecedor.get('frete', 0))
                    totais.append(total)
                    fornecedor['total'] = total
                
                if len(totais) > 1:
                    totais_ordenados = sorted(totais)
                    economia_item = totais_ordenados[1] - totais_ordenados[0]
                    economia_total += economia_item
                
                for ordem_forn, fornecedor in enumerate(fornecedores):
                    is_melhor = fornecedor['total'] == min(totais)
                    cursor.execute("""
                        INSERT INTO fornecedores (item_id, nome, preco, frete, total, is_melhor, ordem)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (item_id, fornecedor['nome'], fornecedor['preco'], 
                          fornecedor.get('frete', 0), fornecedor['total'], is_melhor, ordem_forn))
                
                total_geral += min(totais)
        
        cursor.execute("""
            UPDATE orcamentos 
            SET total_geral = %s, economia_total = %s 
            WHERE id = %s
        """, (total_geral, economia_total, orcamento_id))
        
        conn.commit()
        
        return {"message": "Orçamento atualizado com sucesso"}
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Erro ao atualizar orçamento: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
    finally:
        cursor.close()
        conn.close()

@app.delete("/api/orcamentos/{orcamento_id}")
async def excluir_orcamento(orcamento_id: int):
    """Exclui um orçamento"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM orcamentos WHERE id = %s", (orcamento_id,))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Orçamento não encontrado")
        
        conn.commit()
        return {"message": "Orçamento excluído com sucesso"}
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Erro ao excluir orçamento: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
    finally:
        cursor.close()
        conn.close()

# Endpoints para categorias
@app.get("/api/categorias")
async def listar_categorias():
    """Lista todas as categorias"""
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
    """Cria uma nova categoria"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("INSERT INTO categorias (nome) VALUES (%s)", (nome,))
        conn.commit()
        return {"message": "Categoria criada com sucesso"}
        
    except psycopg2.IntegrityError:
        raise HTTPException(status_code=400, detail="Categoria já existe")
    except Exception as e:
        conn.rollback()
        logger.error(f"Erro ao criar categoria: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
    finally:
        cursor.close()
        conn.close()

# Endpoint para upload de arquivos
@app.post("/api/upload")
async def upload_arquivo(file: UploadFile = File(...)):
    """Faz upload de um arquivo"""
    try:
        # Criar diretório de uploads se não existir
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Gerar nome único para o arquivo
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(upload_dir, filename)
        
        # Salvar arquivo
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        return {
            "message": "Arquivo enviado com sucesso",
            "filename": filename,
            "file_path": file_path,
            "size": len(content)
        }
        
    except Exception as e:
        logger.error(f"Erro no upload: {e}")
        raise HTTPException(status_code=500, detail="Erro no upload do arquivo")

# Endpoint para estatísticas do dashboard
@app.get("/api/dashboard")
async def obter_dashboard():
    """Obtém estatísticas para o dashboard"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Total geral
        cursor.execute("SELECT COALESCE(SUM(total_geral), 0) as total FROM orcamentos")
        total_geral = cursor.fetchone()['total']
        
        # Economia total
        cursor.execute("SELECT COALESCE(SUM(economia_total), 0) as economia FROM orcamentos")
        economia_total = cursor.fetchone()['economia']
        
        # Total de itens
        cursor.execute("SELECT COUNT(*) as total_itens FROM itens")
        total_itens = cursor.fetchone()['total_itens']
        
        # Orçamento médio
        cursor.execute("SELECT COALESCE(AVG(total_geral), 0) as media FROM orcamentos WHERE total_geral > 0")
        orcamento_medio = cursor.fetchone()['media']
        
        # Maior economia
        cursor.execute("SELECT COALESCE(MAX(economia_total), 0) as maior_economia FROM orcamentos")
        maior_economia = cursor.fetchone()['maior_economia']
        
        # Maior valor
        cursor.execute("SELECT COALESCE(MAX(total_geral), 0) as maior_valor FROM orcamentos")
        maior_valor = cursor.fetchone()['maior_valor']
        
        # Fornecedor mais frequente
        cursor.execute("""
            SELECT f.nome, COUNT(*) as frequencia
            FROM fornecedores f
            GROUP BY f.nome
            ORDER BY frequencia DESC
            LIMIT 1
        """)
        fornecedor_top = cursor.fetchone()
        fornecedor_mais_frequente = fornecedor_top['nome'] if fornecedor_top else "N/A"
        
        # Distribuição por categoria
        cursor.execute("""
            SELECT i.categoria, COUNT(*) as quantidade
            FROM itens i
            GROUP BY i.categoria
            ORDER BY quantidade DESC
        """)
        categorias_dist = cursor.fetchall()
        
        # Distribuição por status
        cursor.execute("""
            SELECT status, COUNT(*) as quantidade
            FROM orcamentos
            GROUP BY status
            ORDER BY quantidade DESC
        """)
        status_dist = cursor.fetchall()
        
        return {
            "indicadores": {
                "total_geral": float(total_geral),
                "economia_total": float(economia_total),
                "total_itens": total_itens,
                "orcamento_medio": float(orcamento_medio),
                "maior_economia": float(maior_economia),
                "maior_valor": float(maior_valor),
                "fornecedor_mais_frequente": fornecedor_mais_frequente
            },
            "graficos": {
                "categorias": [{"categoria": cat['categoria'], "quantidade": cat['quantidade']} for cat in categorias_dist],
                "status": [{"status": st['status'], "quantidade": st['quantidade']} for st in status_dist]
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao obter dashboard: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
    finally:
        cursor.close()
        conn.close()

# Servir arquivos estáticos (frontend) na raiz do projeto
app.mount("/", StaticFiles(directory=".", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT) 