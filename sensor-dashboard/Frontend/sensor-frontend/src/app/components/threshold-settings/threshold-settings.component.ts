import { Component, OnInit, Inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThresholdService } from '../../services/threshold.service';
import { SensorThreshold } from '../../models/threshold.interface';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSliderModule } from '@angular/material/slider';

@Component({
  selector: 'app-threshold-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTabsModule,
    MatIconModule,
    MatSnackBarModule,
    MatSliderModule
  ],
  templateUrl: './threshold-settings.component.html',
  styleUrls: ['./threshold-settings.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ThresholdSettingsComponent implements OnInit {
  temperatureThresholds: SensorThreshold = {
    warningLow: 0,
    warningHigh: 0,
    dangerLow: 0,
    dangerHigh: 0
  };

  humidityThresholds: SensorThreshold = {
    warningLow: 0,
    warningHigh: 0,
    dangerLow: 0,
    dangerHigh: 0
  };

  co2Thresholds: SensorThreshold = {
    warningLow: 0,
    warningHigh: 0,
    dangerLow: 0,
    dangerHigh: 0
  };

  activeTab: string = 'temperature';
  isSaving: boolean = false;

  constructor(
    private thresholdService: ThresholdService,
    public dialogRef: MatDialogRef<ThresholdSettingsComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.loadThresholds();
  }

  loadThresholds(): void {
    this.thresholdService.getThresholds().subscribe(
      config => {
        this.temperatureThresholds = { ...config.temperature };
        this.humidityThresholds = { ...config.humidity };
        this.co2Thresholds = { ...config.co2 };
      },
      error => {
        console.error('Fehler beim Laden der Schwellenwerte:', error);
        this.snackBar.open('Fehler beim Laden der Schwellenwerte', 'Schließen', {
          duration: 3000,
          panelClass: 'error-snackbar'
        });
      }
    );
  }

  onTabChange(event: any): void {
    const tabs = ['temperature', 'humidity', 'co2'];
    this.activeTab = tabs[event.index];
  }

  saveThresholds(): void {
    this.isSaving = true;
    let thresholds: SensorThreshold;

    switch (this.activeTab) {
      case 'temperature':
        thresholds = this.temperatureThresholds;
        break;
      case 'humidity':
        thresholds = this.humidityThresholds;
        break;
      case 'co2':
        thresholds = this.co2Thresholds;
        break;
      default:
        this.isSaving = false;
        return;
    }

    this.thresholdService.updateThresholds(this.activeTab, thresholds).subscribe(
      () => {
        this.snackBar.open(
          `Schwellenwerte für ${this.getSensorTypeLabel(this.activeTab)} erfolgreich aktualisiert`,
          'Schließen',
          { duration: 3000 }
        );
        this.isSaving = false;
      },
      error => {
        console.error(`Fehler beim Speichern der Schwellenwerte für ${this.activeTab}:`, error);
        this.snackBar.open(
          `Fehler beim Speichern der Schwellenwerte für ${this.getSensorTypeLabel(this.activeTab)}`,
          'Schließen',
          {
            duration: 3000,
            panelClass: 'error-snackbar'
          }
        );
        this.isSaving = false;
      }
    );
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  private getSensorTypeLabel(type: string): string {
    switch (type) {
      case 'temperature':
        return 'Temperatur';
      case 'humidity':
        return 'Luftfeuchtigkeit';
      case 'co2':
        return 'CO2';
      default:
        return type;
    }
  }

  // Hilfsmethode, um sicherzustellen, dass die Schwellenwerte logisch korrekt sind
  validateThresholds(threshold: SensorThreshold): boolean {
    return (
      threshold.dangerLow <= threshold.warningLow &&
      threshold.warningLow <= threshold.warningHigh &&
      threshold.warningHigh <= threshold.dangerHigh
    );
  }
}
