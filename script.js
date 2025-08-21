class CalculatorApp {
    constructor() {
        this.currentUnit = '100g';
        this.recognition = null;
        this.activeInput = null;
        this.history = [];
        this.discountHistory = [];
        this.currentTab = 'unitPrice';
        this.init();
    }

    init() {
        this.bindEvents();
        this.initSpeechRecognition();
        this.calculate();
        this.calculateDiscount();
    }

    bindEvents() {
        // タブ切り替えボタン
        document.getElementById('unitPriceTab').addEventListener('click', () => this.switchTab('unitPrice'));
        document.getElementById('discountTab').addEventListener('click', () => this.switchTab('discount'));

        // 単価計算の入力フィールド
        document.getElementById('priceInput').addEventListener('input', () => this.calculate());
        document.getElementById('volumeInput').addEventListener('input', () => this.calculate());

        // 音声入力ボタン（単価計算）
        document.getElementById('priceVoiceBtn').addEventListener('click', () => this.startVoiceInput('price'));
        document.getElementById('volumeVoiceBtn').addEventListener('click', () => this.startVoiceInput('volume'));

        // 音声入力ボタン（割引計算）
        document.getElementById('discountPriceVoiceBtn').addEventListener('click', () => this.startVoiceInput('discountPrice'));
        document.getElementById('discountRateVoiceBtn').addEventListener('click', () => this.startVoiceInput('discountRate'));

        // 単位選択ボタン
        document.querySelectorAll('.unit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectUnit(e.target.dataset.unit, e.target));
        });

        // 単価計算の確定・クリアボタン
        document.getElementById('confirmBtn').addEventListener('click', () => this.confirmCalculation());
        document.getElementById('clearBtn').addEventListener('click', () => this.clear());

        // 割引計算の入力フィールド
        document.getElementById('discountPriceInput').addEventListener('input', () => this.calculateDiscount());
        document.getElementById('discountRateInput').addEventListener('input', () => this.calculateDiscount());

        // 割引計算の確定・クリアボタン
        document.getElementById('discountConfirmBtn').addEventListener('click', () => this.confirmDiscountCalculation());
        document.getElementById('discountClearBtn').addEventListener('click', () => this.clearDiscount());
    }

    initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showStatus('音声認識がサポートされていません', 'error');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'ja-JP';
        this.recognition.continuous = false;
        this.recognition.interimResults = false;

        this.recognition.onresult = (event) => {
            const result = event.results[0][0].transcript;
            this.processVoiceInput(result);
        };

        this.recognition.onerror = (event) => {
            this.showStatus('音声認識エラー: ' + event.error, 'error');
            this.stopVoiceInput();
        };

        this.recognition.onend = () => {
            this.stopVoiceInput();
        };
    }

    startVoiceInput(inputType) {
        if (!this.recognition) {
            this.showStatus('音声認識が利用できません', 'error');
            return;
        }

        this.activeInput = inputType;
        let btnId;
        
        // ボタンIDを判定
        switch(inputType) {
            case 'price':
                btnId = 'priceVoiceBtn';
                break;
            case 'volume':
                btnId = 'volumeVoiceBtn';
                break;
            case 'discountPrice':
                btnId = 'discountPriceVoiceBtn';
                break;
            case 'discountRate':
                btnId = 'discountRateVoiceBtn';
                break;
        }
        
        if (btnId) {
            const btn = document.getElementById(btnId);
            btn.classList.add('listening');
        }
        
        this.showStatus('音声を聞いています...', 'info');
        this.recognition.start();
    }

    stopVoiceInput() {
        if (this.activeInput) {
            let btnId;
            
            // ボタンIDを判定
            switch(this.activeInput) {
                case 'price':
                    btnId = 'priceVoiceBtn';
                    break;
                case 'volume':
                    btnId = 'volumeVoiceBtn';
                    break;
                case 'discountPrice':
                    btnId = 'discountPriceVoiceBtn';
                    break;
                case 'discountRate':
                    btnId = 'discountRateVoiceBtn';
                    break;
            }
            
            if (btnId) {
                const btn = document.getElementById(btnId);
                btn.classList.remove('listening');
            }
        }
        this.activeInput = null;
        this.hideStatus();
    }

    processVoiceInput(text) {
        // 数字を抽出
        const numbers = text.match(/\d+(\.\d+)?/g);
        if (numbers && numbers.length > 0) {
            const value = parseFloat(numbers[0]);
            let inputId;
            
            // 入力先を判定
            switch(this.activeInput) {
                case 'price':
                    inputId = 'priceInput';
                    break;
                case 'volume':
                    inputId = 'volumeInput';
                    break;
                case 'discountPrice':
                    inputId = 'discountPriceInput';
                    break;
                case 'discountRate':
                    inputId = 'discountRateInput';
                    break;
            }
            
            if (inputId) {
                document.getElementById(inputId).value = value;
                
                // 対応する計算を実行
                if (this.activeInput === 'price' || this.activeInput === 'volume') {
                    this.calculate();
                    this.showStatus(`${value}を入力しました`, 'info');
                } else {
                    this.calculateDiscount();
                    this.showDiscountStatus(`${value}を入力しました`, 'info');
                }
            }
        } else {
            if (this.activeInput === 'price' || this.activeInput === 'volume') {
                this.showStatus('数字が認識できませんでした', 'error');
            } else {
                this.showDiscountStatus('数字が認識できませんでした', 'error');
            }
        }
    }

    selectUnit(unit, btnElement) {
        // 他のボタンのactiveクラスを削除
        document.querySelectorAll('.unit-btn').forEach(btn => btn.classList.remove('active'));
        // 選択されたボタンにactiveクラスを追加
        btnElement.classList.add('active');
        
        this.currentUnit = unit;
        document.getElementById('resultUnit').textContent = unit + 'あたり';
        this.calculate();
    }

    calculate() {
        const price = parseFloat(document.getElementById('priceInput').value) || 0;
        const volume = parseFloat(document.getElementById('volumeInput').value) || 0;

        if (price <= 0 || volume <= 0) {
            document.getElementById('resultValue').textContent = '-';
            return;
        }

        let unitPrice = 0;
        const unitValue = this.getUnitValue(this.currentUnit);
        
        if (unitValue > 0) {
            unitPrice = (price / volume) * unitValue;
        }

        const resultText = unitPrice > 0 ? '¥' + unitPrice.toFixed(2) : '-';
        document.getElementById('resultValue').textContent = resultText;
    }

    confirmCalculation() {
        const price = parseFloat(document.getElementById('priceInput').value) || 0;
        const volume = parseFloat(document.getElementById('volumeInput').value) || 0;

        if (price <= 0 || volume <= 0) {
            this.showStatus('価格と容量を入力してください', 'error');
            return;
        }

        const unitValue = this.getUnitValue(this.currentUnit);
        const unitPrice = (price / volume) * unitValue;
        
        // 同じ計算がすでに履歴にないかチェック
        const exists = this.history.some(item => 
            item.price === price && 
            item.volume === volume && 
            item.unit === this.currentUnit
        );
        
        if (!exists && unitPrice > 0) {
            this.addToHistory(volume, price, this.currentUnit, unitPrice);
            this.showStatus('履歴に追加しました', 'info');
        } else if (exists) {
            this.showStatus('同じ計算が既に履歴にあります', 'error');
        }
    }

    getUnitValue(unit) {
        const unitMap = {
            '100g': 100,
            '1kg': 1000,
            '100ml': 100,
            '1L': 1000,
            '100個': 100,
            '1個': 1
        };
        return unitMap[unit] || 1;
    }

    addToHistory(volume, price, unit, unitPrice) {
        const historyItem = {
            volume: volume,
            price: price,
            unit: unit,
            unitPrice: unitPrice,
            timestamp: new Date()
        };

        // 履歴の先頭に追加
        this.history.unshift(historyItem);

        // 3件まで保持
        if (this.history.length > 3) {
            this.history = this.history.slice(0, 3);
        }

        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        
        if (this.history.length === 0) {
            historyList.innerHTML = '<p class="no-history">まだ履歴がありません</p>';
            return;
        }

        const historyHTML = this.history.map(item => {
            const volumeUnit = this.getVolumeUnitText(item.unit);
            return `<div class="history-item">
                ${item.volume}${volumeUnit} ${item.price}円 → ${item.unit}あたり ¥${item.unitPrice.toFixed(2)}
            </div>`;
        }).join('');

        historyList.innerHTML = historyHTML;
    }

    getVolumeUnitText(unit) {
        const unitTextMap = {
            '100g': 'g',
            '1kg': 'g',
            '100ml': 'ml',
            '1L': 'ml',
            '100個': '個',
            '1個': '個'
        };
        return unitTextMap[unit] || '';
    }

    clear() {
        document.getElementById('priceInput').value = '';
        document.getElementById('volumeInput').value = '';
        document.getElementById('resultValue').textContent = '-';
        this.hideStatus();
    }

    showStatus(message, type) {
        const statusEl = document.getElementById('statusMessage');
        statusEl.textContent = message;
        statusEl.className = 'status-message ' + type;
        statusEl.style.display = 'block';
        
        if (type === 'info') {
            setTimeout(() => this.hideStatus(), 3000);
        }
    }

    hideStatus() {
        const statusEl = document.getElementById('statusMessage');
        statusEl.style.display = 'none';
    }

    // タブ切り替え機能
    switchTab(tabName) {
        console.log('Switching to tab:', tabName); // デバッグ用
        
        // タブボタンの状態を更新
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        if (tabName === 'unitPrice') {
            document.getElementById('unitPriceTab').classList.add('active');
            document.getElementById('unitPriceContent').classList.add('active');
        } else if (tabName === 'discount') {
            document.getElementById('discountTab').classList.add('active');
            document.getElementById('discountContent').classList.add('active');
        }

        this.currentTab = tabName;
        console.log('Tab switched to:', this.currentTab); // デバッグ用
    }

    // 割引計算
    calculateDiscount() {
        const price = parseFloat(document.getElementById('discountPriceInput').value) || 0;
        const discountRate = parseFloat(document.getElementById('discountRateInput').value) || 0;

        if (price <= 0 || discountRate < 0 || discountRate > 100) {
            document.getElementById('discountResultValue').textContent = '-';
            return;
        }

        const discountedPrice = price * (100 - discountRate) / 100;
        document.getElementById('discountResultValue').textContent = '¥' + discountedPrice.toFixed(0);
    }

    // 割引計算の確定
    confirmDiscountCalculation() {
        const price = parseFloat(document.getElementById('discountPriceInput').value) || 0;
        const discountRate = parseFloat(document.getElementById('discountRateInput').value) || 0;

        if (price <= 0) {
            this.showDiscountStatus('価格を入力してください', 'error');
            return;
        }

        if (discountRate < 0 || discountRate > 100) {
            this.showDiscountStatus('割引率は0〜100の間で入力してください', 'error');
            return;
        }

        const discountedPrice = price * (100 - discountRate) / 100;
        
        // 同じ計算がすでに履歴にないかチェック
        const exists = this.discountHistory.some(item => 
            item.price === price && 
            item.discountRate === discountRate
        );
        
        if (!exists) {
            this.addToDiscountHistory(price, discountRate, discountedPrice);
            this.showDiscountStatus('履歴に追加しました', 'info');
        } else {
            this.showDiscountStatus('同じ計算が既に履歴にあります', 'error');
        }
    }

    // 割引計算履歴に追加
    addToDiscountHistory(price, discountRate, discountedPrice) {
        const historyItem = {
            price: price,
            discountRate: discountRate,
            discountedPrice: discountedPrice,
            timestamp: new Date()
        };

        // 履歴の先頭に追加
        this.discountHistory.unshift(historyItem);

        // 3件まで保持
        if (this.discountHistory.length > 3) {
            this.discountHistory = this.discountHistory.slice(0, 3);
        }

        this.updateDiscountHistoryDisplay();
    }

    // 割引計算履歴表示を更新
    updateDiscountHistoryDisplay() {
        const historyList = document.getElementById('discountHistoryList');
        
        if (this.discountHistory.length === 0) {
            historyList.innerHTML = '<p class="no-history">まだ履歴がありません</p>';
            return;
        }

        const historyHTML = this.discountHistory.map(item => {
            return `<div class="history-item">
                ${item.price}円 ${item.discountRate}%引き → ${item.discountedPrice.toFixed(0)}円
            </div>`;
        }).join('');

        historyList.innerHTML = historyHTML;
    }

    // 割引計算をクリア
    clearDiscount() {
        document.getElementById('discountPriceInput').value = '';
        document.getElementById('discountRateInput').value = '';
        document.getElementById('discountResultValue').textContent = '-';
        this.hideDiscountStatus();
    }

    // 割引計算のステータス表示
    showDiscountStatus(message, type) {
        const statusEl = document.getElementById('discountStatusMessage');
        statusEl.textContent = message;
        statusEl.className = 'status-message ' + type;
        statusEl.style.display = 'block';
        
        if (type === 'info') {
            setTimeout(() => this.hideDiscountStatus(), 3000);
        }
    }

    hideDiscountStatus() {
        const statusEl = document.getElementById('discountStatusMessage');
        statusEl.style.display = 'none';
    }
}

// Service Worker登録
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('Service Worker registered successfully:', registration.scope);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

// アプリ初期化
document.addEventListener('DOMContentLoaded', () => {
    new CalculatorApp();
});