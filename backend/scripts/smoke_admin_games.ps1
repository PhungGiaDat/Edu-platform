# E2E smoke: login -> admin games flow
# ASCII-only (PS 5.1 reads non-BOM UTF-8 as ANSI and corrupts strings)
$ErrorActionPreference = "Continue"
$base = "http://127.0.0.1:8000/api/v1"
$tmp = [System.IO.Path]::GetTempPath()

# 1) Login (OAuth2 form)
$loginBody = "username=smoke_admin&password=SmokeTest%232026"
$loginRaw = curl.exe -s -X POST "$base/auth/login" -H "Content-Type: application/x-www-form-urlencoded" --data $loginBody --max-time 20
$login = ConvertFrom-Json $loginRaw
if (-not $login.access_token) { Write-Output "LOGIN FAILED: $loginRaw"; exit 1 }
$tok = $login.access_token
Write-Output "1. LOGIN OK"
$auth = "Authorization: Bearer $tok"

# 2) List topics (seeded 4)
$topicsRaw = curl.exe -s -H $auth --max-time 15 "$base/admin/games/topics"
$topics = ConvertFrom-Json $topicsRaw
if (@($topics).Count -eq 1 -and $null -eq $topics[0].slug -and $topics[0][0]) { $topics = $topics[0] }
$topicCount = @($topics).Count
$slugList = (@($topics) | ForEach-Object { "$($_.slug)" }) -join ","
Write-Output "2. TOPICS: $topicCount -> $slugList"

# 3) Create an admin game (catch_word, animals topic, mid preset values)
$animalsTopicId = $null
foreach ($t in @($topics)) {
  if ("$($t.slug)" -eq "animals") { $animalsTopicId = "$($t.id)"; break }
}
if (-not $animalsTopicId) { Write-Output "ANIMALS TOPIC NOT FOUND"; exit 1 }
$gameBody = @{
  title = "Smoke Catch Words - Animals"
  title_vi = "Bat chu roi - Smoke"
  game_type = "catch_word"
  topic_id = $animalsTopicId
  config = @{ fall_speed = 1.2; spawn_interval = 800 }
  is_published = $true
} | ConvertTo-Json -Compress
$gameBodyFile = Join-Path $tmp "smoke_game.json"
[System.IO.File]::WriteAllText($gameBodyFile, $gameBody)
$gameRespRaw = curl.exe -s -w "`n%{http_code}" -X POST "$base/admin/games" -H $auth -H "Content-Type: application/json" --data "@$gameBodyFile" --max-time 20
$gameLines = $gameRespRaw -split "`n"
$gameCode = $gameLines[-1]
$gameJson = ($gameLines[0..($gameLines.Length-2)] -join "")
$game = ConvertFrom-Json $gameJson
if ($null -eq $game.id -and $game[0]) { $game = $game[0] }
Write-Output "3. CREATE GAME -> $gameCode | id=$($game.id) slug=$($game.slug)"
if ($gameCode -ne "201") { Write-Output "GAME CREATE FAILED: $($gameLines -join ' ')"; exit 1 }
$gameId = "$($game.id)"

# 4) Duplicate title -> 409 (slug conflict)
$dupCode = (curl.exe -s -o NUL -w "%{http_code}" -X POST "$base/admin/games" -H $auth -H "Content-Type: application/json" --data "@$gameBodyFile" --max-time 20)
Write-Output "4. DUPLICATE CREATE -> $dupCode (expect 409)"

# 5) Add vocab item (201 new / 409 already present from previous run)
$vocabBody = @{ word = "elephant"; translation_vi = "con voi" } | ConvertTo-Json -Compress
$vocabBodyFile = Join-Path $tmp "smoke_vocab.json"
[System.IO.File]::WriteAllText($vocabBodyFile, $vocabBody)
$vRespRaw = curl.exe -s -w "`n%{http_code}" -X POST "$base/admin/games/topics/$animalsTopicId/vocab" -H $auth -H "Content-Type: application/json" --data "@$vocabBodyFile" --max-time 20
$vLines = $vRespRaw -split "`n"; $vCode = $vLines[-1]
Write-Output "5a. ADD VOCAB -> $vCode (201 new / 409 already present - both OK)"
$dupVocabCode = (curl.exe -s -o NUL -w "%{http_code}" -X POST "$base/admin/games/topics/$animalsTopicId/vocab" -H $auth -H "Content-Type: application/json" --data "@$vocabBodyFile" --max-time 20)
Write-Output "5b. DUPLICATE VOCAB -> $dupVocabCode (expect 409)"

# 6) Invalid config -> 422
$badBody = @{ title = "Bad cfg"; game_type = "catch_word"; topic_id = $animalsTopicId; config = @{ fall_speed = 99; spawn_interval = 10 } } | ConvertTo-Json -Compress
$badBodyFile = Join-Path $tmp "smoke_bad.json"
[System.IO.File]::WriteAllText($badBodyFile, $badBody)
$badCode = (curl.exe -s -o NUL -w "%{http_code}" -X POST "$base/admin/games" -H $auth -H "Content-Type: application/json" --data "@$badBodyFile" --max-time 20)
Write-Output "6. INVALID CONFIG -> $badCode (expect 422)"

# 7) Learner catalog includes the new game
$catalogRaw = curl.exe -s -H $auth --max-time 15 "$base/games/catalog"
$catalog = ConvertFrom-Json $catalogRaw
if ($catalog -is [System.Array]) { $catalog = $catalog[0] }
$catalogTopics = @($catalog.topics)
$catalogGames = @($catalog.games)
$found = $catalogGames | Where-Object { "$($_.id)" -eq "$gameId" }
Write-Output "7. CATALOG: topics=$($catalogTopics.Count) games=$($catalogGames.Count) | smoke game present: $($null -ne $found)"

# 8) Learner vocab prefers admin items (source=admin)
$vocabFeedRaw = curl.exe -s -H $auth --max-time 15 "$base/games/vocab?topic=animals&limit=8"
$vocabFeed = ConvertFrom-Json $vocabFeedRaw
$firstWord = ""
$firstSource = ""
if ($vocabFeed.items -and @($vocabFeed.items).Count -gt 0) { $firstWord = $vocabFeed.items[0].word; $firstSource = $vocabFeed.items[0].source }
Write-Output "8. VOCAB FEED: source=$($vocabFeed.source) | first word=$firstWord ($firstSource)"

# 9) Cleanup smoke game
$del1 = (curl.exe -s -o NUL -w "%{http_code}" -X DELETE "$base/admin/games/$gameId" -H $auth --max-time 15)
Write-Output "9. CLEANUP: delete game -> $del1"

Write-Output "E2E SMOKE DONE"
