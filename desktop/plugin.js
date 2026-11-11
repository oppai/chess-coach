// Chess Coach — native board with local, authoritative move handling.
// Desktop REST and agent tools share a transactional referee store.
// Puzzle interactions never invoke the LLM; game replies and explicit reviews do.

import { host} from '@hermes/plugin-sdk'
import { useEffect, useState, useRef} from 'react'
import { jsx, jsxs} from 'react/jsx-runtime'

const GLYPHS = {
K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'
}
const PIECE_ART = {
  P: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color-scheme%3Alight%20only%22%20width%3D%2245%22%20height%3D%2245%22%20viewBox%3D%220%200%2045%2045%22%3E%3Cpath%20fill%3D%22%23fff%22%20stroke%3D%22%23000%22%20stroke-linecap%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M22.5%209c-2.21%200-4%201.79-4%204%200%20.89.29%201.71.78%202.38C17.33%2016.5%2016%2018.59%2016%2021c0%202.03.94%203.84%202.41%205.03-3%201.06-7.41%205.55-7.41%2013.47h23c0-7.92-4.41-12.41-7.41-13.47%201.47-1.19%202.41-3%202.41-5.03%200-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38%200-2.21-1.79-4-4-4z%22%2F%3E%3C%2Fsvg%3E',
  N: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color-scheme%3Alight%20only%22%20width%3D%2245%22%20height%3D%2245%22%20viewBox%3D%220%200%2045%2045%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%20stroke%3D%22%23000%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%3E%3Cpath%20fill%3D%22%23fff%22%20d%3D%22M22%2010c10.5%201%2016.5%208%2016%2029H15c0-9%2010-6.5%208-21%22%2F%3E%3Cpath%20fill%3D%22%23fff%22%20d%3D%22M24%2018c.38%202.91-5.55%207.37-8%209-3%202-2.82%204.34-5%204-1.042-.94%201.41-3.04%200-3-1%200%20.19%201.23-1%202-1%200-4.003%201-4-4%200-2%206-12%206-12s1.89-1.9%202-3.5c-.73-.994-.5-2-.5-3%201-1%203%202.5%203%202.5h2s.78-1.992%202.5-3c1%200%201%203%201%203%22%2F%3E%3Cpath%20fill%3D%22%23000%22%20d%3D%22M9.5%2025.5a.5.5%200%201%201-1%200%20.5.5%200%201%201%201%200m5.433-9.75a.5%201.5%2030%201%201-.866-.5.5%201.5%2030%201%201%20.866.5%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  B: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color-scheme%3Alight%20only%22%20width%3D%2245%22%20height%3D%2245%22%20viewBox%3D%220%200%2045%2045%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%20stroke%3D%22%23000%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%3E%3Cg%20fill%3D%22%23fff%22%20stroke-linecap%3D%22butt%22%3E%3Cpath%20d%3D%22M9%2036c3.39-.97%2010.11.43%2013.5-2%203.39%202.43%2010.11%201.03%2013.5%202%200%200%201.65.54%203%202-.68.97-1.65.99-3%20.5-3.39-.97-10.11.46-13.5-1-3.39%201.46-10.11.03-13.5%201-1.35.49-2.32.47-3-.5%201.35-1.94%203-2%203-2z%22%2F%3E%3Cpath%20d%3D%22M15%2032c2.5%202.5%2012.5%202.5%2015%200%20.5-1.5%200-2%200-2%200-2.5-2.5-4-2.5-4%205.5-1.5%206-11.5-5-15.5-11%204-10.5%2014-5%2015.5%200%200-2.5%201.5-2.5%204%200%200-.5.5%200%202z%22%2F%3E%3Cpath%20d%3D%22M25%208a2.5%202.5%200%201%201-5%200%202.5%202.5%200%201%201%205%200z%22%2F%3E%3C%2Fg%3E%3Cpath%20stroke-linejoin%3D%22miter%22%20d%3D%22M17.5%2026h10M15%2030h15m-7.5-14.5v5M20%2018h5%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  R: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color-scheme%3Alight%20only%22%20width%3D%2245%22%20height%3D%2245%22%20viewBox%3D%220%200%2045%2045%22%3E%3Cg%20fill%3D%22%23fff%22%20fill-rule%3D%22evenodd%22%20stroke%3D%22%23000%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%3E%3Cpath%20stroke-linecap%3D%22butt%22%20d%3D%22M9%2039h27v-3H9zm3-3v-4h21v4zm-1-22V9h4v2h5V9h5v2h5V9h4v5%22%2F%3E%3Cpath%20d%3D%22m34%2014-3%203H14l-3-3%22%2F%3E%3Cpath%20stroke-linecap%3D%22butt%22%20stroke-linejoin%3D%22miter%22%20d%3D%22M31%2017v12.5H14V17%22%2F%3E%3Cpath%20d%3D%22m31%2029.5%201.5%202.5h-20l1.5-2.5%22%2F%3E%3Cpath%20fill%3D%22none%22%20stroke-linejoin%3D%22miter%22%20d%3D%22M11%2014h23%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  Q: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color-scheme%3Alight%20only%22%20width%3D%2245%22%20height%3D%2245%22%20viewBox%3D%220%200%2045%2045%22%3E%3Cg%20fill%3D%22%23fff%22%20fill-rule%3D%22evenodd%22%20stroke%3D%22%23000%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%3E%3Cpath%20d%3D%22M8%2012a2%202%200%201%201-4%200%202%202%200%201%201%204%200m16.5-4.5a2%202%200%201%201-4%200%202%202%200%201%201%204%200M41%2012a2%202%200%201%201-4%200%202%202%200%201%201%204%200M16%208.5a2%202%200%201%201-4%200%202%202%200%201%201%204%200M33%209a2%202%200%201%201-4%200%202%202%200%201%201%204%200%22%2F%3E%3Cpath%20stroke-linecap%3D%22butt%22%20d%3D%22M9%2026c8.5-1.5%2021-1.5%2027%200l2-12-7%2011V11l-5.5%2013.5-3-15-3%2015-5.5-14V25L7%2014z%22%2F%3E%3Cpath%20stroke-linecap%3D%22butt%22%20d%3D%22M9%2026c0%202%201.5%202%202.5%204%201%201.5%201%201%20.5%203.5-1.5%201-1.5%202.5-1.5%202.5-1.5%201.5.5%202.5.5%202.5%206.5%201%2016.5%201%2023%200%200%200%201.5-1%200-2.5%200%200%20.5-1.5-1-2.5-.5-2.5-.5-2%20.5-3.5%201-2%202.5-2%202.5-4-8.5-1.5-18.5-1.5-27%200z%22%2F%3E%3Cpath%20fill%3D%22none%22%20d%3D%22M11.5%2030c3.5-1%2018.5-1%2022%200M12%2033.5c6-1%2015-1%2021%200%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  K: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color-scheme%3Alight%20only%22%20viewBox%3D%220%200%2045%2045%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%20stroke%3D%22%23000%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%3E%3Cpath%20stroke-linejoin%3D%22miter%22%20d%3D%22M22.5%2011.63V6M20%208h5%22%2F%3E%3Cpath%20fill%3D%22%23fff%22%20stroke-linecap%3D%22butt%22%20stroke-linejoin%3D%22miter%22%20d%3D%22M22.5%2025s4.5-7.5%203-10.5c0%200-1-2.5-3-2.5s-3%202.5-3%202.5c-1.5%203%203%2010.5%203%2010.5%22%2F%3E%3Cpath%20fill%3D%22%23fff%22%20d%3D%22M11.5%2037c5.5%203.5%2015.5%203.5%2021%200v-7s9-4.5%206-10.5c-4-6.5-13.5-3.5-16%204V27v-3.5c-3.5-7.5-13-10.5-16-4-3%206%205%2010%205%2010z%22%2F%3E%3Cpath%20d%3D%22M11.5%2030c5.5-3%2015.5-3%2021%200m-21%203.5c5.5-3%2015.5-3%2021%200m-21%203.5c5.5-3%2015.5-3%2021%200%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  p: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color-scheme%3Alight%20only%22%20width%3D%2245%22%20height%3D%2245%22%20viewBox%3D%220%200%2045%2045%22%3E%3Cpath%20stroke%3D%22%23000%22%20stroke-linecap%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M22.5%209a4%204%200%200%200-3.22%206.38%206.48%206.48%200%200%200-.87%2010.65c-3%201.06-7.41%205.55-7.41%2013.47h23c0-7.92-4.41-12.41-7.41-13.47a6.46%206.46%200%200%200-.87-10.65A4.01%204.01%200%200%200%2022.5%209z%22%2F%3E%3C%2Fsvg%3E',
  n: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color-scheme%3Alight%20only%22%20width%3D%2245%22%20height%3D%2245%22%20viewBox%3D%220%200%2045%2045%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%20stroke%3D%22%23000%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%3E%3Cpath%20fill%3D%22%23000%22%20d%3D%22M22%2010c10.5%201%2016.5%208%2016%2029H15c0-9%2010-6.5%208-21%22%2F%3E%3Cpath%20fill%3D%22%23000%22%20d%3D%22M24%2018c.38%202.91-5.55%207.37-8%209-3%202-2.82%204.34-5%204-1.04-.94%201.41-3.04%200-3-1%200%20.19%201.23-1%202-1%200-4%201-4-4%200-2%206-12%206-12s1.89-1.9%202-3.5c-.73-1-.5-2-.5-3%201-1%203%202.5%203%202.5h2s.78-2%202.5-3c1%200%201%203%201%203%22%2F%3E%3Cpath%20fill%3D%22%23ececec%22%20stroke%3D%22%23ececec%22%20d%3D%22M9.5%2025.5a.5.5%200%201%201-1%200%20.5.5%200%201%201%201%200m5.43-9.75a.5%201.5%2030%201%201-.86-.5.5%201.5%2030%201%201%20.86.5%22%2F%3E%3Cpath%20fill%3D%22%23ececec%22%20stroke%3D%22none%22%20d%3D%22m24.55%2010.4-.45%201.45.5.15c3.15%201%205.65%202.49%207.9%206.75S35.75%2029.06%2035.25%2039l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34s-5.79-6.64-9.19-7.16z%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  b: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color-scheme%3Alight%20only%22%20width%3D%2245%22%20height%3D%2245%22%20viewBox%3D%220%200%2045%2045%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%20stroke%3D%22%23000%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%3E%3Cg%20fill%3D%22%23000%22%20stroke-linecap%3D%22butt%22%3E%3Cpath%20d%3D%22M9%2036c3.4-1%2010.1.4%2013.5-2%203.4%202.4%2010.1%201%2013.5%202%200%200%201.6.5%203%202-.7%201-1.6%201-3%20.5-3.4-1-10.1.5-13.5-1-3.4%201.5-10.1%200-13.5%201-1.4.5-2.3.5-3-.5%201.4-2%203-2%203-2z%22%2F%3E%3Cpath%20d%3D%22M15%2032c2.5%202.5%2012.5%202.5%2015%200%20.5-1.5%200-2%200-2%200-2.5-2.5-4-2.5-4%205.5-1.5%206-11.5-5-15.5-11%204-10.5%2014-5%2015.5%200%200-2.5%201.5-2.5%204%200%200-.5.5%200%202z%22%2F%3E%3Cpath%20d%3D%22M25%208a2.5%202.5%200%201%201-5%200%202.5%202.5%200%201%201%205%200z%22%2F%3E%3C%2Fg%3E%3Cpath%20stroke%3D%22%23ececec%22%20stroke-linejoin%3D%22miter%22%20d%3D%22M17.5%2026h10M15%2030h15m-7.5-14.5v5M20%2018h5%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  r: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color-scheme%3Alight%20only%22%20width%3D%2245%22%20height%3D%2245%22%20viewBox%3D%220%200%2045%2045%22%3E%3Cg%20fill-rule%3D%22evenodd%22%20stroke%3D%22%23000%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%3E%3Cpath%20stroke-linecap%3D%22butt%22%20d%3D%22M9%2039h27v-3H9zm3.5-7%201.5-2.5h17l1.5%202.5zm-.5%204v-4h21v4z%22%2F%3E%3Cpath%20stroke-linecap%3D%22butt%22%20stroke-linejoin%3D%22miter%22%20d%3D%22M14%2029.5v-13h17v13z%22%2F%3E%3Cpath%20stroke-linecap%3D%22butt%22%20d%3D%22M14%2016.5%2011%2014h23l-3%202.5zM11%2014V9h4v2h5V9h5v2h5V9h4v5z%22%2F%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22%23ececec%22%20stroke-linejoin%3D%22miter%22%20stroke-width%3D%221%22%20d%3D%22M12%2035.5h21m-20-4h19m-18-2h17m-17-13h17M11%2014h23%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  q: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color-scheme%3Alight%20only%22%20width%3D%2245%22%20height%3D%2245%22%20viewBox%3D%220%200%2045%2045%22%3E%3Cg%20fill-rule%3D%22evenodd%22%20stroke%3D%22%23000%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%3E%3Cg%20stroke%3D%22none%22%3E%3Ccircle%20cx%3D%226%22%20cy%3D%2212%22%20r%3D%222.75%22%2F%3E%3Ccircle%20cx%3D%2214%22%20cy%3D%229%22%20r%3D%222.75%22%2F%3E%3Ccircle%20cx%3D%2222.5%22%20cy%3D%228%22%20r%3D%222.75%22%2F%3E%3Ccircle%20cx%3D%2231%22%20cy%3D%229%22%20r%3D%222.75%22%2F%3E%3Ccircle%20cx%3D%2239%22%20cy%3D%2212%22%20r%3D%222.75%22%2F%3E%3C%2Fg%3E%3Cpath%20stroke-linecap%3D%22butt%22%20d%3D%22M9%2026c8.5-1.5%2021-1.5%2027%200l2.5-12.5L31%2025l-.3-14.1-5.2%2013.6-3-14.5-3%2014.5-5.2-13.6L14%2025%206.5%2013.5z%22%2F%3E%3Cpath%20stroke-linecap%3D%22butt%22%20d%3D%22M9%2026c0%202%201.5%202%202.5%204%201%201.5%201%201%20.5%203.5-1.5%201-1.5%202.5-1.5%202.5-1.5%201.5.5%202.5.5%202.5%206.5%201%2016.5%201%2023%200%200%200%201.5-1%200-2.5%200%200%20.5-1.5-1-2.5-.5-2.5-.5-2%20.5-3.5%201-2%202.5-2%202.5-4-8.5-1.5-18.5-1.5-27%200z%22%2F%3E%3Cpath%20fill%3D%22none%22%20stroke-linecap%3D%22butt%22%20d%3D%22M11%2038.5a35%2035%201%200%200%2023%200%22%2F%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22%23ececec%22%20d%3D%22M11%2029a35%2035%201%200%201%2023%200m-21.5%202.5h20m-21%203a35%2035%201%200%200%2022%200m-23%203a35%2035%201%200%200%2024%200%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  k: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color-scheme%3Alight%20only%22%20viewBox%3D%220%200%2045%2045%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%20stroke%3D%22%23000%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%3E%3Cpath%20stroke-linejoin%3D%22miter%22%20d%3D%22M22.5%2011.6V6%22%2F%3E%3Cpath%20fill%3D%22%23000%22%20stroke-linecap%3D%22butt%22%20stroke-linejoin%3D%22miter%22%20d%3D%22M22.5%2025s4.5-7.5%203-10.5c0%200-1-2.5-3-2.5s-3%202.5-3%202.5c-1.5%203%203%2010.5%203%2010.5%22%2F%3E%3Cpath%20fill%3D%22%23000%22%20d%3D%22M11.5%2037a22.3%2022.3%200%200%200%2021%200v-7s9-4.5%206-10.5c-4-6.5-13.5-3.5-16%204V27v-3.5c-3.5-7.5-13-10.5-16-4-3%206%205%2010%205%2010z%22%2F%3E%3Cpath%20stroke-linejoin%3D%22miter%22%20d%3D%22M20%208h5%22%2F%3E%3Cpath%20stroke%3D%22%23ececec%22%20d%3D%22M32%2029.5s8.5-4%206-9.7C34.1%2014%2025%2018%2022.5%2024.6v2.1-2.1C20%2018%209.9%2014%207%2019.9c-2.5%205.6%204.8%209%204.8%209%22%2F%3E%3Cpath%20stroke%3D%22%23ececec%22%20d%3D%22M11.5%2030c5.5-3%2015.5-3%2021%200m-21%203.5c5.5-3%2015.5-3%2021%200m-21%203.5c5.5-3%2015.5-3%2021%200%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E'
}

