// Firebase設定
const firebaseConfig = {
	// ⚠️ ここにご自身のFirebase設定情報を追加してください
	apiKey: "AIzaSyAN6Xe4GgYsKcXz_xKbGVQ9ur33BcLf9Q0",
	authDomain: "emoji-jem.firebaseapp.com",
	databaseURL: "https://emoji-jem-default-rtdb.asia-southeast1.firebasedatabase.app",
	projectId: "emoji-jem",
	storageBucket: "emoji-jem.firebasestorage.app",
	messagingSenderId: "684158163698",
	appId: "1:684158163698:web:83e8656046aad3234d0e6b"
};

// グローバル変数
let currentUser = null;
let lastTimestamp = null;
let currentDmPartner = null;
let currentDmRoomId = null;
let currentMessageKey = null;
let currentViewingProfile = null;
let userProfiles = {};
let selectedAvatar = './icons/profile-icons/avatar1.svg';
let isGoogleUser = false;
let recentEmojis = JSON.parse(localStorage.getItem('recentEmojis') || '[]');
const translations = {
	ja: {
		loadMore: 'もっと見る',
		settings: '設定',
		home: 'ホーム',
		language: '言語設定',
		darkMode: 'ダークモード',
		deleteConfirm: '投稿を削除しますか？',
		cancel: 'キャンセル',
		delete: '削除',
		on: 'オン',
		off: 'オフ',
		irreversible: 'この操作は元に戻せません。'
	},
	en: {
		loadMore: 'Load More',
		settings: 'Settings',
		home: 'Home',
		language: 'Language',
		darkMode: 'Dark Mode',
		deleteConfirm: 'Delete this post?',
		cancel: 'Cancel',
		delete: 'Delete',
		on: 'On',
		off: 'Off',
		irreversible: 'This action cannot be undone.'
	},
	tr: {
		loadMore: 'Daha Fazla',
		settings: 'Ayarlar',
		home: 'Ana Sayfa',
		language: 'Dil',
		darkMode: 'Karanlık Mod',
		deleteConfirm: 'Bu gönderiyi silmek istiyor musunuz?',
		cancel: 'İptal',
		delete: 'Sil',
		on: 'Açık',
		off: 'Kapalı',
		irreversible: 'Bu işlem geri alınamaz.'
	}
};
let currentLanguage = localStorage.getItem('language') || 'ja';

// ページ読み込み完了時の処理
document.addEventListener('DOMContentLoaded', function() {
	console.log('DOM Content Loaded');
	// Firebaseの初期化
	if (firebaseConfig.apiKey) {
		console.log('Firebase config found, initializing Firebase...');
		try {
			firebase.initializeApp(firebaseConfig);
			console.log('Firebase initialized successfully');
			initializeApp();
		} catch (error) {
			console.error('Error initializing Firebase:', error);
			alert('Firebaseの初期化に失敗しました: ' + error.message);
		}
	} else {
		console.error('Firebase config missing');
		alert('Firebaseの設定情報を追加してください');
	}
	
	// UIコンポーネントの初期化
	initializeUI();
});

// アプリ初期化
function initializeApp() {
	console.log('Initializing app...');
	
	// Firebase接続状態の監視
	const connectedRef = firebase.database().ref(".info/connected");
	connectedRef.on("value", (snap) => {
		if (snap.val() === true) {
			console.log("Firebase接続: オンライン");
			document.getElementById('loading').innerHTML = '<div class="preloader-wrapper small active"><div class="spinner-layer spinner-blue-only"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div>';
		} else {
			console.log("Firebase接続: オフライン");
			document.getElementById('loading').innerHTML = '<div class="red-text">オフライン状態です。インターネット接続を確認してください。</div>';
		}
	});
	
	// 認証状態の監視
	console.log('Setting up auth state listener...');
	firebase.auth().onAuthStateChanged(user => {
		console.log('Auth state changed:', user ? 'User signed in' : 'No user');
		
		// ログインボタンの状態を更新
		updateLoginButtonState(user);
		
		if (user) {
			console.log('Current user UID:', user.uid);
			currentUser = user;
			
			// Google認証済みかどうかをチェック
			isGoogleUser = user.providerData && 
										user.providerData.length > 0 && 
										user.providerData[0].providerId === 'google.com';
			
			// ユーザープロフィールを読み込む
			loadUserProfile(user.uid, profile => {
				// プロフィールが存在しない場合は初期プロフィールを作成
				if (!profile) {
					// デフォルトのプロフィール情報
					const defaultProfile = {
						uid: user.uid,
						username: `ユーザー${user.uid.substring(0, 4)}`,
						bio: '',
						photoURL: './icons/profile-icons/avatar1.svg',
						createdAt: firebase.database.ServerValue.TIMESTAMP,
						isVerified: isGoogleUser
					};
					
					// Firebaseにプロフィールを保存
					firebase.database().ref(`profiles/${user.uid}`).set(defaultProfile)
						.then(() => {
							console.log('Default profile created');
							userProfiles[user.uid] = defaultProfile;
							updateProfileUI(defaultProfile);
						})
						.catch(error => console.error('Error creating profile:', error));
				} else {
					// 認証情報の更新（Google認証後に既存プロフィールがある場合）
					if (isGoogleUser && !profile.isVerified) {
						firebase.database().ref(`profiles/${user.uid}`).update({
							isVerified: true,
							updatedAt: firebase.database.ServerValue.TIMESTAMP
						});
						profile.isVerified = true;
					}
					
					// 既存のプロフィールをUIに反映
					userProfiles[user.uid] = profile;
					updateProfileUI(profile);
				}
			});
			
			// 最新メッセージを読み込む
			loadMessages();
			// DMリストを読み込む
			loadDmList();
			// リアルタイム監視を開始
			startRealtimeListeners();
		} else {
			console.warn('No user is signed in');
			// 匿名認証で自動ログイン
			firebase.auth().signInAnonymously()
				.then(() => console.log('Anonymous sign-in successful'))
				.catch(error => {
					console.error('認証エラー:', error);
					alert('匿名認証に失敗しました: ' + error.message);
				});
		}
	});
}

// ログインボタンの状態を更新
function updateLoginButtonState(user) {
	console.log('Updating login button state:', user ? 'User logged in' : 'No user');
	
	// 要素の存在チェックを追加
	const loginButton = document.getElementById('login-button');
	const settingsLoginButton = document.getElementById('settings-login-button');
	
	// loginButtonが存在しない場合は処理をスキップ
	if (!loginButton) {
		console.warn('Login button element not found');
		return;
	}
	
	try {
		if (user && user.providerData && user.providerData.length > 0 && 
				user.providerData[0].providerId === 'google.com') {
			// Google認証済みの場合
			loginButton.innerHTML = '<i class="material-icons">verified_user</i>';
			loginButton.classList.add('green');
			loginButton.title = 'Google認証済み';
			
			if (settingsLoginButton) {
				settingsLoginButton.innerHTML = '<i class="material-icons left">logout</i>ログアウト';
				settingsLoginButton.classList.add('grey');
				settingsLoginButton.classList.remove('red');
			}
		} else if (user) {
			// 匿名認証の場合
			loginButton.innerHTML = '<i class="material-icons">person_outline</i>';
			loginButton.classList.remove('green');
			loginButton.title = 'Googleでログイン';
			
			if (settingsLoginButton) {
				settingsLoginButton.innerHTML = '<i class="material-icons left">login</i>Googleでログイン';
				settingsLoginButton.classList.add('red');
				settingsLoginButton.classList.remove('grey');
			}
		} else {
			// 未ログインの場合
			loginButton.innerHTML = '<i class="material-icons">login</i>';
			loginButton.classList.remove('green');
			loginButton.title = 'ログイン';
			
			if (settingsLoginButton) {
				settingsLoginButton.innerHTML = '<i class="material-icons left">login</i>Googleでログイン';
				settingsLoginButton.classList.add('red');
				settingsLoginButton.classList.remove('grey');
			}
		}
		console.log('Login button state updated successfully');
	} catch (error) {
		console.error('Error updating login button state:', error);
	}
}

