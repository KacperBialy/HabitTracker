import { TestBed } from '@angular/core/testing';

import { TaskRowComponent } from './task-row.component';

function swatchClass(isSubtask = false): string {
  const fixture = TestBed.createComponent(TaskRowComponent);
  fixture.componentRef.setInput('isSubtask', isSubtask);
  fixture.detectChanges();
  const swatch = fixture.nativeElement.querySelector('span') as HTMLElement;
  return swatch.className;
}

describe('TaskRowComponent.todayLabel', () => {
  function labelFor(minutes: number): string {
    const fixture = TestBed.createComponent(TaskRowComponent);
    fixture.componentRef.setInput('todayMinutes', minutes);
    fixture.detectChanges();
    return fixture.componentInstance.todayLabel();
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

describe('TaskRowComponent actions', () => {
  it('does not render a + sub button', () => {
    const fixture = TestBed.createComponent(TaskRowComponent);
    fixture.detectChanges();
    const labels = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .map((button) => button.textContent?.trim());
    expect(labels).not.toContain('+ sub');
    expect(labels).toContain('+ log');
    expect(labels).toContain('▶ start');
  });

  it('shows a collapsible subtask summary for parent tasks', () => {
    const fixture = TestBed.createComponent(TaskRowComponent);
    fixture.componentRef.setInput('name', 'Workout');
    fixture.componentRef.setInput('subtaskCount', 2);
    fixture.componentRef.setInput('expanded', true);
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('[aria-expanded]') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Collapse Workout subtasks');
    expect(fixture.nativeElement.textContent).toContain('2 sub');
  });

  it('keeps parent actions on one row instead of wrapping', () => {
    const fixture = TestBed.createComponent(TaskRowComponent);
    fixture.componentRef.setInput('subtaskCount', 2);
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('div') as HTMLElement;
    const classes = row.className.split(/\s+/);
    expect(classes).toContain('flex');
    expect(classes).not.toContain('flex-wrap');
    expect(classes).toContain('items-center');
  });

  it('emits when the subtask toggle is clicked', () => {
    const fixture = TestBed.createComponent(TaskRowComponent);
    fixture.componentRef.setInput('subtaskCount', 1);
    fixture.detectChanges();
    const emit = vi.spyOn(fixture.componentInstance.toggleSubtasks, 'emit');

    (fixture.nativeElement.querySelector('[aria-expanded]') as HTMLButtonElement).click();

    expect(emit).toHaveBeenCalledOnce();
  });
});

describe('TaskRowComponent swatch', () => {
  it('sizes parent swatches so the color is visible', () => {
    const classes = swatchClass().split(/\s+/);
    expect(classes).toContain('h-2.5');
    expect(classes).toContain('w-2.5');
  });

  it('uses a smaller swatch for subtasks', () => {
    const classes = swatchClass(true).split(/\s+/);
    expect(classes).toContain('h-2');
    expect(classes).toContain('w-2');
    expect(classes).not.toContain('h-2.5');
    expect(classes).not.toContain('w-2.5');
  });
});
