param(
    [Parameter(Mandatory=$false)]
    [string]$folder
)

function Select-FolderInteractive {
    Write-Host "No folder provided. Listing directories in current location:`n"

    $dirs = Get-ChildItem -Directory

    if ($dirs.Count -eq 0) {
        Write-Error "No directories found in current location."
        exit 1
    }

    for ($i = 0; $i -lt $dirs.Count; $i++) {
        Write-Host "[$($i+1)] $($dirs[$i].Name)"
    }

    Write-Host ""
    $selection = Read-Host "Enter number OR full path"

    # If number selected
    if ($selection -match '^\d+$') {
        $index = [int]$selection - 1
        if ($index -ge 0 -and $index -lt $dirs.Count) {
            return $dirs[$index].FullName
        } else {
            Write-Error "Invalid selection."
            exit 1
        }
    }

    # Otherwise treat as path
    return $selection
}

# Resolve folder input
if (-not $folder) {
    $folder = Select-FolderInteractive
}

try {
    $sourcePath = Resolve-Path $folder -ErrorAction Stop
} catch {
    Write-Error "Folder '$folder' does not exist."
    exit 1
}

if (-not (Test-Path $sourcePath -PathType Container)) {
    Write-Error "Invalid folder path."
    exit 1
}

# Parent path
$parentPath = Split-Path -Path $sourcePath -Parent
if ([string]::IsNullOrEmpty($parentPath)) {
    $parentPath = "."
}

# Generate unique web folder
$webFolderName = "web"
$counter = 1
$targetPath = Join-Path $parentPath $webFolderName

while (Test-Path $targetPath) {
    $counter++
    $webFolderName = "web$counter"
    $targetPath = Join-Path $parentPath $webFolderName
}

New-Item -ItemType Directory -Path $targetPath | Out-Null
Write-Host "Created folder: $webFolderName at $targetPath`n"

# Process HTML files
$allHtmlFiles = Get-ChildItem -Path $sourcePath -Filter "*.html" -File -Recurse

foreach ($htmlFile in $allHtmlFiles) {

    $parentFolderName = Split-Path (Split-Path $htmlFile.FullName -Parent) -Leaf
    $baseName = $parentFolderName
    $extension = ".html"

    $newFileName = "$baseName$extension"
    $destinationPath = Join-Path $targetPath $newFileName

    # Handle duplicates
    $counter2 = 1
    while (Test-Path $destinationPath) {
        $newFileName = "$baseName`_$counter2$extension"
        $destinationPath = Join-Path $targetPath $newFileName
        $counter2++
    }

    try {
        Copy-Item -Path $htmlFile.FullName -Destination $destinationPath -Force
        Write-Host "Copied: $($htmlFile.FullName) -> $newFileName"
    } catch {
        Write-Host "Error copying $($htmlFile.FullName): $($_.Exception.Message)"
    }
}

# Process design.md files
$designFiles = Get-ChildItem -Path $sourcePath -Filter "design.md" -Recurse -File

foreach ($designFile in $designFiles) {

    $destinationPath = Join-Path $targetPath $designFile.Name

    $counter3 = 1
    while (Test-Path $destinationPath) {
        $destinationPath = Join-Path $targetPath "design_$counter3.md"
        $counter3++
    }

    try {
        Copy-Item -Path $designFile.FullName -Destination $destinationPath -Force
        Write-Host "Copied: $($designFile.FullName) -> $destinationPath"
    } catch {
        Write-Host "Error copying design file: $($_.Exception.Message)"
    }
}

Write-Host "`nOperation completed successfully!"
Write-Host "All files copied into: $webFolderName"