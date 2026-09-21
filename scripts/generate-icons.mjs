// PWA / ホーム画面用のアイコンを生成する。
// アプリの見た目そのまま（黒地に 3x3 のグリッド）なので外部の画像素材に依存しない。
// PNG を自分で組み立てているのは、画像ライブラリを 1 つ増やさずに済ませるため。
// 依存は Node 標準の zlib と fs だけ。
//
// 使い方: npm run icons

import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const BACKGROUND = [0x00, 0x00, 0x00]
const CELL = [0xff, 0xff, 0xff]

// maskable アイコンは外周を切り落とされるので、中身を中央 80% 程度に収める
const PADDING_RATIO = 0.14
const GAP_RATIO = 0.05

const TARGETS = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  // iPad のホーム画面が使うのはこれ。180x180 が指定サイズ。
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of TARGETS) {
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, name), encodePng(size, size, drawGridIcon(size)))
  console.log(`${name} (${size}x${size})`)
}

/**
 * 黒地に 3x3 の白い四角を描き、RGB のピクセル配列を返す。
 */
function drawGridIcon(size) {
  const padding = Math.round(size * PADDING_RATIO)
  const gap = Math.round(size * GAP_RATIO)
  const cell = (size - padding * 2 - gap * 2) / 3

  const pixels = new Uint8Array(size * size * 3)
  for (let i = 0; i < size * size; i++) {
    pixels.set(BACKGROUND, i * 3)
  }

  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      const left = Math.round(padding + column * (cell + gap))
      const top = Math.round(padding + row * (cell + gap))
      fillRect(pixels, size, left, top, Math.round(cell), Math.round(cell))
    }
  }
  return pixels
}

function fillRect(pixels, size, left, top, width, height) {
  for (let y = top; y < top + height && y < size; y++) {
    for (let x = left; x < left + width && x < size; x++) {
      pixels.set(CELL, (y * size + x) * 3)
    }
  }
}

/**
 * RGB のピクセル配列を PNG のバイト列にする。
 * 無圧縮フィルタ + zlib という最小構成。アイコン程度のサイズでは十分小さくなる。
 */
function encodePng(width, height, pixels) {
  // 各行の先頭にフィルタ種別のバイト（0 = フィルタなし）が必要
  const raw = Buffer.alloc(height * (1 + width * 3))
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3)
    raw[rowStart] = 0
    Buffer.from(pixels.subarray(y * width * 3, (y + 1) * width * 3)).copy(raw, rowStart + 1)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // ビット深度
  ihdr[9] = 2 // カラータイプ 2 = トゥルーカラー（RGB）
  ihdr[10] = 0 // 圧縮方式
  ihdr[11] = 0 // フィルタ方式
  ihdr[12] = 0 // インターレースなし

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)

  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])

  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(body))

  return Buffer.concat([length, body, checksum])
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}
