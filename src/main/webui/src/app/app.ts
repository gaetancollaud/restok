import { Component } from '@angular/core';
import { Grocery } from './grocery/grocery';

@Component({
  imports: [Grocery],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
