import React, { useId } from 'react';

const FACE_PATHS = {
  round: 'M100 56 C68 56 47 78 47 111 C47 148 67 169 100 171 C133 169 153 148 153 111 C153 78 132 56 100 56Z',
  oval: 'M100 54 C69 54 50 78 50 111 C50 151 69 174 100 175 C131 174 150 151 150 111 C150 78 131 54 100 54Z',
  heart: 'M100 58 C73 52 48 76 48 108 C48 140 68 162 100 174 C132 162 152 140 152 108 C152 76 127 52 100 58Z',
  soft: 'M100 56 C70 54 48 77 48 110 C48 146 70 170 100 172 C130 170 152 146 152 110 C152 77 130 54 100 56Z',
  bright: 'M100 56 C70 54 48 77 48 110 C48 146 70 170 100 172 C130 170 152 146 152 110 C152 77 130 54 100 56Z'
};

const BANGS = {
  soft: 'M45 105 C43 69 61 47 94 47 C127 43 155 63 156 101 C137 91 121 78 114 74 C97 91 73 100 45 105Z',
  wave: 'M45 103 C43 67 62 47 98 47 C130 45 155 67 155 103 C143 89 131 84 120 90 C105 99 92 83 79 91 C67 101 54 96 45 103Z',
  short: 'M48 96 C46 67 64 50 98 49 C128 47 150 67 152 97 C138 86 124 81 109 84 C91 91 73 92 48 96Z',
  neat: 'M48 97 C46 68 65 48 99 49 C132 48 151 70 152 97 C129 83 107 83 89 90 C73 96 59 95 48 97Z',
  long: 'M45 108 C43 70 64 45 99 45 C138 44 158 70 155 109 C140 94 133 75 127 71 C103 94 72 101 45 108Z',
  bob: 'M45 106 C43 70 63 47 99 47 C135 47 157 70 155 105 C139 91 124 86 111 89 C88 99 66 98 45 106Z',
  curl: 'M45 104 C42 78 50 66 60 66 C56 51 73 45 84 50 C96 39 112 43 119 50 C137 42 150 56 147 68 C160 75 159 94 155 105 C143 94 131 90 119 94 C103 101 92 89 79 96 C65 105 53 96 45 104Z',
  undercut: 'M48 95 C48 68 68 50 101 49 C132 49 151 68 151 92 C132 91 120 82 107 75 C87 93 66 95 48 95Z',
  twin: 'M45 105 C44 67 65 46 99 46 C135 46 156 68 155 105 C135 94 119 76 113 74 C97 92 73 103 45 105Z',
  ponytail: 'M46 104 C44 67 65 46 99 46 C135 46 156 68 155 104 C133 89 119 77 113 74 C92 96 70 99 46 104Z',
  braid: 'M46 103 C44 67 65 46 99 46 C135 46 156 68 155 103 C137 88 118 77 112 75 C91 93 71 100 46 103Z',
  leaf: 'M45 104 C43 68 62 46 99 46 C133 46 156 67 155 103 C139 91 124 81 114 75 C94 93 72 101 45 104Z'
};

const LONG_HAIR = new Set(['long', 'bob', 'twin', 'ponytail', 'braid']);

function Eye({ x, style, color }) {
  const narrow = style === 'sharp' || style === 'almond';
  const ry = narrow ? 11 : style === 'dreamy' ? 15 : 13;
  return <g>
    <ellipse cx={x} cy="119" rx={narrow ? 11 : 12} ry={ry} fill="#fffdf9" stroke="rgba(46,37,53,.34)" strokeWidth="1.3"/>
    <ellipse cx={x + 1} cy="120" rx="6.7" ry={narrow ? 9 : 10.5} fill={color}/>
    <ellipse cx={x + 2} cy="123" rx="3.8" ry="6.5" fill="#182132" opacity=".72"/>
    <circle cx={x - 2} cy="114" r="3.2" fill="#fff"/>
    <circle cx={x + 4} cy="123" r="1.4" fill="#fff" opacity=".8"/>
  </g>;
}

