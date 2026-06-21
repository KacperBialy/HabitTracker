import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Task, DayEntry, TimeLog } from './models';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);

  list(): Observable<Task[]> {
    return this.http.get<Task[]>('/api/tasks');
  }

  create(name: string): Observable<Task> {
    return this.http.post<Task>('/api/tasks', { name });
  }

  dayEntries(date: string): Observable<DayEntry[]> {
    return this.http.get<DayEntry[]>(`/api/tasks/timelogs/aggregates/${date}`);
  }

  logTime(taskId: string, minutes: number, logDate: string): Observable<TimeLog> {
    return this.http.post<TimeLog>(`/api/tasks/${taskId}/timelogs`, { minutes, logDate });
  }
}