// Googleでログイン
function signInWithGoogle() {
	const provider = new firebase.auth.GoogleAuthProvider();
	firebase.auth().signInWithPopup(provider)
		.then(result => {
			console.log('Google sign-in successful');
			// ログイン成功後の処理はonAuthStateChangedで行われる
		})
		.catch(error => {
			console.error('Google sign-in error:', error);
			if (error.code !== 'auth/popup-closed-by-user') {
				alert('Googleログインに失敗しました: ' + error.message);
			}
		});
}

// UI初期化
function initializeUI() {
	// Materializeコンポーネントの初期化
	M.Modal.init(document.querySelectorAll('.modal'));
	M.FormSelect.init(document.querySelectorAll('select'));
	
	// 言語設定を適用
	applyLanguageSettings();
	
	// ダークモード設定を適用
	const isDarkMode = localStorage.getItem('darkMode') === 'true';
	document.getElementById('dark-mode-switch').checked = isDarkMode;
	if (isDarkMode) {
		document.body.classList.add('dark-mode');
	}
	
	// プロフィールページが空の場合用の初期化
	document.getElementById('profile-container').addEventListener('click', function(e) {
		if (e.target === this) {
			showScreen('message-container');
		}
	});
	
	// イベントリスナーを設定
	setupEventListeners();
	
	// 絵文字パレットを初期化
	initializeEmojiPalette();
}

// ユーザープロフィール読み込み
function loadUserProfile(uid, callback) {
	firebase.database().ref(`profiles/${uid}`)
		.once('value')
		.then(snapshot => {
			const profile = snapshot.val();
			callback(profile);
		})
		.catch(error => {
			console.error('Error loading profile:', error);
			callback(null);
		});
}

// UIにプロフィール情報を反映
function updateProfileUI(profile) {
	if (!profile) return;
	
	// プロフィールページの情報更新
	const profileName = document.getElementById('profile-name');
	const profileBio = document.getElementById('profile-bio');
	const profileId = document.getElementById('profile-id');
	const profileImage = document.getElementById('profile-image');
	
	profileName.textContent = profile.username || `ユーザー${profile.uid.substring(0, 4)}`;
	profileBio.textContent = profile.bio || '自己紹介文がここに表示されます。';
	profileId.textContent = `ID: ${profile.uid.substring(0, 8)}`;
	
	if (profile.photoURL) {
		profileImage.src = profile.photoURL;
	}
	
	// 設定画面のユーザー情報更新
	const settingsUsername = document.getElementById('settings-username');
	const settingsUserid = document.getElementById('settings-userid');
	const settingsUserImage = document.getElementById('settings-user-image');
	
	if (settingsUsername) {
		settingsUsername.textContent = profile.username || `ユーザー${profile.uid.substring(0, 4)}`;
	}
	
	if (settingsUserid) {
		settingsUserid.textContent = `ID: ${profile.uid.substring(0, 8)}`;
	}
	
	if (settingsUserImage && profile.photoURL) {
		settingsUserImage.src = profile.photoURL;
	}
	
	// プロフィール編集フォームの初期値設定
	document.getElementById('edit-username').value = profile.username || '';
	document.getElementById('edit-bio').value = profile.bio || '';
	document.getElementById('preview-profile-image').src = profile.photoURL || './icons/default-avatar.png';
	
	// テキストフィールドのラベルを浮かせる（Materialize CSSの仕様）
	M.updateTextFields();
	M.textareaAutoResize(document.getElementById('edit-bio'));
}

// プロフィール表示
function showUserProfile(uid) {
	currentViewingProfile = uid;
	
	// プロフィール情報を読み込む
	loadUserProfile(uid, profile => {
		if (profile) {
			// プロフィール情報をUIに反映
			const profileName = document.getElementById('profile-name');
			const profileBio = document.getElementById('profile-bio');
			const profileId = document.getElementById('profile-id');
			const profileImage = document.getElementById('profile-image');
			const editProfileButton = document.getElementById('edit-profile-button');
			
			profileName.textContent = profile.username || `ユーザー${profile.uid.substring(0, 4)}`;
			profileBio.textContent = profile.bio || '自己紹介文がありません。';
			profileId.textContent = `ID: ${profile.uid.substring(0, 8)}`;
			
			if (profile.photoURL) {
				profileImage.src = profile.photoURL;
			} else {
				profileImage.src = './icons/default-avatar.png';
			}
			
			// 編集ボタンの表示/非表示（自分のプロフィールでかつGoogle認証済みの場合のみ表示）
			if (uid === currentUser.uid && isGoogleUser) {
				editProfileButton.style.display = 'inline-block';
			} else {
				editProfileButton.style.display = 'none';
			}
			
			// ユーザーの投稿履歴を読み込む
			loadUserPosts(uid);
		} else {
			console.error('Profile not found for uid:', uid);
		}
	});
	
	// プロフィールページを表示
	showScreen('profile-container');
}

// ユーザーの投稿履歴を読み込む
function loadUserPosts(uid) {
	const profilePosts = document.getElementById('profile-posts');
	profilePosts.innerHTML = '<div class="center-align" style="padding: 20px;">読み込み中...</div>';
	
	firebase.database().ref('messages')
		.orderByChild('uid')
		.equalTo(uid)
		.limitToLast(20)
		.once('value')
		.then(snapshot => {
			profilePosts.innerHTML = '';
			
			const posts = [];
			snapshot.forEach(child => {
				posts.push({
					key: child.key,
					...child.val()
				});
			});
			
			if (posts.length === 0) {
				profilePosts.innerHTML = '<div class="center-align" style="padding: 20px;">投稿がありません。</div>';
				return;
			}
			
			// 新しい順に表示
			posts.reverse();
			
			posts.forEach(post => {
				const date = new Date(post.ts);
				const dateStr = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
				const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
				
				const li = document.createElement('li');
				li.classList.add('collection-item', 'message-item');
				li.innerHTML = `
					<div class="message-header">
						<div class="message-user-avatar">
							<img src="${userProfiles[currentViewingProfile]?.photoURL || './icons/default-avatar.png'}" alt="ユーザー">
						</div>
						<div class="message-user-info">
							<p class="message-username">
								${userProfiles[currentViewingProfile]?.username || `ユーザー${currentViewingProfile.substring(0, 4)}`}
								${userProfiles[currentViewingProfile]?.isVerified ? '<i class="verified-badge material-icons tiny" title="認証済みユーザー">verified</i>' : ''}
							</p>
							<p class="message-date">${dateStr} ${timeStr}</p>
						</div>
					</div>
					<div class="message-content">
						<div class="message-emoji">${post.emoji}</div>
					</div>
				`;
				
				profilePosts.appendChild(li);
			});
		})
		.catch(error => {
			console.error('Error loading user posts:', error);
			profilePosts.innerHTML = '<div class="center-align" style="padding: 20px;">投稿の読み込みに失敗しました。</div>';
		});
}

