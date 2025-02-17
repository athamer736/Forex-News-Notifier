# Forex News Notifier

Simple Forex News Notifier webpage that scans across multiple pages and highlights key upcoming news events to be displayed in one website.
Currently scanning for news from ForexFactory and displays it here.

Currently Accessible at:

https://fxalert.co.uk:3000

Aiming to have it working on:

https://fxalert.co.uk/

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
- Payment Integration:
  - PayPal subscription support
  - Stripe payment processing
  - Secure payment handling
  - Automatic subscription management
- AI-Enhanced Market Analysis:
  - Automated market predictions for US Futures (NQ, ES, YM)
  - Forex pair analysis (GBPUSD, EURUSD, DXY)
  - Scenario-based predictions (better/worse than expected)
  - Volatility expectations and key price levels
  - Updated every 4 hours for high-impact USD/GBP events
  - Weekly refreshes to maintain accuracy

### Planned Features
- Email Notifications:
  - Customizable news selection
  - Flexible notification schedules (weekly/daily)
  - Local time-based notifications (e.g., 07:30 AM daily)
- Mobile Application with push notifications

## System Requirements

- Python 3.10 or higher
- Node.js v20.x (LTS) - Using package-lock.json for dependency management, but it's gitignored for solo development
- PowerShell 7.0 or higher (for enhanced SSL certificate management and service deployment)
- MySQL 8.0 or higher
- Redis (optional, falls back to memory storage if not available)
- Git (for OpenSSL access)
- Windows 10/11 with latest updates
- NSSM (Non-Sucking Service Manager) - automatically installed by setup scripts

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

### 7. Payment Integration Setup

1. PayPal Configuration:
   ```env
   # PayPal Configuration
   PAYPAL_CLIENT_ID=your_paypal_client_id
   PAYPAL_CLIENT_SECRET=your_paypal_client_secret
   PAYPAL_MODE=sandbox  # Change to 'live' for production
   ```

   To get PayPal credentials:
   - Go to https://developer.paypal.com/dashboard
   - Create a new app or select an existing one
   - Copy the Client ID and Secret
   - Add them to your `.env` file

2. Stripe Configuration:
   ```env
   # Stripe Configuration
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   ```

   To get Stripe credentials:
   - Go to https://dashboard.stripe.com/apikeys
   - Create a new API key pair
   - Set up a webhook endpoint in your Stripe dashboard
   - Add the keys to your `.env` file

3. Configure subscription plans:
   ```env
   # Subscription Configuration
   BASIC_PLAN_ID=your_basic_plan_id
   PREMIUM_PLAN_ID=your_premium_plan_id
   PRO_PLAN_ID=your_pro_plan_id
   ```4. The system will automatically:
   - Handle subscription creation and management
   - Process recurring payments
   - Manage subscription status updates
   - Handle payment webhooks
   - Send payment confirmation emails

### 8. OpenAI Configuration

1. Get an API key from OpenAI:
   - Go to https://platform.openai.com/account/api-keys
   - Create a new API key
   - Add it to your `.env` file as `OPENAI_API_KEY`

2. The system will automatically:
   - Generate analysis for high-impact USD/GBP events
   - Update predictions every 4 hours
   - Refresh existing analysis weekly

3. Analysis includes:
   - Impact on US Futures (NQ, ES, YM)
   - Forex pair predictions (GBPUSD, EURUSD, DXY)
   - Scenario analysis for market outcomes
   - Volatility expectations
   - Key price levels and trading timeframes

## SSL Certificate Requirements

The application requires proper SSL certificates for secure HTTPS communication:

- Valid SSL certificates stored in `C:\Certbot\live\fxalert.co.uk\`:
  - `fullchain.pem` - Full certificate chain
  - `privkey.pem` - Private key
- Certificates must be properly imported into Windows certificate store
- Required permissions for certificate access by NETWORK SERVICE account

## SSL Certificate Management

Certificates are managed using PowerShell scripts:
- `import-cert.ps1` - Imports certificates into Windows certificate store
- `bind-cert.ps1` - Configures SSL bindings for IIS and services
- `test-ssl.ps1` - Tests SSL endpoints
- `check-firewall.ps1` - Verifies firewall rules and SSL bindings

## Service Management

The application runs as two Windows services:

1. **FlaskBackend** - Python Flask backend service
   - Port: 5000
   - SSL enabled
   - Handles API requests and data processing

2. **NextJSFrontend** - Next.js frontend service
   - Port: 3000
   - SSL enabled
   - Serves the web interface

To manage services:
```powershell
# Start services
Start-Service FlaskBackend
Start-Service NextJSFrontend

# Stop services
Stop-Service FlaskBackend
Stop-Service NextJSFrontend

# Restart services
Restart-Service FlaskBackend
Restart-Service NextJSFrontend
```

## Recent Updates

### February 2025
- Added PowerShell 7.0 requirement for enhanced SSL certificate management
- Improved SSL certificate handling in Next.js frontend
- Enhanced error logging for SSL/TLS connections
- Added new SSL management scripts
- Updated service installation scripts for better reliability
- Added support for modern TLS 1.3 with strong cipher suites

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

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key  # Required for AI market analysis
```

### AI Market Analysis Setup

The system uses OpenAI's GPT-4 to provide detailed market analysis for high-impact USD and GBP events. To enable this feature:

1. Get an API key from OpenAI:
   - Go to https://platform.openai.com/account/api-keys
   - Create a new API key
   - Add it to your `.env` file as `OPENAI_API_KEY`

2. The system will automatically:
   - Generate analysis for high-impact USD/GBP events
   - Update predictions every 4 hours
   - Refresh existing analysis weekly

3. Analysis includes:
   - Impact on US Futures (NQ, ES, YM)
   - Forex pair predictions (GBPUSD, EURUSD, DXY)
   - Scenario analysis for market outcomes
   - Volatility expectations
   - Key price levels and trading timeframes

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

## Issues and Solutions

### SSL Configuration Issues

#### Problem: SSL Protocol Error with Waitress Server
When attempting to access the backend API endpoints (e.g., https://fxalert.co.uk:5000/cache/status), users encountered SSL protocol errors:
```
POST https://fxalert.co.uk:5000/timezone net::ERR_SSL_PROTOCOL_ERROR
```

The error occurred because Waitress server doesn't directly support SSL configuration through its `serve` function, resulting in the error:
```
ValueError: Unknown adjustment '_ssl_context'
```

#### Solution:
1. Replaced Waitress's SSL configuration with Cheroot's SSL adapter
2. Updated `run_waitress.py` to use `WSGIServer` from Cheroot with proper SSL configuration:
   ```python
   from cheroot.wsgi import Server as WSGIServer
   from cheroot.ssl.builtin import BuiltinSSLAdapter

   # Create SSL adapter with proper certificate chain
   ssl_adapter = BuiltinSSLAdapter(
       cert_file,
       key_file,
       certificate_chain=cert_file
   )
   
   # Configure server with SSL
   server = WSGIServer(
       ('0.0.0.0', 5000),
       app_with_logging,
       numthreads=4,
       request_queue_size=100,
       timeout=30
   )
   server.ssl_adapter = ssl_adapter
   ```
3. Ensured the Windows service was configured to use `run_waitress.py` instead of `app.py`
4. Properly configured SSL certificates and key paths

This solution enabled secure HTTPS communication between the frontend and backend services.


