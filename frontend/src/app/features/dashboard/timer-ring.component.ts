import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-timer-ring',
  template: `
    <div class="relative" [style.width.rem]="diameter()" [style.height.rem]="diameter()">
      <svg [attr.viewBox]="viewBox()" width="100%" height="100%" class="ring">
        <circle [attr.cx]="center()" [attr.cy]="center()" [attr.r]="radius()"
                class="track" stroke-width="6" />
        <circle [attr.cx]="center()" [attr.cy]="center()" [attr.r]="radius()"
                class="prog" stroke-width="6"
                [attr.stroke-dasharray]="circumference()"
                [attr.stroke-dashoffset]="dashOffset()" />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <div class="display leading-none tabular-nums" [style.font-size.rem]="diameter() * 0.28">{{ label() }}</div>
        @if (sub()) {
          <div class="text-muted mt-1 text-[0.8125rem] leading-none">{{ sub() }}</div>
        }
      </div>
    </div>
  `,
})
export class TimerRingComponent {
  readonly diameter = input(13.75);
  readonly progress = input(0.62);
  readonly label = input('24:18');
  readonly sub = input('running');

  private readonly box = 220;
  protected readonly center = computed(() => this.box / 2);
  protected readonly radius = computed(() => this.box / 2 - 10);
  protected readonly circumference = computed(() => 2 * Math.PI * this.radius());
  protected readonly dashOffset = computed(() => this.circumference() * (1 - this.progress()));
  protected readonly viewBox = computed(() => `0 0 ${this.box} ${this.box}`);
}
