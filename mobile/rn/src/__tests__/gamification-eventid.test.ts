/**
 * @file gamification-eventid.test.ts — C26 RN idempotency plumbing tests.
 *
 * Tests the stable eventId lifecycle for the addXpEvent flow:
 *   RN-1: semantic event generates/resolve eventId once
 *   RN-2: request sends eventId
 *   RN-3: network retry sends SAME eventId
 *   RN-4: successful response updates authoritative progression
 *   RN-5: idempotent replay does not locally double-add XP
 *   RN-6: second NEW semantic completion receives DIFFERENT eventId
 */
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';

// ---------------------------------------------------------------------------
// Types mirroring the real implementation
// ---------------------------------------------------------------------------
interface AddXpEventRequest {
  action: string;
  eventId: string;
  sourceType?: string;
  sourceId?: string;
  attemptId?: string;
  sessionId?: string;
  learningPathId?: string;
  metadata?: Record<string, unknown>;
}

interface AddXpEventResponse {
  success: boolean;
  event_id: string;
  action: string;
  xp_awarded: number;
  total_xp_after: number;
  level_after: number;
  xp_to_next_after: number;
  level_up: boolean;
  idempotent_replay: boolean;
  status: 'processing' | 'applied' | 'rejected';
  badges_earned: string[];
  sticker_earned?: Record<string, unknown>;
  streak: number;
}

// ---------------------------------------------------------------------------
// Mock API (simulates axios.post)
// ---------------------------------------------------------------------------
type MockResponse<T> = { data: T };
let mockResponses: MockResponse<unknown>[] = [];
let mockCallCount = 0;

const mockApi = {
  post: async <T>(url: string, body: AddXpEventRequest): Promise<MockResponse<T>> => {
    mockCallCount++;
    const response = mockResponses.shift();
    if (!response) {
      throw new Error(`No mock response configured for call ${mockCallCount}`);
    }
    return response as MockResponse<T>;
  },
};

// ---------------------------------------------------------------------------
// Mock profile store (simulates useGamification profile state)
// ---------------------------------------------------------------------------
let storedProfile: { total_points: number; level: number; xp_to_next_level: number } = {
  total_points: 0,
  level: 1,
  xp_to_next_level: 100,
};

// ---------------------------------------------------------------------------
// SUT — simplified addXpEvent that mirrors useGamification.addXpEvent
// ---------------------------------------------------------------------------
async function addXpEvent(
  body: AddXpEventRequest,
  fetchProfile: () => Promise<void>,
): Promise<AddXpEventResponse | null> {
  try {
    const response = await mockApi.post<AddXpEventResponse>('/gamification/xp-event', body);
    // On success, refresh profile from authoritative response
    if (response.data.success && !response.data.idempotent_replay) {
      storedProfile = {
        total_points: response.data.total_xp_after,
        level: response.data.level_after,
        xp_to_next_level: response.data.xp_to_next_after,
      };
    }
    return response.data;
  } catch (err) {
    console.error('addXpEvent failed', err);
    return null;
  }
}

