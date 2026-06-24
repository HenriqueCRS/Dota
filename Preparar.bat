@echo off
REM Launcher de duplo-clique para o preparador.
REM Roda o PowerShell ignorando a politica de execucao so para este script.
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0preparar.ps1"