// イベントリスナーの設定
function setupEventListeners() {
	console.log('Setting up event listeners');
	
	// ナビゲーションアイテムクリック時（下部ナビ）
	document.querySelectorAll('.nav-item').forEach(item => {
		item.addEventListener('click', function() {
			const targetId = this.getAttribute('data-target');
			console.log('Nav item clicked:', targetId);

			// 特殊な処理が必要なナビゲーションアイテムかどうかをチェック
			if (this.id === 'dm-nav-item') {
				// DMボタンが押された場合の特別な処理
				showScreen('dm-list-container');
				console.log('DM list screen displayed');
			} else {
				// 通常の画面切り替え
				showScreen(targetId);

				// プロフィールナビをクリックした時、自分のプロフィールを表示
				if (targetId === 'profile-container' && currentUser) {
					showUserProfile(currentUser.uid);
				}
			}
		});
	});
	
	// ヘッダーのログインボタンクリック時
	const loginButton = document.getElementById('login-button');
	if (loginButton) {
		loginButton.addEventListener('click', function() {
			const modal = M.Modal.getInstance(document.getElementById('login-modal'));
			if (modal) {
				modal.open();
			} else {
				console.error('Login modal not initialized');
			}
		});
	}
	
	// 設定画面のログインボタンクリック時
	const settingsLoginButton = document.getElementById('settings-login-button');
	if (settingsLoginButton) {
		settingsLoginButton.addEventListener('click', function() {
			if (isGoogleUser) {
				// ログアウト処理
				firebase.auth().signOut()
					.then(() => {
						console.log('Logged out successfully');
						// ユーザーステータスの更新は onAuthStateChanged で行われる
					})
					.catch(error => console.error('Error signing out:', error));
			} else {
				// ログイン処理
				signInWithGoogle();
			}
		});
	}
	
	// 設定画面のプロフィールボタンクリック時
	const settingsProfileButton = document.getElementById('settings-profile-button');
	if (settingsProfileButton) {
		settingsProfileButton.addEventListener('click', function() {
			if (currentUser) {
				showUserProfile(currentUser.uid);
			}
		});
	}
	
	// Googleログインボタンクリック時
	const googleLoginButton = document.getElementById('google-login-button');
	if (googleLoginButton) {
		googleLoginButton.addEventListener('click', signInWithGoogle);
	}
	
	// 「もっと見る」ボタンクリック時
	const loadMoreButton = document.getElementById('load-more');
	if (loadMoreButton) {
		loadMoreButton.addEventListener('click', loadMoreMessages);
	}
	
	// 絵文字パレットボタンクリック時
	const emojiPaletteButton = document.getElementById('emoji-palette-button');
	if (emojiPaletteButton) {
		console.log('Setting up emoji palette button click event');
		emojiPaletteButton.addEventListener('click', function(e) {
			console.log('Emoji palette button clicked via event listener');
			e.preventDefault();
			toggleEmojiPalette();
		});
	} else {
		console.error('Emoji palette button not found');
	}
	
	// 絵文字クリアボタンクリック時
	const clearEmojiButton = document.getElementById('clear-emoji-button');
	if (clearEmojiButton) {
		clearEmojiButton.addEventListener('click', clearEmojiSelection);
	}
	
	// 送信ボタンクリック時
	const sendButton = document.getElementById('send-button');
	if (sendButton) {
		sendButton.addEventListener('click', sendEmoji);
	}
	
	// メインに戻るボタンクリック時
	const backToMainButton = document.getElementById('back-to-main');
	if (backToMainButton) {
		backToMainButton.addEventListener('click', function() {
			showScreen('message-container');
			currentDmPartner = null;
			currentDmRoomId = null;
		});
	}
	
	// ダークモードスイッチ変更時
	const darkModeSwitch = document.getElementById('dark-mode-switch');
	if (darkModeSwitch) {
		darkModeSwitch.addEventListener('change', function() {
			toggleDarkMode(this.checked);
		});
	}
	
	// 言語選択変更時
	const languageSelect = document.getElementById('language-select');
	if (languageSelect) {
		languageSelect.addEventListener('change', function() {
			currentLanguage = this.value;
			localStorage.setItem('language', currentLanguage);
			applyLanguageSettings();
		});
	}
	
	// 削除確認時
	const confirmDelete = document.getElementById('confirm-delete');
	if (confirmDelete) {
		confirmDelete.addEventListener('click', deleteMessage);
	}
	
	// プロフィール編集ボタンクリック時
	const editProfileButton = document.getElementById('edit-profile-button');
	if (editProfileButton) {
		editProfileButton.addEventListener('click', function() {
			// 現在のプロフィール情報をフォームに反映
			if (userProfiles[currentUser.uid]) {
				const profile = userProfiles[currentUser.uid];
				const usernameInput = document.getElementById('edit-username');
				const bioInput = document.getElementById('edit-bio');
				
				if (usernameInput) usernameInput.value = profile.username || '';
				if (bioInput) bioInput.value = profile.bio || '';
				
				// 現在のアバターを選択状態に
				if (profile.photoURL) {
					selectProfileAvatar(profile.photoURL);
				} else {
					selectProfileAvatar('./icons/profile-icons/avatar1.svg');
				}
			}
			
			const modal = M.Modal.getInstance(document.getElementById('edit-profile-modal'));
			if (modal) {
				modal.open();
			} else {
				console.error('Edit profile modal not initialized');
			}
		});
	}
	
	// プロフィール保存ボタンクリック時
	const saveProfileButton = document.getElementById('save-profile');
	if (saveProfileButton) {
		saveProfileButton.addEventListener('click', saveProfile);
	}
	
	// アバター選択時
	document.querySelectorAll('.avatar-option').forEach(option => {
		option.addEventListener('click', function() {
			const avatarPath = this.getAttribute('data-avatar');
			selectProfileAvatar(avatarPath);
		});
	});
	
	// 初期選択アバターをマーク
	const firstAvatar = document.querySelector('.avatar-option');
	if (firstAvatar) {
		firstAvatar.classList.add('selected');
	}
	
	console.log('All event listeners set up');
}

