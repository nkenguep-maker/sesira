import { ActivityTimeline } from "@/components/sesira/activity-timeline";
import {
  buildBusinessTimeline,
  type BusinessEvent,
  type BusinessTimelineEntity,
  type BusinessTimelineScope,
} from "@/lib/events/business-timeline";

export function BusinessTimeline({
  events,
  organizationId,
  scopes,
  entities,
  actorNames,
  viewerUserId,
  empty,
  className,
}: {
  events: BusinessEvent[];
  organizationId: string;
  scopes: BusinessTimelineScope[];
  entities?: BusinessTimelineEntity[];
  actorNames?: Record<string, string>;
  viewerUserId?: string;
  empty: string;
  className?: string;
}) {
  const items = buildBusinessTimeline(events, {
    organizationId,
    scopes,
    entities,
    actorNames,
    viewerUserId,
  });

  return <ActivityTimeline items={items} empty={empty} className={className} />;
}
