import { Component, OnDestroy, OnInit } from '@angular/core';
import { SensorBoxDTO } from "../model/SensorBoxDTO";
import { SensorboxService } from "../services/sensorbox.service";
import { NgClass, NgForOf, NgIf, NgOptimizedImage, CommonModule } from "@angular/common";
import Chart from "chart.js/auto";
import { FormsModule } from "@angular/forms";

@Component({
  selector: 'app-sensorbox-overview',
  standalone: true,
  imports: [
    NgForOf,
    NgIf,
    NgOptimizedImage,
    NgClass,
    FormsModule,
    CommonModule
  ],
  templateUrl: './sensorbox-overview.component.html',
  styleUrl: './sensorbox-overview.component.css'
})
export class SensorboxOverviewComponent implements OnInit, OnDestroy {
  public activeTab: string = 'temperature';
  public floors: string[] = [];
  public filteredFloors: string[] = [];
  public rooms: string[] = [];
  public currentSensorboxValues: Map<string, SensorBoxDTO> = new Map();

  private intervalId: any;
  private openFloors: Set<string> = new Set();
  private openRooms: Set<string> = new Set();
  private doughnutChart: Chart | null = null;

  private lastGreenRooms = 0;
  private lastRedRooms = 0;
  private lastYellowRooms = 0;

  public isSettingsOpen = false;
  public settings = {
    co2: { greenMax: 800, yellowMax: 1200 },
    temperature: { greenMin: 20, greenMax: 22 },
    humidity: { greenMin: 40, greenMax: 60 }
  };

  public selectedFilter: string = 'all';

  constructor(private sbs: SensorboxService) { }

  applyFilter(): void {
    console.log('Filter angewendet:', this.selectedFilter);

    if (this.selectedFilter === 'all') {
      this.filteredFloors = [...this.floors];
    } else {
      this.filteredFloors = this.floors.filter(
        (floor) => this.getFilteredRooms(floor).length > 0
      );
    }
    this.filteredFloors.forEach(floor => this.openFloors.add(floor));
  }

  getFilteredRooms(floor: string): string[] {
    const allRooms = this.rooms.filter((room) => this.currentSensorboxValues.get(room)?.floor === floor);

    switch (this.selectedFilter) {
      case 'optimal':
        return allRooms.filter((room) => this.isRoomOptimal(room));
      case 'acceptable':
        return allRooms.filter((room) => this.isRoomAcceptable(room));
      case 'critical':
        return allRooms.filter((room) => this.isRoomCritical(room));
      default: // 'all'
        return allRooms;
    }
  }

  getFilteredRoomsForAllFloors(): string[] {
    if (this.selectedFilter === 'all') {
      return [];
    }

    return this.rooms.filter((room) => {
      switch (this.selectedFilter) {
        case 'optimal':
          return this.isRoomOptimal(room);
        case 'acceptable':
          return this.isRoomAcceptable(room);
        case 'critical':
          return this.isRoomCritical(room);
        default:
          return false;
      }
    });
  }

  // check window status
  isWindowOpen(room: string): boolean {
    const data = this.currentSensorboxValues.get(room);

    if (!data) return false;

    const { co2, temperature, humidity } = data;

    const isCo2Low = co2 !== undefined && co2 < 400;
    const isTemperatureLow = temperature !== undefined && temperature < 15;
    const isHumidityLow = humidity !== undefined && humidity < 30;

    return (isCo2Low && isTemperatureLow) || (isCo2Low && isHumidityLow) || (isTemperatureLow && isHumidityLow);
  }

  toggleFloor(floor: string): void {
    this.openFloors.has(floor) ? this.openFloors.delete(floor) : this.openFloors.add(floor);
  }

  isFloorOpen(floor: string): boolean {
    return this.openFloors.has(floor);
  }

  toggleRoom(room: string): void {
    this.openRooms.has(room) ? this.openRooms.delete(room) : this.openRooms.add(room);
  }

  isRoomOpen(room: string): boolean {
    return this.openRooms.has(room);
  }

  getRoomsForFloor(floor: string): string[] {
    return this.rooms.filter((room) => this.currentSensorboxValues.get(room)?.floor === floor);
  }

  getRoomCount(floor: string): number {
    return this.getRoomsForFloor(floor).length;
  }

  getGreenRoomCount(floor: string): number {
    return this.getRoomsForFloor(floor).filter((room) => this.isRoomOptimal(room)).length;
  }

  getYellowRoomCount(floor: string): number {
    return this.getRoomsForFloor(floor).filter((room) => this.isRoomAcceptable(room)).length;
  }

