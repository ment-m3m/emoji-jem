// Firebase SDK v9（モジュール方式）の初期化
// ★Firebase関係を最初にまとめてimport！
import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";

import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  serverTimestamp, 
  query, 
  orderBy, 
  where, 
  doc, 
  deleteDoc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDg5aSXVI1Tsp3wGkmHv0epNyhSaALZQCU",
  authDomain: "i-post-04-fuh.firebaseapp.com",
  projectId: "i-post-04-fuh",
  storageBucket: "i-post-04-fuh.firebasestorage.app",
  messagingSenderId: "891638722935",
  appId: "1:891638722935:web:f32c4ac16f23910b063172"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
window.db = getFirestore(app); // グローバルで使えるように

// Service Worker登録
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(registration => {
      console.log('ServiceWorker登録成功:', registration.scope);
    }).catch(error => {
      console.log('ServiceWorker登録失敗:', error);
    });
  });
}

// グローバル変数
let savedScrollY = 0;
let messageCount = 0;
let currentTimeline = "tab1"; // 初期は1番タブ
const likeMap = {};
const replyMap = {};

// グローバル変数
const tabNames = {
  tab1: "home",
  tab2: "room",
  tab3: "studio",
  tab4: "station"
};

window.switchTab = function(button) {
  // すべてのタブボタンからactiveを外す
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));

  // 押されたボタンだけactiveにする
  button.classList.add("active");

  // 押されたボタンのdata-tab値をcurrentTimelineにセット
  currentTimeline = button.dataset.tab; // 例："tab1", "tab2"

  // 投稿リストをタブごとにフィルタリング
  window.filterMessages();
};

// 全ての関数をグローバルスコープで使用できるように定義
window.switchView = function(view) {
  const main = document.getElementById("homeScreen");
  const setting = document.getElementById("profileScreen");

  if (view === 'setting') {
    // Homeのスクロール位置を記録してから非表示
    savedScrollY = window.scrollY;
    main.style.display = "none";
    setting.style.display = "block";
  } else if (view === 'main') {
    main.style.display = "block";
    setting.style.display = "none";

    // 前回のスクロール位置へ戻す
    window.scrollTo(0, savedScrollY);
  }
};

