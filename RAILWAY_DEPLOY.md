# 🚀 Deploy no Railway - Controle de Orçamentos

Este guia te ajudará a fazer o deploy da aplicação Controle de Orçamentos no Railway.

## 📋 Pré-requisitos

1. Conta no [Railway](https://railway.app/)
2. Conta no [GitHub](https://github.com/) (recomendado)
3. Projeto configurado com Git

## 🛠️ Passo a Passo

### 1. Preparar o Projeto

Certifique-se de que seu projeto está no GitHub com a seguinte estrutura:

```
ControleOrcamento/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── Procfile
│   ├── runtime.txt
│   └── env_example.txt
├── index.html
├── style.css
├── script.js
└── README.md
```

### 2. Criar Projeto no Railway

1. Acesse [railway.app](https://railway.app/)
2. Faça login com sua conta GitHub
3. Clique em "New Project"
4. Selecione "Deploy from GitHub repo"
5. Escolha seu repositório do Controle de Orçamentos

### 3. Configurar Banco de Dados PostgreSQL

1. No seu projeto Railway, clique em "New"
2. Selecione "Database" → "PostgreSQL"
3. Aguarde a criação do banco
4. Clique no banco criado e vá em "Connect"
5. Copie as variáveis de ambiente:
   - `DATABASE_URL`
   - `PGHOST`
   - `PGDATABASE`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGPORT`

### 4. Configurar Variáveis de Ambiente

1. No seu projeto Railway, vá em "Variables"
2. Adicione as seguintes variáveis:

```env
# Banco de Dados (copiadas do PostgreSQL)
DB_HOST=${PGHOST}
DB_NAME=${PGDATABASE}
DB_USER=${PGUSER}
DB_PASSWORD=${PGPASSWORD}
DB_PORT=${PGPORT}

# Aplicação
PORT=8000

# Segurança (opcional)
SECRET_KEY=sua_chave_secreta_muito_segura_aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
```

### 5. Configurar Deploy

1. No Railway, vá em "Settings"
2. Em "Build Command", deixe vazio (usará o Procfile)
3. Em "Start Command", deixe vazio (usará o Procfile)
4. Em "Root Directory", deixe vazio (deploy da raiz)

### 6. Fazer Deploy

1. O Railway detectará automaticamente que é um projeto Python
2. Ele instalará as dependências do `requirements.txt`
3. Executará o comando do `Procfile`
4. A aplicação estará disponível em: `https://seu-projeto.railway.app`

### 7. Configurar Domínio Personalizado (Opcional)

1. No Railway, vá em "Settings"
2. Em "Domains", clique em "Generate Domain"
3. Ou adicione seu domínio personalizado

## 🔧 Configurações Importantes

### Variáveis de Ambiente do Railway

O Railway fornece automaticamente:
- `PORT`: Porta onde a aplicação deve rodar
- `DATABASE_URL`: URL completa do PostgreSQL
- `RAILWAY_STATIC_URL`: URL para arquivos estáticos

### Estrutura de Arquivos

O Railway precisa que os arquivos estejam organizados assim:
- `backend/`: Código Python/FastAPI
- `index.html`, `style.css`, `script.js`: Frontend na raiz

## 🚨 Troubleshooting

### Erro de Conexão com Banco

Se houver erro de conexão:
1. Verifique se as variáveis de ambiente estão corretas
2. Certifique-se de que o PostgreSQL foi criado
3. Verifique os logs no Railway

### Erro de Porta

Se houver erro de porta:
1. Certifique-se de que está usando `$PORT` no Procfile
2. Verifique se a variável `PORT` está configurada

### Erro de Dependências

Se houver erro de dependências:
1. Verifique se o `requirements.txt` está correto
2. Verifique se o `runtime.txt` especifica uma versão válida do Python

## 📊 Monitoramento

### Logs

Para ver os logs:
1. No Railway, vá em "Deployments"
2. Clique no deployment mais recente
3. Veja os logs em tempo real

### Métricas

O Railway fornece métricas de:
- CPU
- Memória
- Rede
- Disco

## 🔄 Atualizações

Para atualizar a aplicação:
1. Faça push para o GitHub
2. O Railway fará deploy automático
3. Ou force um novo deploy manualmente

## 💰 Custos

- Railway oferece $5 de crédito gratuito mensal
- PostgreSQL: ~$5/mês
- Aplicação: ~$5/mês
- **Total estimado: ~$10/mês**

## 🆘 Suporte

Se precisar de ajuda:
1. Verifique os logs no Railway
2. Consulte a [documentação do Railway](https://docs.railway.app/)
3. Abra uma issue no GitHub do projeto

## ✅ Checklist Final

- [ ] Projeto no GitHub
- [ ] Projeto criado no Railway
- [ ] PostgreSQL configurado
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado com sucesso
- [ ] Aplicação acessível via URL
- [ ] Banco de dados funcionando
- [ ] Upload de arquivos funcionando

---

🎉 **Parabéns!** Sua aplicação está no ar! 