const FILES = 'abcdefgh'

let CTX = null

function parseFen(fen) {
if (!fen) return null
const rows = String(fen).split(' ')[0].split('/')
if (rows.length!== 8) return null
const board = []
for (const row of rows) {
const cells = []
for (const ch of row) {
if (ch >= '1' && ch <= '8') {
for (let i = 0; i < Number(ch); i++) cells.push(null)
} else {
cells.push(ch)
}
}
if (cells.length!== 8) return null
board.push(cells)
}
return board
}

function statusText(game, t) {
  const s = game.status || {}
  if (s.is_checkmate) return t("チェックメイト · ") + (s.result || '')
  if (s.is_stalemate) return t("引き分け · ステイルメイト")
  if (s.is_insufficient_material) return t("引き分け · 駒不足")
  if (s.is_game_over) return t("対局終了 · ") + (s.result || '')
  return (s.turn === 'black' ? t("黒") : t("白")) + t("の手番") + (s.is_check ? t(" · チェック") : '')
}

function movePairs(moves, startFen) {
  const parts = (startFen || '').split(' ')
  let number = Number(parts[5]) || 1
  let black = parts[1] === 'b'
  const out = []
  for (const move of moves) {
    out.push(`${number}${black ? '…' : '.'} ${move}`)
    if (black) number++
    black = !black
  }
  return out
}

