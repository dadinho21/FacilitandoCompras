# 🚀 Instruções Rápidas - Controle de Orçamentos

## ⚡ Início Rápido

### 1. Backend (Python FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### 2. Banco de Dados
```sql
CREATE DATABASE controle_orcamentos;
```

### 3. Frontend
Abra `index.html` no navegador ou acesse `http://localhost:8000`

## 🎯 Funcionalidades Principais

### 📥 Cadastrar Orçamento
1. Clique em "📥 Cadastrar Orçamento"
2. Preencha dados básicos (data, validade, pagamento, status)
3. Clique "+ Adicionar Item" para cada item
4. Para cada item, adicione fornecedores com preços
5. Adicione anexos se necessário
6. Clique "💾 Salvar Orçamento"

### 📊 Dashboard
- **Indicadores**: Total geral, economia, itens, médias
- **Gráficos**: Distribuição por categoria e status
- **Comparativo**: Economia entre fornecedores

### 📋 Lista de Orçamentos
- **Visualizar**: Clique no número do orçamento
- **Editar**: Clique no botão ✏️
- **Excluir**: Clique no botão 🗑️
- **Filtrar**: Use a busca e filtro de status
- **Exportar**: Botões Excel e PDF

### 🔄 Sincronização
- **Offline**: Funciona sem internet (dados salvos localmente)
- **Online**: Sincroniza automaticamente com backend
- **Backup**: Exporte/importe dados via configurações

## 🎨 Interface

### Cores e Ícones
- 🔵 **Azul**: Ações principais, navegação
- 🟢 **Verde**: Sucesso, melhor fornecedor
- 🟡 **Amarelo**: Alertas, sincronização
- 🔴 **Vermelho**: Erros, exclusão

### Responsividade
- **Desktop**: Layout completo com todas as funcionalidades
- **Tablet**: Layout adaptado, gráficos responsivos
- **Mobile**: Layout otimizado, navegação simplificada

## ⚙️ Configurações

### Categorias
- Dashboard → "+ Cadastrar Categoria"
- Adicione, edite ou remova categorias
- Categorias padrão não podem ser removidas

### Conexão Backend
- Configure URL da API nas configurações
- Teste conexão com botão "🧪 Testar Conexão"
- Sistema funciona offline se backend não estiver disponível

## 📱 Modo Offline

### Como Funciona
1. Sistema detecta automaticamente status da conexão
2. Dados são salvos no localStorage quando offline
3. Fila de sincronização armazena operações pendentes
4. Sincronização automática quando conexão é restaurada

### Vantagens
- ✅ Funciona sem internet
- ✅ Nenhum dado é perdido
- ✅ Sincronização automática
- ✅ Backup local dos dados

## 🔧 Solução de Problemas

### Backend não conecta
```bash
# Verificar se está rodando
curl http://localhost:8000/api/orcamentos

# Verificar logs
uvicorn main:app --reload --log-level debug
```

### Frontend não carrega
1. Verifique console do navegador (F12)
2. Confirme se backend está na porta 8000
3. Teste conexão nas configurações

### Upload falha
1. Verifique tamanho do arquivo (máximo 10MB)
2. Confirme tipo de arquivo (PDF, JPG, PNG, DOC)
3. Verifique permissões da pasta uploads/

## 📊 Dicas de Uso

### Organização
- Use tags para categorizar orçamentos
- Adicione observações detalhadas
- Preencha o campo de decisão após análise

### Análise de Fornecedores
- Sistema destaca automaticamente o melhor preço
- Compare preços + frete para análise completa
- Use múltiplos fornecedores por item

### Exportação
- **Excel**: Dados detalhados para análise
- **PDF**: Relatório formatado para apresentação
- **Backup**: JSON completo para backup/restore

## 🎯 Fluxo de Trabalho Recomendado

1. **Cadastrar Orçamento** com todos os dados
2. **Adicionar Itens** com descrições detalhadas
3. **Incluir Fornecedores** com preços e fretes
4. **Analisar Dashboard** para insights
5. **Exportar Relatórios** conforme necessário
6. **Sincronizar Dados** regularmente

## 🚀 Próximos Passos

- Configure backup automático
- Implemente autenticação se necessário
- Personalize categorias para seu negócio
- Treine usuários nas funcionalidades
- Configure monitoramento em produção

---

**Sistema pronto para uso! 🎉** 