// プロフィール保存
function saveProfile() {
	if (!currentUser) return;
	
	const username = document.getElementById('edit-username').value.trim();
	const bio = document.getElementById('edit-bio').value.trim();
	
	// プロフィールの基本情報を更新
	const updateProfile = {
		uid: currentUser.uid,
		username: username || `ユーザー${currentUser.uid.substring(0, 4)}`,
		bio: bio,
		photoURL: selectedAvatar,
		updatedAt: firebase.database.ServerValue.TIMESTAMP
	};
	
	// Google認証状態を維持（編集で消えないように）
	if (userProfiles[currentUser.uid] && userProfiles[currentUser.uid].isVerified) {
		updateProfile.isVerified = true;
	}
	
	// Firebaseにプロフィールを保存
	firebase.database().ref(`profiles/${currentUser.uid}`).update(updateProfile)
		.then(() => {
			console.log('Profile updated');
			userProfiles[currentUser.uid] = updateProfile;
			updateProfileUI(updateProfile);
			
			// プロフィールページを再表示
			if (currentViewingProfile === currentUser.uid) {
				showUserProfile(currentUser.uid);
			}
		})
		.catch(error => console.error('Error updating profile:', error));
}

// プロフィール画像を選択
function selectProfileAvatar(avatarPath) {
	selectedAvatar = avatarPath;
	
	// プレビュー画像を更新
	document.getElementById('preview-profile-image').src = avatarPath;
	
	// 選択状態を更新
	document.querySelectorAll('.avatar-option').forEach(option => {
		option.classList.remove('selected');
		if (option.getAttribute('data-avatar') === avatarPath) {
			option.classList.add('selected');
		}
	});
}

// 言語設定の適用
function applyLanguageSettings() {
	try {
		// 言語選択を現在の設定に合わせる
		const languageSelect = document.getElementById('language-select');
		if (languageSelect) {
			languageSelect.value = currentLanguage;
		}

		// テキスト翻訳を適用
		const loadMoreBtn = document.getElementById('load-more');
		if (loadMoreBtn) {
			loadMoreBtn.textContent = translations[currentLanguage].loadMore;
		}

		// ナビゲーションアイテム
		const navItems = document.querySelectorAll('.nav-item');
		if (navItems.length > 2) {
			const settingsItem = navItems[3]; // 設定は4番目のアイテム (インデックス3)
			const homeItem = navItems[0]; // ホームは1番目のアイテム (インデックス0)

			if (settingsItem && settingsItem.querySelector('span')) {
				settingsItem.querySelector('span').textContent = translations[currentLanguage].settings;
			}

			if (homeItem && homeItem.querySelector('span')) {
				homeItem.querySelector('span').textContent = translations[currentLanguage].home;
			}
		}

		// カードタイトル
		const cardTitles = document.querySelectorAll('.card-title');
		if (cardTitles.length > 0) {
			cardTitles[0].textContent = translations[currentLanguage].language;
			if (cardTitles.length > 1) {
				cardTitles[1].textContent = translations[currentLanguage].darkMode;
			}
		}

		// 削除モーダル
		const deleteModalTitle = document.querySelector('#delete-modal h4');
		const deleteModalText = document.querySelector('#delete-modal p');

		if (deleteModalTitle) {
			deleteModalTitle.textContent = translations[currentLanguage].deleteConfirm;
		}

		if (deleteModalText) {
			deleteModalText.textContent = translations[currentLanguage].irreversible;
		}

		// モーダルフッター
		const modalFooterLinks = document.querySelectorAll('.modal-footer a');
		if (modalFooterLinks.length > 1) {
			modalFooterLinks[0].textContent = translations[currentLanguage].cancel;
			modalFooterLinks[1].textContent = translations[currentLanguage].delete;
		}

		// スイッチラベルの翻訳
		const labels = document.querySelectorAll('.switch label');
		labels.forEach(label => {
			if (label.childNodes.length > 4) {
				const labelText = label.childNodes[0];
				labelText.textContent = translations[currentLanguage].off;
				const afterText = label.childNodes[4];
				afterText.textContent = translations[currentLanguage].on;
			}
		});

		// Materializeコンポーネントを更新
		M.FormSelect.init(document.querySelectorAll('select'));

		console.log('Language settings applied:', currentLanguage);
	} catch (error) {
		console.error('Error applying language settings:', error);
	}
}

// ダークモード切り替え
function toggleDarkMode(force) {
	const isDarkMode = force !== undefined ? force : !document.body.classList.contains('dark-mode');

	if (isDarkMode) {
		document.body.classList.add('dark-mode');
	} else {
		document.body.classList.remove('dark-mode');
	}

	// 設定画面のダークモードスイッチも連動させる
	const darkModeSwitch = document.getElementById('dark-mode-switch');
	if (darkModeSwitch) {
		darkModeSwitch.checked = isDarkMode;
	}

	// 設定を保存
	localStorage.setItem('darkMode', isDarkMode);
	console.log('Dark mode toggled:', isDarkMode);
}

// 絵文字パレットの初期化
function initializeEmojiPalette() {
	console.log('Initializing emoji palette');
	
	// カテゴリータブクリック時のイベント
	document.querySelectorAll('.emoji-tab').forEach(tab => {
		tab.addEventListener('click', function() {
			console.log('Emoji tab clicked:', this.getAttribute('data-category'));
			document.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
			this.classList.add('active');
			
			const category = this.getAttribute('data-category');
			loadEmojiCategory(category);
		});
	});
	
	// + ボタンのイベント再設定
	const emojiPaletteButton = document.getElementById('emoji-palette-button');
	if (emojiPaletteButton) {
		console.log('Reinitializing emoji palette button');
		
		// 既存のイベントリスナーをクリア
		const newButton = emojiPaletteButton.cloneNode(true);
		emojiPaletteButton.parentNode.replaceChild(newButton, emojiPaletteButton);
		
		// 新しいイベントリスナーを設定
		newButton.addEventListener('click', function(e) {
			console.log('Emoji palette button clicked');
			e.preventDefault();
			toggleEmojiPalette();
		});
	}
	
	// 初期カテゴリー「最近使った絵文字」を読み込む
	loadEmojiCategory('recent');
	
	// 表示を一度リセット
	const palette = document.getElementById('emoji-palette');
	if (palette) {
		palette.style.display = 'none';
	}
}

// 絵文字カテゴリーを読み込む
function loadEmojiCategory(category) {
	const emojiContent = document.querySelector('.emoji-content');
	emojiContent.innerHTML = '';
	
	let emojis = [];
	
	if (category === 'recent') {
		// 最近使った絵文字
		emojis = recentEmojis;
		if (emojis.length === 0) {
			emojis = ['😀', '😊', '👍', '❤️', '🎉']; // デフォルト表示
		}
	} else {
		// カテゴリー別の絵文字
		switch (category) {
			case 'smileys':
				emojis = ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '😘', '🥰', '😗', '😙', '😚', '☺️', '🙂', '🤗', '🤩', '🤔', '🤨'];
				break;
			case 'animals':
				emojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅'];
				break;
			case 'food':
				emojis = ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕'];
				break;
			case 'activities':
				emojis = ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '⛳', '🏹', '🎣', '🥊', '🥋', '🎽', '🛹', '🛷'];
				break;
			case 'travel':
				emojis = ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍️', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '✈️'];
				break;
			case 'objects':
				emojis = ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️'];
				break;
			case 'symbols':
				emojis = ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯'];
				break;
			case 'flags':
				emojis = ['🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏴‍☠️', '🇦🇫', '🇦🇽', '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲', '🇦🇼'];
				break;
		}
	}
	
	// 絵文字をパレットに追加
	emojis.forEach(emoji => {
		const emojiElement = document.createElement('div');
		emojiElement.classList.add('emoji-item');
		emojiElement.textContent = emoji;
		emojiElement.addEventListener('click', () => selectEmoji(emoji));
		emojiContent.appendChild(emojiElement);
	});
}

