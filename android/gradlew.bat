@if "%DEBUG%"=="" @echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "JAVA_EXE=C:\Program Files\Android\Android Studio\jbr\bin\java.exe"
set "PATH=C:\Program Files\Android\Android Studio\jbr\bin;%PATH%"

@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "JAVA_EXE=C:\Program Files\Android\Android Studio\jbr\bin\java.exe"
set "PATH=C:\Program Files\Android\Android Studio\jbr\bin;%PATH%"

set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

for %%i in ("%APP_HOME%") do set APP_HOME=%%~fi

set DEFAULT_JVM_OPTS="-Xmx64m" "-Xms64m"

goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if %ERRORLEVEL% equ 0 goto execute

goto fail

:findJavaFromJavaHome
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "JAVA_EXE=C:\Program Files\Android\Android Studio\jbr\bin\java.exe"

if exist "%JAVA_EXE%" goto execute

echo. 1>&2
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME% 1>&2
goto fail

:execute
set CLASSPATH=
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %GRADLE_OPTS% "-Dorg.gradle.appname=%APP_BASE_NAME%" -classpath "%CLASSPATH%" -jar "%APP_HOME%\gradle\wrapper\gradle-wrapper.jar" %*

:end
if %ERRORLEVEL% equ 0 goto mainEnd

:fail
set EXIT_CODE=%ERRORLEVEL%
if %EXIT_CODE% equ 0 set EXIT_CODE=1
if not ""=="%GRADLE_EXIT_CONSOLE%" exit %EXIT_CODE%
exit /b %EXIT_CODE%

:mainEnd
if "%OS%"=="Windows_NT" endlocal

:omega
