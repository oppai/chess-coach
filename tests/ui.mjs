import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import {JSDOM} from 'jsdom'
const dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'})
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.localStorage=dom.window.localStorage
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true})
globalThis.HTMLElement=dom.window.HTMLElement;globalThis.IS_REACT_ACT_ENVIRONMENT=true
const {render,fireEvent,screen,waitFor,cleanup}=await import('@testing-library/react')
let sent=[],calls=[],fail=false,payload={api_version:2,games:[]},next=null
const atom=value=>({get:()=>value,subscribe:()=>()=>{}})
globalThis.__host={state:{focusedSessionId:atom('session'),busyBySession:atom({})},onEvent:()=>()=>{},composer:{submit:(_,s)=>{if(fail)return false;sent.push(s);return true}}}
let src=await fs.readFile(new URL('../desktop/plugin.js',import.meta.url),'utf8')
const generated=new URL('./.ui-test-module.mjs',import.meta.url)
await fs.writeFile(generated,src.replace(/import\s*\{\s*host\s*\}\s*from\s*['"]@hermes\/plugin-sdk['"];?/, "const host = globalThis.__host;"))
const plugin=(await import(generated.href)).default
let pane
plugin.register({rest:async(path,opts)=>{if(path==='/games')return payload;calls.push(opts.body);return next},register:p=>pane=p})
try {
  render(pane.render())
  await screen.findByText('Create a puzzle →')
  assert.equal(screen.getByLabelText('Language / 言語').value,'en')
  fireEvent.change(screen.getByLabelText('Language / 言語'),{target:{value:'ja'}})
  assert.ok(screen.getByText('問題を出してもらう →'))
  cleanup();render(pane.render())
  await screen.findByText('問題を出してもらう →')
  assert.equal(screen.getByLabelText('Language / 言語').value,'ja')
  fireEvent.change(screen.getByLabelText('Language / 言語'),{target:{value:'en'}})
  fireEvent.change(screen.getByLabelText('Your moves to checkmate'),{target:{value:'4'}})
  const game={game_id:'test',name:'Mate in 4',revision:0,mode:'puzzle',user_color:'white',puzzle:{id:'q4',depth:4},fen:'7k/8/6Q1/6K1/8/8/8/8 w - - 0 1',status:{turn:'white'},moves_san:[],legal_moves:[{from:'g6',to:'e8',uci:'g6e8',san:'Qe8+'}]}
  next={game}
  fireEvent.click(screen.getByText('Create a puzzle →'))
  await screen.findByRole('button',{name:'g6 White queen'})
  assert.equal(calls[0].action,'new_puzzle');assert.equal(calls[0].depth,4);assert.equal(sent.length,0)
  assert.equal(document.querySelectorAll('.cc-board button').length,64)
  fireEvent.click(screen.getByRole('button',{name:'Flip board'}))
  assert.equal(document.querySelector('.cc-board button').getAttribute('aria-label'),'h1 Empty square')
  next={error:'try_again',mistake:'no_check',game}
  fireEvent.click(screen.getByRole('button',{name:'g6 White queen'}))
  fireEvent.click(screen.getByRole('button',{name:'e8 Empty square'}))
  await screen.findByText('Incorrect move')
  assert.ok(document.querySelector('.cc-board .cc-flash'))
  assert.equal(screen.getByRole('button',{name:'g6 White queen'}).disabled,true)
  assert.ok(document.querySelector('.cc-board .cc-result-wrong'))
  fireEvent.click(screen.getByRole('button',{name:'Try another move'}))
  assert.equal(screen.getByRole('button',{name:'g6 White queen'}).disabled,false)
  next={game:{...game,revision:1,fen:'4Q3/7k/8/6K1/8/8/8/8 w - - 2 2',moves_san:['Qe8+','Kh7'],legal_moves:[]},feedback:'correct'}
  fireEvent.click(screen.getByRole('button',{name:'g6 White queen'}))
  fireEvent.click(screen.getByRole('button',{name:'e8 Empty square'}))
  payload={api_version:2,games:[next.game]}
  const progress = await screen.findByText('Correct move · Your turn')
  assert.ok(progress.closest('.cc-board'))
  assert.equal(screen.getByRole('button',{name:'e8 White queen'}).disabled,false)
  await waitFor(()=>assert.ok(!screen.queryByText('Correct move · Your turn')),{timeout:2500})
  assert.equal(sent.length,0);assert.equal(calls[2].move,'g6e8');assert.equal(calls[2].expected_revision,0)
  next={game:next.game,hint_idea:'check'}
  fireEvent.click(screen.getByText('Hint'))
  await screen.findByText('Look for a check, then see which squares the king can escape to.')
  assert.equal(sent.length,0)
  fail=true;fireEvent.click(screen.getByText('Review position'))
  await screen.findByText('Could not send. Open a chat and try again.')
  cleanup()
  payload={api_version:2,games:[game]}
  render(pane.render())
  await screen.findByText('White to mate in 4')
  next={game:{...game,revision:1,status:{turn:'black',is_checkmate:true,is_game_over:true},mate_detail:'blocked'},feedback:'solved'}
  fireEvent.click(screen.getByRole('button',{name:'g6 White queen'}))
  fireEvent.click(screen.getByRole('button',{name:'e8 Empty square'}))
  await screen.findByText('Checkmate! Puzzle solved')
  await waitFor(()=>assert.ok(document.querySelector('.cc-board .cc-result .cc-confetti')))
  assert.ok(screen.getByText('The king is boxed in by its own pieces and cannot stop the check.'))
  assert.ok(screen.getByRole('button',{name:'Next puzzle'}))
  fireEvent.click(screen.getByRole('button',{name:'View board'}))
  assert.equal(screen.queryByText('Checkmate! Puzzle solved'),null)
  assert.ok(screen.getByRole('button',{name:'Next puzzle'}))
  cleanup()
  payload={api_version:2,games:Array.from({length:8},(_,i)=>({...game,game_id:i===7?'test':'old-'+i,mode:'game',puzzle:null}))};next={game:{...game,mode:'game',puzzle:null,revision:1,status:{turn:'black'},fen:'4Q2k/8/8/6K1/8/8/8/8 b - - 1 1'}};fail=false
  render(pane.render());await screen.findByRole('button',{name:'g6 White queen'})
  const history=screen.getByLabelText('Games & practice')
  assert.equal(history.options.length,5)
  assert.deepEqual([...history.options].map(o=>o.value),['test','old-6','old-5','old-4','old-3'])
  fireEvent.click(screen.getByRole('button',{name:'g6 White queen'}));fireEvent.click(screen.getByRole('button',{name:'e8 Empty square'}))
  await waitFor(()=>assert.equal(sent.length,1))
  await screen.findByText('Hermes is thinking about its next move…')
  assert.equal(document.querySelector('.cc-board').getAttribute('aria-busy'),'true')
  assert.match(sent[0],/Your turn/);assert.match(sent[0],/board revision 1/)
  assert.equal(screen.getByRole('button',{name:'e8 White queen'}).disabled,true)
  cleanup()
  console.log('PASS: English default, Japanese persistence, depth 4, instant local moves/hints without LLM, flip, false-submit recovery, exactly one opponent notification')
} finally {cleanup();await fs.unlink(generated)}
