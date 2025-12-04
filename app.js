// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyDmXNo5DQF3D-48dLyTFtB0o2jwKfc1W0I",
    authDomain: "family-diary-app-2cb4f.firebaseapp.com",
    projectId: "family-diary-app-2cb4f",
    storageBucket: "family-diary-app-2cb4f.firebasestorage.app",
    messagingSenderId: "1021547394548",
    appId: "1:1021547394548:web:2d5c6d8e9b1fb9ef3335a1",
    measurementId: "G-NXY4YKTTSQ"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// Storageは使いません

class DiaryApp {
    constructor() {
        this.isAdmin = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAdminLogin();
        this.loadDiaries();
    }

    setupEventListeners() {
        // 管理者ログインモーダル
        document.getElementById('login-btn').addEventListener('click', () => {
            if (this.isAdmin) {
                this.logout();
            } else {
                this.openModal('login-modal');
            }
        });

        document.getElementById('close-login').addEventListener('click', () => {
            this.closeModal('login-modal');
        });

        // 管理者ログイン処理
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAdminLogin();
        });

        // 投稿モーダル
        document.getElementById('fab-add').addEventListener('click', () => {
            this.openModal('post-modal');
            document.getElementById('post-date').valueAsDate = new Date();
        });

        document.getElementById('close-modal').addEventListener('click', () => {
            this.closeModal('post-modal');
        });

        // 画像プレビュー
        document.getElementById('post-image').addEventListener('change', (e) => {
            this.handleImagePreview(e);
        });

        // 投稿処理
        document.getElementById('post-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePost();
        });

        // モーダル外クリック
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    // 管理者ログイン
    checkAdminLogin() {
        const loggedIn = localStorage.getItem('diary_admin_logged_in') === 'true';
        this.setAdminMode(loggedIn);
    }

    handleAdminLogin() {
        const password = document.getElementById('admin-password').value;
        if (password === 'admin123') { // 管理者パスワード
            this.setAdminMode(true);
            localStorage.setItem('diary_admin_logged_in', 'true');
            this.closeModal('login-modal');
            alert('管理者としてログインしました');
        } else {
            alert('パスワードが違います');
        }
    }

    logout() {
        if (confirm('管理者からログアウトしますか？')) {
            this.setAdminMode(false);
            localStorage.removeItem('diary_admin_logged_in');
            alert('ログアウトしました');
        }
    }

    setAdminMode(isAdmin) {
        this.isAdmin = isAdmin;
        const fab = document.getElementById('fab-add');
        const loginBtn = document.getElementById('login-btn');

        if (isAdmin) {
            fab.style.display = 'flex';
            loginBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>';
        } else {
            fab.style.display = 'none';
            loginBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
        }
    }

    // データ読み込み
    loadDiaries() {
        db.collection('diaries')
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                const diaries = [];
                snapshot.forEach((doc) => {
                    diaries.push({ id: doc.id, ...doc.data() });
                });
                this.renderDiaries(diaries);
            }, (error) => {
                console.error("Error getting documents: ", error);
                if (error.code === 'permission-denied') {
                    document.getElementById('diary-list').innerHTML = '<p class="error">データの読み込み権限がありません。</p>';
                }
            });
    }

    renderDiaries(diaries) {
        const container = document.getElementById('diary-list');

        if (diaries.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>まだ日記がありません</p></div>';
            return;
        }

        container.innerHTML = diaries.map(diary => `
            <article class="diary-card">
                ${diary.imageUrl ? `<img src="${diary.imageUrl}" class="diary-image" alt="日記の写真" loading="lazy">` : ''}
                <div class="diary-content">
                    <time class="diary-date">${this.formatDate(diary.date)}</time>
                    <p class="diary-text">${this.escapeHtml(diary.content)}</p>
                </div>
            </article>
        `).join('');
    }

    // 画像プレビュー
    handleImagePreview(e) {
        const file = e.target.files[0];
        const preview = document.getElementById('image-preview');

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 200px; border-radius: 8px;">`;
            };
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = '';
        }
    }

    // 画像を圧縮してBase64に変換する関数
    compressImage(file) {
        return new Promise((resolve, reject) => {
            const maxWidth = 800; // 最大幅
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // JPEG形式で圧縮 (品質0.7)
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    }

    // 投稿処理
    async handlePost() {
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '投稿中...';

        try {
            const content = document.getElementById('post-content').value;
            const date = document.getElementById('post-date').value;
            const imageFile = document.getElementById('post-image').files[0];

            let imageUrl = null;

            // 画像があれば圧縮してBase64として保存
            if (imageFile) {
                try {
                    imageUrl = await this.compressImage(imageFile);
                } catch (e) {
                    console.error("Image compression failed:", e);
                    alert("画像の処理に失敗しました");
                    return;
                }
            }

            // Firestoreに保存
            await db.collection('diaries').add({
                date: date,
                content: content,
                imageUrl: imageUrl, // Base64文字列を直接保存
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert('投稿しました！');
            this.closeModal('post-modal');
            document.getElementById('post-form').reset();
            document.getElementById('image-preview').innerHTML = '';

        } catch (error) {
            console.error("Error adding document: ", error);
            alert('投稿に失敗しました: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '投稿する';
        }
    }

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${days[date.getDay()]})`;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DiaryApp();
});
