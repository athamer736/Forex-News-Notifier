# Forex News Notifier

Simple Forex News Notifier webpage that scans across multiple pages and highlights key upcoming news events to be displayed in one website.
Currently scanning for news from ForexFactory and displays it here.

## Quick Setup (Windows)

1. **Set Up Directory**:
   ```powershell
   # Open PowerShell as Administrator and run:
   cd C:\Projects  # or your preferred location
   git clone <repository-url> forex_news_notifier
   cd forex_news_notifier
   ```

2. **Fix Permissions** (if needed):
   ```powershell
   # In PowerShell as Administrator:
   takeown /F "C:\Projects\forex_news_notifier" /R /D Y
   icacls "C:\Projects\forex_news_notifier" /grant YourUsername:F /T
   ```

3. **Configure Environment**:
   ```powershell
   # Copy environment file
   Copy-Item .env.example .env
   
   # Update .env with your database settings:
   # DB_USER=forex_user
   # DB_PASSWORD=your_password
   ```

4. **Start the Application**:
   - **Option 1 (Recommended)**: Double-click `start_server.bat`
     - This will automatically:
       - Set up the Python virtual environment
       - Install all Python dependencies
       - Install frontend dependencies
       - Start all server components in separate windows:
         - Flask Server (Blue window)
         - Event Scheduler (Green window)
         - Email Scheduler (Yellow window)
         - Frontend Server (Purple window)
       - Each window can be monitored independently
       - Close individual windows to stop specific components
       - All windows will stay open if one component crashes

   - **Option 2 (Manual Setup)**:
     ```powershell
     # Create and activate virtual environment
     python -m venv venv
     .\venv\Scripts\activate
     
     # Install dependencies
     python -m pip install --upgrade pip
     pip install -r requirements.txt
     
     # Install frontend dependencies
     cd frontend
     npm install
     cd ..
     
     # Start each component in separate terminals:
     # Terminal 1 - Flask Server
     python app.py
     
     # Terminal 2 - Event Scheduler
     python scripts\run_scheduler.py
     
     # Terminal 3 - Email Scheduler
     python scripts\email_scheduler.py
     
     # Terminal 4 - Frontend
     cd frontend && npm run dev
     ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Features

### Current Features
- Advanced filtering options:
  - Time Range selection
  - Currency filters
  - Impact Level filters
- Timezone selector with automatic detection
- Multiple view layouts (Grid/Table)
- Real-time updates
- Persistent user preferences
- Responsive design
- Rate limiting with Redis fallback
- Security features (SSL/TLS, CORS, etc.)
- Automatic hourly updates from ForexFactory
- Process monitoring and auto-restart
- Comprehensive logging system

### Planned Features
- Email Notifications:
  - Customizable news selection
  - Flexible notification schedules (weekly/daily)
  - Local time-based notifications (e.g., 07:30 AM daily)
- AI-Enhanced Features:
  - Brief AI-generated descriptions for news events
  - AI-powered outcome predictions
- Mobile Application with push notifications

## System Requirements

- Python 3.10 or higher
- Node.js 18.x or higher
- MySQL 8.0 or higher
- Redis (optional, falls back to memory storage if not available)

## Quick Start

The easiest way to start the system is using our server management script:

```bash
python scripts/start_server.py
```

This script will automatically:
1. Set up a Python virtual environment
2. Install Python dependencies
3. Install Node.js dependencies
4. Start the Flask backend server
5. Start the event scheduler
6. Start the Next.js frontend
7. Monitor all processes

## Manual Setup

If you prefer to set up components manually, follow these steps:

### 1. Clone the Repository

```bash
git clone <repository-url>
cd forex_news_notifier
```

### 2. Backend Setup

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Database Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update the database configuration in `.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=forex_news
DB_USER=your_user
DB_PASSWORD=your_password
```

3. Run the database setup script:
```bash
python scripts/setup_mysql.sql
```

### 4. Frontend Setup

```bash
cd frontend
npm install
```

### 5. Redis Setup (Optional)

If you want to use Redis for rate limiting:

1. Install Redis on your system
2. Update the Redis configuration in `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # If you set a password
```

### 6. Email Notification Setup

1. For Gmail:
   - Go to your Google Account settings
   - Enable 2-Step Verification if not already enabled
   - Generate an App Password:
     1. Go to Security settings
     2. Select 'App passwords' under 2-Step Verification
     3. Generate a new app password for 'Mail'

2. Update the SMTP configuration in `.env`:
```env
# SMTP Configuration
SMTP_PROVIDER=gmail  # Options: gmail, outlook, yahoo
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password  # Use the App Password generated above
```

3. Configure notification preferences:
```env
# Notification Settings
NOTIFICATION_FREQUENCY=daily  # Options: daily, weekly, custom
NOTIFICATION_TIME=07:30  # 24-hour format
NOTIFICATION_TIMEZONE=UTC  # Your preferred timezone
HIGH_IMPACT_ONLY=true  # Set to false to receive all events
```

## Running the Application

### Method 1: Using the Batch File (Recommended for Windows)

Simply double-click `start_server.bat` in the project root directory. The batch file will:
1. Check for required dependencies (Python, Node.js)
2. Set up the Python virtual environment
3. Install all required packages
4. Start each component in a separate colored window:
   - **Flask Server** (Blue window) - Main backend server
   - **Event Scheduler** (Green window) - Handles forex event updates
   - **Email Scheduler** (Yellow window) - Manages email notifications
   - **Frontend** (Purple window) - Next.js web interface

**Managing the Components:**
- Each component runs in its own window for easy monitoring
- View real-time logs and status messages in each window
- Close individual windows to stop specific components
- Windows stay open if errors occur, making debugging easier
- Main manager window can be closed without affecting other components

If you encounter any issues:
- Check each window for specific error messages
- Look in the `logs` directory for detailed logs
- Make sure you have Python 3.10+ and Node.js installed
- Ensure you're running from the project root directory
- Run the batch file as administrator if needed

### Method 2: Running Components Separately

If you prefer manual control or are not using Windows, open four separate terminal windows:

1. **Terminal 1** - Flask Backend:
```bash
python app.py
```

2. **Terminal 2** - Event Scheduler:
```bash
python scripts/run_scheduler.py
```

3. **Terminal 3** - Email Scheduler:
```bash
python scripts/email_scheduler.py
```

4. **Terminal 4** - Frontend:
```bash
cd frontend
npm run dev
```

## Configuration

### Environment Variables

Key configuration options in `.env`:

```env
# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=5000
DEBUG=False
SECRET_KEY=your-secret-key-here

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=forex_news
DB_USER=forex_user
DB_PASSWORD=your-password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# SMTP Configuration
SMTP_PROVIDER=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
```

## API Endpoints

- `GET /events` - Get forex events with filtering options
- `POST /timezone` - Set user timezone preference
- `GET /cache/status` - Check event cache status
- `POST /cache/refresh` - Force refresh of event cache

## Security Features

- SSL/TLS for database connections
- Rate limiting
- CORS protection
- Security headers
- Input validation
- SQL injection protection

## Monitoring

- Check `logs/server.log` for server manager logs
- Check `logs/scheduler.log` for scheduler logs

## Troubleshooting

1. **Database Connection Issues**
   - Verify MySQL is running
   - Check database credentials in `.env`
   - Ensure database and tables are created

2. **Redis Connection Issues**
   - System will automatically fall back to memory storage
   - Check Redis connection settings if you want to use Redis

3. **Frontend Not Loading**
   - Verify Node.js is installed
   - Check for npm install errors
   - Verify port 3000 is available

4. **Backend API Issues**
   - Check Flask server logs
   - Verify port 5000 is available
   - Check CORS settings if needed

5. **Email Notification Issues**
   - Verify SMTP credentials
   - Check if App Password is correct
   - Ensure proper email format
   - Check spam folder
   - Verify firewall/antivirus settings

## Contributing

While this is primarily a personal project, contributions are welcome. Please feel free to submit issues and pull requests.

## Contact

For bugs, features, or inquiries, please contact:
- Email: athamer736@gmail.com

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This is a personal solo project, not a business venture. Any bugs or feature requests are welcome through the contact information provided above.