// 絵文字パレットの表示切り替え
function toggleEmojiPalette() {
	console.log('Toggle emoji palette called');
	const palette = document.getElementById('emoji-palette');
	
	// デバッグ出力
	console.log('Palette before toggle:', palette ? 'Found element' : 'Element not found', palette ? palette.style.display : 'N/A');
	
	if (!palette) {
		console.error('Error: Emoji palette element not found');
		return;
	}
	
	// style.display が空文字の場合もチェック (初期表示時)
	if (palette.style.display === 'none' || palette.style.display === '') {
		palette.style.display = 'block';
		console.log('Showing emoji palette');
		
		// 強制的に絵文字パレットの内容を再読み込み
		loadEmojiCategory('recent');
	} else {
		palette.style.display = 'none';
		console.log('Hiding emoji palette');
	}

	// パレット表示状態をログに出力（デバッグ用）
	console.log('Emoji palette toggled, display:', palette.style.display);
}

// 絵文字を選択
function selectEmoji(emoji) {
	console.log('Selecting emoji:', emoji);
	
	try {
		const selectedEmojiElement = document.getElementById('selected-emoji');
		if (!selectedEmojiElement) {
			console.error('Selected emoji element not found');
			return;
		}
		
		const currentText = selectedEmojiElement.textContent || '';
		const clearButton = document.getElementById('clear-emoji-button');
		
		// 最大10個の絵文字まで追加可能
		if (currentText.length < 10) {
			selectedEmojiElement.textContent = currentText + emoji;
			console.log('Emoji added, current content:', selectedEmojiElement.textContent);
		}
		
		// 送信ボタンを有効化
		const sendButton = document.getElementById('send-button');
		if (sendButton) {
			sendButton.removeAttribute('disabled');
		}
		
		// クリアボタンを表示
		if (clearButton) {
			clearButton.style.display = 'block';
		}
		
		// 10個の絵文字に達したらパレットを閉じる
		if (selectedEmojiElement.textContent.length >= 10) {
			const palette = document.getElementById('emoji-palette');
			if (palette) {
				palette.style.display = 'none';
			}
		}
	} catch (error) {
		console.error('Error selecting emoji:', error);
	}
}

// 絵文字選択をクリア
function clearEmojiSelection() {
	const selectedEmojiElement = document.getElementById('selected-emoji');
	selectedEmojiElement.textContent = '';
	
	// 送信ボタンを無効化
	document.getElementById('send-button').setAttribute('disabled', '');
	
	// クリアボタンを非表示
	document.getElementById('clear-emoji-button').style.display = 'none';
}

// 絵文字を送信
function sendEmoji() {
	console.log('Send emoji function called');
	
	// Firebase初期化チェック
	if (!firebase.apps.length) {
		console.error('Firebase not initialized');
		alert('Firebase接続エラー: アプリが正しく初期化されていません');
		return;
	}
	
	const selectedEmojiElement = document.getElementById('selected-emoji');
	if (!selectedEmojiElement) {
		console.error('Selected emoji element not found');
		return;
	}
	
	const selectedEmoji = selectedEmojiElement.textContent;
	console.log('Selected emoji content:', selectedEmoji);
	
	if (!selectedEmoji || selectedEmoji.trim() === '') {
		console.log('No emoji selected');
		return;
	}
	
	if (!currentUser) {
		console.log('User not logged in', { currentUser });
		return;
	}
	
	// 最近使った絵文字に追加
	if (!recentEmojis.includes(selectedEmoji)) {
		recentEmojis.unshift(selectedEmoji);
		recentEmojis = recentEmojis.slice(0, 24); // 最大24個まで保存
		localStorage.setItem('recentEmojis', JSON.stringify(recentEmojis));
	}
	
	console.log('Sending emoji:', selectedEmoji, 'User:', currentUser.uid);
	
	try {
		if (currentDmRoomId) {
			// DMへの投稿
			console.log('Sending to DM:', currentDmRoomId);
			const dmRef = firebase.database().ref(`dm/${currentDmRoomId}`).push();
			dmRef.set({
				emoji: selectedEmoji,
				from: currentUser.uid,
				ts: firebase.database.ServerValue.TIMESTAMP
			})
			.then(() => {
				console.log('DM message sent successfully');
				// 最新メッセージにスクロール
				const dmMessageList = document.getElementById('dm-message-list');
				if (dmMessageList) {
					dmMessageList.scrollTop = dmMessageList.scrollHeight;
				}
				
				// 送信後のフィードバック（送信成功の視覚的フィードバック）
				flashSendButton();
				
				// 入力欄をクリア
				clearEmojiSelection();
			})
			.catch(error => {
				console.error('Error sending DM message:', error);
				alert('DMメッセージ送信エラー: ' + error.message);
			});
		} else {
			// 全体チャットへの投稿
			console.log('Sending to global chat');
			const messageRef = firebase.database().ref('messages').push();
			messageRef.set({
				emoji: selectedEmoji,
				uid: currentUser.uid,
				ts: firebase.database.ServerValue.TIMESTAMP
			})
			.then(() => {
				console.log('Message sent successfully');
				
				// 最新メッセージにスクロール（全体チャットは逆順表示）
				const messageList = document.getElementById('message-list');
				if (messageList) {
					messageList.scrollTop = 0; // 先頭（最新）にスクロール
				}
				
				// 送信後のフィードバック（送信成功の視覚的フィードバック）
				flashSendButton();
				
				// 入力欄をクリア
				clearEmojiSelection();
			})
			.catch(error => {
				console.error('Error sending message:', error);
				alert('メッセージ送信エラー: ' + error.message);
			});
		}
	} catch (error) {
		console.error('Exception in sendEmoji:', error);
		alert('送信処理中にエラーが発生しました: ' + error.message);
	}
}

// 送信ボタンを点滅させて視覚的フィードバックを提供
function flashSendButton() {
	const sendButton = document.getElementById('send-button');
	sendButton.classList.add('flash');
	setTimeout(() => {
		sendButton.classList.remove('flash');
	}, 500);
}

