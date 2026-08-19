$bytes = [System.IO.File]::ReadAllBytes("E:\University\Graduted Project\Edu-platform\frontend\src\components\EnhancedVideoPlayer.tsx")
$line = 757
$pos = 0
$currentLine = 1
$lineStart = 0
while ($pos -lt $bytes.Length -and $currentLine -lt $line) {
    if ($bytes[$pos] -eq 10) {
        $currentLine++
        $lineStart = $pos + 1
    }
    $pos++
}
Write-Host "Line $line starts at byte $lineStart"
Write-Host "Characters in line $line:"
for ($i = 0; $i -lt 50 -and ($lineStart + $i) -lt $bytes.Length; $i++) {
    $b = $bytes[$lineStart + $i]
    if ($b -eq 10) { break }
    $c = if ($b -ge 32 -and $b -le 126) { [char]$b } else { "?" }
    Write-Host "  byte $($i+1): $b -> $c"
}
