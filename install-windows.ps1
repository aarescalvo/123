# ============================================================================
# SOLEMAR ALIMENTARIA - INSTALADOR PARA WINDOWS 11
# Sistema de Gestión Frigorífica
# ============================================================================
# Ejecutar como Administrador: Right-click -> Run with PowerShell
# O desde PowerShell Admin: Set-ExecutionPolicy Bypass -Scope Process -Force; .\install-windows.ps1
# ============================================================================

param(
    [string]$InstallPath = "C:\Solemar",
    [string]$DataPath = "C:\Solemar\Data",
    [switch]$SkipFirewall,
    [switch]$SkipService
)

# Colores para output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green $args }
function Write-Error { Write-ColorOutput Red $args }
function Write-Info { Write-ColorOutput Cyan $args }
function Write-Warning { Write-ColorOutput Yellow $args }
function Write-Header { Write-ColorOutput Magenta $args }

# ============================================================================
# VERIFICACIONES INICIALES
# ============================================================================

Write-Header ""
Write-Header "============================================================"
Write-Header "   SOLEMAR ALIMENTARIA - INSTALADOR WINDOWS 11"
Write-Header "   Sistema de Gestión Frigorífica v2.0"
Write-Header "============================================================"
Write-Header ""

# Verificar si se ejecuta como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "[ERROR] Este instalador debe ejecutarse como Administrador"
    Write-Info "Right-click en PowerShell -> Run as Administrator"
    Write-Info "O ejecutar: Start-Process powershell -Verb RunAs"
    Read-Host "Presione Enter para salir"
    exit 1
}

Write-Success "[OK] Ejecutando como Administrador"

# Verificar versión de Windows
$winVersion = [System.Environment]::OSVersion.Version
Write-Info "[INFO] Windows Version: $winVersion"

# ============================================================================
# PASO 1: INSTALAR DEPENDENCIAS
# ============================================================================

Write-Header ""
Write-Header "PASO 1: Instalando dependencias..."
Write-Header ""

# Función para verificar si un comando existe
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Instalar Chocolatey si no existe
if (-not (Test-Command choco)) {
    Write-Info "[INFO] Instalando Chocolatey..."
    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        Write-Success "[OK] Chocolatey instalado"
    } catch {
        Write-Error "[ERROR] No se pudo instalar Chocolatey: $_"
        Write-Info "[INFO] Intentando instalación manual de Bun..."
    }
}

# Instalar Bun si no existe
if (-not (Test-Command bun)) {
    Write-Info "[INFO] Instalando Bun runtime..."
    
    # Método 1: Usando PowerShell
    try {
        Invoke-RestMethod https://bun.sh/install.ps1 | Invoke-Expression
        Write-Success "[OK] Bun instalado via PowerShell"
    } catch {
        Write-Warning "[WARN] Instalación via PowerShell falló, intentando con npm..."
        
        # Método 2: Usando npm si está disponible
        if (Test-Command npm) {
            npm install -g bun
            Write-Success "[OK] Bun instalado via npm"
        } else {
            # Método 3: Descargar directamente
            Write-Info "[INFO] Descargando Bun directamente..."
            $bunUrl = "https://github.com/oven-sh/bun/releases/latest/download/bun-windows-x64.zip"
            $bunZip = "$env:TEMP\bun.zip"
            $bunDir = "$env:LOCALAPPDATA\bun"
            
            try {
                Invoke-WebRequest -Uri $bunUrl -OutFile $bunZip -UseBasicParsing
                Expand-Archive -Path $bunZip -DestinationPath $bunDir -Force
                Remove-Item $bunZip
                
                # Agregar a PATH
                $env:Path += ";$bunDir\bun-windows-x64"
                [Environment]::SetEnvironmentVariable("Path", $env:Path, [EnvironmentVariableTarget]::Machine)
                Write-Success "[OK] Bun instalado manualmente"
            } catch {
                Write-Error "[ERROR] No se pudo instalar Bun: $_"
                Write-Error "[ERROR] Por favor instale Bun manualmente desde: https://bun.sh"
                Read-Host "Presione Enter para salir"
                exit 1
            }
        }
    }
} else {
    Write-Success "[OK] Bun ya está instalado: $(bun --version)"
}

