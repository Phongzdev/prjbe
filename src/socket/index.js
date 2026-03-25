const { getIo } = require('../config/socket');

// Lưu trữ kết nối users
const userSockets = new Map(); // userId -> socketId
const restaurantSockets = new Map(); // restaurantId -> [socketIds]

const setupSocketHandlers = () => {
    const io = getIo();

    io.on('connection', (socket) => {
        console.log('🔌 New client connected:', socket.id);

        // User đăng nhập và kết nối
        socket.on('authenticate', (userId) => {
            userSockets.set(userId, socket.id);
            socket.userId = userId;
            console.log(`✅ User ${userId} authenticated with socket ${socket.id}`);

            // Gửi xác nhận
            socket.emit('authenticated', { success: true, userId });
        });

        // Vendor đăng nhập và join vào restaurant room
        socket.on('join-restaurant', (restaurantId) => {
            const roomName = `restaurant_${restaurantId}`;
            socket.join(roomName);

            if (!restaurantSockets.has(restaurantId)) {
                restaurantSockets.set(restaurantId, []);
            }
            restaurantSockets.get(restaurantId).push(socket.id);

            console.log(`🏪 Vendor joined restaurant room: ${roomName}`);
            socket.emit('joined-restaurant', { success: true, restaurantId });
        });

        // User join vào order room để theo dõi
        socket.on('join-order', (orderId) => {
            const roomName = `order_${orderId}`;
            socket.join(roomName);
            console.log(`📦 User ${socket.userId} joined order room: ${roomName}`);
            socket.emit('joined-order', { success: true, orderId });
        });

        // User rời order room
        socket.on('leave-order', (orderId) => {
            const roomName = `order_${orderId}`;
            socket.leave(roomName);
            console.log(`📦 User left order room: ${roomName}`);
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log('🔌 Client disconnected:', socket.id);

            // Xóa khỏi userSockets
            if (socket.userId) {
                userSockets.delete(socket.userId);
            }

            // Xóa khỏi restaurantSockets
            for (const [restaurantId, sockets] of restaurantSockets.entries()) {
                const index = sockets.indexOf(socket.id);
                if (index !== -1) {
                    sockets.splice(index, 1);
                    if (sockets.length === 0) {
                        restaurantSockets.delete(restaurantId);
                    }
                    break;
                }
            }
        });
    });
};

// Hàm gửi thông báo real-time khi cập nhật order status
const notifyOrderStatusUpdate = (order, oldStatus, newStatus) => {
    const io = getIo();

    // Gửi đến room của order (user đang theo dõi)
    const orderRoom = `order_${order.id}`;
    io.to(orderRoom).emit('order-status-update', {
        orderId: order.id,
        orderNumber: order.order_number,
        oldStatus,
        newStatus,
        estimatedDeliveryTime: order.estimated_delivery_time,
        deliveredAt: order.delivered_at,
        message: `Order ${order.order_number} status updated to ${newStatus}`,
        timestamp: new Date()
    });

    // Gửi đến room của restaurant (vendor)
    const restaurantRoom = `restaurant_${order.restaurant_id}`;
    io.to(restaurantRoom).emit('order-updated', {
        orderId: order.id,
        orderNumber: order.order_number,
        status: newStatus,
        message: `Order ${order.order_number} status changed to ${newStatus}`
    });

    console.log(`📧 Real-time notification sent for order ${order.order_number}: ${oldStatus} → ${newStatus}`);
};

// Hàm gửi thông báo đơn hàng mới
const notifyNewOrder = (order, restaurantId) => {
    const io = getIo();

    const restaurantRoom = `restaurant_${restaurantId}`;
    io.to(restaurantRoom).emit('new-order', {
        orderId: order.id,
        orderNumber: order.order_number,
        totalAmount: order.total_amount,
        customerName: order.user?.full_name,
        message: `New order #${order.order_number} received!`,
        timestamp: new Date()
    });

    console.log(`🆕 New order notification sent for order ${order.order_number}`);
};

// Hàm gửi thông báo riêng cho user (nếu user đang online)
const notifyUser = (userId, notification) => {
    const io = getIo();
    const socketId = userSockets.get(userId);

    if (socketId) {
        io.to(socketId).emit('user-notification', notification);
        console.log(`🔔 Notification sent to user ${userId}`);
    }
};

module.exports = {
    setupSocketHandlers,
    notifyOrderStatusUpdate,
    notifyNewOrder,
    notifyUser,
    userSockets,
    restaurantSockets
};