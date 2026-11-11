# Opens Claude Code (in Claude Desktop) on this repo with a phase prompt typed in.
# Usage:  .\prompts\start-phase.ps1 1        (phase number 1-10)
#         .\prompts\start-phase.ps1 resume
#         .\prompts\start-phase.ps1 bugfix
# You review the prompt in Claude Code and press send.
param([Parameter(Mandatory = $true)][string]$Phase)

$files = @{
  '1' = '01-baseline.md'; '2' = '02-shell.md'; '3' = '03-face.md'
  '4' = '04-voice-out.md'; '5' = '05-voice-in.md'; '6' = '06-brain.md'
  '7' = '07-skills.md'; '8' = '08-claude-handoff.md'; '9' = '09-memory.md'
  '10' = '10-polish-ship.md'; 'resume' = '90-resume.md'; 'bugfix' = '91-bugfix.md'
}

if (-not $files.ContainsKey($Phase)) {
  Write-Host "Unknown phase '$Phase'. Use 1-10, resume, or bugfix." -ForegroundColor Red
  exit 1
}

$file = $files[$Phase]
$repo = Split-Path -Parent $PSScriptRoot
$prompt = "Read prompts/$file and carry it out. Plan first and wait for my approval before you edit files."
$q = [uri]::EscapeDataString($prompt)
$folder = [uri]::EscapeDataString($repo)

Start-Process "claude://code/new?q=$q&folder=$folder"
Write-Host "Opened Claude Code with prompts/$file loaded. Review it and press send."
