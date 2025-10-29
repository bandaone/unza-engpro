const multer = require('multer');

// Configure multer to use memory storage
const storage = multer.memoryStorage();

const wordUpload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 10, // Limit file size to 10MB for Word documents
  },
  fileFilter: (req, file, cb) => {
    // Accept only Word document files (.docx)
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Word (.docx) files are allowed.'), false);
    }
  },
});

module.exports = wordUpload;
