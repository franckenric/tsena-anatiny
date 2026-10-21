# Lance l'environnement de dev Docker.
# Le tunnel SSH vers la base du serveur (localhost:13306 -> VPS:3306, voir .env)
# est demarre automatiquement s'il n'existe pas deja.
# Le reseau externe web_network (partage avec nginx) est cree automatiquement
# s'il n'existe pas, ce qui evite l'erreur :
#   "network web_network declared as external, but could not be found"
#
# Usage :
#   .\dev.ps1                  # docker compose up -d --build
#   .\dev.ps1 logs -f          # suivre les logs
#   .\dev.ps1 down             # arreter
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ComposeArgs = @("up", "-d", "--build")
)

$ErrorActionPreference = "Continue"

# Tunnel SSH vers la base de donnees du serveur (la meme que phpMyAdmin).
# Le port 3307 est exclu par Windows (plage reservee) : on utilise 13306.
$tunnelPort = 13306
if (-not (Get-NetTCPConnection -LocalPort $tunnelPort -State Listen -ErrorAction SilentlyContinue)) {
    Write-Host "Demarrage du tunnel SSH vers la base du serveur (localhost:$tunnelPort -> 15.204.89.37:3306)..."
    Start-Process -FilePath "ssh" -ArgumentList '-N', '-L', "${tunnelPort}:127.0.0.1:3306", '-o', 'BatchMode=yes', '-o', 'ServerAliveInterval=30', '-o', 'ServerAliveCountMax=3', 'ubuntu@15.204.89.37' -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

docker network inspect web_network *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creation du reseau web_network..."
    docker network create web_network | Out-Null
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

docker compose @ComposeArgs
exit $LASTEXITCODE
