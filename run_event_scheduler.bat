@echo off 
title Forex News Notifier - Event Scheduler 
color 0A 
set PYTHONPATH=C:\Projects\forex_news_notifier 
call venv\Scripts\activate 
python scripts\run_scheduler.py 
pause 
