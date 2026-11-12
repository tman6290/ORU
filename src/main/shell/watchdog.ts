// Taskbar watchdog. ORU restores the taskbar on every exit path it can see
// (quit, Ctrl+C, terminal close, uncaught errors), but a hard kill (Task
// Manager "End task", electron-vite restarting the main process in dev, a
// crash in native code) runs no code at all. So once per run, before ORU first
// hides the taskbar, it starts this small hidden PowerShell process. It waits
// for ORU to exit; if the flag file is still there, ORU didn't restore, so the
// watchdog puts the taskbar back and deletes the flag. After a clean exit the
// flag is gone and it does nothing. No dependencies beyond Windows itself.

import { spawn } from "node:child_process";

let started = false;

function script(pid: number, flagPath: string): string {
  const flag = flagPath.replace(/'/g, "''");
  return `
$ErrorActionPreference = 'SilentlyContinue'
Wait-Process -Id ${pid}
Start-Sleep -Milliseconds 400
$flag = '${flag}'
if (-not (Test-Path -LiteralPath $flag)) { exit 0 }
$state = [int]((Get-Content -Raw -LiteralPath $flag | ConvertFrom-Json).taskbarState)
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class OruTaskbar {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int l, t, r, b; }
  [StructLayout(LayoutKind.Sequential)] public struct APPBARDATA {
    public int cbSize; public IntPtr hWnd; public uint uCallbackMessage; public uint uEdge; public RECT rc; public IntPtr lParam;
  }
  [DllImport("shell32.dll")] public static extern UIntPtr SHAppBarMessage(uint msg, ref APPBARDATA data);
  public static void Set(int state) {
    var d = new APPBARDATA(); d.cbSize = Marshal.SizeOf(d); d.lParam = (IntPtr)state;
    SHAppBarMessage(10, ref d);
  }
}
"@
[OruTaskbar]::Set($state)
Remove-Item -LiteralPath $flag -Force
`;
}

/** Start the watchdog once per run (Windows only). Safe to call repeatedly. */
export function startTaskbarWatchdog(flagPath: string): void {
  if (started || process.platform !== "win32") return;
  started = true;
  try {
    const encoded = Buffer.from(script(process.pid, flagPath), "utf16le").toString("base64");
    // Launched through `cmd /c start /b`, and cmd exits at once, so PowerShell
    // ends up outside ORU's process tree: "End task" or `taskkill /T` on ORU
    // doesn't take the watchdog with it. Not Node's `detached`: a detached
    // PowerShell has no console and exits without running the script.
    const child = spawn(
      "cmd.exe",
      [
        "/d",
        "/c",
        "start",
        '""',
        "/b",
        "powershell.exe",
        "-NoProfile",
        "-NonInteractive",
        "-WindowStyle",
        "Hidden",
        "-EncodedCommand",
        encoded,
      ],
      { stdio: "ignore", windowsHide: true, windowsVerbatimArguments: true },
    );
    child.on("error", (err) => console.error("[oru] taskbar watchdog failed to start", err));
    child.unref();
  } catch (err) {
    console.error("[oru] taskbar watchdog failed to start", err);
  }
}
