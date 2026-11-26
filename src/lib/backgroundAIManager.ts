// ============================================================
//  backgroundAIManager.ts — Persistent In-Flight AI Request Hub
//  Ensures AI requests (mood analysis, chat responses, voice transcription,
//  advice, CBT reflection, summaries) survive screen/component unmounts,
//  persists completed results into localStorage and top-level storage,
//  and broadcasts live execution status across the application.
// ============================================================

export type AITaskCategory =
  | 'mood_analysis'
  | 'voice_transcription'
  | 'diary_chat'
  | 'smart_advisor'
  | 'cbt_reflection'
  | 'habit_evaluation'
  | 'general_ai';

export interface BackgroundAITask {
  id: string;
  category: AITaskCategory;
  title: string;
  targetId?: string; // e.g. diaryId, recordingId, etc.
  status: 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  result?: any;
  error?: string;
}

type AIListener = (tasks: BackgroundAITask[]) => void;

class BackgroundAIManager {
  private tasks: Map<string, BackgroundAITask> = new Map();
  private listeners: Set<AIListener> = new Set();
  private storageKey = 'yawmiyati_active_ai_tasks';

  constructor() {
    this.restoreFromStorage();
  }

  private restoreFromStorage() {
    try {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed: BackgroundAITask[] = JSON.parse(raw);
        const now = Date.now();
        parsed.forEach(t => {
          // If task was running and was older than 3 minutes, mark as timed-out/failed
          if (t.status === 'running' && (now - t.startedAt > 180000)) {
            t.status = 'failed';
            t.error = 'انتهت مهلة الطلب السابقة';
          }
          this.tasks.set(t.id, t);
        });
      }
    } catch (e) {
      console.warn('[BackgroundAIManager] restore error:', e);
    }
  }

  private saveToStorage() {
    try {
      if (typeof window === 'undefined') return;
      const arr = Array.from(this.tasks.values()).slice(-20); // Keep last 20 tasks
      localStorage.setItem(this.storageKey, JSON.stringify(arr));
    } catch (e) {
      console.warn('[BackgroundAIManager] save error:', e);
    }
  }

  public subscribe(listener: AIListener): () => void {
    this.listeners.add(listener);
    listener(this.getAllTasks());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.saveToStorage();
    const all = this.getAllTasks();
    this.listeners.forEach(l => {
      try {
        l(all);
      } catch (err) {
        console.error('[BackgroundAIManager] listener err:', err);
      }
    });
  }

  public getAllTasks(): BackgroundAITask[] {
    return Array.from(this.tasks.values());
  }

  public getRunningTasks(): BackgroundAITask[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'running');
  }

  public hasRunningTasks(): boolean {
    return this.getRunningTasks().length > 0;
  }

  public startTask(task: {
    id: string;
    category: AITaskCategory;
    title: string;
    targetId?: string;
  }): BackgroundAITask {
    const entry: BackgroundAITask = {
      ...task,
      status: 'running',
      startedAt: Date.now()
    };
    this.tasks.set(entry.id, entry);
    this.notify();
    return entry;
  }

  public completeTask(taskId: string, result?: any) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'completed';
      task.completedAt = Date.now();
      task.result = result;
      this.notify();
    }
  }

  public failTask(taskId: string, error?: string) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'failed';
      task.completedAt = Date.now();
      task.error = error || 'حدث خطأ أثناء معالجة الطلب';
      this.notify();
    }
  }

  public dismissTask(taskId: string) {
    if (this.tasks.delete(taskId)) {
      this.notify();
    }
  }

  public clearCompleted() {
    for (const [id, t] of this.tasks.entries()) {
      if (t.status !== 'running') {
        this.tasks.delete(id);
      }
    }
    this.notify();
  }
}

export const backgroundAIManager = new BackgroundAIManager();
