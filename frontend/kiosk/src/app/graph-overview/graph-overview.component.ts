import { Component, OnInit } from '@angular/core';
import { Graph } from "../model/Graph";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { HttpClient} from "@angular/common/http";
import {NgForOf, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault} from "@angular/common";
import { GraphComponent } from "../graph/graph.component";
import { FormsModule } from '@angular/forms';
import { Subscription, timer } from 'rxjs';
import { Duration } from '../model/Duration';
import {WeatherComponent} from "../weather/weather.component";
import {RouterLink} from "@angular/router";
import {SensorboxOverviewComponent} from "../sensorbox-overview/sensorbox-overview.component";
import { CommonModule} from "@angular/common";

@Component({
  selector: 'app-graph-overview',
  standalone: true,
  imports: [
    NgForOf,
    NgIf,
    GraphComponent,
    FormsModule,
    WeatherComponent,
    RouterLink,
    SensorboxOverviewComponent,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
    CommonModule
  ],
  templateUrl: './graph-overview.component.html',
  styleUrls: ['./graph-overview.component.css']
})
export class GraphOverviewComponent implements OnInit {

  public selectedWeek: { label: string; start: Date; end: Date } | null = null;
  public firstDayOfWeek: Date = new Date();
  public lastDayOfWeek: Date = new Date();
  today = new Date();
  todayDay = this.today.getDate();
  todayMonth = this.today.getMonth();
  todayYear = this.today.getFullYear();

  public graphs: Graph[] = [];
  public currentIndex = -1;
  public currentGraph: Graph | null = null;

  public isMonthSelected: boolean = false;
  public kioskMode: boolean = true;
  public interval: number = 15;
  subscription!: Subscription;

  public showPvData: boolean = true;
  public years: number[] = [2024, 2025];
  public selectedYear: number = new Date().getFullYear();
  public selectedMonth: number = new Date().getMonth();
  public selectedDay: number = new Date().getDate();
  public daysInMonth: number[] = [];

  public durations: Duration[] = [
    new Duration("5m", "5 minutes"),
    new Duration("1h", "1 hour"),
    new Duration("4h", "4 hours"),
    new Duration("1d", "1 day"),
    new Duration("2d", "2 days"),
    new Duration("7d", "1 week"),
    new Duration("30d", "1 month"),
    new Duration("365d", "1 year")
  ];
  public selectedDuration: Duration = this.durations[3];

