from flask import Flask, render_template, jsonify
from flask_cors import CORS
from bs4 import BeautifulSoup
import cloudscraper

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/events")
def events():
    events = scrape_news()
    return jsonify(events)

def scrape_news():
    scraper = cloudscraper.create_scraper()
    url = "https://www.forexfactory.com/"

    response = scraper.get(url)
    print(response.status_code)

    response.raise_for_status()
    
    soup = BeautifulSoup(response.text, 'html.parser')

    rows = soup.find_all('tr', class_='calendar__row')

    events = []

    for row in rows:
        time_cell = row.find('td', class_='calendar__time')
        currency_cell = row.find('td', class_='calendar__currency')
        impact_cell = row.find('td', class_='calendar__impact')
        event_title_cell = row.find('span', class_='calendar__event-title')
        details_cell = row.find('td', class_='calendar__detail')
        forecast_cell = row.find('td', class_='calendar__forecast')
        actual_cell = row.find('td', class_='calendar__actual')
        previous_cell = row.find('td', class_='calendar__previous')
        
        if time_cell and currency_cell and impact_cell and event_title_cell and details_cell and forecast_cell and actual_cell and previous_cell:
            event = {
                'time': time_cell.get_text(strip=True),
                'currency': currency_cell.get_text(strip=True),
                'impact': impact_cell.get_text(strip=True),
                'event_title': event_title_cell.get_text(strip=True),
                'details': details_cell.get_text(strip=True),
                'forecast': forecast_cell.get_text(strip=True),
                'actual': actual_cell.get_text(strip=True),
                'previous': previous_cell.get_text(strip=True)
            }
            events.append(event)

    return events

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
    app.run(debug=True)
    
    
    
    
    