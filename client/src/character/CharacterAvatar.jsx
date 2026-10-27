// client/src/character/CharacterAvatar.jsx
import React from 'react';
import { defaultAppearance, normalizeAppearance } from './schema.js';
import AvatarIllustration from './AvatarIllustration.jsx';
import './avatar-base.css';
import './avatar-effects.css';
import './avatar-compat.css';
import './avatar-illustration.css';

export default function CharacterAvatar({ appearance, compact = false }) {
  const look = normalizeAppearance(appearance || defaultAppearance());
  const { palette, face, hair, body, outfit, fx } = look;
  const style = {
    '--skin': palette.skin,
    '--skin-shadow': palette.skinShadow,
    '--hair': palette.hair,
    '--hair-highlight': palette.hairHighlight,
    '--outfit': palette.outfit,
    '--outfit-deep': palette.outfitDeep,
    '--accent': palette.accent,
    '--eye': face.eyeColor || palette.eye,
    '--lip': palette.lip
  };
  const bubble = appearance?.moodBubble || appearance?.fx?.moodBubble;
  const rootClass = [
    'layered-avatar',
    'form-human',
    'render-portrait',
    compact ? 'compact' : '',
    `face-${face.shape}`,
    `brow-${face.brow}`,
    `eyes-${face.eyeStyle}`,
    `expression-${face.expression}`,
    `cheeks-${face.cheek}`,
    `hair-${hair.style}`,
    `build-${body.build}`,
    `pose-${body.pose}`,
    `silhouette-${body.silhouette}`,
    `outfit-${outfit.cut}`,
    `pattern-${outfit.pattern}`,
    `aura-${fx.aura}`
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClass} style={style} role="img" aria-label={`${look.archetype} 音乐角色形象`}>
      <div className="avatar-aura"><i /><i /><i /></div>
      {bubble && (
        <div className="avatar-mood-bubble">
          {bubble.emotion ? <b>{bubble.emotion}</b> : null}
          {bubble.text}
        </div>
      )}
      <div className="avatar-accessory">{fx.accessory}</div>
      <div className="avatar-prop-label">{fx.propLabel}</div>
      <AvatarIllustration look={look}/>
    </div>
  );
}
