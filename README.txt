MadrasehYar Desktop (Windows 7 SP1 / 8 / 10 / 11, 32 & 64 bit)
================================================================
What it is: a standalone desktop app (Electron 22 - the last version that supports Windows 7).
 - No internet needed. No browser needed.
 - Data is stored in a local SQLite database file:
     %APPDATA%\MadrasehYar\madrasehyar.db   (+ automatic .bak copy)
 - Desktop layout: right-side menu + wide content area.
 - "Print / Save PDF" saves a real PDF file (Windows 7 has no built-in PDF printer).

HOW TO GET THE SINGLE SETUP FILE (MadrasehYar-Setup-1.0.0.exe)
 The .exe must be compiled once, on any PC with internet:
 A) Easy: install Node.js 18 LTS, double-click build.bat  -> dist\MadrasehYar-Setup-1.0.0.exe
 B) No install: upload this folder to a GitHub repo -> Actions -> "Build Windows installer" -> Run
    -> download the artifact (contains the setup .exe).
 Give that one .exe to any Windows 7+ PC and run it.

Moving old data from the web version: in the old app use the encrypted backup button,
then in this app use "restore from backup file".
Windows 7 needs Service Pack 1 and (recommended) the KB4474419 SHA-2 update.
