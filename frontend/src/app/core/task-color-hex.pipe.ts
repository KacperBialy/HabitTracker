import { Pipe, PipeTransform } from '@angular/core';

import { TASK_COLOR_HEX, TaskColor } from './task-colors';

/** Maps a TaskColor to its swatch hex. Pure — Angular memoizes per input, so no per-CD recompute. */
@Pipe({ name: 'taskColorHex' })
export class TaskColorHexPipe implements PipeTransform {
  transform(color: TaskColor): string {
    return TASK_COLOR_HEX[color];
  }
}