// 最新メッセージを読み込む
function loadMessages() {
	const loadingElement = document.getElementById('loading');
	if (loadingElement) {
		loadingElement.style.display = 'block';
	}
	const messageList = document.getElementById('message-list');
	if (messageList) {
		messageList.innerHTML = '';
	}
	
	console.log('Loading messages from Firebase...');
	
	// デバッグ用 - Firebase参照の確認
	try {
		if (!firebase.apps.length) {
			console.error('Firebase not initialized when loading messages');
			if (loadingElement) {
				loadingElement.innerHTML = '<div class="red-text">Firebase初期化エラー。ページをリロードしてください。</div>';
			}
			return;
		}
		
		console.log('Attempting to read from database reference:', 'messages');
		
		// 接続テスト
		firebase.database().ref('.info/connected').once('value')
			.then(snapshot => {
				console.log('Firebase connection test:', snapshot.val() ? 'Connected' : 'Not connected');
			})
			.catch(err => {
				console.error('Firebase connection test error:', err);
			});
		
		// メッセージ読み込み（エラーハンドリング強化）
		firebase.database().ref('messages')
			.orderByChild('ts')
			.limitToLast(100)
			.once('value')
			.then(snapshot => {
				console.log('Messages loaded from Firebase:', snapshot.exists() ? 'Data exists' : 'No data found');
				console.log('Raw snapshot:', snapshot.val());
				
				const messages = [];
				snapshot.forEach(child => {
					console.log('Processing message:', child.key, 'Value:', child.val());
					
					// 有効なメッセージデータかチェック
					const messageData = child.val();
					if (messageData && messageData.emoji && messageData.uid && messageData.ts) {
						messages.push({
							key: child.key,
							...messageData
						});
					} else {
						console.warn('Invalid message data found:', messageData);
					}
				});
				
				console.log(`Processed ${messages.length} valid messages`);
				
				// 古い順に表示
				messages.reverse();
				
				if (messages.length > 0) {
					lastTimestamp = messages[messages.length - 1].ts;
					console.log('Last timestamp set to:', new Date(lastTimestamp));
				} else {
					console.log('No messages found or all messages were invalid');
					if (messageList) {
						messageList.innerHTML = '<div class="center-align" style="padding: 20px;">メッセージがありません。最初の投稿をしてみましょう！</div>';
					}
				}
				
				// メッセージリストにレンダリング
				if (messages.length > 0) {
					renderMessages(messages);
				}
				
				if (loadingElement) {
					loadingElement.style.display = 'none';
				}
			})
			.catch(error => {
				console.error('メッセージ読み込みエラー:', error);
				if (loadingElement) {
					loadingElement.style.display = 'none';
				}
				
				// エラー時にメッセージを表示
				if (messageList) {
					messageList.innerHTML = '<div class="center-align" style="padding: 20px;">メッセージの読み込みに失敗しました。<br>Firebase接続エラー。</div>';
				}
			});
	} catch (error) {
		console.error('Exception in loadMessages:', error);
		if (loadingElement) {
			loadingElement.style.display = 'none';
			loadingElement.innerHTML = '<div class="red-text">エラーが発生しました: ' + error.message + '</div>';
		}
	}
}

// 過去のメッセージをさらに読み込む
function loadMoreMessages() {
	if (!lastTimestamp) return;
	
	firebase.database().ref('messages')
		.orderByChild('ts')
		.endAt(lastTimestamp - 1)
		.limitToLast(20)
		.once('value')
		.then(snapshot => {
			const messages = [];
						snapshot.forEach(child => {
								messages.push({
										key: child.key,
										...child.val()
								});
						});
						
			
			// 古い順に表示
			messages.reverse();
			
			if (messages.length > 0) {
				lastTimestamp = messages[messages.length - 1].ts;
				
				// メッセージリストに追加
				appendMessages(messages);
			} else {
				// これ以上過去のメッセージがない場合
				document.getElementById('load-more').style.display = 'none';
			}
		})
		.catch(error => {
			console.error('追加メッセージ読み込みエラー:', error);
		});
}

// メッセージをリストにレンダリング
function renderMessages(messages) {
	console.log('Rendering messages, count:', messages.length);
	
	const messageList = document.getElementById('message-list');
	if (!messageList) {
		console.error('Message list element not found');
		return;
	}
	
	messageList.innerHTML = '';
	
	try {
		messages.forEach((message, index) => {
			console.log(`Rendering message ${index + 1}/${messages.length}, key:`, message.key);
			appendMessageToList(message, messageList);
		});
		
		// 最新メッセージにスクロール（先頭）
		messageList.scrollTop = 0;
		
		console.log('All messages rendered successfully');
	} catch (error) {
		console.error('Error during message rendering:', error);
		messageList.innerHTML = '<div class="center-align red-text" style="padding: 20px;">メッセージの表示中にエラーが発生しました。</div>';
	}
}

// 追加のメッセージをリストに追加
function appendMessages(messages) {
	const messageList = document.getElementById('message-list');
	
	messages.forEach(message => {
		appendMessageToList(message, messageList);
	});
}

// 削除モーダルを表示
function showDeleteModal(messageKey) {
	currentMessageKey = messageKey;
	const modal = M.Modal.getInstance(document.getElementById('delete-modal'));
	modal.open();
}

// メッセージを削除
function deleteMessage() {
	if (!currentMessageKey) return;
	
	if (currentDmRoomId) {
		// DMメッセージを削除
		firebase.database().ref(`dm/${currentDmRoomId}/${currentMessageKey}`).remove()
			.catch(error => console.error('メッセージ削除エラー:', error));
	} else {
		// 全体チャットのメッセージを削除
		firebase.database().ref(`messages/${currentMessageKey}`).remove()
			.catch(error => console.error('メッセージ削除エラー:', error));
	}
	
	currentMessageKey = null;
}

// ユーザーとのDMを開始
function startDmWithUser(targetUid) {
	if (!targetUid || targetUid === currentUser.uid) return;
	
	currentDmPartner = targetUid;
	
	// DMルームIDを作成（常に同じユーザー同士なら同じIDになるよう）
	const uids = [currentUser.uid, targetUid].sort();
	currentDmRoomId = `dm_${uids[0]}_${uids[1]}`;
	
	// DM画面に切り替え
	document.getElementById('dm-partner-name').textContent = 'DM';
	showScreen('dm-container');
	
	// DMメッセージを読み込み
	loadDmMessages(currentDmRoomId);
}

// DMメッセージを読み込む
function loadDmMessages(roomId) {
	document.getElementById('dm-message-list').innerHTML = '';
	
	firebase.database().ref(`dm/${roomId}`)
		.orderByChild('ts')
		.limitToLast(100)
		.once('value')
		.then(snapshot => {
			const messages = [];
						snapshot.forEach(child => {
								messages.push({
										key: child.key,
										...child.val()
								});
						});
						
			
			// DMメッセージをレンダリング
			renderDmMessages(messages);
			
			// リアルタイムリスナーを設定
			startDmRealtimeListener(roomId);
		})
		.catch(error => {
			console.error('DMメッセージ読み込みエラー:', error);
		});
}

// DMメッセージをレンダリング
function renderDmMessages(messages) {
	const messageList = document.getElementById('dm-message-list');
	messageList.innerHTML = '';
	
	messages.forEach(message => {
		appendDmMessageToList(message, messageList);
	});
	
	// 最新メッセージまでスクロール
	messageList.scrollTop = messageList.scrollHeight;
}

