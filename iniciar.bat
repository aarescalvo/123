@echo off
title Solemar Alimentaria - Inicio Rapido
cls
echo ============================================
echo    SOLEMAR ALIMENTARIA - FRIGORIFICO
echo    Sistema de Gestion Frigorifica v2.0
echo ============================================
echo.
echo Iniciando sistema...
echo Por favor espere...
echo.

cd /d "%~dp0"

:: Verificar si Bun está instalado
where bun >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Bun no esta instalado
    echo Por favor ejecute install-windows.ps1 primero
    echo O instale Bun desde: https://bun.sh
    echo.
    pause
    exit /b 1
)

:: Verificar si existe node_modules
if not exist "node_modules" (
    echo Instalando dependencias por primera vez...
    call bun install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Error instalando dependencias
        pause
        exit /b 1
    )
)

:: Verificar si existe la base de datos
if not exist "db\solemar.db" (
    echo Configurando base de datos...
    if not exist "db" mkdir db
    call bun run db:push
    call bun run db:seed
)

echo.
echo ============================================
echo Sistema iniciado correctamente
echo ============================================
echo.
echo Abra su navegador en: http://localhost:3000
echo.
echo Credenciales por defecto:
echo   Usuario: admin
echo   Password: admin123
echo   PIN: 1234
echo.
echo Presione Ctrl+C para detener el servidor
echo ============================================
echo.

:: Iniciar el servidor
bun run start
pause
