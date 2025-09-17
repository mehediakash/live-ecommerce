const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'tuffersbd@gmail.com',       // your Gmail
      pass: 'nlggsnwzdrtepmxx'            // your App Password
    }
  });
};

exports.sendEmail = async (options) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: '"My App" <dev.mhakash@gmail.com>', // sender info
    to: options.email,
    subject: options.subject,
    text: options.message
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (err) {
    console.error("Email sending error:", err);
    throw new Error('Email sending failed');
  }
};
