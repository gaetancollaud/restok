import { Routes } from '@angular/router';
import { Items } from './items/items';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'items' },
  { path: 'items', component: Items },
];
