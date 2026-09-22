const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service : "gmail",
    auth : {
        user : "groomingwithmk@gmail.com",
        password : ""
    }
});

module.exports = transporter;