// DMメッセージをリストに追加
function appendDmMessageToList(message, list) {
	const li = document.createElement('li');
	li.classList.add('collection-item', 'message-item');
	li.setAttribute('data-key', message.key);
	
	// 自分の投稿かどうか判定
	const isMyMessage = message.from === currentUser.uid;
	if (isMyMessage) {
		li.classList.add('my-message');
	}
	
	// 時刻表示用
	const date = new Date(message.ts);
	const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
	const dateStr = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
	
	// ユーザー情報
	const uid = message.from;
	const photoURL = userProfiles[uid]?.photoURL || './icons/default-avatar.png';
	const username = userProfiles[uid]?.username || `ユーザー${uid.substring(0, 4)}`;
	const isVerified = userProfiles[uid]?.isVerified || false;
	
	// メッセージ内容
	li.innerHTML = `
		<div class="message-header">
			<div class="message-user-avatar">
				<img src="${photoURL}" alt="${username}">
			</div>
			<div class="message-user-info">
				<p class="message-username">
					${username}
					${isVerified ? '<i class="verified-badge material-icons tiny" title="認証済みユーザー">verified</i>' : ''}
				</p>
				<p class="message-date">${timeStr}</p>
			</div>
		</div>
		<div class="message-content">
			<div class="message-emoji">${message.emoji}</div>
		</div>
	`;
	
	// 自分の投稿に長押しで削除アクション
	if (isMyMessage) {
		li.addEventListener('contextmenu', e => {
			e.preventDefault();
			showDeleteModal(message.key);
		});
		
		// モバイル用の長押し処理
		let pressTimer;
		li.addEventListener('touchstart', () => {
			pressTimer = setTimeout(() => {
				showDeleteModal(message.key);
			}, 800);
		});
		li.addEventListener('touchend', () => {
			clearTimeout(pressTimer);
		});
	}
	
	list.appendChild(li);
}

// DMのリアルタイムリスナーを設定
function startDmRealtimeListener(roomId) {
	// 以前のリスナーをオフにする
	firebase.database().ref(`dm/${roomId}`).off();
	
	// 新しいメッセージを監視
	firebase.database().ref(`dm/${roomId}`)
		.orderByChild('ts')
		.limitToLast(1)
		.on('child_added', snapshot => {
			// すでに表示済みのメッセージはスキップ
			const messageList = document.getElementById('dm-message-list');
			if (messageList.querySelector(`[data-key="${snapshot.key}"]`)) return;
			
			const message = {
				key: snapshot.key,
				...snapshot.val()
			};
			
			// 新しいメッセージをリストに追加
			appendDmMessageToList(message, messageList);
			
			// 最新メッセージまでスクロール（少し遅延させてアニメーションを見せる）
			setTimeout(() => {
				messageList.scrollTop = messageList.scrollHeight;
			}, 100);
		});
}

// DMリストを読み込む
function loadDmList() {
	// DMリストをクリア
	document.getElementById('dm-contacts').innerHTML = '';
	
	// DMルームを取得
	firebase.database().ref('dm')
		.orderByKey()
		.once('value')
		.then(snapshot => {
			const rooms = [];
			
			snapshot.forEach(room => {
				const roomId = room.key;
				
				// 自分が関係するDMルームのみ処理
				if (roomId.includes(currentUser.uid)) {
					// 相手のUIDを取得
					const uids = roomId.replace('dm_', '').split('_');
					const partnerUid = uids[0] === currentUser.uid ? uids[1] : uids[0];
					
					// 最新メッセージを1件取得
					const lastMessage = {};
					let latestTs = 0;
					
					room.forEach(msg => {
						const msgData = msg.val();
						if (msgData.ts > latestTs) {
							lastMessage.emoji = msgData.emoji;
							lastMessage.ts = msgData.ts;
							latestTs = msgData.ts;
						}
					});
					
					if (lastMessage.emoji) {
						rooms.push({
							roomId,
							partnerUid,
							lastMessage
						});
					}
				}
			});
			
			// 最新メッセージの順にソート
			rooms.sort((a, b) => b.lastMessage.ts - a.lastMessage.ts);
			
			// DMリストをレンダリング
			renderDmList(rooms);
		})
		.catch(error => {
			console.error('DMリスト読み込みエラー:', error);
		});
}

// DMリストをレンダリング
function renderDmList(rooms) {
	const contactsList = document.getElementById('dm-contacts');
	contactsList.innerHTML = '';
	
	rooms.forEach(room => {
		const date = new Date(room.lastMessage.ts);
		const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
		
		const li = document.createElement('li');
		li.classList.add('collection-item', 'avatar', 'dm-contact');
		li.innerHTML = `
			<div class="dm-contact-emoji">${room.lastMessage.emoji}</div>
			<span class="title">ユーザー</span>
			<p>${timeStr}</p>
		`;
		
		li.addEventListener('click', () => {
			startDmWithUser(room.partnerUid);
		});
		
		contactsList.appendChild(li);
	});
}

// 画面の切り替え
function showScreen(screenId) {
	console.log('Switching screen to:', screenId);
	
	// すべての画面を非表示（プロフィール画面も含める）
	document.querySelectorAll('#message-container, #dm-container, #dm-list-container, #settings-container, #profile-container')
		.forEach(screen => {
			console.log('Hiding screen:', screen.id);
			screen.style.display = 'none';
		});
	
	// 選択された画面を表示
	const targetScreen = document.getElementById(screenId);
	if (targetScreen) {
		targetScreen.style.display = 'block';
		console.log('Showing screen:', screenId);
	} else {
		console.error('Target screen not found:', screenId);
	}
	
	// ナビゲーションアイテムのアクティブ状態を更新
	document.querySelectorAll('.nav-item').forEach(item => {
		item.classList.remove('active');
		if (item.getAttribute('data-target') === screenId) {
			item.classList.add('active');
		}
	});
}

