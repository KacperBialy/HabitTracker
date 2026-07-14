import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Task, DayEntry, TimeLog, YearAggregates } from './models';
import { TaskColor } from './task-colors';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);

  list(): Observable<Task[]> {
    return this.http.get<Task[]>('/api/tasks');
  }

  create(name: string, color: TaskColor): Observable<Task> {
    return this.http.post<Task>('/api/tasks', { name, color });
  }

  delete(taskId: string): Observable<void> {
    return this.http.delete<void>(`/api/tasks/${taskId}`);
  }

  dayEntries(date: string): Observable<DayEntry[]> {
    return this.http.get<DayEntry[]>(`/api/tasks/timelogs/aggregates/${date}`);
  }

  logTime(taskId: string, minutes: number, logDate: string): Observable<TimeLog> {
    return this.http.post<TimeLog>(`/api/tasks/${taskId}/timelogs`, { minutes, logDate });
  }

  yearAggregates(year: number): Observable<YearAggregates> {
    return this.http.get<YearAggregates>('/api/tasks/timelogs/aggregates', { params: { year } });
  }
}
