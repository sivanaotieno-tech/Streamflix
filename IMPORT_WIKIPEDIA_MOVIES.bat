@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
set "TOOLS=%ROOT%tools"
set "SCRAPER=%TOOLS%\Scrapy-Wiki-IMDb-Movie-Info"
set "EXPORT=%TEMP%\streamivio_wikipedia_movies.csv"

echo ==========================================
echo       Streamivio Catalogue Import
echo ==========================================
echo.
where python >nul 2>nul || (echo Python was not found. Install Python 3.10+ and try again.& exit /b 1)
where git >nul 2>nul || (echo Git was not found. Install Git for Windows and try again.& exit /b 1)

if not exist "%SCRAPER%\.git" (
  if not exist "%TOOLS%" mkdir "%TOOLS%"
  echo [1/4] Downloading the Wikipedia movie scraper...
  git clone https://github.com/RomiconEZ/Scrapy-Wiki-IMDb-Movie-Info.git "%SCRAPER%" || exit /b 1
) else (
  echo [1/4] Using existing scraper checkout...
)

echo [2/4] Installing Scrapy...
python -m pip install --user scrapy || exit /b 1

set "SCRAPY_CFG="
for /r "%SCRAPER%" %%F in (scrapy.cfg) do if not defined SCRAPY_CFG set "SCRAPY_CFG=%%~dpF"
if not defined SCRAPY_CFG (
  echo Could not locate scrapy.cfg inside the downloaded repository.
  echo Inspect the scraper folder and check its README before retrying.
  exit /b 1
)

echo [3/4] Running the scraper...
pushd "%SCRAPY_CFG%" || exit /b 1
python -m scrapy crawl movies_spider -O "%EXPORT%"
set "SCRAPE_RESULT=%ERRORLEVEL%"
popd
if not "%SCRAPE_RESULT%"=="0" (
  echo Scrapy failed. No Streamivio catalog files were changed.
  exit /b %SCRAPE_RESULT%
)

echo [4/4] Merging the export into Streamivio...
python "%ROOT%scripts\import_wikipedia_catalog.py" --input "%EXPORT%" --dry-run || exit /b 1
echo.
echo Preview complete. The live catalogue has NOT been changed yet.
echo To apply this import, run:
echo python scripts\import_wikipedia_catalog.py --input "%EXPORT%"
echo Then review git diff, run npm run build, and commit/push when ready.
echo.
pause
