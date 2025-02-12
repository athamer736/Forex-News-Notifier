@echo off 
title Forex News Notifier - Email Scheduler 
color 0E 
set PYTHONPATH=C:\Projects\forex_news_notifier 
call venv\Scripts\activate 
python scripts\email_scheduler.py 
pause 
