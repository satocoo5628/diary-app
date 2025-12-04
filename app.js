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

class DiaryApp {
    constructor() {
        this.init();
    }

    init() {
        this.currentEditId = null;
        this.setupEventListeners();
        this.loadDiaries();
    }

    setupEventListeners() {
        // Markdown ツールバー
        document.querySelectorAll('.md-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.insertMarkdown(btn.dataset.md);
            });
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

        // 編集モーダル
        document.getElementById('close-edit-modal').addEventListener('click', () => {
            this.closeModal('edit-modal');
        });

        // 編集処理
        document.getElementById('edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEdit();
        });

        // 編集用画像プレビュー
        document.getElementById('edit-image').addEventListener('change', (e) => {
            this.handleEditImagePreview(e);
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

    // Markdown記法を挿入
    insertMarkdown(syntax) {
        const textarea = document.getElementById('post-content');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        const beforeText = textarea.value.substring(0, start);
        const afterText = textarea.value.substring(end);

        let newText;
        let cursorPos;

        if (syntax === '# ') {
            // 見出し：行頭に追加
            const lineStart = beforeText.lastIndexOf('\n') + 1;
            newText = textarea.value.substring(0, lineStart) + syntax + textarea.value.substring(lineStart);
            cursorPos = lineStart + syntax.length;
        } else if (syntax === '- ') {
            // リスト：行頭に追加
            const lineStart = beforeText.lastIndexOf('\n') + 1;
            newText = textarea.value.substring(0, lineStart) + syntax + textarea.value.substring(lineStart);
            cursorPos = lineStart + syntax.length;
        } else if (syntax === '**' || syntax === '*' || syntax === '`') {
            // 囲む記法
            if (selectedText) {
                newText = beforeText + syntax + selectedText + syntax + afterText;
                cursorPos = start + syntax.length + selectedText.length + syntax.length;
            } else {
                newText = beforeText + syntax + syntax + afterText;
                cursorPos = start + syntax.length;
            }
        }

        textarea.value = newText;
        textarea.focus();
        textarea.setSelectionRange(cursorPos, cursorPos);
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
                    <div class="diary-text">${marked.parse(diary.content || '')}</div>
                    <div class="diary-actions">
                        <button class="action-btn edit-btn" onclick="app.openEditModal('${diary.id}')">
                            <span>✏️</span> 編集
                        </button>
                        <button class="action-btn delete-btn" onclick="app.deleteDiary('${diary.id}')">
                            <span>🗑️</span> 削除
                        </button>
                    </div>
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

    // 編集用画像プレビュー
    handleEditImagePreview(e) {
        const file = e.target.files[0];
        const preview = document.getElementById('edit-image-preview');

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

    // 削除処理
    async deleteDiary(id) {
        if (!confirm('この日記を削除してもよろしいですか?')) {
            return;
        }

        try {
            await db.collection('diaries').doc(id).delete();
            alert('削除しました');
        } catch (error) {
            console.error("Error deleting document: ", error);
            alert('削除に失敗しました: ' + error.message);
        }
    }

    // 編集モーダルを開く
    async openEditModal(id) {
        this.currentEditId = id;

        try {
            const doc = await db.collection('diaries').doc(id).get();
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('edit-date').value = data.date;
                document.getElementById('edit-content').value = data.content;

                const preview = document.getElementById('edit-image-preview');
                if (data.imageUrl) {
                    preview.innerHTML = `<img src="${data.imageUrl}" style="max-width: 100%; max-height: 200px; border-radius: 8px;">`;
                } else {
                    preview.innerHTML = '';
                }

                this.openModal('edit-modal');
            }
        } catch (error) {
            console.error("Error getting document: ", error);
            alert('データの読み込みに失敗しました');
        }
    }

    // 編集処理
    async handleEdit() {
        const submitBtn = document.getElementById('edit-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '更新中...';

        try {
            const content = document.getElementById('edit-content').value;
            const date = document.getElementById('edit-date').value;
            const imageFile = document.getElementById('edit-image').files[0];

            const updateData = {
                date: date,
                content: content,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // 新しい画像がアップロードされた場合
            if (imageFile) {
                try {
                    updateData.imageUrl = await this.compressImage(imageFile);
                } catch (e) {
                    console.error("Image compression failed:", e);
                    alert("画像の処理に失敗しました");
                    return;
                }
            }

            await db.collection('diaries').doc(this.currentEditId).update(updateData);

            alert('更新しました！');
            this.closeModal('edit-modal');
            document.getElementById('edit-form').reset();
            document.getElementById('edit-image-preview').innerHTML = '';
            this.currentEditId = null;

        } catch (error) {
            console.error("Error updating document: ", error);
            alert('更新に失敗しました: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '更新する';
        }
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DiaryApp();
});
