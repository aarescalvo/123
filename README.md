# Solemar Alimentaria - Sistema Frigorífico

Sistema integral de gestión para frigoríficos desarrollado en Next.js 16 + TypeScript + Bun.

## 🚀 Instalación Rápida

### Windows 11

1. Extraer el contenido del ZIP en `C:\Solemar`
2. Abrir PowerShell como **Administrador**
3. Ejecutar:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force
   .\install-windows.ps1
   ```
4. Abrir navegador en `http://localhost:3000`

### Instalación Manual

```bash
# 1. Instalar Bun desde https://bun.sh

# 2. Instalar dependencias
bun install

# 3. Configurar base de datos
bun run db:generate
bun run db:push
bun run db:seed

# 4. Compilar y ejecutar
bun run build
bun run start
```

## 📋 Requisitos

- Windows 10/11 (64 bits)
- 4 GB RAM mínimo (8 GB recomendado)
- 2 GB espacio en disco
- Puerto 3000 disponible

## 🔑 Credenciales por Defecto

| Usuario | Password | PIN | Rol |
|---------|----------|-----|-----|
| admin | admin123 | 1234 | Administrador |
| balanza | balanza123 | 1111 | Operador Balanza |
| supervisor | super123 | 2222 | Supervisor |

⚠️ **IMPORTANTE**: Cambiar credenciales en producción

## 📚 Documentación

- `INSTRUCCIONES-INSTALACION.txt` - Guía detallada de instalación
- `AI-PROMPT.txt` - Documentación técnica completa del sistema

## 📁 Estructura del Proyecto

```
C:\Solemar\
├── src/
│   ├── app/           # Páginas y APIs
│   ├── components/    # Componentes React
│   └── lib/           # Utilidades
├── prisma/            # Esquema de base de datos
├── db/                # SQLite database
└── scripts/           # Scripts de utilidad
```

## 🛠️ Comandos

| Comando | Descripción |
|---------|-------------|
| `bun run dev` | Servidor de desarrollo |
| `bun run build` | Compilar para producción |
| `bun run start` | Iniciar en producción |
| `bun run db:push` | Sincronizar base de datos |
| `bun run db:seed` | Cargar datos iniciales |

## 📞 Soporte

- GitHub Issues: [Reportar problema](https://github.com/aarescalvo/123/issues)

---

**Solemar Alimentaria** - Sistema de Gestión Frigorífica v2.0
