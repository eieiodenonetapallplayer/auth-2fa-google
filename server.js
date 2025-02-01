// Import required modules
const express = require('express'); // Express framework for building web applications
const speakeasy = require('speakeasy'); // Library for generating and verifying OTPs
const qrcode = require('qrcode'); // Library for generating QR codes
require('dotenv').config();

// Create an instance of Express
const app = express();
// Middleware to parse incoming JSON requests
app.use(express.json());

// In-memory store for users and their associated secrets
let users = {
    "PROLEAK": {
      secret: "KBUW24Z2OV5U6VDIKNNFIL3WFBSFAQZBKBNWMSDMNNWV4UCTK5TA" // Example user with a predefined secret
    },
};

// Endpoint for generating a QR code and secret for a user
app.post('/generate', (req, res) => {
  // Generate a new secret key for the user
  const secret = speakeasy.generateSecret({
    name: process.env.SPEAKEASY_NAME, // The name of the application displayed in the Google Authenticator
  });

  // Store the generated secret in the users object
  users[req.body.username] = { secret: secret.base32 }; // Save the secret in base32 encoding

  // Generate a QR code that users can scan with their authenticator app
  qrcode.toDataURL(secret.otpauth_url, (err, dataUrl) => {
    if (err) {
      // If there is an error generating the QR code, respond with a 500 status and an error message
      return res.status(500).json({ message: 'Error generating QR code' });
    }
    // Send the QR code and secret back to the client
    res.json({ qrCode: dataUrl, secret: secret.base32 });
  });
});

// Endpoint for verifying the OTP from Google Authenticator
app.post('/verify', (req, res) => {
  // Destructure username and token from the request body
  const { username, token } = req.body;
  // Retrieve the user object based on the provided username
  const user = users[username];

  // Check if the user exists in the system
  if (!user) {
    // If the user does not exist, respond with a 400 status and a 'User not found' message
    return res.status(400).json({ message: 'User not found' });
  }

  // Get the secret associated with the user
  const secret = user.secret;

  // Verify the provided token against the secret using speakeasy
  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32', // Specify the encoding format of the secret
    token, // The OTP token provided by the user
    window: 3 // Allow verification of OTPs from the current time and the last/next 3 time slots (90 seconds)
  });

  // Check if the token is verified
  if (verified) {
    // If the token is valid, respond with a success message
    res.json({ message: 'Token verified' });
  } else {
    // If the token is invalid, respond with a 400 status and an 'Invalid token' message
    res.status(400).json({ message: 'Invalid token' });
  }
});

// Start the server on port 3000
app.listen(3000, () => {
  console.log('Server running on port 3000');
});