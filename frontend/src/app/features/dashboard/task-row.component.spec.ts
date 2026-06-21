import { TaskRowComponent } from './task-row.component';

describe('TaskRowComponent.todayLabel', () => {
  function labelFor(minutes: number): string {
    const row = new TaskRowComponent();
    row.todayMinutes = minutes;
    return row.todayLabel;
  }

  it('hides the label when zero', () => {
    expect(labelFor(0)).toBe('');
  });

  it('hides the label for negative values', () => {
    expect(labelFor(-5)).toBe('');
  });

  it('shows bare minutes under an hour', () => {
    expect(labelFor(24)).toBe('24m today');
  });

  it('shows hours and minutes over an hour', () => {
    expect(labelFor(72)).toBe('1h 12m today');
  });

  it('omits minutes on a whole hour', () => {
    expect(labelFor(120)).toBe('2h today');
  });
});
