param(
    [switch]$NoBuild,
    [switch]$KeepUp,
    [string]$IdentityBaseUrl = "http://localhost:5001",
    [string]$CatalogBaseUrl = "http://localhost:5002",
    [string]$OrderBaseUrl = "http://localhost:5003"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Wait-Healthy {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$MaxRetry = 3,
        [int]$RetryIntervalSeconds = 2
    )

    $lastError = ""
    for ($i = 0; $i -lt $MaxRetry; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method Get -SkipHttpErrorCheck
            if ([int]$response.StatusCode -eq 200) {
                Write-Host "  - healthy: $Url (attempt $($i + 1)/$MaxRetry)"
                return
            }

            $lastError = "status=$([int]$response.StatusCode)"
            Write-Host "  - waiting: $Url (attempt $($i + 1)/$MaxRetry, $lastError)"
        }
        catch {
            $lastError = $_.Exception.Message
            Write-Host "  - waiting: $Url (attempt $($i + 1)/$MaxRetry, error=$lastError)"
        }

        Start-Sleep -Seconds $RetryIntervalSeconds
    }

    throw "Health check timeout: $Url (last_error=$lastError)"
}

$buildOption = if ($NoBuild) { "" } else { "--build" }
Write-Host "[1/3] docker compose up -d $buildOption (postgres, identity-api, catalog-api, order-api)"
if ($NoBuild) {
    docker compose up -d postgres identity-api catalog-api order-api | Out-Host
}
else {
    docker compose up -d --build postgres identity-api catalog-api order-api | Out-Host
}

Write-Host "[2/3] wait for health endpoints"
Wait-Healthy "$IdentityBaseUrl/health"
Wait-Healthy "$CatalogBaseUrl/health"
Wait-Healthy "$OrderBaseUrl/health"

try {
    Write-Host "[3/3] run Chapter7.E2E.Tests"
    $env:CH7_IDENTITY_BASE_URL = $IdentityBaseUrl
    $env:CH7_CATALOG_BASE_URL = $CatalogBaseUrl
    $env:CH7_ORDER_BASE_URL = $OrderBaseUrl
    dotnet test tests/Chapter7.E2E.Tests/Chapter7.E2E.Tests.csproj | Out-Host
}
finally {
    if (-not $KeepUp) {
        Write-Host "docker compose down"
        docker compose down | Out-Host
    }
}
