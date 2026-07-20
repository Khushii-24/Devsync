# install_pgvector.ps1
# Run this script in an Administrator PowerShell window.

Write-Host "Copying vector.dll to PostgreSQL lib directory..." -ForegroundColor Cyan
Copy-Item -Path "C:\Users\Lenovo\.gemini\antigravity-ide\brain\b67f8936-23a7-4e92-8429-5d3647cab116\scratch\pgvector_temp\lib\vector.dll" -Destination "C:\Program Files\PostgreSQL\16\lib\" -Force

Write-Host "Copying extension files to PostgreSQL share/extension directory..." -ForegroundColor Cyan
Copy-Item -Path "C:\Users\Lenovo\.gemini\antigravity-ide\brain\b67f8936-23a7-4e92-8429-5d3647cab116\scratch\pgvector_temp\share\extension\*" -Destination "C:\Program Files\PostgreSQL\16\share\extension\" -Force

Write-Host "Restarting PostgreSQL 16 service..." -ForegroundColor Cyan
Restart-Service -Name "postgresql-x64-16"

Write-Host "pgvector files copied and PostgreSQL restarted successfully!" -ForegroundColor Green
