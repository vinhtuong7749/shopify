Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Shopify client secret'
$form.Size = New-Object System.Drawing.Size(520, 170)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.Topmost = $true

$label = New-Object System.Windows.Forms.Label
$label.Text = 'Paste the Dev Dashboard app Secret. It will be saved to Cloudflare only.'
$label.AutoSize = $true
$label.Location = New-Object System.Drawing.Point(16, 18)
$form.Controls.Add($label)

$textBox = New-Object System.Windows.Forms.TextBox
$textBox.Location = New-Object System.Drawing.Point(18, 48)
$textBox.Size = New-Object System.Drawing.Size(470, 24)
$textBox.PasswordChar = '*'
$form.Controls.Add($textBox)

$okButton = New-Object System.Windows.Forms.Button
$okButton.Text = 'Save secret'
$okButton.Location = New-Object System.Drawing.Point(292, 88)
$okButton.Size = New-Object System.Drawing.Size(96, 28)
$okButton.DialogResult = [System.Windows.Forms.DialogResult]::OK
$form.AcceptButton = $okButton
$form.Controls.Add($okButton)

$cancelButton = New-Object System.Windows.Forms.Button
$cancelButton.Text = 'Cancel'
$cancelButton.Location = New-Object System.Drawing.Point(398, 88)
$cancelButton.Size = New-Object System.Drawing.Size(90, 28)
$cancelButton.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
$form.CancelButton = $cancelButton
$form.Controls.Add($cancelButton)

$result = $form.ShowDialog()

if ($result -ne [System.Windows.Forms.DialogResult]::OK) {
  Write-Host 'Canceled.'
  exit 2
}

$secret = $textBox.Text.Trim()
if ([string]::IsNullOrWhiteSpace($secret)) {
  Write-Error 'Token is empty.'
  exit 3
}

$secret | npx.cmd wrangler@latest secret put SHOPIFY_CLIENT_SECRET
exit $LASTEXITCODE
