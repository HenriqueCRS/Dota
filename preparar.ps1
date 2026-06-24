# Preparador do Dota Coach Overlay.
# Faz a varredura do ambiente (Steam, Dota 2, Overwolf), valida os arquivos do
# app e reduz a preparacao ao minimo de passos manuais.
#
# IMPORTANTE: este script NAO edita o config do Steam (localconfig.vdf). Aquele
# arquivo tem estrutura aninhada e e sobrescrito pelo Steam ao fechar; editar por
# fora tem risco de corromper a biblioteca. Em vez disso, detectamos o flag
# (somente leitura), copiamos "-gamestateintegration" para a area de transferencia
# e abrimos a tela de propriedades do Dota para voce colar.

$ErrorActionPreference = 'Stop'
$proj = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Step($n, $msg) { Write-Host "`n[$n] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)       { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Warn2($msg)    { Write-Host "    !!  $msg" -ForegroundColor Yellow }
function Write-Bad($msg)      { Write-Host "    XX  $msg" -ForegroundColor Red }

Write-Host "=== Dota Coach Overlay - Preparador ===" -ForegroundColor White

# ---------------------------------------------------------------------------
# 1) Arquivos do app
# ---------------------------------------------------------------------------
Write-Step 1 "Validando arquivos do app"
$manifest = Join-Path $proj 'manifest.json'
if (Test-Path $manifest) { Write-Ok "manifest.json encontrado" } else { Write-Bad "manifest.json ausente em $proj"; }

$iconsOk = $true
foreach ($f in 'icons\icon256.png','icons\icon256_gray.png','icons\icon.ico') {
  if (Test-Path (Join-Path $proj $f)) { Write-Ok $f } else { Write-Bad "$f ausente"; $iconsOk = $false }
}
if (-not $iconsOk) { Write-Warn2 "Gere os icones antes de carregar no Overwolf." }

# ---------------------------------------------------------------------------
# 2) Steam
# ---------------------------------------------------------------------------
Write-Step 2 "Localizando o Steam"
$steamPath = $null
foreach ($key in 'HKCU:\Software\Valve\Steam','HKLM:\SOFTWARE\WOW6432Node\Valve\Steam','HKLM:\SOFTWARE\Valve\Steam') {
  try {
    $p = (Get-ItemProperty -Path $key -ErrorAction Stop).SteamPath
    if ($p) { $steamPath = $p -replace '/','\'; break }
  } catch {}
}
if ($steamPath -and (Test-Path $steamPath)) { Write-Ok "Steam em: $steamPath" }
else { Write-Bad "Steam nao encontrado. Instale o Steam e o Dota 2 primeiro."; $steamPath = $null }

# ---------------------------------------------------------------------------
# 3) Dota 2 (appid 570) atraves das bibliotecas do Steam
# ---------------------------------------------------------------------------
Write-Step 3 "Localizando o Dota 2"
$dotaPath = $null
$libRoots = @()
if ($steamPath) {
  $libRoots += $steamPath
  $libVdf = Join-Path $steamPath 'steamapps\libraryfolders.vdf'
  if (Test-Path $libVdf) {
    $txt = Get-Content $libVdf -Raw
    [regex]::Matches($txt, '"path"\s*"([^"]+)"') | ForEach-Object {
      $libRoots += ($_.Groups[1].Value -replace '\\\\','\')
    }
  }
}
foreach ($root in ($libRoots | Select-Object -Unique)) {
  $candidate = Join-Path $root 'steamapps\common\dota 2 beta'
  if (Test-Path $candidate) { $dotaPath = $candidate; break }
}
if ($dotaPath) { Write-Ok "Dota 2 em: $dotaPath" }
else { Write-Warn2 "Dota 2 nao localizado nas bibliotecas. Confirme que esta instalado." }

# ---------------------------------------------------------------------------
# 4) Launch option -gamestateintegration (somente leitura)
# ---------------------------------------------------------------------------
Write-Step 4 "Verificando o launch option -gamestateintegration"
$flagFound = $false
if ($steamPath) {
  $userdata = Join-Path $steamPath 'userdata'
  if (Test-Path $userdata) {
    Get-ChildItem $userdata -Directory -ErrorAction SilentlyContinue | ForEach-Object {
      $lc = Join-Path $_.FullName 'config\localconfig.vdf'
      if (Test-Path $lc) {
        $c = Get-Content $lc -Raw
        # procura o bloco do app 570 e a LaunchOptions proxima
        $m = [regex]::Match($c, '"570"\s*\{[\s\S]{0,2000}?"LaunchOptions"\s*"([^"]*)"')
        if ($m.Success -and $m.Groups[1].Value -match 'gamestateintegration') { $flagFound = $true }
      }
    }
  }
}
if ($flagFound) {
  Write-Ok "-gamestateintegration ja esta configurado."
} else {
  Write-Warn2 "Flag ausente. Copiando '-gamestateintegration' para a area de transferencia."
  Set-Clipboard -Value '-gamestateintegration'
  Write-Host "    -> Cole (Ctrl+V) no campo 'Opcoes de inicializacao' do Dota 2 e clique OK." -ForegroundColor Yellow
  $r = Read-Host "    Abrir as propriedades do Dota 2 no Steam agora? (S/N)"
  if ($r -match '^[Ss]') { Start-Process "steam://gameproperties/570" }
}

# ---------------------------------------------------------------------------
# 5) Overwolf
# ---------------------------------------------------------------------------
Write-Step 5 "Verificando o Overwolf"
$owPaths = @(
  (Join-Path $env:LOCALAPPDATA 'Overwolf\OverwolfLauncher.exe'),
  'C:\Program Files (x86)\Overwolf\OverwolfLauncher.exe',
  'C:\Program Files\Overwolf\OverwolfLauncher.exe'
)
$owExe = $owPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($owExe) {
  Write-Ok "Overwolf instalado: $owExe"
  $r = Read-Host "    Abrir o Overwolf agora? (S/N)"
  if ($r -match '^[Ss]') { Start-Process $owExe }
} else {
  Write-Warn2 "Overwolf nao encontrado."
  $r = Read-Host "    Abrir a pagina oficial de download? (S/N)"
  if ($r -match '^[Ss]') { Start-Process "https://www.overwolf.com/" }
}

# ---------------------------------------------------------------------------
# 6) Resumo e proximos passos manuais
# ---------------------------------------------------------------------------
Write-Step 6 "Proximos passos (manuais, nao automatizaveis)"
Write-Host "    1. Se o Overwolf nao estava instalado: instale-o pela pagina aberta." -ForegroundColor White
Write-Host "    2. No Overwolf: engrenagem > Support > Development options > Load unpacked extension" -ForegroundColor White
Write-Host "       e selecione esta pasta:" -ForegroundColor White
Write-Host "       $proj" -ForegroundColor Gray
Write-Host "    3. Abra o Dota 2 (com o -gamestateintegration) e entre numa partida/bot match." -ForegroundColor White
Write-Host "`nAbrindo a pasta do projeto para facilitar o 'Load unpacked'..." -ForegroundColor Cyan
Start-Process explorer.exe $proj

Write-Host "`n=== Preparacao concluida ===" -ForegroundColor White
Read-Host "Pressione ENTER para fechar"
