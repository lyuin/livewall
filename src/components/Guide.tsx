/**
 * 何も入っていないときの使い方の案内。
 * 見せるだけで操作は奪わないので、下にあるものへのクリックはそのまま通す。
 */
export default function Guide() {
  return (
    <div className="guide">
      <p className="guide__lead">
        <span aria-hidden="true">↑</span> Add streams
      </p>

      {/* 番号は枠の番号と同じ見た目にしている。数字の扱いを揃えると、
          手順の数字と枠の位置の数字が別物だと自然に読み分けられる。 */}
      <ol className="guide__steps">
        <li>
          <span className="guide__number">1</span>
          Copy the URL of a YouTube live stream
        </li>
        <li>
          <span className="guide__number">2</span>
          Paste it into the panel — one per line
        </li>
        <li>
          <span className="guide__number">3</span>
          Up to 9 streams, shown as 2 × 2 or 3 × 3
        </li>
      </ol>

      {/* このアプリで一番驚かれる仕組みなので先に伝える。
          後で「タブを閉じたら消えた」となるのを防ぐ。 */}
      <p className="guide__note">Your list lives in this tab&apos;s URL. Save the link to keep it.</p>
    </div>
  )
}
