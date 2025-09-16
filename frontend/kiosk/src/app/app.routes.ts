

import { Routes } from '@angular/router';
import { SensorboxOverviewComponent } from './sensorbox-overview/sensorbox-overview.component';
import { GraphOverviewComponent } from './graph-overview/graph-overview.component';

export const routes: Routes = [
  {
    path: '',
    component: GraphOverviewComponent
  },
  {
    path: 'sensor-data',
    component: SensorboxOverviewComponent
  }
];
