param(
  [string]$BaseUrl = "http://localhost:3000/api",

  [Parameter(Mandatory = $true)]
  [string]$AdminUsername,

  [Parameter(Mandatory = $true)]
  [string]$AdminPassword
)

$ErrorActionPreference = "Stop"

function Invoke-Api {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Method,

    [Parameter(Mandatory = $true)]
    [string]$Path,

    [object]$Body = $null,

    [string]$Token = ""
  )

  $parameters = @{
    Method = $Method
    Uri = "$BaseUrl$Path"
  }

  if ($Token.Length -gt 0) {
    $parameters.Headers = @{
      Authorization = "Bearer $Token"
    }
  }

  if ($null -ne $Body) {
    $parameters.ContentType = "application/json"
    $parameters.Body = $Body | ConvertTo-Json -Depth 10
  }

  return Invoke-RestMethod @parameters
}

function Assert-Equal {
  param(
    [object]$Actual,
    [object]$Expected,
    [string]$Message
  )

  if ("$Actual" -ne "$Expected") {
    throw "$Message. Expected: $Expected. Actual: $Actual"
  }
}

function Get-HttpStatusCode {
  param([object]$ErrorRecord)

  if (
    $null -ne $ErrorRecord.Exception.Response -and
    $null -ne $ErrorRecord.Exception.Response.StatusCode
  ) {
    return [int]$ErrorRecord.Exception.Response.StatusCode
  }

  return 0
}

Write-Host "1. Checking API Gateway health..." -ForegroundColor Cyan

$health = Invoke-Api -Method Get -Path "/health"

Assert-Equal `
  -Actual $health.status `
  -Expected "ok" `
  -Message "API Gateway is not healthy"

Write-Host "2. Logging in as admin..." -ForegroundColor Cyan

$adminLogin = Invoke-Api `
  -Method Post `
  -Path "/auth/login" `
  -Body @{
    username = $AdminUsername
    password = $AdminPassword
  }

$adminToken = $adminLogin.accessToken

Assert-Equal `
  -Actual $adminLogin.user.role `
  -Expected "ADMIN" `
  -Message "Seeded account is not an admin"

Write-Host "3. Creating a product..." -ForegroundColor Cyan

$productName = "E2E Product $(Get-Random)"

$productResult = Invoke-Api `
  -Method Post `
  -Path "/products" `
  -Token $adminToken `
  -Body @{
    pname = $productName
    price = "100.00"
    quantity = 10
  }

$productId = [int]$productResult.product.pid

if ($productId -le 0) {
  throw "Product id was not generated"
}

Write-Host "4. Registering a customer..." -ForegroundColor Cyan

$randomValue = Get-Random -Minimum 1000000 -Maximum 9999999
$customerUsername = "e2e_customer_$randomValue"
$customerPassword = "Customer123!"

$registered = Invoke-Api `
  -Method Post `
  -Path "/auth/register" `
  -Body @{
    username = $customerUsername
    password = $customerPassword
  }

$customerUid = [int]$registered.user.uid

Write-Host "5. Logging in as customer..." -ForegroundColor Cyan

$customerLogin = Invoke-Api `
  -Method Post `
  -Path "/auth/login" `
  -Body @{
    username = $customerUsername
    password = $customerPassword
  }

$customerToken = $customerLogin.accessToken

Write-Host "6. Creating customer profile..." -ForegroundColor Cyan

$null = Invoke-Api `
  -Method Post `
  -Path "/customers/me" `
  -Token $customerToken `
  -Body @{
    fullName = "E2E Customer"
    email = "$customerUsername@example.com"
    phone = "090$randomValue"
  }

Write-Host "7. Increasing score to GOLD tier..." -ForegroundColor Cyan

$scoreResult = Invoke-Api `
  -Method Post `
  -Path "/customers/$customerUid/score" `
  -Token $adminToken `
  -Body @{
    scoreDelta = 5000
    reason = "Full stack E2E test"
    referenceId = "e2e-score-$randomValue"
  }

Assert-Equal `
  -Actual $scoreResult.score `
  -Expected 5000 `
  -Message "Customer score is incorrect"

