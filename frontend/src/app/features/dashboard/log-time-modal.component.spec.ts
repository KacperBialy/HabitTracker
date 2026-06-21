import { LogTimeModalComponent } from './log-time-modal.component';

describe('LogTimeModalComponent', () => {
  function modal(): LogTimeModalComponent {
    const cmp = new LogTimeModalComponent();
    cmp.today = '2026-06-21';
    cmp.ngOnInit();
    return cmp;
  }

  describe('totalMinutes', () => {
    it('composes hours and minutes', () => {
      const cmp = modal();
      (cmp as any).hours = 1;
      (cmp as any).minutes = 12;
      expect(cmp.totalMinutes).toBe(72);
    });

    it('treats blank inputs as zero', () => {
      const cmp = modal();
      (cmp as any).hours = '' as unknown as number;
      (cmp as any).minutes = 45;
      expect(cmp.totalMinutes).toBe(45);
    });
  });

  describe('isValid bounds', () => {
    function validFor(hours: number, minutes: number): boolean {
      const cmp = modal();
      (cmp as any).hours = hours;
      (cmp as any).minutes = minutes;
      return cmp.isValid;
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
      (cmp as any).logDate = '';
      (cmp as any).minutes = 30;
      expect(cmp.isValid).toBe(false);
    });
  });

  describe('quick picks', () => {
    it('sets hours and minutes from a pick', () => {
      const cmp = modal();
      (cmp as any).applyPick({ label: '1h 30m', minutes: 90 });
      expect((cmp as any).hours).toBe(1);
      expect((cmp as any).minutes).toBe(30);
      expect((cmp as any).selectedPick).toBe(90);
    });
  });

  it('emits the composed minutes and date on save', () => {
    const cmp = modal();
    (cmp as any).hours = 0;
    (cmp as any).minutes = 45;
    let emitted: { minutes: number; logDate: string } | undefined;
    cmp.save.subscribe((payload) => (emitted = payload));

    (cmp as any).submit();

    expect(emitted).toEqual({ minutes: 45, logDate: '2026-06-21' });
  });
});
