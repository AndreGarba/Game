# Salva o PNG da área de transferência (copiado no ChatGPT) com alfa preservado.
# Grave fora do projeto (-Pasta): o vigia do Vite cai com EBUSY se pegar o arquivo sendo escrito.
param([Parameter(Mandatory)][string]$Nome, [string]$Pasta = $PSScriptRoot)
Add-Type -AssemblyName System.Windows.Forms
$d = [System.Windows.Forms.Clipboard]::GetDataObject()
$png = $d.GetData('PNG')
if (-not $png) { throw 'sem PNG na área de transferência' }
$destino = Join-Path $Pasta $Nome
$f = [System.IO.File]::Create($destino)
$png.Position = 0
$png.CopyTo($f)
$f.Close()
"$destino $((Get-Item $destino).Length)"
