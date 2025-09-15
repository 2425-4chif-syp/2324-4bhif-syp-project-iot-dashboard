import { Routes } from '@angular/router';
import { BuildingComponent } from './components/building/building.component';

export const routes: Routes = [
  { path: '', component: BuildingComponent },
  { path: '**', redirectTo: '' }
];
