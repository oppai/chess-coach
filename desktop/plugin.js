// Chess Coach — desktop board pane.
// The board's truth lives in the agent-side chess_* tools; this pane
// renders the position they mirror through the plugin backend
// (ctx.rest '/games'). Clicking a move does not touch the board
// directly: it asks the agent in chat to play the move through
// chess_make_move, so every move is validated by the referee and the
// pane can never diverge.

import { host} from '@hermes/plugin-sdk'
import { useEffect, useState} from 'react'
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

function statusText(game) {
const s = game.status || {}
if (s.is_checkmate) return 'Checkmate · ' + (s.result || '')
if (s.is_stalemate) return 'Stalemate · draw'
if (s.is_insufficient_material) return 'Draw · insufficient material'
if (s.is_game_over) return 'Game over · ' + (s.result || '')
const turn = s.turn === 'black'? 'Black': 'White'
return turn + ' to move' + (s.is_check? ' · check!': '')
}

function movePairs(moves) {
const out = []
for (let i = 0; i < moves.length; i += 2) {
out.push(String(i / 2 + 1) + '. ' + moves[i] + (moves[i + 1]? ' ' + moves[i + 1]: ''))
}
return out
}

function Board({ game, sel, targets, onSquare, pending}) {
const [hoverSq, setHoverSq] = useState(null)
const board = parseFen(game.fen)
if (!board) {
return jsx('div', { className: 'text-sm', children: 'No position yet.'})
}
const turn = (game.status && game.status.turn) || 'white'
const over =!!(game.status && game.status.is_game_over)
const squares = []
for (let r = 0; r < 8; r++) {
for (let f = 0; f < 8; f++) {
const piece = board[r][f]
const name = FILES[f] + String(8 - r)
const dark = (r + f) % 2 === 1
const isWhitePiece = piece && piece === piece.toUpperCase()
const ownPiece =
piece &&!over && (turn === 'white') === isWhitePiece
const isSel = sel === name
const target = targets.find((t) => t.to === name)
const isPending = !!pending && (pending.from === name || pending.to === name)
const hot = hoverSq === name && (ownPiece || !!target)
squares.push(
jsx(
'div',
{
onClick: () => onSquare(name, piece),
onMouseEnter: () => setHoverSq(name),
onMouseLeave: () => setHoverSq(null),
style: {
position: 'relative',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
aspectRatio: '1',
backgroundColor: hot
? 'color-mix(in srgb, var(--ui-accent) 62%, transparent)'
: dark
? 'color-mix(in srgb, var(--ui-accent) 42%, transparent)'
: 'color-mix(in srgb, var(--ui-accent) 10%, transparent)',
boxShadow: isSel
? 'inset 0 0 0 3px var(--ui-accent)'
: isPending
? 'inset 0 0 0 3px #e8b93e'
: target
? 'inset 0 0 0 2px color-mix(in srgb, var(--ui-accent) 65%, transparent)'
: 'none',
cursor: ownPiece || target? 'pointer': 'default',
userSelect: 'none'
},
children: [
f === 0
? jsx('span', {
style: {
position: 'absolute', top: '2px', left: '4px',
fontSize: 'max(22px, 3.8cqw)', lineHeight: '1', fontWeight: '700',
color: 'var(--ui-text-secondary)',
pointerEvents: 'none'
},
children: String(8 - r)
})
: null,
r === 7
? jsx('span', {
style: {
position: 'absolute', bottom: '2px', right: '4px',
fontSize: 'max(22px, 3.8cqw)', lineHeight: '1', fontWeight: '700',
color: 'var(--ui-text-secondary)',
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
backgroundColor: 'color-mix(in srgb, var(--ui-accent) 55%, transparent)',
pointerEvents: 'none'
},
children: ''
})
: null,
piece && PIECE_ART[piece]
? jsx('img', {
src: PIECE_ART[piece],
alt: piece,
draggable: false,
style: { width: '100%', height: '100%', transform: 'scale(1.14)', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.45))', pointerEvents: 'none' }
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

function ChessPane() {
const [data, setData] = useState(null)
const [selGame, setSelGame] = useState(null)
const [selSq, setSelSq] = useState(null)
const [note, setNote] = useState(null)
const [err, setErr] = useState(null)
const [thinking, setThinking] = useState(null)

useEffect(() => {
let alive = true
const load = async () => {
try {
const d = await CTX.rest('/games')
if (alive) {
setData(d)
setErr(null)
}
} catch (e) {
if (alive) setErr('Waiting for the chess backend…')
}
}
load()
const timer = setInterval(load, 2500)
let off = null
try {
off = host.onEvent('plugin.chess-coach.game.updated', () => load())
} catch (e) {
off = null
}
return () => {
alive = false
clearInterval(timer)
if (off) off()
}
}, [])
useEffect(() => {
if (!thinking || !data) return
const g = (data.games || []).find((x) => x.game_id === thinking.gameId)
if (!g || g.fen !== thinking.fen) setThinking(null)
}, [data, thinking])
useEffect(() => {
if (!thinking) return
const t = setTimeout(() => setThinking(null), 90000)
return () => clearTimeout(t)
}, [thinking])

const games = (data && data.games) || []
const game =
games.find((g) => g.game_id === selGame) || games[games.length - 1] || null

// Reset the piece selection whenever the position changes.
const fen = game? game.fen: null
useEffect(() => {
setSelSq(null)
}, [fen])

const legal = (game && game.legal_moves) || []
const targets = selSq? legal.filter((m) => m.from === selSq): []

const boardNow = game? parseFen(game.fen): null
const pieceAt = (sq) => {
if (!boardNow) return null
const f = FILES.indexOf(sq[0])
const r = 8 - Number(sq[1])
return boardNow[r]? boardNow[r][f]: null
}
const hasLegal = !!(game && Array.isArray(game.legal_moves))

const onSquare = (name, piece) => {
if (!game || (game.status && game.status.is_game_over)) return
if (thinking) return
const turn = (game.status && game.status.turn) || 'white'
const isOwn = (pc) => !!pc && ((turn === 'white') === (pc === pc.toUpperCase()))
// Completing a move: a second, non-own square was clicked.
if (selSq && name !== selSq && !isOwn(piece)) {
const hit = targets.find((t) => t.to === name)
let uci = null
let san = null
if (hit) {
const promo = targets.filter((t) => t.to === name && t.promotion)
const chosen = promo.find((t) => t.uci.endsWith('q')) || promo[0] || hit
uci = chosen.uci
san = chosen.san
} else if (!hasLegal) {
// Backend sent no legal moves (stale gateway): compose the UCI
// from the two clicks and let the referee judge it.
const fromPiece = pieceAt(selSq)
uci = selSq + name
if ((fromPiece === 'P' && name[1] === '8') || (fromPiece === 'p' && name[1] === '1')) uci += 'q'
san = uci
}
if (uci) {
const text = '盤面パネルから送信: game_id = ' + game.game_id + ' / UCI = ' + uci + ' を chess_make_move で指して。指したら盤面と一言コメントを返して。'
try {
host.composer.submit(null, text)
setNote('送信しました: ' + san + '（エージェントが指します）')
setThinking({ gameId: game.game_id, fen: game.fen, san, from: selSq, to: name })
} catch (e) {
setNote('送信できませんでした。チャットで直接指してください。')
}
setSelSq(null)
return
}
}
// Selecting one of the side-to-move's pieces.
if (piece && isOwn(piece)) {
setSelSq(selSq === name? null: name)
return
}
setSelSq(null)
}

return jsxs('div', {
className: 'flex h-full flex-col gap-2 p-3',
children: [
jsxs('div', {
className: 'flex items-baseline justify-between',
children: [
jsx('div', { className: 'font-medium', children: '♞ Chess Coach'}),
jsx('div', {
className: 'text-[0.75rem]',
style: { color: 'var(--ui-text-tertiary)'},
children: game? statusText(game): ''
})
]
}),
thinking
? jsxs('div', {
className: 'flex items-center gap-2 text-[0.8125rem]',
style: { color: 'var(--ui-text-secondary)'},
children: [
jsx('span', { className: 'animate-pulse', style: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#e8b93e', display: 'inline-block' }, children: ''}),
'AIが考え中…（' + thinking.san + ' を送信済み）'
]
})
: null,
games.length > 1
? jsx('div', {
className: 'flex flex-wrap gap-1',
children: games.map((g) =>
jsx(
'button',
{
type: 'button',
onClick: () => {
setSelGame(g.game_id)
setSelSq(null)
},
className: 'px-1.5 text-[0.6875rem]',
style: {
border: '1px solid var(--ui-stroke-secondary)',
borderRadius: '999px',
color:
game && g.game_id === game.game_id
? 'var(--ui-accent)'
: 'var(--ui-text-secondary)'
},
children:
(g.name || 'Game') + ' · ' + (g.moves_san || []).length + ' plies'
},
'g-' + g.game_id
)
)
})
: null,
game
? jsx(Board, { game, sel: selSq, targets, onSquare, pending: thinking && game && thinking.gameId === game.game_id? thinking: null})
: jsx('div', {
className: 'text-sm',
style: { color: 'var(--ui-text-secondary)'},
children:
err ||
'No game yet. Ask Hermes in chat: “Give me a mate-in-1 puzzle” or “Play a game — you give knight odds.” The board will appear here.'
}),
game
? jsx('div', {
className: 'text-[0.75rem]',
style: { color: 'var(--ui-text-tertiary)'},
children: note
? note
: hasLegal
? '駒をクリック → 移動先をクリックで、チャット経由で指せます。'
: '駒をクリック → 移動先をクリックで指せます（合法手ハイライトは Hermes 再起動後に有効）。'
})
: null,
game && game.last_move
? jsx('div', {
className: 'text-[0.75rem]',
style: { color: 'var(--ui-text-secondary)'},
children: 'Last move: ' + game.last_move
})
: null,
game && (game.moves_san || []).length > 0
? jsx('div', {
className: 'text-[0.75rem]',
style: {
color: 'var(--ui-text-secondary)',
overflowY: 'auto',
borderTop: '1px solid var(--ui-stroke-secondary)',
paddingTop: '6px'
},
children: movePairs(game.moves_san).join(' ')
})
: null
]
})
}

export default {
id: 'chess-coach',
name: 'Chess Coach',
register(ctx) {
CTX = ctx
ctx.register({
id: 'board-pane',
area: 'panes',
title: 'Chess board',
data: { placement: 'right', width: '350px'},
render: () => jsx(ChessPane, {})
})
}
}