# Refrescar variables de entorno
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# Verificar Bun nuevamente
if (-not (Test-Command bun)) {
    Write-Warning "[WARN] Bun instalado pero no está en PATH. Reinicie PowerShell e intente nuevamente."
}

# ============================================================================
# PASO 2: CREAR ESTRUCTURA DE DIRECTORIOS
# ============================================================================

Write-Header ""
Write-Header "PASO 2: Creando estructura de directorios..."
Write-Header ""

$directories = @(
    $InstallPath,
    $DataPath,
    "$DataPath\db",
    "$DataPath\backups",
    "$DataPath\logs",
    "$DataPath\uploads"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Success "[OK] Creado: $dir"
    } else {
        Write-Info "[INFO] Ya existe: $dir"
    }
}

# ============================================================================
# PASO 3: COPIAR ARCHIVOS DEL PROYECTO
# ============================================================================

Write-Header ""
Write-Header "PASO 3: Copiando archivos del proyecto..."
Write-Header ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Si estamos en la carpeta install, usar el directorio padre
if ($scriptDir -like "*install*") {
    $sourcePath = $scriptDir
} else {
    $sourcePath = $PWD.Path
}

Write-Info "[INFO] Copiando desde: $sourcePath"
Write-Info "[INFO] Hacia: $InstallPath"

# Excluir carpetas innecesarias
$excludeDirs = @("node_modules", ".next", ".git", "db", "logs", "install", "mini-services")
$excludeFiles = @("*.log", "*.db", "*.db-journal")

# Copiar archivos
try {
    # Copiar todo excepto lo excluido
    $robocopyArgs = @(
        $sourcePath, 
        $InstallPath,
        "/E",           # Copiar subdirectorios incluyendo vacíos
        "/R:1",         # Reintentos
        "/W:1",         # Espera entre reintentos
        "/NFL",         # No mostrar nombres de archivo
        "/NDL",         # No mostrar nombres de directorio
        "/NJH",         # No mostrar header
        "/NJS"          # No mostrar summary
    )
    
    foreach ($dir in $excludeDirs) {
        $robocopyArgs += "/XD"
        $robocopyArgs += "$sourcePath\$dir"
    }
    
    foreach ($file in $excludeFiles) {
        $robocopyArgs += "/XF"
        $robocopyArgs += "$sourcePath\$file"
    }
    
    & robocopy @robocopyArgs
    
    Write-Success "[OK] Archivos copiados exitosamente"
} catch {
    Write-Error "[ERROR] Error copiando archivos: $_"
    # Intentar con Copy-Item como alternativa
    try {
        Copy-Item -Path "$sourcePath\*" -Destination $InstallPath -Recurse -Force -Exclude $excludeDirs
        Write-Success "[OK] Archivos copiados (método alternativo)"
    } catch {
        Write-Error "[ERROR] Error crítico copiando archivos: $_"
        Read-Host "Presione Enter para salir"
        exit 1
    }
}

# ============================================================================
# PASO 4: CONFIGURAR VARIABLES DE ENTORNO
# ============================================================================

Write-Header ""
Write-Header "PASO 4: Configurando variables de entorno..."
Write-Header ""

# Crear archivo .env
$envContent = @"
# Configuración de Base de Datos
DATABASE_URL=file:$DataPath\db\solemar.db

# Puerto del servidor
PORT=3000

# Entorno
NODE_ENV=production

# NextAuth (cambiar en producción)
NEXTAUTH_SECRET=solemar-alimentaria-secret-key-change-in-production
NEXTAUTH_URL=http://localhost:3000
"@

