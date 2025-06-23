import { Component, OnInit } from '@angular/core';
import { WeatherService } from '../services/weather.service';
import weatherCodes from '../../assets/weather-codes.json';
import iconMapping from '../../assets/icon-mapping.json';
import {DatePipe, NgForOf, NgIf, NgOptimizedImage} from "@angular/common";
import Chart from 'chart.js/auto';
import weatherGifs from '../../assets/weather-gifs.json';
import {forkJoin} from "rxjs";

@Component({
  selector: 'app-weather',
  standalone: true,
  imports: [
    NgIf,
    NgForOf,
    NgOptimizedImage,
    DatePipe,
  ],
  templateUrl: './weather.component.html',
  styleUrls: ['./weather.component.css']
})
export class WeatherComponent implements OnInit{
  weatherData: any;
  hourlyData: any[] = [];
  dailyData: any;
  latitude = 48.2797;  // Breitengrad von Leonding
  longitude = 14.2533; // Längengrad von Leonding
  errorMessage?: string;
  monthlyWeatherSummary: { sunny: number; cloudy: number; rainy: number } = { sunny: 0, cloudy: 0, rainy: 0 };
  weatherCodes: { [key: string]: string } = weatherCodes;
  weatherGifs: { [key: string]: string } = weatherGifs;
  iconMapping: { [key: string]: string } = iconMapping;
  currentMonth: string = '';
  currentWeatherCondition?: number;
  currentTemp?: number;
  currentConditionDescription?: string;
  currentWind?: number;
  currentHumidity?: number;
  sunriseTime?: string;
  sunsetTime?: string;
  daylightDuration?: string;
  today: Date = new Date();


  constructor(private weatherService: WeatherService) { }

  ngOnInit(): void {
    this.getWeather();
    this.getMonthlyWeather();
    this.setCurrentMonth();
    this.getSunriseSunset();
  }

  getWeather(): void {
    this.weatherService.getWeatherForecast(this.latitude, this.longitude)
      .subscribe(
        data => {
          this.weatherData = data;
          console.log('Daten von der Wetter-API:', this.weatherData);
          this.processData();
        },
        error => {
          this.errorMessage = 'Fehler beim Abrufen der Wetterdaten';
          console.error(this.errorMessage, error);
        }
      );
  }

  processData(): void {
    const now = new Date();
    const currentHour = now.getHours();

    // Aktuelle Wetterdaten setzen
    if (this.weatherData.current_weather) {
      this.currentTemp = this.weatherData.current_weather.temperature;
      this.currentConditionDescription = this.getWeatherDescription(this.weatherData.current_weather.weathercode);
      this.currentWind = this.weatherData.current_weather.windspeed;

      this.currentWeatherCondition = this.weatherData.current_weather.weathercode;

      // Relative Luftfeuchtigkeit für die aktuelle Stunde
      const currentHourIndex = this.weatherData.hourly.time.findIndex((t: string) => {
        const date = new Date(t);
        return date.getHours() === currentHour && date.getDate() === now.getDate();
      });

      if (currentHourIndex >= 0 && this.weatherData.hourly.relative_humidity_2m) {
        this.currentHumidity = this.weatherData.hourly.relative_humidity_2m[currentHourIndex];
      } else {
        console.warn("Keine Luftfeuchtigkeitsdaten für die aktuelle Stunde verfügbar.");
        this.currentHumidity = undefined; // Optional: Standardwert setzen
      }
    }

    // Stündliche Wetterdaten filtern
    this.hourlyData = this.weatherData.hourly.time
      .map((time: string, index: number) => {
        return {
          time: new Date(time),
          temperature: this.weatherData.hourly.temperature_2m[index],
          weathercode: this.weatherData.hourly.weathercode[index]
        };
      })
      .filter((item: any) => {
        return item.time.getDate() === now.getDate() &&
          item.time.getHours() >= currentHour &&
          item.time.getHours() <= currentHour + 4;
      });

    console.log("Gefilterte stündliche Daten:", this.hourlyData);

    // Tägliche Wetterdaten für die nächsten 5 Tage
    this.dailyData = {
      time: this.weatherData.daily.time.slice(0, 5),
      temperature_2m_max: this.weatherData.daily.temperature_2m_max.slice(0, 5),
      temperature_2m_min: this.weatherData.daily.temperature_2m_min.slice(0, 5),
      weathercode: this.weatherData.daily.weathercode.slice(0, 5)
    };

    console.log("Tägliche Wetterdaten für die nächsten 5 Tage:", this.dailyData);
    this.renderDailyWeatherChart();
  }



  getWeatherDescription(code: number): string {
    return this.weatherCodes[code.toString()] || 'Unbekanntes Wetter';
  }

  getWeatherIcon(code: number): string {
    return this.iconMapping[code.toString()] || 'fas fa-question';
  }

