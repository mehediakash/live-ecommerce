const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

exports.sendEmail = async options => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.email,
    subject: options.subject,
    text: options.message
  };
  
  await transporter.sendMail(mailOptions);
};