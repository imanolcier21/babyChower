# ══════════════════════════════════════════════════════
#  Duck DNS Auto-Updater · Baby Shower Abilene
#  Ejecuta este script con Task Scheduler para mantener
#  tu IP pública actualizada automáticamente.
# ══════════════════════════════════════════════════════

# ─── CONFIGURA ESTOS DOS VALORES ───────────────────────
$DOMAIN = "paularababy"    # Ejemplo: babylara  (sin .duckdns.org)
$TOKEN  = "6fd8f797-4f17-4aaf-ac04-1a033873b320"         # El token largo que aparece en duckdns.org
# ───────────────────────────────────────────────────────

$url      = "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip="
$logFile  = "$PSScriptRoot\duckdns.log"
$response = ""

try {
    $response = (New-Object System.Net.WebClient).DownloadString($url).Trim()
} catch {
    $response = "ERROR: $_"
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Value "$timestamp → $response"

if ($response -eq "OK") {
    Write-Host "✅ Duck DNS actualizado correctamente" -ForegroundColor Green
} else {
    Write-Host "⚠️  Respuesta: $response" -ForegroundColor Yellow
}
