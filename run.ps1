# Start the game with Docker. Usage: .\run.ps1 [dev|prod|down|logs|build]
param(
    [ValidateSet('dev', 'prod', 'down', 'logs', 'build')]
    [string]$Command = 'dev'
)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error 'Docker was not found on your PATH. Install Docker Desktop: https://www.docker.com/products/docker-desktop/'
    exit 1
}

switch ($Command) {
    'dev' {
        Write-Host 'UI:  http://localhost:15173'
        Write-Host 'API: http://localhost:18000/docs'
        docker compose --profile dev up --build
    }
    'prod' {
        Write-Host 'Game: http://localhost:18080'
        docker compose --profile prod up --build
    }
    'down' { docker compose --profile dev --profile prod down }
    'logs' { docker compose --profile dev --profile prod logs -f }
    'build' { docker compose --profile prod build }
}
