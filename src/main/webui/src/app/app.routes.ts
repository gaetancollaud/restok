import { Routes } from '@angular/router';
import { Categories } from './categories/categories';
import { List } from './list/list';
import { Shops } from './shops/shops';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'list' },
  { path: 'list', component: List },
  { path: 'shops', component: Shops },
  { path: 'categories', component: Categories },
];
