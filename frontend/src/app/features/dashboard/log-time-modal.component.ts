import { Component, OnInit, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface QuickPick {
  label: string;
  minutes: number;
}

export interface LogTimePayload {
  minutes: number;
  logDate: string;
}

const MAX_MINUTES = 1440;

/** Manual time-log entry for a single task. Ported from the ManualLog wireframe (no note field). */
@Component({
  selector: 'app-log-time-modal',
  imports: [FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/15" (click)="cancel.emit()">
      <div class="box w-96 p-5 shadow-[4px_6px_0_rgba(0,0,0,0.12)]" (click)="$event.stopPropagation()">
        <div class="display mb-4 text-2xl">Log time</div>

        <div class="flex flex-col gap-3">
          <!-- Task (fixed — launched per row) -->
          <div>
            <div class="mb-1 text-[13px]">Task</div>
            <div class="flex items-center rounded-[6px_9px_5px_8px/8px_5px_9px_6px]
                        border-[1.4px] border-rule px-2.5 py-2">
              <span class="mr-2 h-3 w-3 rounded-[2px] bg-muted"></span>
              <span class="min-w-0 flex-1 truncate">{{ taskName() }}</span>
            </div>
          </div>

          <div class="flex gap-3">
            <!-- Date -->
            <div class="flex-1">
              <div class="mb-1 text-[13px]">Date</div>
              <input type="date" class="box thin w-full px-2.5 py-2 text-sm outline-none"
                     [(ngModel)]="logDate" [max]="todayMax" />
            </div>
            <!-- Duration -->
            <div class="flex-1">
              <div class="mb-1 text-[13px]">Duration</div>
              <div class="flex items-center gap-1.5 rounded-[6px_9px_5px_8px/8px_5px_9px_6px]
                          border-[1.4px] border-rule px-2.5 py-2">
                <input type="number" min="0" max="24" class="display w-8 bg-transparent text-lg outline-none"
                       [(ngModel)]="hours" (ngModelChange)="onManualEdit()" />
                <span class="text-muted">h</span>
                <input type="number" min="0" max="59" class="display w-8 bg-transparent text-lg outline-none"
                       [(ngModel)]="minutes" (ngModelChange)="onManualEdit()" />
                <span class="text-muted">min</span>
              </div>
            </div>
          </div>

          <!-- Quick picks -->
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-muted self-center text-xs">quick:</span>
            @for (pick of quickPicks; track pick.minutes) {
              <span class="pill" [class.active]="selectedPick === pick.minutes" (click)="applyPick(pick)">
                {{ pick.label }}
              </span>
            }
          </div>

          @if (error()) {
            <div class="text-accent text-[13px]">{{ error() }}</div>
          }

          <div class="mt-1 flex justify-end gap-2">
            <button type="button" class="btn" (click)="cancel.emit()">Cancel</button>
            <button type="button" class="btn primary" [disabled]="!isValid" (click)="submit()">
              Save entry
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LogTimeModalComponent implements OnInit {
  readonly taskName = input('');
  readonly today = input('');
  readonly error = input('');

  readonly save = output<LogTimePayload>();
  readonly cancel = output<void>();

  protected hours = 0;
  protected minutes = 0;
  protected logDate = '';
  protected selectedPick: number | null = null;

  protected readonly quickPicks: QuickPick[] = [
    { label: '15m', minutes: 15 },
    { label: '25m', minutes: 25 },
    { label: '30m', minutes: 30 },
    { label: '45m', minutes: 45 },
    { label: '1h', minutes: 60 },
    { label: '1h 30m', minutes: 90 },
  ];

  ngOnInit(): void {
    this.logDate = this.today();
  }

  protected get todayMax(): string {
    return this.today();
  }

  /** hours*60 + minutes, treating blank/NaN inputs as 0. */
  get totalMinutes(): number {
    const hours = Number(this.hours) || 0;
    const minutes = Number(this.minutes) || 0;
    return hours * 60 + minutes;
  }

  get isValid(): boolean {
    const total = this.totalMinutes;
    return total >= 1 && total <= MAX_MINUTES && !!this.logDate;
  }

  protected applyPick(pick: QuickPick): void {
    this.hours = Math.floor(pick.minutes / 60);
    this.minutes = pick.minutes % 60;
    this.selectedPick = pick.minutes;
  }

  /** A manual edit deselects the active quick-pick chip. */
  protected onManualEdit(): void {
    this.selectedPick = this.totalMinutes;
    if (!this.quickPicks.some((pick) => pick.minutes === this.selectedPick)) {
      this.selectedPick = null;
    }
  }

  protected submit(): void {
    if (this.isValid) {
      this.save.emit({ minutes: this.totalMinutes, logDate: this.logDate });
    }
  }
}
