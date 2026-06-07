$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

python "$ScriptDir\prestart.py"
exit $LASTEXITCODE
