import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pv-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pv-info.component.html',
  styleUrls: ['./pv-info.component.css']
})
export class PvInfoComponent {
  @Input() pvPanel: any; // Die übergebenen Daten zur PV-Anlage
  @Output() close = new EventEmitter<void>();
}
