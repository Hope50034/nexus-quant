@echo off
cd /d "C:\Users\itintern\Desktop\Projects"
".\venv\Scripts\python.exe" manage.py run_scheduler %*
