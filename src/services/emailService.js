const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Send order confirmation email to customer
const sendOrderConfirmation = async (order, user, restaurant) => {
    try {
        const transporter = createTransporter();

        // Format order items for email
        const orderItemsHtml = order.items.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    ${item.quantity} x ${item.menu_item.name}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                    ${formatPrice(item.subtotal)}
                </td>
            </tr>
        `).join('');

        const mailOptions = {
            from: `"QuickBite" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `Order Confirmation - ${order.order_number}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        .header {
                            background-color: #ff6b35;
                            color: white;
                            padding: 20px;
                            text-align: center;
                            border-radius: 8px 8px 0 0;
                        }
                        .content {
                            background-color: #fff;
                            padding: 30px;
                            border: 1px solid #ddd;
                            border-top: none;
                            border-radius: 0 0 8px 8px;
                        }
                        .order-details {
                            background-color: #f9f9f9;
                            padding: 15px;
                            border-radius: 8px;
                            margin: 20px 0;
                        }
                        .order-number {
                            font-size: 20px;
                            font-weight: bold;
                            color: #ff6b35;
                        }
                        .status {
                            display: inline-block;
                            padding: 5px 10px;
                            background-color: #ffc107;
                            color: #333;
                            border-radius: 4px;
                            font-size: 12px;
                            font-weight: bold;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 20px 0;
                        }
                        .total {
                            font-size: 18px;
                            font-weight: bold;
                            text-align: right;
                            padding-top: 15px;
                            border-top: 2px solid #ddd;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px solid #ddd;
                            font-size: 12px;
                            color: #666;
                        }
                        .track-button {
                            display: inline-block;
                            background-color: #ff6b35;
                            color: white;
                            padding: 12px 24px;
                            text-decoration: none;
                            border-radius: 5px;
                            margin: 20px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>🍕 QuickBite</h1>
                        <p>Order Confirmation</p>
                    </div>
                    <div class="content">
                        <p>Dear <strong>${user.full_name}</strong>,</p>
                        <p>Thank you for your order! We've received your order and it's now being processed.</p>
                        
                        <div class="order-details">
                            <p><strong>Order Number:</strong> <span class="order-number">${order.order_number}</span></p>
                            <p><strong>Order Status:</strong> <span class="status">${getStatusText(order.status)}</span></p>
                            <p><strong>Order Date:</strong> ${formatDate(order.created_at)}</p>
                        </div>

                        <h3>Restaurant Information</h3>
                        <div class="order-details">
                            <p><strong>${restaurant.name}</strong></p>
                            <p>${restaurant.address}</p>
                            <p>Phone: ${restaurant.phone || 'N/A'}</p>
                        </div>

                        <h3>Order Summary</h3>
                        <table>
                            <thead>
                                <tr style="background-color: #f5f5f5;">
                                    <th style="padding: 10px; text-align: left;">Item</th>
                                    <th style="padding: 10px; text-align: right;">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${orderItemsHtml}
                            </tbody>
                        </table>

                        <div class="total">
                            <p>Subtotal: ${formatPrice(order.total_amount - order.delivery_fee)}</p>
                            <p>Delivery Fee: ${formatPrice(order.delivery_fee)}</p>
                            <p style="font-size: 20px; color: #ff6b35;">Total: ${formatPrice(order.total_amount)}</p>
                        </div>

                        <h3>Delivery Information</h3>
                        <div class="order-details">
                            <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
                            <p><strong>Payment Method:</strong> ${order.payment_method === 'cash' ? 'Cash on Delivery' : 'Credit Card'}</p>
                            ${order.notes ? `<p><strong>Special Notes:</strong> ${order.notes}</p>` : ''}
                        </div>

                        <div style="text-align: center;">
                            <a href="${process.env.CLIENT_URL}/track-order/${order.id}" class="track-button">
                                Track Your Order
                            </a>
                        </div>

                        <p>You can track your order status in real-time by clicking the button above.</p>
                        <p>Estimated delivery time: 30-45 minutes</p>
                        
                        <div class="footer">
                            <p>Thank you for choosing QuickBite!</p>
                            <p>If you have any questions, please contact us at support@quickbite.com</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Order confirmation email sent to ${user.email}`);

    } catch (error) {
        console.error('Error sending order confirmation email:', error);
        // Don't throw error - email failure shouldn't break the order
    }
};

// Send order status update email
const sendOrderStatusUpdate = async (order, user, restaurant, oldStatus, newStatus) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"QuickBite" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `Order Status Update - ${order.order_number}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        .header {
                            background-color: #ff6b35;
                            color: white;
                            padding: 20px;
                            text-align: center;
                            border-radius: 8px 8px 0 0;
                        }
                        .content {
                            background-color: #fff;
                            padding: 30px;
                            border: 1px solid #ddd;
                            border-top: none;
                            border-radius: 0 0 8px 8px;
                        }
                        .status-update {
                            background-color: #f9f9f9;
                            padding: 20px;
                            border-radius: 8px;
                            margin: 20px 0;
                            text-align: center;
                        }
                        .old-status {
                            color: #999;
                            text-decoration: line-through;
                        }
                        .new-status {
                            color: #ff6b35;
                            font-weight: bold;
                            font-size: 18px;
                        }
                        .track-button {
                            display: inline-block;
                            background-color: #ff6b35;
                            color: white;
                            padding: 12px 24px;
                            text-decoration: none;
                            border-radius: 5px;
                            margin: 20px 0;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px solid #ddd;
                            font-size: 12px;
                            color: #666;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>🍕 QuickBite</h1>
                    </div>
                    <div class="content">
                        <p>Dear <strong>${user.full_name}</strong>,</p>
                        <p>Your order <strong>${order.order_number}</strong> status has been updated.</p>
                        
                        <div class="status-update">
                            <p>Status changed from: <span class="old-status">${getStatusText(oldStatus)}</span></p>
                            <p>To: <span class="new-status">${getStatusText(newStatus)}</span></p>
                        </div>

                        <div style="text-align: center;">
                            <a href="${process.env.CLIENT_URL}/track-order/${order.id}" class="track-button">
                                Track Your Order
                            </a>
                        </div>

                        <div class="footer">
                            <p>Thank you for choosing QuickBite!</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Status update email sent to ${user.email}`);

    } catch (error) {
        console.error('Error sending status update email:', error);
    }
};

// Helper functions
const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
};

const formatDate = (date) => {
    return new Date(date).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getStatusText = (status) => {
    const statusMap = {
        'pending': 'Pending Confirmation',
        'confirmed': 'Confirmed',
        'preparing': 'Preparing',
        'ready': 'Ready for Delivery',
        'delivering': 'Out for Delivery',
        'delivered': 'Delivered',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
};

module.exports = {
    sendOrderConfirmation,
    sendOrderStatusUpdate
};