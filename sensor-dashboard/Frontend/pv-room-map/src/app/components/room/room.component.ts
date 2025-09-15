import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PvInfoComponent } from '../pv-info/pv-info.component';

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [CommonModule, PvInfoComponent],
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.css']
})
export class RoomComponent {
  @Input() room: any;
  @Output() back = new EventEmitter<void>();
  selectedPvPanel: any = null; // Für die Anzeige des Pop-ups
  draggingPvPanel: any = null; // Für das Drag-and-Drop

  backToMap() {
    this.back.emit();
  }

  selectPvPanel(panel: any) {
    this.selectedPvPanel = panel; // Pop-up wird geöffnet
  }

  closePvInfo() {
    this.selectedPvPanel = null; // Pop-up wird geschlossen
  }

  startDrag(panel: any, event: MouseEvent) {
    this.draggingPvPanel = panel; // Beginne Dragging
    event.preventDefault();
  }

  onDrag(event: MouseEvent) {
    if (this.draggingPvPanel) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      this.draggingPvPanel.x = event.clientX - rect.left;
      this.draggingPvPanel.y = event.clientY - rect.top;
    }
  }

  stopDrag() {
    this.draggingPvPanel = null; // Dragging beenden
  }
}
