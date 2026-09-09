# E2E smoke: course create -> media round-trip -> update without learner progress 500
# ASCII-only (PS 5.1)
$ErrorActionPreference = "Continue"
$base = "http://127.0.0.1:8000/api/v1"
$tmp = [System.IO.Path]::GetTempPath()

# 1) Login
$loginRaw = curl.exe -s -X POST "$base/auth/login" -H "Content-Type: application/x-www-form-urlencoded" --data "username=smoke_admin&password=SmokeTest%232026" --max-time 20
$login = ConvertFrom-Json $loginRaw
if (-not $login.access_token) { Write-Output "LOGIN FAILED: $loginRaw"; exit 1 }
$auth = "Authorization: Bearer $($login.access_token)"
Write-Output "1. LOGIN OK"

# 2) Create course with video_url + images + is_template
$courseBody = @{
  title = "Smoke Course - Media Roundtrip"
  title_vi = "Khoa hoc smoke"
  description = "E2E media persistence check"
  description_vi = "Kiem tra luu media"
  level = "beginner"
  is_template = $true
  is_published = $false
  lessons = @(
    @{
      lesson_id = "smoke-lesson-001"
      order = 1
      title = "Lesson 1"
      title_vi = "Bai 1"
      description = "d"
      duration_minutes = 5
      content = "Hello content"
      video_url = "https://cdn.example.com/smoke-video.mp4"
      images = @("https://cdn.example.com/smoke-img-1.png", "https://cdn.example.com/smoke-img-2.png")
    }
  )
} | ConvertTo-Json -Depth 5 -Compress
$bodyFile = Join-Path $tmp "smoke_course.json"
[System.IO.File]::WriteAllText($bodyFile, $courseBody)

$respRaw = curl.exe -s -w "`n%{http_code}" -X POST "$base/admin/courses" -H $auth -H "Content-Type: application/json" --data "@$bodyFile" --max-time 30
$lines = $respRaw -split "`n"
$code = $lines[-1]
$course = ConvertFrom-Json (($lines[0..($lines.Length-2)] -join ""))
$courseId = "$($course.course_id)"
Write-Output "2. CREATE COURSE -> $code | id=$courseId"
if ($code -ne "201") { Write-Output "COURSE CREATE FAILED: $($lines -join ' ')"; exit 1 }

# 3) Read back -> verify media round-trip (video_url + images lifted from JSONB)
$read = ConvertFrom-Json (curl.exe -s -H $auth --max-time 20 "$base/admin/courses/$courseId")
$lesson = $read.lessons | Select-Object -First 1
$videoOk = "$($lesson.video_url)" -eq "https://cdn.example.com/smoke-video.mp4"
$imgCount = @($lesson.images).Count
Write-Output "3. READ BACK: video_url round-trip=$videoOk | images count=$imgCount (expect 2) | is_template=$($read.is_template)"

# 4) Update the same course (per-lesson upsert path) -> 200, not 500
$updBody = @{
  title = "Smoke Course - Media Roundtrip v2"
  lessons = @(
    @{
      lesson_id = "smoke-lesson-001"
      order = 1
      title = "Lesson 1 (updated)"
      title_vi = "Bai 1 (sua)"
      description = "d"
      duration_minutes = 6
      content = "Hello content v2"
      video_url = "https://cdn.example.com/smoke-video-2.mp4"
      images = @("https://cdn.example.com/smoke-img-3.png")
    }
  )
} | ConvertTo-Json -Depth 5 -Compress
$updFile = Join-Path $tmp "smoke_course_upd.json"
[System.IO.File]::WriteAllText($updFile, $updBody)
$updRaw = curl.exe -s -w "`n%{http_code}" -X PUT "$base/admin/courses/$courseId" -H $auth -H "Content-Type: application/json" --data "@$updFile" --max-time 30
$updLines = $updRaw -split "`n"
$updCode = $updLines[-1]
$updCourse = ConvertFrom-Json (($updLines[0..($updLines.Length-2)] -join ""))
$updLesson = $updCourse.lessons | Select-Object -First 1
Write-Output "4. UPDATE COURSE -> $updCode (expect 200, no FK-500) | video after update=$($updLesson.video_url) | images=$(@($updLesson.images).Count)"

# 5) Cleanup
$del = (curl.exe -s -o NUL -w "%{http_code}" -X DELETE "$base/admin/courses/$courseId" -H $auth --max-time 15)
Write-Output "5. CLEANUP: delete course -> $del"

Write-Output "COURSE E2E DONE"
