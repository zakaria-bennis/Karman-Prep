import React from 'react';
import {Composition, Folder} from 'remotion';
import {Clip, CLIP_FRAMES, GROUNDS, type ClipKind, type Ratio} from './Clip';
import {Feature} from './features/Feature';
import {CLIPS, type FeatureKind} from './features/clips';

// Programmatic registration on purpose: each family is one template
// (clips x 2 ratios x 3 grounds) and is never edited one by one.
// The quiz-engine clips (Clip.tsx) and the feature clips in the iPhone frame (features/).
const KINDS: ClipKind[] = ['d10-right', 'd10-wrong', 'handoff'];
const RATIOS: Ratio[] = ['16x9', '9x16'];
const FEATURES = Object.keys(CLIPS) as FeatureKind[];

export const RemotionRoot: React.FC = () => (
  <>
    {KINDS.map((kind) => (
      <Folder key={kind} name={kind}>
        {RATIOS.flatMap((ratio) =>
          (Object.keys(GROUNDS) as (keyof typeof GROUNDS)[]).map((ground) => (
            <Composition
              key={`${kind}-${ratio}-${ground}`}
              id={`${kind}-${ratio}-${ground}`}
              component={Clip}
              durationInFrames={CLIP_FRAMES[kind]}
              fps={30}
              width={ratio === '16x9' ? 1920 : 1080}
              height={ratio === '16x9' ? 1080 : 1920}
              defaultProps={{kind, ratio, ground}}
            />
          )),
        )}
      </Folder>
    ))}
    {FEATURES.map((kind) => (
      <Folder key={kind} name={kind}>
        {RATIOS.flatMap((ratio) =>
          (Object.keys(GROUNDS) as (keyof typeof GROUNDS)[]).map((ground) => (
            <Composition
              key={`${kind}-${ratio}-${ground}`}
              id={`${kind}-${ratio}-${ground}`}
              component={Feature}
              durationInFrames={CLIPS[kind].frames}
              fps={30}
              width={ratio === '16x9' ? 1920 : 1080}
              height={ratio === '16x9' ? 1080 : 1920}
              defaultProps={{kind, ratio, ground}}
            />
          )),
        )}
      </Folder>
    ))}
  </>
);
