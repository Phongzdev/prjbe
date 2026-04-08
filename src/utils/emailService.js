const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Create a transporter
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: process.env.EMAIL_PORT || process.env.SMTP_PORT || 587,
        auth: {
            user: process.env.EMAIL_USER || process.env.SMTP_USER || 'ethereal.user@ethereal.email',
            pass: process.env.EMAIL_PASS || process.env.SMTP_PASS || 'ethereal_password'
        }
    });

    // 2. Define the email options
    const mailOptions = {
        from: `QuickBite <${process.env.EMAIL_USER || process.env.SMTP_FROM_EMAIL || 'noreply@quickbite.com'}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html
    };

    // 3. Actually send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    
    if (process.env.SMTP_HOST === 'smtp.ethereal.email' || !process.env.SMTP_HOST) {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
};

module.exports = sendEmail;
