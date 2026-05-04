@echo off
echo Abriendo puerto 3000 en Windows Firewall...
netsh advfirewall firewall add rule name="BabyShower-Puerto-3000" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="BabyShower-Puerto-3000-UDP" dir=in action=allow protocol=UDP localport=3000
echo.
echo Listo! Puerto 3000 abierto en el firewall.
pause
