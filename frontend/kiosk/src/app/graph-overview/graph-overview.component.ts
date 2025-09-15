// ...existing code...

import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
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
import { MatDatepickerModule, MatDatepicker } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';

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
    CommonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule
  ],
  templateUrl: './graph-overview.component.html',
  styleUrls: ['./graph-overview.component.css']
})
export class GraphOverviewComponent implements OnInit, AfterViewInit {
  // Optionen für 1-Stunden-Auswahl
  public hourOptions: number[] = Array.from({ length: 24 }, (_, i) => i);
  // Vergleichsfunktion für das Dropdown, damit Objekte erkannt werden
  public compareDays = (a: { day: number, month: number }, b: { day: number, month: number }) => {
    return a && b && a.day === b.day && a.month === b.month;
  };
  // Hilfsmethode für die Anzeige des Monatsnamens im Template
  public getMonthName(dayObj: { day: number, month: number }): string {
    return this.months[dayObj.month];
  }

  // Hilfsmethode für die Anzeige des nächsten Tages (für 2-Tage-Ansicht)
  public getNextDayObj(dayObj: { day: number, month: number }): { day: number, month: number } {
    const daysInMonth = new Date(this.selectedYear, dayObj.month + 1, 0).getDate();
    if (dayObj.day < daysInMonth) {
      return { day: dayObj.day + 1, month: dayObj.month };
    } else {
      // Nächster Tag ist der 1. des Folgemonats
      return { day: 1, month: (dayObj.month + 1) % 12 };
    }
  }
  public daysInMonth: number[] = [];
  public selectedMinute: number = 0;
  public minuteIntervals: { value: number, label: string }[] = Array.from({ length: 288 }, (_, i) => {
    const totalMinutes = i * 5;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const label = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    return { value: totalMinutes, label };
  });

  // Wird aufgerufen, wenn in der Wochenansicht das Jahr gewechselt wird
  public onWeekYearChange(): void {
    this.generateWeeks(this.selectedYear);
    // Finde die aktuelle Kalenderwoche und setze sie als ausgewählt
    const today = new Date();
    const weekIndex = this.availableWeeks.findIndex(w =>
      today >= w.start && today <= w.end
    );
    this.selectedWeek = weekIndex >= 0 ? this.availableWeeks[weekIndex] : this.availableWeeks[0];
    this.changeDuration();
  }
  @ViewChild('picker') picker!: MatDatepicker<Date>;
  // 4-Stunden-Intervalle: 1–5, 5–9, 9–13, 13–17, 17–21, 21–1
  public fourHourIntervals: { value: number, label: string }[] = [
    { value: 0, label: '00:00 – 04:00' },
    { value: 4, label: '04:00 – 08:00' },
    { value: 8, label: '08:00 – 12:00' },
    { value: 12, label: '12:00 – 16:00' },
    { value: 16, label: '16:00 – 20:00' },
    { value: 20, label: '20:00 – 00:00' }
  ];
  public selectedHour: number = 0;
  
  ngAfterViewInit(): void {
    // Wird benötigt, damit ViewChild funktioniert
  }

  public minDate: Date = new Date(2024, 0, 1); // 1. Januar 2024
  public maxDate: Date = new Date(2025, 11, 31); // 31. Dezember 2025

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
  // Dashboard-Einstellungen
  public kioskMode: boolean = true;
  public interval: number = 15;
  public subscription!: Subscription;

  public showDashboardSettings: boolean = false;

  public toggleDashboardSettings(): void {
    this.showDashboardSettings = !this.showDashboardSettings;
  }
  public showPvData: boolean = true;
  public years: number[] = [2024, 2025];
  public selectedYear: number = new Date().getFullYear();
  public selectedMonth: number = new Date().getMonth();
  public selectedDayObj: { day: number, month: number } = { day: new Date().getDate(), month: new Date().getMonth() };
  public daysInYear: { day: number, month: number }[] = [];

  public durations: Duration[] = [
    new Duration("5m", "5 Minuten", 5),
    new Duration("1h", "1 Stunde", 60),
    new Duration("4h", "4 Stunden", 240),
    new Duration("1d", "1 Tag", 1440),
    new Duration("2d", "2 Tage", 2880),
    new Duration("7d", "1 Woche", 10080),
    new Duration("30d", "1 Monat", 43200),
    new Duration("365d", "1 Jahr",  525600)
  ];
  public selectedDuration: Duration = this.durations[3];

  // yearSelect für das Template (Array von Objekten mit Eigenschaft long)
  public yearSelect = [
    { long: 2024 },
    { long: 2025 }
  ];

  public visible: boolean = false;
  public selectedDateString: Date = new Date();

