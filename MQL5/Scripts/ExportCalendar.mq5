//+------------------------------------------------------------------+
//|                                                    ExportCalendar.mq5 |
//|                                  Copyright 2024, Your Name            |
//|                                             https://www.yoursite.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2024"
#property link      "https://www.yoursite.com"
#property version   "1.00"
#property script_show_inputs

#include <Tools\DateTime.mqh>

input datetime StartDate = D'2024.01.01 00:00';  // Start Date
input datetime EndDate = D'2024.12.31 23:59';    // End Date
input string OutputFile = "calendar_events.json"; // Output File Name

//+------------------------------------------------------------------+
//| Check and setup WebRequest                                         |
//+------------------------------------------------------------------+
bool SetupWebRequest()
{
   if(!TerminalInfoInteger(TERMINAL_DLLS_ALLOWED))
   {
      MessageBox("Please allow DLL imports in MT5:\n" +
                "1. Tools -> Options -> Expert Advisors\n" +
                "2. Check 'Allow DLL imports'\n" +
                "3. Click OK and restart MT5", 
                "Setup Required", MB_OK | MB_ICONINFORMATION);
      return false;
   }
   
   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED))
   {
      MessageBox("Please allow algorithmic trading in MT5:\n" +
                "1. Tools -> Options -> Expert Advisors\n" +
                "2. Check 'Allow automated trading'\n" +
                "3. Click OK and restart MT5", 
                "Setup Required", MB_OK | MB_ICONINFORMATION);
      return false;
   }
   
   // Test WebRequest with a preliminary request
   string cookie = NULL, headers;
   char post[], result[];
   string result_headers;
   
   int res = WebRequest(
      "GET",
      "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
      cookie,
      NULL,
      1000,
      post,
      0,
      result,
      result_headers
   );
   
   if(res == -1)
   {
      int error = GetLastError();
      if(error == 4014)
      {
         MessageBox(
            "Please allow WebRequest for the following URL in MT5:\n" +
            "1. Tools -> Options -> Expert Advisors\n" +
            "2. Check 'Allow WebRequest for listed URL:'\n" +
            "3. Add the URL: https://nfs.faireconomy.media\n" +
            "4. Click OK and restart the script",
            "WebRequest Setup Required", 
            MB_OK | MB_ICONINFORMATION
         );
         return false;
      }
      else
      {
         MessageBox(
            "Error testing WebRequest. Error code: " + IntegerToString(error),
            "Error",
            MB_OK | MB_ICONERROR
         );
         return false;
      }
   }
   
   return true;
}

//+------------------------------------------------------------------+
//| Fetch data from a URL and write to file                           |
//+------------------------------------------------------------------+
bool FetchAndWrite(string url, int file_handle, bool &first_write)
{
   string cookie = NULL, headers;
   char post[], result[];
   string result_headers;
   
   Print("Fetching data from: ", url);
   
   // Fetch calendar data
   int res = WebRequest(
      "GET",               // Method
      url,                 // URL
      cookie,             // Cookie
      NULL,               // Referer
      5000,               // Timeout
      post,               // POST data
      0,                  // POST data size
      result,             // Result
      result_headers      // Response headers
   );
   
   if(res == -1)
   {
      int error = GetLastError();
      Print("Error in WebRequest for URL ", url, ". Error code: ", error);
      if(error == 4014)
      {
         MessageBox(
            "Please ensure that URL '" + url + "' is allowed in MT5:\n" +
            "1. Tools -> Options -> Expert Advisors\n" +
            "2. Check 'Allow WebRequest for listed URL:'\n" +
            "3. Add the URL: https://nfs.faireconomy.media\n" +
            "4. Click OK and restart the script",
            "WebRequest Error",
            MB_OK | MB_ICONERROR
         );
      }
      return false;
   }
   
   // Convert result to string
   string json = CharArrayToString(result);
   
   // Remove array brackets if not first write
   if(!first_write)
   {
      json = StringSubstr(json, 1, StringLen(json) - 2);  // Remove [ and ]
      FileWrite(file_handle, ",");  // Add comma separator
   }
   else
      first_write = false;
   
   // Write the result to file
   FileWrite(file_handle, json);
   Print("Successfully wrote data from: ", url);
   return true;
}

//+------------------------------------------------------------------+
//| Script program start function                                      |
//+------------------------------------------------------------------+
void OnStart()
{
   // Get terminal data path and construct full file path
   string terminal_path = TerminalInfoString(TERMINAL_DATA_PATH);
   string full_path = terminal_path + "\\MQL5\\Files\\" + OutputFile;
   Print("File will be saved to: " + full_path);
   
   // Check and setup WebRequest
   if(!SetupWebRequest())
      return;
   
   Print("Starting calendar export...");
   
   // Create file handle
   int file_handle = FileOpen(OutputFile, FILE_WRITE|FILE_TXT);
   if(file_handle == INVALID_HANDLE)
   {
      Print("Failed to open file: ", OutputFile);
      return;
   }
   
   Print("Created output file: ", full_path);
   
   // Write JSON array start
   FileWrite(file_handle, "[");
   
   // URLs for different time periods
   string urls[] = {
      "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
      "https://nfs.faireconomy.media/ff_calendar_nextweek.json",
      "https://nfs.faireconomy.media/ff_calendar_lastweek.json"
   };
   
   bool first_write = true;
   bool success = true;
   
   // Fetch and write data from each URL
   for(int i = 0; i < ArraySize(urls); i++)
   {
      if(!FetchAndWrite(urls[i], file_handle, first_write))
      {
         success = false;
         break;
      }
   }
   
   // Write JSON array end
   FileWrite(file_handle, "]");
   
   // Close file
   FileClose(file_handle);
   
   if(success)
      Print("Calendar events successfully exported to: ", OutputFile);
   else
      Print("Error occurred while exporting calendar events");
} 