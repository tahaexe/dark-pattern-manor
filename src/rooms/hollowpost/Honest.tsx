import type { HonestProps } from '../../engine/types';
import './room.css';

/**
 * Hollowpost Tickets, honest. The same ticket page, but there is no countdown
 * at all: the price, the date of the concert and the real deadline are plain
 * text — "Tickets on sale until 31 October", a fixed calendar date that does
 * not move (the real best practice, no Fake urgency). Nothing pushes you to
 * decide now, so buying the ticket without rushing takes one click: pressing
 * the calm "Buy ticket" button.
 */
export default function Honest({ onCompleteTask }: HonestProps) {
  return (
    <div class="hollowpost hollowpost-honest">
      <div class="hollowpost-header">
        <p class="hollowpost-address">hollowpost.manor</p>
        <h2 class="hollowpost-masthead">Hollowpost Tickets</h2>
        <p class="hollowpost-tagline">One night only — a midnight séance, sung</p>
      </div>

      <div class="ticket-card">
        <div class="ticket-body">
          <p class="ticket-event">The Hollowpost Séance, All Hallows' Eve, midnight</p>
          <p class="ticket-price">£42 a ticket</p>

          {/* The real deadline: a fixed calendar date, plain text, no clock. */}
          <p class="ticket-sale-date">Tickets on sale until 31 October</p>

          {/* The single task action: buying the ticket, calmly, in one click. */}
          <button class="ticket-buy-honest" type="button" onClick={() => onCompleteTask()}>
            Buy ticket
          </button>
        </div>
      </div>
    </div>
  );
}
