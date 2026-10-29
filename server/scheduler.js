import { storage } from './storage.js';
import { ScannerService } from './scanner.js';

let intervalId = null;

export function calculateNextRun(frequency, fromDate = new Date()) {
  const d = new Date(fromDate);
  switch (frequency) {
    case 'Daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'Weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'Monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'Once':
      return null;
    default:
      d.setDate(d.getDate() + 7);
  }
  return d.toISOString();
}

/**
 * Background scheduler daemon that checks for due scan jobs every 30 seconds.
 */
export function startSchedulerDaemon() {
  if (intervalId) return;

  console.log('[Scheduler] Background scanning daemon initialized.');

  const checkSchedules = async () => {
    try {
      const schedules = await storage.getAllSchedules();
      const now = new Date();

      for (const schedule of schedules) {
        if (!schedule.enabled) continue;
        if (!schedule.nextRunAt) continue;

        const nextRun = new Date(schedule.nextRunAt);
        if (nextRun <= now) {
          console.log(`[Scheduler] Triggering scheduled scan for ${schedule.url} (${schedule.frequency})`);

          schedule.lastRunAt = now.toISOString();
          schedule.lastRunStatus = 'Running';

          try {
            const scan = await ScannerService.startScan({
              url: schedule.url,
              type: schedule.type || 'Custom Scan',
              maxPages: schedule.pages || 10,
              additionalUrls: schedule.urls || [],
              allowLocalhost: schedule.allowLocalhost || false,
            });

            schedule.lastRunStatus = 'Queued';
            schedule.lastScanId = scan.id;
          } catch (scanErr) {
            console.error(`[Scheduler] Failed to trigger scan for schedule ${schedule.id}:`, scanErr);
            schedule.lastRunStatus = `Failed: ${scanErr.message}`;
          }

          // Advance next run
          if (schedule.frequency === 'Once') {
            schedule.enabled = false;
            schedule.nextRunAt = null;
          } else {
            schedule.nextRunAt = calculateNextRun(schedule.frequency, now);
          }

          await storage.saveSchedule(schedule);
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error checking schedules:', err);
    }
  };

  // Run initial check after 5 seconds, then every 30 seconds
  setTimeout(checkSchedules, 5000);
  intervalId = setInterval(checkSchedules, 30000);
}

export function stopSchedulerDaemon() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