  getRedRoomCount(floor: string): number {
    return this.getRoomsForFloor(floor).filter((room) => this.isRoomCritical(room)).length;
  }

  getTemperatureIcon(temperature?: number): string {
    return temperature && temperature < 18
      ? 'assets/images/temperature-cold.png'
      : 'assets/images/temperature-hot.png';
  }

  getHumidityIcon(humidity?: number): string | null {
    if (humidity === undefined || humidity === null) return null;
    if (humidity < 30) return 'assets/images/humidity-low.png';
    if (humidity <= 60) return 'assets/images/humidity-medium.png';
    if (humidity > 60) return 'assets/images/humidity-high.png';
    return null;
  }

  // Verbesserte getCo2Class-Funktion
  getCo2Class(co2?: number): string {
    if (co2 === undefined || co2 === null) return '';
    if (co2 < this.settings.co2.greenMax) return 'low'; // Verwendet greenMax
    if (co2 <= this.settings.co2.yellowMax) return 'medium'; // Verwendet yellowMax
    return 'high';
  }

  getNoiseClass(noise?: number): string {
    if (noise === undefined || noise === null) return '';
    if (noise < 50) return 'low';
    if (noise <= 70) return 'medium';
    return 'high';
  }

  private loadFakeData(): void {
    this.floors = ['EG', 'OG1', 'OG2', 'OG3', 'OG4'];
    this.rooms = [
      'EG01', 'EG02', 'OG101', 'OG102', 'OG201', 'OG202', 'OG301', 'OG302', 'OG401', 'OG402'
    ];

    const fakeData: SensorBoxDTO[] = [
      new SensorBoxDTO('EG01', 'EG', Date.now(), 350, 45, 1, 100, 40, 1010, -50, 20), // Optimal
      new SensorBoxDTO('EG02', 'EG', Date.now(), 1200, 25, 0, 200, 60, 1005, -55, 12), // Kritisch
      new SensorBoxDTO('OG101', 'OG1', Date.now(), 800, 50, 1, 150, 45, 1020, -40, 22), // Optimal
      new SensorBoxDTO('OG102', 'OG1', Date.now(), 1000, 20, 1, 150, 65, 1015, -60, 18), // Akzeptabel
      new SensorBoxDTO('OG201', 'OG2', Date.now(), 700, 30, 1, 100, 50, 1018, -45, 19), // Optimal
      new SensorBoxDTO('OG202', 'OG2', Date.now(), 1500, 20, 0, 200, 70, 1002, -65, 14), // Kritisch
      new SensorBoxDTO('OG301', 'OG3', Date.now(), 850, 21, 1, 150, 55, 1015, -40, 19), // Optimal
      new SensorBoxDTO('OG302', 'OG3', Date.now(), 1100, 25, 1, 180, 65, 1010, -55, 15), // Akzeptabel
      new SensorBoxDTO('OG401', 'OG4', Date.now(), 1600, 30, 1, 220, 75, 1005, -60, 12), // Kritisch
      new SensorBoxDTO('OG402', 'OG4', Date.now(), 900, 22, 1, 200, 45, 1008, -50, 20), // Optimal
    ];

    fakeData.forEach((data) => this.currentSensorboxValues.set(data.room, data));
    console.log('Fake data loaded:', Array.from(this.currentSensorboxValues.entries()));
  }

