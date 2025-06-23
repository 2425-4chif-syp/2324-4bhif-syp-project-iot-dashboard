import { Component, OnInit } from '@angular/core';
import { Graph } from "../model/Graph";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { HttpClient} from "@angular/common/http";
import { NgForOf, NgIf } from "@angular/common";
import { GraphComponent } from "../graph/graph.component";
import { FormsModule } from '@angular/forms';
import { Subscription, timer } from 'rxjs';
import { Duration } from '../model/Duration';
import {WeatherComponent} from "../weather/weather.component";
import {RouterLink} from "@angular/router";
import {SensorboxOverviewComponent} from "../sensorbox-overview/sensorbox-overview.component";

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
  ],
  templateUrl: './graph-overview.component.html',
  styleUrls: ['./graph-overview.component.css']
})
export class GraphOverviewComponent implements OnInit {
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
  public selectedMonthYear: { year: number, month: number } = { year: new Date().getFullYear(), month: new Date().getMonth() };

  public visible: boolean = false;

  public months: string[] = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
  ];
  public selectedMonth: number = new Date().getMonth();

  constructor(public sanitizer: DomSanitizer, public http: HttpClient) { }

  ngOnInit(): void {
    this.http.get<Graph[]>('assets/data/graph-data.json').subscribe((data) => {
      this.graphs = data;
      console.log(this.graphs.length + " graphs loaded");
    });

    // Initialisiere die Graphen mit der Standard-Zeitspanne
    this.updateGraphLinks();

    this.kioskModeChecker();

    // Wähle automatisch heutigen Monat/Jahr aus
    this.selectMonthYearCombo();
  }

  public selectMonthYearCombo(): void {
    this.selectedMonth = this.selectedMonthYear.month;
    this.selectedYear = this.selectedMonthYear.year;
    this.isMonthSelected = true;
    this.updateGraphLinks();
    console.log("Updated Graphs for Monthly Selection");
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

  calculateStartAndEndOfMonth(month: number, year: number): { from: number, to: number } {
    const startDate = new Date(year, month, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const from = startDate.getTime();
    const to = endDate.getTime();

    return { from, to };
  }

  public changeDuration(): void {
    console.log("Changing Timeframe to: ", this.selectedDuration.short);

    // Setze die Monatsauswahl zurück
    this.isMonthSelected = false;

    // Aktualisiere die Graphen-Links sofort nach der Änderung
    this.updateGraphLinks();
  }


  private updateCurrentGraph(): void {
    if (this.currentIndex !== -1) {
      this.setCurrentGraphWithIndex(this.currentIndex);
    } else {
      this.currentGraph = null;
    }
  }

  private updateGraphLinks(): void {
    console.log("updateGraphLinks called. isMonthSelected:", this.isMonthSelected, "selectedDuration:", this.selectedDuration.short);

    if (this.isMonthSelected) {
      // Monatsansicht aktiv: Berechne Start- und Endzeit
      const { from, to } = this.calculateStartAndEndOfMonth(this.selectedMonth, this.selectedYear);
      this.graphs.forEach(graph => {
        graph.iFrameLink = graph.iFrameLink
          .replace(/from=[^&]+/, `from=${from}`)
          .replace(/to=[^&]+/, `to=${to}`);
      });
      console.log("Using Monthly Timeframe:", from, to);
    } else {
      // Zeitspanne ändern (z. B. 4h, 1d, etc.)
      const selectedDuration: string = this.selectedDuration.short;
      this.graphs.forEach(graph => {
        // Stelle sicher, dass die URL richtig überschrieben wird
        graph.iFrameLink = graph.iFrameLink
          .replace(/from=[^&]+/, `from=now-${selectedDuration}`)
          .replace(/to=[^&]+/, `to=now`);
      });
      console.log("Using Timeframe:", selectedDuration);
    }

    // Aktualisiere den aktuellen Graphen, falls einer aktiv ist
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
    let res: string[] = [];

    graphs.forEach(g => {
      res.push(g.name);
    });

    return res.join(separator);
  }

  public selectWeather(): void {
    this.currentIndex = -2;
    this.currentGraph = null;
  }

  public selectSensorBox():void {
    this.currentIndex = -3;
    this.currentGraph = null;
  }
}
