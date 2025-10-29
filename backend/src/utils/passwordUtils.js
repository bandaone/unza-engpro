const crypto = require('crypto');

// Generate a secure password that's memorable but strong
const generateInitialPassword = (length = 12) => {
  // Define character sets
  const upperCase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';  // Removed confusing I and O
  const lowerCase = 'abcdefghijkmnpqrstuvwxyz';  // Removed confusing l and o
  const numbers = '23456789';  // Removed confusing 0 and 1
  const specialChars = '@#$%&';

  // Ensure at least one character from each set
  let password = '';
  password += upperCase[crypto.randomInt(upperCase.length)];
  password += lowerCase[crypto.randomInt(lowerCase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += specialChars[crypto.randomInt(specialChars.length)];

  // Fill the rest with random chars from all sets
  const allChars = upperCase + lowerCase + numbers + specialChars;
  for(let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

module.exports = {
  generateInitialPassword,
};