// リアルタイムリスナーを開始
function startRealtimeListeners() {
	console.log('Starting real-time listeners...');
	
	// 一旦既存のリスナーを削除
	firebase.database().ref('messages').off();
	
	// 最新メッセージの監視
	firebase.database().ref('messages')
		.orderByChild('ts')
		.limitToLast(20)
		.on('child_added', snapshot => {
			console.log('New message received:', snapshot.key);
			
			// すでに表示済みのメッセージはスキップ
			const messageList = document.getElementById('message-list');
			if (messageList.querySelector(`[data-key="${snapshot.key}"]`)) {
				console.log('Message already displayed, skipping:', snapshot.key);
				return;
			}
			
			const message = {
				key: snapshot.key,
				...snapshot.val()
			};
			console.log('Processing message:', message);
			
			// 新しいメッセージをリストの先頭に追加
			const li = document.createElement('li');
			li.setAttribute('data-key', message.key);
			li.classList.add('collection-item', 'message-item', 'new-message');
			
			// 自分の投稿かどうか判定
			const isMyMessage = message.uid === currentUser.uid;
			if (isMyMessage) {
				li.classList.add('my-message');
			}
			
			// 時刻表示用
			const date = new Date(message.ts);
			const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
			const dateStr = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
			
			// ユーザープロフィール情報を取得
			const authorUid = message.uid;
			let username = `ユーザー${authorUid.substring(0, 4)}`;
			let photoURL = './icons/default-avatar.png';
			let isVerified = false;
			
			// 既に読み込み済みのプロフィール情報があれば使用
			if (userProfiles[authorUid]) {
				username = userProfiles[authorUid].username || username;
				photoURL = userProfiles[authorUid].photoURL || photoURL;
				isVerified = userProfiles[authorUid].isVerified || false;
			} else {
				// プロフィール情報をロード
				loadUserProfile(authorUid, profile => {
					if (profile) {
						userProfiles[authorUid] = profile;
						
						// プロフィール情報をUIに反映
						const usernameElement = li.querySelector('.message-username');
						const avatarElement = li.querySelector('.message-user-avatar img');
						const verifiedBadge = li.querySelector('.verified-badge');
						
						if (usernameElement) {
							usernameElement.textContent = profile.username || username;
						}
						
						if (avatarElement && profile.photoURL) {
							avatarElement.src = profile.photoURL;
						}
						
						if (verifiedBadge && profile.isVerified) {
							verifiedBadge.style.display = 'inline-block';
						}
					}
				});
			}
			
			// メッセージ内容
			li.innerHTML = `
				<div class="message-header">
					<div class="message-user-avatar">
						<img src="${photoURL}" alt="${username}">
					</div>
					<div class="message-user-info">
						<p class="message-username">
							${username}
							${isVerified ? '<i class="verified-badge material-icons tiny" title="認証済みユーザー">verified</i>' : ''}
						</p>
						<p class="message-date">${dateStr} ${timeStr}</p>
					</div>
				</div>
				<div class="message-content">
					<div class="message-emoji">${message.emoji}</div>
				</div>
			`;
			
			// プロフィールアイコンクリック時
			const avatarElement = li.querySelector('.message-user-avatar');
			avatarElement.addEventListener('click', () => {
				showUserProfile(authorUid);
			});
			
			// 自分の投稿に長押しで削除アクション
			if (isMyMessage) {
				li.addEventListener('contextmenu', e => {
					e.preventDefault();
					showDeleteModal(message.key);
				});
				
				// モバイル用の長押し処理
				let pressTimer;
				li.addEventListener('touchstart', () => {
					pressTimer = setTimeout(() => {
						showDeleteModal(message.key);
					}, 800);
				});
				li.addEventListener('touchend', () => {
					clearTimeout(pressTimer);
				});
			}
			
			// DMの開始
			if (!isMyMessage) {
				const usernameElement = li.querySelector('.message-username');
				usernameElement.addEventListener('click', () => {
					startDmWithUser(message.uid);
				});
			}
			
			// リストの先頭に追加
			messageList.insertBefore(li, messageList.firstChild);
			console.log('Message added to UI');
			
			// アニメーション効果
			setTimeout(() => {
				li.classList.add('show');
				
				// 自分の投稿の場合は自動スクロール
				if (isMyMessage) {
					messageList.scrollTop = 0; // 先頭にスクロール
				}
			}, 10);
		});
		
	// エラー処理
	firebase.database().ref('messages').on('error', error => {
		console.error('Firebase real-time listener error:', error);
	});
}

// メッセージをリストに追加する共通関数
function appendMessageToList(message, list) {
	try {
		console.log('Appending message to list:', message.key);
		
		if (!message || !message.key || !message.emoji || !message.uid || !message.ts) {
			console.error('Invalid message data:', message);
			return;
		}
		
		if (!list) {
			console.error('Target list not provided');
			return;
		}
		
		const li = document.createElement('li');
		li.classList.add('collection-item', 'message-item');
		li.setAttribute('data-key', message.key);
		
		// 自分の投稿かどうか判定
		const isMyMessage = currentUser && message.uid === currentUser.uid;
		if (isMyMessage) {
			li.classList.add('my-message');
		}
		
		// 時刻表示用
		let timeStr = '';
		let dateStr = '';
		try {
			const date = new Date(message.ts);
			if (!isNaN(date.getTime())) {
				timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
				dateStr = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
			} else {
				console.warn('Invalid date from timestamp:', message.ts);
				timeStr = '--:--';
				dateStr = '----/--/--';
			}
		} catch (error) {
			console.error('Error formatting date:', error);
			timeStr = '--:--';
			dateStr = '----/--/--';
		}
		
		// ユーザープロフィール情報を取得
		const authorUid = message.uid;
		let username = `ユーザー${authorUid.substring(0, 4)}`;
		let photoURL = './icons/default-avatar.png';
		let isVerified = false;
		
		// 既に読み込み済みのプロフィール情報があれば使用
		if (userProfiles[authorUid]) {
			username = userProfiles[authorUid].username || username;
			photoURL = userProfiles[authorUid].photoURL || photoURL;
			isVerified = userProfiles[authorUid].isVerified || false;
		}
		
		// メッセージ内容（特に絵文字部分を強調）
		const safeEmoji = message.emoji || '💬';
		console.log('Emoji content for message:', safeEmoji);
		
		// HTMLを構築
		li.innerHTML = `
			<div class="message-header">
				<div class="message-user-avatar">
					<img src="${photoURL}" alt="${username}">
				</div>
				<div class="message-user-info">
					<p class="message-username">
						${username}
						${isVerified ? '<i class="verified-badge material-icons tiny" title="認証済みユーザー">verified</i>' : ''}
					</p>
					<p class="message-date">${dateStr} ${timeStr}</p>
				</div>
			</div>
			<div class="message-content">
				<div class="message-emoji">${safeEmoji}</div>
			</div>
		`;
		
		// プロフィール情報が読み込まれていなければロード
		if (!userProfiles[authorUid]) {
			loadUserProfile(authorUid, profile => {
				if (profile) {
					userProfiles[authorUid] = profile;
					
					// プロフィール情報をUIに反映
					const usernameElement = li.querySelector('.message-username');
					const avatarElement = li.querySelector('.message-user-avatar img');
					const verifiedBadge = li.querySelector('.verified-badge');
					
					if (usernameElement) {
						usernameElement.textContent = profile.username || username;
					}
					
					if (avatarElement && profile.photoURL) {
						avatarElement.src = profile.photoURL;
					}
					
					if (verifiedBadge && profile.isVerified) {
						verifiedBadge.style.display = 'inline-block';
					}
				}
			});
		}
		
		// プロフィールアイコンクリック時
		const avatarElement = li.querySelector('.message-user-avatar');
		if (avatarElement) {
			avatarElement.addEventListener('click', () => {
				showUserProfile(authorUid);
			});
		}
		
		// 自分の投稿に長押しで削除アクション
		if (isMyMessage) {
			li.addEventListener('contextmenu', e => {
				e.preventDefault();
				showDeleteModal(message.key);
			});
			
			// モバイル用の長押し処理
			let pressTimer;
			li.addEventListener('touchstart', () => {
				pressTimer = setTimeout(() => {
					showDeleteModal(message.key);
				}, 800);
			});
			li.addEventListener('touchend', () => {
				clearTimeout(pressTimer);
			});
		}
		
		// DMの開始 (自分以外のメッセージをクリックしたとき)
		if (!isMyMessage) {
			const usernameElement = li.querySelector('.message-username');
			if (usernameElement) {
				usernameElement.addEventListener('click', () => {
					startDmWithUser(message.uid);
				});
			}
		}
		
		// リストに追加
		list.appendChild(li);
		
		console.log('Message appended successfully:', message.key);
	} catch (error) {
		console.error('Error appending message:', error, 'Message:', message);
	}
}