$envFile = "$InstallPath\.env"
$envContent | Out-File -FilePath $envFile -Encoding UTF8 -Force
Write-Success "[OK] Archivo .env creado"

# ============================================================================
# PASO 5: INSTALAR DEPENDENCIAS NPM
# ============================================================================

Write-Header ""
Write-Header "PASO 5: Instalando dependencias..."
Write-Header ""

Set-Location $InstallPath

Write-Info "[INFO] Ejecutando bun install..."
try {
    & bun install --frozen-lockfile 2>&1 | Out-Null
    Write-Success "[OK] Dependencias instaladas"
} catch {
    Write-Warning "[WARN] Error con frozen-lockfile, intentando sin restricción..."
    & bun install 2>&1 | Out-Null
    Write-Success "[OK] Dependencias instaladas"
}

# ============================================================================
# PASO 6: CONFIGURAR BASE DE DATOS
# ============================================================================

Write-Header ""
Write-Header "PASO 6: Configurando base de datos..."
Write-Header ""

# Generar cliente Prisma
Write-Info "[INFO] Generando cliente Prisma..."
try {
    & bun run db:generate 2>&1 | Out-Null
    Write-Success "[OK] Cliente Prisma generado"
} catch {
    Write-Warning "[WARN] Error generando cliente Prisma: $_"
}

# Crear/esincronizar base de datos
Write-Info "[INFO] Sincronizando esquema de base de datos..."
try {
    & bun run db:push 2>&1 | Out-Null
    Write-Success "[OK] Base de datos creada"
} catch {
    Write-Warning "[WARN] Error sincronizando BD: $_"
}

# Ejecutar seed si existe
Write-Info "[INFO] Poblando base de datos con datos iniciales..."
try {
    & bun run db:seed 2>&1 | Out-Null
    Write-Success "[OK] Datos iniciales cargados"
} catch {
    Write-Info "[INFO] Seed no disponible o ya ejecutado"
}

# ============================================================================
# PASO 7: COMPILAR APLICACIÓN
# ============================================================================

Write-Header ""
Write-Header "PASO 7: Compilando aplicación..."
Write-Header ""

Write-Info "[INFO] Ejecutando bun run build..."
try {
    & bun run build 2>&1 | Out-Null
    Write-Success "[OK] Aplicación compilada"
} catch {
    Write-Warning "[WARN] Error durante compilación: $_"
    Write-Info "[INFO] Intentando continuar..."
}

# ============================================================================
# PASO 8: CONFIGURAR FIREWALL
# ============================================================================

