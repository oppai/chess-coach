# Mac 検証チェックリスト（Chess Coach）— 2026-11-11 実施想定・約20分

前提：リポジトリ oppai/chess-coach を clone 済み（またはファイル一式を受け取り済み）。

## 1. インストール（5分）
```bash
mkdir -p ~/.hermes/plugins
cp -R <clone先>/chess-coach ~/.hermes/plugins/chess-coach
hermes plugins enable chess-coach
```
- 依存 python-chess（PyPI名 `chess`）の同意ダイアログが出たら承認する
- `hermes plugins list` で chess-coach が有効になっていること
- `hermes plugins doctor chess-coach` が通ること（エラーが出たら全文をバナナちゃんへ）

## 2. 最小ループ（10分）— チャットで順に話しかける
1. 「詰めチェスの練習がしたい。1手詰めを出して」→ スキルが読み込まれ、`chess_set_position` で局面がセットされ、盤面（ASCII）が表示されるか
2. 正解の手を答える（例：バックランクなら Rb8）→ `chess_make_move` が通って「チェックメイト」と返るか
3. わざと間違った手を言う → 駄目な手は弾かれる／ヒントをくれるか
4. 「ハンデ戦しよう。僕が白、君がナイト落ちで」→ `chess_new_game`（odds: knight, odds_giver: black）で対局が始まり、エージェントが合法手だけを指すか。数手進めて盤面表示が崩れないか
5. 「さっきの対局をPGNでちょうだい」→ PGNが返るか

## 3. バリデーション（5分）
```bash
hermes plugins validate ~/.hermes/plugins/chess-coach --install-deps
```
- dangerous が出ないこと。caution が出たら内容を控えてバナナちゃんへ

## 4. 合格条件
- 2のループが一通り動く＋3で dangerous なし → 凍結へ（コミット＋SHA固定）
- 詰まったら、止まったステップ番号と画面の文言をそのまま教えてください

## 5. 盤面パネル（Desktop半分）の確認 — 追加分
前提：最新版を pull してフォルダを再コピー済み（dashboard/ と desktop/ が入っていること）。

1. Hermes Desktop を再起動（または Capabilities → Plugins で **Rescan**）
2. Capabilities → Plugins で **Chess Coach** の Desktop 側トグルを ON
3. 右側に「Chess board」ペインが出るか（出なければ ⌘K → "Reload desktop plugins"）
4. チャットで新しい対局か1手詰めを始める → パネルの盤面・手番表示・棋譜が追随するか（イベント通知＋2.5秒ポーリング）
5. 手を1つ指す → パネルが新しい局面に変わるか
- 盤面が出ない／真っ白な場合は、ペイン内の文言と、Capabilities のトグル状態を教えてください
