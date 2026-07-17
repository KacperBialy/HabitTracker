import { TestBed } from '@angular/core/testing';

import { TASK_COLOR_HEX, TaskColor } from '../../core/task-colors';
import { LogTimeModalComponent } from './log-time-modal.component';

function hexToCssRgb(hex: string): string {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return `rgb(${red}, ${green}, ${blue})`;
}

describe('LogTimeModalComponent', () => {
  function modal(): LogTimeModalComponent {
    const fixture = TestBed.createComponent(LogTimeModalComponent);
    fixture.componentRef.setInput('today', '2026-06-21');
    fixture.detectChanges(); // triggers ngOnInit
    return fixture.componentInstance;
  }

  describe('totalMinutes', () => {
    it('composes hours and minutes', () => {
      const cmp = modal();
      (cmp as any).hours.set(1);
      (cmp as any).minutes.set(12);
      expect((cmp as any).totalMinutes()).toBe(72);
    });

    it('treats blank inputs as zero', () => {
      const cmp = modal();
      (cmp as any).hours.set(0);
      (cmp as any).minutes.set(45);
      expect((cmp as any).totalMinutes()).toBe(45);
    });
  });

  describe('isValid bounds', () => {
    function validFor(hours: number, minutes: number): boolean {
      const cmp = modal();
      (cmp as any).hours.set(hours);
      (cmp as any).minutes.set(minutes);
      return (cmp as any).isValid();
    }

    it('rejects zero duration', () => {
      expect(validFor(0, 0)).toBe(false);
    });

    it('accepts the minimum (1 min)', () => {
      expect(validFor(0, 1)).toBe(true);
    });

    it('accepts the max (1440 min = 24h)', () => {
      expect(validFor(24, 0)).toBe(true);
    });

    it('rejects above the max (1441 min)', () => {
      expect(validFor(24, 1)).toBe(false);
    });

    it('rejects when the date is missing', () => {
      const cmp = modal();
      (cmp as any).logDate.set('');
      (cmp as any).minutes.set(30);
      expect((cmp as any).isValid()).toBe(false);
    });
  });

  describe('quick picks', () => {
    it('sets hours and minutes from a pick', () => {
      const cmp = modal();
      (cmp as any).applyPick({ label: '1h 30m', minutes: 90 });
      expect((cmp as any).hours()).toBe(1);
      expect((cmp as any).minutes()).toBe(30);
      expect((cmp as any).selectedPick()).toBe(90);
    });
  });

  it('renders the swatch with the task color, not a fixed gray', () => {
    const fixture = TestBed.createComponent(LogTimeModalComponent);
    fixture.componentRef.setInput('today', '2026-06-21');
    fixture.componentRef.setInput('taskColor', TaskColor.Amber);
    fixture.detectChanges();

    const swatch = fixture.nativeElement.querySelector('span.mr-2') as HTMLElement;
    const hex = TASK_COLOR_HEX[TaskColor.Amber];
    // The DOM may normalize the hex to rgb() — accept either form.
    expect([hex, hexToCssRgb(hex)]).toContain(swatch.style.background);
  });

  it('emits the composed minutes and date on save', () => {
    const cmp = modal();
    (cmp as any).hours.set(0);
    (cmp as any).minutes.set(45);
    let emitted: { minutes: number; logDate: string } | undefined;
    cmp.save.subscribe((payload) => (emitted = payload));

    (cmp as any).submit();

    expect(emitted).toEqual({ minutes: 45, logDate: '2026-06-21' });
  });
});
