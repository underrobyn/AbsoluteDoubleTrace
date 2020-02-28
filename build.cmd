@echo off
title Pushing...

mkdir build
mkdir dist

echo Trace Folder

set DirArray[0]=TraceChrome
set DirArray[1]=TraceFirefox
set DirArray[2]=TraceEdge

set ManifestArray[0]=chrome
set ManifestArray[1]=firefox
set ManifestArray[2]=edge


set "x=0"
set "y=0"

:CreateDirLoop
if defined DirArray[%x%] (
	call echo "Building for %%DirArray[%x]%%"
	call mkdir build\%%DirArray[%x%]%%
	call mkdir build\%%DirArray[%x%]%%\_locales
	call mkdir build\%%DirArray[%x%]%%\_locales\en
	call mkdir build\%%DirArray[%x%]%%\css
	call mkdir build\%%DirArray[%x%]%%\html
	call mkdir build\%%DirArray[%x%]%%\data
	call mkdir build\%%DirArray[%x%]%%\icons
	call mkdir build\%%DirArray[%x%]%%\js
	call mkdir build\%%DirArray[%x%]%%\js\background
	call mkdir build\%%DirArray[%x%]%%\js\common
	call mkdir build\%%DirArray[%x%]%%\js\contentscript
	call mkdir build\%%DirArray[%x%]%%\js\pages
	call mkdir build\%%DirArray[%x%]%%\js\pages\options
	call mkdir build\%%DirArray[%x%]%%\js\libraries
    set /a "x+=1"
    GOTO :CreateDirLoop
)

echo.


echo Copying Trace files...
:CopyTraceFiles
if defined ManifestArray[%y%] (
	call echo "Copying data for %%ManifestArray[%y]%%"
	call copy %CD%\MyTrace\_locales\en\*.json %CD%\build\%%DirArray[%y%]%%\_locales\en /y
	call copy %CD%\MyTrace\css\*.css %CD%\build\%%DirArray[%y%]%%\css /y
	call copy %CD%\MyTrace\html\*.html %CD%\build\%%DirArray[%y%]%%\html /y
	call copy %CD%\MyTrace\data\*.json %CD%\build\%%DirArray[%y%]%%\data /y
	call copy %CD%\MyTrace\icons\*.png %CD%\build\%%DirArray[%y%]%%\icons /y
	call copy %CD%\MyTrace\icons\*.gif %CD%\build\%%DirArray[%y%]%%\icons /y
	call copy %CD%\MyTrace\js\background\*.js %CD%\build\%%DirArray[%y%]%%\js\background /y
	call copy %CD%\MyTrace\js\common\*.js %CD%\build\%%DirArray[%y%]%%\js\common /y
	call copy %CD%\MyTrace\js\contentscript\*.js %CD%\build\%%DirArray[%y%]%%\js\contentscript /y
	call copy %CD%\MyTrace\js\pages\*.js %CD%\build\%%DirArray[%y%]%%\js\pages /y
	call copy %CD%\MyTrace\js\pages\options\*.js %CD%\build\%%DirArray[%y%]%%\js\pages\options /y
	call copy %CD%\MyTrace\js\libraries\*.js %CD%\build\%%DirArray[%y%]%%\js\libraries /y
	call copy %CD%\MyTrace\js\libraries\jquery-3.4.1.js %CD%\build\%%DirArray[%y%]%%\js\libraries\jquery.js /y
	call copy %CD%\MyTrace\manifest.%%ManifestArray[%y%]%%.json %CD%\build\%%DirArray[%y%]%%\manifest.json /y
	
	call del %CD%\build\%%DirArray[%y%]%%\js\libraries\jquery-3.4.1.js
	call del %CD%\build\%%DirArray[%y%]%%\js\libraries\jquery-3.4.1.min.js
	
	call echo Creating package for webstore for %ManifestArray[%y%]%
	call "C:\Program Files\7-Zip\7z.exe" a dist\Trace-%%ManifestArray[%y%]%%-UpdateID%random%%random%.zip %CD%\build\%%DirArray[%y%]%%\*
	
    set /a "y+=1"
    GOTO :CopyTraceFiles
)

echo.
pause