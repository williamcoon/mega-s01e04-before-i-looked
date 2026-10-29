import type { Night } from '../digest/types.js';

// Rows with 3+ retries or a last status of fail get the .warn class (styleguide palette) and a
// text flag, so the mark survives without colour.
export function DigestPage({ night }: { night: Night }) {
  const rows = [...night.rows].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return (
    <>
      <h1>digest · {night.night}</h1>
      {night.badLines > 0 && (
        <p class="warn">
          {night.badLines} {night.badLines === 1 ? 'line' : 'lines'} didn't parse
        </p>
      )}
      {rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last</th>
              <th>flag</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const flags = [
                ...(r.retries >= 3 ? ['retries'] : []),
                ...(r.lastStatus === 'fail' ? ['fail'] : []),
              ];
              return (
                <tr class={flags.length > 0 ? 'warn' : undefined}>
                  <td>{r.job}</td>
                  <td>{r.owner ?? '—'}</td>
                  <td>{r.runs}</td>
                  <td>{r.retries}</td>
                  <td>{r.lastStatus}</td>
                  <td>{flags.join(' · ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
