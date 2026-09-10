/**
 * js/coordinate.js
 * Nhóm chuyển đổi hệ tọa độ: Chuyển đổi qua lại giữa tọa độ toán học (x, y) và tọa độ pixel SVG.
 */

/**
 * Chuyển đổi từ tọa độ toán học (x, y) sang tọa độ pixel trên SVG.
 * @param {number} mathX - Giá trị x trong toán học
 * @param {number} mathY - Giá trị y trong toán học
 * @param {Object} viewState - Trạng thái khung nhìn hiện tại { width, height, centerX, centerY, scale }
 * @returns {Object} - Tọa độ pixel { x, y } trên SVG
 */
export function mathToSvg(mathX, mathY, viewState) {
    const { width, height, centerX, centerY, scale } = viewState;

    // Tâm màn hình SVG (width / 2, height / 2) tương ứng với gốc tọa độ toán học (0, 0) cộng thêm offset (centerX, centerY)
    // Trục X: tăng từ trái sang phải -> cộng thêm (mathX * scale)
    const pixelX = (width / 2) + centerX + (mathX * scale);

    // Trục Y: SVG tăng từ trên xuống, còn toán học tăng từ dưới lên -> phải trừ đi (mathY * scale)
    const pixelY = (height / 2) + centerY - (mathY * scale);

    return { x: pixelX, y: pixelY };
}

/**
 * Chuyển đổi ngược lại từ tọa độ pixel trên SVG sang tọa độ toán học (x, y).
 * Dùng cho việc hiển thị tọa độ chuột và xử lý Pan/Zoom.
 * @param {number} pixelX - Tọa độ x trên pixel SVG
 * @param {number} pixelY - Tọa độ y trên pixel SVG
 * @param {Object} viewState - Trạng thái khung nhìn hiện tại { width, height, centerX, centerY, scale }
 * @returns {Object} - Tọa độ toán học { x, y }
 */
export function svgToMath(pixelX, pixelY, viewState) {
    const { width, height, centerX, centerY, scale } = viewState;

    // Ngược lại với hàm mathToSvg
    const mathX = (pixelX - (width / 2) - centerX) / scale;
    const mathY = ((height / 2) + centerY - pixelY) / scale;

    return { x: mathX, y: mathY };
}

/**
 * Tính toán độ rộng/chiều dài từ hệ tọa độ toán học sang pixel (dùng cho bán kính điểm, độ dày nét vẽ nếu cần scale)
 * @param {number} mathLength - Khoảng cách/độ dài trong toán học
 * @param {number} scale - Tỷ lệ phóng đại hiện tại
 * @returns {number} - Kích thước pixel tương ứng
 */
export function lengthToPixel(mathLength, scale) {
    return mathLength * scale;
}