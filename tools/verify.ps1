# 一键校验：全部界面截图 → 与参考图逐像素比对（MAE）→ 交互/分区/舞台自检
# 用法: powershell -ExecutionPolicy Bypass -File tools\verify.ps1

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host '== 1/4 截图全部界面 ==' -ForegroundColor Cyan
Push-Location tools
node shoot.js shots
Pop-Location

$pairs = @(
  @{ route = 'metro-door';     ref = 'materials\31a2832b-f536-4af6-850d-0cd60abc9a58.png' },
  @{ route = 'cr400-run-bf';   ref = 'materials\Picture1(1).png' },
  @{ route = 'cr400-brake-af'; ref = 'materials\Snipaste_2026-05-02_17-54-23.png' }
)

Write-Host '== 2/4 与参考图逐像素比对 ==' -ForegroundColor Cyan
foreach ($p in $pairs) {
  $shot = "tools\shots\$($p.route).png"
  if (-not (Test-Path $shot)) { Write-Host "  [skip] $($p.route) 无截图" -ForegroundColor DarkGray; continue }
  if (-not (Test-Path $p.ref)) { Write-Host "  [skip] 缺少参考图 $($p.ref)" -ForegroundColor DarkGray; continue }
  $mae = py -3 tools\compare.py $p.ref $shot 2>&1 | Select-String -Pattern '^MAE'
  Write-Host ("  {0,-16} {1}" -f $p.route, $mae)
}

Write-Host '== 3/4 交互 / 分区 / 舞台自检 ==' -ForegroundColor Cyan
Push-Location tools
node interact-check.js
node zone-check.js
node stage-check.js
Pop-Location

Write-Host '完成。截图位于 tools\shots\。' -ForegroundColor Green
