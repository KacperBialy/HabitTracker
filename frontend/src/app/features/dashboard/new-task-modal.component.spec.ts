import { TestBed } from '@angular/core/testing';

import { NewTaskModalComponent } from './new-task-modal.component';
import { TaskColor } from '../../core/task-colors';

describe('NewTaskModalComponent', () => {
  function build(parentTaskId: string | null = null, parentName: string | null = null) {
    const fixture = TestBed.createComponent(NewTaskModalComponent);
    fixture.componentRef.setInput('parentTaskId', parentTaskId);
    fixture.componentRef.setInput('parentName', parentName);
    fixture.detectChanges();
    return fixture;
  }

  it('defaults to a root task with a color picker', () => {
    const fixture = build();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.display')?.textContent).toContain('New task');
    expect(root.querySelectorAll('button[aria-label^="Color "]').length).toBeGreaterThan(0);
  });

  it('switches title for a subtask and still shows color buttons', () => {
    const fixture = build('parent-id', 'Reading');
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.display')?.textContent).toContain('New subtask');
    expect(root.textContent).toContain('under Reading');
    expect(root.querySelectorAll('button[aria-label^="Color "]').length).toBeGreaterThan(0);
  });

  it('emits parentTaskId on create', () => {
    const fixture = build('parent-id', 'Reading');
    const emitted: { name: string; color: TaskColor; parentTaskId: string | null }[] = [];
    fixture.componentInstance.create.subscribe((payload) => emitted.push(payload));

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'Chapter 1';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.btn.primary') as HTMLButtonElement).click();

    expect(emitted).toEqual([{ name: 'Chapter 1', color: TaskColor.Slate, parentTaskId: 'parent-id' }]);
  });
});