function Board({ game, sel, targets, onSquare, pending, flipped, t}) {
const [hoverSq, setHoverSq] = useState(null)
const board = parseFen(game.fen)
if (!board) {
return jsx('div', { className: 'text-sm', children: 'No position yet.'})
}
const turn = (game.status && game.status.turn) || 'white'
const over =!!(game.status && game.status.is_game_over)
const squares = []
for (let ri = 0; ri < 8; ri++) {
for (let fi = 0; fi < 8; fi++) {
const r = flipped ? 7 - ri : ri
const f = flipped ? 7 - fi : fi
const piece = board[r][f]
const name = FILES[f] + String(8 - r)
const dark = (r + f) % 2 === 1
const isWhitePiece = piece && piece === piece.toUpperCase()
const ownPiece =
piece &&!over && (turn === 'white') === isWhitePiece
const isSel = sel === name
const target = targets.find((t) => t.to === name)
const isPending = !!pending && (pending.from === name || pending.to === name)
const last = game.last_move_uci && (game.last_move_uci.slice(0,2) === name || game.last_move_uci.slice(2,4) === name)
const checkedKing = game.status?.is_check && piece === (turn === 'white' ? 'K' : 'k')
const hot = hoverSq === name && (ownPiece || !!target)
squares.push(
jsxs(
'button',
{
type: 'button',
'aria-label': name + (piece ? ' ' + ({K:t("白キング"),Q:t("白クイーン"),R:t("白ルーク"),B:t("白ビショップ"),N:t("白ナイト"),P:t("白ポーン"),k:t("黒キング"),q:t("黒クイーン"),r:t("黒ルーク"),b:t("黒ビショップ"),n:t("黒ナイト"),p:t("黒ポーン")}[piece]) : t(" 空きマス")),
'aria-pressed': isSel,
disabled: !!pending || over,
onClick: () => onSquare(name, piece),
onKeyDown: event => {
  if (event.key === 'Escape') { onSquare(name, piece); return }
  const delta = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}[event.key]
  if (delta) { event.preventDefault(); const buttons = Array.from(event.currentTarget.parentElement.children); const index = buttons.indexOf(event.currentTarget); buttons[(index + delta + 64) % 64]?.focus() }
},
onMouseEnter: () => setHoverSq(name),
onMouseLeave: () => setHoverSq(null),
style: {
border: 0, padding: 0, minWidth: 0,
position: 'relative',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
aspectRatio: '1',
backgroundColor: checkedKing ? '#dc8875' : last ? (dark ? '#a4ae6e' : '#d7dca3') : hot
? '#b7cba4'
: dark
? '#789183'
: '#e4e8da',
boxShadow: isSel
? 'inset 0 0 0 3px #e5b94e'
: isPending
? 'inset 0 0 0 3px #e8b93e'
: target
? 'inset 0 0 0 2px color-mix(in srgb, var(--ui-accent) 65%, transparent)'
: 'none',
cursor: ownPiece || target? 'pointer': 'default',
userSelect: 'none'
},
children: [
fi === 0
? jsx('span', {
style: {
position: 'absolute', top: '2px', left: '4px',
fontSize: 'clamp(10px, 2cqw, 14px)', lineHeight: '1', fontWeight: '700',
color: '#334c40',
pointerEvents: 'none'
},
children: String(8 - r)
})
: null,
ri === 7
? jsx('span', {
style: {
position: 'absolute', bottom: '2px', right: '4px',
fontSize: 'clamp(10px, 2cqw, 14px)', lineHeight: '1', fontWeight: '700',
color: '#334c40',
pointerEvents: 'none'
},
children: FILES[f]
})
: null,
target && !piece
? jsx('span', {
style: {
position: 'absolute',
width: '26%', height: '26%', borderRadius: '50%',
backgroundColor: 'rgba(30,60,40,.38)',
pointerEvents: 'none'
},
children: ''
})
: null,
piece && PIECE_ART[piece]
? jsx('img', {
src: PIECE_ART[piece],
alt: '',
draggable: false,
style: { width: '100%', height: '100%', transform: 'scale(.88)', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.45))', pointerEvents: 'none' }
})
: piece
? jsx('span', {
style: {
fontSize: '9.6cqw',
lineHeight: '1',
color: isWhitePiece? '#ffffff': '#14181d',
textShadow: isWhitePiece
? '0 0 3px #000, 0 0 3px #000, 0 1px 2px #000'
: '0 0 3px #fff, 0 0 3px #fff, 0 1px 2px #fff',
pointerEvents: 'none'
},
children: GLYPHS[piece] || ''
})
: null
]
},
'sq-' + name
)
)
}
}
return jsx('div', {
style: {
display: 'grid',
gridTemplateColumns: 'repeat(8, 1fr)',
width: '100%',
containerType: 'inline-size',
border: '1px solid var(--ui-stroke-secondary)',
borderRadius: '6px',
overflow: 'hidden'
},
children: squares
})
}

