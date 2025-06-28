# 🏢 Controle de Orçamentos - Sistema de Compras

Sistema web completo para controle e gerenciamento de orçamentos de compras, com interface moderna, responsiva e funcionalidade offline/online.

## ✨ Características Principais

- **📥 Cadastro Completo**: Orçamentos com múltiplos itens e fornecedores
- **📊 Dashboard Profissional**: Indicadores e gráficos interativos
- **💾 Modo Offline**: Funciona sem internet usando localStorage
- **🔄 Sincronização**: Integração automática com backend PostgreSQL
- **📎 Upload de Anexos**: Suporte a PDF, imagens e documentos
- **📈 Gráficos Dinâmicos**: Chart.js para visualização de dados
- **📋 Exportação**: Excel e PDF com formatação profissional
- **🎨 Interface Moderna**: Design responsivo com animações suaves

## 🛠️ Tecnologias Utilizadas

### Frontend
- **HTML5**: Estrutura semântica e moderna
- **CSS3**: Grid, Flexbox, animações e design responsivo
- **JavaScript ES6+**: Funcionalidades avançadas e modularização
- **Chart.js**: Gráficos interativos e responsivos
- **SheetJS**: Exportação para Excel (.xlsx)

### Backend
- **Python FastAPI**: API REST moderna e performática
- **PostgreSQL**: Banco de dados robusto e confiável
- **Uvicorn**: Servidor ASGI para produção

## 🚀 Instalação e Configuração

### Pré-requisitos

- Python 3.8+
- PostgreSQL 12+
- Node.js (opcional, para desenvolvimento)

### 1. Configuração do Backend

```bash
# Navegar para o diretório do backend
cd backend

# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt
```

### 2. Configuração do Banco de Dados

```sql
-- Conectar ao PostgreSQL
psql -U postgres

-- Criar banco de dados
CREATE DATABASE controle_orcamentos;

-- Criar usuário (opcional)
CREATE USER orcamentos_user WITH PASSWORD 'sua_senha';
GRANT ALL PRIVILEGES ON DATABASE controle_orcamentos TO orcamentos_user;
```

### 3. Configuração das Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp env_example.txt .env

# Editar arquivo .env com suas configurações
DB_HOST=localhost
DB_NAME=controle_orcamentos
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_PORT=5432
```

### 4. Executar o Backend

```bash
# Desenvolvimento
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Produção
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 5. Acessar o Sistema

Abra o navegador e acesse: `http://localhost:8000`

## 📋 Funcionalidades

### 🏠 Dashboard
- **Indicadores em Tempo Real**: Total geral, economia, itens, médias
- **Gráficos Interativos**: Distribuição por categoria e status
- **Comparativo de Economia**: Visualização da economia entre fornecedores
- **Fornecedor Mais Frequente**: Identificação automática

### 📥 Cadastro de Orçamentos
- **Dados Básicos**: Data, validade, tags, pagamento, status
- **Itens Dinâmicos**: Descrição, categoria, quantidade, unidade
- **Múltiplos Fornecedores**: Por item, com preço e frete
- **Anexos**: Upload de PDF, imagens e documentos
- **Observações**: Campos para observações e decisões

### 📋 Lista de Orçamentos
- **Tabela Responsiva**: Visualização organizada dos dados
- **Filtros Avançados**: Busca por número, tags, status
- **Ações Rápidas**: Editar, excluir, visualizar detalhes
- **Exportação**: Excel e PDF com formatação profissional

### 🔄 Sincronização
- **Modo Offline**: Funciona sem internet
- **Sincronização Automática**: Quando conexão é restaurada
- **Fila de Sincronização**: Garante que nenhum dado seja perdido
- **Backup/Importação**: Exportação e importação de dados

## 🎨 Interface e UX

### Design Responsivo
- **Mobile First**: Otimizado para dispositivos móveis
- **Grid e Flexbox**: Layout adaptável e moderno
- **Animações Suaves**: Transições e efeitos visuais
- **Cores Intuitivas**: Azul para ações, verde para sucesso

### Feedback Visual
- **Mensagens Contextuais**: Sucesso, erro, alerta, informação
- **Loading States**: Indicadores de carregamento
- **Validação em Tempo Real**: Feedback imediato ao usuário
- **Tooltips**: Informações adicionais quando necessário

## 🔧 Configurações Avançadas

### Personalização de Categorias
- Acesse o Dashboard
- Clique em "+ Cadastrar Categoria"
- Adicione, edite ou remova categorias
- Categorias padrão não podem ser removidas

### Configurações do Sistema
- Acesse o modal de configurações
- Configure URL da API
- Teste conexão com backend
- Exporte/importe backup de dados

### Modo Offline
- Sistema detecta automaticamente status da conexão
- Dados são salvos localmente quando offline
- Sincronização automática quando conexão é restaurada
- Fila de sincronização garante integridade dos dados

## 📊 Estrutura do Banco de Dados

### Tabelas Principais
- **orcamentos**: Dados básicos dos orçamentos
- **itens**: Itens de cada orçamento
- **fornecedores**: Fornecedores de cada item
- **anexos**: Arquivos anexados aos orçamentos
- **categorias**: Categorias de itens

### Relacionamentos
- Orçamento → Itens (1:N)
- Item → Fornecedores (1:N)
- Orçamento → Anexos (1:N)

## 🚀 Deploy em Produção

### Backend (FastAPI)
```bash
# Instalar dependências de produção
pip install -r requirements.txt

# Configurar variáveis de ambiente
export DB_HOST=seu_host
export DB_NAME=seu_banco
export DB_USER=seu_usuario
export DB_PASSWORD=sua_senha

# Executar com Gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Frontend
- Servir arquivos estáticos via Nginx
- Configurar CORS adequadamente
- Implementar HTTPS
- Configurar cache para otimização

## 🔒 Segurança

### Recomendações
- Use HTTPS em produção
- Configure CORS adequadamente
- Implemente autenticação se necessário
- Valide todos os inputs
- Use variáveis de ambiente para senhas

### Validações
- Tipos de arquivo permitidos
- Tamanho máximo de upload (10MB)
- Validação de dados obrigatórios
- Sanitização de inputs

## 🐛 Solução de Problemas

### Backend não conecta
1. Verifique se PostgreSQL está rodando
2. Confirme credenciais no arquivo .env
3. Teste conexão manual: `psql -h localhost -U postgres -d controle_orcamentos`

### Frontend não carrega dados
1. Verifique se backend está rodando na porta 8000
2. Confirme URL da API nas configurações
3. Verifique console do navegador para erros

### Upload de arquivos falha
1. Verifique permissões da pasta uploads/
2. Confirme tamanho do arquivo (máximo 10MB)
3. Verifique tipo de arquivo permitido

## 📈 Melhorias Futuras

- [ ] Sistema de autenticação e autorização
- [ ] Notificações em tempo real
- [ ] API para integração com outros sistemas
- [ ] Relatórios avançados
- [ ] Dashboard personalizável
- [ ] Backup automático
- [ ] Logs de auditoria
- [ ] Multi-tenancy

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para dúvidas ou suporte:
- Abra uma issue no GitHub
- Consulte a documentação da API em `/docs` (quando backend estiver rodando)
- Verifique os logs do console para debugging

---

**Desenvolvido com ❤️ para otimizar o controle de orçamentos e compras** 