import { Component, Input, computed, signal } from '@angular/core';

@Component({
  selector: 'app-timer-ring',
  template: `
    <div class="relative" [style.width.rem]="diameterRem()" [style.height.rem]="diameterRem()">
      <svg [attr.viewBox]="viewBox()" width="100%" height="100%" class="ring">
        <circle [attr.cx]="center()" [attr.cy]="center()" [attr.r]="radius()"
                class="track" stroke-width="6" />
        <circle [attr.cx]="center()" [attr.cy]="center()" [attr.r]="radius()"
                class="prog" stroke-width="6"
                [attr.stroke-dasharray]="circumference()"
                [attr.stroke-dashoffset]="dashOffset()" />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <div class="display leading-none" [style.font-size.rem]="diameterRem() * 0.28">{{ label }}</div>
        <div class="text-muted mt-1 text-[0.8125rem]">{{ sub }}</div>
      </div>
    </div>
  `,
})
export class TimerRingComponent {
  @Input() set diameter(value: number) {
    this.diameterRem.set(value);
  }
  @Input() progress = 0.62;
  @Input() label = '24:18';
  @Input() sub = 'running';

  protected readonly diameterRem = signal(13.75);

  private readonly box = 220;
  protected readonly center = computed(() => this.box / 2);
  protected readonly radius = computed(() => this.box / 2 - 10);
  protected readonly circumference = computed(() => 2 * Math.PI * this.radius());
  protected readonly dashOffset = computed(() => this.circumference() * (1 - this.progress));
  protected readonly viewBox = computed(() => `0 0 ${this.box} ${this.box}`);
}
