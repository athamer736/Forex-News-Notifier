# Email Verification URL Fix - IIS Configuration Update

## Issue
Email verification links are currently being sent with port 5000 in the URL (e.g., `https://fxalert.co.uk:5000/verify/TOKEN`), which is causing problems when users click the link.

## Solution
We need to update the IIS URL Rewrite rules to properly handle the `/verify` and `/unsubscribe` paths.

## Steps to Fix

1. Open PowerShell as Administrator
2. Run the updated IIS proxy setup script:
   ```
   cd C:\Projects\forex_news_notifier
   powershell -ExecutionPolicy Bypass -File .\setup-iis-proxy.ps1
   ```

Alternatively, if you prefer to manually update the configuration:

1. Open IIS Manager (Start menu > "Internet Information Services (IIS) Manager")
2. Navigate to the "fxalert.co.uk" site
3. Double-click on "URL Rewrite"
4. Update the rules to match the following configuration:

```xml
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="ReverseProxyToNextJS" stopProcessing="true">
                    <match url="(.*)" />
                    <conditions>
                        <add input="{HTTP_HOST}" pattern="^fxalert\.co\.uk$" />
                        <add input="{PATH_INFO}" pattern="^/api" negate="true" />
                        <add input="{PATH_INFO}" pattern="^/verify" negate="true" />
                        <add input="{PATH_INFO}" pattern="^/unsubscribe" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="http://localhost:3000/{R:1}" />
                </rule>
                <rule name="ReverseProxyToFlask" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://localhost:5000/{R:1}" />
                </rule>
                <rule name="ReverseProxyToFlaskVerify" stopProcessing="true">
                    <match url="^verify/(.*)" />
                    <action type="Rewrite" url="http://localhost:5000/verify/{R:1}" />
                </rule>
                <rule name="ReverseProxyToFlaskUnsubscribe" stopProcessing="true">
                    <match url="^unsubscribe/(.*)" />
                    <action type="Rewrite" url="http://localhost:5000/unsubscribe/{R:1}" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
```

5. Restart the IIS server: Run `iisreset` in an Administrator PowerShell window

## Verification
After applying these changes:
1. Try subscribing with a new email address
2. Verify that the verification link in the email does NOT contain the port (`:5000`)
3. Confirm that clicking on the verification link works correctly 