export default function AvatarIllustration({ look }) {
  const { palette, face, hair, outfit, body } = look;
  const archetype = look.archetype;
  const unique = useId().replace(/:/g, '');
  const skin = `${unique}-skin`, hairFill = `${unique}-hair`, coat = `${unique}-coat`;
  const hairStyle = BANGS[hair.style] ? hair.style : 'soft';
  const backLength = LONG_HAIR.has(hairStyle) ? 184 : hairStyle === 'wave' || hairStyle === 'curl' ? 157 : 132;
  const pose = body.pose === 'lean-left' ? -2 : body.pose === 'lean-right' ? 2 : 0;
  const expression = face.expression;
  return <svg className="avatar-illustration" viewBox="0 0 200 260" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={skin} x1=".12" y1="0" x2=".88" y2="1" objectBoundingBox="true"><stop stopColor={palette.skin}/><stop offset=".72" stopColor={palette.skin}/><stop offset="1" stopColor={palette.skinShadow}/></linearGradient>
      <linearGradient id={hairFill} x1="0" y1="0" x2="1" y2="1" objectBoundingBox="true"><stop stopColor={palette.hairHighlight}/><stop offset=".3" stopColor={palette.hair}/><stop offset="1" stopColor={palette.hair}/></linearGradient>
      <linearGradient id={coat} x1="0" y1="0" x2="1" y2="1" objectBoundingBox="true"><stop stopColor={palette.outfit}/><stop offset="1" stopColor={palette.outfitDeep}/></linearGradient>
    </defs>
    <ellipse cx="100" cy="249" rx="61" ry="7" fill="#05091b" opacity=".25"/>
    <g transform={`rotate(${pose} 100 170)`}>
      <path d={`M53 99 C46 60 63 44 99 43 C137 43 156 63 151 100 L157 ${backLength} Q143 ${backLength + 6} 132 ${backLength - 3} L119 144 H79 L64 ${backLength - 3} Q51 ${backLength + 5} 43 ${backLength} Z`} fill={`url(#${hairFill})`} stroke={palette.hair} strokeWidth="2"/>
      {hairStyle === 'twin' && <><ellipse cx="37" cy="126" rx="18" ry="33" fill={palette.hair}/><ellipse cx="163" cy="126" rx="18" ry="33" fill={palette.hair}/><circle cx="49" cy="105" r="6" fill={palette.accent}/><circle cx="151" cy="105" r="6" fill={palette.accent}/></>}
      {hairStyle === 'ponytail' && <path d="M148 82 C183 89 184 125 161 147 C173 119 160 105 145 105Z" fill={palette.hair} stroke={palette.hairHighlight} strokeWidth="2"/>}
      {hairStyle === 'braid' && <path d="M148 97 C174 104 166 131 158 149 C178 149 169 174 157 181" fill="none" stroke={palette.hair} strokeWidth="15" strokeLinecap="round" strokeDasharray="10 3"/>}
      {outfit.cut === 'cape' && <path d="M67 165 C37 177 20 209 23 246 H177 C179 210 164 179 134 165Z" fill={palette.outfitDeep} stroke={palette.accent} strokeOpacity=".5" strokeWidth="2"/>}
      <path d="M55 171 C41 173 32 192 34 227 Q35 245 55 246 H145 Q165 245 166 227 C168 192 159 173 145 171 C132 167 120 166 100 166 C80 166 68 167 55 171Z" fill={`url(#${coat})`} stroke={palette.outfitDeep} strokeWidth="2"/>
      <path d="M50 182 C39 194 39 212 42 229" fill="none" stroke={palette.outfitDeep} strokeOpacity=".55" strokeWidth="2"/>
      <path d="M150 182 C161 194 161 212 158 229" fill="none" stroke={palette.outfitDeep} strokeOpacity=".55" strokeWidth="2"/>
      <ellipse cx="45" cy="230" rx="9" ry="8" fill={palette.skin} stroke={palette.skinShadow} strokeOpacity=".55"/>
      <ellipse cx="155" cy="230" rx="9" ry="8" fill={palette.skin} stroke={palette.skinShadow} strokeOpacity=".55"/>
      <path d="M87 157 V177 Q100 186 113 177 V157Z" fill={palette.skinShadow}/>
      <path d="M67 171 Q82 169 100 183 Q118 169 133 171 L118 194 L100 184 L82 194Z" fill={outfit.cut === 'sport' ? palette.outfitDeep : '#fff7e9'} opacity=".93"/>
      {outfit.cut === 'layered' && <><path d="M61 173 L87 194 L79 246 H57Z" fill={palette.outfitDeep} opacity=".5"/><path d="M139 173 L113 194 L121 246 H143Z" fill={palette.outfitDeep} opacity=".5"/></>}
      {outfit.cut === 'structured' && <><path d="M79 193 L100 183 L121 193" fill="none" stroke={palette.accent} strokeWidth="2" opacity=".6"/><path d="M100 187 V240" stroke={palette.outfitDeep} strokeWidth="2" opacity=".65"/></>}
      {archetype === 'campus' && <><path d="M68 177 Q98 196 132 180" fill="none" stroke={palette.accent} strokeWidth="5" opacity=".75"/><path d="M125 179 L135 182 L127 187Z" fill="#fff7e9"/></>}
      {archetype === 'night' && <><path d="M59 176 Q70 195 75 219" fill="none" stroke={palette.accent} strokeWidth="2.5" opacity=".65"/><circle cx="75" cy="222" r="3" fill={palette.accent}/></>}
      {archetype === 'voyager' && <><path d="M65 172 L141 236" stroke={palette.outfitDeep} strokeWidth="7" opacity=".8"/><path d="M65 172 L141 236" stroke={palette.accent} strokeWidth="2" opacity=".7"/><circle cx="140" cy="234" r="9" fill={palette.outfitDeep} stroke={palette.accent} strokeWidth="2"/></>}
      {archetype === 'achiever' && <><path d="M54 175 L72 177 M128 177 L146 175" stroke={palette.accent} strokeWidth="5" strokeLinecap="round"/><path d="M100 188 L100 203" stroke={palette.outfitDeep} strokeWidth="2"/></>}
      {archetype === 'messenger' && <path d="M61 194 L82 194 L82 208 L61 208Z M61 194 L71.5 202 L82 194" fill="none" stroke={palette.accent} strokeWidth="2"/>}
      {outfit.pattern === 'wave' && <path d="M66 220 Q77 211 88 220 T110 220 T132 220" fill="none" stroke={palette.accent} strokeWidth="2" opacity=".68"/>}
      {outfit.pattern === 'split' && <path d="M100 184 L100 245" stroke={palette.accent} strokeWidth="2" opacity=".5"/>}
      <circle cx="100" cy="213" r="10" fill={palette.outfitDeep} opacity=".55"/>
      <path d="M100 205 L102.4 210.5 L108 211.5 L104 215.5 L105 221 L100 218.2 L95 221 L96 215.5 L92 211.5 L97.6 210.5Z" fill={palette.accent}/>
      <ellipse cx="49" cy="120" rx="9" ry="13" fill={palette.skin} stroke={palette.skinShadow} strokeOpacity=".45"/>
      <ellipse cx="151" cy="120" rx="9" ry="13" fill={palette.skin} stroke={palette.skinShadow} strokeOpacity=".45"/>
      <path d={FACE_PATHS[face.shape] || FACE_PATHS.soft} fill={`url(#${skin})`} stroke={palette.skinShadow} strokeOpacity=".44" strokeWidth="1.5"/>
      <path d={BANGS[hairStyle]} fill={`url(#${hairFill})`} stroke={palette.hair} strokeWidth="1.5"/>
      {look.fx.heroMascot && <g aria-hidden="true">
        <path d="M132 61 Q145 55 150 62" fill="none" stroke="#fff4d2" strokeWidth="3" strokeLinecap="round" opacity=".82"/>
        <path d="M143 52 L145.8 59.2 L153.5 60 L147.6 65.1 L149.4 72.5 L143 68.4 L136.6 72.5 L138.4 65.1 L132.5 60 L140.2 59.2Z" fill={palette.accent} stroke="#fff6d5" strokeWidth="1.2"/>
      </g>}
      <path d="M52 85 Q43 103 51 130" fill="none" stroke={palette.hair} strokeWidth={LONG_HAIR.has(hairStyle) ? 13 : 9} strokeLinecap="round"/>
      <path d="M148 85 Q157 103 149 130" fill="none" stroke={palette.hair} strokeWidth={LONG_HAIR.has(hairStyle) ? 13 : 9} strokeLinecap="round"/>
      <path d="M67 62 Q80 53 93 55" fill="none" stroke={palette.hairHighlight} strokeWidth="4" strokeLinecap="round" opacity=".5"/>
      {hairStyle === 'leaf' && <path d="M118 48 Q126 31 139 37 Q135 47 118 48Z" fill={palette.accent} stroke={palette.hair} strokeWidth="1.5"/>}
      {archetype === 'night' && <path d="M138 70 A7 7 0 1 0 145 78 A6 6 0 0 1 138 70Z" fill={palette.accent}/>}
      {archetype === 'rebirth' && <><path d="M140 71 Q140 61 149 61 Q148 69 140 71Z" fill={palette.accent}/><path d="M140 71 Q139 64 133 64 Q133 71 140 71Z" fill={palette.accent}/></>}
      {archetype === 'campus' && <path d="M136 71 L146 75 L137 78 L139 74Z" fill={palette.accent}/>}
      <path d="M67 100 Q77 95 87 100 M113 100 Q123 95 133 100" fill="none" stroke={palette.hair} strokeWidth="2.4" strokeLinecap="round" opacity=".65"/>
      <Eye x={77} style={face.eyeStyle} color={face.eyeColor || palette.eye}/>
      <Eye x={123} style={face.eyeStyle} color={face.eyeColor || palette.eye}/>
      <ellipse cx="64" cy="140" rx="10" ry="5" fill={palette.lip} opacity=".22"/>
      <ellipse cx="136" cy="140" rx="10" ry="5" fill={palette.lip} opacity=".22"/>
      {look.fx.heroMascot && <g fill="#fff8f6" opacity=".86"><circle cx="60" cy="137" r="1.4"/><circle cx="67" cy="138" r="1"/><circle cx="133" cy="138" r="1"/><circle cx="140" cy="137" r="1.4"/></g>}
      {face.cheek === 'freckle' && <g fill={palette.skinShadow} opacity=".55"><circle cx="61" cy="136" r="1.2"/><circle cx="67" cy="138" r="1.2"/><circle cx="133" cy="138" r="1.2"/><circle cx="139" cy="136" r="1.2"/></g>}
      <path d="M99 135 Q101 137 103 135" fill="none" stroke={palette.skinShadow} strokeOpacity=".55" strokeWidth="1.5" strokeLinecap="round"/>
      <path d={expression === 'joy' ? 'M91 149 Q100 158 109 149' : expression === 'quiet' || expression === 'thoughtful' ? 'M96 151 Q100 153 104 151' : 'M93 149 Q100 155 107 149'} fill="none" stroke={palette.lip} strokeWidth="2.2" strokeLinecap="round"/>
    </g>
  </svg>;
}
