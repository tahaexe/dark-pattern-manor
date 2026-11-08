import type { Ref } from 'preact';
import Lantern from './Lantern';

export interface RoomInstructionsProps {
  /** The room's display name, e.g. "The Foyer". */
  name: string;
  /** The room's task string, e.g. "reject the cookies". */
  task: string;
  /** The large current-step line for this state. */
  stepLine: string;
  /** True when stuck help is active: glow the lantern, show the help suffix. */
  stuck: boolean;
  /** Raise the lantern (light the trick). */
  onLantern: () => void;
  /** True only while the room is haunted, so the L key is live. */
  lanternKeyActive: boolean;
  /** Focus target: the heading that labels the current state, for focus moves. */
  headingRef: Ref<HTMLHeadingElement>;
}

/**
 * The single instruction card under the bar. A small first line names the room
 * and the task; the large line is the current step (plus a stuck-help suffix
 * when stuck); the lantern sits on the right with its visible "Lantern / hint"
 * label. The level-1 heading carries the room name for focus on state changes.
 */
export default function RoomInstructions({
  name,
  task,
  stepLine,
  stuck,
  onLantern,
  lanternKeyActive,
  headingRef,
}: RoomInstructionsProps) {
  return (
    <div class="room-instructions">
      <div class="room-instructions-text">
        <p class="room-instructions-meta">
          <span class="room-instructions-name">{name}</span>
          <span class="room-instructions-task"> · Your task: {task}</span>
        </p>
        <h1 class="room-step" tabIndex={-1} ref={headingRef}>
          {stepLine}
          {stuck ? ' Stuck? Light the lantern.' : ''}
        </h1>
      </div>
      <Lantern onLantern={onLantern} keyActive={lanternKeyActive} stuck={stuck} />
    </div>
  );
}