  createDoughnutChart(): void {
    const totalGreenRooms = this.rooms.filter((room) => this.isRoomOptimal(room)).length;
    const totalYellowRooms = this.rooms.filter((room) => this.isRoomAcceptable(room)).length;
    const totalRedRooms = this.rooms.filter((room) => this.isRoomCritical(room)).length;

    if (
      totalGreenRooms === this.lastGreenRooms &&
      totalYellowRooms === this.lastYellowRooms &&
      totalRedRooms === this.lastRedRooms
    ) {
      console.log('Keine Änderung bei den Daten. Chart wird nicht aktualisiert.');
      return;
    }

    this.lastGreenRooms = totalGreenRooms;
    this.lastYellowRooms = totalYellowRooms;
    this.lastRedRooms = totalRedRooms;

    const ctx = document.getElementById('roomStatusChart') as HTMLCanvasElement;

    if (this.doughnutChart) {
      this.doughnutChart.destroy();
    }

    if (ctx) {
      this.doughnutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Optimal', 'Akzeptabel', 'Kritisch'],
          datasets: [
            {
              label: 'Raum Status',
              data: [totalGreenRooms, totalYellowRooms, totalRedRooms],
              backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
            },
          ],
        },
        options: {
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                font: {
                  size: 12,
                },
              },
            },
            title: {
              display: true,
              text: 'Status der Räume',
              font: {
                size: 14,
              },
            },
          },
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              top: 10,
              bottom: 10,
            },
          },
        },
      });
      console.log('Chart wurde erfolgreich aktualisiert.');
    }
  }

  //#region Service
  ngOnInit() {
    // Echte Daten vom Backend laden: Räume holen, dann für jeden Raum die aktuellen Werte holen
    this.sbs.getAllRooms().subscribe((rooms: string[]) => {
      this.rooms = rooms;
      const sensorBoxRequests = rooms.map(room => this.sbs.getLatestValuesOfRoom(room));
      if (sensorBoxRequests.length === 0) {
        this.floors = [];
        this.filteredFloors = [];
        this.createDoughnutChart();
        return;
      }
      // Alle Requests parallel ausführen und Ergebnisse sammeln
      Promise.all(sensorBoxRequests.map(obs => obs.toPromise())).then((data: (SensorBoxDTO | undefined)[]) => {
        // Filtere undefined heraus (z.B. falls ein Request fehlschlägt)
        const validData = data.filter((d): d is SensorBoxDTO => d !== undefined);
        this.floors = Array.from(new Set(validData.map(d => d.floor)));
        validData.forEach((d) => this.currentSensorboxValues.set(d.room, d));
        this.filteredFloors = [...this.floors];
        this.applyFilter();
        this.createDoughnutChart();
      });
    });
  }

  ngOnDestroy() {
    this.intervalId ? clearInterval(this.intervalId) : null;
    if (this.doughnutChart) {
      this.doughnutChart.destroy();
    }
  }
  //#endregion

  openSettings(): void {
    this.isSettingsOpen = true;
  }

  closeSettings(): void {
    this.isSettingsOpen = false;
  }

  saveSettings(): void {
    console.log('Einstellungen gespeichert:', this.settings);
    this.closeSettings();
  }

  isRoomOptimal(room: string): boolean {
    const data = this.currentSensorboxValues.get(room);
    if (!data) return false;

    return (
      (data.co2 ?? Infinity) <= this.settings.co2.greenMax &&
      (data.temperature ?? -Infinity) >= this.settings.temperature.greenMin &&
      (data.temperature ?? Infinity) <= this.settings.temperature.greenMax &&
      (data.humidity ?? -Infinity) >= this.settings.humidity.greenMin &&
      (data.humidity ?? Infinity) <= this.settings.humidity.greenMax
    );
  }

  isRoomAcceptable(room: string): boolean {
    const data = this.currentSensorboxValues.get(room);
    if (!data) return false;

    const isCo2Yellow = (data.co2 ?? 0) > this.settings.co2.greenMax && (data.co2 ?? 0) <= this.settings.co2.yellowMax;
    const isTemperatureYellow =
      (data.temperature ?? 0) > this.settings.temperature.greenMax ||
      (data.temperature ?? 0) < this.settings.temperature.greenMin;
    const isHumidityYellow =
      (data.humidity ?? 0) > this.settings.humidity.greenMax ||
      (data.humidity ?? 0) < this.settings.humidity.greenMin;

    return !this.isRoomCritical(room) && (isCo2Yellow || isTemperatureYellow || isHumidityYellow);
  }

  isRoomCritical(room: string): boolean {
    const data = this.currentSensorboxValues.get(room);
    if (!data) return false;

    return (
      (data.co2 ?? 0) > this.settings.co2.yellowMax ||
      (data.temperature ?? 0) < this.settings.temperature.greenMin ||
      (data.temperature ?? 0) > this.settings.temperature.greenMax ||
      (data.humidity ?? 0) < this.settings.humidity.greenMin ||
      (data.humidity ?? 0) > this.settings.humidity.greenMax
    );
  }

  getTemperatureClass(temperature?: number): string {
    if (temperature === undefined || temperature === null) return 'low';
    if (temperature < this.settings.temperature.greenMin || temperature > this.settings.temperature.greenMax) return 'high';
    if (temperature >= this.settings.temperature.greenMin && temperature <= this.settings.temperature.greenMax) return 'medium';
    return 'low';
  }

  getHumidityClass(humidity?: number): string {
    if (humidity === undefined || humidity === null) return 'low';
    if (humidity < this.settings.humidity.greenMin || humidity > this.settings.humidity.greenMax) return 'high';
    if (humidity >= this.settings.humidity.greenMin && humidity <= this.settings.humidity.greenMax) return 'medium';
    return 'low';
  }
}