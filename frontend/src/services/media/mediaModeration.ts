export interface MediaAuditEvent {
  action: string;
  mediaId: string;
  timestamp: number;
  result: 'passed' | 'blocked' | 'needs_review';
}

export function moderateMediaPlaceholder(mediaId: string): MediaAuditEvent {
  return {
    action: 'media_moderation_placeholder',
    mediaId,
    timestamp: Date.now(),
    result: 'passed',
  };
}
