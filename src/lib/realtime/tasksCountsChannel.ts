// src/lib/realtime/tasksCountsChannel.ts
import { createClient } from '@/lib/supabase/client';

// Realtime channel for broadcasting task count updates across the app.
export const tasksCountsChannel = createClient().channel('public:tasks_counts');

/**
 * Subscribe to task count updates.
 * The callback is invoked whenever the server broadcasts a `counts_update` event.
 * Clients should re-fetch the latest counts from the API endpoint.
 */
export const subscribeToTaskCounts = (callback: (payload: any) => void) => {
  tasksCountsChannel.on('broadcast', { event: 'counts_update' }, (payload) => callback(payload));
  tasksCountsChannel.subscribe();
};
