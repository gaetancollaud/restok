import { Component, input, output, signal } from '@angular/core';

/** Bottom bar to add an item: a text input and a square + button. */
@Component({
  selector: 'app-add-bar',
  templateUrl: './add-bar.html',
  styleUrl: './add-bar.css',
})
export class AddBar {
  readonly placeholder = input('Add an item');
  /** Accessible names of the input and the + button. */
  readonly label = input('New item');
  readonly buttonLabel = input('Add item');
  /** The trimmed name, on + or Enter; the bar then clears itself. */
  readonly add = output<string>();

  protected readonly text = signal('');

  protected submit(field: HTMLInputElement): void {
    const name = field.value.trim();
    if (name) {
      this.add.emit(name);
      field.value = '';
      this.text.set('');
    }
  }
}
