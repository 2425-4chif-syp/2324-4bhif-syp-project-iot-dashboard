import { Component } from '@angular/core';
import { MapComponent } from './components/map/map.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MapComponent],
  template: `
    <div>
      <h1>PV Room Map</h1>
      <app-map></app-map>
    </div>
  `
})
export class AppComponent {}
