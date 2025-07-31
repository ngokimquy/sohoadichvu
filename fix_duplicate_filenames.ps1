# Script để sửa duplicate filename issue
$filePath = "f:\lap trinh\sohoadichvu\nodeapp\src\routes\api.js"
$content = Get-Content $filePath -Raw

# Thay thế tất cả các pattern Date.now() cho các loại file khác nhau
$content = $content -replace 'const fileName = `\$\{tenantId\}_\$\{Date\.now\(\)\}_cccd_\$\{file\.originalname\}`;', 'const fileName = generateUniqueFileName(tenantId, ''cccd'', file.originalname);'
$content = $content -replace 'const fileName = `\$\{tenantId\}_\$\{Date\.now\(\)\}_cavet_\$\{file\.originalname\}`;', 'const fileName = generateUniqueFileName(tenantId, ''cavet'', file.originalname);'
$content = $content -replace 'const signatureFileName = `\$\{tenantId\}_\$\{Date\.now\(\)\}_signature\.png`;', 'const signatureFileName = generateUniqueFileName(tenantId, ''signature'', ''signature.png'');'
$content = $content -replace 'signatureFileName = `\$\{tenantId\}_\$\{Date\.now\(\)\}_ad_signature\.png`;', 'signatureFileName = generateUniqueFileName(tenantId, ''ad_signature'', ''signature.png'');'
$content = $content -replace 'signatureFileName = `\$\{tenantId\}_\$\{Date\.now\(\)\}_camera_signature\.png`;', 'signatureFileName = generateUniqueFileName(tenantId, ''camera_signature'', ''signature.png'');'
$content = $content -replace 'signatureFileName = `\$\{tenantId\}_\$\{Date\.now\(\)\}_pet_signature\.png`;', 'signatureFileName = generateUniqueFileName(tenantId, ''pet_signature'', ''signature.png'');'
$content = $content -replace 'signatureFileName = `\$\{tenantId\}_\$\{Date\.now\(\)\}_community_signature\.png`;', 'signatureFileName = generateUniqueFileName(tenantId, ''community_signature'', ''signature.png'');'
$content = $content -replace 'petImageFileName = `\$\{tenantId\}_\$\{Date\.now\(\)\}_pet_\$\{req\.file\.originalname\}`;', 'petImageFileName = generateUniqueFileName(tenantId, ''pet'', req.file.originalname);'

# Lưu file
$content | Set-Content $filePath -Encoding UTF8

Write-Host "Đã sửa xong file duplicate patterns!"
