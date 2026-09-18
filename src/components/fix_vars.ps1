Get-ChildItem -Path $PSScriptRoot -Filter *.jsx | ForEach-Object {
  $c = [System.IO.File]::ReadAllText($_.FullName)
  $c = $c -replace 'var\(--accent-emerald\)',  'var(--green)'
  $c = $c -replace 'var\(--accent-rose\)',     'var(--red)'
  $c = $c -replace 'var\(--accent-amber\)',    'var(--amber)'
  $c = $c -replace 'var\(--accent-cyan\)',     'var(--accent)'
  $c = $c -replace 'var\(--brand-primary\)',   'var(--accent)'
  $c = $c -replace 'var\(--text-muted\)',      'var(--text-2)'
  $c = $c -replace 'var\(--text-dim\)',        'var(--text-3)'
  $c = $c -replace 'var\(--bg-surface\)',      'var(--surface)'
  $c = $c -replace 'var\(--bg-card\)',         'var(--surface-2)'
  $c = $c -replace 'var\(--border-subtle\)',   'var(--border)'
  $c = $c -replace 'var\(--font-mono\)',       'var(--mono)'
  $c = $c -replace 'var\(--radius-xl\)',       'var(--r-xl)'
  $c = $c -replace 'var\(--radius-lg\)',       'var(--r-lg)'
  $c = $c -replace 'var\(--radius-md\)',       'var(--r-md)'
  $c = $c -replace 'var\(--radius-sm\)',       'var(--r-sm)'
  $c = $c -replace 'var\(--radius-full\)',     'var(--r-pill)'
  [System.IO.File]::WriteAllText($_.FullName, $c)
  Write-Host "Patched: $($_.Name)"
}
Write-Host "Done."