if (-not $SkipFirewall) {
    Write-Header ""
    Write-Header "PASO 8: Configurando Firewall..."
    Write-Header ""

    try {
        # Verificar si la regla ya existe
        $ruleExists = Get-NetFirewallRule -DisplayName "Solemar Frigorifico" -ErrorAction SilentlyContinue
        
        if (-not $ruleExists) {
            New-NetFirewallRule -DisplayName "Solemar Frigorifico" `
                -Direction Inbound `
                -Protocol TCP `
                -LocalPort 3000 `
                -Action Allow `
                -Profile Any | Out-Null
            Write-Success "[OK] Regla de firewall creada (puerto 3000)"
        } else {
            Write-Info "[INFO] Regla de firewall ya existe"
        }
    } catch {
        Write-Warning "[WARN] No se pudo configurar firewall: $_"
        Write-Info "[INFO] Configure manualmente el puerto 3000 en Windows Firewall"
    }
} else {
    Write-Info "[INFO] Configuración de firewall omitida"
}

# ============================================================================
# PASO 9: CREAR SERVICIO DE WINDOWS
# ============================================================================

if (-not $SkipService) {
    Write-Header ""
    Write-Header "PASO 9: Configurando servicio de Windows..."
    Write-Header ""

    # Descargar NSSM si no existe
    $nssmPath = "$InstallPath\nssm.exe"
    if (-not (Test-Path $nssmPath)) {
        Write-Info "[INFO] Descargando NSSM (Non-Sucking Service Manager)..."
        try {
            $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
            $nssmZip = "$env:TEMP\nssm.zip"
            
            Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip -UseBasicParsing
            Expand-Archive -Path $nssmZip -DestinationPath "$env:TEMP\nssm" -Force
            
            # Copiar nssm.exe según arquitectura
            $arch = if ([Environment]::Is64BitOperatingSystem) { "win64" } else { "win32" }
            Copy-Item "$env:TEMP\nssm\nssm-2.24\$arch\nssm.exe" $nssmPath -Force
            
            Remove-Item $nssmZip -ErrorAction SilentlyContinue
            Remove-Item "$env:TEMP\nssm" -Recurse -ErrorAction SilentlyContinue
            
            Write-Success "[OK] NSSM descargado"
        } catch {
            Write-Warning "[WARN] No se pudo descargar NSSM: $_"
            Write-Info "[INFO] El servicio no se configurará automáticamente"
        }
    }

    # Crear el servicio si NSSM está disponible
    if (Test-Path $nssmPath) {
        try {
            # Verificar si el servicio ya existe
            $serviceExists = Get-Service -Name "SolemarFrigorifico" -ErrorAction SilentlyContinue
            
            if ($serviceExists) {
                Write-Info "[INFO] El servicio ya existe, actualizando..."
                & $nssmPath set SolemarFrigorifico Application "$env:LOCALAPPDATA\bun\bun.exe" 2>&1 | Out-Null
            } else {
                Write-Info "[INFO] Creando servicio de Windows..."
                
                # Encontrar bun.exe
                $bunExe = Get-Command bun -ErrorAction SilentlyContinue
                if (-not $bunExe) {
                    $bunExePath = "$env:LOCALAPPDATA\.bun\bin\bun.exe"
                    if (-not (Test-Path $bunExePath)) {
                        $bunExePath = "$env:USERPROFILE\.bun\bin\bun.exe"
                    }
                } else {
                    $bunExePath = $bunExe.Source
                }

                # Crear script de inicio
                $startScript = @"
@echo off
cd /d $InstallPath
bun run start
"@
                $startScript | Out-File "$InstallPath\start.bat" -Encoding ASCII

                # Instalar servicio con NSSM
                & $nssmPath install SolemarFrigorifico "$bunExePath" "run" "start" 2>&1 | Out-Null
                & $nssmPath set SolemarFrigorifico AppDirectory $InstallPath 2>&1 | Out-Null
                & $nssmPath set SolemarFrigorifico DisplayName "Solemar Frigorifico" 2>&1 | Out-Null
                & $nssmPath set SolemarFrigorifico Description "Sistema de Gestion Frigorifica - Solemar Alimentaria" 2>&1 | Out-Null
                & $nssmPath set SolemarFrigorifico Start SERVICE_AUTO_START 2>&1 | Out-Null
                & $nssmPath set SolemarFrigorifico AppStdout "$DataPath\logs\service.log" 2>&1 | Out-Null
                & $nssmPath set SolemarFrigorifico AppStderr "$DataPath\logs\error.log" 2>&1 | Out-Null
                
                Write-Success "[OK] Servicio de Windows creado"
            }
        } catch {
            Write-Warning "[WARN] Error configurando servicio: $_"
        }
    }
} else {
    Write-Info "[INFO] Configuración de servicio omitida"
}

# ============================================================================
# PASO 10: CREAR ACCESOS DIRECTOS Y SCRIPTS
# ============================================================================

Write-Header ""
Write-Header "PASO 10: Creando accesos directos..."
Write-Header ""

# Script de inicio manual
$startScript = @"
@echo off
title Solemar Alimentaria - Frigorifico
cd /d $InstallPath
echo Iniciando Solemar Frigorifico...
echo.
echo Abra su navegador en: http://localhost:3000
echo.
echo Presione Ctrl+C para detener el servidor.
echo.
bun run start
pause
"@
$startScript | Out-File "$InstallPath\iniciar.bat" -Encoding ASCII
Write-Success "[OK] Script iniciar.bat creado"

# Script de detención
$stopScript = @"
@echo off
echo Deteniendo Solemar Frigorifico...
taskkill /F /IM bun.exe 2>nul
net stop SolemarFrigorifico 2>nul
echo Servicio detenido.
pause
"@
$stopScript | Out-File "$InstallPath\detener.bat" -Encoding ASCII
Write-Success "[OK] Script detener.bat creado"

# Script de backup
$backupScript = @"
@echo off
set FECHA=%date:~-4,4%%date:~-7,2%%date:~-10,2%
set HORA=%time:~0,2%%time:~3,2%
set HORA=%HORA: =0%
set BACKUP_FILE=$DataPath\backups\backup_%FECHA%_%HORA%.db

echo Creando backup de la base de datos...
copy "$DataPath\db\solemar.db" "%BACKUP_FILE%"
echo Backup creado: %BACKUP_FILE%

echo Limpiando backups antiguos (mas de 30 dias)...
forfiles /P "$DataPath\backups" /M *.db /D -30 /C "cmd /c del @path" 2>nul
echo.
pause
"@
$backupScript | Out-File "$InstallPath\backup.bat" -Encoding ASCII
Write-Success "[OK] Script backup.bat creado"

# Script de actualización
$updateScript = @"
@echo off
echo Actualizando Solemar Frigorifico...
cd /d $InstallPath

echo Descargando ultima version...
git pull origin main 2>nul

echo Instalando dependencias...
bun install

echo Regenerando base de datos...
bun run db:generate
bun run db:push

echo Compilando...
bun run build

echo.
echo Actualizacion completada.
echo Reinicie el servicio para aplicar cambios.
pause
"@
$updateScript | Out-File "$InstallPath\actualizar.bat" -Encoding ASCII
Write-Success "[OK] Script actualizar.bat creado"

# Crear acceso directo en el escritorio
try {
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Solemar Frigorifico.lnk")
    $Shortcut.TargetPath = "$InstallPath\iniciar.bat"
    $Shortcut.WorkingDirectory = $InstallPath
    $Shortcut.Description = "Sistema de Gestion Frigorifica - Solemar Alimentaria"
    $Shortcut.Save()
    Write-Success "[OK] Acceso directo creado en el Escritorio"
} catch {
    Write-Warning "[WARN] No se pudo crear acceso directo: $_"
}

# ============================================================================
# INSTALACIÓN COMPLETADA
# ============================================================================

Write-Header ""
Write-Header "============================================================"
Write-Header "   INSTALACIÓN COMPLETADA EXITOSAMENTE"
Write-Header "============================================================"
Write-Header ""

Write-Info "Ubicación de instalación: $InstallPath"
Write-Info "Base de datos: $DataPath\db\solemar.db"
Write-Info "Logs: $DataPath\logs"
Write-Info "Backups: $DataPath\backups"
Write-Host ""

Write-Info "CREDENCIALES POR DEFECTO:"
Write-Host "  Usuario: admin"
Write-Host "  Password: admin123"
Write-Host "  PIN: 1234"
Write-Host ""

Write-Info "PARA INICIAR EL SISTEMA:"
Write-Host "  1. Ejecutar 'iniciar.bat' desde el escritorio o $InstallPath"
Write-Host "  2. O iniciar el servicio: net start SolemarFrigorifico"
Write-Host "  3. Abrir navegador en: http://localhost:3000"
Write-Host ""

Write-Info "PARA DETENER:"
Write-Host "  - Ejecutar 'detener.bat'"
Write-Host "  - O: net stop SolemarFrigorifico"
Write-Host ""

Write-Success "¡Instalación completada!"
Write-Host ""

Read-Host "Presione Enter para salir"