  // Wird vom Material Datepicker aufgerufen
  public onMaterialDateChange(event: any): void {
    const date: Date = event.value || event;
    if (date instanceof Date && !isNaN(date.getTime())) {
      this.selectedYear = date.getFullYear();
      this.selectedMonth = date.getMonth();
      this.selectedDayObj = { day: date.getDate(), month: date.getMonth() };
      this.selectedDateString = date;

      // Prüfe, ob nur das Jahr gewählt wurde (Monat = Januar, Tag = 1)
      if (date.getDate() === 1 && date.getMonth() === 0 && event?.event?.target?.classList?.contains('mat-calendar-body-cell-content')) {
        // Jahresansicht aktivieren
        this.selectedDuration = this.durations.find(d => d.short === '365d') || this.selectedDuration;
        setTimeout(() => this.picker.close(), 0);
      } else if (date.getDate() === 1 && event?.event?.target?.classList?.contains('mat-calendar-body-cell-content')) {
        // Monatsansicht aktivieren
        this.selectedDuration = this.durations.find(d => d.short === '30d') || this.selectedDuration;
        setTimeout(() => this.picker.close(), 0);
      }

      this.updateGraphLinks();
    }
  }
  public months: string[] = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
  ];


  public selectedRangeType: 'day' | 'week' | 'month' | 'year' = 'day';
  //public selectedWeek: { start: Date, end: Date, label: string } | null = null;
  public availableWeeks: { start: Date, end: Date, label: string }[] = [];


  constructor(public sanitizer: DomSanitizer, public http: HttpClient) { }

  ngOnInit(): void {
    this.updateDaysInYear();
    // Set default selectedDayObj to today after daysInYear is initialized
    const today = new Date();
    this.selectedDayObj = { day: today.getDate(), month: today.getMonth() };
    this.generateWeeks(this.selectedYear);

    this.http.get<Graph[]>('assets/data/graph-data.json').subscribe((data) => {
      this.graphs = data;
      console.log(this.graphs.length + " graphs loaded");
      this.updateGraphLinks();
    });

    this.kioskModeChecker();
  }

  public updateDaysInYear(): void {
    this.daysInYear = [];
    for (let m = 0; m < 12; m++) {
      const numDays = new Date(this.selectedYear, m + 1, 0).getDate();
      for (let d = 1; d <= numDays; d++) {
        this.daysInYear.push({ day: d, month: m });
      }
    }
  }

  public onDateChange(): void {
    this.isMonthSelected = false;
    this.selectedDuration = new Duration("1d", "1 day", 1440);
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
    let from: Date;
    let to: Date;
    if (this.selectedDuration.short === '1h') {
      // Stundenansicht
      const date = new Date(this.selectedDateString);
      from = new Date(date.getFullYear(), date.getMonth(), date.getDate(), this.selectedHour, 0, 0, 0);
      to = new Date(from.getTime() + 60 * 60 * 1000); // 1 Stunde
    } else if (this.selectedDuration.short === '4h') {
      // 4-Stunden-Ansicht mit festen Intervallen 
      const date = new Date(this.selectedDateString);
      from = new Date(date.getFullYear(), date.getMonth(), date.getDate(), this.selectedHour, 0, 0, 0);
      if (this.selectedHour  === 21) {
        // 21–01:00, Endzeit ist am nächsten Tag 01:00
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);
        to = new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 1, 0, 0, 0);
      } else {
        to = new Date(date.getFullYear(), date.getMonth(), date.getDate(), this.selectedHour + 4, 0, 0, 0);
      }
    } else if (this.selectedDuration.short === '7d' && this.selectedWeek) {
      // Wochenansicht: von Wochenstart bis Wochenende
      from = new Date(this.selectedWeek.start);
      to = new Date(this.selectedWeek.end);
      // Endzeit auf 23:59:59.999 setzen
      to.setHours(23, 59, 59, 999);
    } else if (this.selectedDuration.short === '5m') {
      // 5-Minuten-Ansicht
      const hour = Math.floor(this.selectedMinute / 60);
      const minute = this.selectedMinute % 60;
      from = new Date(this.selectedYear, this.selectedMonth, this.selectedDayObj.day, hour, minute, 0, 0);
      to = new Date(from.getTime() + 5 * 60 * 1000); // 5 Minuten
    } else if (this.selectedDuration.short === '2d') {
      from = new Date(this.selectedYear, this.selectedDayObj.month, this.selectedDayObj.day, 0, 0, 0);
      to = new Date(this.selectedYear, this.selectedDayObj.month, this.selectedDayObj.day + 1, 23, 59, 59, 999);
    } else if (this.selectedDuration.short === '30d') {
      // Monatsansicht: von Monatsanfang bis Monatsende
      from = new Date(this.selectedYear, this.selectedMonth, 1, 0, 0, 0, 0);
      to = new Date(this.selectedYear, this.selectedMonth + 1, 0, 23, 59, 59, 999);
    } else {
      from = new Date(this.selectedYear, this.selectedMonth, this.selectedDayObj.day, 0, 0, 0);
      to = new Date(from);
      to.setTime(to.getTime() + this.selectedDuration.duration * 60 * 1000);
    }
    // switch (this.selectedRangeType) {
    //   case 'day':
    //     if (!this.selectedDay || this.selectedMonth === undefined || !this.selectedYear) return;
    //     from = new Date(this.selectedYear, this.selectedMonth, this.selectedDay, 0, 0, 0).getTime();
    //     to = new Date(this.selectedYear, this.selectedMonth, this.selectedDay, 23, 59, 59, 999).getTime();
    //     break;

    //   case 'week':
    //     if (!this.selectedWeek?.start || !this.selectedWeek?.end) return;
    //     from = new Date(this.selectedWeek.start).getTime();
    //     to = new Date(this.selectedWeek.end).getTime();
    //     break;

    //   case 'month':
    //     if (this.selectedMonth === undefined || !this.selectedYear) return;
    //     from = new Date(this.selectedYear, this.selectedMonth, 1).getTime();
    //     // Letzter Tag des Monats, Uhrzeit: 23:59:59.999
    //     to = new Date(this.selectedYear, this.selectedMonth + 1, 0, 23, 59, 59, 999).getTime();
    //     break;

    //   case 'year':
    //     if (!this.selectedYear) return;
    //     from = new Date(this.selectedYear, 0, 1).getTime();
    //     to = new Date(this.selectedYear, 11, 31, 23, 59, 59, 999).getTime();
    //     break;

    //   default:
    //     console.warn("Unbekannter Zeitraumtyp:", this.selectedRangeType);
    //     return;
    // }

    // Links aktualisieren
    this.graphs.forEach(graph => {
      // Ersetze from=... und to=... mit UNIX-Millisekunden, egal ob now-1d/now oder Zeitstempel
      graph.iFrameLink = graph.iFrameLink
        .replace(/from=([^&]*)/, `from=${from.getTime()}`)
        .replace(/to=([^&]*)/, `to=${to.getTime()}`);
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

  // Button-Handler für Sensor-Dashboard
  public openSensorDashboard(): void {
    // Hier kannst du die gewünschte Logik einfügen, z.B. Navigation oder Modal öffnen
    alert('Sensor-Dashboard geöffnet!');
  }

  public changeDuration(): void {
    this.isMonthSelected = false;
    this.updateGraphLinks();
    console.log("Zeitraum geändert auf:", this.selectedDuration.short);

    if (this.selectedDuration.short === '30d') {
      this.isMonthSelected = true;
      this.updateGraphLinks();
    }
    else if (this.selectedDuration.short === '7d') {
      // Wenn selectedWeek nicht gesetzt, setze aktuelle Kalenderwoche
      if (!this.selectedWeek) {
        const today = new Date();
        const weekIndex = this.availableWeeks.findIndex(w =>
          today >= w.start && today <= w.end
        );
        this.selectedWeek = weekIndex >= 0 ? this.availableWeeks[weekIndex] : this.availableWeeks[0];
      }
      this.firstDayOfWeek = new Date(this.selectedWeek.start);
      this.lastDayOfWeek = new Date(this.selectedWeek.end);
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
    const selectedDate = new Date(this.selectedYear, this.selectedMonth, this.selectedDayObj.day, 0, 0, 0, 0);

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
    // ISO 8601: Die erste Woche eines Jahres ist diejenige, die den ersten Donnerstag enthält
    // Finde den ersten Montag der ersten ISO-Woche
    let jan4 = new Date(year, 0, 4); // 4. Januar
    let firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7)); // Rückwärts zum Montag
    // Generiere Wochen von Montag bis Sonntag, solange der Montag noch im Jahr liegt
    let start = new Date(firstMonday);
    while (start.getFullYear() === year || (start.getFullYear() === year - 1 && start.getMonth() === 11)) {
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      // Nur Wochen, die mindestens teilweise im aktuellen Jahr liegen, aufnehmen
      if (end.getFullYear() === year || start.getFullYear() === year) {
        const label = `${start.getDate()}.${start.getMonth()+1}.${start.getFullYear()} - ${end.getDate()}.${end.getMonth()+1}.${end.getFullYear()}`;
        this.availableWeeks.push({ start: new Date(start), end: new Date(end), label });
      }
      start.setDate(start.getDate() + 7);
    }
    // Default: aktuelle Woche auswählen
    const today = new Date();
    const weekIndex = this.availableWeeks.findIndex(w => today >= w.start && today <= w.end);
    this.selectedWeek = weekIndex >= 0 ? this.availableWeeks[weekIndex] : this.availableWeeks[0];
  }


}
