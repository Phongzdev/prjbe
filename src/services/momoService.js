const crypto = require('crypto');
const axios = require('axios');

class MomoService {
    constructor() {
        this.partnerCode = process.env.MOMO_PARTNER_CODE;
        this.accessKey = process.env.MOMO_ACCESS_KEY;
        this.secretKey = process.env.MOMO_SECRET_KEY;
        this.endpoint = process.env.MOMO_ENDPOINT;
        this.returnUrl = process.env.MOMO_RETURN_URL;
        this.notifyUrl = process.env.MOMO_NOTIFY_URL;
    }

    // Tạo signature (chữ ký) - dùng crypto thay vì crypto-js
    createSignature(data) {
        const rawSignature = `accessKey=${this.accessKey}&amount=${data.amount}&extraData=${data.extraData}&ipnUrl=${this.notifyUrl}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${this.returnUrl}&requestId=${data.requestId}&requestType=${data.requestType}`;
        return crypto.createHmac('sha256', this.secretKey)
            .update(rawSignature)
            .digest('hex');
    }

    // Tạo thanh toán MoMo
    async createPayment(order) {
        const requestId = `${this.partnerCode}_${Date.now()}`;
        const orderId = order.order_number;
        const amount = Math.round(order.total_amount);
        const orderInfo = `Thanh toan don hang ${orderId}`;
        const extraData = JSON.stringify({
            order_id: order.id,
            user_id: order.user_id
        });

        const requestData = {
            partnerCode: this.partnerCode,
            partnerName: "QuickBite",
            storeId: "QuickBite",
            requestId: requestId,
            amount: amount,
            orderId: orderId,
            orderInfo: orderInfo,
            redirectUrl: this.returnUrl,
            ipnUrl: this.notifyUrl,
            lang: "vi",
            requestType: "payWithMethod",
            extraData: extraData,
            autoCapture: true
        };

        // Tạo signature
        requestData.signature = this.createSignature({
            amount: amount,
            extraData: extraData,
            orderId: orderId,
            orderInfo: orderInfo,
            requestId: requestId,
            requestType: "payWithMethod"
        });

        console.log('MoMo request:', requestData); // Debug

        try {
            const response = await axios.post(this.endpoint, requestData, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            console.log('MoMo response:', response.data); // Debug
            return response.data;
        } catch (error) {
            console.error('MoMo payment creation error:', error.response?.data || error.message);
            throw error;
        }
    }

    // Xác minh callback từ MoMo
    verifyCallback(reqBody) {
        const {
            partnerCode,
            orderId,
            requestId,
            amount,
            orderInfo,
            orderType,
            transId,
            resultCode,
            message,
            payType,
            responseTime,
            extraData,
            signature
        } = reqBody;

        // Tạo signature để kiểm tra
        const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
        const expectedSignature = crypto.createHmac('sha256', this.secretKey)
            .update(rawSignature)
            .digest('hex');

        // So sánh signature
        if (signature !== expectedSignature) {
            return { verified: false, error: 'Invalid signature' };
        }

        return {
            verified: true,
            resultCode: parseInt(resultCode),
            transId: transId,
            orderId: orderId,
            amount: amount,
            message: message
        };
    }
}

module.exports = new MomoService();