  getMonthlyWeather(): void {
    const today = new Date();
    let startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    let endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const maxApiDate = new Date('2025-01-19');
    if (endDate > maxApiDate) {
      endDate = maxApiDate;
    }

    if (today.getFullYear() > 2025 || (today.getFullYear() === 2025 && today.getMonth() > 0)) {
      console.warn("Keine Daten für die Zukunft verfügbar");
      return;
    }

    const requests = [];
    let currentStartDate = new Date(startDate);

    while (currentStartDate <= endDate) {
      const blockStartDate = currentStartDate.toISOString().split('T')[0];

      let daysToAdd = Math.min(15, Math.floor((endDate.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24)));
      const blockEndDate = new Date(currentStartDate);
      blockEndDate.setDate(currentStartDate.getDate() + daysToAdd);

      const blockEndDateString = blockEndDate.toISOString().split('T')[0];
      console.log(`Block: ${blockStartDate} bis ${blockEndDateString}`);

      requests.push(this.weatherService.getMonthlyWeatherForecast(this.latitude, this.longitude, blockStartDate, blockEndDateString));

      currentStartDate = new Date(blockEndDate);
      currentStartDate.setDate(currentStartDate.getDate() + 1);
    }

    forkJoin(requests).subscribe(
      (responses) => {
        const combinedWeatherCodes = responses.flatMap((response: any) => response?.daily?.weathercode || []);

        if (!combinedWeatherCodes.length) {
          console.warn('Keine Wetterdaten für den angegebenen Zeitraum verfügbar.');
          return;
        }

        console.log('Kombinierte Wettercodes:', combinedWeatherCodes);

        this.aggregateMonthlyWeather(combinedWeatherCodes);
        this.renderMonthlyWeatherChart();
      },
      (error) => {
        this.errorMessage = 'Fehler beim Abrufen der Monatswetterdaten: ' + error.message;
        console.error(this.errorMessage, error);
      }
    );
  }


  aggregateMonthlyWeather(weatherCodes: number[]): void{
    this.monthlyWeatherSummary = { sunny: 0, cloudy: 0, rainy: 0 };

    weatherCodes.forEach((code) => {
      if ([0, 1].includes(code)) this.monthlyWeatherSummary.sunny++;
      else if ([2, 3].includes(code)) this.monthlyWeatherSummary.cloudy++;
      else if ([61, 63, 65].includes(code)) this.monthlyWeatherSummary.rainy++;
    });

    console.log('Wetterzusammenfassung für den Monat:', this.monthlyWeatherSummary);
  }

  renderMonthlyWeatherChart(): void {
    const ctx = document.getElementById('monthlyWeatherChart') as HTMLCanvasElement;

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Sonnig', 'Bewölkt', 'Regnerisch'],
        datasets: [
          {
            data: [
              this.monthlyWeatherSummary.sunny,
              this.monthlyWeatherSummary.cloudy,
              this.monthlyWeatherSummary.rainy
            ],
            backgroundColor: ['#FFD700', '#C0C0C0', '#87CEEB'] // Farben für sonnig, bewölkt, regnerisch
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true
          }
        },
        responsive: false,
        maintainAspectRatio: true
      }
    });
  }

  renderDailyWeatherChart(): void {
    const ctx = document.getElementById('dailyWeatherChart') as HTMLCanvasElement;

    ctx.height = 400; // Höhe in Pixel
    ctx.width = ctx.parentElement?.clientWidth || 800;

    if (!ctx) {
      console.error("Canvas für den täglichen Wetterverlauf nicht gefunden");
      return;
    }

    if (
      !this.dailyData ||
      !this.dailyData.time ||
      !this.dailyData.temperature_2m_max ||
      !this.dailyData.temperature_2m_min ||
      this.dailyData.time.length !== this.dailyData.temperature_2m_max.length ||
      this.dailyData.time.length !== this.dailyData.temperature_2m_min.length
    ) {
      console.error("Ungültige Daten für den täglichen Wetterverlauf", this.dailyData);
      return;
    }

    console.log("Daily Data Time:", this.dailyData.time);
    console.log("Max Temp:", this.dailyData.temperature_2m_max);
    console.log("Min Temp:", this.dailyData.temperature_2m_min);

    // Canvas-Größe zurücksetzen
    ctx.width = ctx.width;

    // Sicherstellen, dass vorherige Chart-Instanz gelöscht wird
    Chart.getChart(ctx)?.destroy();

    // Neuen Chart erstellen
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.dailyData.time.map((t: string) =>
          new Date(t).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric' })
        ),
        datasets: [
          {
            label: 'Max Temperatur (°C)',
            data: this.dailyData.temperature_2m_max,
            borderColor: '#ff7e5f',
            backgroundColor: 'rgba(255, 126, 95, 0.2)',
            tension: 0.4, // Glättung der Linie
            fill: true,
          },
          {
            label: 'Min Temperatur (°C)',
            data: this.dailyData.temperature_2m_min,
            borderColor: '#6baed6',
            backgroundColor: 'rgba(107, 174, 214, 0.2)',
            tension: 0.4, // Glättung der Linie
            fill: true,
          },
        ],
      },
      options: {
        responsive: false,
        maintainAspectRatio: true,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Datum',
            },
          },
          y: {
            title: {
              display: true,
              text: 'Temperatur (°C)',
            },
            beginAtZero: false,
          },
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
          },
        },
      },
    });
  }


  setCurrentMonth(): void {
    const today = new Date();
    const monthNames = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    this.currentMonth = monthNames[today.getMonth()]; // Aktueller Monat
  }

  getWeatherGif(condition: string): string {
    return this.weatherGifs[condition] || this.weatherGifs['unknown'];
  }

  getWeatherCondition(code: number): string {
    if ([0, 1].includes(code)) return 'sunny';
    if ([2, 3].includes(code)) return 'cloudy';
    if ([61, 63, 65].includes(code)) return 'rainy';
    if ([66, 67, 71, 73, 75].includes(code)) return 'snowy'; // Schnee-Codes
    return 'unknown';
  }

  getSunriseSunset(): void {
    this.weatherService.getSunriseSunset(this.latitude, this.longitude).subscribe(
      data => {
        const sunrise = new Date(data.daily.sunrise[0]);
        const sunset = new Date(data.daily.sunset[0]);

        this.sunriseTime = sunrise.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        this.sunsetTime = sunset.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

        const duration = Math.floor((sunset.getTime() - sunrise.getTime()) / (1000 * 60));
        this.daylightDuration = `${Math.floor(duration / 60)} Std. ${duration % 60} Min.`;
      },
      error => {
        console.error('Fehler beim Abrufen von Sonnenaufgang und -untergang', error);
      }
    );
  }
}
