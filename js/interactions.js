/**
 * js/interactions.js
 * Nhóm tương tác người dùng: Xử lý sự kiện Zoom (cuộn chuột/nút bấm), Pan (kéo thả) và Xuất PNG.
 */

import { svgToMath, mathToSvg } from './coordinate.js';

/**
 * Quản lý tương tác khung nhìn SVG (Zoom & Pan)
 */
export class ViewportInteractions {
    /**
     * @param {SVGElement} svgElement - Thẻ SVG trên DOM
     * @param {Object} viewState - Đối tượng trạng thái khung nhìn chung { width, height, centerX, centerY, scale }
     * @param {Function} onUpdate - Callback gọi lại mỗi khi viewState thay đổi để vẽ lại lưới/đồ thị
     */
    constructor(svgElement, viewState, onUpdate) {
        this.svgElement = svgElement;
        this.viewState = viewState;
        this.onUpdate = onUpdate;

        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;

        this._initListeners();
    }

    /**
     * Khởi tạo các sự kiện lắng nghe trên SVG viewport
     */
    _initListeners() {
        // 1. Sự kiện Zoom bằng cuộn chuột (Wheel)
        this.svgElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.svgElement.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
            this.zoomAt(zoomFactor, mouseX, mouseY);
        }, { passive: false });

        // 2. Sự kiện Pan bằng chuột (MouseDown, MouseMove, MouseUp/MouseLeave)
        this.svgElement.addEventListener('mousedown', (e) => {
            // Chỉ bắt sự kiện chuột trái
            if (e.button !== 0) return;
            this.isPanning = true;
            this.startX = e.clientX;
            this.startY = e.clientY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isPanning) return;
            const dx = e.clientX - this.startX;
            const dy = e.clientY - this.startY;
            this.startX = e.clientX;
            this.startY = e.clientY;

            // Dịch chuyển tâm màn hình (Lưu ý: Trục Y pixel ngược chiều với toán học)
            this.viewState.centerX += dx;
            this.viewState.centerY += dy;

            if (this.onUpdate) this.onUpdate();
        });

        window.addEventListener('mouseup', () => {
            this.isPanning = false;
        });

        // 3. Hỗ trợ cảm ứng trên điện thoại / máy tính bảng (Touch Pan)
        this.svgElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isPanning = true;
                this.startX = e.touches[0].clientX;
                this.startY = e.touches[0].clientY;
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (!this.isPanning || e.touches.length !== 1) return;
            const dx = e.touches[0].clientX - this.startX;
            const dy = e.touches[0].clientY - this.startY;
            this.startX = e.touches[0].clientX;
            this.startY = e.touches[0].clientY;

            this.viewState.centerX += dx;
            this.viewState.centerY += dy;

            if (this.onUpdate) this.onUpdate();
        }, { passive: true });

        window.addEventListener('touchend', () => {
            this.isPanning = false;
        });
    }

    /**
     * Phóng to hoặc thu nhỏ tại một điểm bất kỳ trên màn hình (hoặc tâm màn hình)
     * @param {number} factor - Hệ số zoom (ví dụ 1.15 để phóng to, 0.85 để thu nhỏ)
     * @param {number|null} targetPixelX - Tọa độ x pixel tâm zoom (mặc định giữa màn hình)
     * @param {number|null} targetPixelY - Tọa độ y pixel tâm zoom (mặc định giữa màn hình)
     */
    zoomAt(factor, targetPixelX = null, targetPixelY = null) {
        const width = this.svgElement.clientWidth || this.viewState.width;
        const height = this.svgElement.clientHeight || this.viewState.height;

        this.viewState.width = width;
        this.viewState.height = height;

        const cx = targetPixelX !== null ? targetPixelX : width / 2;
        const cy = targetPixelY !== null ? targetPixelY : height / 2;

        // Giữ nguyên tọa độ toán học tại điểm trỏ chuột khi zoom
        const mathPos = svgToMath(cx, cy, this.viewState);

        const newScale = this.viewState.scale * factor;
        // Giới hạn scale trong khoảng hợp lý
        if (newScale < 10 || newScale > 2000) return;

        this.viewState.scale = newScale;

        // Tính lại centerX, centerY để điểm mathPos vẫn nằm đúng tại (cx, cy)
        this.viewState.centerX = cx - (width / 2) - (mathPos.x * this.viewState.scale);
        this.viewState.centerY = cy - (height / 2) + (mathPos.y * this.viewState.scale);

        if (this.onUpdate) this.onUpdate();
    }

    /**
     * Đặt lại khung nhìn về mặc định ban đầu
     */
    reset(defaultScale = 60) {
        const width = this.svgElement.clientWidth || 800;
        const height = this.svgElement.clientHeight || 600;

        this.viewState.width = width;
        this.viewState.height = height;
        this.viewState.scale = defaultScale;
        this.viewState.centerX = 0;
        this.viewState.centerY = 0;

        if (this.onUpdate) this.onUpdate();
    }
}

/**
 * Xuất nội dung SVG hiện tại thành file ảnh PNG tải về máy
 * @param {SVGElement} svgElement - Phần tử SVG cần xuất
 * @param {string} filename - Tên file mặc định
 */
export function exportToPNG(svgElement, filename = 'do-thi-luong-giac.png') {
    // Sao chép SVG sang chuỗi XML
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
        const canvas = document.createElement('canvas');
        // Tăng độ phân giải canvas gấp đôi để ảnh xuất ra sắc nét
        const scaleFactor = 2;
        canvas.width = svgElement.clientWidth * scaleFactor;
        canvas.height = svgElement.clientHeight * scaleFactor;

        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff'; // Nền trắng cho ảnh xuất ra
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.scale(scaleFactor, scaleFactor);
        context.drawImage(image, 0, 0);

        // Kích hoạt tải file PNG
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png');
    };

    image.src = blobURL;
}