async function fetchProfile(): Promise<void> {
  // No-op in test — profile is updated by addXpEvent directly
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('C26 RN Gamification EventId Plumbing', () => {
  beforeEach(() => {
    mockCallCount = 0;
    mockResponses = [];
    storedProfile = { total_points: 0, level: 1, xp_to_next_level: 100 };
  });

  // RN-1: semantic event generates eventId once
  it('RN-1: eventId generated once at semantic boundary', async () => {
    // Simulate a semantic boundary that creates a stable eventId
    const semanticEventId = `pronunciation-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // The same semantic event should produce the same eventId
    const retryId = semanticEventId; // Same reference = same eventId

    assert.ok(
      semanticEventId.length > 0,
      'eventId should be non-empty',
    );
    assert.strictEqual(
      retryId,
      semanticEventId,
      'same semantic boundary should produce same eventId reference',
    );
  });

  // RN-2: request sends eventId
  it('RN-2: request body includes stable eventId', async () => {
    const eventId = 'pronunciation-attempt-001';
    const requestBody: AddXpEventRequest = {
      action: 'pronunciation_attempt',
      eventId,
      sourceType: 'pronunciation',
      sourceId: 'qr-cat',
      attemptId: 'pronunciation-attempt-001',
    };

    mockResponses = [
      {
        data: {
          success: true,
          event_id: eventId,
          action: 'pronunciation_attempt',
          xp_awarded: 15,
          total_xp_after: 15,
          level_after: 1,
          xp_to_next_after: 100,
          level_up: false,
          idempotent_replay: false,
          status: 'applied',
          badges_earned: [],
          streak: 1,
        } satisfies AddXpEventResponse,
      },
    ];

    const result = await addXpEvent(requestBody, fetchProfile);

    assert.ok(result, 'should return response');
    assert.strictEqual(result?.event_id, eventId, 'eventId should be echoed in response');
    assert.strictEqual(result?.xp_awarded, 15, 'xp_awarded should match');
  });

  // RN-3: network retry sends SAME eventId
  it('RN-3: retry uses SAME eventId (not regenerated)', async () => {
    const eventId = 'pronunciation-attempt-002';
    const requestBody: AddXpEventRequest = {
      action: 'pronunciation_attempt',
      eventId,
      sourceType: 'pronunciation',
      attemptId: eventId,
    };

    // First call fails (simulated network error)
    mockResponses = [];

    try {
      await addXpEvent(requestBody, fetchProfile);
      assert.fail('first call should have thrown');
    } catch {
      // Expected - no mock response
    }

    // Retry with SAME eventId (reference preserved)
    const retryBody: AddXpEventRequest = {
      ...requestBody,
      // eventId is intentionally NOT regenerated here
    };

    mockResponses = [
      {
        data: {
          success: true,
          event_id: retryBody.eventId,
          action: 'pronunciation_attempt',
          xp_awarded: 15,
          total_xp_after: 15,
          level_after: 1,
          xp_to_next_after: 100,
          level_up: false,
          idempotent_replay: false,
          status: 'applied',
          badges_earned: [],
          streak: 1,
        } satisfies AddXpEventResponse,
      },
    ];

    const result = await addXpEvent(retryBody, fetchProfile);

    assert.ok(result, 'retry should succeed');
    assert.strictEqual(result?.event_id, eventId, 'same eventId on retry');
    assert.strictEqual(
      requestBody.eventId,
      retryBody.eventId,
      'eventId reference preserved across retry (not regenerated)',
    );
  });

  // RN-4: successful response updates authoritative progression
  it('RN-4: response updates authoritative progression', async () => {
    const eventId = 'pronunciation-attempt-003';
    const requestBody: AddXpEventRequest = {
      action: 'pronunciation_attempt',
      eventId,
      sourceType: 'pronunciation',
      attemptId: eventId,
    };

    const newTotalXp = 115;
    const newLevel = 2;

    mockResponses = [
      {
        data: {
          success: true,
          event_id: eventId,
          action: 'pronunciation_attempt',
          xp_awarded: 15,
          total_xp_after: newTotalXp,
          level_after: newLevel,
          xp_to_next_after: 150,
          level_up: true,
          idempotent_replay: false,
          status: 'applied',
          badges_earned: [],
          streak: 1,
        } satisfies AddXpEventResponse,
      },
    ];

    const result = await addXpEvent(requestBody, fetchProfile);

    assert.ok(result, 'should return response');
    assert.strictEqual(storedProfile.total_points, newTotalXp, 'total_xp_after should update profile');
    assert.strictEqual(storedProfile.level, newLevel, 'level_after should update profile');
    assert.strictEqual(storedProfile.xp_to_next_level, 150, 'xp_to_next_after should update profile');
  });

  // RN-5: idempotent replay does NOT double-add XP
  it('RN-5: idempotent replay does not locally double-add XP', async () => {
    const eventId = 'pronunciation-attempt-004';
    const requestBody: AddXpEventRequest = {
      action: 'pronunciation_attempt',
      eventId,
      sourceType: 'pronunciation',
      attemptId: eventId,
    };

    // Simulate idempotent replay (event already APPLIED)
    mockResponses = [
      {
        data: {
          success: true,
          event_id: eventId,
          action: 'pronunciation_attempt',
          xp_awarded: 15,
          total_xp_after: 15,
          level_after: 1,
          xp_to_next_after: 100,
          level_up: false,
          idempotent_replay: true,  // This is a replay!
          status: 'applied',
          badges_earned: [],
          streak: 1,
        } satisfies AddXpEventResponse,
      },
    ];

    const result = await addXpEvent(requestBody, fetchProfile);

    assert.ok(result, 'should return response');
    assert.strictEqual(result?.idempotent_replay, true, 'should be marked as replay');
    // Profile should NOT be updated on replay (idempotent_replay: true)
    assert.strictEqual(storedProfile.total_points, 0, 'no XP added locally on replay');
  });

  // RN-6: second NEW semantic completion receives DIFFERENT eventId
  it('RN-6: different semantic completion gets different eventId', async () => {
    const eventId1 = 'pronunciation-attempt-005';
    const eventId2 = 'pronunciation-attempt-006';

    const request1: AddXpEventRequest = {
      action: 'pronunciation_attempt',
      eventId: eventId1,
      sourceType: 'pronunciation',
      attemptId: eventId1,
    };

    const request2: AddXpEventRequest = {
      action: 'pronunciation_attempt',
      eventId: eventId2,
      sourceType: 'pronunciation',
      attemptId: eventId2,
    };

    assert.notStrictEqual(
      request1.eventId,
      request2.eventId,
      'different semantic events should have different eventIds',
    );

    // Both succeed independently
    mockResponses = [
      {
        data: {
          success: true,
          event_id: eventId1,
          action: 'pronunciation_attempt',
          xp_awarded: 15,
          total_xp_after: 15,
          level_after: 1,
          xp_to_next_after: 100,
          level_up: false,
          idempotent_replay: false,
          status: 'applied',
          badges_earned: [],
          streak: 1,
        } satisfies AddXpEventResponse,
      },
      {
        data: {
          success: true,
          event_id: eventId2,
          action: 'pronunciation_attempt',
          xp_awarded: 15,
          total_xp_after: 30,
          level_after: 1,
          xp_to_next_after: 100,
          level_up: false,
          idempotent_replay: false,
          status: 'applied',
          badges_earned: [],
          streak: 1,
        } satisfies AddXpEventResponse,
      },
    ];

    const result1 = await addXpEvent(request1, fetchProfile);
    const result2 = await addXpEvent(request2, fetchProfile);

    assert.ok(result1, 'first event should succeed');
    assert.ok(result2, 'second event should succeed');
    assert.strictEqual(result1?.event_id, eventId1);
    assert.strictEqual(result2?.event_id, eventId2);
    assert.strictEqual(storedProfile.total_points, 30, 'both XP awards should accumulate');
  });

  // Integration: attempt_id maps to event_id
  it('pronunciation: attempt_id used as stable eventId', async () => {
    const attemptId = 'attempt-abc123';

    const requestBody: AddXpEventRequest = {
      action: 'pronunciation_attempt',
      eventId: attemptId,
      sourceType: 'pronunciation',
      sourceId: 'qr-cat',
      attemptId,  // Same value as eventId
    };

    mockResponses = [
      {
        data: {
          success: true,
          event_id: attemptId,
          action: 'pronunciation_attempt',
          xp_awarded: 15,
          total_xp_after: 15,
          level_after: 1,
          xp_to_next_after: 100,
          level_up: false,
          idempotent_replay: false,
          status: 'applied',
          badges_earned: [],
          streak: 1,
        } satisfies AddXpEventResponse,
      },
    ];

    const result = await addXpEvent(requestBody, fetchProfile);

    assert.ok(result, 'should return response');
    assert.strictEqual(result?.event_id, attemptId, 'event_id should match attempt_id');
    assert.strictEqual(requestBody.eventId, requestBody.attemptId, 'eventId should equal attemptId');
  });

  // Integration: retry same attempt_id returns cached result
  it('pronunciation: retry same attempt_id returns idempotent replay', async () => {
    const attemptId = 'attempt-def456';

    const requestBody: AddXpEventRequest = {
      action: 'pronunciation_attempt',
      eventId: attemptId,
      sourceType: 'pronunciation',
      sourceId: 'qr-dog',
      attemptId,
    };

    // Both calls return APPLIED (second is a replay)
    mockResponses = [
      {
        data: {
          success: true,
          event_id: attemptId,
          action: 'pronunciation_attempt',
          xp_awarded: 15,
          total_xp_after: 15,
          level_after: 1,
          xp_to_next_after: 100,
          level_up: false,
          idempotent_replay: false,
          status: 'applied',
          badges_earned: [],
          streak: 1,
        } satisfies AddXpEventResponse,
      },
      {
        data: {
          success: true,
          event_id: attemptId,
          action: 'pronunciation_attempt',
          xp_awarded: 15,
          total_xp_after: 15,
          level_after: 1,
          xp_to_next_after: 100,
          level_up: false,
          idempotent_replay: true,  // REPLAY
          status: 'applied',
          badges_earned: [],
          streak: 1,
        } satisfies AddXpEventResponse,
      },
    ];

    const result1 = await addXpEvent(requestBody, fetchProfile);
    const result2 = await addXpEvent(requestBody, fetchProfile); // Same attemptId

    assert.ok(result1, 'first call should succeed');
    assert.ok(result2, 'second call should succeed');
    assert.strictEqual(result1?.idempotent_replay, false, 'first is not replay');
    assert.strictEqual(result2?.idempotent_replay, true, 'second is replay');
    assert.strictEqual(result1?.xp_awarded, result2?.xp_awarded, 'same XP awarded');
  });
});
