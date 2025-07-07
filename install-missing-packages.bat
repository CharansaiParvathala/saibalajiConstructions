@echo off
echo Installing missing packages for the server...
cd server
npm install image-type pdf-lib multer fs-extra @types/multer
echo Installation complete!
pause 