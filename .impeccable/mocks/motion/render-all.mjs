// Renders every clip into out/: <id>.mp4 (H.264, yuv420p, CRF 23, faststart)
// and <id>.webp (poster = frame 0). Usage: node render-all.mjs [filter,filter...]
import {execFileSync} from 'node:child_process';
import {mkdirSync, renameSync, rmSync, statSync} from 'node:fs';

const filters = (process.argv[2] ?? '').split(',');
const kinds = ['d10-right', 'd10-wrong', 'handoff', 'dashboard', 'calendar', 'd10-finish', 'progress-rewards', 'parent-update', 'tour'];
const ratios = ['16x9', '9x16'];
const grounds = ['marigold', 'pine', 'night'];
const ids = kinds.flatMap((k) => ratios.flatMap((r) => grounds.map((g) => `${k}-${r}-${g}`))).filter((id) => filters.some((f) => id.includes(f)));

const run = (cmd, args) => execFileSync(cmd, args, {stdio: ['ignore', 'ignore', 'inherit']});
mkdirSync('out', {recursive: true});
mkdirSync('.cache/tmp', {recursive: true});

run('npx', ['remotion', 'bundle', 'src/index.ts', '--out-dir', '.cache/bundle']);

for (const id of ids) {
  const raw = `.cache/tmp/${id}.mp4`;
  run('npx', ['remotion', 'render', '.cache/bundle', id, raw, '--codec=h264', '--crf=23', '--pixel-format=yuv420p', '--muted', '--log=error']);
  run('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-c', 'copy', '-movflags', '+faststart', `.cache/tmp/${id}.fs.mp4`]);
  renameSync(`.cache/tmp/${id}.fs.mp4`, `out/${id}.mp4`);
  rmSync(raw);
  run('npx', ['remotion', 'still', '.cache/bundle', id, `out/${id}.webp`, '--frame=0', '--image-format=webp', '--log=error']);
  console.log(id, (statSync(`out/${id}.mp4`).size / 1e6).toFixed(2), 'MB');
}
