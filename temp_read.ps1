$content = Get-Content 'E:\University\Graduted Project\Edu-platform\frontend-web\src\components\EnhancedVideoPlayer.tsx' -Raw
$lines = $content -split "`n"
for ($i = 738; $i -lt 765; $i++) {
    Write-Host "$($i+1): $($lines[$i])"
}