// ハンバーガーメニューのトグル
window.toggleMenu = function(event) {
  if (event) {
    event.stopPropagation(); // イベントの伝播を止める
  }
  
  const menu = document.getElementById("hamburgerMenu");
  
  // オプションメニューを全て閉じる
  document.querySelectorAll('.menu-options').forEach(menuOpt => {
    menuOpt.style.display = 'none';
  });
  
  // メニューが現在表示されていない場合は表示する
  if (menu.style.display === "none") {
    menu.style.display = "block";
    
    // 少し遅延させてからクリックイベントを追加（直後のクリックを検知しないため）
    setTimeout(() => {
      // 画面の任意の場所をクリックしたときにメニューを閉じるイベントを追加
      document.addEventListener('click', function closeMenu(e) {
        // メニュー自体かハンバーガーボタン以外がクリックされた場合
        if (!menu.contains(e.target) && !e.target.closest('.hamburger')) {
          menu.style.display = "none";
          // イベントリスナーを削除（一度閉じたら監視も終了）
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 100);
  } else {
    // すでに表示されている場合は非表示にする
    menu.style.display = "none";
  }
};

// プロフィール画面を開く
window.openProfileScreen = function() {
  const profileScreen = document.getElementById('profileScreen');
  
  // まず表示してからアニメーションのためのクラスを追加
  profileScreen.style.display = 'block';
  
  // アニメーションのために少し遅延させる
  setTimeout(() => {
    profileScreen.classList.add('show');
  }, 10);
  
  // ホーム画面とブックマーク画面を非表示
  const homeScreen = document.getElementById('homeScreen');
  const bookmarkScreen = document.getElementById('bookmarkScreen');
  homeScreen.style.display = 'none';
  bookmarkScreen.style.display = 'none';
  bookmarkScreen.classList.remove('show');
  
  // ハンバーガーメニューを閉じる
  const menu = document.getElementById("hamburgerMenu");
  menu.style.display = "none";
};

// ホーム画面を開く
window.openHome = function() {
  const homeScreen = document.getElementById('homeScreen');
  homeScreen.style.display = 'block';
  
  // プロフィール画面とブックマーク画面をアニメーションと共に非表示
  const profileScreen = document.getElementById('profileScreen');
  const bookmarkScreen = document.getElementById('bookmarkScreen');
  
  // アニメーションのためのクラスを削除
  profileScreen.classList.remove('show');
  bookmarkScreen.classList.remove('show');
  
  // アニメーション完了後に非表示
  setTimeout(() => {
    profileScreen.style.display = 'none';
    bookmarkScreen.style.display = 'none';
  }, 300);
  
  // ハンバーガーメニューを閉じる
  const menu = document.getElementById("hamburgerMenu");
  menu.style.display = "none";
  
  // オプションメニューもすべて閉じる
  document.querySelectorAll('.menu-options').forEach(menu => {
    menu.style.display = 'none';
  });
};



// ブックマーク画面を開く
window.openBookmarks = function() {
  // ブックマーク画面を表示
  const bookmarkScreen = document.getElementById('bookmarkScreen');
  bookmarkScreen.style.display = 'block';
  
  // アニメーションのために少し遅延させる
  setTimeout(() => {
    bookmarkScreen.classList.add('show');
  }, 10);
  
  // ホーム画面とプロフィール画面を非表示
  const homeScreen = document.getElementById('homeScreen');
  const profileScreen = document.getElementById('profileScreen');
  homeScreen.style.display = 'none';
  profileScreen.style.display = 'none';
  profileScreen.classList.remove('show');
  
  // ハンバーガーメニューを閉じる
  document.getElementById("hamburgerMenu").style.display = "none";
  
  // オプションメニューもすべて閉じる
  document.querySelectorAll('.menu-options').forEach(menu => {
    menu.style.display = 'none';
  });
  
  // ブックマークリストを読み込む
  window.loadBookmarks();
};


// Changeボタンのクリック処理 - グレー調UIへの切り替え
window.toggleViewMode = function() {
  const button = document.querySelector('.toggle-mode');
  
  // ボタンが無効化されている場合は何もしない
  if (button && button.disabled) {
    return;
  }
  
  // ボタンを一時的に無効化
  if (button) {
    button.disabled = true;
    setTimeout(() => {
      button.disabled = false;
    }, 1000); // 1秒間は再度クリックできないようにする
  }
  
  // スタイル切り替え
  document.body.classList.toggle("old-style");
  
  // 投稿表示形式を変更 - レイアウトを修正
  const messages = document.querySelectorAll('.message-list li');
  
  if (document.body.classList.contains('old-style')) {
    // グレー調UIに変更時（2ch風）
    messages.forEach(message => {
      const header = message.querySelector('.message-header');
      const messageText = message.querySelector('.message-text');
      const userNameEl = message.querySelector('.message-user');
      const timeEl = message.querySelector('.message-time');
      const userIcon = message.querySelector('.user-icon');
      
      // ヘッダー要素を書き換え
      if (header && messageText && userNameEl && timeEl) {
        const postNum = message.dataset.docId ? '#' : '#'; // 投稿番号
        const userName = userNameEl.textContent;
        const timeText = timeEl.textContent;
        
        // ヘッダーのHTMLを置き換え - 「番号 名前 時間」形式
        header.innerHTML = `
          <div style="display: flex; justify-content: space-between; width: 100%; border-bottom: 1px solid #999; margin-bottom: 5px; padding-bottom: 2px;">
            <div><span style="color: black;">${postNum}</span> <span style="color: blue;">${userName}</span></div>
            <div><span style="color: black;">${timeText}</span></div>
          </div>
        `;
        
        // アイコンを非表示
        if (userIcon) userIcon.style.display = 'none';
      }
    });
  } else {
    // 元のスタイルに戻す - リロードせずに元のスタイルに戻す
    messages.forEach(message => {
      // 元のHTMLを復元するため、新しいリクエストを行う
      window.loadPostsFromLocalStorage();
    });
  }
};

// 投稿フォーム関連
window.togglePostForm = function(event) {
  event?.stopPropagation();

  const form = document.getElementById("postFormWrapper");
  const button = document.getElementById("toggleFormBtn");
  form.classList.toggle("show");
  button.classList.toggle("hide");

  if (form.classList.contains("show")) {
    form.style.display = "block";
    const input = document.getElementById("messageInput");
    input.focus();
    updateCharacterCount();

    // ★ここに追加！★
    setTimeout(() => {
      const formTop = form.getBoundingClientRect().top + window.scrollY;
      const viewportHeight = window.innerHeight;
      const targetScrollY = formTop - (viewportHeight / 2) + (form.offsetHeight / 2);
      window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
    }, 300); // ← 少しだけ遅らせて、キーボード表示待つ！
    
  } else {
    form.style.display = "none";
  }
};



window.updateCharacterCount = function() {
  const input = document.getElementById("messageInput");
  const charCount = document.getElementById("charCount");
  const postButton = document.querySelector("#postFormWrapper button:not(.cancel-btn)");

  const text = input.value;
  const length = text.length;
  const lineCount = (text.match(/\n/g) || []).length + 1;
  
  charCount.textContent = `${length} / 300 (${lineCount} / 10行)`;

  if (length > 300 || lineCount > 10) {
    charCount.style.color = "red";
    postButton.disabled = true;
  } else {
    charCount.style.color = "#0a1d4d";
    postButton.disabled = false;
  }
};

// メッセージメニュー関連（完全版）
window.toggleMessageMenu = function(id) {
  const menu = document.getElementById(`menu-${id}`);
  if (!menu) return;

  // もし現在表示されていて、再度同じボタンがクリックされた場合は閉じる
  if (menu.style.display === 'block') {
    menu.style.display = 'none';
    return;
  }

  // 他の表示中のメニューを全て閉じる
  document.querySelectorAll('.menu-options').forEach(el => {
    el.style.display = 'none';
  });

  // メニューの中身生成
  menu.innerHTML = `
    <div class="menu-option-item" onclick="window.handleDeleteButton('${id}')">
      <img src="icons/icon-delete.png" class="option-icon" /> delete
    </div>
    <hr class="menu-divider" />
    <div class="menu-option-item" onclick="window.handleBookmarkButton('${id}')">
      <img src="icons/icon-bookmark.png" class="option-icon" /> bookmark
    </div>
  `;

  // ボタンの位置を取得
  const button = document.querySelector(`.menu-toggle[onclick*="${id}"]`);
  if (!button) return;
  
  const rect = button.getBoundingClientRect();
  
  // メニューサイズを取得するためにいったん表示
  menu.style.display = 'block';
  menu.style.position = 'fixed';
  menu.style.visibility = 'hidden'; // 表示せずにサイズ計算のために配置
  
  // メニューの幅と高さを取得
  const menuWidth = menu.offsetWidth;
  const menuHeight = menu.offsetHeight;
  
  // ボタンのサイズを取得
  const buttonWidth = rect.width;
  const buttonHeight = rect.height;
  
  // オプションボタンの位置を基準にした配置
  // メニューの右下がボタンの左上に近い位置に来るようにする
  let left = rect.left - menuWidth + 5; // メニュー右端がボタンの左端に少し被る
  let top = rect.top - menuHeight + 5; // メニュー下端がボタンの上端に少し被る
  
  // 画面端をチェック
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // 左端チェック - 画面左に収まらない場合
  if (left < 10) {
    // 代替位置：ボタンの右側に表示
    left = rect.right - 5; // ボタンの右端からちょっとだけ左
  }
  
  // 右端チェック - 画面右に収まらない場合
  if (left + menuWidth > viewportWidth - 10) {
    left = viewportWidth - menuWidth - 10; // 画面右から10px
  }
  
  // 上端チェック - 画面上に収まらない場合
  if (top < 10) {
    // 代替位置：ボタンの下に表示
    top = rect.bottom - 5; // ボタンの下端からちょっとだけ上
  }
  
  // 下端チェック - 画面下に収まらない場合
  if (top + menuHeight > viewportHeight - 10) {
    top = viewportHeight - menuHeight - 10; // 画面下から10px
  }
  
  // 位置を設定して表示
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.visibility = 'visible'; // 可視化
  
  // メニューにクラスを追加して右下に矢印を表示
  menu.classList.add('arrow-bottom-right');
  
  // クリック監視を設定
  setTimeout(() => {
    const safeOutsideClickListener = (event) => {
      const isMenuClick = menu.contains(event.target);
      const isButtonClick = button.contains(event.target);

      if (!isMenuClick && !isButtonClick) {
        menu.style.display = 'none';
        document.removeEventListener('click', safeOutsideClickListener);
      }
    };
    document.addEventListener('click', safeOutsideClickListener);
  }, 0);
};




window.handleDeleteButton = function(id) {
  const menu = document.getElementById(`menu-${id}`);
  const li = menu.closest('li');
  if (li) {
    window.deletePostFromFirestore(id, li);
  }
};

// ブックマーク処理
window.handleBookmarkButton = function(id) {
  // メニューを閉じる
  const menu = document.getElementById(`menu-${id}`);
  if (menu) {
    menu.style.display = 'none';
  }
  
  // 投稿要素を取得 - 検索方法を改善
  const postElement = document.querySelector(`li[data-doc-id="${id}"]`) || document.querySelector(`li[data-key="${id}"]`);
  if (!postElement) {
    console.error("投稿が見つかりません:", id);
    return;
  }
  
  // 投稿データを取得
  const userName = postElement.querySelector('.message-user').textContent;
  const messageTextEl = postElement.querySelector('.message-text');
  const postText = messageTextEl.getAttribute('data-original') || messageTextEl.textContent;
  const timeText = postElement.querySelector('.message-time').textContent;
  const iconSrc = postElement.querySelector('.user-icon').src;
  
  // ブックマークデータを作成
  const bookmarkData = {
    id: id,
    user: userName,
    text: postText,
    time: timeText,
    icon: iconSrc,
    bookmarkedAt: new Date().toISOString()
  };
  
  // ローカルストレージからブックマークリストを取得
  let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
  
  // すでにブックマークされているか確認し、古いエントリを削除
  const existingIndex = bookmarks.findIndex(bookmark => bookmark.id === id);
  if (existingIndex >= 0) {
    bookmarks.splice(existingIndex, 1); // 古いエントリを削除
  }
  
  // ブックマークリストに追加
  bookmarks.push(bookmarkData);
  
  // 重複を削除（IDで重複チェック）
  bookmarks = bookmarks.filter((bookmark, index, self) => 
    index === self.findIndex(b => b.id === bookmark.id)
  );
  
  // ローカルストレージに保存
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  
  // 成功メッセージ
  alert("ブックマークに追加しました！");
};

window.closeAllMenus = function(event) {
  if (!event.target.closest('.menu-toggle') && !event.target.closest('.menu-options')) {
    document.querySelectorAll('.menu-options').forEach(el => el.classList.remove('show'));
    document.removeEventListener('click', window.closeAllMenus); // 一回閉じたら監視も解除
  }
};

// スクロール関連（そのままでOK）
window.scrollToTop = function() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.scrollToBottom = function() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
};

// 投稿関連の関数
window.formatRelativeTime = function(timestamp) {
  return `${timestamp.getFullYear()}/${timestamp.getMonth() + 1}/${timestamp.getDate()} ${timestamp.getHours()}:${String(timestamp.getMinutes()).padStart(2, '0')}`;
};

window.autoLink = function(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
};
// ★ 追加する escapeHtml関数！
window.escapeHtml = function(text) {
  return text.replace(/[&<>"']/g, (match) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[match]));
};

window.autoGrow = function(element) {
  element.style.height = "auto";
  element.style.height = (element.scrollHeight) + "px";
};

window.postLocalMessage = async function() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  const type = currentTimeline; // ここが "tab1" とか "tab2"

  if (text === "") {
    alert("your message");
    return;
  }
  
  const lineCount = (text.match(/\n/g) || []).length + 1;
  
  if (text.length > 300) {
    alert("Max 300 characters.");
    return;
  }
  
  if (lineCount > 10) {
    alert("Max 10 lines.");
    return;
  }

  const linkCount = (text.match(/https?:\/\/[^\s]+/g) || []).length;
  if (linkCount > 1) {
    alert("Cannot past 2 URLs.");
    return;
  }
  const safeText = escapeHtml(text); // ← ★ ここ追加！
  const convertedText = window.autoLink(safeText).replace(/\n/g, "<br>");
  const li = document.createElement("li");
  li.className = "message";
  li.dataset.timeline = type; // ★ 投稿にタブIDを付ける

  const now = new Date();
  const user = document.getElementById("displayNameInput")?.value.trim() || "匿名";
  const key = `msg-${messageCount++}`;
  const savedName = localStorage.getItem("displayName") || "";
  const isOwn = user === savedName;
  li.className += (isOwn ? " own" : " other");

	li.innerHTML = `
  <div class="message-header">
    <div class="left-side">
      <img src="${document.getElementById("profileIcon").src}" class="user-icon" width="30" height="30" style="cursor: pointer;" onclick="window.showUserProfile('${user}', '${document.getElementById("profileIcon").src}')" />
      <span class="message-user">${user}</span>
      ${window.renderReplyAndLikeCount(key)}
    </div>
    <div class="right-side">
      <button class="icon-btn like-btn" style="background-image: url('icons/icon-like.png');" title="いいね" onclick="toggleLike('${key}')"></button>
      <span class="count-text" id="likeCount-${key}">0</span>
      <button class="menu-toggle" onclick="toggleMessageMenu('${key}')"></button>
      <div class="menu-options" id="menu-${key}"></div>
      <span class="message-time">${window.formatRelativeTime(now)}</span>
    </div>
  </div>

  <div class="message-text" data-original="${text}">${convertedText}</div>

`;


  document.getElementById("messageList").prepend(li);
  input.value = "";
  input.rows = 1;
  input.style.height = "auto";
  window.updateCharacterCount();
  window.togglePostForm();
  li.scrollIntoView({ behavior: "smooth", block: "start" });

  // Firestoreに保存
// Firestoreに保存
const fullIconUrl = document.getElementById("profileIcon").src;
const iconFileName = fullIconUrl.split('/').pop(); // ファイル名だけ取り出す

const postData = {
  user: user,
  text: text,
  icon: 'icons/' + iconFileName, // ←ここ！相対パスに直す
  time: serverTimestamp(),
  timeline: type
};


addDoc(collection(window.db, "posts"), postData)
  .then(docRef => {
    console.log("📦 Firestoreに保存しました:", docRef.id);
    li.dataset.docId = docRef.id;

		// 🔥 投稿リスト内のいいね・返信ボタンのイベントもdocIdで更新する
			// 投稿直後、docIdが分かったら...
			li.dataset.docId = docRef.id;

			// 🔥 いいねカウントと返信カウントのIDもdocIdに変更
			const likeCountSpan = li.querySelector(`[id^="likeCount-"]`);
			const replyCountSpan = li.querySelector(`[id^="replyCount-"]`);
			if (likeCountSpan) likeCountSpan.id = `likeCount-${docRef.id}`;
			if (replyCountSpan) replyCountSpan.id = `replyCount-${docRef.id}`;

			// 🔥 いいねボタン・返信ボタンのonclickもdocIdに変更
			li.querySelectorAll('.icon-btn').forEach(btn => {
				const title = btn.getAttribute('title');
				if (title === 'いいね') {
					btn.setAttribute('onclick', `toggleLike('${docRef.id}')`);
				} else if (title === '返信') {
					btn.setAttribute('onclick', `toggleReplyBox('${docRef.id}')`);
				}
			});


  })
  .catch(error => {
    console.error("🔥 Firestore保存エラー:", error);
  });

	// ★ここを追加！localStorageにも保存する
	const cachedPosts = JSON.parse(localStorage.getItem('posts_cache') || '[]');
	cachedPosts.unshift({ postData: postData, docId: li.dataset.docId });
	localStorage.setItem('posts_cache', JSON.stringify(cachedPosts));

};

// 投稿の削除
window.deletePostFromFirestore = async function(docId, liElement) {
  const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");
  if (!window.db || !docId) return;

  const confirmDelete = confirm("Delete your post?");
  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(window.db, "posts", docId));
    liElement.remove(); // DOMからも削除
    console.log("🗑 投稿をFirestoreから削除しました：", docId);
  } catch (e) {
    console.error("削除失敗：", e);
  }
};


// タイムライン関連
window.switchTimeline = function(type) {
  currentTimeline = type;

  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  event.target.classList.add("active");

  window.filterByTimeline();
};

window.filterByTimeline = function(specificTimeline) {
  // 表示するタイムライン（引数で指定されていればそれを使用、なければグローバル変数を使用）
  const targetTimeline = specificTimeline || currentTimeline;
  
  // タブボタン表示更新
  if (!specificTimeline) {
    document.querySelectorAll(".tab-btn").forEach(btn => {
      if (btn.dataset.tab === targetTimeline) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }
  
  // 投稿のフィルタリング
  const messages = document.querySelectorAll("#messageList li");
  messages.forEach(msg => {
    const timelineType = msg.dataset.timeline;
    if (timelineType === targetTimeline) {
      msg.style.display = "block";
    } else {
      msg.style.display = "none";
    }
  });
};

// いいね関連（空の要素を返す - オプションメニュー付近に移動するため）
window.renderReplyAndLikeCount = function(key) {
  return `
    <div class="action-buttons">
    </div>
  `;
};



window.toggleLike = async function(postId) {
  const user = document.getElementById("displayNameInput")?.value.trim() || "匿名";

  if (!window.db) return;

  const { collection, doc, setDoc, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");

  try {
    const likeRef = collection(window.db, "likes");
    const q = query(likeRef, where("postId", "==", postId), where("user", "==", user));

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      alert("Already liked.");
      return;
    }

    // 新しい「いいね」をFirestoreに追加
    await setDoc(doc(likeRef), {
      postId: postId,
      user: user,
      time: serverTimestamp(),
    });

    // いいね数のカウントを更新
    const likeCount = await getDocs(query(collection(window.db, "likes"), where("postId", "==", postId)));
    document.getElementById(`likeCount-${postId}`).textContent = likeCount.size;
  } catch (error) {
    console.error("🔥 いいね保存エラー:", error);
  }
};



window.updateReplyCharCount = function(key) {
  const input = document.getElementById(`replyInput-${key}`);
  const count = input.value.length;
  const countDisplay = document.getElementById(`replyCharCount-${key}`);
  countDisplay.textContent = `${count} / 300`;
  countDisplay.style.color = count > 300 ? "red" : "#0a1d4d";
};

window.submitReply = async function(postId) {
  const input = document.getElementById(`replyInput-${postId}`);
  const text = input.value.trim();

  if (!text) return;
  if (text.length > 1000) {
    alert("返信は1000文字以内です");
    return;
  }

  const user = document.getElementById("displayNameInput")?.value.trim() || "匿名";
  const time = serverTimestamp(); // Firestoreのタイムスタンプを使用

  // Firestoreの返信データ保存
  if (!window.db) return;

  const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");

  try {
    const replyData = {
      user: user,
      text: text,
      time: time,
      postId: postId,  // 返信元の投稿ID
    };

    await addDoc(collection(window.db, "replies"), replyData); // Firestoreに保存

    // 返信をUIに表示
    window.renderReplies(postId);

    // 入力フィールドをリセット
    input.value = "";
    window.updateReplyCharCount(postId);
  } catch (error) {
    console.error("返信の保存に失敗しました:", error);
  }
};

window.renderReplies = async function(postId) {
  const container = document.getElementById(`replies-${postId}`);
  
  if (!container) {
    console.error(`⚠️ reply用のdivが見つかりません：replies-${postId}`);
    return;
  }

  container.innerHTML = "";  // 既存の内容をリセット

  if (!window.db) return;

  const { collection, query, where, getDocs, orderBy } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");

	const q = query(
		collection(window.db, "replies"),
		where("postId", "==", postId),
		orderBy("time", "desc") // 🔥 昇順(asc) → 降順(desc)にする！！
	);
	

  
  try {
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(doc => {
      const reply = doc.data();
      const div = document.createElement("div");
      const timeStr = window.formatRelativeTime(reply.time.toDate());
      div.className = "reply-item";
      const convertedReply = reply.text.replace(/\n/g, "<br>");
      div.innerHTML = `<strong>${reply.user}</strong>: ${convertedReply} <span style="font-size: 0.75em; color: #999;">${timeStr}</span>`;

      container.appendChild(div);
    });
  } catch (error) {
    console.error("返信の表示に失敗しました:", error);
  }
};


// 検索機能
window.filterMessages = function() {
  const keyword = document.getElementById("floatingSearchInput").value.trim();
  const messages = document.querySelectorAll("#messageList li");

  const activeTimeline = currentTimeline; // 現在選択中のタブ名（例："tab1"）

  messages.forEach(msg => {
    const textElement = msg.querySelector(".message-text");
    if (!textElement) return;

    const originalText = textElement.dataset.original || textElement.textContent;
    const timelineType = msg.dataset.timeline; // 投稿が属するタブ

    if (!textElement.dataset.original) {
      textElement.dataset.original = originalText;
    }

    // タイムラインが違う投稿は無条件で非表示
    if (timelineType !== activeTimeline) {
      msg.style.display = "none";
      return;
    }

    // 検索キーワードあり/なしによる表示制御
    if (keyword === "") {
      msg.style.display = "block";
      textElement.innerHTML = originalText;
    } else if (originalText.includes(keyword)) {
      msg.style.display = "block";
      const highlighted = originalText.replaceAll(keyword, `<mark>${keyword}</mark>`);
      textElement.innerHTML = highlighted;
    } else {
      msg.style.display = "none";
    }
  });
};


// プロフィール関連
window.positionIconSelector = function() {
  const iconBox = document.getElementById("profileIconBox");
  const selector = document.getElementById("iconSelector");

  if (iconBox && selector) {
    const rect = iconBox.getBoundingClientRect();

    selector.style.top = `${rect.bottom + window.scrollY + 5}px`; // アイコンの下に5px余裕
    selector.style.left = `${rect.left + window.scrollX}px`;      // アイコンの左端に合わせる
  }
};


window.toggleIconSelector = function() {
  const selector = document.getElementById("iconSelector");
  
  // アイコンセレクターの表示・非表示を切り替え
  if (selector.style.display === "none") {
    window.positionIconSelector(); // 位置を調整してから表示
    selector.style.display = "block";
  } else {
    selector.style.display = "none";
  }
};

window.selectIcon = function(filename) {
  document.getElementById("profileIcon").src = filename;
  localStorage.setItem("profileIcon", filename);
  document.getElementById("iconSelector").style.display = "none";
};

window.loadProfileIcon = function() {
  const savedIcon = localStorage.getItem("profileIcon") || "icons/p-icon-01.png";
  document.getElementById("profileIcon").src = savedIcon;
};

		window.setDisplayName = function(name) {
			if (name.length > 30) {
				alert("Max 30 characters.");
				return;
			}
			const safeName = name.replace(/[<>]/g, ""); // HTMLタグ除去
			localStorage.setItem("displayName", safeName);
		};
		

// Firestore関連の関数
window.loadPostsFromFirestore = async function() {
  const messageList = document.getElementById("messageList");
  messageList.innerHTML = "";

  let cache;
  if ('caches' in window) {
    cache = await caches.open('talkbox-cache-v4');
  } else {
    console.warn("⚠️ caches APIが使えない環境です");
  }
  const requestUrl = new Request('https://firestore.googleapis.com/v1/projects/i-post-04-fuh/databases/(default)/documents/posts');

  let posts = [];

  try {
    let cachedResponse = null;
    if (cache) {
      cachedResponse = await cache.match(requestUrl);
    }
    
    if (cachedResponse) {
      console.log("✅ キャッシュから投稿読み込み中...");
      const data = await cachedResponse.json();
      if (data.documents) {
        data.documents.forEach(doc => {
          const postData = {
            user: doc.fields.user.stringValue,
            text: doc.fields.text.stringValue,
            icon: doc.fields.icon.stringValue,
            time: { toDate: () => new Date(doc.fields.time.timestampValue) },
            timeline: doc.fields.timeline.stringValue
          };
          const docId = doc.name.split('/').pop();
          posts.push({ postData, docId });
          window.renderPostFromFirestore(postData, docId);
        });
      }
    } else {
      console.log("🌐 Firestoreから直接読み込み中...");
      const { collection, query, getDocs, orderBy, limit } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");

      const q = query(collection(window.db, "posts"), orderBy("time", "desc"),
        limit(50) // 🔥 最新50件だけ取得！
      );
      
      const querySnapshot = await getDocs(q); // ← サーバーから最新50件を取得

      // 現在表示中のDocIDを取得する関数
      const getCurrentDisplayedDocIds = () => {
        const elements = document.querySelectorAll("#messageList li[data-doc-id]");
        return Array.from(elements).map(el => el.dataset.docId);
      };
      
      const currentDocIds = getCurrentDisplayedDocIds(); // 今ある投稿のIDを集める

      querySnapshot.forEach(doc => {
        const postData = doc.data();
        const docId = doc.id;

        if (currentDocIds.includes(docId)) return; // もうある投稿なら無視する！

        posts.push({ postData, docId });
        window.renderPostFromFirestore(postData, docId); // 画面に表示
        
        // ★ここでlocalStorageにも追加保存する！
        const cached = JSON.parse(localStorage.getItem('posts_cache') || '[]');
        cached.unshift({ postData, docId }); // 新しい投稿を先頭に追加
        localStorage.setItem('posts_cache', JSON.stringify(cached));
      });
    }

    console.log("✅ 投稿データ一覧:", posts);

    // 🎯 ここで保存！
    localStorage.setItem('posts_cache', JSON.stringify(posts));
    console.log("✅ localStorageに保存しました");

  } catch (error) {
    console.error("🔥 Firestore取得エラー:", error);

    // 通信エラーならlocalStorageから復元！
    const cached = localStorage.getItem('posts_cache');
    if (cached) {
      console.log("✅ localStorageから投稿復元中...");
      const posts = JSON.parse(cached);
      posts.forEach(item => {
        window.renderPostFromFirestore(item.postData, item.docId);
      });
    }
  }

  // 投稿整理：50日以上前は削除
  const allPosts = document.querySelectorAll("#messageList li");
  const now = new Date();
  allPosts.forEach(post => {
    const timeText = post.querySelector(".message-time")?.textContent;
    if (timeText) {
      const postDate = new Date(timeText);
      const diffDays = (now - postDate) / (1000 * 60 * 60 * 24);
      if (diffDays > 50) {
        post.remove();
      }
    }
  });

  // 投稿整理：5000件超えたら古い順に削除
  const remainingPosts = document.querySelectorAll("#messageList li");
  if (remainingPosts.length > 5000) {
    const extra = remainingPosts.length - 5000;
    for (let i = remainingPosts.length - 1; i >= remainingPosts.length - extra; i--) {
      remainingPosts[i].remove();
    }
  }
  
  // 返却値を追加してPromiseチェーンで使えるようにする
  return posts;
};


// Firestoreから投稿を1件読み込んで表示する
window.renderPostFromFirestore = function(post, docId) {
	const now = new Date();

// 投稿を画面に追加する処理
const key = docId; // Firestoreから受け取ったdocIdをキーに使う！

  // 投稿用のli要素を作成
  const li = document.createElement("li");

  // 🔥 タブ情報（タイムラインID）をセット
  li.dataset.timeline = post.timeline || "tab1"; // ←ここを必ず付ける！

  // FirestoreのドキュメントIDも保存
  li.dataset.docId = docId;

  // 投稿者の名前を取得
  const savedName = localStorage.getItem("displayName") || "";

  // 自分の投稿かどうか判定
  const isOwn = (post.user === savedName);

  // クラス名をセット（自分なら "own"、他人なら "other"）
  li.className = "message " + (isOwn ? "own" : "other");

  // 投稿本文を自動リンク化＋改行変換
  const formattedText = window.autoLink(post.text).replace(/\n/g, "<br>");

  // Firestoreの時間をJSの日付に変換
  const date = post.time?.toDate ? post.time.toDate() : new Date();

  // 投稿のHTMLを作成
	li.innerHTML = `
<div class="message-header">
  <div class="left-side">
    <img src="${post.icon}" class="user-icon" width="30" height="30" style="cursor: pointer;" onclick="window.showUserProfile('${post.user}', '${post.icon}')" />
    <span class="message-user">${post.user}</span>
    ${window.renderReplyAndLikeCount(key)}
  </div>
  <div class="right-side">
    <button class="icon-btn like-btn" style="background-image: url('icons/icon-like.png');" title="いいね" onclick="toggleLike('${key}')"></button>
    <span class="count-text" id="likeCount-${key}">0</span>
    <button class="menu-toggle" onclick="toggleMessageMenu('${key}')"></button>
    <div class="menu-options" id="menu-${key}"></div>
    <span class="message-time">${window.formatRelativeTime(now)}</span>
  </div>
</div>


  <div class="message-text" data-original="${post.text}">${formattedText}</div>

`;

  // 投稿リストに追加
  document.getElementById("messageList").appendChild(li);
	window.renderReplies(docId);
};

window.renderLikeCount = async function(postId) {
  if (!window.db) return; // Firestoreが初期化されていなければ終了

  const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");

  // Firestoreで「いいね」データを検索
  const q = query(collection(window.db, "likes"), where("postId", "==", postId));

  // クエリを実行し、結果を取得
  const querySnapshot = await getDocs(q);

  // 取得した結果から「いいね」数を反映
  document.getElementById(`likeCount-${postId}`).textContent = querySnapshot.size;
};

// その他の機能
window.toggleDmList = function() {
  alert("DM機能はまだ未実装です。今後ここにDMリストを表示します！");
};

// データ保存
// 性別選択ポップアップの表示/非表示を切り替える
window.toggleGenderSelector = function() {
  const selector = document.getElementById("genderSelector");
  selector.style.display = selector.style.display === "none" ? "block" : "none";
  
  // ポップアップを表示したときにクリック監視を追加
  if (selector.style.display === "block") {
    setTimeout(() => {
      document.addEventListener('click', closeGenderSelector);
    }, 100);
  }
};

// 性別を選択する
window.selectGender = function(value, text) {
  const selectElement = document.getElementById("genderSelect");
  const displayElement = document.getElementById("genderValue");
  
  // 値を設定
  selectElement.value = value;
  displayElement.textContent = text;
  
  // データを保存
  localStorage.setItem("gender", value);
  
  // 表示名も保存
  localStorage.setItem("genderText", text);
  
  // ポップアップを閉じる
  document.getElementById("genderSelector").style.display = "none";
  document.removeEventListener('click', closeGenderSelector);
};

// ポップアップ外のクリックで閉じる
function closeGenderSelector(event) {
  const selector = document.getElementById("genderSelector");
  const displayElement = document.getElementById("genderValue");
  
  if (!selector.contains(event.target) && event.target !== displayElement) {
    selector.style.display = "none";
    document.removeEventListener('click', closeGenderSelector);
  }
}

// 保存されている性別を読み込む
window.loadSavedGender = function() {
  const gender = localStorage.getItem("gender") || "none";
  const genderText = localStorage.getItem("genderText") || "---";
  
  const selectElement = document.getElementById("genderSelect");
  const displayElement = document.getElementById("genderValue");
  
  selectElement.value = gender;
  displayElement.textContent = genderText;
};

window.updateDescription = function() {
  const textarea = document.getElementById("descriptionInput");
  const description = textarea.value;
  const charCount = document.getElementById("bioCharCount");
  
  // 文字数カウントを更新
  const length = description.length;
  charCount.textContent = `${length} / 300`;
  
  // 文字数制限時の色変更
  if (length > 300) {
    charCount.style.color = "red";
  } else {
    charCount.style.color = "#0a1d4d";
  }
  
  // ローカルストレージに保存
  localStorage.setItem("description", description);
};

// ブックマーク関連の機能
// ブックマークリストを読み込む
window.loadBookmarks = function() {
  const bookmarkList = document.getElementById('bookmarkList');
  const emptyState = document.getElementById('emptyBookmarks');
  
  // ローカルストレージからブックマークリストを取得
  const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
  
  // リストをクリア
  bookmarkList.innerHTML = '';
  
  // 空の状態の表示制御
  if (bookmarks.length === 0) {
    emptyState.style.display = 'block';
    return;
  } else {
    emptyState.style.display = 'none';
  }
  
  // 日付順（逆順）でソート
  bookmarks.sort((a, b) => new Date(b.bookmarkedAt) - new Date(a.bookmarkedAt));
  
  // ブックマークリストを表示
  bookmarks.forEach(bookmark => {
    const li = document.createElement('li');
    li.className = 'bookmark-item';
    li.dataset.id = bookmark.id;
    
    li.innerHTML = `
      <div class="message-header">
        <div class="left-side">
          <img src="${bookmark.icon}" class="user-icon" width="30" height="30" />
          <span class="message-user">${bookmark.user}</span>
        </div>
        <div class="right-side">
          <span class="message-time">${bookmark.time}</span>
          <input type="checkbox" class="bookmark-checkbox" />
        </div>
      </div>
      <div class="message-text">${window.autoLink(bookmark.text).replace(/\n/g, '<br>')}</div>
    `;
    
    bookmarkList.appendChild(li);
  });
};

// 全てのブックマークを選択する
window.selectAllBookmarks = function() {
  document.querySelectorAll('.bookmark-checkbox').forEach(checkbox => {
    checkbox.checked = true;
  });
};

// 全てのブックマークの選択を解除する
window.unselectAllBookmarks = function() {
  document.querySelectorAll('.bookmark-checkbox').forEach(checkbox => {
    checkbox.checked = false;
  });
};

// 選択したブックマークを削除する
window.deleteSelectedBookmarks = function() {
  // 選択されたブックマークの要素を取得
  const selectedItems = document.querySelectorAll('.bookmark-checkbox:checked');
  
  if (selectedItems.length === 0) {
    alert('削除するブックマークを選択してください');
    return;
  }
  
  // 削除確認
  const confirmDelete = confirm(`${selectedItems.length}件のブックマークを削除します。よろしいですか？`);
  if (!confirmDelete) return;
  
  // ローカルストレージからブックマークリストを取得
  let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
  
  // 削除するIDリストを作成
  const deleteIds = Array.from(selectedItems).map(checkbox => 
    checkbox.closest('.bookmark-item').dataset.id
  );
  
  // 削除
  bookmarks = bookmarks.filter(bookmark => !deleteIds.includes(bookmark.id));
  
  // ローカルストレージに保存
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  
  // リストを再読み込み
  window.loadBookmarks();
};

// ブックマークをエクスポートする
window.exportBookmarks = function() {
  // ローカルストレージからブックマークリストを取得
  const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
  
  if (bookmarks.length === 0) {
    alert('エクスポートするブックマークがありません');
    return;
  }
  
  // テキストフォーマットに変換
  let exportText = '';
  bookmarks.forEach(bookmark => {
    // タブ区切りのテキスト形式
    exportText += `${bookmark.time}\t@${bookmark.user}\t${bookmark.text.replace(/\n/g, ' ')}\n`;
  });
  
  // Blobオブジェクトを作成
  const blob = new Blob([exportText], { type: 'text/plain' });
  
  // ブラウザサポートの確認
  if ('msSaveBlob' in navigator) {
    // IE/Edgeの場合
    window.navigator.msSaveBlob(blob, 'bookmarks.txt');
  } else {
    // その他のブラウザの場合
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookmarks.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

// イベントリスナー
document.addEventListener("DOMContentLoaded", () => {
  window.loadProfileIcon();
  window.loadSavedGender(); // 保存された性別を読み込む
  window.loadPostsFromLocalStorage(); // ←起動時はローカルのみ！
});

let lastScrollY = window.scrollY;

window.addEventListener('scroll', () => {
  const currentScrollY = window.scrollY;
  const header = document.getElementById('floatingHeader');

  // 最優先で「一番上なら絶対に表示」を先に判定！！
  if (currentScrollY === 0) {
    header.style.transform = 'translateY(0)';
  } else if (currentScrollY > lastScrollY) {
    // 下にスクロール → 隠す
    header.style.transform = 'translateY(-100%)';
  } else if (currentScrollY < lastScrollY) {
    // 上にスクロール → 表示
    header.style.transform = 'translateY(0)';
  }

  lastScrollY = currentScrollY;
});


// 投稿リストをローカルストレージに保存
function savePostsToLocal(posts) {
  localStorage.setItem('posts', JSON.stringify(posts));
}

// ローカルストレージから投稿リストを読み込む
window.loadPostsFromLocalStorage = function() {
  const messageList = document.getElementById("messageList");
  messageList.innerHTML = ""; // 一旦クリア

  const savedPosts = JSON.parse(localStorage.getItem('posts_cache') || '[]');
  savedPosts.forEach(item => {
    window.renderPostFromFirestore(item.postData, item.docId);
  });
};


// 投稿を画面に表示する
function renderPost(post, prepend = false) {
  const postElement = document.createElement('div');
  postElement.className = 'post';
  postElement.innerText = post.content;

  const postList = document.getElementById('postList');
  if (prepend) {
    postList.prepend(postElement); // 上に追加
  } else {
    postList.appendChild(postElement); // 下に追加
  }
}

// ユーザーアイコンクリック時の処理関数
window.showUserProfile = function(username, iconSrc) {
  // プロフィールポップアップの要素を取得
  const popup = document.getElementById('otherUserProfile');
  const userIcon = document.getElementById('otherUserIcon');
  const userName = document.getElementById('otherUserName');
  const userIdentity = document.getElementById('otherUserIdentity');
  const userBio = document.getElementById('otherUserBio');
  const loginBtn = document.getElementById('otherUserLoginBtn');
  
  // 現在のログイン状態を確認
  const isLoggedIn = auth.currentUser !== null;
  
  // ログインボタンの表示/非表示を設定
  if (isLoggedIn) {
    loginBtn.style.border = "2px solid #5aff5a"; // ログイン中は緑色の枠
    loginBtn.style.backgroundColor = "rgba(90, 255, 90, 0.1)";
  } else {
    loginBtn.style.border = "1px solid #ccc";
    loginBtn.style.backgroundColor = "white";
  }
  
  // ユーザー情報を表示
  userIcon.src = iconSrc;
  userName.textContent = username;
  
  // データベースからユーザー情報を取得する
  const fetchUserData = async () => {
    try {
      // まずユーザー名からユーザーを検索
      const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");
      const usersRef = collection(window.db, "users");
      const q = query(usersRef, where("displayName", "==", username));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // ユーザーが見つかった場合
        const userData = querySnapshot.docs[0].data();
        userIdentity.textContent = userData.gender || "-";
        userBio.textContent = userData.bio || "No bio available";
      } else {
        // ユーザーが見つからない場合、デフォルト値を表示
        userIdentity.textContent = "-";
        userBio.textContent = "No bio available";
      }
    } catch (error) {
      console.error("ユーザー情報の取得に失敗しました:", error);
      userIdentity.textContent = "-";
      userBio.textContent = "Error loading user information";
    }
  };
  
  // ユーザーデータを取得
  fetchUserData();
  
  // ポップアップを表示
  popup.style.display = 'block';
};

// 最初にローカルから読み込んで表示
let currentPosts = loadPostsFromLocal();

currentPosts.forEach(post => {
  renderPost(post);
});

// プル・トゥ・リフレッシュ検知と実装
let touchStartY = 0;
let refreshIndicator = null;

// リフレッシュインジケーターを作成
function createRefreshIndicator() {
  if (!refreshIndicator) {
    refreshIndicator = document.createElement('div');
    refreshIndicator.id = 'refreshIndicator';
    refreshIndicator.style.position = 'fixed';
    refreshIndicator.style.top = '-60px';
    refreshIndicator.style.left = '50%';
    refreshIndicator.style.transform = 'translateX(-50%)';
    refreshIndicator.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    refreshIndicator.style.color = '#0a1d4d';
    refreshIndicator.style.padding = '10px 20px';
    refreshIndicator.style.borderRadius = '0 0 20px 20px';
    refreshIndicator.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    refreshIndicator.style.transition = 'top 0.3s ease';
    refreshIndicator.style.zIndex = '2001';
    refreshIndicator.style.textAlign = 'center';
    refreshIndicator.innerHTML = '↓ Pull to refresh';
    document.body.appendChild(refreshIndicator);
  }
  return refreshIndicator;
}

// プル・トゥ・リフレッシュの状態
let isPulling = false;
let pullThreshold = 100; // ピクセル単位のしきい値

document.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  
  // 最上部でのみプル動作を有効にする
  if (scrollTop === 0) {
    isPulling = true;
    createRefreshIndicator();
  }
});

document.addEventListener('touchmove', (e) => {
  if (!isPulling) return;
  
  const touchY = e.touches[0].clientY;
  const pullDistance = touchY - touchStartY;
  
  if (pullDistance > 0) {
    // スクロールをブロック
    e.preventDefault();
    
    // インジケーターを引っ張った分だけ表示
    const indicator = createRefreshIndicator();
    const newTop = Math.min(10, -60 + (pullDistance * 0.5));
    indicator.style.top = `${newTop}px`;
    
    // 引っ張り具合によって表示を変更
    if (pullDistance > pullThreshold) {
      indicator.innerHTML = '↑ Release to refresh';
    } else {
      indicator.innerHTML = '↓ Pull to refresh';
    }
  }
}, { passive: false });

document.addEventListener('touchend', (e) => {
  if (!isPulling) return;
  
  const touchEndY = e.changedTouches[0].clientY;
  const pullDistance = touchEndY - touchStartY;
  const indicator = createRefreshIndicator();
  
  // しきい値を超えたらリフレッシュを実行
  if (pullDistance > pullThreshold) {
    // リフレッシュアニメーション
    indicator.innerHTML = '⟳ Refreshing...';
    
    // 現在のタブを記憶
    const activeTab = currentTimeline;
    
    // まずローカルストレージから即時復元
    window.loadPostsFromLocalStorage();
    
    // Firestoreから最新データを取得
    setTimeout(() => {
      window.loadPostsFromFirestore().then(() => {
        // データのロード後、元のタブを表示
        window.filterByTimeline(activeTab);
        
        // 完了表示
        indicator.innerHTML = '✓ Refreshed!';
        
        // 少し待ってからインジケーターを引っ込める
        setTimeout(() => {
          indicator.style.top = '-60px';
        }, 1000);
      });
    }, 500);
  } else {
    // しきい値未満ならインジケーターを引っ込める
    indicator.style.top = '-60px';
  }
  
  // プル状態をリセット
  isPulling = false;
});



const auth = getAuth(app); // Firebase Authインスタンス作成

async function showProfileInfo(user) {
  if (!user) return;

  // ログイン状態を表示
  const googleLoginBtn = document.getElementById("googleLoginBtn");
  googleLoginBtn.classList.add("logged-in");
  
  // メールアドレスを表示
  document.getElementById("loginEmail").textContent = user.email;
  
  // ユーザーIDを表示
  document.getElementById("profileUsername").textContent = user.uid;
  
  // 表示名を設定（Googleアカウント名）
  if (user.displayName) {
    localStorage.setItem("displayName", user.displayName);
    document.getElementById("displayNameInput").value = user.displayName;
  }
}

// ログイン状態チェック
auth.onAuthStateChanged(user => {
  if (user) {
    // ログイン中
    showProfileInfo(user);
  } else {
    // 未ログイン
    document.getElementById("googleLoginBtn").classList.remove("logged-in");
    document.getElementById("loginEmail").textContent = "";
    document.getElementById("profileUsername").textContent = "-";
  }
});

// Googleログインボタン押した時の処理
window.googleLogin = async function() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Firestoreにユーザー情報保存
    const { setDoc, doc } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");

    // 🔥ここでチェック追加！！
    if (!user) {
      console.error("⚠️ ログインに失敗しました。userがnullです。");
      alert("ログインに失敗しました。もう一度やり直してください。");
      return;
    }
    
    await setDoc(doc(window.db, "users", user.uid), {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    }, { merge: true });

    // プロフィール情報を表示
    await showProfileInfo(user);

    console.log("✅ ログイン成功:", user);

  } catch (error) {
    console.error("🔥 ログインエラー:", error);
  }
};

// イベントリスナーを設定
document.addEventListener("DOMContentLoaded", () => {
  // Googleログインボタンのイベントリスナー
  const googleLoginBtn = document.getElementById("googleLoginBtn");
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", window.googleLogin);
  }
});

// ログアウトボタン押した時
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await auth.signOut();
    
    // ログアウト表示を更新
    document.getElementById("googleLoginBtn").classList.remove("logged-in");
    document.getElementById("loginEmail").textContent = "";
    document.getElementById("profileUsername").textContent = "-";
    
    alert("ログアウトしました！");
  } catch (error) {
    console.error("ログアウトエラー:", error);
  }
});
