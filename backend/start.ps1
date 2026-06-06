# Stop anything already bound to port 5000 (stale Flask instances cause 500 errors)
Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 1
Set-Location $PSScriptRoot
python app.py
