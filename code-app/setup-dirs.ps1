$base = "C:\Apps\MDATemplate-PowerPlatform\code-app\src"
$dirs = @(
    "components\layout",
    "components\common",
    "components\forms",
    "components\views",
    "pages",
    "hooks",
    "store",
    "config",
    "types",
    "styles"
)
foreach ($d in $dirs) {
    New-Item -ItemType Directory -Path (Join-Path $base $d) -Force | Out-Null
}
Write-Output "Directories created"
