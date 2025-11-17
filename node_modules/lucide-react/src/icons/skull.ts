import createLucideIcon from '../createLucideIcon';

/**
 * @component @name Skull
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSI5IiBjeT0iMTIiIHI9IjEiIC8+CiAgPGNpcmNsZSBjeD0iMTUiIGN5PSIxMiIgcj0iMSIgLz4KICA8cGF0aCBkPSJNOCAyMHYyaDh2LTIiIC8+CiAgPHBhdGggZD0ibTEyLjUgMTctLjUtMS0uNSAxaDF6IiAvPgogIDxwYXRoIGQ9Ik0xNiAyMGEyIDIgMCAwIDAgMS41Ni0zLjI1IDggOCAwIDEgMC0xMS4xMiAwQTIgMiAwIDAgMCA4IDIwIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/skull
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const Skull = createLucideIcon('Skull', [
  ['circle', { cx: '9', cy: '12', r: '1', key: '1vctgf' }],
  ['circle', { cx: '15', cy: '12', r: '1', key: '1tmaij' }],
  ['path', { d: 'M8 20v2h8v-2', key: 'ded4og' }],
  ['path', { d: 'm12.5 17-.5-1-.5 1h1z', key: '3me087' }],
  ['path', { d: 'M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20', key: 'xq9p5u' }],
]);

export default Skull;