const CSS = `
.cc {height:100%;overflow:auto;box-sizing:border-box;padding:18px;color:var(--ui-text-primary,#edf2ef);font:13px/1.5 system-ui,sans-serif;container-type:inline-size}
.cc * {box-sizing:border-box}.cc button,.cc select {font:inherit}.cc button:focus-visible,.cc select:focus-visible {outline:2px solid #a8ceb4;outline-offset:2px}
.cc-head,.cc-row {display:flex;align-items:center;justify-content:space-between;gap:10px}.cc-head {margin-bottom:18px}.cc-title {font-size:19px;font-weight:650;letter-spacing:-.5px}.cc-small {font-size:12px;color:var(--ui-text-secondary,#adb9b3)}
.cc-btn,.cc select {border:1px solid var(--ui-stroke-secondary,#39463f);border-radius:8px;background:var(--ui-bg-secondary,#202824);color:inherit;padding:8px 11px;cursor:pointer}.cc .cc-btn:disabled {opacity:.45;cursor:default}.cc-board button:disabled {opacity:1}.cc-primary {background:#bdd9bd;color:#1d3326;border-color:#bdd9bd;font-weight:650}.cc-card {padding:14px;border:1px solid var(--ui-stroke-secondary,#39463f);border-radius:12px;margin-bottom:14px}.cc-tabs {display:flex;gap:6px;margin-bottom:14px}.cc-tabs button {flex:1}.cc-active {background:#bdd9bd;color:#1d3326}.cc-fields {display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}.cc label {display:grid;gap:5px;font-size:12px}.cc select {width:100%;min-width:0}.cc-status {border-left:3px solid #bdd9bd;padding:2px 0 2px 12px;margin:14px 0}.cc-board {width:min(100%,620px,max(240px,calc(100vh - 470px)));margin:0 auto}.cc-tools {display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.cc-message {padding:10px 12px;border-radius:8px;background:var(--ui-bg-secondary,#202824);margin:10px 0}.cc-error {color:#ffc6a6}.cc-history {max-height:120px;overflow:auto;font:12px/1.9 ui-monospace,monospace;word-spacing:6px;margin-top:8px}.cc-empty {padding:26px 8px;text-align:center}.cc details {margin-top:16px}.cc summary {cursor:pointer;color:var(--ui-text-secondary,#adb9b3)}
@container (max-width:310px) {.cc-fields {grid-template-columns:1fr}.cc-head {align-items:flex-start}.cc-title {font-size:17px}.cc-btn {padding:7px 9px}}
`
const EN = {
  "チェックメイト · ": "Checkmate · ",
  "引き分け · ステイルメイト": "Draw · Stalemate",
  "引き分け · 駒不足": "Draw · Insufficient material",
  "対局終了 · ": "Game over · ",
  "黒": "Black",
  "白": "White",
  "の手番": " to move",
  " · チェック": " · Check",
  "白キング": "White king",
  "白クイーン": "White queen",
  "白ルーク": "White rook",
  "白ビショップ": "White bishop",
  "白ナイト": "White knight",
  "白ポーン": "White pawn",
  "黒キング": "Black king",
  "黒クイーン": "Black queen",
  "黒ルーク": "Black rook",
  "黒ビショップ": "Black bishop",
  "黒ナイト": "Black knight",
  "黒ポーン": "Black pawn",
  " 空きマス": " Empty square",
  "盤面に接続できません。接続を再確認しています。": "Cannot connect to the board. Reconnecting…",
  "応答を確認できませんでした。チャットと盤面を確認してから操作してください。": "No update received. Check the chat and board before trying again.",
  "チャットに依頼しました。回答は左側で確認できます。": "Request sent. Follow the response in your chat.",
  "送信できませんでした。チャットを開いてからもう一度お試しください。": "Could not send. Open a chat and try again.",
  "一手ずつ、強くなる。": "Better, one move at a time.",
  "閉じる": "Close",
  "＋ 新しく始める": "＋ New session",
  "詰めチェス": "Mate practice",
  "対戦": "Play a game",
  "相手の最善の応手を考えて、チェックメイトを見つけよう。": "Find checkmate against your opponent’s best defense.",
  "今のチャットのHermesと対戦。相手の駒を減らして練習できます。": "Play against Hermes in your current chat. Give yourself a head start with piece odds.",
  "詰めるまでの自分の手数": "Your moves to checkmate",
  "1手詰め": "Mate in 1",
  "2手詰め": "Mate in 2",
  "3手詰め · 準備中": "Mate in 3 · Coming soon",
  "4手詰め · 準備中": "Mate in 4 · Coming soon",
  "あなたの色": "Your color",
  "白 · 先手": "White · First move",
  "黒 · 後手": "Black · Second move",
  "相手の駒落ち": "Opponent’s handicap",
  "なし（平手）": "None (equal material)",
  "ポーン落ち": "Pawn odds",
  "ナイト落ち": "Knight odds",
  "ルーク落ち": "Rook odds",
  "クイーン落ち": "Queen odds",
  "問題を出してもらう →": "Create a puzzle →",
  "対戦を始める →": "Start a game →",
  "検証対応：1〜2手。3〜4手は今後追加予定です。": "Verified puzzles: mate in 1–2. Mate in 3–4 is planned.",
  "盤面を読み込み中…": "Loading the board…",
  "対局・練習の履歴": "Games & practice",
  "対局 ": "Game ",
  "終了": "Finished",
  "進行中": "In progress",
  "Hermesに依頼中… チャットの応答をお待ちください": "Waiting for Hermes… Follow the response in your chat.",
  " の駒を選択中 · 移動先を選んでください": " selected · Choose a destination",
  "おつかれさまでした。局面を振り返ってみましょう。": "Well played. Take a moment to review the position.",
  "駒を選んで、移動先をクリック": "Select a piece, then choose a destination",
  "↕ 反転": "↕ Flip",
  "盤面を反転": "Flip board",
  "昇格する駒": "Promotion piece",
  "昇格する駒を選択": "Choose a promotion piece",
  "クイーン": "Queen",
  "ルーク": "Rook",
  "ビショップ": "Bishop",
  "ナイト": "Knight",
  "キャンセル": "Cancel",
  "合法手情報がありません。Hermesを再起動してください。": "Legal moves unavailable. Please restart Hermes.",
  "ヒント": "Hint",
  "答えの手は明かさず、考えるヒントを1つください。": "Give me one thinking hint without revealing the move.",
  "一手戻す": "Undo one move",
  "局面を振り返る": "Review position",
  "この局面のポイントを短く解説して。盤面は変更しないで。": "Briefly explain the key ideas in this position. Do not change the board.",
  "棋譜 · ": "Moves · ",
  " 半手": " plies",
  " · 最終手 ": " · Last move ",
  "まだ指されていません。": "No moves yet.",
  "PGNをチャットに表示": "Show PGN in chat",
  "chess_pgnで棋譜を表示して。": "Show the game using chess_pgn.",
  "まずは1手詰めから。上の設定で練習を始めましょう。": "Start with mate in 1. Use the settings above to begin.",
  "盤面で指す · チャットで学ぶ": "Play on the board · Learn in chat"
}
function ChessPane() {
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('chess-coach.language') === 'ja' ? 'ja' : 'en' } catch (_) { return 'en' }
  })
  const t = text => language === 'ja' ? text : (EN[text] || text)
  const changeLanguage = value => {
    setLanguage(value)
    try { localStorage.setItem('chess-coach.language', value) } catch (_) {}
    setNote('')
  }

  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)
  const [square, setSquare] = useState(null)
  const [error, setError] = useState(null)
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(null)
  const [promotion, setPromotion] = useState(null)
  const [setup, setSetup] = useState(false)
  const [mode, setMode] = useState('puzzle')
  const [depth, setDepth] = useState('1')
  const [odds, setOdds] = useState('knight')
  const [side, setSide] = useState('white')
  const [flipped, setFlipped] = useState(false)
  const actionLock = useRef(false)
  const generation = useRef(0)
  const [scope, setScope] = useState(0)
  useEffect(() => {
    let previous = host.state?.profile?.get?.()
    return host.state?.profile?.subscribe?.(value => {
      if (value === previous) return
      previous = value; generation.current++; actionLock.current = false
      setData(null); setSelected(null); setPending(null); setNote(''); setError(null); setScope(v=>v+1)
    })
  }, [])
  const [pgn, setPgn] = useState('')
  const [hostBusy, setHostBusy] = useState(false)
  const currentSession = () => host.state?.focusedSessionId?.get?.() ?? null
  const games = data?.games || []
  const game = games.find(g => g.game_id === selected) || games[games.length - 1]
  const t2 = (en, ja) => language === 'ja' ? ja : en
  const errors = {
    stale_position: t2('The position changed. Please try again.', '局面が更新されました。もう一度操作してください。'),
    try_again: t2('That move does not force mate in the remaining moves. Try another!', 'その手では残りの手数で詰みません。別の手を考えてみましょう。'),
    search_limit: t2('This line could not be verified in time. The board is unchanged; try another move.', '制限時間内に検証できませんでした。盤面は変更していません。別の手をお試しください。'),
    opponent_turn: t2('It is Hermes’s turn.', 'Hermesの手番です。'),
    illegal_move: t2('That move is not legal.', 'その手は指せません。'),
    no_mate_found: t2('No forced mate was found.', '強制的な詰みが見つかりませんでした。')
  }
  useEffect(() => {
    let alive = true, loading = false
    const load = async () => {
      if (loading || actionLock.current) return
      loading = true
      const version = generation.current
      try {
        const result = await CTX.rest('/games')
        if (!result || !Array.isArray(result.games)) throw new Error('Invalid response')
        if (alive && version === generation.current) {
          setData(result)
          setError(result.api_version === 2 ? null : 'upgrade')
        }
      } catch (_) { if (alive) setError('connection') }
      finally { loading = false }
    }
    load()
    const timer = setInterval(load, 1500)
    let off
    try { off = host.onEvent('plugin.chess-coach.game.updated', load) } catch (_) {}
    return () => { alive = false; clearInterval(timer); if (typeof off === 'function') off() }
  }, [scope])
  useEffect(() => {
    const update = () => {
      const sid = currentSession()
      setHostBusy(!!host.state?.busyBySession?.get?.()?.[sid])
    }
    update()
    const unsubs = ['busyBySession', 'focusedSessionId'].map(key => host.state?.[key]?.subscribe?.(update)).filter(Boolean)
    return () => unsubs.forEach(off => off())
  }, [])
  useEffect(() => { setNote('') }, [game?.game_id])
  useEffect(() => { setSquare(null); setPromotion(null); setPgn('') }, [game?.game_id, game?.fen])
  useEffect(() => {
    if (!pending || pending.kind !== 'ai') return
    const updated = games.find(g => g.game_id === pending.gameId)
    if (updated && (updated.status.is_game_over || updated.status.turn === updated.user_color)) setPending(null)
  }, [data, pending])
  useEffect(() => {
    if (!pending || pending.kind !== 'ai') return
    const timer = setTimeout(() => {
      setPending(null)
      setNote(t('応答を確認できませんでした。チャットと盤面を確認してから操作してください。'))
    }, 90000)
    return () => clearTimeout(timer)
  }, [pending])
  const applyGame = updated => setData(old => ({api_version:2,games:(old?.games || []).some(g=>g.game_id===updated.game_id)
    ? old.games.map(g=>g.game_id===updated.game_id ? updated : g) : [...(old?.games || []),updated]}))
  const requestAI = async (position, explanation = null) => {
    if (pending?.kind === 'ai') return
    if (hostBusy) { setNote(t2('Hermes is busy. Wait for the current response.', 'Hermesが応答中です。現在の処理が終わるまでお待ちください。')); return }
    const sid = currentSession()
    const text = explanation || (language === 'ja'
      ? `対局 ${position.game_id} はあなたの手番です。chess_boardで確認し、chess_legal_movesから1手選んでchess_make_moveで指してください。expected_revision=${position.revision}。私は${position.user_color}。私の手は指さないでください。盤面の再掲は不要、コメントは一文で。`
      : `Your turn in game ${position.game_id}. Read chess_board, choose one legal move from chess_legal_moves, and play it using chess_make_move with expected_revision=${position.revision}. I play ${position.user_color}. Do not play my moves. No ASCII board; at most one sentence of commentary.`)
    try {
      const accepted = await host.composer.submit(sid, text + (language === 'ja' ? '\n日本語で回答してください。' : '\nRespond in English.'))
      if (accepted === false) throw new Error('No composer')
      if (!explanation) setPending({kind:'ai',gameId:position.game_id})
      else setNote(t('チャットに依頼しました。回答は左側で確認できます。'))
    } catch (_) { setNote(t('送信できませんでした。チャットを開いてからもう一度お試しください。')); setPending(null) }
  }
  const perform = async (action, extra = {}) => {
    if (actionLock.current || error) return null
    actionLock.current = true
    const requestGeneration = ++generation.current
    setPending({kind:'local'}); setNote('')
    const sid = currentSession()
    try {
      const response = await CTX.rest('/action',{method:'POST',body:{action,...(game ? {game_id:game.game_id,expected_revision:game.revision ?? 0} : {}),...extra},timeoutMs:10000})
      if (generation.current !== requestGeneration) return null
      if (response.game) applyGame(response.game)
      if (response.error) { setNote(errors[response.error] || t2('This action could not be completed. Refresh and try again.', '操作できませんでした。局面を確認してもう一度お試しください。')); return null }
      if (response.feedback) setNote(response.feedback === 'solved' ? t2('Checkmate! Nicely done.', 'チェックメイト！お見事です。') : t2('Good move. The defender has replied — keep going!', '正しい手です。相手が応じました。続きを考えましょう！'))
      if (response.hint_square) setNote(t2('Look at the piece on ', 'このマスの駒に注目：') + response.hint_square)
      if (response.pgn) setPgn(response.pgn)
      return {...response, session:sid}
    } catch (_) { setNote(t2('Could not confirm the action. The board will refresh automatically; check it before retrying.', '操作結果を確認できませんでした。自動更新された盤面を確認してから再試行してください。')); return null }
    finally { if (generation.current === requestGeneration) { actionLock.current = false; generation.current++; setPending(null) } }
  }
  const maybeReply = response => {
    if (!response?.game) return
    const g = response.game
    if (g.mode === 'game' && !g.status.is_game_over && g.status.turn !== g.user_color) {
      if (currentSession() === response.session) requestAI(g)
      else setNote(t2('Chat changed. Use “Ask Hermes to move” in your intended chat.', 'チャットが切り替わりました。対戦するチャットで「Hermesに指してもらう」を押してください。'))
    }
  }
  const start = async () => {
    const response = await perform(mode === 'puzzle' ? 'new_puzzle' : 'new_game',mode === 'puzzle'
      ? {depth:Number(depth),previous_puzzle:game?.puzzle?.id || null}
      : {odds,odds_giver:side==='white'?'black':'white',user_color:side,name:language==='ja'?'Hermesとの対戦':'Game with Hermes'})
    if (response?.game) { setSelected(response.game.game_id); setSetup(false); setFlipped(response.game.user_color === 'black'); maybeReply(response) }
  }
  const legal = game?.legal_moves || []
  const targets = square ? legal.filter(m => m.from === square) : []
  const opponentTurn = game?.user_color && game.status?.turn !== game.user_color && !game.status?.is_game_over
  const move = async m => {
    setPromotion(null); setSquare(null)
    maybeReply(await perform('move',{move:m.uci}))
  }
  const onSquare = (sq, piece) => {
    if (pending || error || promotion || opponentTurn || game?.status?.is_game_over) return
    const hits = targets.filter(m => m.to === sq)
    if (hits.length > 1) { setPromotion(hits); return }
    if (hits.length) { move(hits[0]); return }
    const own = piece && ((game.status?.turn !== 'black') === (piece === piece.toUpperCase()))
    setSquare(own && square !== sq ? sq : null)
  }
  const btn = (label, onClick, props = {}) => jsx('button', {type:'button', className:'cc-btn', disabled:!!pending || !!error, onClick, ...props, children:label},label)
  const options = entries => entries.map(([value,label,disabled]) => jsx('option',{value,disabled,children:label},value))
  const ask = text => requestAI(game, `game_id=${game.game_id}: ${text}`)
  return jsxs('section', {className:'cc', 'aria-label':'Chess Coach', lang:language, children:[
    jsx('style',{children:CSS}),
    jsx('div',{className:'cc-row',style:{justifyContent:'flex-end',marginBottom:10},children:jsx('select',{'aria-label':'Language / 言語',style:{width:'auto'},value:language,disabled:!!pending,onChange:e=>changeLanguage(e.target.value),children:options([['en','English'],['ja','日本語']])})}),
    jsxs('header',{className:'cc-head',children:[jsxs('div',{children:[jsx('div',{className:'cc-small',children:'HERMES · CHESS STUDIO'}),jsx('div',{className:'cc-title',children:t("一手ずつ、強くなる。")})]}),btn(setup ? t("閉じる") : t("＋ 新しく始める"),() => setSetup(!setup), {'aria-expanded':setup})]}),
    error && jsx('div',{role:'alert',className:'cc-message cc-error',children:error === 'upgrade' ? t2('Backend update required. Restart the Hermes gateway to enable instant board actions.', '即時操作を有効にするには、Hermesゲートウェイを再起動してください。') : t('盤面に接続できません。接続を再確認しています。')}),
    (setup || (data && !game)) && jsxs('div',{className:'cc-card',children:[
      jsxs('div',{className:'cc-tabs',children:[btn(t("詰めチェス"),()=>setMode('puzzle'),{className:'cc-btn '+(mode==='puzzle'?'cc-active':''),'aria-pressed':mode==='puzzle'}),btn(t("対戦"),()=>setMode('game'),{className:'cc-btn '+(mode==='game'?'cc-active':''),'aria-pressed':mode==='game'})]}),
      jsx('p',{className:'cc-small',children:mode==='puzzle'?t("相手の最善の応手を考えて、チェックメイトを見つけよう。"):t("今のチャットのHermesと対戦。相手の駒を減らして練習できます。")}),
      jsxs('div',{className:'cc-fields',children:mode==='puzzle' ? [jsxs('label',{children:[t("詰めるまでの自分の手数"),jsx('select',{value:depth,onChange:e=>setDepth(e.target.value),children:options([['1',t("1手詰め")],['2',t("2手詰め")],['3',t2('Mate in 3','3手詰め')],['4',t2('Mate in 4','4手詰め')]])})]})] : [jsxs('label',{children:[t("あなたの色"),jsx('select',{value:side,onChange:e=>setSide(e.target.value),children:options([['white',t("白 · 先手")],['black',t("黒 · 後手")]])})]}),jsxs('label',{children:[t("相手の駒落ち"),jsx('select',{value:odds,onChange:e=>setOdds(e.target.value),children:options([['none',t("なし（平手）")],['pawn',t("ポーン落ち")],['knight',t("ナイト落ち")],['rook',t("ルーク落ち")],['queen',t("クイーン落ち")]])})]})]}),
      btn(mode==='puzzle'?t("問題を出してもらう →"):t("対戦を始める →"),start,{className:'cc-btn cc-primary'}),
      mode==='puzzle' && jsx('p',{className:'cc-small',children:t2('Verified mate-in-1–4 puzzles. Moves and replies run locally.', '検証済みの1〜4手詰め。着手と応手はローカルで処理します。')})
    ]}),
    !data && !error && jsx('p',{role:'status',children:t("盤面を読み込み中…")}),
    game && !setup && jsxs('div',{children:[
      jsxs('label',{className:'cc-small',children:[t("対局・練習の履歴"),jsx('select',{value:game.game_id,disabled:!!pending,onChange:e=>setSelected(e.target.value),children:[...games].reverse().map((g,i)=>jsx('option',{value:g.game_id,children:(g.puzzle ? t2('Mate in ','') + g.puzzle.depth + t2('','手詰め') : (g.name || t("対局 ")+(games.length-i)))+' · '+(g.status?.is_game_over?t("終了"):t("進行中"))},g.game_id))})]}),
      jsxs('div',{className:'cc-row',children:[jsxs('div',{className:'cc-status',role:'status',children:[jsx('strong',{children:statusText(game, t)}),jsx('div',{className:'cc-small',children:pending ? (pending.kind === 'ai' ? t2('Hermes is thinking…', 'Hermesが考え中…') : t2('Updating the board…', '盤面を更新中…')) : opponentTurn ? t2('Waiting for Hermes’s move', 'Hermesの手番です') : square ? square+t(" の駒を選択中 · 移動先を選んでください") : game.status?.is_game_over ? t("おつかれさまでした。局面を振り返ってみましょう。") : t("駒を選んで、移動先をクリック")})]}),btn(t("↕ 反転"),()=>setFlipped(!flipped),{'aria-label':t("盤面を反転")})]}),
      jsx('div',{className:'cc-board',children:jsx(Board,{game,sel:square,targets,onSquare,pending:pending || error || opponentTurn,flipped,t})}),
      promotion && jsxs('div',{className:'cc-message',role:'group','aria-label':t("昇格する駒"),children:[jsx('strong',{children:t("昇格する駒を選択")}),jsx('div',{className:'cc-tools',children:promotion.map(m=>btn(({q:t("クイーン"),r:t("ルーク"),b:t("ビショップ"),n:t("ナイト")})[m.uci.slice(-1)],()=>move(m)))}),btn(t("キャンセル"),()=>setPromotion(null))]}),
      !Array.isArray(game.legal_moves) && jsx('p',{className:'cc-error',children:t("合法手情報がありません。Hermesを再起動してください。")}),
      jsxs('div',{className:'cc-tools',children:[btn(t("ヒント"),()=>game.mode === 'puzzle' ? perform('hint') : ask(t("答えの手は明かさず、考えるヒントを1つください。")),{disabled:!!pending || !!error || game.status?.is_game_over}),btn(t2('Undo turn','一手戻す'),()=>perform('undo'),{disabled:!!pending || !!error || !game.moves_san?.length}),btn(t("局面を振り返る"),()=>ask(t("この局面のポイントを短く解説して。盤面は変更しないで。")))]}),
      game.mode === 'puzzle' && jsx('div',{className:'cc-tools',children:[btn(t2('Try again','最初から挑戦'),()=>perform('retry')),btn(t2('Next puzzle','次の問題'),async()=>{const r=await perform('new_puzzle',{depth:game.puzzle.depth,previous_puzzle:game.puzzle.id});if(r?.game)setSelected(r.game.game_id)})]}),
      opponentTurn && btn(t2('Ask Hermes to move','Hermesに指してもらう'),()=>requestAI(game),{disabled:!!pending || !!error || hostBusy}),
      jsxs('details',{children:[jsx('summary',{children:t2('Move history · ','棋譜 · ')+(game.moves_san || []).length+t2(' played','着手')+(game.last_move?t(" · 最終手 ")+game.last_move:'')}),jsx('div',{className:'cc-history',children:movePairs(game.moves_san || [], game.start_fen).join('   ') || t("まだ指されていません。")}),btn(t2('Show PGN','PGNを表示'),()=>perform('pgn'))]})
    ]}),
    data && !game && jsx('div',{className:'cc-empty cc-small',children:t("まずは1手詰めから。上の設定で練習を始めましょう。")}),
    pgn && jsx('textarea',{'aria-label':'PGN',readOnly:true,value:pgn,rows:6,style:{width:'100%',fontFamily:'monospace'}}),
    note && jsx('div',{role:'status',className:'cc-message',children:note}),
    jsx('footer',{className:'cc-small',style:{marginTop:20},children:t("盤面で指す · チャットで学ぶ")})
  ]})
}
export default {
  id:'chess-coach', name:'Chess Coach',
  register(ctx) {
    CTX = ctx
    ctx.register({id:'board-pane',area:'panes',title:'Chess Coach',data:{placement:'right',width:'420px'},render:()=>jsx(ChessPane,{})})
  }
}
