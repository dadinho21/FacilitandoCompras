# 🚨 Troubleshooting - Railway

## ❌ Erro: Connection refused (localhost:5432)

### 🔍 Diagnóstico

Este erro acontece quando:
1. As variáveis de ambiente não estão configuradas
2. O PostgreSQL não foi criado no Railway
3. As variáveis estão com valores incorretos

### 🛠️ Solução Passo a Passo

#### 1. Verificar se o PostgreSQL foi criado

1. No Railway, vá em seu projeto
2. Verifique se há um serviço "PostgreSQL" listado
3. Se não houver, clique em "New" → "Database" → "PostgreSQL"

#### 2. Configurar Variáveis de Ambiente

1. No Railway, vá em "Variables"
2. **Remova** todas as variáveis de banco existentes
3. **Adicione** as seguintes variáveis:

```env
# Banco de Dados (copie EXATAMENTE do PostgreSQL)
DB_HOST=${PGHOST}
DB_NAME=${PGDATABASE}
DB_USER=${PGUSER}
DB_PASSWORD=${PGPASSWORD}
DB_PORT=${PGPORT}

# Aplicação
PORT=8000
```

#### 3. Verificar Valores das Variáveis

1. No Railway, clique no serviço PostgreSQL
2. Vá em "Connect"
3. Copie os valores das variáveis:
   - `PGHOST`
   - `PGDATABASE` 
   - `PGUSER`
   - `PGPASSWORD`
   - `PGPORT`

#### 4. Testar Conexão

1. No Railway, vá em "Deployments"
2. Clique no deployment mais recente
3. Veja os logs - deve aparecer:
   ```
   🔍 Verificando variáveis de ambiente...
   ✅ DB_HOST: [valor]
   ✅ DB_NAME: [valor]
   ✅ DB_USER: [valor]
   ✅ DB_PASSWORD: [valor]
   ✅ DB_PORT: [valor]
   ```

### 🔧 Soluções Alternativas

#### Solução 1: Usar DATABASE_URL

Se as variáveis individuais não funcionarem:

```env
DATABASE_URL=${DATABASE_URL}
```

E modificar o `main.py`:

```python
import os
from urllib.parse import urlparse

# Usar DATABASE_URL se disponível
database_url = os.getenv("DATABASE_URL")
if database_url:
    url = urlparse(database_url)
    DATABASE_CONFIG = {
        "host": url.hostname,
        "database": url.path[1:],
        "user": url.username,
        "password": url.password,
        "port": url.port or 5432
    }
else:
    DATABASE_CONFIG = {
        "host": os.getenv("DB_HOST", "localhost"),
        "database": os.getenv("DB_NAME", "controle_orcamentos"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", "password"),
        "port": os.getenv("DB_PORT", "5432")
    }
```

#### Solução 2: Verificar Manualmente

1. No Railway, vá em "Variables"
2. Verifique se as variáveis estão assim:
   ```
   DB_HOST=${PGHOST}
   DB_NAME=${PGDATABASE}
   DB_USER=${PGUSER}
   DB_PASSWORD=${PGPASSWORD}
   DB_PORT=${PGPORT}
   ```

3. **NÃO** deve estar assim:
   ```
   DB_HOST=localhost
   DB_NAME=controle_orcamentos
   DB_USER=postgres
   DB_PASSWORD=password
   DB_PORT=5432
   ```

### 🚨 Erros Comuns

#### Erro: "PGHOST not found"
- O PostgreSQL não foi criado
- Crie um novo PostgreSQL no Railway

#### Erro: "Permission denied"
- As credenciais estão incorretas
- Verifique se copiou os valores corretos do PostgreSQL

#### Erro: "Database does not exist"
- O banco não foi criado automaticamente
- Verifique se o PostgreSQL está ativo

### 📞 Suporte

Se ainda não funcionar:

1. **Verifique os logs** no Railway
2. **Teste localmente** com as mesmas variáveis
3. **Reinicie o serviço** no Railway
4. **Crie um novo PostgreSQL** se necessário

### ✅ Checklist de Verificação

- [ ] PostgreSQL criado no Railway
- [ ] Variáveis de ambiente configuradas corretamente
- [ ] Valores copiados do PostgreSQL (não valores padrão)
- [ ] Deploy realizado após configurar variáveis
- [ ] Logs mostram variáveis corretas
- [ ] Conexão estabelecida com sucesso

---

💡 **Dica**: Sempre configure as variáveis de ambiente ANTES de fazer o primeiro deploy! 