  public visible: boolean = false;
  public selectedDateString: string = '';
  public months: string[] = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
  ];


  public selectedRangeType: 'day' | 'week' | 'month' | 'year' = 'day';
  //public selectedWeek: { start: Date, end: Date, label: string } | null = null;
  public availableWeeks: { start: Date, end: Date, label: string }[] = [];


  constructor(public sanitizer: DomSanitizer, public http: HttpClient) { }

  ngOnInit(): void {
    this.updateDaysInMonth();
    this.generateWeeks(this.selectedYear);

    this.http.get<Graph[]>('assets/data/graph-data.json').subscribe((data) => {
      this.graphs = data;
      console.log(this.graphs.length + " graphs loaded");
      this.updateGraphLinks();
    });

    this.kioskModeChecker();
  }

  public updateDaysInMonth(): void {
    const numDays = new Date(this.selectedYear, this.selectedMonth + 1, 0).getDate();
    this.daysInMonth = Array.from({ length: numDays }, (_, i) => i + 1);
  }

  public onDateChange(): void {
    this.isMonthSelected = false;
    this.selectedDuration = new Duration("1d", "1 day");
    this.updateGraphLinks();
  }

  public toggleDataMode(): void {
    this.currentIndex = this.showPvData ? -1 : -3;
    this.currentGraph = null;
  }

  public selectAllGraphs(): void {
    this.currentIndex = -1;
    this.currentGraph = null;
  }

  public selectGraph(index: number): void {
    this.currentIndex = index;
    this.currentGraph = this.graphs[index];
  }

  public kioskModeChecker() {
    if (this.kioskMode) {
      this.activateKioskMode();
    } else {
      this.deactivateKioskMode();
    }
  }

  public activateKioskMode(): void {
    this.subscription = timer(0, this.interval * 1000).subscribe(() => {
      this.nextGraph();
    });
  }

  public deactivateKioskMode(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public nextGraph(): void {
    if (!this.showPvData) {
      this.selectSensorBox();
      return;
    }

    this.currentIndex++;

    if (this.currentIndex === -1) {
      this.selectAllGraphs();
    } else if (this.currentIndex === this.graphs.length) {
      this.selectWeather();
      this.currentIndex = -2;
    } else if (this.currentIndex >= 0 && this.currentIndex < this.graphs.length) {
      this.setCurrentGraphWithIndex(this.currentIndex);
    } else if (this.currentIndex > this.graphs.length) {
      this.currentIndex = -1;
      this.selectAllGraphs();
    }
  }

  private updateCurrentGraph(): void {
    if (this.currentIndex !== -1) {
      this.setCurrentGraphWithIndex(this.currentIndex);
    } else {
      this.currentGraph = null;
    }
  }

  private updateGraphLinks(): void {
    let from: number;
    let to: number;

    switch (this.selectedRangeType) {
      case 'day':
        if (!this.selectedDay || this.selectedMonth === undefined || !this.selectedYear) return;
        from = new Date(this.selectedYear, this.selectedMonth, this.selectedDay, 0, 0, 0).getTime();
        to = new Date(this.selectedYear, this.selectedMonth, this.selectedDay, 23, 59, 59, 999).getTime();
        break;

      case 'week':
        if (!this.selectedWeek?.start || !this.selectedWeek?.end) return;
        from = new Date(this.selectedWeek.start).getTime();
        to = new Date(this.selectedWeek.end).getTime();
        break;

      case 'month':
        if (this.selectedMonth === undefined || !this.selectedYear) return;
        from = new Date(this.selectedYear, this.selectedMonth, 1).getTime();
        // Letzter Tag des Monats, Uhrzeit: 23:59:59.999
        to = new Date(this.selectedYear, this.selectedMonth + 1, 0, 23, 59, 59, 999).getTime();
        break;

      case 'year':
        if (!this.selectedYear) return;
        from = new Date(this.selectedYear, 0, 1).getTime();
        to = new Date(this.selectedYear, 11, 31, 23, 59, 59, 999).getTime();
        break;

      default:
        console.warn("Unbekannter Zeitraumtyp:", this.selectedRangeType);
        return;
    }

    // Links aktualisieren
    this.graphs.forEach(graph => {
      graph.iFrameLink = graph.iFrameLink
        .replace(/from=[^&]+/, `from=${from}`)
        .replace(/to=[^&]+/, `to=${to}`);
    });

    this.updateCurrentGraph();
  }




  public setCurrentGraphWithIndex(index: number): void {
    this.currentIndex = index;
    if (index >= 0 && index < this.graphs.length) {
      this.currentGraph = this.graphs[index];
    } else {
      this.currentGraph = null;
    }
  }

  public getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  public toggleCollapse() {
    this.visible = !this.visible;
  }

  public getAllGraphNames(graphs: Graph[], separator: string): string {
    return graphs.map(g => g.name).join(separator);
  }

  public selectWeather(): void {
    this.currentIndex = -2;
    this.currentGraph = null;
  }

  public selectSensorBox():void {
    this.currentIndex = -3;
    this.currentGraph = null;
  }

  public changeDuration(): void {
    this.isMonthSelected = false;
    this.updateGraphLinks();
    console.log("Zeitraum geändert auf:", this.selectedDuration.short);

    if (this.selectedDuration.short === '30d') {
      this.isMonthSelected = true;

      this.updateGraphLinks();
    }
    else if (this.selectedDuration.short === '7d')
    {
      const date = new Date(this.selectedYear, this.selectedMonth, this.selectedDay);
      const dayOfWeek = date.getDay(); // 0 (So) bis 6 (Sa)
      const diffToMonday = (dayOfWeek + 6) % 7;

      this.firstDayOfWeek = new Date(date);
      this.firstDayOfWeek.setDate(date.getDate() - diffToMonday);

      this.lastDayOfWeek = new Date(this.firstDayOfWeek);
      this.lastDayOfWeek.setDate(this.firstDayOfWeek.getDate() + 6);

      this.selectedWeek = {
        label: `KW ${this.getISOWeekNumber(this.firstDayOfWeek)}`,
        start: this.firstDayOfWeek,
        end: this.lastDayOfWeek
      };
    }

    else {
      this.isMonthSelected = false;
      // Tag verwenden wie bisher
      this.updateGraphLinks();
    }

    this.updateGraphLinks();
  }



  getCurrentMonthYearLabel(): string {
    const date = new Date();
    const monthName = this.months[date.getMonth()];
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}. ${monthName} ${year}`;
  }

  private calculateFixedDurationRange(): { from: number, to: number } {
    const selectedDate = new Date(this.selectedYear, this.selectedMonth, this.selectedDay, 0, 0, 0, 0);

    let durationMs = 0;
    switch (this.selectedDuration.short) {
      case "1h":
        durationMs = 60 * 60 * 1000;
        break;
      case "4h":
        durationMs = 4 * 60 * 60 * 1000;
        break;
      case "1d":
        durationMs = 24 * 60 * 60 * 1000;
        break;
      default:
        durationMs = 60 * 60 * 1000; // Fallback: 1 Stunde
    }

    const from = selectedDate.getTime();
    const to = from + durationMs;

    return { from, to };
  }

  public onRangeTypeChange(): void {
    const date = new Date(this.selectedYear, this.selectedMonth, 1);
    this.calculateDaysInMonth();
    if (this.selectedRangeType === 'week') {
      this.generateWeeksOfMonth(date);
    }
    this.updateGraphLinks();
  }

  public calculateDaysInMonth(): void {
    const days = new Date(this.selectedYear, this.selectedMonth + 1, 0).getDate();
    this.daysInMonth = Array.from({ length: days }, (_, i) => i + 1);
  }

  public generateWeeksOfMonth(date: Date): void {
    this.availableWeeks = [];
    const year = date.getFullYear();
    const month = date.getMonth();

    let start = new Date(year, month, 1);
    while (start.getMonth() === month) {
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const label = `${start.getDate()}. – ${Math.min(end.getDate(), new Date(year, month + 1, 0).getDate())}. ${this.months[month]}`;
      this.availableWeeks.push({ start: new Date(start), end: new Date(end), label });
      start.setDate(start.getDate() + 7);
    }
    this.selectedWeek = this.availableWeeks[0];
  }

  private getISOWeekNumber(date: Date): number {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const jan4 = new Date(target.getFullYear(), 0, 4);
    const dayDiff = (target.getTime() - jan4.getTime()) / 86400000;
    return 1 + Math.floor(dayDiff / 7);
  }

  private generateWeeks(year: number): void {
    this.availableWeeks = [];
    let start = new Date(year, 0, 1);

    while (start.getFullYear() === year) {
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const label = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
      this.availableWeeks.push({ start: new Date(start), end, label });
      start.setDate(start.getDate() + 7);
    }

    this.selectedWeek = this.availableWeeks[0];
  }


}