Assert-Equal `
  -Actual $scoreResult.membership.name `
  -Expected "GOLD" `
  -Message "Customer membership is incorrect"

Write-Host "8. Creating discounted order..." -ForegroundColor Cyan

$orderResult = Invoke-Api `
  -Method Post `
  -Path "/orders" `
  -Token $customerToken `
  -Body @{
    clientRequestId = "e2e-order-$randomValue"
    items = @(
      @{
        pid = $productId
        qty = 2
      }
    )
  }

$order = $orderResult.order
$oid = [int]$order.oid

Assert-Equal `
  -Actual $order.subtotal `
  -Expected "200.00" `
  -Message "Order subtotal is incorrect"

Assert-Equal `
  -Actual $order.discountPercent `
  -Expected "10.00" `
  -Message "Order discount percent is incorrect"

Assert-Equal `
  -Actual $order.discountAmount `
  -Expected "20.00" `
  -Message "Order discount amount is incorrect"

Assert-Equal `
  -Actual $order.totalAmount `
  -Expected "180.00" `
  -Message "Order total is incorrect"

Write-Host "9. Waiting for Shipment from Kafka..." -ForegroundColor Cyan

$shipmentResult = $null

for ($attempt = 1; $attempt -le 30; $attempt++) {
  try {
    $shipmentResult = Invoke-Api `
      -Method Get `
      -Path "/orders/$oid/shipment" `
      -Token $customerToken

    break
  }
  catch {
    $statusCode = Get-HttpStatusCode -ErrorRecord $_

    if ($statusCode -ne 404) {
      throw
    }

    Start-Sleep -Seconds 1
  }
}

if ($null -eq $shipmentResult) {
  throw "Timed out waiting for Shipment"
}

$shipment = $shipmentResult.shipment
$shipid = [int]$shipment.shipid

Assert-Equal `
  -Actual $shipment.status `
  -Expected "SHIPMENT_STATUS_PENDING" `
  -Message "Initial shipment status is incorrect"

Write-Host "10. Updating Shipment lifecycle..." -ForegroundColor Cyan

$statuses = @(
  @{
    status = "SHIPMENT_STATUS_PROCESSING"
    note = "Preparing package"
  },
  @{
    status = "SHIPMENT_STATUS_SHIPPED"
    note = "Package handed to carrier"
  },
  @{
    status = "SHIPMENT_STATUS_DELIVERED"
    note = "Package delivered"
  }
)

foreach ($statusUpdate in $statuses) {
  $shipmentResult = Invoke-Api `
    -Method Patch `
    -Path "/shipments/$shipid/status" `
    -Token $adminToken `
    -Body $statusUpdate
}

Assert-Equal `
  -Actual $shipmentResult.shipment.status `
  -Expected "SHIPMENT_STATUS_DELIVERED" `
  -Message "Final shipment status is incorrect"

Write-Host "11. Checking authorization..." -ForegroundColor Cyan

$authorizationRejected = $false

try {
  $null = Invoke-Api `
    -Method Post `
    -Path "/products" `
    -Token $customerToken `
    -Body @{
      pname = "Unauthorized Product"
      price = "10.00"
      quantity = 1
    }
}
catch {
  $statusCode = Get-HttpStatusCode -ErrorRecord $_

  if ($statusCode -eq 403) {
    $authorizationRejected = $true
  }
  else {
    throw
  }
}

if (-not $authorizationRejected) {
  throw "Customer was able to access an ADMIN endpoint"
}

Write-Host ""
Write-Host "FULL STACK E2E PASSED" -ForegroundColor Green
Write-Host "Customer uid: $customerUid"
Write-Host "Product pid:  $productId"
Write-Host "Order oid:    $oid"
Write-Host "Shipment id: $shipid"
Write-Host "Discount:    $($order.discountPercent)%"
Write-Host "Total:       $($order.totalAmount)"