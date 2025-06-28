#!/usr/bin/env python3
"""
Script para verificar as variáveis de ambiente no Railway
Execute este script para debug: python check_env.py
"""

import os
import sys

def check_environment():
    """Verifica se todas as variáveis de ambiente necessárias estão configuradas"""
    
    print("🔍 Verificando variáveis de ambiente...")
    print("=" * 50)
    
    # Variáveis necessárias para o banco de dados
    db_vars = {
        'DB_HOST': 'Host do banco de dados',
        'DB_NAME': 'Nome do banco de dados', 
        'DB_USER': 'Usuário do banco de dados',
        'DB_PASSWORD': 'Senha do banco de dados',
        'DB_PORT': 'Porta do banco de dados'
    }
    
    # Variáveis do Railway
    railway_vars = {
        'PORT': 'Porta da aplicação',
        'DATABASE_URL': 'URL completa do banco (Railway)',
        'PGHOST': 'Host PostgreSQL (Railway)',
        'PGDATABASE': 'Database PostgreSQL (Railway)',
        'PGUSER': 'Usuário PostgreSQL (Railway)',
        'PGPASSWORD': 'Senha PostgreSQL (Railway)',
        'PGPORT': 'Porta PostgreSQL (Railway)'
    }
    
    print("📊 Variáveis do Banco de Dados:")
    missing_db = []
    for var, desc in db_vars.items():
        value = os.getenv(var)
        if value:
            print(f"  ✅ {var}: {value[:10]}..." if len(value) > 10 else f"  ✅ {var}: {value}")
        else:
            print(f"  ❌ {var}: NÃO CONFIGURADA")
            missing_db.append(var)
    
    print("\n🚂 Variáveis do Railway:")
    railway_found = False
    for var, desc in railway_vars.items():
        value = os.getenv(var)
        if value:
            print(f"  ✅ {var}: {value[:20]}..." if len(value) > 20 else f"  ✅ {var}: {value}")
            railway_found = True
        else:
            print(f"  ❌ {var}: NÃO CONFIGURADA")
    
    print("\n" + "=" * 50)
    
    if railway_found:
        print("🎉 Railway detectado! As variáveis do Railway estão disponíveis.")
        print("\n💡 Dica: Configure as variáveis do banco assim:")
        print("DB_HOST=${PGHOST}")
        print("DB_NAME=${PGDATABASE}")
        print("DB_USER=${PGUSER}")
        print("DB_PASSWORD=${PGPASSWORD}")
        print("DB_PORT=${PGPORT}")
    else:
        print("⚠️  Railway não detectado. Verifique se está rodando no Railway.")
    
    if missing_db:
        print(f"\n❌ Variáveis faltando: {', '.join(missing_db)}")
        return False
    else:
        print("\n✅ Todas as variáveis necessárias estão configuradas!")
        return True

if __name__ == "__main__":
    success = check_environment()
    sys.exit(0 if success else 1) 